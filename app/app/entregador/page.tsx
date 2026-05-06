'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { Bike, MapPin, PackageSearch } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore, type Delivery } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';

export default function EntregadorPage() {
  const router = useRouter();
  const { user, hasHydrated, activeRole } = useAuthStore();
  const effectiveRole = activeRole ?? user?.role;
  const { on, off, connectionStatus } = useSocket(user?.id, user?.role, user?.condominiumId);
  const { addToast } = useToastStore();

  const [isOnline, setIsOnline] = useState(true);
  const [available, setAvailable] = useState<Delivery[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'DELIVERY_PERSON' && effectiveRole !== 'DELIVERY_PERSON') {
      router.replace('/');
      return;
    }
    void loadAll();
  }, [hasHydrated, user, router]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [availRes, myRes] = await Promise.all([
        deliveriesAPI.getAvailable(),
        deliveriesAPI.getMyDeliveries(),
      ]);
      setAvailable(availRes.data as Delivery[]);
      setMyDeliveries(myRes.data as Delivery[]);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar as entregas agora.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (deliveryId: string) => {
    try {
      setAccepting(deliveryId);
      await deliveriesAPI.accept(deliveryId);
      setAvailable((prev) => prev.filter((d) => d.id !== deliveryId));
      addToast('Coleta aceita! Vá buscar o pacote.', 'success');
      void loadAll();
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos aceitar esta entrega agora.'), 'error');
    } finally {
      setAccepting(null);
    }
  };

  const handleUpdateStatus = async (delivery: Delivery) => {
    const nextStatus = delivery.status === 'ACCEPTED' ? 'PICKED_UP' : 'DELIVERED';
    try {
      setUpdating(delivery.id);
      await deliveriesAPI.updateStatus(delivery.id, nextStatus);
      addToast(nextStatus === 'PICKED_UP' ? 'Pacote coletado!' : 'Entrega finalizada!', 'success');
      void loadAll();
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos atualizar o status agora.'), 'error');
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    const handleCreated = (delivery: Delivery) => {
      if (!isOnline) return;
      setAvailable((prev) => [delivery, ...prev].slice(0, 50));
      addToast('Nova coleta disponível!', 'info');
      setFreshIds((prev) => new Set([...prev, delivery.id]));
      setTimeout(() => {
        setFreshIds((prev) => {
          const next = new Set(prev);
          next.delete(delivery.id);
          return next;
        });
      }, 5000);
    };
    const handleAccepted = (delivery: Delivery) => {
      setAvailable((prev) => prev.filter((d) => d.id !== delivery.id));
    };
    on('delivery_created', handleCreated);
    on('delivery_accepted', handleAccepted);
    return () => {
      off('delivery_created', handleCreated);
      off('delivery_accepted', handleAccepted);
    };
  }, [on, off, addToast, isOnline]);

  const activeDelivery = myDeliveries.find((d) =>
    ['ACCEPTED', 'PICKED_UP'].includes(d.status),
  );

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      {/* Header + online toggle */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Entregador</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[var(--color-secondary)]">
            Entregas
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setIsOnline((v) => !v)}
          aria-pressed={isOnline}
          className={[
            'inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
            isOnline
              ? 'border-[rgba(26,166,75,0.25)] bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)] shadow-[0_0_0_4px_rgba(26,166,75,0.08)]'
              : 'border-[var(--color-line)] bg-white text-[var(--color-foreground-soft)]',
          ].join(' ')}
        >
          <span
            className={[
              'h-2.5 w-2.5 rounded-full transition-colors',
              isOnline
                ? 'animate-pulse bg-[var(--color-primary)]'
                : 'bg-[var(--color-foreground-soft)]',
            ].join(' ')}
          />
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {connectionStatus === 'reconnecting' && (
        <NoticeBanner tone="warning">Atualizando sua conexão...</NoticeBanner>
      )}
      {error && <NoticeBanner tone="error">{error}</NoticeBanner>}

      {/* Active delivery */}
      {activeDelivery && (
        <div className="space-y-2">
          <p className="eyebrow text-[var(--color-primary-dark)]">Em andamento</p>
          <Card className="rounded-[28px] border-2 border-[rgba(26,166,75,0.2)] p-5">
            <div className="space-y-2">
              <StatusBadge status={activeDelivery.status} />
              <p className="text-base font-semibold text-[var(--color-secondary)]">
                <MapPin className="mr-1 inline h-4 w-4 text-[var(--color-primary-dark)]" />
                Apto {activeDelivery.apartment}, Bloco {activeDelivery.block}
              </p>
              {activeDelivery.description && (
                <p className="text-sm text-[var(--color-foreground-soft)]">
                  {activeDelivery.description}
                </p>
              )}
            </div>
            <div className="mt-4">
              <Button
                onClick={() => void handleUpdateStatus(activeDelivery)}
                loading={updating === activeDelivery.id}
                fullWidth
              >
                {activeDelivery.status === 'ACCEPTED'
                  ? 'Confirmar coleta'
                  : 'Finalizar entrega'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Available deliveries feed */}
      {!isOnline ? (
        <EmptyState
          icon={Bike}
          title="Você está offline"
          description="Fique online para ver e aceitar novas coletas disponíveis no condomínio."
          actions={<Button onClick={() => setIsOnline(true)}>Ficar online</Button>}
          className="border-2 border-dashed border-[var(--color-line)] bg-[var(--color-background-soft)]"
        />
      ) : available.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Nenhuma entrega disponível"
          description="Fique online e aguarde novos chamados. Eles aparecem aqui em tempo real."
          className="border-2 border-dashed border-[var(--color-line)] bg-[var(--color-background-soft)]"
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-foreground-soft)]">
            {available.length} disponíve{available.length !== 1 ? 'is' : 'l'}
          </p>
          {available.map((delivery) => (
            <Card
              key={delivery.id}
              className={clsx(
                'rounded-[28px] p-5',
                freshIds.has(delivery.id) && 'animate-[ring-new-delivery_1.2s_ease-out_2]',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  {freshIds.has(delivery.id) && (
                    <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-xs font-bold text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
                      NOVO
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-[var(--color-primary-dark)]" />
                    <p className="text-base font-semibold text-[var(--color-secondary)]">
                      Apto {delivery.apartment}, Bloco {delivery.block}
                    </p>
                  </div>
                  {delivery.description && (
                    <p className="text-sm text-[var(--color-foreground-soft)]">
                      {delivery.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-foreground-soft)]">
                    {new Date(delivery.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => void handleAccept(delivery.id)}
                  loading={accepting === delivery.id}
                  disabled={accepting !== null || activeDelivery !== undefined}
                  className="shrink-0"
                >
                  Aceitar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
