'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Copy, KeyRound } from 'lucide-react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/lib/store';
import { usersAPI, getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/components/Toast';

export function CondominiumLinkForm() {
  const router = useRouter();
  const { user, setUser, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();

  const [code, setCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push('/login'); return; }
    setCode(user.condominiumAccessCode ?? user.condominiumId ?? '');
  }, [hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLink = async () => {
    if (!code.trim()) {
      addToast('Informe o código de acesso do condomínio para vincular sua conta.', 'error');
      return;
    }
    setLinking(true);
    try {
      const res = await usersAPI.linkToCondominium(code.trim());
      setUser({ ...user!, ...res.data });
      setCode(res.data.condominiumAccessCode ?? res.data.condominiumId ?? code.trim());
      addToast('Vínculo com o condomínio atualizado com sucesso!', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos vincular ao condomínio agora.'), 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasHydrated) {
    return (
      <Card className="flex min-h-[200px] items-center justify-center rounded-[28px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </Card>
    );
  }

  const isLinked = Boolean(user?.condominiumId);

  return (
    <Card className="rounded-[28px] bg-white/80 p-6 backdrop-blur-md sm:p-8">
      <h1 className="mb-1 text-xl font-semibold text-[var(--color-secondary)]">
        Vínculo com condomínio
      </h1>
      <p className="mb-7 text-sm text-[var(--color-foreground-soft)]">
        Informe o código fornecido pelo administrador do seu condomínio para vincular sua conta.
      </p>

      {/* Current condominium badge */}
      {isLinked && user?.condominiumName && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[rgba(26,166,75,0.2)] bg-[rgba(26,166,75,0.06)] px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-primary-dark)]">
              Vinculado a {user.condominiumName}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-foreground-soft)]">
              Para mudar de condomínio, informe o novo código abaixo.
            </p>
          </div>
        </div>
      )}

      <Input
        id="condominiumCode"
        name="condominiumCode"
        label="Código de acesso"
        placeholder="Cole ou digite o código do condomínio"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        leftIcon={<KeyRound className="h-4 w-4" />}
        rightElement={
          code ? (
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar código"
              className="text-[var(--color-foreground-soft)] transition-colors hover:text-[var(--color-primary)]"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          ) : null
        }
      />

      {/* Helper */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-3">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-foreground-soft)]" />
        <p className="text-xs leading-5 text-[var(--color-foreground-soft)]">
          Peça o código ao síndico ou responsável pela portaria. Sem ele, pedidos e entregas não ficam disponíveis na sua conta.
        </p>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleLink} disabled={linking || !code.trim()}>
          {linking ? 'Vinculando…' : isLinked ? 'Atualizar vínculo' : 'Vincular conta'}
        </Button>
      </div>
    </Card>
  );
}
