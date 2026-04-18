'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Store } from 'lucide-react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface Vendor {
  id: string;
  name: string;
  category?: string;
  description?: string;
  active: boolean;
  rating?: number;
  _count?: { orders: number };
}

export default function AdminVendorsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'CONDOMINIUM_ADMIN') { router.push('/ambientes'); return; }
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

  if (!hasHydrated || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Carregando comércios...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Gestão comercial"
        title="Comércios do condomínio"
        description="Acompanhe os estabelecimentos ativos, o volume de pedidos e a presença comercial dentro do condomínio com leitura mais clara da base lojista."
        actions={
          <Link href="/admin">
            <span className="button-secondary inline-flex min-h-[44px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold">
              Voltar ao painel
            </span>
          </Link>
        }
      />

      {error && (
        <NoticeBanner tone="error">
          {error}
          <button onClick={loadVendors} className="ml-3 font-semibold underline">Tentar novamente</button>
        </NoticeBanner>
      )}

      {vendors.length === 0 && !error ? (
        <EmptyState
          icon={Store}
          title="Nenhum comércio cadastrado ainda"
          description="Quando vendedores se cadastrarem no sistema, eles aparecerão aqui para acompanhamento e gestão administrativa."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="rounded-[28px] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-background-soft)] text-[var(--color-primary-dark)]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--color-secondary)]">{vendor.name}</p>
                      <p className="text-xs text-[var(--color-foreground-soft)]">Estabelecimento vinculado ao condomínio</p>
                    </div>
                  </div>
                  {vendor.category && (
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-dark)]">{vendor.category}</p>
                  )}
                  {vendor.description && (
                    <p className="mt-2 text-sm leading-6 text-[var(--color-foreground-soft)] line-clamp-3">{vendor.description}</p>
                  )}
                  <p className="mt-3 text-xs font-medium text-[var(--color-foreground-soft)]">
                    Base comercial vinculada ao condomínio e acompanhada pela gestão.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    {vendor.rating && <span className="rounded-full bg-[rgba(255,213,58,0.2)] px-3 py-1 text-[var(--color-primary-dark)] ring-1 ring-[rgba(243,183,27,0.35)]">Nota {vendor.rating.toFixed(1)}</span>}
                    {vendor._count && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-slate-200">{vendor._count.orders} pedidos</span>}
                    <span className={`rounded-full px-3 py-1 ring-1 ${vendor.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-rose-50 text-rose-700 ring-rose-100'}`}>
                      {vendor.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
