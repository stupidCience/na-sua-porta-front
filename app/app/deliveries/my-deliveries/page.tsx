'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, Boxes, MessageCircleMore, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ProgressStepper } from '@/components/ProgressStepper';
import { Avatar } from '@/components/Avatar';
import {
  deliveriesAPI,
  getApiErrorMessage,
  notificationsAPI,
} from '@/lib/api';
import { loadUnreadCountsByKind } from '@/lib/chatUnread';
import { useNotificationsStore } from '@/lib/notificationsStore';
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
  const { setUnreadCount } = useNotificationsStore();
  const { on, off, connectionStatus } = useSocket(
    user?.id,
    user?.role,
    user?.condominiumId,
  );
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [unreadByDeliveryId, setUnreadByDeliveryId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmModalDeliveryId, setConfirmModalDeliveryId] = useState<string | null>(null);
  const [confirmCodeInput, setConfirmCodeInput] = useState('');

  const openChatForDelivery = async (delivery: Delivery) => {
    if ((unreadByDeliveryId[delivery.id] ?? 0) > 0) {
      try {
        const response = await notificationsAPI.markContextAsRead(
          'DELIVERY',
          delivery.id,
          'CHAT_MESSAGE',
        );
        setUnreadCount(Number(response.data?.unreadCount || 0));
      } catch {
        // The chat page will retry read sync if needed.
      }

      setUnreadByDeliveryId((prev) => ({
        ...prev,
        [delivery.id]: 0,
      }));
    }

    router.push(`/chats?kind=DELIVERY&deliveryId=${delivery.id}`);
  };

  useEffect(() => {
    if (!user || user.role !== 'DELIVERY_PERSON') {
      router.push('/');
      return;
    }
    void Promise.all([loadDeliveries(), loadUnreadCounts()]);
  }, [user, router]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveriesAPI.getMyDeliveries();
      setDeliveries(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar suas entregas agora.'));
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      setUnreadByDeliveryId(await loadUnreadCountsByKind('DELIVERY'));
    } catch {
      setUnreadByDeliveryId({});
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
      setUnreadByDeliveryId((prev) => {
        const next = { ...prev };
        delete next[payload.id];
        return next;
      });
    };

    const handleDeliveryMessage = (message: { deliveryId: string; sender?: { id: string } }) => {
      if (!message?.deliveryId || message.sender?.id === user?.id) {
        return;
      }

      setUnreadByDeliveryId((prev) => ({
        ...prev,
        [message.deliveryId]: (prev[message.deliveryId] ?? 0) + 1,
      }));
    };

    on('delivery_updated', handleDeliveryUpdated);
    on('delivery_cancelled', handleDeliveryCancelled);
    on('delivery_message', handleDeliveryMessage);

    return () => {
      off('delivery_updated', handleDeliveryUpdated);
      off('delivery_cancelled', handleDeliveryCancelled);
      off('delivery_message', handleDeliveryMessage);
    };
  }, [on, off, user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando minhas entregas...</p>
        </div>
      </div>
    );
  }

  const activeDeliveries = deliveries.filter((d) => d.status !== 'DELIVERED');
  const completedDeliveries = deliveries.filter((d) => d.status === 'DELIVERED');
  const unreadDeliveryCount = activeDeliveries.reduce(
    (total, delivery) => total + (unreadByDeliveryId[delivery.id] ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8 mobile-safe-bottom">
      <PageHeader
        eyebrow="Operação em andamento"
        title="Minhas entregas"
        description="Acompanhe coletas em andamento, confirme retiradas e conclua cada entrega com uma leitura mais objetiva da sua rota."
        meta={
          <>
            <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 font-medium text-[var(--color-secondary)]">
              {activeDeliveries.length} em andamento
            </span>
            {unreadDeliveryCount > 0 && (
              <span className="rounded-full border border-[rgba(24,49,71,0.12)] bg-[rgba(24,49,71,0.06)] px-3 py-1.5 font-medium text-[var(--color-secondary)]">
                {unreadDeliveryCount} resposta{unreadDeliveryCount !== 1 ? 's' : ''} nova{unreadDeliveryCount !== 1 ? 's' : ''}
              </span>
            )}
            <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-background-soft)] px-3 py-1.5 font-medium text-[var(--color-foreground-soft)]">
              {completedDeliveries.length} concluída{completedDeliveries.length !== 1 ? 's' : ''}
            </span>
          </>
        }
      />

      {connectionStatus === 'reconnecting' && (
        <NoticeBanner tone="warning">
          Atualizando a lista. Suas entregas aparecem com os dados mais recentes em instantes.
        </NoticeBanner>
      )}

      {error && (
        <NoticeBanner tone="error">{error}</NoticeBanner>
      )}

      {deliveries.length === 0 ? (
        <EmptyState
          icon={Bike}
          title="Nenhuma entrega em andamento"
          description="Aceite pedidos disponíveis para começar suas entregas e acompanhar tudo por aqui."
        />
      ) : (
        <div className="space-y-8">
          {activeDeliveries.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[var(--color-secondary)]">Em andamento ({activeDeliveries.length})</h2>
              <div className="grid gap-4">
                {activeDeliveries.map((delivery) => {
                  const waitingMarketplaceRelease =
                    delivery.type === 'MARKETPLACE' &&
                    delivery.status === 'ACCEPTED' &&
                    delivery.order?.status !== 'SENT';
                  const unreadMessages = unreadByDeliveryId[delivery.id] ?? 0;

                  return (
                  <Card key={delivery.id} className="rounded-[28px] p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <StatusBadge status={delivery.status} />
                          <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-background-soft)] px-2.5 py-1 text-xs text-[var(--color-secondary)]">
                            {delivery.type === 'MARKETPLACE' ? 'Pedido' : 'Portaria'}
                          </span>
                          {unreadMessages > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(24,49,71,0.12)] bg-[rgba(24,49,71,0.06)] px-2.5 py-1 text-xs font-semibold text-[var(--color-secondary)]">
                              <MessageCircleMore className="h-3.5 w-3.5" />
                              {unreadMessages} nova{unreadMessages !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="inline-block rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-3">
                            <p className="text-xs text-[var(--color-foreground-soft)]">Entregar em</p>
                            <p className="text-lg font-semibold text-[var(--color-secondary)]">
                              Bloco {delivery.block} · Apto {delivery.apartment}
                            </p>
                          </div>

                          {delivery.resident && (
                            <div className="flex items-center gap-2">
                              <Avatar name={delivery.resident.name} size="sm" />
                              <span className="text-sm text-[var(--color-foreground-soft)]">{delivery.resident.name}</span>
                            </div>
                          )}

                          {delivery.description && (
                            <p className="text-sm leading-6 text-[var(--color-foreground-soft)]">{delivery.description}</p>
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
                                <p className="rounded-2xl border border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] px-3 py-2 text-xs text-[var(--color-secondary)]">
                                  Aguarde o comércio confirmar a retirada com o código para continuar.
                                </p>
                              )}
                              {delivery.status === 'ACCEPTED' && (
                                <div className="rounded-2xl border border-[rgba(31,41,51,0.12)] bg-[rgba(31,41,51,0.04)] px-3 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
                                    Código de coleta
                                  </p>
                                  {delivery.order?.pickupCode ? (
                                    <>
                                      <p className="text-xl font-black tracking-[0.18em] text-[var(--color-primary-dark)]">
                                        {delivery.order.pickupCode}
                                      </p>
                                      <p className="text-xs text-[var(--color-foreground-soft)]">
                                        Informe este código ao comércio para liberar o pedido.
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-[var(--color-foreground-soft)]">
                                      Aguardando geração do código de coleta.
                                    </p>
                                  )}
                                </div>
                              )}
                              <p className="text-xs font-semibold text-gray-700">
                                Pagamento:{' '}
                                <span className={`rounded-full px-2 py-0.5 ${delivery.order?.paymentStatus === 'PAID' ? 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]' : 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]'}`}>
                                  {delivery.order?.paymentStatus === 'PAID' ? 'Pago' : 'Pendente'}
                                </span>
                              </p>
                            </>
                          )}

                          <p className="text-sm text-gray-700">
                            <span className="text-[var(--color-foreground-soft)]">Origem do pedido:</span>{' '}
                            {delivery.pickupOrigin || (delivery.type === 'MARKETPLACE' ? 'Comércio parceiro' : 'Portaria')}
                          </p>

                          {delivery.notes && (
                            <p className="text-sm italic text-[var(--color-foreground-soft)]">{delivery.notes}</p>
                          )}

                          <p className="text-xs text-[var(--color-foreground-soft)]">
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
                              onClick={() => void openChatForDelivery(delivery)}
                            >
                              Falar com morador
                              {unreadMessages > 0 && (
                                <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[11px] font-bold text-white">
                                  {unreadMessages}
                                </span>
                              )}
                            </Button>

                            {unreadMessages > 0 && (
                              <p className="text-xs font-medium text-[var(--color-primary-dark)]">
                                Existe resposta nova neste chat da rota.
                              </p>
                            )}

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
              <h2 className="text-lg font-semibold text-[var(--color-secondary)] mb-4">Concluídas ({completedDeliveries.length})</h2>
              <div className="grid gap-4">
                {completedDeliveries.map((delivery) => (
                  <Card key={delivery.id} className="rounded-[28px] p-5 sm:p-6">
                    <div className="flex items-center gap-4 opacity-75">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <StatusBadge status={delivery.status} />
                          <span className="text-sm text-[var(--color-foreground-soft)]">
                            Bloco {delivery.block} · Apto {delivery.apartment}
                          </span>
                        </div>
                        {delivery.resident && (
                          <p className="text-sm text-[var(--color-foreground-soft)]">{delivery.resident.name}</p>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-foreground-soft)]">
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
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-[var(--color-secondary)]">Confirmar Entrega</h3>
            <p className="mt-2 text-sm text-[var(--color-foreground-soft)]">
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
              <p className="mt-1 text-xs text-[var(--color-foreground-soft)]">O código possui 6 dígitos numéricos.</p>
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
