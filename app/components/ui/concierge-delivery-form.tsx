'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { MapPin, Package, Pencil } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { NoticeBanner } from '@/components/NoticeBanner';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';

const PLATFORM_CHIPS = [
  'iFood',
  'Amazon',
  'Mercado Livre',
  'Shopee',
  'Correios',
  'Outros',
] as const;

type FormState = {
  apartment: string;
  block: string;
  description: string;
  notes: string;
  externalPlatform: string;
  externalCode: string;
};

export function ConciergeDeliveryForm() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const hasAddress = Boolean(user?.apartment && user?.block);
  const [editingAddress, setEditingAddress] = useState(!hasAddress);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>({
    apartment: user?.apartment ?? '',
    block: user?.block ?? '',
    description: '',
    notes: '',
    externalPlatform: '',
    externalCode: '',
  });

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const togglePlatform = (chip: string) =>
    setField('externalPlatform', form.externalPlatform === chip ? '' : chip);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.apartment.trim() || !form.block.trim()) {
      setError('Informe o apartamento e o bloco para continuar.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await deliveriesAPI.create(
        form.apartment.trim(),
        form.block.trim(),
        form.description.trim() || undefined,
        form.notes.trim() || undefined,
        form.externalPlatform || undefined,
        form.externalCode.trim() || undefined,
      );
      addToast('Entrega solicitada! Estamos buscando um entregador para você.', 'success');
      router.push('/morador');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos criar seu pedido agora. Tente novamente em instantes.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-secondary)]">
          Trazer da Portaria
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--color-foreground-soft)]">
          Autorize e peça para um entregador interno levar sua encomenda da portaria até o seu apartamento.
        </p>
      </div>

      {error && <NoticeBanner tone="error">{error}</NoticeBanner>}

      {/* ── Address — smart default ──────────────────────────────────────────── */}
      <div>
        <p id="address-label" className="field-label">
          Entregar em
        </p>

        {!editingAddress && form.apartment && form.block ? (
          <div
            role="group"
            aria-labelledby="address-label"
            className="flex items-center justify-between rounded-2xl border border-[rgba(26,166,75,0.2)] bg-[rgba(26,166,75,0.06)] px-4 py-3"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-secondary)]">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--color-primary-dark)]" />
              Bloco {form.block} — Apto {form.apartment}
            </span>
            <button
              type="button"
              onClick={() => setEditingAddress(true)}
              aria-label="Editar apartamento e bloco"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-[var(--color-foreground-soft)] transition-colors hover:bg-white hover:text-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="apartment"
              name="apartment"
              label="Apartamento"
              value={form.apartment}
              onChange={(e) => setField('apartment', e.target.value)}
              placeholder="Ex: 101"
              required
              autoComplete="off"
            />
            <Input
              id="block"
              name="block"
              label="Bloco"
              value={form.block}
              onChange={(e) => setField('block', e.target.value)}
              placeholder="Ex: A"
              required
              autoComplete="off"
            />
          </div>
        )}
      </div>

      {/* ── Platform chips ───────────────────────────────────────────────────── */}
      <fieldset>
        <legend className="field-label">
          Plataforma do pedido{' '}
          <span className="font-normal text-[var(--color-foreground-soft)]">(opcional)</span>
        </legend>
        <div className="flex flex-wrap gap-2 pt-1">
          {PLATFORM_CHIPS.map((chip) => {
            const selected = form.externalPlatform === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => togglePlatform(chip)}
                aria-pressed={selected}
                className={clsx(
                  'min-h-[44px] rounded-2xl border px-4 py-2 text-sm font-medium transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                  selected
                    ? 'border-[rgba(26,166,75,0.3)] bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)] shadow-[0_0_0_3px_rgba(26,166,75,0.08)]'
                    : 'border-[var(--color-line)] bg-white/80 text-[var(--color-secondary)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-background-soft)]',
                )}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ── Description ─────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="description" className="field-label">
          O que vai receber?{' '}
          <span className="font-normal text-[var(--color-foreground-soft)]">(opcional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Ex: Caixa dos Correios, sacola do iFood, caixa de TV..."
          className="field-textarea min-h-[80px] w-full resize-none px-4 py-3 transition-all focus:outline-none"
          rows={3}
        />
      </div>

      {/* ── Notes ───────────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="notes" className="field-label">
          Alguma observação?{' '}
          <span className="font-normal text-[var(--color-foreground-soft)]">(opcional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Ex: Pacote frágil, pode deixar na porta se eu não estiver..."
          className="field-textarea min-h-[68px] w-full resize-none px-4 py-3 transition-all focus:outline-none"
          rows={2}
        />
      </div>

      {/* ── Tracking code — revealed only when platform is selected ─────────── */}
      {form.externalPlatform && (
        <Input
          id="externalCode"
          name="externalCode"
          label="Código"
          value={form.externalCode}
          onChange={(e) => setField('externalCode', e.target.value)}
          placeholder="Ex: BR123456789BR ou 0000"
          hint="Informe o código de recebimento ou rastreio  para ajudar a identificar seu pedido."
          autoComplete="off"
        />
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          size="lg"
          disabled={loading}
          onClick={() => router.back()}
        >
          Voltar
        </Button>
        <Button type="submit" fullWidth size="lg" loading={loading}>
          <Package className="h-4 w-4" />
          Solicitar Coleta
        </Button>
      </div>
    </form>
  );
}
