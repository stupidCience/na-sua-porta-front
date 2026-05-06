'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { PackagePlus, Pencil, Store, Trash2, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { NoticeBanner } from '@/components/NoticeBanner';
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

type Tab = 'profile' | 'menu';

/* ── Inline Toggle Switch ─────────────────────────────────────────────────── */
function AvailabilityToggle({
  available,
  onChange,
}: {
  available: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      onClick={onChange}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
        available ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-line-strong)]',
      )}
    >
      <span
        className={clsx(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
          available ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/* ── Add Item Modal ───────────────────────────────────────────────────────── */
type ItemForm = { name: string; description: string; price: string; category: string; imageUrl: string };

function AddItemModal({
  open,
  onClose,
  onAdd,
  adding,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (form: ItemForm) => Promise<void>;
  adding: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<ItemForm>({ name: '', description: '', price: '', category: '', imageUrl: '' });
  const set = (k: keyof ItemForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /* close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* reset form when opening */
  useEffect(() => {
    if (open) setForm({ name: '', description: '', price: '', category: '', imageUrl: '' });
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-t-[32px] bg-white p-6 shadow-2xl sm:rounded-[32px] sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-[var(--color-secondary)]">
              Novo produto
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-foreground-soft)]">
              Preencha as informações e clique em adicionar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-line)] bg-white text-[var(--color-foreground-soft)] transition hover:bg-[var(--color-background-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="item-name"
              label="Nome do produto"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ex: X-Burger"
              required
              autoFocus
            />
            <Input
              id="item-price"
              label="Preço (R$)"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="18.90"
              required
            />
            <Input
              id="item-category"
              label="Categoria"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="Lanches, Bebidas..."
            />
            <Input
              id="item-image"
              label="URL da imagem"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label htmlFor="item-description" className="field-label">
              Descrição{' '}
              <span className="font-normal text-[var(--color-foreground-soft)]">(opcional)</span>
            </label>
            <textarea
              id="item-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Descreva brevemente o produto..."
              className="field-textarea min-h-[80px] w-full resize-none px-4 py-3 transition-all focus:outline-none"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={adding}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth loading={adding}>
              <PackagePlus className="h-4 w-4" />
              Adicionar produto
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Edit Item Modal ─────────────────────────────────────────────────────── */
function EditItemModal({
  open,
  item,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onSave: (id: string, form: ItemForm) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<ItemForm>({ name: '', description: '', price: '', category: '', imageUrl: '' });
  const set = (k: keyof ItemForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open && item) {
      setForm({
        name: item.name,
        description: item.description ?? '',
        price: String(item.price),
        category: item.category ?? '',
        imageUrl: '',
      });
    }
  }, [open, item]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(item.id, form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-t-[32px] bg-white p-6 shadow-2xl sm:rounded-[32px] sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 id="edit-modal-title" className="text-xl font-bold text-[var(--color-secondary)]">
              Editar produto
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-foreground-soft)]">
              Altere as informações e salve.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-line)] bg-white text-[var(--color-foreground-soft)] transition hover:bg-[var(--color-background-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="edit-item-name"
              label="Nome do produto"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ex: X-Burger"
              required
              autoFocus
            />
            <Input
              id="edit-item-price"
              label="Preço (R$)"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="18.90"
              required
            />
            <Input
              id="edit-item-category"
              label="Categoria"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="Lanches, Bebidas..."
            />
            <Input
              id="edit-item-image"
              label="URL da imagem"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label htmlFor="edit-item-description" className="field-label">
              Descrição{' '}
              <span className="font-normal text-[var(--color-foreground-soft)]">(opcional)</span>
            </label>
            <textarea
              id="edit-item-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Descreva brevemente o produto..."
              className="field-textarea min-h-[80px] w-full resize-none px-4 py-3 transition-all focus:outline-none"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Menu Item Card ───────────────────────────────────────────────────────── */
function MenuItemCard({
  item,
  onToggle,
  onRemove,
  onEdit,
}: {
  item: MenuItem;
  onToggle: () => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col rounded-[24px] border border-[var(--color-line)] bg-white p-4 shadow-sm transition-all duration-200',
        !item.available && 'opacity-50 grayscale',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--color-secondary)]">{item.name}</p>
          {item.category && (
            <span className="mt-0.5 inline-block rounded-full bg-[rgba(26,166,75,0.1)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary-dark)]">
              {item.category}
            </span>
          )}
        </div>
        <p className="shrink-0 text-base font-black text-[var(--color-primary-dark)]">
          R$ {item.price.toFixed(2)}
        </p>
      </div>

      {item.description && (
        <p className="mt-2 line-clamp-2 text-sm text-[var(--color-foreground-soft)]">
          {item.description}
        </p>
      )}

      {/* Footer row */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-line)] pt-3">
        <div className="flex items-center gap-2">
          <AvailabilityToggle available={item.available} onChange={onToggle} />
          <span className="text-xs font-medium text-[var(--color-foreground-soft)]">
            {item.available ? 'Disponível' : 'Pausado'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Editar ${item.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-line)] bg-white text-[var(--color-foreground-soft)] transition hover:bg-[var(--color-background-soft)] hover:text-[var(--color-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover ${item.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function VendorStorePage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [updatingItem, setUpdatingItem] = useState(false);
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
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'VENDOR') { router.push('/ambientes'); return; }
    loadVendor();
  }, [hasHydrated, user, router]);

  const saveStore = async () => {
    if (!storeForm.name.trim()) { addToast('Nome do comércio é obrigatório.', 'error'); return; }
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
        estimatedTimeMinutes: storeForm.estimatedTimeMinutes ? Number(storeForm.estimatedTimeMinutes) : undefined,
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

  const addMenuItem = async (form: { name: string; description: string; price: string; category: string; imageUrl: string }) => {
    if (!form.name.trim() || !form.price.trim()) { addToast('Nome e preço do item são obrigatórios.', 'error'); return; }
    try {
      setAddingItem(true);
      await vendorsAPI.addMenuItem({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        imageUrl: form.imageUrl,
      });
      addToast('Item adicionado ao cardápio.', 'success');
      setModalOpen(false);
      await loadVendor();
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível adicionar o item agora.'), 'error');
    } finally {
      setAddingItem(false);
    }
  };

  const updateItem = async (itemId: string, form: ItemForm) => {
    if (!form.name.trim() || !form.price.trim()) { addToast('Nome e preço são obrigatórios.', 'error'); return; }
    try {
      setUpdatingItem(true);
      await vendorsAPI.updateMenuItem(itemId, {
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        category: form.category || undefined,
        imageUrl: form.imageUrl || undefined,
      });
      addToast('Item atualizado.', 'success');
      setEditingItem(null);
      await loadVendor();
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível atualizar este item.'), 'error');
    } finally {
      setUpdatingItem(false);
    }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    try {
      await vendorsAPI.updateMenuItem(item.id, { available: !item.available });
      setVendor((prev) =>
        prev
          ? { ...prev, menuItems: prev.menuItems.map((it) => it.id === item.id ? { ...it, available: !item.available } : it) }
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
        prev ? { ...prev, menuItems: prev.menuItems.filter((item) => item.id !== itemId) } : prev,
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

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'profile', label: 'Perfil da loja' },
    { id: 'menu', label: 'Cardápio', count: vendor?.menuItems.length ?? 0 },
  ];

  return (
    <>
      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addMenuItem}
        adding={addingItem}
      />
      <EditItemModal
        open={editingItem !== null}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={updateItem}
        saving={updatingItem}
      />

      <div className="mx-auto max-w-5xl space-y-6 pb-8">
        {error && <NoticeBanner tone="error">{error}</NoticeBanner>}

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-2xl border border-[var(--color-line)] bg-white/70 p-1 backdrop-blur-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset',
                activeTab === tab.id
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-[var(--color-foreground-soft)] hover:text-[var(--color-secondary)]',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={clsx(
                    'rounded-full px-1.5 py-0.5 text-xs font-bold',
                    activeTab === tab.id
                      ? 'bg-white/25 text-white'
                      : 'bg-[var(--color-line)] text-[var(--color-foreground-soft)]',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Perfil da Loja ──────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <Card className="rounded-[28px] p-0" padding={false}>
            {/* Store preview banner */}
            <div className="relative h-36 overflow-hidden rounded-t-[28px] bg-gradient-to-r from-[rgba(255,213,58,0.28)] via-[rgba(26,166,75,0.14)] to-[rgba(31,41,51,0.08)]">
              {storeForm.bannerUrl && (
                <img src={storeForm.bannerUrl} alt="Banner da loja" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
              <div className="absolute bottom-4 left-5 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md">
                  {storeForm.imageUrl
                    ? <img src={storeForm.imageUrl} alt="Logo" className="h-full w-full object-cover" />
                    : <Store className="h-6 w-6 text-[var(--color-primary-dark)]" />
                  }
                </div>
                <div>
                  <p className="text-lg font-black text-white drop-shadow">{storeForm.name || 'Seu comércio'}</p>
                  <p className="text-xs font-semibold text-white/90">{storeForm.category || 'Categoria'}</p>
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="space-y-6 p-6 sm:p-8">
              {/* Row 1: Name + Category */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="store-name"
                  label="Nome do comércio"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Burguer do João"
                  required
                />
                <Input
                  id="store-category"
                  label="Categoria"
                  value={storeForm.category}
                  onChange={(e) => setStoreForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Lanches, mercado, farmácia..."
                />
              </div>

              {/* Row 2: Phone + Estimated time + Min order */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  id="store-phone"
                  label="Telefone de contato"
                  value={storeForm.contactPhone}
                  onChange={(e) => setStoreForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
                <Input
                  id="store-time"
                  label="Tempo médio (min)"
                  type="number"
                  min="1"
                  value={storeForm.estimatedTimeMinutes}
                  onChange={(e) => setStoreForm((f) => ({ ...f, estimatedTimeMinutes: e.target.value }))}
                  placeholder="30"
                />
                <Input
                  id="store-min-order"
                  label="Pedido mínimo (R$)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={storeForm.minOrderValue}
                  onChange={(e) => setStoreForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                  placeholder="20.00"
                />
              </div>

              {/* Row 3: Image URL + Banner URL */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="store-image"
                  label="URL da foto (logo)"
                  value={storeForm.imageUrl}
                  onChange={(e) => setStoreForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
                <Input
                  id="store-banner"
                  label="URL do banner"
                  value={storeForm.bannerUrl}
                  onChange={(e) => setStoreForm((f) => ({ ...f, bannerUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              {/* Row 4: Description */}
              <div>
                <label htmlFor="store-description" className="field-label">Descrição</label>
                <textarea
                  id="store-description"
                  value={storeForm.description}
                  onChange={(e) => setStoreForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Resumo do seu comércio para os moradores"
                  className="field-textarea min-h-[80px] w-full resize-none px-4 py-3 focus:outline-none"
                  rows={3}
                />
              </div>

              {/* Row 5: About */}
              <div>
                <label htmlFor="store-about" className="field-label">Sobre</label>
                <textarea
                  id="store-about"
                  value={storeForm.aboutText}
                  onChange={(e) => setStoreForm((f) => ({ ...f, aboutText: e.target.value }))}
                  placeholder="Conte mais sobre o seu negócio, horários, diferenciais..."
                  className="field-textarea min-h-[80px] w-full resize-none px-4 py-3 focus:outline-none"
                  rows={4}
                />
              </div>

              {/* Save button */}
              <div className="border-t border-[var(--color-line)] pt-4">
                <Button onClick={saveStore} loading={saving} size="lg">
                  Salvar alterações
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Tab: Cardápio ────────────────────────────────────────────────── */}
        {activeTab === 'menu' && (
          <div className="space-y-5">
            {/* Header row with CTA */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-secondary)]">Seus produtos</h2>
                <p className="text-sm text-[var(--color-foreground-soft)]">
                  Gerencie disponibilidade e adicione novos itens.
                </p>
              </div>
              <Button onClick={() => setModalOpen(true)} size="md">
                <PackagePlus className="h-4 w-4" />
                Adicionar produto
              </Button>
            </div>

            {/* Empty state */}
            {!vendor?.menuItems?.length ? (
              <Card className="rounded-[28px] py-14 text-center" padding={false}>
                <div className="flex flex-col items-center gap-4 px-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(26,166,75,0.08)] text-[var(--color-primary-dark)]">
                    <PackagePlus className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-secondary)]">
                      Seu cardápio está vazio
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">
                      Adicione seu primeiro produto para começar a vender!
                    </p>
                  </div>
                  <Button onClick={() => setModalOpen(true)}>
                    <PackagePlus className="h-4 w-4" />
                    Adicionar primeiro produto
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vendor.menuItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItemAvailability(item)}
                    onRemove={() => removeItem(item.id)}
                    onEdit={() => setEditingItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

