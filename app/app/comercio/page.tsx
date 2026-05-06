'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { ClipboardList, Clock3, PackageCheck, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';

type VendorOrder = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'READY' | 'SENT' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  customerName: string;
  apartment: string;
  block?: string | null;
  description?: string;
  totalAmount?: number;
  paymentStatus?: 'PENDING' | 'PAID';
};

type AdvanceStatus = 'ACCEPTED' | 'READY' | 'SENT';

type ColumnConfig = {
  key: 'PENDING' | 'ACCEPTED' | 'READY';
  label: string;
  description: string;
  actionLabel: string;
  nextStatus: AdvanceStatus;
  headerClass: string;
  iconWrapClass: string;
  icon: LucideIcon;
};

const COLUMNS: ColumnConfig[] = [
  {
    key: 'PENDING',
    label: 'Novos Pedidos',
    description: 'Aguardando confirmação',
    actionLabel: 'Aceitar pedido',
    nextStatus: 'ACCEPTED',
    headerClass:
      'border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.08)]',
    iconWrapClass:
      'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]',
    icon: Clock3,
  },
  {
    key: 'ACCEPTED',
    label: 'Em Preparo',
    description: 'Pedidos sendo preparados',
    actionLabel: 'Marcar como pronto',
    nextStatus: 'READY',
    headerClass:
      'border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.05)]',
    iconWrapClass:
      'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]',
    icon: ClipboardList,
  },
  {
    key: 'READY',
    label: 'Prontos para Coleta',
    description: 'Aguardando entregador',
    actionLabel: 'Marcar como enviado',
    nextStatus: 'SENT',
    headerClass: 'border-[var(--color-line)] bg-[var(--color-background-soft)]',
    iconWrapClass: 'bg-[rgba(31,41,51,0.06)] text-[var(--color-secondary)]',
    icon: PackageCheck,
  },
];

export default function ComercioPage() {
  const router = useRouter();
  const { user, hasHydrated, activeRole } = useAuthStore();
  const effectiveRole = activeRole ?? user?.role;
  const { on, off } = useSocket(user?.id, user?.role, user?.condominiumId);
  const { addToast } = useToastStore();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [freshOrderIds, setFreshOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'VENDOR' && effectiveRole !== 'VENDOR') {
      router.replace('/');
      return;
    }
    void loadOrders();
  }, [hasHydrated, user, router]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await vendorsAPI.getMyOrders();
      setOrders(response.data as VendorOrder[]);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar os pedidos agora.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async (orderId: string, nextStatus: AdvanceStatus) => {
    try {
      setWorkingId(orderId);
      await vendorsAPI.updateMyOrderStatus(orderId, nextStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)),
      );
      const messages: Record<AdvanceStatus, string> = {
        ACCEPTED: 'Pedido aceito!',
        READY: 'Pedido marcado como pronto.',
        SENT: 'Pedido enviado para entrega.',
      };
      addToast(messages[nextStatus], 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível atualizar o pedido.'), 'error');
    } finally {
      setWorkingId(null);
    }
  };

  useEffect(() => {
    const handleOrderCreated = (order: VendorOrder) => {
      setOrders((prev) => [order, ...prev]);
      addToast('Novo pedido recebido!', 'info');
      setFreshOrderIds((prev) => new Set([...prev, order.id]));
      setTimeout(() => {
        setFreshOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }, 4000);
    };
    const handleOrderUpdated = (payload: Partial<VendorOrder>) => {
      if (!payload?.id) return;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === payload.id ? { ...o, ...(payload.status ? { status: payload.status } : {}) } : o,
        ),
      );
    };
    on('order_created', handleOrderCreated);
    on('order_updated', handleOrderUpdated);
    return () => {
      off('order_created', handleOrderCreated);
      off('order_updated', handleOrderUpdated);
    };
  }, [on, off, addToast]);

  const queueOrders = useMemo(
    () => orders.filter((o) => !['COMPLETED', 'CANCELLED', 'SENT'].includes(o.status)),
    [orders],
  );

  const byStatus = useMemo(
    () => ({
      PENDING: queueOrders.filter((o) => o.status === 'PENDING'),
      ACCEPTED: queueOrders.filter((o) => o.status === 'ACCEPTED'),
      READY: queueOrders.filter((o) => o.status === 'READY'),
    }),
    [queueOrders],
  );

  const newCount = byStatus.PENDING.length;

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Comerciante</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[var(--color-secondary)]">
            Fila
          </h1>
        </div>
        {newCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] px-3 py-1.5 text-sm font-semibold text-[var(--color-secondary)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            {newCount} novo{newCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && <NoticeBanner tone="error">{error}</NoticeBanner>}

      {queueOrders.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Nenhum pedido na fila"
          description="Sua loja está aberta e visível para os moradores! Novos pedidos aparecem aqui em tempo real."
          className="border-2 border-dashed border-[var(--color-line)] bg-[var(--color-background-soft)]"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const colOrders = byStatus[col.key];
            const Icon = col.icon;

            return (
              <div key={col.key} className="space-y-3">
                {/* Column header */}
                <div
                  className={[
                    'flex items-center gap-3 rounded-[20px] border px-4 py-3',
                    col.headerClass,
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                      col.iconWrapClass,
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-secondary)]">
                      {col.label}
                    </p>
                    <p className="text-xs text-[var(--color-foreground-soft)]">
                      {colOrders.length} pedido{colOrders.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Order cards */}
                {colOrders.length === 0 ? (
                  <div className="rounded-[24px] border-2 border-dashed border-[var(--color-line)] px-4 py-6 text-center text-sm text-[var(--color-foreground-soft)]">
                    {col.description}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {colOrders.map((order) => (
                      <Card
                        key={order.id}
                        className={clsx(
                          'rounded-[24px] p-4',
                          freshOrderIds.has(order.id) && 'animate-[slide-in-card_0.28s_ease-out]',
                        )}
                      >
                        <div className="space-y-3">
                          {freshOrderIds.has(order.id) && (
                            <div className="-mt-1 mb-1 flex items-center gap-1.5 rounded-xl bg-[rgba(255,213,58,0.35)] px-2.5 py-1">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                              <span className="text-xs font-bold text-[var(--color-secondary)]">NOVO</span>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-secondary)]">
                                {order.customerName}
                              </p>
                              <p className="text-xs text-[var(--color-foreground-soft)]">
                                Apto {order.apartment}
                                {order.block ? `, Bloco ${order.block}` : ''}
                              </p>
                            </div>
                            {order.totalAmount !== undefined && (
                              <span className="shrink-0 rounded-full bg-[var(--color-background-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-secondary)]">
                                R${' '}
                                {order.totalAmount.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            )}
                          </div>

                          {order.description && (
                            <p className="text-xs leading-5 text-[var(--color-foreground-soft)]">
                              {order.description}
                            </p>
                          )}

                          <p className="text-xs text-[var(--color-foreground-soft)]">
                            {new Date(order.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>

                          <Button
                            size="sm"
                            variant={col.key === 'PENDING' ? 'primary' : 'secondary'}
                            fullWidth
                            onClick={() => void handleAdvance(order.id, col.nextStatus)}
                            loading={workingId === order.id}
                            disabled={workingId !== null}
                          >
                            {col.actionLabel}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
