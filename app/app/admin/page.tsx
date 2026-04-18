'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Bike, Building2, ChartColumn, Clock3 } from 'lucide-react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { ProgressStepper } from '@/components/ProgressStepper';
import { StatCard } from '@/components/StatCard';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { readBooleanPreference } from '@/lib/preferences';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';

const adminSteps = [
  { key: 'REQUESTED', label: 'Na fila', icon: '1' },
  { key: 'ACCEPTED', label: 'Aceitas', icon: '2' },
  { key: 'PICKED_UP', label: 'Em rota', icon: '3' },
  { key: 'DELIVERED', label: 'Concluídas', icon: '4' },
];

interface AdminOverviewResponse {
  condominium?: {
    id: string;
    name: string;
  } | null;
  overview: {
    total: number;
    requested: number;
    accepted: number;
    pickedUp: number;
    delivered: number;
    todayDemand: number;
    avgDeliveryTimeMinutes: number;
    onlineDeliveryPeople: number;
  };
  demandByHour: Array<{ hour: string; count: number }>;
  demandByBlock: Array<{ block: string; count: number }>;
  topCouriers: Array<{ id: string; name: string; delivered: number }>;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { onlineDeliveryPeople, connectionStatus } = useSocket(
    user?.id,
    user?.role,
    user?.condominiumId,
  );
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  const [showActivationReview, setShowActivationReview] = useState(true);
  const [showResidentReminder, setShowResidentReminder] = useState(true);
  const [compactLists, setCompactLists] = useState(false);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'CONDOMINIUM_ADMIN') {
      router.push('/ambientes');
      return;
    }

    loadOverview();
  }, [user, router, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    setShowSummary(readBooleanPreference('nsp_settings_CONDOMINIUM_ADMIN_open_summary', true));
    setShowActivationReview(readBooleanPreference('nsp_settings_CONDOMINIUM_ADMIN_activation_requests', true));
    setShowResidentReminder(readBooleanPreference('nsp_settings_CONDOMINIUM_ADMIN_new_residents', true));
    setCompactLists(readBooleanPreference('nsp_settings_general_compact_lists', false));
  }, [hasHydrated]);

  if (!hasHydrated) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent mb-4"></div>
          <p className="text-gray-600">Preparando painel do condomínio...</p>
        </div>
      </div>
    );
  }

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await deliveriesAPI.getAdminOverview();
      setData(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar o painel do condomínio agora.'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando visão do condomínio...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <EmptyState
          icon={Building2}
          title="Painel indisponível no momento"
          description={error}
          actions={
            <>
              <button
                type="button"
                onClick={loadOverview}
                className="button-primary min-h-[44px] rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                Tentar novamente
              </button>
              <Link href="/profile?tab=condominio">
                <span className="button-secondary inline-flex min-h-[44px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold">
                  Abrir gestão do condomínio
                </span>
              </Link>
            </>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Não conseguimos exibir os dados do condomínio agora.</p>
      </div>
    );
  }

  const currentAdminStep =
    data.overview.pickedUp > 0
      ? 'PICKED_UP'
      : data.overview.accepted > 0
        ? 'ACCEPTED'
        : data.overview.delivered > 0
          ? 'DELIVERED'
          : 'REQUESTED';

  const liveOnlineDeliveryPeople =
    connectionStatus === 'connected'
      ? onlineDeliveryPeople
      : data.overview.onlineDeliveryPeople;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Conta do condomínio"
        title="Painel do condomínio"
        description="Acompanhe pedidos, entregas e demanda do condomínio com uma visão comercial e operacional mais clara do momento."
        meta={
          <>
            <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 font-medium text-[var(--color-secondary)]">
              {data.condominium?.name || 'Condomínio não definido'}
            </span>
            <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-background-soft)] px-3 py-1.5 font-medium text-[var(--color-foreground-soft)]">
              {data.overview.total} entregas monitoradas
            </span>
          </>
        }
      />

      {showSummary && (
        <Card className="rounded-[28px] p-5 sm:p-6">
          <ProgressStepper
            title="Panorama do momento"
            steps={adminSteps}
            currentKey={currentAdminStep}
          />
        </Card>
      )}

      {error && (
        <NoticeBanner tone="error">{error}</NoticeBanner>
      )}

      {showResidentReminder && (
        <NoticeBanner tone="info">
          Novos cadastros e mudanças de vínculo ficam mais fáceis de acompanhar quando você revisa a área de usuários ao longo do dia.
        </NoticeBanner>
      )}

      {showActivationReview && (
        <Card className="rounded-[28px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-foreground-soft)]">
                Rotina de aprovação
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--color-secondary)]">Revisar acessos e cadastros</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-foreground-soft)]">
                Use estes atalhos quando quiser validar usuários, conferir permissões e destravar solicitações administrativas sem sair do fluxo do painel.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/profile?tab=usuarios" className="button-secondary min-h-[44px] rounded-2xl px-4 py-2.5 text-sm font-semibold">
                Revisar usuários
              </Link>
              <Link href="/profile?tab=acesso" className="button-secondary min-h-[44px] rounded-2xl px-4 py-2.5 text-sm font-semibold">
                Conferir permissões
              </Link>
              <Link href="/admin/vendors" className="button-secondary min-h-[44px] rounded-2xl px-4 py-2.5 text-sm font-semibold">
                Aprovar comércios
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="content-grid-auto">
        <StatCard
          label="Demandas hoje"
          value={data.overview.todayDemand}
          description="Chamados de entrega e coleta abertos no dia atual."
          icon={Activity}
          tone="amber"
        />
        <StatCard
          label="Entregadores online"
          value={liveOnlineDeliveryPeople}
          description="Profissionais disponíveis para assumir coletas agora."
          icon={Bike}
          tone="emerald"
        />
        <StatCard
          label="Concluídas"
          value={data.overview.delivered}
          description="Entregas finalizadas dentro do condomínio."
          icon={ChartColumn}
          tone="sky"
        />
        <StatCard
          label="Tempo médio"
          value={`~${data.overview.avgDeliveryTimeMinutes || 0} min`}
          description="Média estimada entre abertura e conclusão das entregas."
          icon={Clock3}
          tone="violet"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className={clsx('rounded-[28px]', compactLists ? 'p-4 sm:p-5' : 'p-5 sm:p-6')}>
          <h2 className="text-lg font-semibold text-[var(--color-secondary)]">Entregas neste momento</h2>
          <div className="mt-4 space-y-3 text-sm text-[var(--color-secondary)]">
            {[
              ['Na fila', data.overview.requested],
              ['Aceitas', data.overview.accepted],
              ['Em rota', data.overview.pickedUp],
              ['Total acompanhado', data.overview.total],
            ].map(([label, value]) => (
              <div
                key={label}
                className={clsx(
                  'flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4',
                  compactLists ? 'py-2.5' : 'py-3',
                )}
              >
                <span className="text-[var(--color-foreground-soft)]">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card className={clsx('rounded-[28px]', compactLists ? 'p-4 sm:p-5' : 'p-5 sm:p-6')}>
          <h2 className="text-lg font-semibold text-[var(--color-secondary)]">Top entregadores</h2>
          {data.topCouriers.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-foreground-soft)]">Sem entregas concluídas ainda.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.topCouriers.map((courier) => (
                <div
                  key={courier.id}
                  className={clsx(
                    'flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 text-sm',
                    compactLists ? 'py-2.5' : 'py-3',
                  )}
                >
                  <span className="font-medium text-[var(--color-secondary)]">{courier.name}</span>
                  <span className="font-semibold text-emerald-700">{courier.delivered} concluídas</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className={clsx('rounded-[28px]', compactLists ? 'p-4 sm:p-5' : 'p-5 sm:p-6')}>
          <h2 className="text-lg font-semibold text-[var(--color-secondary)]">Demanda por bloco</h2>
          {data.demandByBlock.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-foreground-soft)]">Sem dados de demanda por bloco.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.demandByBlock.slice(0, 8).map((item) => (
                <div
                  key={item.block}
                  className={clsx(
                    'flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 text-sm',
                    compactLists ? 'py-2.5' : 'py-3',
                  )}
                >
                  <span className="text-[var(--color-secondary)]">Bloco {item.block}</span>
                  <span className="font-medium text-[var(--color-secondary)]">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={clsx('rounded-[28px]', compactLists ? 'p-4 sm:p-5' : 'p-5 sm:p-6')}>
          <h2 className="text-lg font-semibold text-[var(--color-secondary)]">Demanda por hora</h2>
          {data.demandByHour.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-foreground-soft)]">Sem dados de demanda por hora.</p>
          ) : (
            <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
              {data.demandByHour.map((item) => (
                <div
                  key={item.hour}
                  className={clsx(
                    'flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 text-sm',
                    compactLists ? 'py-2.5' : 'py-3',
                  )}
                >
                  <span className="text-[var(--color-secondary)]">{item.hour}</span>
                  <span className="font-medium text-[var(--color-secondary)]">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
