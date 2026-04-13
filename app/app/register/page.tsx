'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDelivery = searchParams.get('type') === 'delivery';
  const { setUser, setToken } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    apartment: '',
    block: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      const response = isDelivery
        ? await authAPI.registerDelivery(formData.email, formData.password, formData.name)
        : await authAPI.register(
            formData.email,
            formData.password,
            formData.name,
            formData.apartment,
            formData.block,
          );

      const { access_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      setToken(access_token);
      setUser(user);

      router.push(user.role === 'RESIDENT' ? '/deliveries' : '/deliveries/available');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao registrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-amber-600 mb-2">🍕 Na Sua Porta</h1>
            <p className="text-gray-600">
              {isDelivery ? 'Cadastro de Entregador' : 'Cadastro de Morador'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4 flex gap-2">
            <Link href="/register" className={`flex-1 py-2 px-3 text-center rounded-lg font-medium transition-all ${
              !isDelivery
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
              Morador
            </Link>
            <Link href="/register?type=delivery" className={`flex-1 py-2 px-3 text-center rounded-lg font-medium transition-all ${
              isDelivery
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
              Entregador
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome Completo"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="João Silva"
              required
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              required
            />

            <Input
              label="Senha"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />

            {!isDelivery && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Apartamento"
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleChange}
                    placeholder="101"
                    required={!isDelivery}
                  />

                  <Input
                    label="Bloco"
                    type="text"
                    name="block"
                    value={formData.block}
                    onChange={handleChange}
                    placeholder="A"
                    required={!isDelivery}
                  />
                </div>
              </>
            )}

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Cadastrar
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Já tem conta?{' '}
            <Link href="/login" className="text-amber-600 hover:text-amber-700 font-semibold">
              Faça login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
