'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
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
  if (status === 'PENDING') return 'bg-yellow-100 text-yellow-800';
  if (status === 'ACCEPTED') return 'bg-blue-100 text-blue-800';
  if (status === 'READY') return 'bg-indigo-100 text-indigo-800';
  if (status === 'SENT') return 'bg-violet-100 text-violet-800';
  if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800';
  return 'bg-red-100 text-red-800';
}

export default function VendorOrdersPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();
  const { on, off } = useSocket(user?.id, user?.role);

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [messagesByOrder, setMessagesByOrder] = useState<Record<string, OrderMessage[]>>({});
  const [messageDraftByOrder, setMessageDraftByOrder] = useState<Record<string, string>>({});
  const [pickupCodeByOrder, setPickupCodeByOrder] = useState<Record<string, string>>({});
  const [loadingMessagesByOrder, setLoadingMessagesByOrder] = useState<Record<string, boolean>>({});

  const activeOrders = useMemo(
    () => orders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status)),
    [orders],
  );

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await vendorsAPI.getMyOrders();
      setOrders(response.data);
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não foi possível carregar os pedidos agora.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'VENDOR') {
      router.push('/deliveries');
      return;
    }
    loadOrders();
  }, [hasHydrated, user, router]);

  useEffect(() => {
    const handleOrderCreated = (incoming: VendorOrder) => {
      setOrders((prev) => {
        const exists = prev.some((order) => order.id === incoming.id);
        if (exists) {
          return prev.map((order) => (order.id === incoming.id ? { ...order, ...incoming } : order));
        }
        return [incoming, ...prev];
      });
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
    };

    on('order_created', handleOrderCreated);
    on('order_updated', handleOrderUpdated);
    on('order_message', handleOrderMessage);

    return () => {
      off('order_created', handleOrderCreated);
      off('order_updated', handleOrderUpdated);
      off('order_message', handleOrderMessage);
    };
  }, [on, off]);

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
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não foi possível atualizar o status.'), 'error');
    } finally {
      setWorkingOrderId(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    const reason = window.prompt('Motivo do cancelamento (opcional):') || undefined;

    try {
      setWorkingOrderId(orderId);
      const response = await vendorsAPI.cancelMyOrder(orderId, reason);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? response.data : order)));
      addToast('Pedido cancelado.', 'success');
    } catch (err: any) {
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
    } catch (err: any) {
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
      loadMessages(orderId);
    }
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
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não foi possível enviar a mensagem.'), 'error');
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
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Pedidos do Comércio</h1>
          <p className="mt-1 text-sm text-gray-500">
            Status: Pendente {'>'} Aceito {'>'} Pronto {'>'} Enviado {'>'} Concluído
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/vendor/history')}>
            Histórico
          </Button>
          <Button variant="secondary" onClick={() => router.push('/vendor/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-4xl">🧾</p>
            <p className="mt-2 font-semibold text-gray-800">Nenhum pedido ativo no momento</p>
            <p className="mt-1 text-sm text-gray-500">Novos pedidos aparecerão aqui em tempo real.</p>
          </div>
        </Card>
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

            return (
              <Card key={order.id}>
                <div className="flex flex-col gap-4">
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
                      <p className="font-semibold text-gray-900">{order.customerName}</p>
                      <p className="text-sm text-gray-600">
                        Apto {order.apartment}
                        {order.block ? `, bloco ${order.block}` : ''}
                      </p>
                      {order.description && (
                        <p className="mt-1 text-sm text-gray-500">{order.description}</p>
                      )}
                      <p className="mt-2 text-sm font-semibold text-amber-700">
                        Total: R$ {Number(order.totalAmount || 0).toFixed(2)}
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
                    </div>

                    <div className="flex flex-col gap-2 sm:min-w-[220px]">
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
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2">
                              <p className="text-xs font-semibold text-indigo-800">Código de coleta do entregador</p>
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
                              <p className="mt-1 text-[11px] text-indigo-700">
                                {order.delivery.deliveryPerson.name} deve informar esse código para liberar a retirada.
                              </p>
                            </div>
                          ) : (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
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
                      </Button>
                    </div>
                  </div>

                  {openOrderId === order.id && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="mb-2 text-sm font-bold text-gray-700">Chat do pedido</p>

                      {loadingMessagesByOrder[order.id] ? (
                        <p className="text-xs text-gray-500">Carregando mensagens...</p>
                      ) : (
                        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                          {(messagesByOrder[order.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-400">Nenhuma mensagem ainda.</p>
                          ) : (
                            (messagesByOrder[order.id] || []).map((message) => (
                              <div key={message.id} className="rounded-md border border-gray-100 p-2">
                                <p className="text-xs font-semibold text-gray-700">
                                  {message.sender?.name || 'Usuário'}
                                  {message.sender?.role ? ` (${message.sender.role})` : ''}
                                </p>
                                <p className="text-sm text-gray-700">{message.content}</p>
                                <p className="mt-1 text-[11px] text-gray-400">
                                  {new Date(message.createdAt).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex gap-2">
                        <input
                          className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-amber-400"
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
