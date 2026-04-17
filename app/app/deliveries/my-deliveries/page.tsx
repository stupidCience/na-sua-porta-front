'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { StatusBadge } from '@/components/StatusBadge';
import { ProgressStepper } from '@/components/ProgressStepper';
import { Avatar } from '@/components/Avatar';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';
import type { Delivery } from '@/lib/store';

const nextActionLabel: Record<string, string> = {
  ACCEPTED: '📦 Coletar pedido',
  PICKED_UP: '✅ Finalizar entrega',
};

const deliverySteps = [
  { key: 'REQUESTED', label: 'Solicitado', icon: '1' },
  { key: 'ACCEPTED', label: 'Aceito', icon: '2' },
  { key: 'PICKED_UP', label: 'Coletado', icon: '3' },
  { key: 'DELIVERED', label: 'Entregue', icon: '4' },
];

const orderSteps = [
  { key: 'PENDING', label: 'Pendente', icon: '1' },
  { key: 'ACCEPTED', label: 'Aceito', icon: '2' },
  { key: 'READY', label: 'Pronto', icon: '3' },
  { key: 'SENT', label: 'Enviado', icon: '4' },
  { key: 'COMPLETED', label: 'Concluído', icon: '5' },
];

const inferOrderStatus = (delivery: Delivery) => {
  if (delivery.order?.status) return delivery.order.status;
  if (delivery.status === 'DELIVERED') return 'COMPLETED';
  if (delivery.status === 'PICKED_UP') return 'SENT';
  if (delivery.status === 'ACCEPTED') return 'ACCEPTED';
  return 'PENDING';
};

export default function MyDeliveriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { on, off, connectionStatus } = useSocket(user?.id, user?.role);
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmModalDeliveryId, setConfirmModalDeliveryId] = useState<string | null>(null);
  const [confirmCodeInput, setConfirmCodeInput] = useState('');

  const openChatForDelivery = (delivery: Delivery) => {
    router.push(`/chats?kind=DELIVERY&deliveryId=${delivery.id}`);
  };

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
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar suas entregas agora.'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    deliveryId: string,
    currentStatus: string,
    confirmationCode?: string,
  ) => {
    const nextStatus = currentStatus === 'ACCEPTED' ? 'PICKED_UP' : 'DELIVERED';

    try {
      setUpdating(deliveryId);
      const response = await deliveriesAPI.updateStatus(deliveryId, nextStatus, confirmationCode);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? response.data : d))
      );
      if (nextStatus === 'PICKED_UP') {
        addToast('📦 Pacote em mãos! Agora siga para o apartamento.', 'info');
      } else {
        addToast('🎉 Entrega finalizada com sucesso!', 'success');
        setConfirmModalDeliveryId(null);
        setConfirmCodeInput('');
      }
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Não conseguimos atualizar esta etapa da entrega agora.');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const openConfirmDeliveryModal = (deliveryId: string) => {
    setConfirmModalDeliveryId(deliveryId);
    setConfirmCodeInput('');
  };

  const closeConfirmDeliveryModal = () => {
    if (updating) return;
    setConfirmModalDeliveryId(null);
    setConfirmCodeInput('');
  };

  const handleConfirmDeliveryWithCode = async () => {
    if (!confirmModalDeliveryId) return;

    const code = confirmCodeInput.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      addToast('Informe um código válido de 6 dígitos.', 'warning');
      return;
    }

    const targetDelivery = deliveries.find((d) => d.id === confirmModalDeliveryId);
    if (!targetDelivery) {
      addToast('Entrega não encontrada para confirmação.', 'error');
      return;
    }

    await handleUpdateStatus(targetDelivery.id, targetDelivery.status, code);
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
      const msg = getApiErrorMessage(err, 'Não conseguimos cancelar o aceite agora.');
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Minhas Entregas</h1>
            <p className="text-gray-500 mt-1">Gerencie suas entregas em andamento</p>
          </div>
        </div>
      </div>

      {connectionStatus === 'reconnecting' && (
        <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          Reconectando ao tempo real. Sua lista será atualizada automaticamente.
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
                {activeDeliveries.map((delivery) => {
                  const waitingMarketplaceRelease =
                    delivery.type === 'MARKETPLACE' &&
                    delivery.status === 'ACCEPTED' &&
                    delivery.order?.status !== 'SENT';

                  return (
                  <Card key={delivery.id}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <StatusBadge status={delivery.status} />
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            {delivery.type === 'MARKETPLACE' ? '🛒 Pedido' : '📦 Portaria'}
                          </span>
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

                          <ProgressStepper
                            title="Progresso da entrega"
                            steps={deliverySteps}
                            currentKey={delivery.status}
                          />

                          {delivery.type === 'MARKETPLACE' && (
                            <>
                              <ProgressStepper
                                title="Progresso do pedido"
                                steps={orderSteps}
                                currentKey={inferOrderStatus(delivery)}
                              />
                              {waitingMarketplaceRelease && (
                                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                  Aguarde o comércio confirmar a retirada com o código para continuar.
                                </p>
                              )}
                              {delivery.status === 'ACCEPTED' && (
                                <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                                    Código de coleta
                                  </p>
                                  {delivery.order?.pickupCode ? (
                                    <>
                                      <p className="text-xl font-black tracking-[0.18em] text-sky-900">
                                        {delivery.order.pickupCode}
                                      </p>
                                      <p className="text-xs text-sky-700">
                                        Informe este código ao comércio para liberar o pedido.
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-sky-700">
                                      Aguardando geração do código de coleta.
                                    </p>
                                  )}
                                </div>
                              )}
                              <p className="text-xs font-semibold text-gray-700">
                                Pagamento:{' '}
                                <span className={`rounded-full px-2 py-0.5 ${delivery.order?.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                                  {delivery.order?.paymentStatus === 'PAID' ? '✅ Pago' : '⏳ Pendente'}
                                </span>
                              </p>
                            </>
                          )}

                          <p className="text-sm text-gray-700">
                            <span className="text-gray-500">Origem do pedido:</span>{' '}
                            {delivery.pickupOrigin || (delivery.type === 'MARKETPLACE' ? 'Comércio parceiro' : 'Portaria')}
                          </p>

                          {delivery.notes && (
                            <p className="text-sm text-gray-500 italic">💬 {delivery.notes}</p>
                          )}

                          <p className="text-xs text-gray-400">
                            Aceito em: {delivery.acceptedAt ? new Date(delivery.acceptedAt).toLocaleString('pt-BR') : '-'}
                          </p>

                        </div>
                      </div>

                      {delivery.status !== 'DELIVERED' && (
                        <div className="w-full sm:flex-shrink-0 sm:w-auto">
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full sm:w-auto"
                              onClick={() => openChatForDelivery(delivery)}
                            >
                              💬 Falar com morador
                            </Button>

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
                              className="flex-1 sm:flex-none"
                              variant={delivery.status === 'PICKED_UP' ? 'primary' : 'secondary'}
                              onClick={() =>
                                delivery.status === 'PICKED_UP'
                                  ? openConfirmDeliveryModal(delivery.id)
                                  : handleUpdateStatus(delivery.id, delivery.status)
                              }
                              loading={updating === delivery.id}
                              disabled={updating !== null || cancelling !== null || waitingMarketplaceRelease}
                            >
                              {waitingMarketplaceRelease ? 'Aguardando liberação' : nextActionLabel[delivery.status]}
                            </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                  );
                })}
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

      {confirmModalDeliveryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Confirmar Entrega</h3>
            <p className="mt-2 text-sm text-gray-600">
              Digite o código de recebimento informado pelo morador para concluir a entrega.
            </p>

            <div className="mt-4">
              <Input
                label="Código de recebimento"
                value={confirmCodeInput}
                onChange={(e) => setConfirmCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">O código possui 6 dígitos numéricos.</p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeConfirmDeliveryModal} disabled={!!updating}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDeliveryWithCode}
                disabled={confirmCodeInput.length !== 6 || !!updating}
                loading={!!updating}
              >
                Confirmar entrega
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
