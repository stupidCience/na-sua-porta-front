'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Coffee, Package, Pill, ShoppingBag, Store } from 'lucide-react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

interface Vendor {
  id: string;
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  estimatedTimeMinutes?: number;
  minOrderValue?: number;
  rating?: number;
  menuItems: MenuItem[];
  _count?: { orders: number };
}

export default function ShopPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'RESIDENT') {
      router.push('/ambientes');
      return;
    }
    loadVendors();
  }, [user, router, hasHydrated]);

  const loadVendors = async () => {
    try {
      const response = await vendorsAPI.list();
      setVendors(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar os comércios agora.'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.category?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  if (!hasHydrated || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Carregando comércios...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Comércio do condomínio"
        title="Guia de restaurantes e lojas"
        description="Descubra cardápios e serviços com uma vitrine mais clara para pedir sem sair de casa e receber direto no condomínio."
        actions={
          <Link href="/deliveries/new">
            <span className="button-secondary inline-flex min-h-[44px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold">
              Fazer coleta na portaria
            </span>
          </Link>
        }
      />

      <Card className="rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-primary-dark)]">Guia rápido</p>
            <p className="text-sm text-[var(--color-foreground-soft)]">Busque por categoria ou nome para encontrar seu próximo pedido.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { label: 'Lanches', tone: 'bg-[rgba(255,213,58,0.2)] text-[var(--color-primary-dark)]', Icon: ShoppingBag },
              { label: 'Mercado', tone: 'bg-[rgba(26,166,75,0.14)] text-[var(--color-primary-dark)]', Icon: Package },
              { label: 'Farmácia', tone: 'bg-[rgba(31,41,51,0.08)] text-[var(--color-secondary)]', Icon: Pill },
              { label: 'Padaria', tone: 'bg-[rgba(26,166,75,0.1)] text-[var(--color-secondary)]', Icon: Coffee },
            ].map(({ label, tone, Icon }) => {
              const ChipIcon = Icon as LucideIcon;
              return (
                <span key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${tone}`}>
                  <ChipIcon className="h-3.5 w-3.5" />
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      </Card>

      <Input
        type="text"
        placeholder="Buscar por nome ou categoria..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-12"
      />

      {error && (
        <NoticeBanner tone="error">
          {error}
          <button onClick={loadVendors} className="ml-3 underline font-semibold">Tentar novamente</button>
        </NoticeBanner>
      )}

      {!error && filtered.length === 0 && (
        <EmptyState
          icon={Store}
          title="Nenhum comércio encontrado"
          description={search ? 'Tente outra busca ou ajuste os termos digitados.' : 'Assim que novos estabelecimentos se cadastrarem, eles aparecerão aqui.'}
          actions={
            <Link href="/deliveries/new">
              <span className="button-primary inline-flex min-h-[44px] items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold">
                Fazer coleta na portaria
              </span>
            </Link>
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((vendor) => (
          <Link key={vendor.id} href={`/shop/${vendor.id}`} className="block group">
            <Card className="overflow-hidden rounded-[28px] p-0 group-hover:border-[var(--color-accent-strong)]">
              <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-[rgba(255,213,58,0.28)] via-[rgba(26,166,75,0.14)] to-[rgba(31,41,51,0.08)]">
                {vendor.imageUrl ? (
                  <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-18 w-18 items-center justify-center rounded-[28px] bg-white/80 text-[var(--color-primary-dark)] shadow-lg">
                    {(() => {
                      const { Icon } = getCategoryMeta(vendor.category);
                      return <Icon className="h-8 w-8" />;
                    })()}
                  </div>
                )}
                {vendor.rating && (
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-primary-dark)] shadow-sm">
                    Nota {vendor.rating.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="p-5">
                <h2 className="truncate text-lg font-semibold text-[var(--color-secondary)]">{vendor.name}</h2>
                {vendor.category && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-dark)]">{vendor.category}</p>
                )}
                {vendor.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-foreground-soft)]">{vendor.description}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  {vendor.estimatedTimeMinutes && (
                    <span className="rounded-full bg-[rgba(255,213,58,0.2)] px-3 py-1 text-[var(--color-primary-dark)] ring-1 ring-[rgba(243,183,27,0.35)]">{vendor.estimatedTimeMinutes} min</span>
                  )}
                  {vendor.minOrderValue !== undefined && vendor.minOrderValue > 0 && (
                    <span className="rounded-full bg-[rgba(26,166,75,0.14)] px-3 py-1 text-[var(--color-primary-dark)] ring-1 ring-[rgba(26,166,75,0.2)]">Mín. R$ {vendor.minOrderValue.toFixed(2)}</span>
                  )}
                  {vendor._count && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-slate-200">{vendor._count.orders} pedidos</span>
                  )}
                </div>

                <div className="mt-4">
                  <span className="button-primary inline-block rounded-2xl px-4 py-2 text-xs font-semibold">
                    Ver cardápio
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getCategoryMeta(category?: string): { Icon: LucideIcon } {
  if (!category) return { Icon: Store };
  const c = category.toLowerCase();
  if (c.includes('restaurante') || c.includes('comida') || c.includes('lanche') || c.includes('pizza')) return { Icon: ShoppingBag };
  if (c.includes('mercado') || c.includes('supermercado')) return { Icon: Package };
  if (c.includes('farmácia') || c.includes('farmacia') || c.includes('saúde')) return { Icon: Pill };
  if (c.includes('padaria') || c.includes('café') || c.includes('cafe') || c.includes('doce') || c.includes('confeit')) return { Icon: Coffee };
  return { Icon: Store };
}
