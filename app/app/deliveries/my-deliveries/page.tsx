'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { deliveriesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';
import type { Delivery } from '@/lib/store';

const nextActionLabel: Record<string, string> = {
  ACCEPTED: 'Coletei o pacote 📦',
  PICKED_UP: 'Entreguei ✅',
};

export default function MyDeliveriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { on, off } = useSocket(user?.id);
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'DELIVERY_PERSON') {
      router.push('/');
      return;
    }
    loadDeliveries();
  }, [user, router]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveriesAPI.getMyDeliveries();
      setDeliveries(response.data);
    } catch (err) {
      setError('Erro ao carregar minhas entregas');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (deliveryId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACCEPTED' ? 'PICKED_UP' : 'DELIVERED';

    try {
      setUpdating(deliveryId);
      const response = await deliveriesAPI.updateStatus(deliveryId, nextStatus);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? response.data : d))
      );
      if (nextStatus === 'PICKED_UP') {
        addToast('Pacote coletado! Agora leve até o apartamento.', 'info');
      } else {
        addToast('Entrega concluída com sucesso! 🎉', 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao atualizar status';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleCancelAccept = async (deliveryId: string) => {
    try {
      setCancelling(deliveryId);
      const response = await deliveriesAPI.cancel(deliveryId);
      const updated = response.data as Delivery;
      if (updated.status === 'REQUESTED') {
        setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
        addToast('Você cancelou o aceite. O pedido voltou para a fila.', 'info');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao cancelar aceite';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setCancelling(null);
    }
  };

  useEffect(() => {
    const handleDeliveryUpdated = (delivery: Delivery) => {
      setDeliveries((prev) => {
        const exists = prev.some((d) => d.id === delivery.id);
        const updated = exists
          ? prev.map((d) => (d.id === delivery.id ? delivery : d))
          : [delivery, ...prev];
        // Manter limite de 100 entregas por segurança
        return updated.length > 100 ? updated.slice(0, 100) : updated;
      });
    };

    const handleDeliveryCancelled = (payload: { id: string }) => {
      setDeliveries((prev) => prev.filter((d) => d.id !== payload.id));
    };

    on('delivery_updated', handleDeliveryUpdated);
    on('delivery_cancelled', handleDeliveryCancelled);

    return () => {
      off('delivery_updated', handleDeliveryUpdated);
      off('delivery_cancelled', handleDeliveryCancelled);
    };
  }, [on, off]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando minhas entregas...</p>
        </div>
      </div>
    );
  }

  const activeDeliveries = deliveries.filter((d) => d.status !== 'DELIVERED');
  const completedDeliveries = deliveries.filter((d) => d.status === 'DELIVERED');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Minhas Entregas</h1>
        <p className="text-gray-500 mt-1">Gerencie suas entregas em andamento</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {deliveries.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🚶</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma entrega em andamento</h3>
            <p className="text-gray-500">Aceite pedidos disponíveis para começar a ganhar</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {activeDeliveries.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Em andamento ({activeDeliveries.length})</h2>
              <div className="grid gap-4">
                {activeDeliveries.map((delivery) => (
                  <Card key={delivery.id}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <StatusBadge status={delivery.status} />
                        </div>

                        <div className="space-y-3">
                          <div className="bg-gray-100 rounded-lg px-3 py-2 inline-block">
                            <p className="text-xs text-gray-500">Entregar em</p>
                            <p className="text-lg font-bold text-gray-800">
                              Bloco {delivery.block} · Apto {delivery.apartment}
                            </p>
                          </div>

                          {delivery.resident && (
                            <div className="flex items-center gap-2">
                              <Avatar name={delivery.resident.name} size="sm" />
                              <span className="text-sm text-gray-600">{delivery.resident.name}</span>
                            </div>
                          )}

                          {delivery.description && (
                            <p className="text-gray-700">📦 {delivery.description}</p>
                          )}

                          {delivery.notes && (
                            <p className="text-sm text-gray-500 italic">💬 {delivery.notes}</p>
                          )}

                          <p className="text-xs text-gray-400">
                            Aceito em: {delivery.acceptedAt ? new Date(delivery.acceptedAt).toLocaleString('pt-BR') : '-'}
                          </p>
                        </div>
                      </div>

                      {delivery.status !== 'DELIVERED' && (
                        <div className="flex-shrink-0">
                          <div className="flex gap-2">
                            {delivery.status === 'ACCEPTED' && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleCancelAccept(delivery.id)}
                                loading={cancelling === delivery.id}
                                disabled={updating !== null || cancelling !== null}
                              >
                                Cancelar aceite
                              </Button>
                            )}
                            <Button
                              size="lg"
                              variant={delivery.status === 'PICKED_UP' ? 'primary' : 'secondary'}
                              onClick={() => handleUpdateStatus(delivery.id, delivery.status)}
                              loading={updating === delivery.id}
                              disabled={updating !== null || cancelling !== null}
                            >
                              {nextActionLabel[delivery.status]}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completedDeliveries.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Concluídas ({completedDeliveries.length})</h2>
              <div className="grid gap-4">
                {completedDeliveries.map((delivery) => (
                  <Card key={delivery.id}>
                    <div className="flex items-center gap-4 opacity-75">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <StatusBadge status={delivery.status} />
                          <span className="text-sm text-gray-500">
                            Bloco {delivery.block} · Apto {delivery.apartment}
                          </span>
                        </div>
                        {delivery.resident && (
                          <p className="text-sm text-gray-500">{delivery.resident.name}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleString('pt-BR') : ''}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
