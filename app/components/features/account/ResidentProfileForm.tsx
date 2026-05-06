'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/lib/store';
import { usersAPI, getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/components/Toast';
import { formatPersonalDocument } from '@/lib/documentMasks';

export function ResidentProfileForm() {
  const router = useRouter();
  const { user, setUser, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    personalDocument: '',
    residenceDocument: '',
    communicationsConsent: false,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push('/login'); return; }

    setForm({
      name: user.name ?? '',
      phone: user.phone ?? '',
      personalDocument: user.personalDocument ?? '',
      residenceDocument: user.residenceDocument ?? '',
      communicationsConsent: user.communicationsConsent ?? false,
    });

    usersAPI
      .getMe()
      .then((res) => {
        if (!res.data) return;
        const u = res.data;
        setForm({
          name: u.name ?? '',
          phone: u.phone ?? '',
          personalDocument: u.personalDocument ?? '',
          residenceDocument: u.residenceDocument ?? '',
          communicationsConsent: u.communicationsConsent ?? false,
        });
        setUser({ ...user, ...u });
      })
      .catch(() => {
        /* Keep form functional even if refresh fails */
      })
      .finally(() => setLoading(false));
  }, [hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('Informe seu nome para salvar o perfil.', 'error');
      return;
    }
    if (!form.phone.trim()) {
      addToast('Telefone ou WhatsApp é obrigatório.', 'error');
      return;
    }
    if (!form.communicationsConsent) {
      addToast('Autorize comunicações para concluir o cadastro.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await usersAPI.updateMe({
        name: form.name,
        phone: form.phone,
        personalDocument: form.personalDocument,
        residenceDocument: form.residenceDocument,
        communicationsConsent: form.communicationsConsent,
      });
      setUser({ ...user!, ...res.data });
      addToast('Perfil atualizado com sucesso!', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos salvar seu perfil agora.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <Card className="flex min-h-[260px] items-center justify-center rounded-[28px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </Card>
    );
  }

  return (
    <Card className="rounded-[28px] bg-white/80 p-6 backdrop-blur-md sm:p-8">
      <h1 className="mb-1 text-xl font-semibold text-[var(--color-secondary)]">Meu perfil</h1>
      <p className="mb-7 text-sm text-[var(--color-foreground-soft)]">
        Informações pessoais vinculadas à sua conta no condomínio.
      </p>

      <div className="space-y-5">
        {/* Name */}
        <Input
          id="name"
          name="name"
          label="Nome completo"
          placeholder="Seu nome como consta no documento"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          autoComplete="name"
        />

        {/* Phone */}
        <Input
          id="phone"
          name="phone"
          label="Telefone / WhatsApp"
          placeholder="(00) 00000-0000"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          type="tel"
          autoComplete="tel"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {/* CPF / RG */}
          <Input
            id="personalDocument"
            name="personalDocument"
            label="Documento pessoal (CPF/RG)"
            placeholder="000.000.000-00"
            value={form.personalDocument}
            onChange={(e) => set('personalDocument', formatPersonalDocument(e.target.value))}
          />

          {/* Comprovante de residência */}
          <Input
            id="residenceDocument"
            name="residenceDocument"
            label="Nº comprovante de residência"
            placeholder="Opcional"
            value={form.residenceDocument}
            onChange={(e) => set('residenceDocument', e.target.value)}
          />
        </div>

        {/* Communications consent */}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-4 transition-colors hover:border-[var(--color-line-strong)]">
          <input
            id="communicationsConsent"
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
            checked={form.communicationsConsent}
            onChange={(e) => set('communicationsConsent', e.target.checked)}
          />
          <div>
            <p className="text-sm font-medium text-[var(--color-secondary)]">
              Autorizar comunicações
            </p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--color-foreground-soft)]">
              Aceito receber avisos sobre entregas, pedidos e comunicados do condomínio via
              WhatsApp ou notificação no app.
            </p>
          </div>
        </label>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </Card>
  );
}
