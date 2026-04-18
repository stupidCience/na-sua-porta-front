'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PageHeader } from '@/components/PageHeader';
import { deliveriesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';

const PLATFORMS = ['iFood', 'Amazon', 'Shopee', 'Mercado Livre', 'Magazine Luiza', 'AliExpress', 'Shein', 'Rappi', 'Correios', 'Outro'];

export default function NewDeliveryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    apartment: user?.apartment || '',
    block: user?.block || '',
    description: '',
    notes: '',
    externalPlatform: '',
    externalCode: '',
  });

  useEffect(() => {
    if (!user || user.role !== 'RESIDENT') {
      router.push('/ambientes');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await deliveriesAPI.create(
        form.apartment,
        form.block,
        form.description || undefined,
        form.notes || undefined,
        form.externalPlatform || undefined,
        form.externalCode || undefined,
      );
      addToast('📦 Coleta solicitada! Estamos buscando um entregador para você.', 'success');
      router.push('/deliveries');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Não conseguimos criar seu pedido agora. Tente novamente em instantes.');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'RESIDENT') {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <PageHeader
        eyebrow="Nova solicitação"
        title="Como você quer pedir hoje?"
        description="Escolha entre coleta na portaria ou pedido direto em restaurantes e lojas do condomínio, com a rota mais adequada para o momento."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border-2 border-[var(--color-primary)] bg-[rgba(26,166,75,0.08)] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-[var(--color-primary-dark)] shadow-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-secondary)]">Solicitar coleta na portaria</p>
              <p className="mt-1 text-sm text-[var(--color-foreground-soft)]">O entregador busca seu pedido na portaria e segue até o seu apartamento.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/shop')}
          className="min-h-[44px] rounded-[28px] border-2 border-[var(--color-line)] bg-white p-5 text-left transition hover:border-[var(--color-accent-strong)]"
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

      <Card className="rounded-[30px] p-6 sm:p-8">
        {error && (
          <NoticeBanner tone="error" className="mb-6">{error}</NoticeBanner>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-[var(--color-secondary)]">Solicitar coleta na portaria</h2>
            <p className="text-sm text-[var(--color-foreground-soft)]">Preencha os dados para um entregador buscar seu pedido.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Apartamento"
              type="text"
              name="apartment"
              value={form.apartment}
              onChange={handleChange}
              placeholder="101"
              required
            />
            <Input
              label="Bloco"
              type="text"
              name="block"
              value={form.block}
              onChange={handleChange}
              placeholder="A"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              O que vai receber? (opcional)
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ex: Caixa grande dos Correios, sacola do iFood..."
              className="field-textarea"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alguma observação? (opcional)
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Ex: Pacote frágil, deixar na porta..."
              className="field-textarea"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plataforma do pedido (opcional)
              </label>
              <select
                name="externalPlatform"
                value={form.externalPlatform}
                onChange={(e) => setForm((prev) => ({ ...prev, externalPlatform: e.target.value }))}
                className="field-select"
              >
                <option value="">Selecionar...</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <Input
              label="Código de recebimento (opcional)"
              type="text"
              name="externalCode"
              value={form.externalCode}
              onChange={handleChange}
              placeholder="Ex: 123456"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="lg"
              onClick={() => router.back()}
            >
              Voltar
            </Button>
            <Button type="submit" fullWidth size="lg" loading={loading}>
              📦 Solicitar Coleta
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
