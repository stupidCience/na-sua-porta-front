'use client';

import clsx from 'clsx';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  MessageSquareText,
  Plus,
  SendHorizonal,
  Smile,
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import {
  getApiErrorMessage,
  notificationsAPI,
  ordersAPI,
} from '@/lib/api';
import { useNotificationsStore } from '@/lib/notificationsStore';
import { playPreferenceTone, readBooleanPreference } from '@/lib/preferences';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';
import { useSocket } from '@/lib/useSocket';

type ChatKind = 'ORDER' | 'DELIVERY';
type ChatStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'READY'
  | 'SENT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REQUESTED'
  | 'PICKED_UP'
  | 'DELIVERED';

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  kind?: ChatKind;
  orderId?: string;
  deliveryId?: string;
  sender?: {
    id: string;
    name: string;
    role: string;
  };
};

type ChatSummary = {
  id: string;
  kind: ChatKind;
  status: ChatStatus;
  customerName: string;
  apartment: string;
  block?: string | null;
  updatedAt: string;
  createdAt: string;
  canSend: boolean;
  messageCount: number;
  unreadCount: number;
  vendor?: {
    id: string;
    name: string;
  } | null;
  delivery?: {
    id: string;
    deliveryPersonId?: string | null;
    deliveryPerson?: {
      id: string;
      name: string;
    } | null;
  } | null;
  lastMessage?: ChatMessage | null;
};

function chatKey(chat: { kind: ChatKind; id: string }) {
  return `${chat.kind}:${chat.id}`;
}

function statusLabel(status: ChatStatus) {
  if (status === 'PENDING') return 'Pendente';
  if (status === 'ACCEPTED') return 'Aceito';
  if (status === 'READY') return 'Pronto';
  if (status === 'SENT') return 'Enviado';
  if (status === 'COMPLETED') return 'Concluído';
  if (status === 'CANCELLED') return 'Cancelado';
  if (status === 'REQUESTED') return 'Solicitado';
  if (status === 'PICKED_UP') return 'Coletado';
  return 'Entregue';
}

function roleLabel(role?: string) {
  if (role === 'RESIDENT') return 'Morador';
  if (role === 'VENDOR') return 'Comércio';
  if (role === 'DELIVERY_PERSON') return 'Entregador';
  if (role === 'CONDOMINIUM_ADMIN') return 'Administrador';
  return 'Participante';
}

function chatHeadline(chat: ChatSummary, viewerRole?: string) {
  if (chat.kind === 'ORDER') {
    if (viewerRole === 'RESIDENT') {
      return chat.vendor?.name || 'Comércio parceiro';
    }

    return chat.customerName;
  }

  if (viewerRole === 'RESIDENT') {
    return chat.delivery?.deliveryPerson?.name || 'Entregador';
  }

  return chat.customerName;
}

function chatSupportLine(chat: ChatSummary, viewerRole?: string) {
  const apartmentLine = `Bloco ${chat.block || '-'} · Apto ${chat.apartment}`;

  if (chat.kind === 'ORDER') {
    if (viewerRole === 'RESIDENT') {
      return `Pedido ativo · ${apartmentLine}`;
    }

    if (viewerRole === 'VENDOR') {
      return `Cliente do atendimento · ${apartmentLine}`;
    }

    return `${chat.vendor?.name ? `Loja ${chat.vendor.name} · ` : ''}${apartmentLine}`;
  }

  if (viewerRole === 'RESIDENT') {
    return `Entrega em rota · ${apartmentLine}`;
  }

  return `Morador do atendimento · ${apartmentLine}`;
}

function chatPreviewLine(chat: ChatSummary) {
  if (!chat.lastMessage) {
    return 'Sem mensagens recentes nesta conversa.';
  }

  return `${chat.lastMessage.sender?.name || roleLabel(chat.lastMessage.sender?.role)}: ${chat.lastMessage.content}`;
}

function conversationDescription(chat: ChatSummary, viewerRole?: string) {
  const apartmentLine = `Bloco ${chat.block || '-'} · Apto ${chat.apartment}`;

  if (chat.kind === 'ORDER') {
    if (viewerRole === 'RESIDENT') {
      return `${chat.vendor?.name ? `Comércio ${chat.vendor.name}` : 'Comércio parceiro'} · ${apartmentLine}`;
    }

    if (viewerRole === 'VENDOR') {
      return `Morador ${chat.customerName} · ${apartmentLine}`;
    }

    return `${chat.vendor?.name ? `Loja ${chat.vendor.name}` : 'Pedido interno'} · ${apartmentLine}`;
  }

  if (viewerRole === 'RESIDENT') {
    return `${chat.delivery?.deliveryPerson?.name ? `Entregador ${chat.delivery.deliveryPerson.name}` : 'Entregador em rota'} · ${apartmentLine}`;
  }

  return `Morador ${chat.customerName} · ${apartmentLine}`;
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatListDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function connectionLabel(status: 'connected' | 'reconnecting' | 'disconnected') {
  if (status === 'connected') return 'Ao vivo';
  if (status === 'reconnecting') return 'Reconectando';
  return 'Pausado';
}

function ChatsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();
  const { setUnreadCount, unreadCount } = useNotificationsStore();
  const { on, off, connectionStatus } = useSocket(
    user?.id,
    user?.role,
    user?.condominiumId,
  );

  const preferredChatNotifiedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChatKey, setSelectedChatKey] = useState<string | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [draftByChat, setDraftByChat] = useState<Record<string, string>>({});
  const [notifBanner, setNotifBanner] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [compactLists, setCompactLists] = useState(false);
  const [desktopView, setDesktopView] = useState(false);

  const selectedChat = useMemo(
    () => chats.find((chat) => chatKey(chat) === selectedChatKey) || null,
    [chats, selectedChatKey],
  );

  const selectedMessages = selectedChat
    ? messagesByChat[chatKey(selectedChat)] || []
    : [];

  const preferredOrderId = useMemo(
    () => searchParams.get('orderId') || null,
    [searchParams],
  );
  const preferredDeliveryId = useMemo(
    () => searchParams.get('deliveryId') || null,
    [searchParams],
  );

  const preferredChatKey = useMemo(() => {
    if (preferredDeliveryId) {
      return `DELIVERY:${preferredDeliveryId}`;
    }

    if (preferredOrderId) {
      return `ORDER:${preferredOrderId}`;
    }

    return null;
  }, [preferredDeliveryId, preferredOrderId]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    setNotifBanner(readBooleanPreference('nsp_notif_banner', true));
    setNotifSound(readBooleanPreference('nsp_notif_sound', true));
    setCompactLists(readBooleanPreference('nsp_settings_general_compact_lists', false));
  }, [hasHydrated]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const syncViewport = () => {
      setDesktopView(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);

    return () => {
      mediaQuery.removeEventListener('change', syncViewport);
    };
  }, []);

  const updateChatWithMessage = (
    kind: ChatKind,
    id: string,
    message: ChatMessage,
    options?: { unreadDelta?: number; resetUnread?: boolean },
  ) => {
    setChats((previous) => {
      const next = previous.map((chat) => {
        if (chat.kind !== kind || chat.id !== id) {
          return chat;
        }

        return {
          ...chat,
          updatedAt: message.createdAt,
          lastMessage: message,
          messageCount: chat.messageCount + 1,
          unreadCount: options?.resetUnread
            ? 0
            : chat.unreadCount + (options?.unreadDelta ?? 0),
        };
      });

      return next.sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
    });
  };

  const appendMessage = (
    kind: ChatKind,
    id: string,
    message: ChatMessage,
    options?: { unreadDelta?: number; resetUnread?: boolean },
  ) => {
    const key = `${kind}:${id}`;
    let appended = false;

    setMessagesByChat((previous) => {
      const current = previous[key] || [];
      if (current.some((item) => item.id === message.id)) {
        return previous;
      }

      appended = true;
      return {
        ...previous,
        [key]: [...current, { ...message, kind }],
      };
    });

    if (appended) {
      updateChatWithMessage(kind, id, { ...message, kind }, options);
    }
  };

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getChats();
      const rawData = (response.data || []) as Partial<ChatSummary>[];
      const data: ChatSummary[] = rawData.map((chat) => ({
        id: String(chat.id || ''),
        kind: chat.kind === 'DELIVERY' ? 'DELIVERY' : 'ORDER',
        status: (chat.status as ChatStatus) || 'PENDING',
        customerName: chat.customerName || 'Morador',
        apartment: chat.apartment || '-',
        block: chat.block ?? null,
        updatedAt: String(chat.updatedAt || new Date().toISOString()),
        createdAt: String(chat.createdAt || new Date().toISOString()),
        canSend: Boolean(chat.canSend),
        messageCount: Number(chat.messageCount || 0),
        unreadCount: Number(chat.unreadCount || 0),
        vendor: chat.vendor || null,
        delivery: chat.delivery || null,
        lastMessage: chat.lastMessage || null,
      }));

      setChats(data);

      setSelectedChatKey((current) => {
        if (preferredChatKey && data.some((chat) => chatKey(chat) === preferredChatKey)) {
          return preferredChatKey;
        }

        if (current && data.some((chat) => chatKey(chat) === current)) {
          return current;
        }

        return desktopView && data[0] ? chatKey(data[0]) : null;
      });

      if (
        preferredChatKey &&
        !data.some((chat) => chatKey(chat) === preferredChatKey) &&
        !preferredChatNotifiedRef.current
      ) {
        preferredChatNotifiedRef.current = true;
        addToast('Esta conversa ainda não está disponível. Tente novamente em instantes.', 'info');
      }
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível carregar os chats agora.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chat: ChatSummary) => {
    const key = chatKey(chat);

    try {
      setLoadingMessages(true);
      const response = await ordersAPI.getMessages(chat.id, chat.kind);
      setMessagesByChat((previous) => ({
        ...previous,
        [key]: response.data || [],
      }));
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível carregar as mensagens.'), 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const markChatAsRead = async (chat: ChatSummary) => {
    if (chat.unreadCount <= 0) {
      return;
    }

    try {
      const response = await notificationsAPI.markContextAsRead(
        chat.kind,
        chat.id,
        'CHAT_MESSAGE',
      );
      setUnreadCount(Number(response.data?.unreadCount || 0));
      setChats((previous) =>
        previous.map((item) =>
          chatKey(item) === chatKey(chat)
            ? {
                ...item,
                unreadCount: 0,
              }
            : item,
        ),
      );
    } catch {
      // Keep the chat usable even if read-sync fails.
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!['RESIDENT', 'VENDOR', 'DELIVERY_PERSON'].includes(user.role)) {
      router.push('/ambientes');
      return;
    }

    void loadChats();
  }, [hasHydrated, preferredChatKey, router, user]);

  useEffect(() => {
    if (!selectedChat) {
      return;
    }

    const key = chatKey(selectedChat);
    if (!messagesByChat[key]) {
      void loadMessages(selectedChat);
    }

    void markChatAsRead(selectedChat);
  }, [messagesByChat, selectedChat, selectedChatKey]);

  useEffect(() => {
    if (!desktopView || selectedChatKey || chats.length === 0) {
      return;
    }

    setSelectedChatKey(chatKey(chats[0]));
  }, [chats, desktopView, selectedChatKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChatKey, selectedMessages.length]);

  useEffect(() => {
    const handleOrderMessage = (message: ChatMessage & { orderId: string }) => {
      if (!message?.orderId) return;

      const key = `ORDER:${message.orderId}`;
      const isOwnMessage = message.sender?.id === user?.id;
      const shouldIncrementUnread = !isOwnMessage && selectedChatKey !== key;

      appendMessage('ORDER', message.orderId, message, {
        unreadDelta: shouldIncrementUnread ? 1 : 0,
        resetUnread: !isOwnMessage && selectedChatKey === key,
      });

      if (!isOwnMessage && selectedChatKey === key) {
        const activeChat = chats.find((chat) => chatKey(chat) === key);
        if (activeChat) {
          void markChatAsRead(activeChat);
        }
      }

      if (!isOwnMessage && selectedChatKey !== key) {
        if (notifBanner) {
          addToast(`Nova mensagem no pedido #${message.orderId.slice(0, 8)}.`, 'info');
        }
        if (notifSound) {
          playPreferenceTone();
        }
      }
    };

    const handleDeliveryMessage = (message: ChatMessage & { deliveryId: string }) => {
      if (!message?.deliveryId) return;

      const key = `DELIVERY:${message.deliveryId}`;
      const isOwnMessage = message.sender?.id === user?.id;
      const shouldIncrementUnread = !isOwnMessage && selectedChatKey !== key;

      appendMessage('DELIVERY', message.deliveryId, message, {
        unreadDelta: shouldIncrementUnread ? 1 : 0,
        resetUnread: !isOwnMessage && selectedChatKey === key,
      });

      if (!isOwnMessage && selectedChatKey === key) {
        const activeChat = chats.find((chat) => chatKey(chat) === key);
        if (activeChat) {
          void markChatAsRead(activeChat);
        }
      }

      if (!isOwnMessage && selectedChatKey !== key) {
        if (notifBanner) {
          addToast(`Nova mensagem na entrega #${message.deliveryId.slice(0, 8)}.`, 'info');
        }
        if (notifSound) {
          playPreferenceTone();
        }
      }
    };

    const handleOrderUpdated = () => {
      void loadChats();
    };

    const handleDeliveryUpdated = () => {
      void loadChats();
    };

    on('order_message', handleOrderMessage);
    on('delivery_message', handleDeliveryMessage);
    on('order_updated', handleOrderUpdated);
    on('delivery_updated', handleDeliveryUpdated);

    return () => {
      off('order_message', handleOrderMessage);
      off('delivery_message', handleDeliveryMessage);
      off('order_updated', handleOrderUpdated);
      off('delivery_updated', handleDeliveryUpdated);
    };
  }, [
    addToast,
    chats,
    notifBanner,
    notifSound,
    off,
    on,
    selectedChatKey,
    user?.id,
  ]);

  const sendMessage = async () => {
    if (!selectedChat) return;

    const key = chatKey(selectedChat);
    const draft = (draftByChat[key] || '').trim();
    if (!draft) return;

    try {
      setSending(true);
      const response = await ordersAPI.sendMessage(selectedChat.id, draft, selectedChat.kind);
      const message = response.data as ChatMessage;

      appendMessage(selectedChat.kind, selectedChat.id, message, {
        resetUnread: true,
      });
      setDraftByChat((previous) => ({ ...previous, [key]: '' }));
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível enviar a mensagem.'), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
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
    <div className="-mx-4 -mb-8 -mt-8 sm:-mx-6 lg:mx-auto lg:mb-0 lg:mt-0 lg:max-w-7xl lg:pb-10">
      {chats.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="Nenhuma conversa ativa"
          description="Quando houver atendimento em andamento, ele aparece aqui."
        />
      ) : (
        <div className={clsx('grid gap-5', compactLists ? 'lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[21rem_minmax(0,1fr)]' : 'lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[23.5rem_minmax(0,1fr)]')}>
          <Card padding={false} className={clsx('flex h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-none border-0 bg-white lg:h-auto lg:rounded-[34px] lg:border lg:border-[var(--color-line)]', selectedChat && 'hidden lg:block')}>
            <div className="border-b border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(255,248,236,0.9),rgba(255,255,255,0.96))] px-5 py-4">
              <h2 className="text-xl font-semibold text-[var(--color-secondary)]">
                Conversas
              </h2>
              <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">
                {chats.length} ativa{chats.length !== 1 ? 's' : ''} · {unreadCount} pendente{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 lg:max-h-[72vh]">
              <div className="space-y-2">
                {chats.map((chat) => {
                  const key = chatKey(chat);
                  const isActive = selectedChatKey === key;
                  const title = chatHeadline(chat, user?.role);
                  const subtitle = chatSupportLine(chat, user?.role);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedChatKey(key)}
                      className={clsx(
                        'w-full rounded-[28px] border text-left transition-all',
                        compactLists ? 'px-3 py-3' : 'px-4 py-4',
                        isActive
                          ? 'border-[rgba(26,166,75,0.22)] bg-[rgba(26,166,75,0.06)] shadow-[0_18px_32px_rgba(20,33,24,0.08)]'
                          : 'border-transparent bg-[rgba(255,255,255,0.72)] hover:border-[var(--color-line)] hover:bg-[var(--color-background-soft)]',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={title} size={compactLists ? 'sm' : 'md'} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--color-secondary)] sm:text-base">
                                {title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-[var(--color-foreground-soft)]">
                                {subtitle}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-[11px] text-[var(--color-foreground-soft)]">
                                {formatListDate(chat.updatedAt)}
                              </p>
                              {chat.unreadCount > 0 && (
                                <span className="mt-2 inline-flex min-w-[1.85rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-2 py-1 text-[11px] font-bold text-white">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-foreground-soft)]">
                            {chat.kind === 'ORDER' ? 'Pedido' : 'Entrega'} · {statusLabel(chat.status)}
                          </p>

                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-foreground-soft)]">
                            {chatPreviewLine(chat)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card padding={false} className={clsx('overflow-hidden rounded-none border-0 bg-white lg:rounded-[34px] lg:border lg:border-[var(--color-line)]', !selectedChat && 'hidden lg:block')}>
            {!selectedChat ? (
              <div className="flex h-[min(76vh,52rem)] items-center justify-center p-6">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-background-soft)] text-[var(--color-primary-dark)]">
                    <MessageSquareText className="h-7 w-7" />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold text-[var(--color-secondary)]">
                    Escolha uma conversa para começar
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-foreground-soft)]">
                    Selecione um atendimento para abrir a conversa.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-[calc(100dvh-5.5rem)] flex-col lg:h-[min(76vh,52rem)]">
                <div className="border-b border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(249,251,252,0.96))] px-4 py-4 sm:px-6">
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedChatKey(null)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-white text-[var(--color-secondary)] transition-colors hover:bg-[var(--color-background-soft)] lg:hidden"
                      aria-label="Voltar para lista de conversas"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <Avatar name={chatHeadline(selectedChat, user?.role)} size="lg" />

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[clamp(1.3rem,2vw,1.75rem)] font-semibold tracking-[-0.03em] text-[var(--color-secondary)]">
                        {chatHeadline(selectedChat, user?.role)}
                      </h2>

                      <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-foreground-soft)]">
                        {conversationDescription(selectedChat, user?.role)}
                      </p>

                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-foreground-soft)]">
                        {selectedChat.kind === 'ORDER' ? 'Pedido' : 'Entrega'} · {statusLabel(selectedChat.status)} · {connectionLabel(connectionStatus)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,rgba(246,249,252,0.94),rgba(255,255,255,1))]">
                  <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
                      </div>
                    ) : selectedMessages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-primary-dark)] shadow-[0_12px_24px_rgba(28,25,23,0.05)]">
                          <MessageSquareText className="h-7 w-7" />
                        </div>
                        <div className="max-w-md">
                          <h3 className="text-xl font-semibold text-[var(--color-secondary)]">
                            A conversa começa aqui
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-[var(--color-foreground-soft)]">
                            Envie a primeira mensagem deste atendimento.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto flex max-w-4xl flex-col gap-4">
                        {selectedMessages.map((message) => {
                          const isOwnMessage = message.sender?.id === user?.id;
                          const senderName = isOwnMessage
                            ? 'Você'
                            : message.sender?.name || roleLabel(message.sender?.role);

                          return (
                            <div
                              key={message.id}
                              className={clsx(
                                'flex gap-3',
                                isOwnMessage ? 'justify-end' : 'justify-start',
                              )}
                            >
                              {!isOwnMessage && (
                                <div className="pt-6">
                                  <Avatar name={senderName} size="sm" />
                                </div>
                              )}

                              <div
                                className={clsx(
                                  'flex max-w-[90%] flex-col gap-1 sm:max-w-[75%]',
                                  isOwnMessage ? 'items-end' : 'items-start',
                                )}
                              >
                                <div className={clsx('flex items-center gap-2 px-1 text-xs', isOwnMessage ? 'text-right' : 'text-left')}>
                                  <p className={clsx('font-semibold', isOwnMessage ? 'text-[var(--color-secondary)]' : 'text-[var(--color-primary-dark)]')}>
                                    {senderName}
                                  </p>
                                  <span className="text-[var(--color-foreground-soft)]">
                                    {formatMessageTime(message.createdAt)}
                                  </span>
                                </div>

                                <div
                                  className={clsx(
                                    'px-4 py-3 shadow-[0_18px_28px_rgba(28,25,23,0.06)]',
                                    isOwnMessage
                                      ? 'rounded-[26px_26px_10px_26px] bg-[var(--color-secondary)] text-white'
                                      : 'rounded-[26px_26px_26px_10px] border border-[var(--color-line)] bg-white text-[var(--color-secondary)]',
                                  )}
                                >
                                  <p className={clsx('whitespace-pre-wrap text-sm leading-7', isOwnMessage ? 'text-white' : 'text-[var(--color-secondary)]')}>
                                    {message.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--color-line)] bg-white/95 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6 sm:py-4">
                    <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-[30px] border border-[rgba(24,49,71,0.08)] bg-[rgba(248,246,238,0.96)] p-2.5 shadow-[0_18px_28px_rgba(28,25,23,0.06)] sm:gap-3 sm:p-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-foreground-soft)] shadow-[0_10px_20px_rgba(28,25,23,0.05)]" aria-hidden="true">
                        <Plus className="h-5 w-5" />
                      </div>

                      <div className="flex min-w-0 flex-1 items-end gap-3 rounded-[24px] border border-[var(--color-line)] bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                        <Smile className="mb-1 h-5 w-5 shrink-0 text-[var(--color-foreground-soft)]" aria-hidden="true" />

                        <textarea
                          rows={1}
                          className="max-h-28 min-h-[1.75rem] flex-1 resize-none bg-transparent text-sm leading-7 text-[var(--color-secondary)] outline-none placeholder:text-[var(--color-foreground-soft)]"
                          placeholder={
                            selectedChat.canSend
                              ? 'Escreva uma mensagem'
                              : selectedChat.kind === 'DELIVERY'
                                ? 'Entrega finalizada: envio desativado'
                                : 'Pedido encerrado: envio desativado'
                          }
                          value={draftByChat[chatKey(selectedChat)] || ''}
                          onChange={(event) =>
                            setDraftByChat((previous) => ({
                              ...previous,
                              [chatKey(selectedChat)]: event.target.value,
                            }))
                          }
                          onKeyDown={handleComposerKeyDown}
                          disabled={!selectedChat.canSend || sending}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={!selectedChat.canSend || sending}
                        aria-label="Enviar mensagem"
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_18px_28px_rgba(20,33,24,0.18)] transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-14"
                      >
                        {sending ? (
                          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <SendHorizonal className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {!selectedChat.canSend && (
                      <div className="mx-auto mt-3 flex max-w-4xl justify-end text-xs">
                        <span className="rounded-full border border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.18)] px-3 py-1.5 text-[var(--color-secondary)]">
                          Conversa em modo leitura.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      }
    >
      <ChatsPageContent />
    </Suspense>
  );
}
