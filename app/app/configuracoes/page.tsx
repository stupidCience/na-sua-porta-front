'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  LayoutGrid,
  MessageSquareText,
  Package,
  PanelsTopLeft,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
  UserRound,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { getModuleLabel } from '@/lib/accountModules';
import { useAuthStore, type UserRole } from '@/lib/store';

type ToggleSetting = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  storageKey: string;
  defaultValue: boolean;
  trueValue?: string;
  falseValue?: string;
};

type SettingsSection = {
  title: string;
  description: string;
  items: ToggleSetting[];
};

const GENERAL_SETTINGS: ToggleSetting[] = [
  {
    id: 'notif-sound',
    label: 'Sons de notificação',
    description: 'Toca um som quando houver algo importante para acompanhar.',
    icon: Bell,
    storageKey: 'nsp_notif_sound',
    defaultValue: true,
  },
  {
    id: 'notif-banner',
    label: 'Banners na tela',
    description: 'Exibe alertas visuais para pedidos, entregas e mensagens.',
    icon: MessageSquareText,
    storageKey: 'nsp_notif_banner',
    defaultValue: true,
  },
  {
    id: 'compact-lists',
    label: 'Listas mais compactas',
    description: 'Reduz espaços em listas e cartões para mostrar mais itens por vez.',
    icon: LayoutGrid,
    storageKey: 'nsp_settings_general_compact_lists',
    defaultValue: false,
  },
  {
    id: 'confirm-actions',
    label: 'Confirmar ações importantes',
    description: 'Pede uma confirmação extra antes de concluir ações sensíveis.',
    icon: ShieldCheck,
    storageKey: 'nsp_settings_general_confirm_actions',
    defaultValue: true,
  },
];

const ROLE_SETTINGS: Record<UserRole, SettingsSection> = {
  RESIDENT: {
    title: 'Morador',
    description: 'Ajustes para compras, atualizações de entrega e avisos do condomínio.',
    items: [
      {
        id: 'resident-order-updates',
        label: 'Priorizar atualizações de pedidos',
        description: 'Destaca mudanças de status quando o pedido avança até a entrega.',
        icon: ShoppingBasket,
        storageKey: 'nsp_settings_RESIDENT_order_updates',
        defaultValue: true,
      },
      {
        id: 'resident-portaria-alerts',
        label: 'Avisar chegada na portaria',
        description: 'Dá mais destaque quando algo estiver pronto para retirada ou chegando ao bloco.',
        icon: Package,
        storageKey: 'nsp_settings_RESIDENT_portaria_alerts',
        defaultValue: true,
      },
      {
        id: 'resident-store-highlights',
        label: 'Mostrar novidades das lojas',
        description: 'Mantém recomendações e novidades do condomínio em evidência.',
        icon: Store,
        storageKey: 'nsp_settings_RESIDENT_store_highlights',
        defaultValue: true,
      },
    ],
  },
  DELIVERY_PERSON: {
    title: 'Entregador',
    description: 'Ajustes para disponibilidade, novas coletas e rotina de entrega.',
    items: [
      {
        id: 'courier-availability',
        label: 'Aparecer disponível para novas coletas',
        description: 'Controla se você fica visível para novas entregas ao abrir a conta.',
        icon: Truck,
        storageKey: 'nsp_availability',
        defaultValue: true,
        trueValue: 'online',
        falseValue: 'offline',
      },
      {
        id: 'courier-new-pickups',
        label: 'Avisar coletas novas imediatamente',
        description: 'Prioriza alertas quando surgirem coletas disponíveis para aceitar.',
        icon: Bell,
        storageKey: 'nsp_settings_DELIVERY_PERSON_new_pickups',
        defaultValue: true,
      },
      {
        id: 'courier-route-summary',
        label: 'Mostrar resumo de rota no topo',
        description: 'Deixa os dados principais da entrega em destaque nas telas de trabalho.',
        icon: PanelsTopLeft,
        storageKey: 'nsp_settings_DELIVERY_PERSON_route_summary',
        defaultValue: true,
      },
      {
        id: 'courier-finish-confirmation',
        label: 'Confirmar antes de concluir entrega',
        description: 'Evita encerrar uma entrega por engano durante a rotina.',
        icon: ShieldCheck,
        storageKey: 'nsp_settings_DELIVERY_PERSON_finish_confirmation',
        defaultValue: true,
      },
    ],
  },
  VENDOR: {
    title: 'Comércio',
    description: 'Ajustes para pedidos, despacho e conversas com moradores.',
    items: [
      {
        id: 'vendor-new-orders',
        label: 'Avisar novos pedidos',
        description: 'Mantém alertas rápidos sempre que entrar um pedido novo.',
        icon: Store,
        storageKey: 'nsp_settings_VENDOR_new_orders',
        defaultValue: true,
      },
      {
        id: 'vendor-ready-priority',
        label: 'Destacar pedidos prontos primeiro',
        description: 'Organiza a fila para deixar pedidos em fase final mais visíveis.',
        icon: Package,
        storageKey: 'nsp_settings_VENDOR_ready_priority',
        defaultValue: true,
      },
      {
        id: 'vendor-dispatch-confirmation',
        label: 'Confirmar antes de marcar como enviado',
        description: 'Evita avançar o pedido sem revisar o status corretamente.',
        icon: ShieldCheck,
        storageKey: 'nsp_settings_VENDOR_dispatch_confirmation',
        defaultValue: true,
      },
      {
        id: 'vendor-chat-alerts',
        label: 'Alertar conversas com moradores',
        description: 'Dá destaque para mensagens ligadas a pedidos e atendimento.',
        icon: MessageSquareText,
        storageKey: 'nsp_settings_VENDOR_chat_alerts',
        defaultValue: true,
      },
    ],
  },
  CONDOMINIUM_ADMIN: {
    title: 'Administrador',
    description: 'Ajustes para aprovações, usuários e visão geral do condomínio.',
    items: [
      {
        id: 'admin-new-residents',
        label: 'Avisar novos cadastros de moradores',
        description: 'Destaca quando houver conta nova aguardando revisão do condomínio.',
        icon: UserRound,
        storageKey: 'nsp_settings_CONDOMINIUM_ADMIN_new_residents',
        defaultValue: true,
      },
      {
        id: 'admin-activation-requests',
        label: 'Avisar pedidos de ativação de perfil',
        description: 'Prioriza solicitações de entregador ou comerciante para análise.',
        icon: Building2,
        storageKey: 'nsp_settings_CONDOMINIUM_ADMIN_activation_requests',
        defaultValue: true,
      },
      {
        id: 'admin-open-summary',
        label: 'Abrir com resumo do condomínio',
        description: 'Mantém indicadores e pendências principais em destaque ao entrar.',
        icon: PanelsTopLeft,
        storageKey: 'nsp_settings_CONDOMINIUM_ADMIN_open_summary',
        defaultValue: true,
      },
      {
        id: 'admin-user-confirmation',
        label: 'Confirmar antes de ações em usuários',
        description: 'Adiciona uma revisão extra antes de aprovar, bloquear ou desvincular contas.',
        icon: ShieldCheck,
        storageKey: 'nsp_settings_CONDOMINIUM_ADMIN_user_confirmation',
        defaultValue: true,
      },
    ],
  },
};

function readToggleValue(setting: ToggleSetting) {
  if (typeof window === 'undefined') return setting.defaultValue;
  const stored = localStorage.getItem(setting.storageKey);
  if (stored === null) return setting.defaultValue;
  return stored === (setting.trueValue ?? 'on');
}

function writeToggleValue(setting: ToggleSetting, value: boolean) {
  localStorage.setItem(
    setting.storageKey,
    value ? (setting.trueValue ?? 'on') : (setting.falseValue ?? 'off'),
  );
}

/* ── Switch ───────────────────────────────────────────────────────────────── */
function Switch({ checked, onChange, id }: { checked: boolean; onChange: () => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={clsx(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
        checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-line-strong)]',
      )}
    >
      <span
        className={clsx(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-300',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/* ── ToggleRow ────────────────────────────────────────────────────────────── */
function ToggleRow({
  setting,
  checked,
  onToggle,
}: {
  setting: ToggleSetting;
  checked: boolean;
  onToggle: (setting: ToggleSetting) => void;
}) {
  const Icon = setting.icon;

  return (
    <div
      className={clsx(
        'flex w-full items-center justify-between gap-4 rounded-[24px] border px-4 py-4 transition-all duration-200',
        checked
          ? 'border-[rgba(26,166,75,0.3)] bg-[rgba(26,166,75,0.04)] backdrop-blur-md'
          : 'border-[var(--color-line)] bg-white/60 backdrop-blur-md hover:border-[var(--color-line-strong)] hover:bg-white/80',
      )}
    >
      <label
        htmlFor={setting.id}
        className="flex min-w-0 cursor-pointer items-start gap-3"
      >
        <div
          className={clsx(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-colors duration-200',
            checked
              ? 'bg-[rgba(26,166,75,0.12)] text-[var(--color-primary-dark)]'
              : 'bg-white text-[var(--color-foreground-soft)]',
          )}
        >
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <p className={clsx(
            'text-sm font-semibold transition-colors duration-200',
            checked ? 'text-[var(--color-primary-dark)]' : 'text-[var(--color-secondary)]',
          )}>
            {setting.label}
          </p>
          <p className="mt-0.5 text-sm leading-6 text-[var(--color-foreground-soft)]">
            {setting.description}
          </p>
        </div>
      </label>

      <Switch
        id={setting.id}
        checked={checked}
        onChange={() => onToggle(setting)}
      />
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ConfiguracoesPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState(0);

  const sections = useMemo((): SettingsSection[] => {
    if (!user) return [];
    return [
      {
        title: 'Geral',
        description: 'Ajustes compartilhados entre os perfis que você abrir neste dispositivo.',
        items: GENERAL_SETTINGS,
      },
      ROLE_SETTINGS[user.role],
    ];
  }, [user]);

  const storedValues = useMemo(
    () =>
      Object.fromEntries(
        sections.flatMap((s) => s.items.map((setting) => [setting.id, readToggleValue(setting)])),
      ),
    [sections],
  );

  const resolvedValues = useMemo(() => ({ ...storedValues, ...values }), [storedValues, values]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) router.push('/login');
  }, [hasHydrated, router, user]);

  const handleToggle = (setting: ToggleSetting) => {
    const next = !(resolvedValues[setting.id] ?? setting.defaultValue);
    writeToggleValue(setting, next);
    setValues((curr) => ({ ...curr, [setting.id]: next }));
  };

  if (!hasHydrated || !user) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  const accountHref = user.role === 'CONDOMINIUM_ADMIN' ? '/profile?tab=condominio' : '/profile?tab=perfil';
  const activeSection = sections[activeTab];

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Configurações</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--color-secondary)]">
            Preferências do dispositivo
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[var(--color-line)] bg-white/70 px-3 py-1.5 text-xs font-medium text-[var(--color-foreground-soft)]">
            {getModuleLabel(user.role)}
          </span>
          <span className="hidden rounded-full border border-[var(--color-line)] bg-[var(--color-background-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground-soft)] sm:inline-flex">
            Salvas neste dispositivo
          </span>
          <Link
            href="/ambientes"
            className="flex min-h-[36px] items-center gap-1.5 rounded-2xl border border-[var(--color-line)] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Trocar perfil
          </Link>
          <Link
            href={accountHref}
            className="flex min-h-[36px] items-center gap-1.5 rounded-2xl border border-[var(--color-line)] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <UserRound className="h-3.5 w-3.5" />
            Minha conta
          </Link>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-2xl border border-[var(--color-line)] bg-white/70 p-1 backdrop-blur-sm">
        {sections.map((section, index) => (
          <button
            key={section.title}
            type="button"
            onClick={() => setActiveTab(index)}
            className={clsx(
              'flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset',
              activeTab === index
                ? 'bg-[var(--color-secondary)] text-white shadow-sm'
                : 'text-[var(--color-foreground-soft)] hover:text-[var(--color-secondary)]',
            )}
          >
            {section.title}
          </button>
        ))}
      </div>

      {/* ── Active section ──────────────────────────────────────────────── */}
      {activeSection && (
        <Card className="rounded-[28px] p-5 sm:p-7">
          <div className="mb-5 border-b border-[var(--color-line)] pb-5">
            <h2 className="text-lg font-semibold text-[var(--color-secondary)]">
              {activeSection.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-foreground-soft)]">
              {activeSection.description}
            </p>
          </div>

          <div className="space-y-3">
            {activeSection.items.map((setting) => (
              <ToggleRow
                key={setting.id}
                setting={setting}
                checked={resolvedValues[setting.id] ?? setting.defaultValue}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
