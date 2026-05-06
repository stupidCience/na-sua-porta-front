'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Card } from '@/components/Card';
import { StarRating } from '@/components/StarRating';
import { useAuthStore } from '@/lib/store';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/components/Toast';
import type { Delivery } from '@/lib/store';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function RatingsHistory() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push('/login'); return; }

    deliveriesAPI
      .getHistory()
      .then((res) => {
        const rated = (res.data as Delivery[]).filter((d) => d.rating);
        setDeliveries(rated);
      })
      .catch((err: unknown) => {
        addToast(getApiErrorMessage(err, 'Não conseguimos carregar suas avaliações agora.'), 'error');
      })
      .finally(() => setLoading(false));
  }, [hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasHydrated || loading) {
    return (
      <Card className="flex min-h-[260px] items-center justify-center rounded-[28px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </Card>
    );
  }

  return (
    <Card className="rounded-[28px] bg-white/80 p-6 backdrop-blur-md sm:p-8">
      <h1 className="mb-1 text-xl font-semibold text-[var(--color-secondary)]">Avaliações</h1>
      <p className="mb-7 text-sm text-[var(--color-foreground-soft)]">
        Suas avaliações registradas para entregas concluídas.
      </p>

      {deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--color-line)] bg-[var(--color-background-soft)] py-12 text-center">
          <Star className="h-10 w-10 text-[var(--color-foreground-soft)]" />
          <p className="mt-4 text-sm font-semibold text-[var(--color-secondary)]">
            Nenhuma avaliação ainda
          </p>
          <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">
            Após receber uma entrega, você poderá avaliar o entregador.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {deliveries.map((delivery) => (
            <li
              key={delivery.id}
              className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-secondary)]">
                    Entrega #{delivery.id.slice(-6).toUpperCase()}
                  </p>
                  {delivery.deliveryPerson?.name && (
                    <p className="mt-0.5 text-xs text-[var(--color-foreground-soft)]">
                      Entregador: {delivery.deliveryPerson.name}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--color-foreground-soft)]">
                    {formatDate(delivery.deliveredAt ?? delivery.createdAt)}
                  </p>
                </div>
                <StarRating rating={delivery.rating} readonly size="sm" />
              </div>
              {delivery.ratingComment && (
                <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
                  "{delivery.ratingComment}"
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
