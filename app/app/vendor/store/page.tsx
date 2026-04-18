'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, PackagePlus, Store } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { vendorsAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  available: boolean;
};

type VendorProfile = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  aboutText?: string | null;
  contactPhone?: string | null;
  estimatedTimeMinutes?: number | null;
  minOrderValue?: number | null;
  menuItems: MenuItem[];
};

export default function VendorStorePage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [error, setError] = useState('');

  const [storeForm, setStoreForm] = useState({
    name: '',
    description: '',
    category: '',
    imageUrl: '',
    bannerUrl: '',
    aboutText: '',
    contactPhone: '',
    estimatedTimeMinutes: '',
    minOrderValue: '',
  });

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
  });

  const loadVendor = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await vendorsAPI.getMe();
      const data = response.data as VendorProfile;
      setVendor(data);
      setStoreForm({
        name: data.name ?? '',
        description: data.description ?? '',
        category: data.category ?? '',
        imageUrl: data.imageUrl ?? '',
        bannerUrl: data.bannerUrl ?? '',
        aboutText: data.aboutText ?? '',
        contactPhone: data.contactPhone ?? '',
        estimatedTimeMinutes: data.estimatedTimeMinutes ? String(data.estimatedTimeMinutes) : '',
        minOrderValue: data.minOrderValue ? String(data.minOrderValue) : '',
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar seu comércio agora.'));
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
    loadVendor();
  }, [hasHydrated, user, router]);

  const saveStore = async () => {
    if (!storeForm.name.trim()) {
      addToast('Nome do comércio é obrigatório.', 'error');
      return;
    }

    try {
      setSaving(true);
      await vendorsAPI.updateMe({
        name: storeForm.name,
        description: storeForm.description,
        category: storeForm.category,
        imageUrl: storeForm.imageUrl,
        bannerUrl: storeForm.bannerUrl,
        aboutText: storeForm.aboutText,
        contactPhone: storeForm.contactPhone,
        estimatedTimeMinutes: storeForm.estimatedTimeMinutes
          ? Number(storeForm.estimatedTimeMinutes)
          : undefined,
        minOrderValue: storeForm.minOrderValue ? Number(storeForm.minOrderValue) : undefined,
      });
      addToast('Informações do comércio atualizadas.', 'success');
      await loadVendor();
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível salvar o comércio agora.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const addMenuItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price.trim()) {
      addToast('Nome e preço do item são obrigatórios.', 'error');
      return;
    }

    try {
      setAddingItem(true);
      await vendorsAPI.addMenuItem({
        name: itemForm.name,
        description: itemForm.description,
        price: Number(itemForm.price),
        category: itemForm.category,
        imageUrl: itemForm.imageUrl,
      });
      addToast('Item adicionado ao cardápio.', 'success');
      setItemForm({ name: '', description: '', price: '', category: '', imageUrl: '' });
      await loadVendor();
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível adicionar o item agora.'), 'error');
    } finally {
      setAddingItem(false);
    }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    try {
      await vendorsAPI.updateMenuItem(item.id, { available: !item.available });
      setVendor((prev) =>
        prev
          ? {
              ...prev,
              menuItems: prev.menuItems.map((it) =>
                it.id === item.id ? { ...it, available: !item.available } : it,
              ),
            }
          : prev,
      );
      addToast(item.available ? 'Item pausado.' : 'Item disponibilizado.', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível atualizar este item.'), 'error');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await vendorsAPI.deleteMenuItem(itemId);
      setVendor((prev) =>
        prev
          ? {
              ...prev,
              menuItems: prev.menuItems.filter((item) => item.id !== itemId),
            }
          : prev,
      );
      addToast('Item removido do cardápio.', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível remover este item.'), 'error');
    }
  };

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
        eyebrow="Vitrine da loja"
        title="Meu comércio"
        description="Atualize sua vitrine, os dados da loja e o cardápio exibido aos moradores com uma apresentação mais comercial e clara."
        actions={
          <Button variant="secondary" onClick={() => router.push('/vendor/orders')}>
            Ver pedidos
          </Button>
        }
      />

      {error && (
        <NoticeBanner tone="error">{error}</NoticeBanner>
      )}

      <Card className="rounded-[28px] p-6 sm:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nome do comércio"
            value={storeForm.name}
            onChange={(e) => setStoreForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome do comércio"
          />
          <Input
            label="Categoria"
            value={storeForm.category}
            onChange={(e) => setStoreForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Lanches, mercado, farmácia..."
          />
          <Input
            label="Telefone de contato"
            value={storeForm.contactPhone}
            onChange={(e) => setStoreForm((f) => ({ ...f, contactPhone: e.target.value }))}
            placeholder="(11) 99999-9999"
          />
          <Input
            label="Tempo médio (min)"
            value={storeForm.estimatedTimeMinutes}
            onChange={(e) => setStoreForm((f) => ({ ...f, estimatedTimeMinutes: e.target.value }))}
            placeholder="30"
            type="number"
          />
          <Input
            label="Pedido mínimo (R$)"
            value={storeForm.minOrderValue}
            onChange={(e) => setStoreForm((f) => ({ ...f, minOrderValue: e.target.value }))}
            placeholder="20"
            type="number"
          />
          <Input
            label="URL da foto"
            value={storeForm.imageUrl}
            onChange={(e) => setStoreForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://..."
          />
          <Input
            label="URL do banner"
            value={storeForm.bannerUrl}
            onChange={(e) => setStoreForm((f) => ({ ...f, bannerUrl: e.target.value }))}
            placeholder="https://..."
          />
          <div>
            <label className="field-label">Descrição</label>
            <textarea
              value={storeForm.description}
              onChange={(e) => setStoreForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Resumo do seu comércio"
              className="field-textarea"
              rows={4}
            />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Sobre</label>
            <textarea
              value={storeForm.aboutText}
              onChange={(e) => setStoreForm((f) => ({ ...f, aboutText: e.target.value }))}
              placeholder="Conte mais sobre seu negócio"
              className="field-textarea"
              rows={4}
            />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={saveStore} loading={saving}>
            Salvar informações
          </Button>
        </div>
      </Card>

      <Card className="rounded-[28px] p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[var(--color-secondary)]">Prévia da sua vitrine</h2>
        <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">
          Veja como seu comércio aparece para moradores no guia.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-sm">
          <div className="relative h-40 bg-gradient-to-r from-[rgba(255,213,58,0.28)] via-[rgba(26,166,75,0.14)] to-[rgba(31,41,51,0.1)]">
            {storeForm.bannerUrl ? (
              <img src={storeForm.bannerUrl} alt="Banner da vitrine" className="h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute bottom-3 left-3 flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-white shadow">
                {storeForm.imageUrl ? (
                  <img src={storeForm.imageUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--color-primary-dark)]"><Store className="h-6 w-6" /></div>
                )}
              </div>
              <div>
                <p className="text-lg font-black text-white drop-shadow">{storeForm.name || 'Seu comércio'}</p>
                <p className="text-xs font-semibold text-white/90">
                  {storeForm.category || 'Categoria do comércio'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <p className="text-sm text-[var(--color-foreground-soft)]">
              {storeForm.description || 'Adicione uma descrição para apresentar sua loja aos moradores.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {storeForm.estimatedTimeMinutes && (
                <span className="rounded-full bg-[rgba(255,213,58,0.2)] px-2 py-1 text-[var(--color-secondary)]">
                  {storeForm.estimatedTimeMinutes} min
                </span>
              )}
              {storeForm.minOrderValue && (
                <span className="rounded-full bg-[rgba(26,166,75,0.14)] px-2 py-1 text-[var(--color-primary-dark)]">
                  Mín. R$ {Number(storeForm.minOrderValue).toFixed(2)}
                </span>
              )}
              {storeForm.contactPhone && (
                <span className="rounded-full bg-[rgba(31,41,51,0.06)] px-2 py-1 text-[var(--color-secondary)]">
                  {storeForm.contactPhone}
                </span>
              )}
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-800">Itens em destaque</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {(vendor?.menuItems || []).filter((item) => item.available).slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-background-soft)] px-3 py-2">
                    <p className="text-sm font-semibold text-[var(--color-secondary)]">{item.name}</p>
                    <p className="text-xs text-[var(--color-foreground-soft)]">{item.category || 'Sem categoria'}</p>
                    <p className="text-sm font-bold text-[var(--color-primary-dark)]">R$ {item.price.toFixed(2)}</p>
                  </div>
                ))}
                {(vendor?.menuItems || []).filter((item) => item.available).length === 0 && (
                  <p className="text-xs text-[var(--color-foreground-soft)]">Adicione itens disponíveis para visualizar a vitrine completa.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[28px] p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[var(--color-secondary)]">Adicionar item no cardápio</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="Nome"
            value={itemForm.name}
            onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="X-Burger"
          />
          <Input
            label="Preço (R$)"
            type="number"
            value={itemForm.price}
            onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="18.90"
          />
          <Input
            label="Categoria"
            value={itemForm.category}
            onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Lanches"
          />
          <Input
            label="URL da imagem"
            value={itemForm.imageUrl}
            onChange={(e) => setItemForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://..."
          />
          <div className="md:col-span-2">
            <label className="field-label">Descrição</label>
            <textarea
              value={itemForm.description}
              onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Detalhes do item"
              className="field-textarea"
              rows={4}
            />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={addMenuItem} loading={addingItem}>Adicionar item</Button>
        </div>
      </Card>

      <Card className="rounded-[28px] p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[var(--color-secondary)]">Cardápio atual</h2>
        {!vendor?.menuItems?.length ? (
          <p className="mt-4 text-sm text-[var(--color-foreground-soft)]">Nenhum item cadastrado ainda.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {vendor.menuItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-[24px] border border-[var(--color-line)] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--color-secondary)]">{item.name}</p>
                  {item.description && <p className="text-sm text-[var(--color-foreground-soft)]">{item.description}</p>}
                  <p className="mt-1 text-sm font-semibold text-[var(--color-primary-dark)]">R$ {item.price.toFixed(2)}</p>
                  <p className="text-xs text-[var(--color-foreground-soft)]">
                    {item.category || 'Sem categoria'} • {item.available ? 'Disponível' : 'Pausado'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleItemAvailability(item)}
                  >
                    {item.available ? 'Pausar' : 'Ativar'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => removeItem(item.id)}>
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
