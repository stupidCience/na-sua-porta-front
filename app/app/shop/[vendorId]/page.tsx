'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';
import { Button } from '@/components/Button';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  available: boolean;
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
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export default function VendorPage() {
  const router = useRouter();
  const params = useParams();
  const vendorId = params?.vendorId as string;
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push('/login'); return; }
    if (!vendorId) return;
    loadVendor();
  }, [user, router, hasHydrated, vendorId]);

  const loadVendor = async () => {
    try {
      const response = await vendorsAPI.getById(vendorId);
      setVendor(response.data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Não conseguimos carregar este comércio agora.'));
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
    addToast(`✅ ${item.name} adicionado ao carrinho`, 'success');
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter((c) => c.menuItem.id !== itemId);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleOrder = async () => {
    if (cart.length === 0) return;
    if (!user?.apartment || !user?.block) {
      addToast('⚠️ Complete seu perfil com apartamento e bloco antes de pedir.', 'error');
      router.push('/profile');
      return;
    }
    setOrdering(true);
    try {
      await vendorsAPI.createOrder(vendorId, {
        items: cart.map((c) => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
        notes: notes || undefined,
        apartment: user.apartment,
        block: user.block,
      });
      addToast('🎉 Pedido enviado com sucesso! Acompanhe em "Meus Pedidos".', 'success');
      setCart([]);
      setNotes('');
      setShowCart(false);
      router.push('/deliveries');
    } catch (err: any) {
      addToast(getApiErrorMessage(err, 'Não conseguimos enviar seu pedido agora.'), 'error');
    } finally {
      setOrdering(false);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Carregando cardápio...</p>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-xl font-bold text-gray-700">Comércio não disponível</p>
        <p className="text-gray-500 mt-2 mb-6">{error || 'Este comércio não foi encontrado.'}</p>
        <Link href="/shop">
          <button className="button-primary px-6 py-3 text-sm font-bold rounded-xl">
            ← Voltar aos Comércios
          </button>
        </Link>
      </div>
    );
  }

  // Group menu items by category
  const categories = Array.from(new Set(vendor.menuItems.map((m) => m.category || 'Outros')));

  return (
    <div className="max-w-4xl mx-auto pb-32">
      {/* Back */}
      <Link href="/shop" className="inline-flex items-center gap-1 text-amber-600 font-semibold mb-4 hover:underline text-sm">
        ← Voltar
      </Link>

      {/* Hero banner */}
      <div className="h-48 rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center text-8xl mb-6 overflow-hidden relative">
        {vendor.imageUrl ? (
          <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
        ) : (
          <span>🏪</span>
        )}
      </div>

      {/* Vendor info */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">{vendor.name}</h1>
            {vendor.category && (
              <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mt-0.5">{vendor.category}</p>
            )}
            {vendor.description && (
              <p className="text-gray-600 mt-2 text-sm max-w-xl">{vendor.description}</p>
            )}
          </div>
          {vendor.rating && (
            <span className="bg-amber-100 text-amber-800 text-sm font-black px-3 py-1.5 rounded-full whitespace-nowrap">
              ⭐ {vendor.rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="flex gap-4 mt-3 text-sm text-gray-500 flex-wrap">
          {vendor.estimatedTimeMinutes && (
            <span className="flex items-center gap-1">⏱ {vendor.estimatedTimeMinutes} min</span>
          )}
          {vendor.minOrderValue !== undefined && vendor.minOrderValue > 0 && (
            <span className="flex items-center gap-1">💳 Pedido mínimo R$ {vendor.minOrderValue.toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition border-2 ${
              activeCategory === null
                ? 'bg-amber-500 border-amber-500 text-black'
                : 'border-gray-200 text-gray-600 hover:border-amber-300'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition border-2 ${
                activeCategory === cat
                  ? 'bg-amber-500 border-amber-500 text-black'
                  : 'border-gray-200 text-gray-600 hover:border-amber-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Menu */}
      {vendor.menuItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-gray-500 font-medium">Este comércio ainda não adicionou itens ao cardápio.</p>
        </div>
      ) : (
        categories
          .filter((cat) => activeCategory === null || cat === activeCategory)
          .map((cat) => {
            const items = vendor.menuItems.filter((m) => (m.category || 'Outros') === cat);
            return (
              <div key={cat} className="mb-8">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">{cat}</h2>
                <div className="space-y-3">
                  {items.map((item) => {
                    const cartItem = cart.find((c) => c.menuItem.id === item.id);
                    return (
                      <div key={item.id} className="card-default rounded-xl p-4 flex gap-4 items-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">🍽</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                          )}
                          <p className="text-amber-600 font-black mt-1">R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {cartItem ? (
                            <>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="w-8 h-8 rounded-full border-2 border-amber-500 text-amber-600 font-black flex items-center justify-center hover:bg-amber-50 transition"
                              >
                                −
                              </button>
                              <span className="text-gray-900 font-black w-5 text-center">{cartItem.quantity}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-8 h-8 rounded-full bg-amber-500 text-black font-black flex items-center justify-center hover:filter hover:brightness-95 transition"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="button-primary px-4 py-2 text-xs rounded-xl font-bold"
                            >
                              + Adicionar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
      )}

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 button-primary px-8 py-4 rounded-2xl font-black text-base shadow-2xl flex items-center gap-3 z-50"
        >
          <span className="bg-black text-amber-400 rounded-full w-7 h-7 text-sm flex items-center justify-center font-black">{cartCount}</span>
          Ver carrinho · R$ {cartTotal.toFixed(2)}
        </button>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-gray-900">🛒 Seu Pedido</h2>
                <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">×</button>
              </div>

              <div className="space-y-3 mb-4">
                {cart.map((c) => (
                  <div key={c.menuItem.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">{c.menuItem.name}</p>
                      <p className="text-xs text-gray-500">R$ {c.menuItem.price.toFixed(2)} × {c.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(c.menuItem.id)} className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 font-black flex items-center justify-center">−</button>
                      <span className="text-sm font-bold w-4 text-center">{c.quantity}</span>
                      <button onClick={() => addToCart(c.menuItem)} className="w-7 h-7 rounded-full bg-amber-500 text-black font-black flex items-center justify-center">+</button>
                    </div>
                    <p className="font-black text-amber-700 ml-3 text-sm">R$ {(c.menuItem.price * c.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 mb-4">
                <div className="flex justify-between text-lg font-black text-gray-900">
                  <span>Total</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Sem cebola, troco para R$ 50..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <Button
                fullWidth
                size="lg"
                loading={ordering}
                onClick={handleOrder}
                disabled={cart.length === 0 || (vendor.minOrderValue !== undefined && cartTotal < vendor.minOrderValue)}
              >
                🚀 Fazer Pedido
              </Button>

              {vendor.minOrderValue !== undefined && cartTotal < vendor.minOrderValue && (
                <p className="text-xs text-center text-red-500 mt-2">
                  Pedido mínimo: R$ {vendor.minOrderValue.toFixed(2)} (falta R$ {(vendor.minOrderValue - cartTotal).toFixed(2)})
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
