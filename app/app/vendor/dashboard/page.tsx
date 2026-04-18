'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ChartColumnIncreasing, ShoppingBag, Store, Wallet } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';
import { useSocket } from '@/lib/useSocket';

type DashboardData = {
  today: {
    orders: number;
    sales: number;
  };
  yesterday: {
    orders: number;
    sales: number;
  };
  deltas: {
    ordersPercent: number;
    salesPercent: number;
  };
  byStatus: {
    PENDING: number;
    ACCEPTED: number;
    SENT: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  period: Array<{ date: string; orders: number }>;
};

function deltaClass(value: number) {
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();
  const { onlineDeliveryPeople, connectionStatus } = useSocket(
    user?.id,
    user?.role,
    user?.condominiumId,
  );

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await vendorsAPI.getDashboard();
      setData(response.data);
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível carregar o dashboard agora.'), 'error');
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
      router.push('/ambientes');
      return;
    }
    loadDashboard();
  }, [hasHydrated, user, router]);

  const maxPeriodOrders = useMemo(() => {
    if (!data?.period?.length) return 1;
    return Math.max(...data.period.map((item) => item.orders), 1);
  }, [data]);

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="rounded-[28px] p-6">
          <p className="text-sm text-[var(--color-foreground-soft)]">Sem dados para exibir no momento.</p>
          <div className="mt-4">
            <Button onClick={loadDashboard}>Tentar novamente</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Performance comercial"
        title="Painel comercial da loja"
        description="Compare pedidos, faturamento e ritmo operacional para decidir os próximos passos da loja com mais clareza."
        meta={
          <>
            <span className="rounded-full border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] px-3 py-1.5 font-medium text-[var(--color-primary-dark)]">
              {onlineDeliveryPeople} entregadores online
            </span>
            <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 font-medium text-[var(--color-secondary)]">
              {connectionStatus === 'connected' ? 'Atualização ao vivo ativa' : 'Atualização temporariamente pausada'}
            </span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => router.push('/vendor/orders')}>
              Pedidos
            </Button>
            <Button variant="secondary" onClick={() => router.push('/vendor/store')}>
              Meu comércio
            </Button>
          </>
        }
      />

      <div className="content-grid-auto">
        <StatCard label="Pedidos de hoje" value={data.today.orders} description={<span className={deltaClass(data.deltas.ordersPercent)}>{data.deltas.ordersPercent >= 0 ? '+' : ''}{data.deltas.ordersPercent}% vs ontem ({data.yesterday.orders})</span>} icon={ShoppingBag} tone="amber" />
        <StatCard label="Vendas de hoje" value={`R$ ${Number(data.today.sales || 0).toFixed(2)}`} description={<span className={deltaClass(data.deltas.salesPercent)}>{data.deltas.salesPercent >= 0 ? '+' : ''}{data.deltas.salesPercent}% vs ontem (R$ {Number(data.yesterday.sales || 0).toFixed(2)})</span>} icon={Wallet} tone="emerald" />
        <StatCard label="Entregadores online" value={onlineDeliveryPeople} description="Profissionais disponíveis agora para assumir coletas da loja." icon={Store} tone="sky" />
      </div>

      <Card className="rounded-[28px] p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-[var(--color-secondary)]">Pedidos por status</h2>
        <div className="mt-4 content-grid-auto">
          {[
            { key: 'PENDING', label: 'Pendentes', color: 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]' },
            { key: 'ACCEPTED', label: 'Aceitos', color: 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]' },
            { key: 'SENT', label: 'Enviados', color: 'bg-[rgba(31,41,51,0.06)] text-[var(--color-secondary)]' },
            { key: 'COMPLETED', label: 'Concluídos', color: 'bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)]' },
            { key: 'CANCELLED', label: 'Cancelados', color: 'bg-red-100 text-red-800' },
          ].map((item) => (
            <div key={item.key} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] p-4">
              <p className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.color}`}>
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-secondary)]">
                {data.byStatus[item.key as keyof DashboardData['byStatus']]}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[28px] p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-[var(--color-secondary)]">Últimos dias</h2>
        <div className="mt-4 space-y-3">
          {data.period.length === 0 ? (
            <NoticeBanner tone="info">Sem histórico suficiente para exibir tendência.</NoticeBanner>
          ) : (
            data.period.map((item) => (
              <div key={item.date}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs text-[var(--color-foreground-soft)]">
                  <span>{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                  <span>{item.orders} pedidos</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${(item.orders / maxPeriodOrders) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
