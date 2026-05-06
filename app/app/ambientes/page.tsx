'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Settings2 } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { ModuleCard } from '@/components/ambientes/module-card';
import { OnboardingNotice } from '@/components/ambientes/onboarding-notice';
import { useToastStore } from '@/components/Toast';
import {
  ACCOUNT_MODULE_META,
  getEnabledAccountModules,
  getModuleLabel,
  getProfileCompletionRoute,
} from '@/lib/accountModules';
import { getApiErrorMessage, usersAPI } from '@/lib/api';
import { getDefaultRouteForUser } from '@/lib/routes';
import { useAuthStore, type UserRole } from '@/lib/store';

export default function AmbientesPage() {
  const router = useRouter();
  const { user, hasHydrated, setUser } = useAuthStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enteringModule, setEnteringModule] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.replace('/login'); return; }

    let cancelled = false;

    usersAPI
      .getMe()
      .then((response) => {
        if (cancelled) return;
        setUser(response.data);
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Não foi possível carregar sua conta agora.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hasHydrated, router, setUser, user?.id]);

  const enabledModules = useMemo(() => getEnabledAccountModules(user?.modules), [user?.modules]);
  const pendingModules = useMemo(
    () => (user?.modules ?? []).filter((m) => !m.enabled),
    [user?.modules],
  );
  const completionRoute = useMemo(() => getProfileCompletionRoute(user), [user]);

  // Smart redirect: single module → skip selection screen
  useEffect(() => {
    if (loading || !user || enabledModules.length !== 1) return;
    const sole = enabledModules[0];
    if (user.role === sole.module) {
      router.replace(getDefaultRouteForUser(user.role, user.isVendor));
    }
  }, [loading, user, enabledModules, router]);

  const handleEnterModule = async (module: UserRole) => {
    if (!user) return;
    setEnteringModule(module);
    try {
      let nextUser = user;
      if (user.role !== module) {
        const response = await usersAPI.switchActiveModule(module);
        nextUser = response.data;
        setUser(nextUser);
      }
      addToast(`Você entrou como ${getModuleLabel(module).toLowerCase()}.`, 'success');
      router.push(getDefaultRouteForUser(nextUser.role, nextUser.isVendor));
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível trocar de perfil agora.'), 'error');
    } finally {
      setEnteringModule(null);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-[var(--color-foreground-soft)]">
            Preparando sua conta…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ─── Page shell ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <BrandLogo size="sm" />
        <Link href="/profile?tab=perfil">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Configurações da conta"
            className="gap-1.5"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            Minha conta
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-8 w-full max-w-lg rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {/* No enabled modules → onboarding */}
        {enabledModules.length === 0 ? (
          <OnboardingNotice
            pendingModules={pendingModules}
            completionRoute={completionRoute}
          />
        ) : (
          <div className="w-full max-w-5xl">
            {/* Heading */}
            <div className="text-center mb-10">
              <p className="eyebrow text-[var(--color-primary-dark)]">
                {user.condominiumName ?? 'Sua conta'}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-secondary)] md:text-4xl">
                Como você deseja acessar hoje?
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--color-foreground-soft)] max-w-lg mx-auto">
                Cada perfil organiza alertas, prioridades e operações de forma independente. Escolha o acesso do momento.
              </p>
            </div>

            {/* Module grid */}
            <div
              className={`grid gap-5 ${
                enabledModules.length === 2
                  ? 'sm:grid-cols-2 max-w-2xl mx-auto'
                  : enabledModules.length === 3
                  ? 'sm:grid-cols-3'
                  : 'sm:grid-cols-2 lg:grid-cols-4'
              }`}
            >
              {enabledModules.map((module) => {
                const meta = ACCOUNT_MODULE_META[module.module];
                return (
                  <ModuleCard
                    key={module.module}
                    module={module}
                    label={meta.label}
                    description={meta.description}
                    ctaLabel={meta.ctaLabel}
                    Icon={meta.icon}
                    isEntering={enteringModule === module.module}
                    completionRoute={completionRoute}
                    onEnter={handleEnterModule}
                  />
                );
              })}
            </div>

            {/* Pending modules notice */}
            {pendingModules.length > 0 && (
              <div className="mt-10 rounded-2xl border border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.1)] px-5 py-4 text-center">
                <p className="text-sm font-semibold text-[var(--color-secondary)]">
                  {pendingModules.length} perfil{pendingModules.length > 1 ? 'is' : ''} ainda em análise
                </p>
                <p className="mt-1 text-xs text-[var(--color-foreground-soft)]">
                  Complete seu cadastro para liberar o acesso restante.
                </p>
                <div className="mt-3">
                  <Link href={completionRoute}>
                    <Button variant="secondary" size="sm">
                      Completar cadastro
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}