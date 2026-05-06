'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, MapPin, PackageOpen, PackagePlus, Truck, XCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { ProgressStepper } from '@/components/ProgressStepper';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore, type Delivery } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';

const STATUS_ORDER: Record<string, number> = {
  ACCEPTED: 0,
  PICKED_UP: 1,
  REQUESTED: 2,
};

const DELIVERY_STEPS = [
  { key: 'REQUESTED', label: 'Recebido' },
  { key: 'ACCEPTED',  label: 'A caminho' },
  { key: 'PICKED_UP', label: 'Coletado' },
  { key: 'DELIVERED', label: 'Entregue!' },
];

export default function MoradorPage() {
  const router = useRouter();
  const { user, hasHydrated, activeRole } = useAuthStore();
  const effectiveRole = activeRole ?? user?.role;
  const { on, off, connectionStatus, onlineDeliveryPeople } = useSocket(
    user?.id,
    user?.role,
    user?.condominiumId,
  );
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelledIds, setCancelledIds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'RESIDENT' && effectiveRole !== 'RESIDENT') {
      router.replace('/');
      return;
    }
    void loadDeliveries();
  }, [hasHydrated, user, router]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveriesAPI.getAll();
      setDeliveries(response.data as Delivery[]);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar seus pedidos agora.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleUpdated = (delivery: Delivery) => {
      setDeliveries((prev) => prev.map((d) => (d.id === delivery.id ? delivery : d)));
      if (delivery.status === 'ACCEPTED' && delivery.deliveryPerson) {
        addToast(`${delivery.deliveryPerson.name} aceitou sua entrega!`, 'success');
      } else if (delivery.status === 'PICKED_UP') {
        addToast('Seu pacote está a caminho!', 'info');
      } else if (delivery.status === 'DELIVERED') {
        addToast('Entrega finalizada! Seu pacote chegou.', 'success');
        void loadDeliveries();
      }
    };
    const handleCreated = (delivery: Delivery) => {
      setDeliveries((prev) => [delivery, ...prev]);
    };
    const handleCancelled = (payload: { id?: string; reason?: string }) => {
      const id = payload?.id;
      if (!id) return;
      setCancelledIds((prev) => ({ ...prev, [id]: payload.reason ?? '' }));
      addToast('Sua entrega foi cancelada.', 'error');
    };
    on('delivery_updated', handleUpdated);
    on('delivery_created', handleCreated);
    on('delivery_cancelled', handleCancelled);
    return () => {
      off('delivery_updated', handleUpdated);
      off('delivery_created', handleCreated);
      off('delivery_cancelled', handleCancelled);
    };
  }, [on, off, addToast]);

  const active = deliveries
    .filter((d) => d.status !== 'DELIVERED' && !(d.id in cancelledIds))
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  const delivered = deliveries.filter((d) => d.status === 'DELIVERED');
  const cancelledItems = deliveries.filter((d) => d.id in cancelledIds);

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Morador</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[var(--color-secondary)]">
            Pedidos
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {onlineDeliveryPeople > 0 && (
            <span className="hidden items-center gap-1.5 rounded-full border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-dark)] sm:inline-flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
              {onlineDeliveryPeople}{' '}
              {onlineDeliveryPeople !== 1 ? 'entregadores' : 'entregador'} online
            </span>
          )}
          <Link href="/deliveries/new">
            <Button>
              <PackagePlus className="h-4 w-4" />
              Fazer Pedido
            </Button>
          </Link>
        </div>
      </div>

      {connectionStatus === 'reconnecting' && (
        <NoticeBanner tone="warning">Atualizando status dos seus pedidos...</NoticeBanner>
      )}
      {error && <NoticeBanner tone="error">{error}</NoticeBanner>}
      {active.some((d) => d.status === 'REQUESTED') && (
        <NoticeBanner tone="warning">
          Procurando entregador para um dos seus pedidos...
        </NoticeBanner>
      )}

      {active.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Nenhum pedido em andamento"
          description="Que tal pedir algo nas lojas do condomínio ou solicitar uma entrega? É rápido e fácil."
          actions={
            <Link href="/deliveries/new">
              <Button size="lg">Fazer Pedido</Button>
            </Link>
          }
          className="border-2 border-dashed border-[var(--color-line)] bg-[var(--color-background-soft)]"
        />
      ) : (
        <div className="space-y-3">
          {active.map((delivery) => (
            <Card key={delivery.id} className="rounded-[28px] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-base font-semibold text-[var(--color-secondary)]">
                    <MapPin className="mr-1 inline h-4 w-4 text-[var(--color-primary-dark)]" />
                    Apto {delivery.apartment}, Bloco {delivery.block}
                  </p>
                  {delivery.description && (
                    <p className="text-sm text-[var(--color-foreground-soft)]">
                      {delivery.description}
                    </p>
                  )}
                  {delivery.deliveryPerson && (
                    <p className="text-sm font-medium text-[var(--color-primary-dark)]">
                      <Truck className="mr-1 inline h-3.5 w-3.5" />
                      {delivery.deliveryPerson.name}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-xs text-[var(--color-foreground-soft)]">
                  #{delivery.id.slice(0, 8)}
                </span>
              </div>

              <ProgressStepper steps={DELIVERY_STEPS} currentKey={delivery.status} />

              {delivery.deliveryCode && ['ACCEPTED', 'PICKED_UP'].includes(delivery.status) && (
                <div className="mt-3 rounded-2xl border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary-dark)]">
                    Código de recebimento
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-[0.2em] text-[var(--color-primary-dark)]">
                    {delivery.deliveryCode}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {cancelledItems.length > 0 && (
        <div className="space-y-3">
          <p className="eyebrow text-red-600">Cancelados</p>
          {cancelledItems.map((delivery) => (
            <Card key={delivery.id} className="rounded-[28px] border-red-200 bg-red-50/50 p-5">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-secondary)]">
                    Entrega cancelada — Apto {delivery.apartment}, Bloco {delivery.block}
                  </p>
                  {cancelledIds[delivery.id] && (
                    <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">
                      {cancelledIds[delivery.id]}
                    </p>
                  )}
                  <p className="mt-1.5 text-sm text-[var(--color-foreground-soft)]">
                    Não se preocupe — você pode solicitar uma nova entrega quando quiser.
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {deliveries.length > 0 && (
        <Link
          href="/deliveries"
          className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-3 text-sm font-medium text-[var(--color-secondary)] transition-colors hover:bg-white"
        >
          <History className="h-4 w-4" />
          Ver histórico completo
          {delivered.length > 0 && (
            <span className="rounded-full bg-[var(--color-line)] px-2 py-0.5 text-xs font-semibold">
              {delivered.length} {delivered.length !== 1 ? 'entregues' : 'entregue'}
            </span>
          )}
        </Link>
      )}
    </div>
  );
}
