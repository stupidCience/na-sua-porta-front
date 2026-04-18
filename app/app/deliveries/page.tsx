'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, PackageOpen, Rocket, Truck } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { ProgressStepper } from '@/components/ProgressStepper';
import { deliveriesAPI, getApiErrorMessage, notificationsAPI } from '@/lib/api';
import { loadOperationalChats, type OperationalChatSummary } from '@/lib/chatUnread';
import { useNotificationsStore } from '@/lib/notificationsStore';
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

const inferOrderStatus = (delivery: Delivery) => {
  if (delivery.order?.status) return delivery.order.status;
  if (delivery.status === 'DELIVERED') return 'COMPLETED';
  if (delivery.status === 'PICKED_UP') return 'SENT';
  if (delivery.status === 'ACCEPTED') return 'ACCEPTED';
  return 'PENDING';
};

const orderSteps = [
  { key: 'PENDING', label: 'Pendente', icon: '1' },
  { key: 'ACCEPTED', label: 'Aceito', icon: '2' },
  { key: 'READY', label: 'Pronto', icon: '3' },
  { key: 'SENT', label: 'Enviado', icon: '4' },
  { key: 'COMPLETED', label: 'Concluído', icon: '5' },
];

export default function DeliveriesPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { setUnreadCount } = useNotificationsStore();
  const { on, off, connectionStatus, onlineDeliveryPeople } = useSocket(
    user?.id,
    user?.role,
    user?.condominiumId,
  );
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [orderChatsById, setOrderChatsById] = useState<Record<string, OperationalChatSummary>>({});
  const [deliveryChatsById, setDeliveryChatsById] = useState<Record<string, OperationalChatSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role === 'RESIDENT') {
      void Promise.all([loadDeliveries(), loadResidentChats()]);
      return;
    }

    void loadDeliveries();
  }, [user, router, hasHydrated]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveriesAPI.getAll();
      setDeliveries(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar seus pedidos agora.'));
    } finally {
      setLoading(false);
    }
  };

  const loadResidentChats = async () => {
    if (user?.role !== 'RESIDENT') {
      setOrderChatsById({});
      setDeliveryChatsById({});
      return;
    }

    try {
      const chats = await loadOperationalChats();
      const nextOrderChats: Record<string, OperationalChatSummary> = {};
      const nextDeliveryChats: Record<string, OperationalChatSummary> = {};

      chats.forEach((chat) => {
        if (chat.kind === 'ORDER') {
          nextOrderChats[chat.id] = chat;
          return;
        }

        nextDeliveryChats[chat.id] = chat;
      });

      setOrderChatsById(nextOrderChats);
      setDeliveryChatsById(nextDeliveryChats);
    } catch {
      setOrderChatsById({});
      setDeliveryChatsById({});
    }
  };

  const clearResidentUnread = (kind: 'ORDER' | 'DELIVERY', id: string) => {
    if (kind === 'ORDER') {
      setOrderChatsById((prev) => {
        const current = prev[id];
        if (!current) {
          return prev;
        }

        return {
          ...prev,
          [id]: {
            ...current,
            unreadCount: 0,
          },
        };
      });
      return;
    }

    setDeliveryChatsById((prev) => {
      const current = prev[id];
      if (!current) {
        return prev;
      }

      return {
        ...prev,
        [id]: {
          ...current,
          unreadCount: 0,
        },
      };
    });
  };

  const openResidentChat = async (kind: 'ORDER' | 'DELIVERY', id: string) => {
    const unreadCountForChat =
      kind === 'ORDER'
        ? orderChatsById[id]?.unreadCount ?? 0
        : deliveryChatsById[id]?.unreadCount ?? 0;

    if (unreadCountForChat > 0) {
      try {
        const response = await notificationsAPI.markContextAsRead(kind, id, 'CHAT_MESSAGE');
        setUnreadCount(Number(response.data?.unreadCount || 0));
      } catch {
        // The chat screen retries read sync if necessary.
      }

      clearResidentUnread(kind, id);
    }

    if (kind === 'ORDER') {
      router.push(`/chats?kind=ORDER&orderId=${id}`);
      return;
    }

    router.push(`/chats?kind=DELIVERY&deliveryId=${id}`);
  };

  const handleRate = async (deliveryId: string, rating: number) => {
    try {
      const response = await deliveriesAPI.rate(deliveryId, rating);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? response.data : d))
      );
      setRatingId(null);
      addToast('Obrigado pela avaliação!', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos salvar sua avaliação agora.'), 'error');
    }
  };

  const handleCancel = async (deliveryId: string) => {
    try {
      setCancellingId(deliveryId);
      await deliveriesAPI.cancel(deliveryId);
      setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
      addToast('Pedido cancelado com sucesso.', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos cancelar seu pedido agora.'), 'error');
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
        addToast(`🚀 ${delivery.deliveryPerson.name} aceitou seu pedido!`, 'success');
      } else if (delivery.status === 'PICKED_UP') {
        addToast('🚴 Seu pedido está a caminho!', 'info');
      } else if (delivery.status === 'DELIVERED') {
        addToast('🎉 Entrega finalizada! Seu pacote chegou.', 'success');
      }
    };

    const handleDeliveryCancelled = (payload: { id: string }) => {
      setDeliveries((prev) => prev.filter((d) => d.id !== payload.id));
      setDeliveryChatsById((prev) => {
        const next = { ...prev };
        delete next[payload.id];
        return next;
      });
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

  useEffect(() => {
    if (user?.role !== 'RESIDENT') {
      return;
    }

    const refreshResidentChats = () => {
      void loadResidentChats();
    };

    const handleOrderMessage = (message: { orderId: string; sender?: { id?: string } }) => {
      if (!message?.orderId || message.sender?.id === user.id) {
        return;
      }

      void loadResidentChats();
    };

    const handleDeliveryMessage = (message: { deliveryId: string; sender?: { id?: string } }) => {
      if (!message?.deliveryId || message.sender?.id === user.id) {
        return;
      }

      void loadResidentChats();
    };

    on('order_message', handleOrderMessage);
    on('delivery_message', handleDeliveryMessage);
    on('order_updated', refreshResidentChats);
    on('delivery_updated', refreshResidentChats);

    return () => {
      off('order_message', handleOrderMessage);
      off('delivery_message', handleDeliveryMessage);
      off('order_updated', refreshResidentChats);
      off('delivery_updated', refreshResidentChats);
    };
  }, [off, on, user]);

  const visibleDeliveries =
    user?.role === 'RESIDENT'
      ? deliveries.filter((d) => d.status !== 'DELIVERED')
      : deliveries;

  const residentUnreadChatCount =
    user?.role === 'RESIDENT'
      ? visibleDeliveries.reduce((total, delivery) => {
          const orderUnread = delivery.order?.id ? orderChatsById[delivery.order.id]?.unreadCount ?? 0 : 0;
          const deliveryUnread = deliveryChatsById[delivery.id]?.unreadCount ?? 0;

          return total + orderUnread + deliveryUnread;
        }, 0)
      : 0;

  const hasAnyPreviousOrder = deliveries.length > 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando seus pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8 mobile-safe-bottom md:pb-8">
      <PageHeader
        eyebrow="Pedidos e entregas"
        title="Minhas entregas"
        description="Acompanhe suas compras e coletas com uma leitura clara do andamento, da retirada à chegada no condomínio."
        meta={
          <>
            {user?.role === 'RESIDENT' && (
              <span className="rounded-full border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] px-3 py-1.5 font-medium text-[var(--color-primary-dark)]">
                {onlineDeliveryPeople} entregadores online
              </span>
            )}
            <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 font-medium text-[var(--color-secondary)]">
              {visibleDeliveries.length} entrega{visibleDeliveries.length !== 1 ? 's' : ''} ativa{visibleDeliveries.length !== 1 ? 's' : ''}
            </span>
            {user?.role === 'RESIDENT' && residentUnreadChatCount > 0 && (
              <span className="rounded-full border border-[rgba(24,49,71,0.12)] bg-[rgba(24,49,71,0.06)] px-3 py-1.5 font-medium text-[var(--color-secondary)]">
                {residentUnreadChatCount} mensagem{residentUnreadChatCount !== 1 ? 'ens' : ''} pendente{residentUnreadChatCount !== 1 ? 's' : ''} no chat
              </span>
            )}
            <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-background-soft)] px-3 py-1.5 font-medium text-[var(--color-foreground-soft)]">
              Histórico total: {deliveries.length}
            </span>
          </>
        }
        actions={
          <Link href="/deliveries/new" className="hidden md:block">
            <Button size="lg">Solicitar coleta</Button>
          </Link>
        }
      />

      {visibleDeliveries.some((d) => d.status === 'REQUESTED') && (
        <NoticeBanner tone="warning">
          Procurando entregador... Você receberá atualização em instantes.
        </NoticeBanner>
      )}

      {connectionStatus === 'reconnecting' && (
        <NoticeBanner tone="warning">
          Atualizando suas informações. Sua lista volta em instantes.
        </NoticeBanner>
      )}


      {visibleDeliveries.some((d) => d.status === 'ACCEPTED' && d.deliveryPerson?.name) && (
        <NoticeBanner tone="info">
          Entregador a caminho: {visibleDeliveries.find((d) => d.status === 'ACCEPTED' && d.deliveryPerson?.name)?.deliveryPerson?.name} aceitou seu pedido.
        </NoticeBanner>
      )}

      {error && (
        <NoticeBanner tone="error">{error}</NoticeBanner>
      )}

      {visibleDeliveries.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={hasAnyPreviousOrder ? 'Nenhum pedido em aberto' : 'Nenhuma entrega ainda'}
          description={
            hasAnyPreviousOrder
              ? 'Você já possui pedidos no histórico. Assim que abrir uma nova solicitação, ela aparecerá aqui.'
              : 'Comece seu uso com uma primeira coleta em poucos segundos.'
          }
          actions={
            <Link href="/deliveries/new">
              <Button size="lg">{hasAnyPreviousOrder ? 'Solicitar nova coleta' : 'Fazer primeira coleta'}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {visibleDeliveries.map((delivery) => {
            const orderChat = delivery.order?.id ? orderChatsById[delivery.order.id] : null;
            const deliveryChat = deliveryChatsById[delivery.id] || null;
            const orderUnreadCount = orderChat?.unreadCount ?? 0;
            const deliveryUnreadCount = deliveryChat?.unreadCount ?? 0;
            const totalUnreadCount = orderUnreadCount + deliveryUnreadCount;
            const hasResidentChatActions = Boolean(orderChat || deliveryChat);
            const orderChatName = orderChat?.vendorName?.trim() || null;
            const deliveryChatName =
              deliveryChat?.deliveryPersonName?.trim() ||
              delivery.deliveryPerson?.name?.trim() ||
              null;

            return (
              <Card key={delivery.id} className={`${highlightedId === delivery.id ? 'ring-2 ring-[var(--color-accent-strong)] transition-shadow duration-500' : ''} rounded-[28px] p-5 sm:p-6`}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <StatusBadge status={delivery.status} />
                      <span className="text-xs text-[var(--color-foreground-soft)]">
                        #{delivery.id.slice(0, 8)}
                      </span>
                      {user?.role === 'RESIDENT' && totalUnreadCount > 0 && (
                        <span className="rounded-full border border-[rgba(24,49,71,0.12)] bg-[rgba(24,49,71,0.06)] px-2.5 py-1 text-xs font-semibold text-[var(--color-secondary)]">
                          {totalUnreadCount} nova{totalUnreadCount !== 1 ? 's' : ''} em conversa
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 text-[var(--color-secondary)]">
                      <div className="inline-flex rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-3">
                        <p className="text-sm">
                          <span className="text-[var(--color-foreground-soft)]">Destino:</span>{' '}
                          <strong>Apto {delivery.apartment}, Bloco {delivery.block}</strong>
                        </p>
                      </div>
                      {delivery.description && (
                        <p className="text-sm leading-6 text-[var(--color-foreground-soft)]">
                          <span className="font-medium text-[var(--color-secondary)]">Pacote:</span>{' '}
                          {delivery.description}
                        </p>
                      )}

                      <ProgressStepper
                        title="Etapas da entrega"
                        steps={deliverySteps}
                        currentKey={delivery.status}
                      />

                      {delivery.type === 'MARKETPLACE' && (
                        <>
                          <ProgressStepper
                            title="Etapas do pedido"
                            steps={orderSteps}
                            currentKey={delivery.status === 'DELIVERED' ? 'COMPLETED' : inferOrderStatus(delivery)}
                          />
                          <p className="text-xs font-semibold text-gray-700">
                            Pagamento:{' '}
                            <span className={`rounded-full px-2 py-0.5 ${delivery.order?.paymentStatus === 'PAID' ? 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]' : 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]'}`}>
                              {delivery.order?.paymentStatus === 'PAID' ? 'Pago' : 'Pendente'}
                            </span>
                          </p>
                        </>
                      )}
                      {delivery.deliveryPerson && (
                        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] px-4 py-3">
                          <Avatar name={delivery.deliveryPerson.name} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-[var(--color-primary-dark)]">{delivery.deliveryPerson.name}</p>
                            <p className="text-xs text-[var(--color-secondary)]">
                              Entregador responsável
                              {delivery.deliveryPerson.phone && ` · ${delivery.deliveryPerson.phone}`}
                            </p>
                          </div>
                        </div>
                      )}
                      {delivery.status === 'REQUESTED' && (
                        <p className="mt-2 text-sm italic text-[var(--color-secondary)]">
                          Estamos procurando um entregador para você...
                        </p>
                      )}

                      {user?.role === 'RESIDENT' && (
                        <div className="mt-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            {orderChat && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full justify-between sm:w-auto sm:max-w-[19rem]"
                                onClick={() => void openResidentChat('ORDER', orderChat.id)}
                              >
                                <span className="min-w-0 text-left leading-tight">
                                  <span className="block">Falar com a loja</span>
                                  {orderChatName && (
                                    <span className="block truncate text-[11px] font-medium text-[var(--color-foreground-soft)]">
                                      {orderChatName}
                                    </span>
                                  )}
                                </span>
                                {orderUnreadCount > 0 && (
                                  <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[11px] font-bold text-white">
                                    {orderUnreadCount}
                                  </span>
                                )}
                              </Button>
                            )}
                            {deliveryChat && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full justify-between sm:w-auto sm:max-w-[19rem]"
                                onClick={() => void openResidentChat('DELIVERY', deliveryChat.id)}
                              >
                                <span className="min-w-0 text-left leading-tight">
                                  <span className="block">Falar com o entregador</span>
                                  {deliveryChatName && (
                                    <span className="block truncate text-[11px] font-medium text-[var(--color-foreground-soft)]">
                                      {deliveryChatName}
                                    </span>
                                  )}
                                </span>
                                {deliveryUnreadCount > 0 && (
                                  <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[11px] font-bold text-white">
                                    {deliveryUnreadCount}
                                  </span>
                                )}
                              </Button>
                            )}
                          </div>

                          {totalUnreadCount > 0 && (
                            <p className="mt-2 text-xs font-medium text-[var(--color-primary-dark)]">
                              Há resposta nova aguardando sua leitura nesta entrega.
                            </p>
                          )}

                          {!orderChat && delivery.type === 'MARKETPLACE' && delivery.order?.status === 'PENDING' && (
                            <p className="mt-2 text-xs text-[var(--color-foreground-soft)]">
                              O chat com a loja será liberado assim que o pedido for aceito.
                            </p>
                          )}

                          {!deliveryChat && delivery.status === 'REQUESTED' && (
                            <p className="mt-2 text-xs text-[var(--color-foreground-soft)]">
                              O chat com o entregador será aberto quando alguém aceitar sua solicitação.
                            </p>
                          )}

                          {!hasResidentChatActions &&
                            delivery.status !== 'REQUESTED' &&
                            !(delivery.type === 'MARKETPLACE' && delivery.order?.status === 'PENDING') && (
                              <p className="mt-2 text-xs text-[var(--color-foreground-soft)]">
                                As conversas desta entrega ainda estão sendo preparadas.
                              </p>
                            )}
                        </div>
                      )}

                      {user?.role === 'RESIDENT' &&
                        ['ACCEPTED', 'PICKED_UP'].includes(delivery.status) &&
                        delivery.deliveryCode && (
                          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <p className="text-xs text-emerald-700 uppercase tracking-wide">Código de recebimento</p>
                            <p className="text-2xl font-bold text-emerald-800 tracking-[0.2em]">
                              {delivery.deliveryCode}
                            </p>
                            <p className="text-xs text-emerald-700 mt-1">
                              Informe este código ao entregador no momento da entrega.
                            </p>
                          </div>
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
                        <div className="mt-3 border-t border-[var(--color-line)] pt-3">
                          {delivery.rating ? (
                            <div className="flex items-center gap-2">
                              <StarRating rating={delivery.rating} readonly size="sm" />
                              <span className="text-xs text-[var(--color-foreground-soft)]">Sua avaliação</span>
                            </div>
                          ) : ratingId === delivery.id ? (
                            <div>
                              <p className="mb-1 text-sm text-[var(--color-foreground-soft)]">Como foi a entrega?</p>
                              <StarRating onRate={(r) => handleRate(delivery.id, r)} size="md" />
                            </div>
                          ) : (
                            <button
                              onClick={() => setRatingId(delivery.id)}
                              className="text-sm font-medium text-[var(--color-primary-dark)] hover:text-[var(--color-secondary)]"
                            >
                              ⭐ Avaliar entrega
                            </button>
                          )}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-[var(--color-foreground-soft)]">
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
            );
          })}
        </div>
      )}

      <Link href="/deliveries/new" className="floating-safe-bottom fixed right-4 z-40 md:hidden">
        <Button size="lg" className="shadow-lg">Solicitar coleta</Button>
      </Link>
    </div>
  );
}
