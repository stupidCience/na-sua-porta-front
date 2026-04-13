'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { deliveriesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';
import type { Delivery } from '@/lib/store';

export default function AvailableDeliveriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { on, off } = useSocket(user?.id);
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
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
      const response = await deliveriesAPI.getAvailable();
      setDeliveries(response.data);
    } catch (err) {
      setError('Erro ao carregar pedidos disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      setAccepting(deliveryId);
      await deliveriesAPI.accept(deliveryId);
      setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
      addToast('Pedido aceito! Vá até a portaria para coletar.', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao aceitar pedido';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setAccepting(null);
    }
  };

  useEffect(() => {
    const handleDeliveryCreated = (delivery: Delivery) => {
      setDeliveries((prev) => {
        const updated = [delivery, ...prev];
        // Limitar a 50 entregas para evitar crescimento indefinido de memória
        return updated.slice(0, 50);
      });
      addToast('Novo pedido disponível!', 'info');
    };

    const handleDeliveryAccepted = (delivery: Delivery) => {
      setDeliveries((prev) => prev.filter((d) => d.id !== delivery.id));
    };

    on('delivery_created', handleDeliveryCreated);
    on('delivery_accepted', handleDeliveryAccepted);

    return () => {
      off('delivery_created', handleDeliveryCreated);
      off('delivery_accepted', handleDeliveryAccepted);
    };
  }, [on, off, addToast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Buscando pedidos disponíveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Pedidos Disponíveis</h1>
        <p className="text-gray-500 mt-1">Aceite um pedido e ganhe fazendo entregas</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {deliveries.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum pedido no momento</h3>
            <p className="text-gray-500">Novos pedidos aparecerão aqui automaticamente</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Escutando novos pedidos em tempo real...
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                    <span className="text-sm font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded">
                      Novo pedido
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500">Entregar em</p>
                        <p className="text-lg font-bold text-gray-800">
                          Bloco {delivery.block} · Apto {delivery.apartment}
                        </p>
                      </div>
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
                      {new Date(delivery.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Button
                    size="lg"
                    onClick={() => handleAcceptDelivery(delivery.id)}
                    loading={accepting === delivery.id}
                    disabled={accepting !== null}
                  >
                    Aceitar 🚀
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
