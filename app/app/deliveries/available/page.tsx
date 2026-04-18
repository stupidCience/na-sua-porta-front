'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, PackageSearch, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { ProgressStepper } from '@/components/ProgressStepper';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';
import { useToastStore } from '@/components/Toast';
import type { Delivery } from '@/lib/store';

const deliverySteps = [
  { key: 'REQUESTED', label: 'Solicitado', icon: '1' },
  { key: 'ACCEPTED', label: 'Aceito', icon: '2' },
  { key: 'PICKED_UP', label: 'Coletado', icon: '3' },
  { key: 'DELIVERED', label: 'Entregue', icon: '4' },
];

export default function AvailableDeliveriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { on, off, connectionStatus } = useSocket(
    user?.id,
    user?.role,
    user?.condominiumId,
  );
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'DELIVERY_PERSON') {
      router.push('/');
      return;
    }
    loadDeliveries();
  }, [user, router]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveriesAPI.getAvailable();
      setDeliveries(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar os pedidos disponíveis agora.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      setAccepting(deliveryId);
      await deliveriesAPI.accept(deliveryId);
      setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
      addToast('🚀 Coleta aceita! Vá até a origem para buscar o pacote.', 'success');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Não conseguimos aceitar esta entrega agora.');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setAccepting(null);
    }
  };

  useEffect(() => {
    const handleDeliveryCreated = (delivery: Delivery) => {
      setDeliveries((prev) => {
        const updated = [delivery, ...prev];
        // Limitar a 50 entregas para evitar crescimento indefinido de memória
        return updated.slice(0, 50);
      });
      addToast('Novo pedido disponível!', 'info');
    };

    const handleDeliveryAccepted = (delivery: Delivery) => {
      setDeliveries((prev) => prev.filter((d) => d.id !== delivery.id));
    };

    on('delivery_created', handleDeliveryCreated);
    on('delivery_accepted', handleDeliveryAccepted);

    return () => {
      off('delivery_created', handleDeliveryCreated);
      off('delivery_accepted', handleDeliveryAccepted);
    };
  }, [on, off, addToast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent mb-4"></div>
          <p className="text-gray-600">Buscando pedidos disponíveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Fila de coletas"
        title="Coletas disponíveis"
        description="Aceite novas coletas conforme os pedidos entram na fila do condomínio e priorize as melhores oportunidades do momento."
        meta={
          <>
            <span className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 font-medium text-[var(--color-secondary)]">
              {deliveries.length} coleta{deliveries.length !== 1 ? 's' : ''} aberta{deliveries.length !== 1 ? 's' : ''}
            </span>
          </>
        }
      />

      {connectionStatus === 'reconnecting' && (
        <NoticeBanner tone="warning">
          Atualizando a lista. Novos pedidos aparecem em instantes.
        </NoticeBanner>
      )}

      {error && (
        <NoticeBanner tone="error">{error}</NoticeBanner>
      )}

      {deliveries.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Nenhum pedido disponível no momento"
          description="Novas coletas aparecerão aqui automaticamente assim que entrarem na fila do condomínio."
          actions={
            <Button variant="secondary" onClick={loadDeliveries}>
              Atualizar lista
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent-strong)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent-strong)]"></span>
                    </span>
                    <span className="rounded-full bg-[rgba(255,213,58,0.2)] px-3 py-1 text-sm font-medium text-[var(--color-primary-dark)] ring-1 ring-[rgba(243,183,27,0.35)]">
                      {delivery.type === 'MARKETPLACE' ? 'Pedido de loja' : 'Portaria'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-3">
                        <p className="text-xs text-[var(--color-foreground-soft)]">Entregar em</p>
                        <p className="text-lg font-semibold text-[var(--color-secondary)]">
                          Bloco {delivery.block} · Apto {delivery.apartment}
                        </p>
                      </div>
                    </div>

                    {delivery.resident && (
                      <div className="flex items-center gap-2">
                        <Avatar name={delivery.resident.name} size="sm" />
                        <span className="text-sm text-[var(--color-foreground-soft)]">{delivery.resident.name}</span>
                      </div>
                    )}

                    {delivery.description && (
                      <p className="text-sm leading-6 text-[var(--color-foreground-soft)]">{delivery.description}</p>
                    )}

                    <p className="text-sm text-[var(--color-secondary)]">
                      <span className="text-[var(--color-foreground-soft)]">Origem:</span>{' '}
                      {delivery.pickupOrigin || (delivery.type === 'MARKETPLACE' ? 'Comércio parceiro' : 'Portaria')}
                    </p>

                    {delivery.order && (
                      <p className="text-xs text-[var(--color-foreground-soft)]">
                        Pedido #{delivery.order.id.slice(0, 8)} · Pagamento {delivery.order.paymentStatus === 'PAID' ? 'pago' : 'pendente'}
                      </p>
                    )}

                    <ProgressStepper
                      title="Etapa atual"
                      steps={deliverySteps}
                      currentKey={delivery.status}
                    />

                    {delivery.order && (
                      <p className="text-xs font-semibold text-gray-700">
                        Status de pagamento:{' '}
                        <span className={`rounded-full px-2 py-0.5 ${delivery.order.paymentStatus === 'PAID' ? 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]' : 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]'}`}>
                          {delivery.order.paymentStatus === 'PAID' ? 'Pago' : 'Pendente'}
                        </span>
                      </p>
                    )}

                    {delivery.notes && (
                      <p className="text-sm italic text-[var(--color-foreground-soft)]">{delivery.notes}</p>
                    )}

                    <p className="text-xs text-[var(--color-foreground-soft)]">
                      {new Date(delivery.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:flex-shrink-0 sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => handleAcceptDelivery(delivery.id)}
                    loading={accepting === delivery.id}
                    disabled={accepting !== null}
                  >
                    Aceitar entrega
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
