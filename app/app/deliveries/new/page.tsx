'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ShoppingBag } from 'lucide-react';
import { Card } from '@/components/Card';
import { ConciergeDeliveryForm } from '@/components/ui/concierge-delivery-form';
import { useAuthStore } from '@/lib/store';

export default function NewDeliveryPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || user.role !== 'RESIDENT') {
      router.push('/ambientes');
    }
  }, [user, router]);

  if (!user || user.role !== 'RESIDENT') {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Active card — portaria */}
        <div className="rounded-[28px] border-2 border-[var(--color-primary)] bg-[rgba(26,166,75,0.08)] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-[var(--color-primary-dark)] shadow-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-secondary)]">Receber na minha porta</p>
              <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">O entregador busca seu pedido na portaria e segue até o seu apartamento.</p>
            </div>
          </div>
        </div>

        {/* Passive card — shop */}
        <button
          type="button"
          onClick={() => router.push('/shop')}
          className="min-h-[44px] rounded-[28px] border-2 border-[var(--color-line)] bg-white p-5 text-left transition hover:border-[var(--color-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-background-soft)] text-[var(--color-primary-dark)]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-secondary)]">Pedir em restaurantes e lojas</p>
              <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">Abra o guia do condomínio e faça o pedido pelo cardápio interno.</p>
            </div>
          </div>
        </button>
      </div>

      {/* Form — glassmorphism container */}
      <Card className="rounded-[30px] bg-white/80 p-6 backdrop-blur-md sm:p-8">
        <ConciergeDeliveryForm />
      </Card>
    </div>
  );
}
