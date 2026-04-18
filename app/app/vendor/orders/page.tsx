'use client';

import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, MessageSquareText, Store } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { PageHeader } from '@/components/PageHeader';
import { notificationsAPI, vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { loadUnreadCountsByKind } from '@/lib/chatUnread';
import { useNotificationsStore } from '@/lib/notificationsStore';
import { playPreferenceTone, readBooleanPreference } from '@/lib/preferences';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';
import { useSocket } from '@/lib/useSocket';

type OrderMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    role: string;
  };
};

type VendorOrder = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'READY' | 'SENT' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  acceptedAt?: string | null;
  customerName: string;
  apartment: string;
  block?: string | null;
  description?: string;
  totalAmount?: number;
  paymentStatus?: 'PENDING' | 'PAID';
  createdByUser?: {
    id: string;
    name: string;
    phone?: string | null;
    apartment?: string | null;
    block?: string | null;
  };
  delivery?: {
    status: string;
    deliveryPerson?: {
      id: string;
      name: string;
      phone?: string | null;
    };
  };
};

function statusLabel(status: VendorOrder['status']) {
  if (status === 'PENDING') return 'Pendente';
  if (status === 'ACCEPTED') return 'Aceito';
  if (status === 'READY') return 'Pronto';
  if (status === 'SENT') return 'Enviado';
  if (status === 'COMPLETED') return 'Concluído';
  return 'Cancelado';
}

function statusClass(status: VendorOrder['status']) {
  if (status === 'PENDING') return 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]';
  if (status === 'ACCEPTED') return 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]';
  if (status === 'READY') return 'bg-[rgba(31,41,51,0.06)] text-[var(--color-secondary)]';
  if (status === 'SENT') return 'bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)]';
  if (status === 'COMPLETED') return 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]';
  return 'bg-red-100 text-red-800';
}

const ORDER_PRIORITY: Record<VendorOrder['status'], number> = {
  READY: 0,
  ACCEPTED: 1,
  PENDING: 2,
  SENT: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

export default function VendorOrdersPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();
  const { setUnreadCount } = useNotificationsStore();
  const { on, off } = useSocket(user?.id, user?.role, user?.condominiumId);

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [unreadByOrderId, setUnreadByOrderId] = useState<Record<string, number>>({});
  const [messagesByOrder, setMessagesByOrder] = useState<Record<string, OrderMessage[]>>({});
  const [messageDraftByOrder, setMessageDraftByOrder] = useState<Record<string, string>>({});
  const [pickupCodeByOrder, setPickupCodeByOrder] = useState<Record<string, string>>({});
  const [loadingMessagesByOrder, setLoadingMessagesByOrder] = useState<Record<string, boolean>>({});
  const [readyPriority, setReadyPriority] = useState(true);
  const [newOrderAlerts, setNewOrderAlerts] = useState(true);
  const [dispatchConfirmation, setDispatchConfirmation] = useState(true);
  const [chatAlerts, setChatAlerts] = useState(true);
  const [compactLists, setCompactLists] = useState(false);
  const [confirmActions, setConfirmActions] = useState(true);
  const [notifSound, setNotifSound] = useState(true);

  const activeOrders = useMemo(
    () => {
      const visibleOrders = orders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status));

      if (!readyPriority) {
        return visibleOrders;
      }

      return [...visibleOrders].sort((left, right) => {
        const priorityDelta = ORDER_PRIORITY[left.status] - ORDER_PRIORITY[right.status];

        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
    },
    [orders, readyPriority],
  );

  const unreadOrderCount = useMemo(
    () =>
      activeOrders.reduce(
        (total, order) => total + (unreadByOrderId[order.id] ?? 0),
        0,
      ),
    [activeOrders, unreadByOrderId],
  );

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await vendorsAPI.getMyOrders();
      setOrders(response.data);
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível carregar os pedidos agora.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      setUnreadByOrderId(await loadUnreadCountsByKind('ORDER'));
    } catch {
      setUnreadByOrderId({});
    }
  };

  const markOrderChatAsRead = async (orderId: string) => {
    try {
      const response = await notificationsAPI.markContextAsRead(
        'ORDER',
        orderId,
        'CHAT_MESSAGE',
      );

      setUnreadCount(Number(response.data?.unreadCount || 0));
      setUnreadByOrderId((prev) => ({
        ...prev,
        [orderId]: 0,
      }));
    } catch {
      setUnreadByOrderId((prev) => ({
        ...prev,
        [orderId]: 0,
      }));
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'VENDOR') {
      router.push('/ambientes');
      return;
    }
    void Promise.all([loadOrders(), loadUnreadCounts()]);
  }, [hasHydrated, user, router]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    setReadyPriority(readBooleanPreference('nsp_settings_VENDOR_ready_priority', true));
    setNewOrderAlerts(readBooleanPreference('nsp_settings_VENDOR_new_orders', true));
    setDispatchConfirmation(readBooleanPreference('nsp_settings_VENDOR_dispatch_confirmation', true));
    setChatAlerts(readBooleanPreference('nsp_settings_VENDOR_chat_alerts', true));
    setCompactLists(readBooleanPreference('nsp_settings_general_compact_lists', false));
    setConfirmActions(readBooleanPreference('nsp_settings_general_confirm_actions', true));
    setNotifSound(readBooleanPreference('nsp_notif_sound', true));
  }, [hasHydrated]);

  useEffect(() => {
    const handleOrderCreated = (incoming: VendorOrder) => {
      let shouldNotify = false;

      setOrders((prev) => {
        const exists = prev.some((order) => order.id === incoming.id);

        shouldNotify = !exists;

        if (exists) {
          return prev.map((order) => (order.id === incoming.id ? { ...order, ...incoming } : order));
        }
        return [incoming, ...prev];
      });

      if (shouldNotify && newOrderAlerts) {
        addToast(`Novo pedido de ${incoming.customerName} disponível para atendimento.`, 'info');
        if (notifSound) {
          playPreferenceTone();
        }
      }
    };

    const handleOrderUpdated = (incoming: VendorOrder) => {
      setOrders((prev) => {
        const exists = prev.some((order) => order.id === incoming.id);
        if (!exists) {
          return [incoming, ...prev];
        }
        return prev.map((order) => (order.id === incoming.id ? { ...order, ...incoming } : order));
      });
    };

    const handleOrderMessage = (incoming: OrderMessage & { orderId: string }) => {
      if (!incoming?.orderId) return;

      setMessagesByOrder((prev) => ({
        ...prev,
        [incoming.orderId]: [...(prev[incoming.orderId] || []), incoming],
      }));

      if (incoming.sender?.id !== user?.id) {
        if (openOrderId === incoming.orderId) {
          void markOrderChatAsRead(incoming.orderId);
        } else {
          setUnreadByOrderId((prev) => ({
            ...prev,
            [incoming.orderId]: (prev[incoming.orderId] ?? 0) + 1,
          }));
        }
      }

      if (incoming.sender?.id === user?.id || !chatAlerts || openOrderId === incoming.orderId) {
        return;
      }

      addToast(`Nova mensagem no pedido #${incoming.orderId.slice(0, 8)}.`, 'info');
      if (notifSound) {
        playPreferenceTone();
      }
    };

    on('order_created', handleOrderCreated);
    on('order_updated', handleOrderUpdated);
    on('order_message', handleOrderMessage);

    return () => {
      off('order_created', handleOrderCreated);
      off('order_updated', handleOrderUpdated);
      off('order_message', handleOrderMessage);
    };
  }, [
    addToast,
    chatAlerts,
    newOrderAlerts,
    notifSound,
    off,
    on,
    openOrderId,
    user?.id,
  ]);

  const getCancelWindowStartAt = (order: VendorOrder) => {
    if (order.status === 'PENDING') {
      return order.createdAt;
    }

    return order.acceptedAt || order.createdAt;
  };

  const canCancelByWindow = (order: VendorOrder) => {
    const elapsedMs = Date.now() - new Date(getCancelWindowStartAt(order)).getTime();
    return elapsedMs <= 2 * 60 * 1000;
  };

  const updateStatus = async (orderId: string, status: 'ACCEPTED' | 'READY' | 'SENT') => {
    const pickupCode = (pickupCodeByOrder[orderId] || '').replace(/\D/g, '').slice(0, 6);

    if (status === 'SENT' && pickupCode.length !== 6) {
      addToast('Informe o código de coleta de 6 dígitos para confirmar a retirada.', 'warning');
      return;
    }

    if (status === 'SENT' && (dispatchConfirmation || confirmActions)) {
      const confirmed = window.confirm('Confirmar a retirada e liberar o pedido para entrega?');

      if (!confirmed) {
        return;
      }
    }

    try {
      setWorkingOrderId(orderId);
      const response = await vendorsAPI.updateMyOrderStatus(orderId, status, pickupCode || undefined);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? response.data : order)));
      if (status === 'ACCEPTED') {
        addToast('Pedido aceito. O chat foi liberado para o cliente.', 'success');
      } else if (status === 'READY') {
        addToast('Pedido marcado como pronto. Agora ele aparece para entregadores.', 'success');
      } else {
        addToast('Retirada confirmada. Pedido em rota de entrega.', 'success');
        setPickupCodeByOrder((prev) => ({ ...prev, [orderId]: '' }));
      }
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível atualizar o status.'), 'error');
    } finally {
      setWorkingOrderId(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (confirmActions) {
      const confirmed = window.confirm('Cancelar este pedido agora?');

      if (!confirmed) {
        return;
      }
    }

    const reason = window.prompt('Motivo do cancelamento (opcional):') || undefined;

    try {
      setWorkingOrderId(orderId);
      const response = await vendorsAPI.cancelMyOrder(orderId, reason);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? response.data : order)));
      addToast('Pedido cancelado.', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível cancelar este pedido.'), 'error');
    } finally {
      setWorkingOrderId(null);
    }
  };

  const loadMessages = async (orderId: string) => {
    try {
      setLoadingMessagesByOrder((prev) => ({ ...prev, [orderId]: true }));
      const response = await vendorsAPI.getOrderMessages(orderId);
      setMessagesByOrder((prev) => ({ ...prev, [orderId]: response.data }));
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível carregar o chat do pedido.'), 'error');
    } finally {
      setLoadingMessagesByOrder((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const toggleOrderDetails = (orderId: string, canChat: boolean) => {
    if (!canChat) {
      addToast('O chat é liberado após aceitar o pedido.', 'info');
      return;
    }

    if (openOrderId === orderId) {
      setOpenOrderId(null);
      return;
    }
    setOpenOrderId(orderId);
    if (!messagesByOrder[orderId]) {
      void loadMessages(orderId);
    }
    void markOrderChatAsRead(orderId);
  };

  const sendMessage = async (orderId: string) => {
    const draft = (messageDraftByOrder[orderId] || '').trim();
    if (!draft) return;

    try {
      const response = await vendorsAPI.sendOrderMessage(orderId, draft);
      setMessagesByOrder((prev) => ({
        ...prev,
        [orderId]: [...(prev[orderId] || []), response.data],
      }));
      setMessageDraftByOrder((prev) => ({ ...prev, [orderId]: '' }));
      setUnreadByOrderId((prev) => ({
        ...prev,
        [orderId]: 0,
      }));
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível enviar a mensagem.'), 'error');
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Operação da loja"
        title="Pedidos do comércio"
        description="Acompanhe o fluxo comercial da loja, da entrada do pedido até a retirada e envio ao morador."
        meta={
          <>
            {readyPriority && (
              <span className="rounded-full border border-[rgba(26,166,75,0.2)] bg-[rgba(26,166,75,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-dark)]">
                Prontos primeiro
              </span>
            )}
            {unreadOrderCount > 0 && (
              <span className="rounded-full border border-[rgba(24,49,71,0.14)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)]">
                {unreadOrderCount} conversa{unreadOrderCount !== 1 ? 's' : ''} com resposta pendente
              </span>
            )}
            {(newOrderAlerts || chatAlerts) && (
              <span className="rounded-full border border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)]">
                Alertas ativos
              </span>
            )}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => router.push('/vendor/history')}>
              Histórico
            </Button>
            <Button variant="secondary" onClick={() => router.push('/vendor/dashboard')}>
              Dashboard
            </Button>
          </>
        }
      />

      {activeOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum pedido ativo no momento"
          description="Novos pedidos aparecem aqui assim que forem feitos pelos moradores."
        />
      ) : (
        <div className="grid gap-4">
          {activeOrders.map((order) => {
            const canCancel =
              ['PENDING', 'ACCEPTED', 'READY'].includes(order.status) && canCancelByWindow(order);
            const cancelRemainingSec = Math.max(
              0,
              Math.floor(
                (2 * 60 * 1000 - (Date.now() - new Date(getCancelWindowStartAt(order)).getTime())) / 1000,
              ),
            );
            const canChat = order.status !== 'PENDING';
            const unreadMessages = unreadByOrderId[order.id] ?? 0;

            return (
              <Card
                key={order.id}
                className={clsx('rounded-[28px]', compactLists ? 'p-4 sm:p-5' : 'p-5 sm:p-6')}
              >
                <div className={clsx('flex flex-col', compactLists ? 'gap-3' : 'gap-4')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(order.status)}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                        <span className="text-xs text-gray-400">#{order.id.slice(0, 8)}</span>
                      </div>
                      <p className="font-semibold text-[var(--color-secondary)]">{order.customerName}</p>
                      <p className="text-sm text-[var(--color-foreground-soft)]">
                        Apto {order.apartment}
                        {order.block ? `, bloco ${order.block}` : ''}
                      </p>
                      {order.description && (
                        <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">{order.description}</p>
                      )}
                      <p className="mt-2 text-sm font-semibold text-[var(--color-primary-dark)]">
                        Total: R$ {Number(order.totalAmount || 0).toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[var(--color-foreground-soft)]">
                        Pedido com acompanhamento interno e atualização em tempo real.
                      </p>
                      <p className="text-xs text-gray-400">
                        Criado em {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </p>
                      {order.delivery?.deliveryPerson && (
                        <p className="mt-1 text-xs text-emerald-700">
                          Entregador: {order.delivery.deliveryPerson.name}
                          {order.delivery.deliveryPerson.phone ? ` · ${order.delivery.deliveryPerson.phone}` : ''}
                        </p>
                      )}
                      {unreadMessages > 0 && (
                        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-[rgba(24,49,71,0.12)] bg-[rgba(24,49,71,0.06)] px-3 py-1 text-xs font-semibold text-[var(--color-secondary)]">
                          <MessageSquareText className="h-3.5 w-3.5" />
                          {unreadMessages} nova{unreadMessages !== 1 ? 's' : ''} no chat deste pedido
                        </p>
                      )}
                      {chatAlerts && canChat && (
                        <p className="mt-2 text-xs font-medium text-[var(--color-primary-dark)]">
                          O chat deste pedido gera alerta quando houver mensagem nova.
                        </p>
                      )}
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
                      {order.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(order.id, 'ACCEPTED')}
                          loading={workingOrderId === order.id}
                        >
                          Aceitar pedido
                        </Button>
                      )}

                      {order.status === 'ACCEPTED' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(order.id, 'READY')}
                          loading={workingOrderId === order.id}
                        >
                          Marcar como pronto
                        </Button>
                      )}

                      {order.status === 'READY' && (
                        <>
                          {order.delivery?.deliveryPerson ? (
                            <div className="rounded-lg border border-[rgba(31,41,51,0.12)] bg-[rgba(31,41,51,0.04)] p-2">
                              <p className="text-xs font-semibold text-[var(--color-secondary)]">Código de coleta do entregador</p>
                              <Input
                                value={pickupCodeByOrder[order.id] || ''}
                                onChange={(e) =>
                                  setPickupCodeByOrder((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value.replace(/\D/g, '').slice(0, 6),
                                  }))
                                }
                                placeholder="000000"
                                inputMode="numeric"
                                maxLength={6}
                              />
                              <p className="mt-1 text-[11px] text-[var(--color-foreground-soft)]">
                                {order.delivery.deliveryPerson.name} deve informar esse código para liberar a retirada.
                              </p>
                            </div>
                          ) : (
                            <p className="rounded-lg border border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] px-3 py-2 text-xs text-[var(--color-secondary)]">
                              Aguardando entregador aceitar a coleta para validar o código de retirada.
                            </p>
                          )}

                          <Button
                            size="sm"
                            onClick={() => updateStatus(order.id, 'SENT')}
                            loading={workingOrderId === order.id}
                            disabled={!order.delivery?.deliveryPerson}
                          >
                            Confirmar retirada e enviar
                          </Button>
                        </>
                      )}

                      {(order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'READY') && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => cancelOrder(order.id)}
                          loading={workingOrderId === order.id}
                          disabled={!canCancel}
                        >
                          Cancelar pedido
                        </Button>
                      )}

                      {(order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'READY') && (
                        <p className="text-xs text-gray-500">
                          {canCancel
                            ? `Janela de cancelamento: ${cancelRemainingSec}s`
                            : 'Janela de cancelamento expirada'}
                        </p>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleOrderDetails(order.id, canChat)}
                      >
                        {openOrderId === order.id ? 'Fechar conversa' : 'Abrir conversa'}
                        {unreadMessages > 0 && (
                          <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[11px] font-bold text-white">
                            {unreadMessages}
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>

                  {openOrderId === order.id && (
                    <div
                      className={clsx(
                        'rounded-[24px] border border-[var(--color-line)] bg-[var(--color-background-soft)]',
                        compactLists ? 'p-3' : 'p-4',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--color-secondary)]">Chat do pedido</p>
                        {unreadMessages === 0 && (
                          <span className="rounded-full border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary-dark)]">
                            Lido agora
                          </span>
                        )}
                      </div>

                      {loadingMessagesByOrder[order.id] ? (
                        <p className="text-xs text-[var(--color-foreground-soft)]">Carregando mensagens...</p>
                      ) : (
                        <div
                          className={clsx(
                            'max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-white',
                            compactLists ? 'p-2.5' : 'p-3',
                          )}
                        >
                          {(messagesByOrder[order.id] || []).length === 0 ? (
                            <p className="text-xs text-[var(--color-foreground-soft)]">Nenhuma mensagem ainda.</p>
                          ) : (
                            (messagesByOrder[order.id] || []).map((message) => (
                              <div
                                key={message.id}
                                className={clsx('rounded-2xl border border-gray-100', compactLists ? 'p-2.5' : 'p-3')}
                              >
                                <p className="text-xs font-semibold text-[var(--color-secondary)]">
                                  {message.sender?.name || 'Usuário'}
                                  {message.sender?.role ? ` (${message.sender.role})` : ''}
                                </p>
                                <p className="text-sm text-[var(--color-secondary)]">{message.content}</p>
                                <p className="mt-1 text-[11px] text-[var(--color-foreground-soft)]">
                                  {new Date(message.createdAt).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          className="field-input h-11 flex-1 px-3 text-sm"
                          placeholder="Mensagem para cliente e entregador"
                          value={messageDraftByOrder[order.id] || ''}
                          onChange={(e) =>
                            setMessageDraftByOrder((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                        />
                        <Button size="sm" onClick={() => sendMessage(order.id)} disabled={!canChat}>
                          Enviar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
