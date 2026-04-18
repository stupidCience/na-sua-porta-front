'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  ChevronDown,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  PackagePlus,
  PanelsTopLeft,
  Settings2,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { getModuleLabel } from '@/lib/accountModules';
import { getDefaultRouteForUser } from '@/lib/routes';
import { useAuthStore, type UserRole } from '@/lib/store';
import { getApiErrorMessage, notificationsAPI, type NotificationItem } from '@/lib/api';
import { useNotificationsStore } from '@/lib/notificationsStore';
import { BrandLogo } from './BrandLogo';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { useSocket } from '@/lib/useSocket';

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  matchPrefix?: string;
  group?: 'primary' | 'secondary';
};

const ROLE_LINKS: Record<UserRole, NavLink[]> = {
  RESIDENT: [
    { href: '/deliveries', label: 'Entregas', icon: Package, group: 'primary' },
    { href: '/shop', label: 'Lojas', icon: ShoppingBasket, group: 'primary' },
    { href: '/chats', label: 'Mensagens', icon: MessageSquareText, group: 'primary' },
  ],
  DELIVERY_PERSON: [
    { href: '/deliveries/available', label: 'Coletas', icon: Truck, group: 'primary' },
    { href: '/deliveries/my-deliveries', label: 'Minhas rotas', icon: Package, group: 'primary' },
    { href: '/chats', label: 'Mensagens', icon: MessageSquareText, group: 'primary' },
    { href: '/dashboard', label: 'Indicadores', icon: PanelsTopLeft, group: 'secondary' },
  ],
  VENDOR: [
    { href: '/vendor/orders', label: 'Pedidos', icon: Store, group: 'primary' },
    { href: '/vendor/store', label: 'Loja', icon: ShoppingBasket, group: 'primary' },
    { href: '/chats', label: 'Mensagens', icon: MessageSquareText, group: 'primary' },
    { href: '/vendor/dashboard', label: 'Indicadores', icon: PanelsTopLeft, group: 'secondary' },
  ],
  CONDOMINIUM_ADMIN: [
    { href: '/admin', label: 'Painel', icon: Building2, group: 'primary' },
    { href: '/admin/vendors', label: 'Comércios', icon: Store, group: 'primary' },
    { href: '/chats', label: 'Mensagens', icon: MessageSquareText, group: 'primary' },
    { href: '/profile', label: 'Conta', icon: ShieldCheck, group: 'secondary', matchPrefix: '/profile' },
  ],
};

const QUICK_ACTIONS: Record<UserRole, NavLink> = {
  RESIDENT: { href: '/deliveries/new', label: 'Nova coleta', icon: PackagePlus, exact: true },
  DELIVERY_PERSON: { href: '/deliveries/available', label: 'Buscar coletas', icon: Truck, exact: true },
  VENDOR: { href: '/vendor/orders', label: 'Acompanhar pedidos', icon: Store, exact: true },
  CONDOMINIUM_ADMIN: { href: '/admin', label: 'Abrir painel', icon: Building2, exact: true },
};

function notificationCategoryMeta(category: NotificationItem['category']) {
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
      icon: Package,
      label: 'Pedido',
      className:
        'border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]',
    };
  }

  return {
    icon: category === 'DELIVERY_UPDATE' ? Truck : Bell,
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

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { connectionStatus, on, off } = useSocket(
    user?.id,
    user?.role,
    user?.condominiumId,
  );
  const { unreadCount, setUnreadCount, incrementUnread, resetNotifications } =
    useNotificationsStore();

  const previousStatus = useRef(connectionStatus);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);

  const [showReconnected, setShowReconnected] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [previewNotifications, setPreviewNotifications] = useState<NotificationItem[]>([]);
  const [workingNotificationId, setWorkingNotificationId] = useState<string | null>(null);

  useEffect(() => {
    if (previousStatus.current === 'reconnecting' && connectionStatus === 'connected') {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }

    previousStatus.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    setDesktopMoreOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      resetNotifications();
      return;
    }

    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const response = await notificationsAPI.getUnreadCount();
        if (!cancelled) {
          setUnreadCount(Number(response.data?.unreadCount || 0));
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };

    void loadUnreadCount();

    return () => {
      cancelled = true;
    };
  }, [resetNotifications, setUnreadCount, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleNotificationCreated = (notification: NotificationItem) => {
      incrementUnread(1);
      setPreviewNotifications((current) =>
        [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 10),
      );
    };

    on('notification_created', handleNotificationCreated);

    return () => {
      off('notification_created', handleNotificationCreated);
    };
  }, [incrementUnread, off, on, user]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }

      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setDesktopMoreOpen(false);
      }

      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [notificationsOpen]);

  const loadNotificationPreview = async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError('');
      const response = await notificationsAPI.list('all', 10);
      setPreviewNotifications((response.data || []) as NotificationItem[]);
    } catch (err: unknown) {
      setNotificationsError(
        getApiErrorMessage(err, 'Não foi possível carregar as últimas notificações agora.'),
      );
    } finally {
      setNotificationsLoading(false);
    }
  };

  const openNotificationsModal = () => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    setDesktopMoreOpen(false);
    setNotificationsOpen((current) => {
      const next = !current;
      if (next) {
        void loadNotificationPreview();
      }

      return next;
    });
  };

  const closeNotificationsModal = () => {
    setNotificationsOpen(false);
  };

  const openNotificationsCenter = () => {
    closeNotificationsModal();
    router.push('/notificacoes');
  };

  const openNotificationItem = async (notification: NotificationItem) => {
    try {
      if (!notification.isRead) {
        setWorkingNotificationId(notification.id);
        const response = await notificationsAPI.markAsRead(notification.id);
        setUnreadCount(Number(response.data?.unreadCount || 0));
        setPreviewNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  isRead: true,
                  readAt: new Date().toISOString(),
                }
              : item,
          ),
        );
      }
    } finally {
      setWorkingNotificationId(null);
    }

    if (notification.link) {
      closeNotificationsModal();
      router.push(notification.link);
    }
  };

  const handleMenuNavigation = () => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    setDesktopMoreOpen(false);
    setNotificationsOpen(false);
  };

  const handleLogout = () => {
    handleMenuNavigation();
    logout();
    localStorage.removeItem('access_token');
    router.push('/');
  };

  const navLinks = user ? ROLE_LINKS[user.role] ?? [] : [];
  const quickAction = user ? QUICK_ACTIONS[user.role] : null;
  const primaryLinks = useMemo(
    () => navLinks.filter((link) => link.group !== 'secondary'),
    [navLinks],
  );
  const secondaryLinks = useMemo(
    () => navLinks.filter((link) => link.group === 'secondary'),
    [navLinks],
  );
  const previewUnreadNotifications = useMemo(
    () => previewNotifications.filter((notification) => !notification.isRead),
    [previewNotifications],
  );
  const previewReadNotifications = useMemo(
    () => previewNotifications.filter((notification) => notification.isRead),
    [previewNotifications],
  );

  const isGateRoute = pathname === '/ambientes';
  const shouldRenderPlatformNav = Boolean(user && !isGateRoute);
  const brandHref = user
    ? isGateRoute
      ? '/ambientes'
      : getDefaultRouteForUser(user.role, user.isVendor)
    : '/';
  const accountHref = user?.role === 'CONDOMINIUM_ADMIN' ? '/profile?tab=condominio' : '/profile?tab=perfil';
  const accountDescription = user?.role === 'CONDOMINIUM_ADMIN'
    ? 'Dados do condomínio, usuários, convites e relatórios.'
    : 'Dados pessoais, perfis liberados e vínculo com condomínio.';
  const settingsDescription = user?.role === 'CONDOMINIUM_ADMIN'
    ? 'Alertas de gestão, aprovações e visão inicial do condomínio.'
    : user?.role === 'VENDOR'
    ? 'Alertas de pedidos, envio e conversas da loja.'
    : user?.role === 'DELIVERY_PERSON'
    ? 'Disponibilidade, novas coletas e preferências da rota.'
    : 'Alertas de pedidos, lojas e entregas neste dispositivo.';
  const firstName = user?.name?.trim().split(' ')[0] ?? 'Olá';

  const connectionMeta =
    connectionStatus === 'connected'
      ? {
          label: 'Atualizações ativas',
          className: 'border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)]',
          dotClass: 'bg-[var(--color-primary)]',
        }
      : connectionStatus === 'reconnecting'
      ? {
          label: 'Atualizando',
          className: 'border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]',
          dotClass: 'bg-[var(--color-accent-strong)]',
        }
      : {
          label: 'Atualizações pausadas',
          className: 'border-red-200 bg-red-50 text-red-800',
          dotClass: 'bg-red-500',
        };

  const isActiveLink = (link: NavLink) => {
    if (link.matchPrefix) {
      return pathname.startsWith(link.matchPrefix);
    }

    if (link.exact) {
      return pathname === link.href;
    }

    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  const secondaryMenuActive = secondaryLinks.some((link) => isActiveLink(link));

  const renderPreviewNotification = (notification: NotificationItem) => {
    const meta = notificationCategoryMeta(notification.category);
    const Icon = meta.icon;

    return (
      <button
        key={notification.id}
        type="button"
        onClick={() => void openNotificationItem(notification)}
        className={clsx(
          'w-full rounded-[22px] border px-3.5 py-3 text-left transition-colors',
          notification.isRead
            ? 'border-[var(--color-line)] bg-white hover:bg-[var(--color-background-soft)]'
            : 'border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.05)] hover:bg-[rgba(26,166,75,0.08)]',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold', meta.className)}>
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[var(--color-secondary)]">
              {notification.title}
            </p>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--color-foreground-soft)]">
              {notification.body}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[11px] text-[var(--color-foreground-soft)]">
              {formatNotificationDate(notification.createdAt)}
            </p>
            {workingNotificationId === notification.id && (
              <p className="mt-2 text-[11px] font-semibold text-[var(--color-primary-dark)]">
                Atualizando...
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[rgba(255,255,249,0.82)] backdrop-blur-xl">
      {user && connectionStatus !== 'connected' && (
        <div className="border-b border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] px-4 py-2 text-center text-sm font-semibold text-[var(--color-secondary)]">
          {connectionStatus === 'reconnecting'
            ? 'Atualizando seus pedidos e entregas.'
            : 'As atualizações ao vivo estão indisponíveis no momento.'}
        </div>
      )}

      {user && showReconnected && (
        <div className="border-b border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.1)] px-4 py-2 text-center text-sm font-semibold text-[var(--color-primary-dark)]">
          Conexão restabelecida com sucesso.
        </div>
      )}

      <nav className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href={brandHref} className="flex shrink-0 items-center gap-3">
          <BrandLogo size="sm" />
        </Link>

        {user && isGateRoute && (
          <div className="hidden flex-1 justify-center lg:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--color-secondary)] shadow-[0_12px_28px_rgba(28,25,23,0.06)]">
              <LayoutGrid className="h-4 w-4 text-[var(--color-primary-dark)]" />
              Escolha um perfil para entrar
            </div>
          </div>
        )}

        {shouldRenderPlatformNav && (
          <div className="hidden min-w-0 flex-1 items-center justify-center px-4 lg:flex">
            <div className="flex min-w-0 items-center gap-2 rounded-[24px] border border-[var(--color-line)] bg-white/78 px-2 py-2 shadow-[0_18px_38px_rgba(28,25,23,0.06)]">
              {primaryLinks.map((link) => {
                const Icon = link.icon;
                const active = isActiveLink(link);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleMenuNavigation}
                    className={clsx(
                      'inline-flex min-h-[46px] items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                      active
                        ? 'bg-[var(--color-secondary)] text-white shadow-[0_14px_26px_rgba(24,49,71,0.18)]'
                        : 'text-[var(--color-secondary)] hover:bg-[var(--color-background-soft)] hover:text-[var(--color-primary-dark)]',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}

              {secondaryLinks.length > 0 && (
                <div ref={moreMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopMoreOpen((value) => !value);
                      setAccountMenuOpen(false);
                      setNotificationsOpen(false);
                    }}
                    className={clsx(
                      'inline-flex min-h-[46px] items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                      secondaryMenuActive || desktopMoreOpen
                        ? 'bg-[var(--color-background-soft)] text-[var(--color-primary-dark)]'
                        : 'text-[var(--color-secondary)] hover:bg-[var(--color-background-soft)] hover:text-[var(--color-primary-dark)]',
                    )}
                    aria-expanded={desktopMoreOpen}
                    aria-haspopup="menu"
                  >
                    Mais
                    <ChevronDown className={clsx('h-4 w-4 transition-transform', desktopMoreOpen && 'rotate-180')} />
                  </button>

                  {desktopMoreOpen && (
                    <div className="absolute left-0 top-full mt-3 w-72 overflow-hidden rounded-[26px] border border-[var(--color-line)] bg-white shadow-[0_24px_50px_rgba(28,25,23,0.12)]">
                      <div className="p-2">
                        {secondaryLinks.map((link) => {
                          const Icon = link.icon;
                          const active = isActiveLink(link);

                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={handleMenuNavigation}
                              className={clsx(
                                'flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-medium transition-colors',
                                active
                                  ? 'bg-[var(--color-background-soft)] text-[var(--color-primary-dark)]'
                                  : 'text-[var(--color-secondary)] hover:bg-[var(--color-background-soft)]',
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <div ref={notificationsMenuRef} className="relative">
                <button
                  type="button"
                  onClick={openNotificationsModal}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-white/85 text-[var(--color-secondary)] shadow-[0_10px_24px_rgba(28,25,23,0.06)] transition-colors hover:border-[var(--color-line-strong)] hover:bg-white"
                  aria-label="Abrir notificações"
                  aria-haspopup="menu"
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[1.3rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-[0_10px_18px_rgba(20,33,24,0.18)]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-full z-50 mt-3 w-[20rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[rgba(255,255,249,0.98)] shadow-[0_28px_60px_rgba(24,49,71,0.18)] sm:w-[22rem]">
                    <div className="border-b border-[var(--color-line)] px-4 py-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-secondary)]">
                          Notificações
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--color-foreground-soft)]">
                          {unreadCount > 0
                            ? `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`
                            : 'Tudo em dia'}
                        </p>
                      </div>
                    </div>

                    <div className="max-h-[24rem] overflow-y-auto px-4 py-4">
                      {notificationsLoading ? (
                        <div className="flex min-h-[10rem] items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
                        </div>
                      ) : notificationsError ? (
                        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                          {notificationsError}
                        </div>
                      ) : previewNotifications.length === 0 ? (
                        <div className="flex min-h-[10rem] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--color-line)] bg-[var(--color-background-soft)] px-5 py-6 text-center">
                          <Bell className="h-9 w-9 text-[var(--color-foreground-soft)]" />
                          <p className="mt-3 text-sm font-semibold text-[var(--color-secondary)]">
                            Nada por agora
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {previewUnreadNotifications.length > 0 && (
                            <section className="space-y-2">
                              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-dark)]">
                                Não lidas
                              </p>
                              {previewUnreadNotifications.map(renderPreviewNotification)}
                            </section>
                          )}

                          {previewReadNotifications.length > 0 && (
                            <section className="space-y-2">
                              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-foreground-soft)]">
                                Recentes
                              </p>
                              {previewReadNotifications.map(renderPreviewNotification)}
                            </section>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-[var(--color-line)] px-4 py-4">
                      <Button variant="secondary" className="w-full" onClick={openNotificationsCenter}>
                        Abrir central
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div ref={accountMenuRef} className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen((value) => !value);
                    setDesktopMoreOpen(false);
                    setNotificationsOpen(false);
                  }}
                  className="flex min-w-[16rem] max-w-[22rem] items-center gap-3 rounded-[24px] border border-[var(--color-line)] bg-white/85 px-3 py-2.5 pr-4 shadow-[0_18px_36px_rgba(28,25,23,0.07)] transition-colors hover:border-[var(--color-line-strong)] hover:bg-white"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                >
                  <div className="relative shrink-0">
                    <Avatar name={user.name} size="sm" />
                    <span className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white', connectionMeta.dotClass)} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-[var(--color-secondary)]">{user.name}</p>
                    <p className="truncate text-xs text-[var(--color-foreground-soft)]">
                      {getModuleLabel(user.role)}
                      {user.condominiumName ? ` • ${user.condominiumName}` : ' • Minha conta'}
                    </p>
                  </div>
                  <ChevronDown className={clsx('h-4 w-4 shrink-0 text-[var(--color-foreground-soft)] transition-transform', accountMenuOpen && 'rotate-180')} />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-[22rem] overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-white shadow-[0_28px_56px_rgba(28,25,23,0.14)]">
                    <div className="border-b border-[var(--color-line)] px-5 py-4">
                      <p className="text-lg font-semibold text-[var(--color-secondary)]">Olá, {firstName}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-foreground-soft)]">
                        {isGateRoute
                          ? 'Escolha abaixo como quer entrar. Depois, no menu da conta, você pode trocar de perfil, ajustar configurações ou revisar sua conta.'
                          : 'Use o menu para trocar de perfil, abrir configurações ou revisar sua conta quando precisar.'}
                      </p>
                    </div>

                    <div className="p-2">
                      {quickAction && shouldRenderPlatformNav && (() => {
                        const QuickActionIcon = quickAction.icon;

                        return (
                          <Link
                            href={quickAction.href}
                            onClick={handleMenuNavigation}
                            className="mb-2 flex items-center gap-3 rounded-[22px] bg-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(24,49,71,0.18)]"
                          >
                            <QuickActionIcon className="h-4 w-4" />
                            {quickAction.label}
                          </Link>
                        );
                      })()}

                      <Link
                        href="/ambientes"
                        onClick={handleMenuNavigation}
                        className="flex items-start gap-3 rounded-[22px] px-4 py-3 text-sm transition-colors hover:bg-[var(--color-background-soft)]"
                      >
                        <LayoutGrid className="mt-0.5 h-4 w-4 text-[var(--color-primary-dark)]" />
                        <div>
                          <p className="font-semibold text-[var(--color-secondary)]">Trocar perfil</p>
                          <p className="mt-1 text-[13px] leading-5 text-[var(--color-foreground-soft)]">
                            Escolha como quer entrar na plataforma.
                          </p>
                        </div>
                      </Link>

                      <Link
                        href="/configuracoes"
                        onClick={handleMenuNavigation}
                        className="flex items-start gap-3 rounded-[22px] px-4 py-3 text-sm transition-colors hover:bg-[var(--color-background-soft)]"
                      >
                        <Settings2 className="mt-0.5 h-4 w-4 text-[var(--color-primary-dark)]" />
                        <div>
                          <p className="font-semibold text-[var(--color-secondary)]">Configurações</p>
                          <p className="mt-1 text-[13px] leading-5 text-[var(--color-foreground-soft)]">
                            {settingsDescription}
                          </p>
                        </div>
                      </Link>

                      <Link
                        href={accountHref}
                        onClick={handleMenuNavigation}
                        className="flex items-start gap-3 rounded-[22px] px-4 py-3 text-sm transition-colors hover:bg-[var(--color-background-soft)]"
                      >
                        <UserRound className="mt-0.5 h-4 w-4 text-[var(--color-primary-dark)]" />
                        <div>
                          <p className="font-semibold text-[var(--color-secondary)]">Minha conta</p>
                          <p className="mt-1 text-[13px] leading-5 text-[var(--color-foreground-soft)]">
                            {accountDescription}
                          </p>
                        </div>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--color-line)] px-5 py-4">
                      <div className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold', connectionMeta.className)}>
                        <span className={clsx('h-2.5 w-2.5 rounded-full', connectionMeta.dotClass)} />
                        {connectionMeta.label}
                      </div>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:bg-[var(--color-background-soft)]"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileMenuOpen}
                onClick={() => {
                  setMobileMenuOpen((value) => !value);
                  setAccountMenuOpen(false);
                  setDesktopMoreOpen(false);
                  setNotificationsOpen(false);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-white/85 text-[var(--color-secondary)] shadow-[0_10px_24px_rgba(28,25,23,0.06)] transition-colors hover:border-[var(--color-line-strong)] hover:bg-white lg:hidden"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="secondary" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Cadastro</Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {user && mobileMenuOpen && (
        <div className="border-t border-[var(--color-line)] bg-[rgba(252,248,242,0.98)] px-4 py-4 shadow-[0_16px_38px_rgba(28,25,23,0.08)] lg:hidden">
          <div className="surface-panel rounded-[28px] p-4">
            <div className="flex items-center gap-3 rounded-[24px] bg-[var(--color-background-soft)] px-4 py-4">
              <div className="relative shrink-0">
                <Avatar name={user.name} size="sm" />
                <span className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white', connectionMeta.dotClass)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-secondary)]">{user.name}</p>
                <p className="truncate text-xs text-[var(--color-foreground-soft)]">
                  {getModuleLabel(user.role)}
                  {user.condominiumName ? ` • ${user.condominiumName}` : ' • Minha conta'}
                </p>
              </div>
            </div>

            {quickAction && shouldRenderPlatformNav && (() => {
              const QuickActionIcon = quickAction.icon;

              return (
                <Link
                  href={quickAction.href}
                  onClick={handleMenuNavigation}
                  className="mt-4 flex min-h-[48px] items-center gap-3 rounded-[22px] bg-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(24,49,71,0.18)]"
                >
                  <QuickActionIcon className="h-4 w-4" />
                  {quickAction.label}
                </Link>
              );
            })()}

            {shouldRenderPlatformNav && (
              <div className="mt-4 grid gap-2">
                {[...primaryLinks, ...secondaryLinks].map((link) => {
                  const Icon = link.icon;
                  const active = isActiveLink(link);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={handleMenuNavigation}
                      className={clsx(
                        'flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold',
                        active
                          ? 'bg-[var(--color-secondary)] text-white'
                          : 'border border-[var(--color-line)] bg-white text-[var(--color-secondary)]',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="mt-4 grid gap-2">
              <Link
                href="/notificacoes"
                onClick={handleMenuNavigation}
                className="flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-secondary)]"
              >
                <span className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-[var(--color-primary-dark)]" />
                  Notificações
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[11px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <Link
                href="/ambientes"
                onClick={handleMenuNavigation}
                className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-secondary)]"
              >
                <LayoutGrid className="h-4 w-4 text-[var(--color-primary-dark)]" />
                Trocar perfil
              </Link>

              <Link
                href="/configuracoes"
                onClick={handleMenuNavigation}
                className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-secondary)]"
              >
                <Settings2 className="h-4 w-4 text-[var(--color-primary-dark)]" />
                Configurações
              </Link>

              <Link
                href={accountHref}
                onClick={handleMenuNavigation}
                className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-secondary)]"
              >
                <UserRound className="h-4 w-4 text-[var(--color-primary-dark)]" />
                Minha conta
              </Link>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3">
              <div className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold', connectionMeta.className)}>
                <span className={clsx('h-2.5 w-2.5 rounded-full', connectionMeta.dotClass)} />
                {connectionMeta.label}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:bg-[var(--color-background-soft)]"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}