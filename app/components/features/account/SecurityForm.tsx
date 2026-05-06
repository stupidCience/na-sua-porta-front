'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/lib/store';
import { usersAPI, getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/components/Toast';

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      id={id}
      name={id}
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      rightElement={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          className="text-[var(--color-foreground-soft)] transition-colors hover:text-[var(--color-secondary)]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
}

export function SecurityForm() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) router.push('/login');
  }, [hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.currentPassword || !form.newPassword) {
      addToast('Preencha todos os campos de senha para continuar.', 'error');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      addToast('A confirmação da nova senha não confere.', 'error');
      return;
    }
    if (form.newPassword.length < 6) {
      addToast('A nova senha precisa ter pelo menos 6 caracteres.', 'error');
      return;
    }
    setSaving(true);
    try {
      await usersAPI.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      addToast('Senha alterada com sucesso!', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos alterar sua senha agora.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!hasHydrated) {
    return (
      <Card className="flex min-h-[200px] items-center justify-center rounded-[28px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </Card>
    );
  }

  return (
    <Card className="rounded-[28px] bg-white/80 p-6 backdrop-blur-md sm:p-8">
      <h1 className="mb-1 text-xl font-semibold text-[var(--color-secondary)]">Segurança</h1>
      <p className="mb-7 text-sm text-[var(--color-foreground-soft)]">
        Altere sua senha periodicamente para manter a conta protegida.
      </p>

      <div className="space-y-5">
        <PasswordInput
          id="currentPassword"
          label="Senha atual"
          value={form.currentPassword}
          onChange={(v) => set('currentPassword', v)}
          autoComplete="current-password"
        />
        <PasswordInput
          id="newPassword"
          label="Nova senha"
          value={form.newPassword}
          onChange={(v) => set('newPassword', v)}
          autoComplete="new-password"
        />
        <PasswordInput
          id="confirmPassword"
          label="Confirmar nova senha"
          value={form.confirmPassword}
          onChange={(v) => set('confirmPassword', v)}
          autoComplete="new-password"
        />
      </div>

      {/* Strength hint */}
      {form.newPassword.length > 0 && form.newPassword.length < 6 && (
        <p className="mt-3 text-xs text-amber-600">
          A senha precisa ter pelo menos 6 caracteres.
        </p>
      )}
      {form.newPassword.length >= 6 &&
        form.confirmPassword.length > 0 &&
        form.newPassword !== form.confirmPassword && (
          <p className="mt-3 text-xs text-red-600">As senhas não conferem.</p>
        )}

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : 'Alterar senha'}
        </Button>
      </div>
    </Card>
  );
}
