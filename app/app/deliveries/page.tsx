'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { deliveriesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';
import type { Delivery } from '@/lib/store';

export default function DeliveriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { on, off } = useSocket(user?.id);
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadDeliveries();
  }, [user, router]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveriesAPI.getAll();
      setDeliveries(response.data);
    } catch (err) {
      setError('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (deliveryId: string, rating: number) => {
    try {
      const response = await deliveriesAPI.rate(deliveryId, rating);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? response.data : d))
      );
      setRatingId(null);
      addToast('Obrigado pela avaliação!', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Erro ao avaliar', 'error');
    }
  };

  const handleCancel = async (deliveryId: string) => {
    try {
      setCancellingId(deliveryId);
      await deliveriesAPI.cancel(deliveryId);
      setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
      addToast('Pedido cancelado com sucesso.', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Não foi possível cancelar o pedido', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    const handleDeliveryCreated = (delivery: Delivery) => {
      setDeliveries((prev) => {
        const updated = [delivery, ...prev];
        // Limitar a 100 entregas para evitar crescimento indefinido de memória
        return updated.slice(0, 100);
      });
      setHighlightedId(delivery.id);
      setTimeout(() => setHighlightedId((current) => (current === delivery.id ? null : current)), 1800);
    };

    const handleDeliveryUpdated = (delivery: Delivery) => {
      setDeliveries((prev) => {
        const exists = prev.some((d) => d.id === delivery.id);
        if (!exists) {
          return [delivery, ...prev].slice(0, 100);
        }
        return prev.map((d) => (d.id === delivery.id ? delivery : d));
      });
      setHighlightedId(delivery.id);
      setTimeout(() => setHighlightedId((current) => (current === delivery.id ? null : current)), 1800);
      if (delivery.status === 'ACCEPTED' && delivery.deliveryPerson) {
        addToast(`${delivery.deliveryPerson.name} aceitou seu pedido!`, 'success');
      } else if (delivery.status === 'PICKED_UP') {
        addToast('Seu pacote foi coletado e está a caminho!', 'info');
      } else if (delivery.status === 'DELIVERED') {
        addToast('Entrega concluída! Seu pacote chegou.', 'success');
      }
    };

    const handleDeliveryCancelled = (payload: { id: string }) => {
      setDeliveries((prev) => prev.filter((d) => d.id !== payload.id));
    };

    if (user?.role === 'DELIVERY_PERSON') {
      on('delivery_created', handleDeliveryCreated);
    }
    on('delivery_updated', handleDeliveryUpdated);
    on('delivery_cancelled', handleDeliveryCancelled);

    return () => {
      if (user?.role === 'DELIVERY_PERSON') {
        off('delivery_created', handleDeliveryCreated);
      }
      off('delivery_updated', handleDeliveryUpdated);
      off('delivery_cancelled', handleDeliveryCancelled);
    };
  }, [on, off, addToast, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando seus pedidos...</p>
        </div>
      </div>
    );
  }

  const visibleDeliveries =
    user?.role === 'RESIDENT'
      ? deliveries.filter((d) => d.status !== 'DELIVERED')
      : deliveries;

  return (
    <div className="pb-24 md:pb-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Meus Pedidos</h1>
          <p className="text-gray-500 mt-1">Acompanhe suas entregas em tempo real</p>
        </div>
        <Link href="/deliveries/new" className="hidden md:block">
          <Button size="lg">Pedir entrega 🚀</Button>
        </Link>
      </div>

      {visibleDeliveries.some((d) => d.status === 'REQUESTED') && (
        <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          Estamos procurando um entregador para seu pedido. Você receberá uma atualização em instantes.
        </div>
      )}

      {visibleDeliveries.some((d) => d.status === 'ACCEPTED' && d.deliveryPerson?.name) && (
        <div className="mb-6 p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-sm">
          Entregador a caminho: {visibleDeliveries.find((d) => d.status === 'ACCEPTED' && d.deliveryPerson?.name)?.deliveryPerson?.name} aceitou seu pedido.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {visibleDeliveries.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum pedido em aberto</h3>
            <p className="text-gray-500 mb-6">Pedidos concluídos ficam disponíveis na aba de histórico</p>
            <Link href="/deliveries/new">
              <Button size="lg">Pedir entrega 🚀</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visibleDeliveries.map((delivery) => (
            <Card key={delivery.id} className={highlightedId === delivery.id ? 'ring-2 ring-amber-300 transition-shadow duration-500' : ''}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <StatusBadge status={delivery.status} />
                    <span className="text-xs text-gray-400">
                      #{delivery.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="space-y-2 text-gray-700">
                    <p>
                      <span className="text-sm text-gray-500">Destino:</span>{' '}
                      <strong>Apto {delivery.apartment}, Bloco {delivery.block}</strong>
                    </p>
                    {delivery.description && (
                      <p>
                        <span className="text-sm text-gray-500">Pacote:</span>{' '}
                        {delivery.description}
                      </p>
                    )}
                    {delivery.deliveryPerson && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-lg">
                        <Avatar name={delivery.deliveryPerson.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">{delivery.deliveryPerson.name}</p>
                          <p className="text-xs text-blue-600">
                            Entregador responsável
                            {delivery.deliveryPerson.phone && ` · ${delivery.deliveryPerson.phone}`}
                          </p>
                        </div>
                      </div>
                    )}
                    {delivery.status === 'REQUESTED' && (
                      <p className="text-sm text-amber-600 italic mt-2">
                        Estamos procurando um entregador para você...
                      </p>
                    )}

                    {user?.role === 'RESIDENT' && ['REQUESTED', 'ACCEPTED'].includes(delivery.status) && (
                      <div className="mt-3">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancel(delivery.id)}
                          loading={cancellingId === delivery.id}
                          disabled={cancellingId !== null}
                        >
                          Cancelar pedido
                        </Button>
                      </div>
                    )}
                    {delivery.status === 'DELIVERED' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {delivery.rating ? (
                          <div className="flex items-center gap-2">
                            <StarRating rating={delivery.rating} readonly size="sm" />
                            <span className="text-xs text-gray-400">Sua avaliação</span>
                          </div>
                        ) : ratingId === delivery.id ? (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Como foi a entrega?</p>
                            <StarRating onRate={(r) => handleRate(delivery.id, r)} size="md" />
                          </div>
                        ) : (
                          <button
                            onClick={() => setRatingId(delivery.id)}
                            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                          >
                            ⭐ Avaliar entrega
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(delivery.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Link href="/deliveries/new" className="md:hidden fixed bottom-5 right-4 z-40">
        <Button size="lg" className="shadow-lg">Pedir entrega 🚀</Button>
      </Link>
    </div>
  );
}
