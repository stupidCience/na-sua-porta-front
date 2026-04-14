'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { ProgressStepper } from '@/components/ProgressStepper';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

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
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
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

    if (user.role !== 'CONDOMINIUM_ADMIN') {
      router.push('/deliveries');
      return;
    }

    loadOverview();
  }, [user, router, hasHydrated]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const response = await deliveriesAPI.getAdminOverview();
      setData(response.data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar o painel do condomínio agora.'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando visão do condomínio...</p>
        </div>
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Painel do Condomínio</h1>
        <p className="text-gray-500 mt-1">Visão gerencial da operação em tempo real</p>
        <p className="text-sm text-gray-600 mt-2">Condomínio: {data.condominium?.name || 'Não definido'}</p>
      </div>

      <Card className="mb-6">
        <ProgressStepper
          title="Estado atual da operação"
          steps={adminSteps}
          currentKey={currentAdminStep}
        />
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">{data.overview.todayDemand}</p>
            <p className="text-sm text-gray-500 mt-1">Demandas hoje</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{data.overview.onlineDeliveryPeople}</p>
            <p className="text-sm text-gray-500 mt-1">Entregadores online</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{data.overview.delivered}</p>
            <p className="text-sm text-gray-500 mt-1">Entregas concluídas</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">~{data.overview.avgDeliveryTimeMinutes || 0} min</p>
            <p className="text-sm text-gray-500 mt-1">Tempo médio</p>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Fluxo atual</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>Na fila: <strong>{data.overview.requested}</strong></p>
            <p>Aceitas: <strong>{data.overview.accepted}</strong></p>
            <p>Em rota: <strong>{data.overview.pickedUp}</strong></p>
            <p>Total operacional: <strong>{data.overview.total}</strong></p>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Top entregadores</h2>
          {data.topCouriers.length === 0 ? (
            <p className="text-sm text-gray-500">Sem entregas concluídas ainda.</p>
          ) : (
            <div className="space-y-2">
              {data.topCouriers.map((courier) => (
                <div key={courier.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{courier.name}</span>
                  <span className="font-semibold text-emerald-700">{courier.delivered} concluídas</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Demanda por bloco</h2>
          {data.demandByBlock.length === 0 ? (
            <p className="text-sm text-gray-500">Sem dados de demanda por bloco.</p>
          ) : (
            <div className="space-y-2">
              {data.demandByBlock.slice(0, 8).map((item) => (
                <div key={item.block} className="flex justify-between text-sm">
                  <span className="text-gray-700">Bloco {item.block}</span>
                  <span className="font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Demanda por hora</h2>
          {data.demandByHour.length === 0 ? (
            <p className="text-sm text-gray-500">Sem dados de demanda por hora.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto pr-2">
              {data.demandByHour.map((item) => (
                <div key={item.hour} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.hour}</span>
                  <span className="font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
