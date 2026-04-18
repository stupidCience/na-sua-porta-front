'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Package, ShoppingCart, Store } from 'lucide-react';
import { NoticeBanner } from '@/components/NoticeBanner';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';

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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos enviar seu pedido agora.'), 'error');
    } finally {
      setOrdering(false);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Carregando cardápio...</p>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="mx-auto max-w-4xl py-16">
        <EmptyState
          icon={Store}
          title="Comércio não disponível"
          description={error || 'Este comércio não foi encontrado.'}
          actions={
            <Link href="/shop">
              <Button size="lg">Voltar aos comércios</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // Group menu items by category
  const categories = Array.from(new Set(vendor.menuItems.map((m) => m.category || 'Outros')));

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8 mobile-safe-bottom">
      <Link href="/shop" className="button-secondary inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
        Voltar
      </Link>

      <Card padding={false} className="overflow-hidden rounded-[32px]">
        <div className="relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br from-[rgba(255,213,58,0.28)] via-[rgba(26,166,75,0.14)] to-[rgba(31,41,51,0.1)] sm:h-64">
        {vendor.imageUrl ? (
          <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-[30px] bg-white/80 text-[var(--color-primary-dark)] shadow-xl">
            <Store className="h-10 w-10" />
          </div>
        )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.03em] text-[var(--color-secondary)]">{vendor.name}</h1>
              {vendor.category && (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary-dark)]">{vendor.category}</p>
              )}
              {vendor.description && (
                <p className="mt-3 text-sm leading-7 text-[var(--color-foreground-soft)] sm:text-base">{vendor.description}</p>
              )}
              <p className="mt-3 text-sm font-medium text-[var(--color-foreground-soft)]">
                Vitrine do condomínio com pedido interno, acompanhamento claro e entrega organizada até o apartamento.
              </p>
            </div>
            {vendor.rating && (
              <span className="rounded-full bg-[rgba(255,213,58,0.2)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-dark)] ring-1 ring-[rgba(243,183,27,0.35)] whitespace-nowrap">
                Nota {vendor.rating.toFixed(1)}
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
            {vendor.estimatedTimeMinutes && (
              <span className="rounded-full bg-[rgba(255,213,58,0.2)] px-3 py-1.5 text-[var(--color-primary-dark)] ring-1 ring-[rgba(243,183,27,0.35)]">{vendor.estimatedTimeMinutes} min</span>
            )}
            {vendor.minOrderValue !== undefined && vendor.minOrderValue > 0 && (
              <span className="rounded-full bg-[rgba(26,166,75,0.14)] px-3 py-1.5 text-[var(--color-primary-dark)] ring-1 ring-[rgba(26,166,75,0.2)]">Pedido mínimo R$ {vendor.minOrderValue.toFixed(2)}</span>
            )}
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 ring-1 ring-slate-200">{vendor.menuItems.filter((item) => item.available).length} itens disponíveis</span>
          </div>
        </div>
      </Card>

      {vendor.minOrderValue !== undefined && vendor.minOrderValue > 0 && cartTotal > 0 && cartTotal < vendor.minOrderValue && (
        <NoticeBanner tone="warning">
          Falta R$ {(vendor.minOrderValue - cartTotal).toFixed(2)} para atingir o pedido mínimo desta loja.
        </NoticeBanner>
      )}

      {categories.length > 1 && (
        <div className="horizontal-scroller pb-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
              activeCategory === null
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-line)] bg-white text-[var(--color-foreground-soft)] hover:border-[var(--color-accent-strong)] hover:text-[var(--color-secondary)]'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                activeCategory === cat
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-line)] bg-white text-[var(--color-foreground-soft)] hover:border-[var(--color-accent-strong)] hover:text-[var(--color-secondary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Menu */}
      {vendor.menuItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Este comércio ainda não adicionou itens"
          description="Quando o cardápio for publicado, os produtos disponíveis aparecerão aqui para pedido imediato."
        />
      ) : (
        categories
          .filter((cat) => activeCategory === null || cat === activeCategory)
          .map((cat) => {
            const items = vendor.menuItems.filter((m) => (m.category || 'Outros') === cat);
            return (
              <div key={cat} className="mb-8">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-foreground-soft)]">{cat}</h2>
                <div className="space-y-3">
                  {items.map((item) => {
                    const cartItem = cart.find((c) => c.menuItem.id === item.id);
                    return (
                      <div key={item.id} className="rounded-[28px] border border-[var(--color-line)] bg-white p-4 shadow-sm transition-shadow hover:shadow-[0_20px_38px_rgba(28,25,23,0.08)] sm:flex sm:items-center sm:gap-4 sm:p-5">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-20 w-20 rounded-2xl object-cover sm:h-18 sm:w-18 flex-shrink-0" />
                        ) : (
                          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,213,58,0.2)] text-[var(--color-primary-dark)] sm:h-18 sm:w-18">
                            <ShoppingCart className="h-7 w-7" />
                          </div>
                        )}
                        <div className="mt-4 min-w-0 flex-1 sm:mt-0">
                          <p className="font-semibold text-[var(--color-secondary)]">{item.name}</p>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm leading-6 text-[var(--color-foreground-soft)]">{item.description}</p>
                          )}
                          <p className="mt-2 text-base font-semibold text-[var(--color-primary-dark)]">R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="mt-4 flex items-center gap-2 sm:mt-0 flex-shrink-0">
                          {cartItem ? (
                            <>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--color-primary)] font-black text-[var(--color-primary-dark)] transition hover:bg-[rgba(26,166,75,0.08)]"
                              >
                                −
                              </button>
                              <span className="w-5 text-center font-semibold text-[var(--color-secondary)]">{cartItem.quantity}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] font-black text-white transition hover:brightness-95"
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
          className="floating-safe-bottom fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl px-8 py-4 text-base font-semibold shadow-2xl button-primary"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-secondary)] text-sm font-semibold text-[var(--color-accent)]">{cartCount}</span>
          Ver carrinho · R$ {cartTotal.toFixed(2)}
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="mt-auto max-h-[88vh] w-full overflow-y-auto rounded-t-[32px] bg-white shadow-2xl sm:mt-0 sm:max-h-[85vh] sm:max-w-md sm:rounded-[32px]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[var(--color-secondary)]">Seu pedido</h2>
                <button onClick={() => setShowCart(false)} className="text-2xl font-bold leading-none text-gray-400 hover:text-gray-700">×</button>
              </div>

              <div className="space-y-3 mb-4">
                {cart.map((c) => (
                  <div key={c.menuItem.id} className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{c.menuItem.name}</p>
                      <p className="text-xs text-gray-500">R$ {c.menuItem.price.toFixed(2)} × {c.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => removeFromCart(c.menuItem.id)} className="w-9 h-9 rounded-full border border-gray-300 text-gray-600 font-black flex items-center justify-center">−</button>
                      <span className="text-sm font-bold w-4 text-center">{c.quantity}</span>
                      <button onClick={() => addToCart(c.menuItem)} className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white font-black flex items-center justify-center">+</button>
                    </div>
                    <p className="font-black text-[var(--color-primary-dark)] text-sm w-full text-right sm:w-auto sm:ml-3">R$ {(c.menuItem.price * c.quantity).toFixed(2)}</p>
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Observações (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Sem cebola, troco para R$ 50..."
                  rows={2}
                  className="field-textarea text-sm"
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
