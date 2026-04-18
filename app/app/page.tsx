'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, ChartNoAxesCombined, ShieldCheck, Store, Truck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BRAND, BRAND_PILLARS, BRAND_ROLE_STRIPS } from '@/lib/brand';
import { getPostAuthLandingRoute } from '@/lib/routes';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && user) {
      router.push(getPostAuthLandingRoute(user));
    }
  }, [user, router, isAuthenticated]);

  return (
    <div className="space-y-14 py-6 lg:py-10">
      <section className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-hero relative overflow-hidden rounded-[32px] px-6 py-8 text-white shadow-[0_30px_64px_rgba(12,49,24,0.22)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="absolute -right-16 top-0 h-44 w-44 rounded-full bg-[var(--color-accent)]/14 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-lime-300/12 blur-3xl" />

          <div className="relative">
            <BrandLogo size="lg" tone="light" showSubtitle subtitle={BRAND.slogan} />
            <p className="eyebrow mt-8 text-[rgba(255,241,198,0.9)]">Sistema comercial do condomínio</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              Praticidade para quem pede. Agilidade para quem entrega. Controle para quem gere.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
              {BRAND.metadataDescription}
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-slate-100">
              {BRAND_ROLE_STRIPS.map((item) => (
                <span key={item} className="status-pill">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">
                  Criar conta
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary" className="border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/15">
                  Entrar
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {BRAND_PILLARS.map((pillar) => (
                <div key={pillar.title} className="rounded-[24px] border border-white/12 bg-white/8 p-4">
                  <p className="text-sm font-semibold text-[rgba(255,241,198,0.9)]">{pillar.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-100/88">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="grid gap-5">
            <Card className="rounded-[28px] border-white/60 p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-[var(--color-primary-dark)]">Morador</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--color-secondary)]">A porta de entrada para pedir e acompanhar</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
                    Abra sua conta principal, compre nas lojas do condomínio e acompanhe cada etapa com mais confiança.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/20 text-[var(--color-primary-dark)] ring-1 ring-[var(--color-accent)]/35">
                  <Store className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href="/register" className="block">
                  <Button fullWidth size="lg">Cadastrar morador</Button>
                </Link>
                <Link href="/login" className="block">
                  <Button fullWidth variant="secondary" size="lg">Já tenho acesso</Button>
                </Link>
              </div>
            </Card>

            <Card className="rounded-[28px] border-white/60 p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-[var(--color-primary)]">Condomínio</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--color-secondary)]">Gestão comercial e operacional em uma só base</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
                    Centralize moradores, comércios, entregadores e indicadores em uma experiência única para o condomínio.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-[var(--color-primary)] ring-1 ring-green-100">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href="/register?type=admin" className="block">
                  <Button fullWidth size="lg">Cadastrar condomínio</Button>
                </Link>
                <Link href="/login" className="block">
                  <Button fullWidth variant="secondary" size="lg">Entrar como gestor</Button>
                </Link>
              </div>
            </Card>

            <Card className="rounded-[28px] p-7">
              <p className="eyebrow text-[var(--color-primary-dark)]">Arquitetura da experiência</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--color-secondary)]">Uma marca, quatro frentes de uso</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
                A mesma identidade organiza a jornada de morador, comércio, entregador e condomínio sem quebrar a experiência.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 text-sm font-semibold text-[var(--color-secondary)]">
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" /> Conta única</div>
                </div>
                <div className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 text-sm font-semibold text-[var(--color-secondary)]">
                  <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-[var(--color-primary)]" /> Operação visível</div>
                </div>
                <div className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 text-sm font-semibold text-[var(--color-secondary)]">
                  <div className="flex items-center gap-2"><Store className="h-4 w-4 text-[var(--color-primary)]" /> Fluxo comercial</div>
                </div>
                <div className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 text-sm font-semibold text-[var(--color-secondary)]">
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[var(--color-primary)]" /> Gestão integrada</div>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center rounded-[28px] p-10 text-center">
            <div>
              <p className="eyebrow text-[var(--color-primary-dark)]">Sessão ativa</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--color-secondary)]">Abrindo sua conta</h2>
              <p className="mt-3 text-sm text-[var(--color-foreground-soft)]">Vamos levar você para a área mais útil neste momento.</p>
            </div>
          </Card>
        )}
      </section>

      <section className="grid-fade grid gap-5 lg:grid-cols-3">
        <Card className="rounded-[26px] p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/20 text-[var(--color-primary-dark)] ring-1 ring-[var(--color-accent)]/35">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-[var(--color-secondary)]">Conta única, acessos organizados</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
            O mesmo login acompanha morador, comércio, entregador e condomínio sem fragmentar a rotina.
          </p>
        </Card>

        <Card className="rounded-[26px] p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-[var(--color-primary)] ring-1 ring-green-100">
            <ChartNoAxesCombined className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-[var(--color-secondary)]">Fluxo comercial visível</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
            Pedidos, despacho e entrega evoluem com mais clareza para quem compra, vende e opera.
          </p>
        </Card>

        <Card className="rounded-[26px] p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[var(--color-secondary)] ring-1 ring-slate-200">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-[var(--color-secondary)]">Marca única para o condomínio</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
            Linguagem, cores e experiência falam com todas as pontas sem perder consistência comercial.
          </p>
        </Card>
      </section>
    </div>
  );
}
