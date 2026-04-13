'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { deliveriesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useToastStore } from '@/components/Toast';

export default function NewDeliveryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    apartment: user?.apartment || '',
    block: user?.block || '',
    description: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await deliveriesAPI.create(
        formData.apartment,
        formData.block,
        formData.description,
        formData.notes,
      );
      addToast('Pedido criado! Buscando um entregador para você...', 'success');
      router.push('/deliveries');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao criar pedido. Tente novamente.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Pedir Entrega</h1>
        <p className="text-gray-500 mt-1">Seu pacote será entregue da portaria até seu apartamento</p>
      </div>

      <Card>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Apartamento"
              type="text"
              name="apartment"
              value={formData.apartment}
              onChange={handleChange}
              placeholder="101"
              required
            />

            <Input
              label="Bloco"
              type="text"
              name="block"
              value={formData.block}
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
              value={formData.description}
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
              value={formData.notes}
              onChange={handleChange}
              placeholder="Ex: Pacote frágil, deixar na porta..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              rows={2}
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
              Pedir entrega 🚀
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
