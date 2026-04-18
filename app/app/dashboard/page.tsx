'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Bike, ChartSpline, Clock3, PackageCheck, Truck } from 'lucide-react';
import { Card } from '@/components/Card';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { ProgressStepper } from '@/components/ProgressStepper';
import { StatCard } from '@/components/StatCard';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const operationSteps = [
  { key: 'PENDING', label: 'Na fila', icon: '1' },
  { key: 'IN_PROGRESS', label: 'Em rota', icon: '2' },
  { key: 'DELIVERED', label: 'Concluído', icon: '3' },
];

interface Stats {
  total: number;
  delivered: number;
  pending: number;
  inProgress: number;
  todayDelivered: number;
  avgDeliveryTimeMinutes: number;
  onlineDeliveryPeople?: number;
  condominiumName?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'DELIVERY_PERSON') {
      router.push('/ambientes');
      return;
    }

    loadStats();
  }, [user, router, hasHydrated]);

  const loadStats = async () => {
    try {
      const response = await deliveriesAPI.getStats();
      setStats(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar seus indicadores agora.'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando seus indicadores...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Não conseguimos exibir seu painel agora.</p>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}min`;
  };

  const currentOperationKey =
    stats.inProgress > 0 ? 'IN_PROGRESS' : stats.delivered > 0 ? 'DELIVERED' : 'PENDING';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Operação do entregador"
        title="Visão rápida da sua rota"
        description="Acompanhe volume, andamento e ritmo das suas entregas com uma leitura comercial mais clara do dia."
        meta={
          <>
            <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 font-medium text-[var(--color-secondary)]">
              {stats.condominiumName || 'Condomínio não definido'}
            </span>
            <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-background-soft)] px-3 py-1.5 font-medium text-[var(--color-foreground-soft)]">
              {stats.total} entregas sob responsabilidade
            </span>
          </>
        }
      />

      <Card className="rounded-[28px] p-5 sm:p-6">
        <ProgressStepper
          title="Seu momento agora"
          steps={operationSteps}
          currentKey={currentOperationKey}
        />
      </Card>

      {error && (
        <NoticeBanner tone="error">{error}</NoticeBanner>
      )}

      <div className="content-grid-auto">
        <StatCard label="Concluídas hoje" value={stats.todayDelivered} description="Volume finalizado no dia atual." icon={PackageCheck} tone="amber" />
        <StatCard label="Aguardando coleta" value={stats.pending} description="Pedidos aceitos que ainda exigem retirada." icon={Activity} tone="rose" />
        <StatCard label="Em rota" value={stats.inProgress} description="Entregas atualmente em deslocamento." icon={Truck} tone="sky" />
        <StatCard label="Concluídas por você" value={stats.delivered} description="Quantidade total de entregas encerradas." icon={Bike} tone="emerald" />
        <StatCard label="Total em carteira" value={stats.total} description="Pedidos atualmente sob sua responsabilidade." icon={ChartSpline} tone="slate" />
        <StatCard label="Tempo médio" value={stats.avgDeliveryTimeMinutes > 0 ? `~${formatTime(stats.avgDeliveryTimeMinutes)}` : '~5 min'} description="Média estimada das suas últimas entregas." icon={Clock3} tone="violet" />
      </div>

      {/* Summary bar */}
      {stats.total > 0 && (
        <Card className="rounded-[28px] p-5 sm:p-6">
          <h3 className="text-sm font-medium text-[var(--color-foreground-soft)] mb-3">Distribuição operacional</h3>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100 flex">
            {stats.delivered > 0 && (
              <div
                className="h-full bg-[var(--color-primary)]"
                style={{ width: `${(stats.delivered / stats.total) * 100}%` }}
                title={`Concluídas: ${stats.delivered}`}
              />
            )}
            {stats.inProgress > 0 && (
              <div
                className="h-full bg-[var(--color-secondary)]"
                style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                title={`Em andamento: ${stats.inProgress}`}
              />
            )}
            {stats.pending > 0 && (
              <div
                className="h-full bg-[var(--color-accent-strong)]"
                style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                title={`Aguardando: ${stats.pending}`}
              />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-foreground-soft)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" /> Concluídas
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]" /> Em andamento
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-strong)]" /> Aguardando
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
