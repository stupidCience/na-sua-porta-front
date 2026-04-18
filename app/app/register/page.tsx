'use client';

import React, { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Building2, CircleCheck, FileText, LayoutGrid, ShieldCheck, UserRound } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { authAPI, condominiumsAPI, getApiErrorMessage } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { getPostAuthLandingRoute } from '@/lib/routes';
import { useAuthStore } from '@/lib/store';
import { formatPersonalDocument } from '@/lib/documentMasks';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const inviteCode = searchParams.get('invite')?.trim() || '';
  const isAdmin = type === 'admin';
  const legacyModuleType =
    type === 'delivery' || type === 'vendor' ? type : null;
  const { setUser, setToken } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    apartment: '',
    block: '',
    personalDocument: '',
    residenceDocument: '',
    communicationsConsent: false,
    condominiumId: '',
    condominiumName: '',
  });

  useEffect(() => {
    if (!inviteCode) {
      return;
    }

    setFormData((prev) => ({ ...prev, condominiumId: inviteCode }));

    let cancelled = false;

    condominiumsAPI
      .resolveAccessCode(inviteCode)
      .then((response) => {
        if (!cancelled) {
          setInviteName(response.data?.name || '');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInviteName('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inviteCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nextValue =
      name === 'personalDocument'
        ? formatPersonalDocument(value)
        : name === 'communicationsConsent'
        ? (e.target as HTMLInputElement).checked
        : value;
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordChecks = [
      formData.password.length >= 8,
      /[A-Za-z]/.test(formData.password),
      /\d/.test(formData.password),
    ];

    if (!passwordChecks.every(Boolean)) {
      setError('Use uma senha com pelo menos 8 caracteres, incluindo letras e números.');
      return;
    }

    setLoading(true);

    try {
      const response = isAdmin
        ? await authAPI.registerAdmin(
            formData.email,
            formData.password,
            formData.name,
            formData.condominiumName,
          )
        : await authAPI.register({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            phone: formData.phone,
            apartment: formData.apartment,
            block: formData.block,
            personalDocument: formData.personalDocument,
            residenceDocument: formData.residenceDocument,
            communicationsConsent: formData.communicationsConsent,
            condominiumCode: formData.condominiumId,
          });

      const { access_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      setToken(access_token);
      setUser(user);
      router.push(getPostAuthLandingRoute(user));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não conseguimos concluir seu cadastro agora. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = [
    { label: 'No mínimo 8 caracteres', valid: formData.password.length >= 8 },
    { label: 'Pelo menos uma letra', valid: /[A-Za-z]/.test(formData.password) },
    { label: 'Pelo menos um número', valid: /\d/.test(formData.password) },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="surface-hero rounded-[32px] px-6 py-8 text-white shadow-[0_30px_64px_rgba(15,23,42,0.22)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <BrandLogo size="md" tone="light" showSubtitle subtitle={BRAND.slogan} />
        <p className="eyebrow mt-8 text-[rgba(255,241,198,0.9)]">{isAdmin ? 'Base de gestão' : 'Praticidade que resolve'}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          {isAdmin
            ? 'Cadastre o condomínio e concentre operação, pedidos e entregas em uma única base.'
            : 'Crie sua conta e abra a porta para pedir, receber e acompanhar com confiança.'}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
          {isAdmin
            ? 'A conta administrativa organiza moradores, comércios, entregadores e indicadores sem quebrar a experiência.'
            : 'Sua conta começa como morador e depois pode ganhar outras modalidades, sem criar outro login.'}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            <ShieldCheck className="h-5 w-5 text-[rgba(255,241,198,0.9)]" />
            <p className="mt-3 text-sm font-semibold text-white">Conta protegida</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              O cadastro já orienta para uma senha forte e uma conta mais segura.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            <LayoutGrid className="h-5 w-5 text-[rgba(255,241,198,0.9)]" />
            <p className="mt-3 text-sm font-semibold text-white">Uma conta que cresce com você</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              O mesmo login acompanha sua rotina e pode receber novos acessos depois.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            <FileText className="h-5 w-5 text-[rgba(255,241,198,0.9)]" />
            <p className="mt-3 text-sm font-semibold text-white">Base comercial mais clara</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              As informações pedidas ajudam a confirmar sua conta e agilizar sua entrada.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            {isAdmin ? <Building2 className="h-5 w-5 text-[rgba(255,241,198,0.9)]" /> : <UserRound className="h-5 w-5 text-[rgba(255,241,198,0.9)]" />}
            <p className="mt-3 text-sm font-semibold text-white">Próximos passos claros</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Depois do cadastro, você escolhe como quer entrar e mostramos o que ainda falta, se houver algo pendente.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-white/12 bg-white/8 p-5">
          <p className="text-sm font-semibold text-white">Como funciona</p>
          <div className="mt-4 space-y-4 text-sm text-slate-200">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 font-semibold text-white">1</span>
              <span>Crie sua conta com seus dados básicos.</span>
            </div>
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 font-semibold text-white">2</span>
              <span>Complete o cadastro necessário para liberar seu uso com mais rapidez.</span>
            </div>
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 font-semibold text-white">3</span>
              <span>Antes de abrir a plataforma, escolha o acesso com que quer entrar.</span>
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-[32px] p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow text-[var(--color-primary-dark)]">Cadastro</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-secondary)]">
              {isAdmin ? 'Estruture o condomínio' : 'Abra sua conta'}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-[22px] bg-[var(--color-background-soft)] p-1.5">
            <Link
              href={inviteCode ? `/register?invite=${encodeURIComponent(inviteCode)}` : '/register'}
              className={`min-h-[44px] rounded-[18px] px-4 py-2.5 text-center text-sm font-semibold transition-all ${
                !isAdmin
                  ? 'bg-[var(--color-secondary)] text-white shadow-[0_14px_28px_rgba(24,49,71,0.18)]'
                  : 'text-[var(--color-secondary)] hover:bg-white'
              }`}
            >
              Morador
            </Link>
            <Link
              href={`/register?type=admin${inviteCode ? `&invite=${encodeURIComponent(inviteCode)}` : ''}`}
              className={`min-h-[44px] rounded-[18px] px-4 py-2.5 text-center text-sm font-semibold transition-all ${
                isAdmin
                  ? 'bg-[var(--color-secondary)] text-white shadow-[0_14px_28px_rgba(24,49,71,0.18)]'
                  : 'text-[var(--color-secondary)] hover:bg-white'
              }`}
            >
              Condomínio
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {legacyModuleType && (
          <div className="mt-6 rounded-2xl border border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] px-4 py-3 text-sm font-medium text-[var(--color-secondary)]">
            O cadastro direto de {legacyModuleType === 'delivery' ? 'entregador' : 'comerciante'} agora acontece dentro da conta principal do morador.
          </div>
        )}

        {!isAdmin && (
          <div className="mt-6 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 text-sm leading-6 text-[var(--color-foreground-soft)]">
            Sua conta começa como <strong className="text-[var(--color-secondary)]">morador</strong>. Depois, no menu da conta, você pode pedir outra modalidade sem criar outro login.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Nome completo"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="João Silva"
            autoComplete="name"
            required
          />

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="voce@email.com"
            autoComplete="email"
            required
          />

          <Input
            label="Senha"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Crie uma senha forte"
            autoComplete="new-password"
            hint="Use pelo menos 8 caracteres, com letras e números."
            required
          />

          <div className="grid gap-2 rounded-[22px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 text-sm">
            {passwordChecks.map((item) => (
              <div key={item.label} className={`flex items-center gap-2 ${item.valid ? 'text-emerald-700' : 'text-[var(--color-foreground-soft)]'}`}>
                <CircleCheck className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {!isAdmin && (
            <Input
              label="Telefone / WhatsApp"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
              autoComplete="tel"
              required
            />
          )}

          {!isAdmin && (
            <Input
              label="Código de acesso do condomínio"
              type="text"
              name="condominiumId"
              value={formData.condominiumId}
              onChange={handleChange}
              placeholder="Cole o código ou use um link de convite"
              hint="Opcional, mas recomendado para acelerar o vínculo inicial com o condomínio."
            />
          )}

          {!isAdmin && inviteName && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Convite reconhecido para <strong>{inviteName}</strong>.
            </div>
          )}

          {isAdmin && (
            <Input
              label="Nome do condomínio"
              type="text"
              name="condominiumName"
              value={formData.condominiumName}
              onChange={handleChange}
              placeholder="Condomínio Jardim das Flores"
              required
            />
          )}

          {!isAdmin && (
            <>
              <div className="grid grid-cols-2 gap-3">
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

              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--color-primary-dark)] shadow-[0_12px_24px_rgba(28,25,23,0.06)]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-secondary)]">Dados para análise de vínculo</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-foreground-soft)]">
                      Esses dados ajudam a confirmar seu cadastro e agilizar seu acesso a compras e entregas.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  <Input
                    label="Documento pessoal (CPF/RG)"
                    type="text"
                    name="personalDocument"
                    value={formData.personalDocument}
                    onChange={handleChange}
                    placeholder="Digite seu CPF ou RG"
                  />

                  <Input
                    label="Comprovante de residência (referência)"
                    type="text"
                    name="residenceDocument"
                    value={formData.residenceDocument}
                    onChange={handleChange}
                    placeholder="Ex.: conta de luz, gás ou condomínio"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 text-sm leading-6 text-[var(--color-foreground-soft)]">
                <input
                  type="checkbox"
                  name="communicationsConsent"
                  checked={formData.communicationsConsent}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span>
                  Autorizo comunicações sobre pedidos, entregas, atualização do cadastro e avisos importantes do condomínio.
                </span>
              </label>
            </>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading}>
            {isAdmin ? 'Criar conta do condomínio' : 'Criar conta principal'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-[var(--color-line)] bg-white px-4 py-4 text-sm leading-6 text-[var(--color-foreground-soft)]">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-background-soft)] text-[var(--color-primary-dark)]">
            {isAdmin ? <Building2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <span>
            Ao concluir o cadastro, você primeiro escolhe o acesso de agora antes de abrir a plataforma.
          </span>
        </div>

        <div className="mt-6 text-center text-sm text-[var(--color-foreground-soft)]">
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold text-[var(--color-primary-dark)] hover:text-[var(--color-primary)]">
            Entrar agora
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[55vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center text-[var(--color-foreground-soft)]">Preparando seu cadastro...</div>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
