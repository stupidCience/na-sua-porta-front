import { ordersAPI } from './api';

export type ChatKind = 'ORDER' | 'DELIVERY';

type ChatSummaryResponse = {
  id?: string;
  kind?: string;
  unreadCount?: number;
  canSend?: boolean;
  status?: string;
  vendor?: {
    name?: string | null;
  } | null;
  delivery?: {
    deliveryPerson?: {
      name?: string | null;
    } | null;
  } | null;
};

export type OperationalChatSummary = {
  id: string;
  kind: ChatKind;
  unreadCount: number;
  canSend: boolean;
  status: string;
  vendorName?: string | null;
  deliveryPersonName?: string | null;
};

export async function loadOperationalChats() {
  const response = await ordersAPI.getChats();
  const chats = (response.data || []) as ChatSummaryResponse[];

  return chats.reduce<OperationalChatSummary[]>((accumulator, chat) => {
    if (!chat?.id) {
      return accumulator;
    }

    accumulator.push({
      id: String(chat.id),
      kind: chat.kind === 'DELIVERY' ? 'DELIVERY' : 'ORDER',
      unreadCount: Number(chat.unreadCount || 0),
      canSend: Boolean(chat.canSend),
      status: String(chat.status || ''),
      vendorName: chat.vendor?.name || null,
      deliveryPersonName: chat.delivery?.deliveryPerson?.name || null,
    });

    return accumulator;
  }, []);
}

export async function loadUnreadCountsByKind(kind: ChatKind) {
  const chats = await loadOperationalChats();

  return chats.reduce<Record<string, number>>((accumulator, chat) => {
    if (!chat?.id || chat.kind !== kind) {
      return accumulator;
    }

    accumulator[String(chat.id)] = Number(chat.unreadCount || 0);
    return accumulator;
  }, {});
}