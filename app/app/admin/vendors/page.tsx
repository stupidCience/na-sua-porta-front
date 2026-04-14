'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/Card';
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
    if (user.role !== 'CONDOMINIUM_ADMIN') { router.push('/deliveries'); return; }
    loadVendors();
  }, [user, router, hasHydrated]);

  const loadVendors = async () => {
    try {
      const response = await vendorsAPI.list();
      setVendors(response.data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar os comércios agora.'));
    } finally {
      setLoading(false);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Carregando comércios...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">🏪 Comércios do Condomínio</h1>
          <p className="text-gray-500 mt-1">Gerencie os estabelecimentos cadastrados</p>
        </div>
        <Link href="/admin">
          <button className="text-sm text-amber-600 font-semibold hover:underline">← Painel</button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
          <button onClick={loadVendors} className="ml-3 underline font-semibold">Tentar novamente</button>
        </div>
      )}

      {vendors.length === 0 && !error ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🏪</p>
            <p className="text-xl font-bold text-gray-700">Nenhum comércio cadastrado ainda</p>
            <p className="text-gray-500 mt-2 text-sm max-w-sm mx-auto">
              Quando vendedores se cadastrarem no sistema, eles aparecerão aqui para você gerenciar.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {vendors.map((vendor) => (
            <Card key={vendor.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 truncate">{vendor.name}</p>
                  {vendor.category && (
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">{vendor.category}</p>
                  )}
                  {vendor.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{vendor.description}</p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    {vendor.rating && <span>⭐ {vendor.rating.toFixed(1)}</span>}
                    {vendor._count && <span>🛍 {vendor._count.orders} pedidos</span>}
                    <span className={`font-semibold ${vendor.active ? 'text-emerald-600' : 'text-red-500'}`}>
                      {vendor.active ? '● Ativo' : '● Inativo'}
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
