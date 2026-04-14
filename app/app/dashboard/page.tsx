'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { ProgressStepper } from '@/components/ProgressStepper';
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
      router.push('/deliveries');
      return;
    }

    loadStats();
  }, [user, router, hasHydrated]);

  const loadStats = async () => {
    try {
      const response = await deliveriesAPI.getStats();
      setStats(response.data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar seus indicadores agora.'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mb-4"></div>
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Sua operação de entregas em tempo real</p>
        <p className="text-sm text-gray-600 mt-2">
          Condomínio: {stats.condominiumName || 'Não definido'}
        </p>
        <p className="text-sm text-gray-500">Visão da sua operação como entregador</p>
      </div>

      <Card className="mb-6">
        <ProgressStepper
          title="Momento da operação"
          steps={operationSteps}
          currentKey={currentOperationKey}
        />
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">{stats.todayDelivered}</p>
            <p className="text-sm text-gray-500 mt-1">Suas entregas concluídas hoje</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500 mt-1">Aceitas aguardando coleta</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-sm text-gray-500 mt-1">Em rota</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
            <p className="text-sm text-gray-500 mt-1">Concluídas por você</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-700">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-1">Total sob sua responsabilidade</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {stats.avgDeliveryTimeMinutes > 0 ? `~${formatTime(stats.avgDeliveryTimeMinutes)}` : '~5 min'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Tempo médio estimado</p>
          </div>
        </Card>
      </div>

      {/* Summary bar */}
      {stats.total > 0 && (
        <Card>
          <h3 className="text-sm font-medium text-gray-600 mb-3">Distribuição de status</h3>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
            {stats.delivered > 0 && (
              <div
                className="h-full bg-green-500"
                style={{ width: `${(stats.delivered / stats.total) * 100}%` }}
                title={`Concluídas: ${stats.delivered}`}
              />
            )}
            {stats.inProgress > 0 && (
              <div
                className="h-full bg-blue-500"
                style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                title={`Em andamento: ${stats.inProgress}`}
              />
            )}
            {stats.pending > 0 && (
              <div
                className="h-full bg-yellow-400"
                style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                title={`Aguardando: ${stats.pending}`}
              />
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Concluídas
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Em andamento
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" /> Aguardando
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
