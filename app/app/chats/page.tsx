'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ordersAPI, getApiErrorMessage } from '@/lib/api';
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

function ChatsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();
  const { on, off } = useSocket(user?.id, user?.role);
  const preferredChatNotifiedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChatKey, setSelectedChatKey] = useState<string | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [draftByChat, setDraftByChat] = useState<Record<string, string>>({});

  const selectedChat = useMemo(
    () => chats.find((chat) => chatKey(chat) === selectedChatKey) || null,
    [chats, selectedChatKey],
  );

  const preferredOrderId = useMemo(() => searchParams.get('orderId') || null, [searchParams]);
  const preferredDeliveryId = useMemo(() => searchParams.get('deliveryId') || null, [searchParams]);

  const preferredChatKey = useMemo(() => {
    if (preferredDeliveryId) {
      return `DELIVERY:${preferredDeliveryId}`;
    }

    if (preferredOrderId) {
      return `ORDER:${preferredOrderId}`;
    }

    return null;
  }, [preferredOrderId, preferredDeliveryId]);

  const updateChatWithMessage = (kind: ChatKind, id: string, message: ChatMessage) => {
    setChats((prev) => {
      const next = prev.map((chat) =>
        chat.kind === kind && chat.id === id
          ? {
              ...chat,
              updatedAt: message.createdAt,
              lastMessage: message,
              messageCount: chat.messageCount + 1,
            }
          : chat,
      );

      return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
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

        return data[0] ? chatKey(data[0]) : null;
      });

      if (
        preferredChatKey &&
        !data.some((chat) => chatKey(chat) === preferredChatKey) &&
        !preferredChatNotifiedRef.current
      ) {
        preferredChatNotifiedRef.current = true;
        addToast('Esta conversa ainda não está disponível. Tente novamente em instantes.', 'info');
      }
    } catch (err: any) {
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
      setMessagesByChat((prev) => ({
        ...prev,
        [key]: response.data || [],
      }));
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não foi possível carregar as mensagens.'), 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!['RESIDENT', 'VENDOR', 'DELIVERY_PERSON'].includes(user.role)) {
      router.push('/deliveries');
      return;
    }

    loadChats();
  }, [hasHydrated, user, router, preferredChatKey]);

  useEffect(() => {
    if (!selectedChat) return;
    if (!messagesByChat[chatKey(selectedChat)]) {
      loadMessages(selectedChat);
    }
  }, [selectedChat, messagesByChat]);

  useEffect(() => {
    const handleOrderMessage = (message: ChatMessage & { orderId: string }) => {
      if (!message?.orderId) return;

      const key = `ORDER:${message.orderId}`;

      setMessagesByChat((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { ...message, kind: 'ORDER' }],
      }));

      updateChatWithMessage('ORDER', message.orderId, { ...message, kind: 'ORDER' });
    };

    const handleDeliveryMessage = (message: ChatMessage & { deliveryId: string }) => {
      if (!message?.deliveryId) return;

      const key = `DELIVERY:${message.deliveryId}`;
      setMessagesByChat((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { ...message, kind: 'DELIVERY' }],
      }));

      updateChatWithMessage('DELIVERY', message.deliveryId, { ...message, kind: 'DELIVERY' });
    };

    const handleOrderUpdated = () => {
      loadChats();
    };

    const handleDeliveryUpdated = () => {
      loadChats();
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
  }, [on, off]);

  const sendMessage = async () => {
    if (!selectedChat) return;

    const key = chatKey(selectedChat);
    const draft = (draftByChat[key] || '').trim();
    if (!draft) return;

    try {
      setSending(true);
      const response = await ordersAPI.sendMessage(selectedChat.id, draft, selectedChat.kind);
      const message = response.data as ChatMessage;

      setMessagesByChat((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { ...message, kind: selectedChat.kind }],
      }));
      setDraftByChat((prev) => ({ ...prev, [key]: '' }));

      updateChatWithMessage(selectedChat.kind, selectedChat.id, {
        ...message,
        kind: selectedChat.kind,
      });
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não foi possível enviar a mensagem.'), 'error');
    } finally {
      setSending(false);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Chats de pedidos e portaria</h1>
        <p className="mt-1 text-sm text-gray-500">
          Conversas ficam disponíveis por 7 dias após a última mensagem.
        </p>
      </div>

      {chats.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-4xl">💬</p>
            <p className="mt-2 font-semibold text-gray-800">Nenhum chat disponível</p>
            <p className="mt-1 text-sm text-gray-500">As conversas de pedido e portaria aparecem aqui quando liberadas.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <Card padding={false}>
            <div className="max-h-[70vh] overflow-y-auto">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatKey(chatKey(chat))}
                  className={`w-full border-b border-gray-100 p-4 text-left transition ${
                    selectedChatKey === chatKey(chat) ? 'bg-amber-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900">
                      {chat.kind === 'ORDER' ? 'Pedido' : 'Entrega'} #{chat.id.slice(0, 8)}
                    </p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                      {statusLabel(chat.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {chat.customerName} · Bloco {chat.block || '-'} · Apto {chat.apartment}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {chat.kind === 'ORDER'
                      ? chat.vendor?.name
                        ? `Comércio: ${chat.vendor.name}`
                        : 'Pedido sem comércio vinculado'
                      : 'Chat da entrega entre morador e entregador'}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                    {chat.lastMessage
                      ? `${chat.lastMessage.sender?.name || roleLabel(chat.lastMessage.sender?.role)}: ${chat.lastMessage.content}`
                      : 'Sem mensagens recentes'}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            {!selectedChat ? (
              <p className="text-sm text-gray-500">Selecione uma conversa para continuar.</p>
            ) : (
              <div className="flex h-[70vh] flex-col">
                <div className="border-b border-gray-200 pb-3">
                  <p className="text-lg font-bold text-gray-900">
                    {selectedChat.kind === 'ORDER' ? 'Pedido' : 'Entrega'} #{selectedChat.id.slice(0, 8)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedChat.customerName} · Bloco {selectedChat.block || '-'} · Apto {selectedChat.apartment}
                  </p>
                  <p className="text-xs text-gray-500">Status: {statusLabel(selectedChat.status)}</p>
                </div>

                <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {loadingMessages ? (
                    <p className="text-xs text-gray-500">Carregando mensagens...</p>
                  ) : (messagesByChat[chatKey(selectedChat)] || []).length === 0 ? (
                    <p className="text-xs text-gray-500">Sem mensagens nesta conversa.</p>
                  ) : (
                    (messagesByChat[chatKey(selectedChat)] || []).map((message) => (
                      <div key={message.id} className="rounded-lg border border-gray-200 bg-white p-2">
                        <p className="text-xs font-semibold text-gray-700">
                          {message.sender?.name || roleLabel(message.sender?.role)}
                        </p>
                        <p className="text-sm text-gray-800">{message.content}</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {new Date(message.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex gap-2">
                    <input
                      className="h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-amber-400"
                      placeholder={
                        selectedChat.canSend
                          ? 'Digite sua mensagem'
                          : selectedChat.kind === 'DELIVERY'
                            ? 'Entrega finalizada: envio de mensagens desativado'
                            : 'Pedido encerrado: envio de mensagens desativado'
                      }
                      value={draftByChat[chatKey(selectedChat)] || ''}
                      onChange={(e) =>
                        setDraftByChat((prev) => ({
                          ...prev,
                          [chatKey(selectedChat)]: e.target.value,
                        }))
                      }
                      disabled={!selectedChat.canSend || sending}
                    />
                    <Button onClick={sendMessage} loading={sending} disabled={!selectedChat.canSend || sending}>
                      Enviar
                    </Button>
                  </div>
                  {!selectedChat.canSend && (
                    <p className="mt-1 text-xs text-gray-500">
                      Conversa finalizada. Mensagens ficam apenas para consulta até a expiração automática.
                    </p>
                  )}
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
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <ChatsPageContent />
    </Suspense>
  );
}
