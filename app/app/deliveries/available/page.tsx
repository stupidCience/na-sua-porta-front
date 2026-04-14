'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
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

export default function AvailableDeliveriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { on, off, connectionStatus, onlineDeliveryPeople } = useSocket(user?.id, user?.role);
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
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar os pedidos disponíveis agora.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      setAccepting(deliveryId);
      await deliveriesAPI.accept(deliveryId);
      setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
      addToast('🚀 Coleta aceita! Vá até a origem para buscar o pacote.', 'success');
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Não conseguimos aceitar esta entrega agora.');
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
        <h1 className="text-3xl font-bold text-gray-800">Coletas disponíveis</h1>
        <p className="text-gray-500 mt-1">Aceite uma coleta e ganhe fazendo entregas</p>
        <p className="text-sm text-emerald-700 mt-2">Entregadores online: {onlineDeliveryPeople}</p>
      </div>

      {connectionStatus === 'reconnecting' && (
        <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          Reconectando ao tempo real. Novos pedidos aparecerão em instantes.
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
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum pedido disponível no momento</h3>
            <p className="text-gray-500">Novos pedidos aparecerão aqui automaticamente</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Escutando novos pedidos em tempo real...
            </div>
            <div className="mt-6">
              <Button variant="secondary" onClick={loadDeliveries}>🔄 Atualizar lista</Button>
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
                      {delivery.type === 'MARKETPLACE' ? '🛒 Pedido marketplace' : '📦 Portaria'}
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

                    <p className="text-sm text-gray-700">
                      <span className="text-gray-500">Origem:</span>{' '}
                      {delivery.pickupOrigin || (delivery.type === 'MARKETPLACE' ? 'Comércio parceiro' : 'Portaria')}
                    </p>

                    {delivery.order && (
                      <p className="text-xs text-gray-500">
                        Pedido #{delivery.order.id.slice(0, 8)} · Pagamento {delivery.order.paymentStatus === 'PAID' ? 'pago' : 'pendente'}
                      </p>
                    )}

                    <ProgressStepper
                      title="Etapa atual"
                      steps={deliverySteps}
                      currentKey={delivery.status}
                    />

                    {delivery.order && (
                      <p className="text-xs font-semibold text-gray-700">
                        Status de pagamento:{' '}
                        <span className={`rounded-full px-2 py-0.5 ${delivery.order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                          {delivery.order.paymentStatus === 'PAID' ? '✅ Pago' : '⏳ Pendente'}
                        </span>
                      </p>
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
                    ✅ Aceitar entrega
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
