'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { authAPI, getApiErrorMessage } from '@/lib/api';
import { getPostAuthLandingRoute, getSmartDefaultRole } from '@/lib/routes';
import { useAuthStore } from '@/lib/store';

type FieldErrors = { email?: string; password?: string };

function validateField(name: string, value: string): string {
  if (name === 'email') {
    if (!value) return 'Informe seu e-mail para continuar.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return 'E-mail inválido. Verifique o endereço digitado.';
  }
  if (name === 'password') {
    if (!value) return 'A senha não pode estar em branco.';
    if (value.length < 6) return 'A senha deve ter ao menos 6 caracteres.';
  }
  return '';
}

export function LoginForm() {
  const router = useRouter();
  const { user, setUser, setToken, setActiveRole } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fields, setFields] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!user) return;
    const target = getPostAuthLandingRoute(user);
    router.replace(target);
    setTimeout(() => {
      if (window.location.pathname === '/login') window.location.replace(target);
    }, 120);
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    if (err) setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    const emailErr = validateField('email', fields.email);
    const passwordErr = validateField('password', fields.password);
    if (emailErr || passwordErr) {
      setFieldErrors({ email: emailErr, password: passwordErr });
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(fields.email, fields.password);
      const { access_token, user: loggedUser } = response.data;
      localStorage.setItem('access_token', access_token);
      setToken(access_token);
      const smartRole = getSmartDefaultRole(loggedUser);
      if (smartRole) setActiveRole(smartRole);
      setUser(loggedUser);
      router.replace(getPostAuthLandingRoute(loggedUser));
      router.refresh();
    } catch (err: unknown) {
      setGlobalError(
        getApiErrorMessage(
          err,
          'Não conseguimos entrar na sua conta. Verifique suas credenciais e tente novamente.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-default rounded-[32px] p-6 sm:p-8">
      <div>
        <p className="eyebrow text-[var(--color-primary-dark)]">Bem-vindo de volta</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-secondary)]">
          Entrar na sua conta
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">
          Use seu e-mail para retomar a experiência do condomínio.
        </p>
      </div>

      {globalError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="E-mail"
          id="email"
          type="email"
          name="email"
          value={fields.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="voce@email.com"
          autoComplete="email"
          autoFocus
          required
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          error={fieldErrors.email}
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <div>
          <Input
            label="Senha"
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={fields.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Digite sua senha"
            autoComplete="current-password"
            required
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            error={fieldErrors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-foreground-soft)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <div className="mt-2 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[var(--color-primary-dark)] transition-colors hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:rounded"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Entrar
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-foreground-soft)]">
        Ainda não tem conta?{' '}
        <Link
          href="/register"
          className="font-semibold text-[var(--color-primary-dark)] transition-colors hover:text-[var(--color-primary)]"
        >
          Criar minha conta
        </Link>
      </p>
    </div>
  );
}
