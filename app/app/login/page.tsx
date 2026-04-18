'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Building2, LayoutGrid, ShieldCheck, TimerReset } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { authAPI, getApiErrorMessage } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { getPostAuthLandingRoute } from '@/lib/routes';
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

  const forceNavigateToModuleSelection = (nextUser = user) => {
    const target = getPostAuthLandingRoute(nextUser);
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

    forceNavigateToModuleSelection();
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

      forceNavigateToModuleSelection(user);
      router.refresh();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos entrar na sua conta agora. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[1.04fr_0.96fr]">
      <section className="surface-hero rounded-[32px] px-6 py-8 text-white shadow-[0_30px_64px_rgba(15,23,42,0.22)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <BrandLogo size="md" tone="light" showSubtitle subtitle={BRAND.slogan} />
        <p className="eyebrow mt-8 text-[rgba(255,241,198,0.9)]">Confiança que chega</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Entre e continue a rotina com o acesso certo para este momento.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
          O mesmo login centraliza pedidos, vendas, entregas e gestão. Você entra, escolhe o acesso do momento e continua de onde parou.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            <ShieldCheck className="h-5 w-5 text-[rgba(255,241,198,0.9)]" />
            <p className="mt-3 text-sm font-semibold text-white">Acesso protegido</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Seus dados, pedidos, entregas e histórico continuam seguros a cada entrada.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            <LayoutGrid className="h-5 w-5 text-[rgba(255,241,198,0.9)]" />
            <p className="mt-3 text-sm font-semibold text-white">Acesso certo no momento</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Se houver mais de um perfil liberado, você define qual frente vai usar agora.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            <Building2 className="h-5 w-5 text-[rgba(255,241,198,0.9)]" />
            <p className="mt-3 text-sm font-semibold text-white">Base conectada ao condomínio</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Sua conta se organiza pela estrutura do condomínio e mantém a operação no contexto certo.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            <TimerReset className="h-5 w-5 text-[rgba(255,241,198,0.9)]" />
            <p className="mt-3 text-sm font-semibold text-white">Continuidade imediata</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Você volta direto para o que precisa acompanhar, atender ou concluir.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-white/12 bg-white/8 p-5">
          <p className="text-sm font-semibold text-white">Como funciona</p>
          <ol className="mt-4 space-y-4 text-sm text-slate-200">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 font-semibold text-white">1</span>
              <span>Entre com sua conta para recuperar pedidos, entregas, conversas e preferências.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 font-semibold text-white">2</span>
              <span>Escolha o acesso com que quer atuar na plataforma agora.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 font-semibold text-white">3</span>
              <span>Se faltar algum dado, mostramos o próximo passo antes da entrada.</span>
            </li>
          </ol>
        </div>
      </section>

      <Card className="rounded-[32px] p-6 sm:p-8">
        <div>
          <p className="eyebrow text-[var(--color-primary-dark)]">Entrar</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-secondary)]">
            Acesse sua conta
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
            Use seu email para retomar a experiência do condomínio com o acesso certo para este momento.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="voce@empresa.com ou voce@email.com"
            autoComplete="email"
            autoFocus
            required
          />

          <Input
            label="Senha"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Digite sua senha"
            autoComplete="current-password"
            required
          />

          <Button type="submit" fullWidth size="lg" loading={loading}>
            Entrar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 text-sm leading-6 text-[var(--color-foreground-soft)]">
          Depois do login, você escolhe o acesso do momento antes de abrir a plataforma.
        </div>

        <div className="mt-6 text-center text-sm text-[var(--color-foreground-soft)]">
          Ainda não tem conta?{' '}
          <Link href="/register" className="font-semibold text-[var(--color-primary-dark)] hover:text-[var(--color-primary)]">
            Criar minha conta
          </Link>
        </div>
      </Card>
    </div>
  );
}
