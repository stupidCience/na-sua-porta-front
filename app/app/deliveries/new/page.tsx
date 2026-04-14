'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
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
      router.push('/');
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
    } catch (err: any) {
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Como você quer pedir hoje?</h1>
        <p className="text-gray-600 mt-1">Escolha entre coleta na portaria ou pedido direto em comércios.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="text-left p-5 rounded-2xl border-2 border-amber-500 bg-amber-50 shadow">
          <p className="text-xl font-black text-gray-900">📦 Solicitar coleta na portaria</p>
          <p className="text-sm text-gray-600 mt-1">O entregador busca seu pedido na portaria</p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/shop')}
          className="text-left p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-amber-200 transition"
        >
          <p className="text-xl font-black text-gray-900">🍽 Pedir em restaurantes e lojas</p>
          <p className="text-sm text-gray-600 mt-1">Veja o guia do condomínio e faça pedido pelo cardápio.</p>
        </button>
      </div>

      <Card>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-2">
            <h2 className="text-lg font-bold text-gray-800">📦 Solicitar coleta na portaria</h2>
            <p className="text-sm text-gray-500">Preencha os dados para um entregador buscar seu pedido</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plataforma do pedido (opcional)
              </label>
              <select
                name="externalPlatform"
                value={form.externalPlatform}
                onChange={(e) => setForm((prev) => ({ ...prev, externalPlatform: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
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

          <div className="flex gap-4 pt-4">
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
