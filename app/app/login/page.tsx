'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { authAPI, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, setToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const getTargetByRole = (role: string, isVendor?: boolean) => {
    if (role === 'VENDOR' || isVendor) return '/vendor/orders';
    if (role === 'RESIDENT') return '/deliveries';
    if (role === 'CONDOMINIUM_ADMIN') return '/admin';
    return '/deliveries/available';
  };

  const forceNavigateByRole = (role: string, isVendor?: boolean) => {
    const target = getTargetByRole(role, isVendor);
    router.replace(target);

    // Fallback: in some client states, App Router transition may not complete from /login.
    setTimeout(() => {
      if (window.location.pathname === '/login') {
        window.location.replace(target);
      }
    }, 120);
  };

  useEffect(() => {
    if (!user) return;

    forceNavigateByRole(user.role, user.isVendor);
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const response = await authAPI.login(formData.email, formData.password);
      const { access_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      setToken(access_token);
      setUser(user);

      forceNavigateByRole(user.role, user.isVendor);
      router.refresh();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Não conseguimos entrar na sua conta agora. Tente novamente.'));
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
            <p className="text-gray-600">Faça login na sua conta</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Não tem conta?{' '}
            <Link href="/register" className="text-amber-600 hover:text-amber-700 font-semibold">
              Cadastre-se
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3">Acesso de teste:</p>
            <div className="space-y-2 text-xs">
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-semibold">Morador:</p>
                <p>Email: morador@test.com</p>
                <p>Senha: resident123</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-semibold">Entregador:</p>
                <p>Email: entregador@test.com</p>
                <p>Senha: delivery123</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
