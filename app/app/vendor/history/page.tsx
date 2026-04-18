'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, History } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';

type HistoryOrder = {
  id: string;
  status: 'COMPLETED' | 'CANCELLED';
  customerName: string;
  apartment: string;
  block?: string | null;
  totalAmount?: number;
  description?: string;
  createdAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
};

function statusClass(status: 'COMPLETED' | 'CANCELLED') {
  return status === 'COMPLETED'
    ? 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]'
    : 'bg-red-100 text-red-800';
}

function statusLabel(status: 'COMPLETED' | 'CANCELLED') {
  return status === 'COMPLETED' ? 'Concluído' : 'Cancelado';
}

export default function VendorHistoryPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();

  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await vendorsAPI.getMyOrdersHistory();
      setOrders(response.data || []);
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível carregar o histórico agora.'), 'error');
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
    loadHistory();
  }, [hasHydrated, user, router]);

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Histórico da loja"
        title="Histórico de pedidos"
        description="Consulte pedidos concluídos e cancelados com valores, datas e registros de encerramento da operação da loja."
        actions={
          <Button variant="secondary" onClick={() => router.push('/vendor/orders')}>
            Voltar para pedidos
          </Button>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="Sem histórico ainda"
          description="Pedidos finalizados aparecerão aqui conforme sua loja acumular histórico."
        />
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                    <span className="text-xs text-[var(--color-foreground-soft)]">#{order.id.slice(0, 8)}</span>
                  </div>
                  <p className="font-semibold text-[var(--color-secondary)]">{order.customerName}</p>
                  <p className="text-sm text-[var(--color-foreground-soft)]">
                    Apto {order.apartment}
                    {order.block ? `, bloco ${order.block}` : ''}
                  </p>
                  {order.description && <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">{order.description}</p>}
                  {order.status === 'CANCELLED' && order.cancelReason && (
                    <p className="mt-2 text-xs text-red-600">Motivo: {order.cancelReason}</p>
                  )}
                </div>

                <div className="md:text-right">
                  <p className="text-sm font-semibold text-[var(--color-primary-dark)]">
                    R$ {Number(order.totalAmount || 0).toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-foreground-soft)]">
                    Criado em {new Date(order.createdAt).toLocaleString('pt-BR')}
                  </p>
                  {order.completedAt && (
                    <p className="text-xs text-emerald-600">
                      Concluído em {new Date(order.completedAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                  {order.cancelledAt && (
                    <p className="text-xs text-red-600">
                      Cancelado em {new Date(order.cancelledAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
