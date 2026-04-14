'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/Card';
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
  const { on, off, connectionStatus } = useSocket(user?.id, user?.role);
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
    } catch (err: any) {
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
    } catch (err: any) {
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
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando seu histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Histórico de Entregas</h1>
        <p className="text-gray-500 mt-1">
          {deliveries.length} entrega{deliveries.length !== 1 ? 's' : ''} concluída{deliveries.length !== 1 ? 's' : ''}
        </p>
      </div>

      {connectionStatus === 'reconnecting' && (
        <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          Reconectando ao tempo real. Seus dados serão atualizados em instantes.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {deliveries.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📜</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma entrega concluída</h3>
            <p className="text-gray-500 mb-6">Quando você finalizar entregas, o histórico aparecerá aqui.</p>
            <Link href={user?.role === 'RESIDENT' ? '/deliveries/new' : '/deliveries/available'}>
              <Button size="lg">
                {user?.role === 'RESIDENT' ? '🚀 Fazer primeiro pedido' : '✅ Aceitar entrega'}
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <StatusBadge status={delivery.status} />
                    <span className="text-xs text-gray-400">#{delivery.id.slice(0, 8)}</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <span className="text-sm text-gray-500">Destino:</span>{' '}
                      <strong>Bloco {delivery.block} · Apto {delivery.apartment}</strong>
                    </p>

                    {delivery.description && (
                      <p className="text-gray-600 text-sm">📦 {delivery.description}</p>
                    )}

                    <ProgressStepper
                      title="Fluxo concluído"
                      steps={deliverySteps}
                      currentKey="DELIVERED"
                    />

                    <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                      {user?.role === 'RESIDENT' && delivery.deliveryPerson && (
                        <div className="flex items-center gap-2">
                          <Avatar name={delivery.deliveryPerson.name} size="sm" />
                          <span className="text-sm text-gray-600">{delivery.deliveryPerson.name}</span>
                        </div>
                      )}

                      {user?.role === 'DELIVERY_PERSON' && delivery.resident && (
                        <div className="flex items-center gap-2">
                          <Avatar name={delivery.resident.name} size="sm" />
                          <span className="text-sm text-gray-600">{delivery.resident.name}</span>
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
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          ⏱ {formatDuration(delivery.createdAt, delivery.deliveredAt)}
                        </span>
                      )}

                      {delivery.rating && (
                        <StarRating rating={delivery.rating} readonly size="sm" />
                      )}

                      {user?.role === 'RESIDENT' && !delivery.rating && (
                        <div className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded">
                          <p className="font-medium">Entrega finalizada 🎉</p>
                          {ratingId === delivery.id ? (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 mb-1">Avalie esta entrega</p>
                              <StarRating onRate={(r) => handleRate(delivery.id, r)} size="md" />
                            </div>
                          ) : (
                            <button
                              onClick={() => setRatingId(delivery.id)}
                              className="text-amber-700 font-semibold hover:text-amber-800"
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
