'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Hash } from 'lucide-react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/lib/store';
import { usersAPI, getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/components/Toast';

export function AddressForm() {
  const router = useRouter();
  const { user, setUser, hasHydrated } = useAuthStore();
  const { addToast } = useToastStore();

  const [form, setForm] = useState({ apartment: '', block: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push('/login'); return; }
    setForm({ apartment: user.apartment ?? '', block: user.block ?? '' });
  }, [hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: 'apartment' | 'block', value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.apartment.trim() || !form.block.trim()) {
      addToast('Informe apartamento e bloco para continuar.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await usersAPI.updateMe({
        apartment: form.apartment.trim(),
        block: form.block.trim(),
      });
      setUser({ ...user!, ...res.data });
      addToast('Endereço atualizado com sucesso!', 'success');
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não conseguimos salvar seu endereço agora.'), 'error');
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
      <h1 className="mb-1 text-xl font-semibold text-[var(--color-secondary)]">Endereço</h1>
      <p className="mb-7 text-sm text-[var(--color-foreground-soft)]">
        Bloco e apartamento usados para identificar onde você mora no condomínio.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="block"
          name="block"
          label="Bloco"
          placeholder="Ex: A, B, 01…"
          value={form.block}
          onChange={(e) => set('block', e.target.value)}
          leftIcon={<Building2 className="h-4 w-4" />}
        />
        <Input
          id="apartment"
          name="apartment"
          label="Apartamento"
          placeholder="Ex: 101, 304…"
          value={form.apartment}
          onChange={(e) => set('apartment', e.target.value)}
          leftIcon={<Hash className="h-4 w-4" />}
        />
      </div>

      {/* Live preview */}
      {(form.block || form.apartment) && (
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] px-4 py-3">
          <span className="text-base">📍</span>
          <p className="text-sm font-medium text-[var(--color-secondary)]">
            {[form.block && `Bloco ${form.block}`, form.apartment && `Apto ${form.apartment}`]
              .filter(Boolean)
              .join(' — ')}
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar endereço'}
        </Button>
      </div>
    </Card>
  );
}
