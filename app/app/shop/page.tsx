'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/Card';
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
      router.push('/deliveries');
      return;
    }
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

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.category?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  if (!hasHydrated || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Carregando comércios...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">🍽 Guia de restaurantes e lojas</h1>
        <p className="text-gray-500 mt-1">Cardápios disponíveis para pedir com entrega no condomínio.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Guia rápido</p>
            <p className="text-sm text-gray-600">Busque por categoria ou nome para encontrar seu próximo pedido.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">🍔 Lanches</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">🛒 Mercado</span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">💊 Farmácia</span>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">☕ Padaria</span>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="mb-6 mt-6">
        <input
          type="text"
          placeholder="Buscar por nome ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-800 bg-white shadow-sm"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
          <button onClick={loadVendors} className="ml-3 underline font-semibold">Tentar novamente</button>
        </div>
      )}

      {!error && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🏪</p>
          <p className="text-xl font-bold text-gray-700">Nenhum comércio encontrado</p>
          <p className="text-gray-500 mt-2 mb-6">
            {search ? 'Tente outra busca.' : 'Assim que estabelecimentos se cadastrarem, eles aparecerão aqui.'}
          </p>
          <Link href="/deliveries">
            <button className="button-primary px-6 py-3 text-sm font-bold rounded-xl">
              📦 Fazer Coleta na Portaria
            </button>
          </Link>
        </div>
      )}

      {/* Vendor Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((vendor) => (
          <Link key={vendor.id} href={`/shop/${vendor.id}`} className="block group">
            <div className="card-default rounded-2xl overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group-hover:border-amber-300">
              {/* Cover */}
              <div className="h-36 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-6xl relative overflow-hidden">
                {vendor.imageUrl ? (
                  <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{categoryEmoji(vendor.category)}</span>
                )}
                {vendor.rating && (
                  <span className="absolute top-2 right-2 bg-white/90 text-amber-700 text-xs font-black px-2 py-1 rounded-full shadow">
                    ⭐ {vendor.rating.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h2 className="text-lg font-black text-gray-900 truncate">{vendor.name}</h2>
                {vendor.category && (
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mt-0.5">{vendor.category}</p>
                )}
                {vendor.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{vendor.description}</p>
                )}

                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  {vendor.estimatedTimeMinutes && (
                    <span>⏱ {vendor.estimatedTimeMinutes} min</span>
                  )}
                  {vendor.minOrderValue !== undefined && vendor.minOrderValue > 0 && (
                    <span>💳 Mín. R$ {vendor.minOrderValue.toFixed(2)}</span>
                  )}
                  {vendor._count && (
                    <span>🛍 {vendor._count.orders} pedidos</span>
                  )}
                </div>

                <div className="mt-4">
                  <span className="button-primary text-xs px-4 py-2 rounded-xl inline-block font-bold">
                    Ver cardápio →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function categoryEmoji(category?: string): string {
  if (!category) return '🏪';
  const c = category.toLowerCase();
  if (c.includes('restaurante') || c.includes('comida') || c.includes('lanche')) return '🍔';
  if (c.includes('pizza')) return '🍕';
  if (c.includes('doce') || c.includes('confeit') || c.includes('bolo')) return '🎂';
  if (c.includes('mercado') || c.includes('supermercado')) return '🛒';
  if (c.includes('farmácia') || c.includes('farmacia') || c.includes('saúde')) return '💊';
  if (c.includes('bebida') || c.includes('bar')) return '🥤';
  if (c.includes('pet')) return '🐾';
  if (c.includes('flores') || c.includes('floricultura')) return '💐';
  if (c.includes('padaria') || c.includes('café') || c.includes('cafe')) return '☕';
  return '🏪';
}
