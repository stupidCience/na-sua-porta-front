'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Archive, History, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/Button';
import { ProgressStepper } from '@/components/ProgressStepper';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';
import type { Delivery } from '@/lib/store';

const deliverySteps = [
  { key: 'REQUESTED', label: 'Solicitado', icon: '1' },
  { key: 'ACCEPTED', label: 'Aceito', icon: '2' },
  { key: 'PICKED_UP', label: 'Coletado', icon: '3' },
  { key: 'DELIVERED', label: 'Entregue', icon: '4' },
];

export default function HistoryPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { on, off, connectionStatus } = useSocket(
    user?.id,
    user?.role,
    user?.condominiumId,
  );
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingId, setRatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }
    loadHistory();
  }, [user, router, hasHydrated]);

  useEffect(() => {
    if (!user) return;

    const handleDeliveryUpdated = (delivery: Delivery) => {
      if (delivery.status !== 'DELIVERED') {
        return;
      }

      const isFromCurrentUser =
        user.role === 'RESIDENT'
          ? delivery.residentId === user.id
          : delivery.deliveryPersonId === user.id;

      if (!isFromCurrentUser) {
        return;
      }

      setDeliveries((prev) => {
        const exists = prev.some((d) => d.id === delivery.id);
        if (!exists) {
          return [delivery, ...prev];
        }
        return prev.map((d) => (d.id === delivery.id ? delivery : d));
      });
    };

    on('delivery_updated', handleDeliveryUpdated);

    return () => {
      off('delivery_updated', handleDeliveryUpdated);
    };
  }, [on, off, user]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await deliveriesAPI.getHistory();
      setDeliveries(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar seu histórico agora.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (deliveryId: string, rating: number) => {
    try {
      const response = await deliveriesAPI.rate(deliveryId, rating);
      setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? response.data : d)));
      setRatingId(null);
      addToast('Obrigado pela avaliação!', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos registrar sua avaliação agora.'), 'error');
    }
  };

  const formatDuration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando seu histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Suas entregas"
        title="Histórico de entregas"
        description="Veja seus pedidos já concluídos, o tempo de entrega e as avaliações que você fez."
        meta={
          <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 font-medium text-[var(--color-secondary)]">
            {deliveries.length} entrega{deliveries.length !== 1 ? 's' : ''} concluída{deliveries.length !== 1 ? 's' : ''}
          </span>
        }
      />

      {connectionStatus === 'reconnecting' && (
        <NoticeBanner tone="warning">
          Atualizando suas informações. Seus dados voltam em instantes.
        </NoticeBanner>
      )}

      {error && (
        <NoticeBanner tone="error">{error}</NoticeBanner>
      )}

      {deliveries.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="Nenhuma entrega concluída"
          description="Quando você finalizar entregas, o histórico aparecerá aqui automaticamente."
          actions={
            <Link href={user?.role === 'RESIDENT' ? '/deliveries/new' : '/deliveries/available'}>
              <Button size="lg">{user?.role === 'RESIDENT' ? 'Fazer primeiro pedido' : 'Aceitar entrega'}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="rounded-[28px] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <StatusBadge status={delivery.status} />
                    <span className="text-xs text-[var(--color-foreground-soft)]">#{delivery.id.slice(0, 8)}</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[var(--color-secondary)]">
                      <span className="text-sm text-[var(--color-foreground-soft)]">Destino:</span>{' '}
                      <strong>Bloco {delivery.block} · Apto {delivery.apartment}</strong>
                    </p>

                    {delivery.description && (
                      <p className="text-sm text-[var(--color-foreground-soft)]">{delivery.description}</p>
                    )}

                    <ProgressStepper
                      title="Entrega concluída"
                      steps={deliverySteps}
                      currentKey="DELIVERED"
                    />

                    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[var(--color-line)] pt-3">
                      {user?.role === 'RESIDENT' && delivery.deliveryPerson && (
                        <div className="flex items-center gap-2">
                          <Avatar name={delivery.deliveryPerson.name} size="sm" />
                          <span className="text-sm text-[var(--color-foreground-soft)]">{delivery.deliveryPerson.name}</span>
                        </div>
                      )}

                      {user?.role === 'DELIVERY_PERSON' && delivery.resident && (
                        <div className="flex items-center gap-2">
                          <Avatar name={delivery.resident.name} size="sm" />
                          <span className="text-sm text-[var(--color-foreground-soft)]">{delivery.resident.name}</span>
                        </div>
                      )}

                      <span className="text-xs text-gray-400">
                        {delivery.deliveredAt && new Date(delivery.deliveredAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {delivery.createdAt && delivery.deliveredAt && (
                        <span className="rounded px-2 py-0.5 text-xs text-[var(--color-primary-dark)] bg-[rgba(26,166,75,0.14)]">
                          {formatDuration(delivery.createdAt, delivery.deliveredAt)}
                        </span>
                      )}

                      {delivery.rating && (
                        <StarRating rating={delivery.rating} readonly size="sm" />
                      )}

                      {user?.role === 'RESIDENT' && !delivery.rating && (
                        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
                          <p className="font-medium">Entrega finalizada</p>
                          {ratingId === delivery.id ? (
                            <div className="mt-2">
                              <p className="mb-1 text-xs text-[var(--color-foreground-soft)]">Avalie esta entrega</p>
                              <StarRating onRate={(r) => handleRate(delivery.id, r)} size="md" />
                            </div>
                          ) : (
                            <button
                              onClick={() => setRatingId(delivery.id)}
                              className="font-semibold text-[var(--color-primary-dark)] hover:text-[var(--color-secondary)]"
                            >
                              Avaliar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
