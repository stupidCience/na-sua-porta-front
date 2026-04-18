'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
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
    title: 'Pedidos e avisos',
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
    title: 'Coletas e rota',
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
    title: 'Pedidos e atendimento',
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
    title: 'Aprovações e acompanhamento',
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
  if (typeof window === 'undefined') {
    return setting.defaultValue;
  }

  const storedValue = localStorage.getItem(setting.storageKey);

  if (storedValue === null) {
    return setting.defaultValue;
  }

  return storedValue === (setting.trueValue ?? 'on');
}

function writeToggleValue(setting: ToggleSetting, value: boolean) {
  localStorage.setItem(
    setting.storageKey,
    value ? (setting.trueValue ?? 'on') : (setting.falseValue ?? 'off'),
  );
}

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
    <button
      type="button"
      onClick={() => onToggle(setting)}
      className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 text-left transition-colors hover:border-[var(--color-line-strong)] hover:bg-white"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-primary-dark)] shadow-[0_10px_20px_rgba(28,25,23,0.06)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-secondary)]">{setting.label}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-foreground-soft)]">{setting.description}</p>
        </div>
      </div>

      <div
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[var(--color-secondary)]' : 'bg-[var(--color-line-strong)]'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
    </button>
  );
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [values, setValues] = useState<Record<string, boolean>>({});

  const sections = useMemo(() => {
    if (!user) {
      return [] as SettingsSection[];
    }

    return [
      {
        title: 'Uso no dispositivo',
        description: 'Ajustes compartilhados entre os perfis que você abrir neste dispositivo.',
        items: GENERAL_SETTINGS,
      },
      ROLE_SETTINGS[user.role],
    ];
  }, [user]);

  const storedValues = useMemo(
    () =>
      Object.fromEntries(
        sections.flatMap((section) =>
          section.items.map((setting) => [setting.id, readToggleValue(setting)]),
        ),
      ),
    [sections],
  );

  const resolvedValues = useMemo(
    () => ({
      ...storedValues,
      ...values,
    }),
    [storedValues, values],
  );

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      router.push('/login');
    }
  }, [hasHydrated, router, user]);

  const handleToggle = (setting: ToggleSetting) => {
    const nextValue = !(resolvedValues[setting.id] ?? setting.defaultValue);
    writeToggleValue(setting, nextValue);
    setValues((current) => ({
      ...current,
      [setting.id]: nextValue,
    }));
  };

  if (!hasHydrated || !user) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const accountHref = user.role === 'CONDOMINIUM_ADMIN' ? '/profile?tab=condominio' : '/profile?tab=perfil';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Configurações"
        title="Configurações do dispositivo"
        description="Ajuste alertas, confirmações e a forma como este acesso funciona no seu dispositivo. Dados cadastrais, segurança e vínculo com condomínio continuam em Minha conta."
        meta={
          <>
            <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 font-medium text-[var(--color-secondary)]">
              {getModuleLabel(user.role)}
            </span>
            <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-background-soft)] px-3 py-1.5 font-medium text-[var(--color-foreground-soft)]">
              Salvas neste dispositivo
            </span>
          </>
        }
        actions={
          <>
            <Link href="/ambientes">
              <Button variant="secondary" size="sm">
                <LayoutGrid className="h-4 w-4" />
                Trocar perfil
              </Button>
            </Link>
            <Link href={accountHref}>
              <Button size="sm">
                <UserRound className="h-4 w-4" />
                Minha conta
              </Button>
            </Link>
          </>
        }
      />

      <Card className="rounded-[30px] p-6 sm:p-7">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-[var(--color-secondary)]">Preferências deste acesso</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
            As opções abaixo ficam salvas neste dispositivo e ajustam como o perfil atual organiza alertas, confirmações e prioridades no uso diário.
          </p>
        </div>

        <div className="mt-8 space-y-8">
          {sections.map((section, index) => (
            <section
              key={section.title}
              className={index === 0 ? undefined : 'border-t border-[var(--color-line)] pt-8'}
            >
              <div className="max-w-3xl">
                <h3 className="text-lg font-semibold text-[var(--color-secondary)]">{section.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-foreground-soft)]">{section.description}</p>
              </div>

              <div className="mt-5 space-y-3">
                {section.items.map((setting) => (
                  <ToggleRow
                    key={setting.id}
                    setting={setting}
                    checked={resolvedValues[setting.id] ?? setting.defaultValue}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}