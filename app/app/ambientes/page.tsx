'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, Building2, Clock3, ShieldAlert, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
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

const MODULE_TONE: Record<
  UserRole,
  {
    cardClass: string;
    iconClass: string;
    badgeClass: string;
  }
> = {
  RESIDENT: {
    cardClass: 'border-[rgba(26,166,75,0.18)]',
    iconClass: 'bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)] ring-1 ring-[rgba(26,166,75,0.18)]',
    badgeClass: 'bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)] ring-1 ring-[rgba(26,166,75,0.18)]',
  },
  DELIVERY_PERSON: {
    cardClass: 'border-[rgba(243,183,27,0.35)]',
    iconClass: 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)] ring-1 ring-[rgba(243,183,27,0.35)]',
    badgeClass: 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)] ring-1 ring-[rgba(243,183,27,0.35)]',
  },
  VENDOR: {
    cardClass: 'border-[rgba(31,41,51,0.12)]',
    iconClass: 'bg-[rgba(31,41,51,0.06)] text-[var(--color-secondary)] ring-1 ring-[rgba(31,41,51,0.12)]',
    badgeClass: 'bg-[rgba(31,41,51,0.06)] text-[var(--color-secondary)] ring-1 ring-[rgba(31,41,51,0.12)]',
  },
  CONDOMINIUM_ADMIN: {
    cardClass: 'border-[var(--color-line-strong)]',
    iconClass: 'bg-[var(--color-background-soft)] text-[var(--color-secondary)] ring-1 ring-[var(--color-line)]',
    badgeClass: 'bg-[var(--color-background-soft)] text-[var(--color-secondary)] ring-1 ring-[var(--color-line)]',
  },
};

export default function AmbientesPage() {
  const router = useRouter();
  const { user, hasHydrated, setUser } = useAuthStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enteringModule, setEnteringModule] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    usersAPI
      .getMe()
      .then((response) => {
        if (cancelled) {
          return;
        }

        setUser(response.data);
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        setError(getApiErrorMessage(err, 'Nao foi possivel carregar sua conta agora.'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, router, setUser, user?.id]);

  const enabledModules = useMemo(() => getEnabledAccountModules(user?.modules), [user?.modules]);
  const pendingModules = useMemo(
    () => (user?.modules ?? []).filter((module) => !module.enabled),
    [user?.modules],
  );
  const completionRoute = useMemo(() => getProfileCompletionRoute(user), [user]);
  const accountAccessRoute = user?.role === 'CONDOMINIUM_ADMIN' ? '/profile?tab=acesso' : '/profile?tab=perfil';
  const readinessMeta = useMemo(() => {
    if (enabledModules.length === 0) {
      return {
        title: 'Falta só mais um passo',
        description: 'Complete seu cadastro para começar a pedir, receber ou vender dentro do condomínio.',
        badgeClass: 'border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]',
        Icon: Clock3,
      };
    }

    if (pendingModules.length > 0) {
      return {
        title: 'Você já pode continuar',
        description: 'Alguns perfis já estão prontos e outros ainda dependem de revisão ou dados complementares.',
        badgeClass: 'border-[rgba(31,41,51,0.12)] bg-[rgba(31,41,51,0.06)] text-[var(--color-secondary)]',
        Icon: ShieldAlert,
      };
    }

    return {
      title: 'Tudo pronto para usar',
      description: 'Seus perfis disponíveis já podem ser usados sempre que você quiser.',
      badgeClass: 'border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)]',
      Icon: BadgeCheck,
    };
  }, [enabledModules.length, pendingModules.length]);

  const handleEnterModule = async (module: UserRole) => {
    if (!user) {
      return;
    }

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
      addToast(getApiErrorMessage(err, 'Nao foi possivel trocar de perfil agora.'), 'error');
    } finally {
      setEnteringModule(null);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-[var(--color-foreground-soft)]">Preparando sua conta...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="surface-hero relative overflow-hidden rounded-[32px] px-6 py-8 text-white shadow-[0_30px_64px_rgba(15,23,42,0.22)] sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--color-accent)]/18 blur-3xl" />
          <div className="absolute -bottom-20 left-0 h-52 w-52 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />

          <div className="relative">
            <BrandLogo size="md" tone="light" showSubtitle subtitle="Escolha o acesso do momento." />
            <p className="eyebrow mt-8 text-[rgba(255,241,198,0.9)]">Antes de entrar</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Defina como você vai atuar agora.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Cada acesso organiza alertas, prioridades e operação de um jeito diferente. Escolha o perfil do momento e entre com a configuração certa.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-slate-100">
              <span className="status-pill">{enabledModules.length} perfil{enabledModules.length === 1 ? '' : 's'} disponível{enabledModules.length === 1 ? '' : 'is'}</span>
              {pendingModules.length > 0 && (
                <span className="status-pill">{pendingModules.length} pendência{pendingModules.length === 1 ? '' : 's'} em análise</span>
              )}
              <span className="status-pill">{user.condominiumName || 'Sem condomínio vinculado'}</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={accountAccessRoute}>
                <Button variant="secondary" className="border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/15">
                  Minha conta
                </Button>
              </Link>
              <Link href={completionRoute}>
                <Button>
                  {enabledModules.length === 0 ? 'Continuar cadastro' : 'Atualizar meus dados'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <Card className="rounded-[32px] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-[var(--color-primary-dark)]">Entrada da conta</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--color-secondary)]">{readinessMeta.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
                {readinessMeta.description}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-background-soft)] text-[var(--color-primary-dark)] shadow-[0_12px_24px_rgba(28,25,23,0.06)]">
              <readinessMeta.Icon className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-foreground-soft)]">Último acesso ativo</p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-secondary)]">{getModuleLabel(user.role)}</p>
            </div>

            <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-foreground-soft)]">Base do condomínio</p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-secondary)]">{user.condominiumName || 'Pendente de vínculo'}</p>
            </div>

            <div className={`rounded-[24px] border px-4 py-4 ${readinessMeta.badgeClass}`}>
              <div className="flex items-center gap-2">
                {pendingModules.length === 0 ? <ShieldCheck className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                <p className="text-sm font-semibold">
                  {pendingModules.length === 0 ? 'Sem pendências no momento' : 'Há perfis aguardando revisão'}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--color-line)] bg-white px-4 py-4 text-sm leading-6 text-[var(--color-foreground-soft)]">
              Dentro da plataforma, o menu da conta sempre mantém troca de perfil, configurações e Minha conta.
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-dark)]">Disponíveis agora</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--color-secondary)]">Escolha um perfil para entrar</h2>
          </div>
          <p className="max-w-md text-right text-sm text-[var(--color-foreground-soft)]">
            Abra a plataforma com o acesso certo agora. Os outros continuam disponíveis na sua conta.
          </p>
        </div>

        {enabledModules.length === 0 ? (
          <Card className="rounded-[28px] border-2 border-dashed border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-secondary)]">Nenhum perfil liberado ainda</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-foreground-soft)]">
                  Sua conta já foi criada. Agora só falta concluir o cadastro para começar a pedir e acompanhar suas entregas.
                </p>
              </div>
              <Link href={completionRoute}>
                <Button>Continuar cadastro</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {enabledModules.map((module) => {
              const meta = ACCOUNT_MODULE_META[module.module];
              const tone = MODULE_TONE[module.module];
              const Icon = meta.icon;

              return (
                <Card key={module.module} className={`rounded-[28px] border-2 ${tone.cardClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone.iconClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.badgeClass}`}>
                      {module.active ? 'Em uso' : 'Disponível'}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-[var(--color-secondary)]">{meta.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-foreground-soft)]">{meta.description}</p>

                  {module.missingRequirements.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {module.missingRequirements.map((item) => (
                        <span
                          key={`${module.module}-${item}`}
                          className="rounded-full bg-[var(--color-background-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-foreground-soft)] ring-1 ring-[var(--color-line)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleEnterModule(module.module)}
                      loading={enteringModule === module.module}
                    >
                      {module.active ? 'Continuar com este perfil' : meta.ctaLabel}
                    </Button>
                    <Link href={completionRoute}>
                      <Button variant="secondary">Revisar conta</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {pendingModules.length > 0 && (
        <section>
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-foreground-soft)]">Em análise</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--color-secondary)]">Perfis ainda em análise</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-foreground-soft)]">
              Esses perfis ainda dependem de dados, documentos ou aprovação. Revise seu cadastro para liberar o acesso.
            </p>
          </div>

          <div className="space-y-4">
            {pendingModules.map((module) => {
              const meta = ACCOUNT_MODULE_META[module.module];
              const tone = MODULE_TONE[module.module];
              const Icon = meta.icon;

              return (
                <Card key={module.module} className={`rounded-[28px] border border-dashed ${tone.cardClass}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.iconClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--color-secondary)]">{meta.label}</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-foreground-soft)]">{meta.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {module.missingRequirements.map((item) => (
                            <span
                              key={`${module.module}-pending-${item}`}
                              className="rounded-full bg-[rgba(255,213,58,0.2)] px-3 py-1 text-xs font-semibold text-[var(--color-secondary)] ring-1 ring-[rgba(243,183,27,0.35)]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Link href={completionRoute}>
                      <Button variant="secondary">Concluir no perfil</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}