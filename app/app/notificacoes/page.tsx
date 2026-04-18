'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  MessageSquareText,
  PackageCheck,
  RefreshCcw,
  Truck,
} from 'lucide-react';
import { BrandCharacter } from '@/components/BrandCharacter';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import {
  getApiErrorMessage,
  notificationsAPI,
  type NotificationItem,
} from '@/lib/api';
import { useNotificationsStore } from '@/lib/notificationsStore';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';

type NotificationFilter = 'all' | 'unread';

function categoryMeta(category: NotificationItem['category']) {
  if (category === 'CHAT_MESSAGE') {
    return {
      icon: MessageSquareText,
      label: 'Mensagem',
      className:
        'border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] text-[var(--color-primary-dark)]',
    };
  }

  if (category === 'ORDER_UPDATE') {
    return {
      icon: PackageCheck,
      label: 'Pedido',
      className:
        'border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]',
    };
  }

  return {
    icon: Truck,
    label: category === 'DELIVERY_UPDATE' ? 'Entrega' : 'Sistema',
    className:
      'border-[rgba(24,49,71,0.12)] bg-[rgba(24,49,71,0.06)] text-[var(--color-secondary)]',
  };
}

function formatNotificationDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { setUnreadCount, unreadCount } = useNotificationsStore();
  const { on, off } = useSocket(user?.id, user?.role, user?.condominiumId);

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');

  const readCount = useMemo(
    () => notifications.filter((notification) => notification.isRead).length,
    [notifications],
  );

  const loadNotifications = async (activeFilter: NotificationFilter) => {
    try {
      setLoading(true);
      setError('');

      const [notificationsResponse, unreadResponse] = await Promise.all([
        notificationsAPI.list(activeFilter, 80),
        notificationsAPI.getUnreadCount(),
      ]);

      setNotifications((notificationsResponse.data || []) as NotificationItem[]);
      setUnreadCount(Number(unreadResponse.data?.unreadCount || 0));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar suas notificações agora.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    void loadNotifications(filter);
  }, [filter, hasHydrated, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleNotificationCreated = (notification: NotificationItem) => {
      setNotifications((current) => {
        const next = [notification, ...current.filter((item) => item.id !== notification.id)];
        if (filter === 'unread') {
          return next.filter((item) => !item.isRead).slice(0, 80);
        }

        return next.slice(0, 80);
      });
    };

    on('notification_created', handleNotificationCreated);

    return () => {
      off('notification_created', handleNotificationCreated);
    };
  }, [filter, off, on, user]);

  const applyUnreadCount = (nextUnreadCount: number) => {
    setUnreadCount(Number(nextUnreadCount || 0));
  };

  const markAsRead = async (notification: NotificationItem) => {
    if (notification.isRead) {
      return;
    }

    try {
      setWorkingId(notification.id);
      const response = await notificationsAPI.markAsRead(notification.id);
      applyUnreadCount(response.data?.unreadCount);
      setNotifications((current) => {
        if (filter === 'unread') {
          return current.filter((item) => item.id !== notification.id);
        }

        return current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : item,
        );
      });
    } finally {
      setWorkingId(null);
    }
  };

  const handleOpenNotification = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markAsRead(notification);
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      const response = await notificationsAPI.markAllAsRead();
      applyUnreadCount(response.data?.unreadCount);
      setNotifications((current) =>
        filter === 'unread'
          ? []
          : current.map((item) => ({
              ...item,
              isRead: true,
              readAt: item.readAt || new Date().toISOString(),
            })),
      );
    } finally {
      setMarkingAll(false);
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
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Atualizações da conta"
        title="Central de notificações"
        description="Veja tudo o que entrou na sua operação, acompanhe o que já foi lido e abra cada atendimento direto do histórico."
        meta={
          <>
            <span className="rounded-full border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] px-3 py-1.5 font-medium text-[var(--color-primary-dark)]">
              {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 font-medium text-[var(--color-secondary)]">
              {readCount} já revisada{readCount !== 1 ? 's' : ''}
            </span>
          </>
        }
        actions={
          <>
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={filter === 'unread' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Não lidas
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllRead}
              loading={markingAll}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4" />
              Marcar tudo
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr),22rem]">
        <div className="space-y-4">
          {error && (
            <Card className="rounded-[28px] border border-red-200 bg-red-50/80 p-5 text-sm text-red-800">
              {error}
            </Card>
          )}

          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Sua central está em dia"
              description={
                filter === 'unread'
                  ? 'Nenhuma notificação pendente de leitura no momento.'
                  : 'Novas mensagens, mudanças de status e alertas da operação aparecerão aqui.'
              }
              actions={
                <Button variant="secondary" onClick={() => void loadNotifications(filter)}>
                  <RefreshCcw className="h-4 w-4" />
                  Atualizar histórico
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const meta = categoryMeta(notification.category);
                const Icon = meta.icon;

                return (
                  <Card
                    key={notification.id}
                    className="rounded-[30px] border border-[var(--color-line)] p-0 overflow-hidden"
                  >
                    <div className="flex flex-col gap-4 p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[var(--color-line)] bg-white text-[var(--color-primary-dark)]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${meta.className}`}
                              >
                                {meta.label}
                              </span>
                              {!notification.isRead && (
                                <span className="inline-flex items-center rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                                  Nova
                                </span>
                              )}
                            </div>
                            <h2 className="mt-3 text-lg font-semibold text-[var(--color-secondary)]">
                              {notification.title}
                            </h2>
                            <p className="mt-2 text-sm leading-7 text-[var(--color-foreground-soft)]">
                              {notification.body}
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-xs text-[var(--color-foreground-soft)]">
                          <p>{formatNotificationDate(notification.createdAt)}</p>
                          <p className="mt-1">
                            {notification.isRead ? 'Lida' : 'Pendente'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          size="sm"
                          onClick={() => void handleOpenNotification(notification)}
                          loading={workingId === notification.id}
                        >
                          {notification.link ? 'Abrir atendimento' : 'Marcar como revisada'}
                        </Button>
                        {!notification.isRead && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void markAsRead(notification)}
                            disabled={workingId === notification.id}
                          >
                            Marcar como lida
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Card className="rounded-[32px] p-5 sm:p-6">
          <div className="space-y-5">
            <BrandCharacter variant="host" className="h-64" imageClassName="p-3" />

            <div>
              <p className="eyebrow text-[var(--color-primary-dark)]">Leitura operacional</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--color-secondary)]">
                Menos ruído, mais contexto
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-foreground-soft)]">
                Mensagens, pedidos e mudanças de entrega entram aqui com histórico contínuo. O sino do topo acompanha o total pendente em tempo real.
              </p>
            </div>

            <div className="space-y-3 text-sm text-[var(--color-secondary)]">
              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-3">
                <strong>{unreadCount}</strong> item{unreadCount !== 1 ? 's' : ''} aguardando leitura.
              </div>
              <div className="rounded-[24px] border border-[var(--color-line)] bg-white px-4 py-3">
                Abra uma notificação para cair direto na conversa ou no atendimento correspondente.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}