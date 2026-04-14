'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';

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

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await vendorsAPI.getDashboard();
      setData(response.data);
    } catch (err: any) {
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
      router.push('/deliveries');
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <p className="text-sm text-gray-600">Sem dados para exibir no momento.</p>
          <div className="mt-4">
            <Button onClick={loadDashboard}>Tentar novamente</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Dashboard do Comércio</h1>
          <p className="mt-1 text-sm text-gray-500">Comparativo diário de pedidos e vendas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/vendor/orders')}>
            Pedidos
          </Button>
          <Button variant="secondary" onClick={() => router.push('/vendor/store')}>
            Meu Comércio
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-gray-500">Pedidos de hoje</p>
          <p className="mt-2 text-4xl font-black text-gray-900">{data.today.orders}</p>
          <p className={`mt-2 text-sm font-semibold ${deltaClass(data.deltas.ordersPercent)}`}>
            {data.deltas.ordersPercent >= 0 ? '+' : ''}
            {data.deltas.ordersPercent}% vs ontem ({data.yesterday.orders})
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Vendas de hoje</p>
          <p className="mt-2 text-4xl font-black text-gray-900">R$ {Number(data.today.sales || 0).toFixed(2)}</p>
          <p className={`mt-2 text-sm font-semibold ${deltaClass(data.deltas.salesPercent)}`}>
            {data.deltas.salesPercent >= 0 ? '+' : ''}
            {data.deltas.salesPercent}% vs ontem (R$ {Number(data.yesterday.sales || 0).toFixed(2)})
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-gray-900">Pedidos por status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { key: 'PENDING', label: 'Pendentes', color: 'bg-yellow-100 text-yellow-800' },
            { key: 'ACCEPTED', label: 'Aceitos', color: 'bg-blue-100 text-blue-800' },
            { key: 'SENT', label: 'Enviados', color: 'bg-violet-100 text-violet-800' },
            { key: 'COMPLETED', label: 'Concluídos', color: 'bg-emerald-100 text-emerald-800' },
            { key: 'CANCELLED', label: 'Cancelados', color: 'bg-red-100 text-red-800' },
          ].map((item) => (
            <div key={item.key} className="rounded-lg border border-gray-200 p-3">
              <p className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.color}`}>
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-black text-gray-900">
                {data.byStatus[item.key as keyof DashboardData['byStatus']]}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-gray-900">Últimos dias</h2>
        <div className="mt-4 space-y-3">
          {data.period.length === 0 ? (
            <p className="text-sm text-gray-500">Sem histórico suficiente para exibir tendência.</p>
          ) : (
            data.period.map((item) => (
              <div key={item.date}>
                <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                  <span>{item.orders} pedidos</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
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
