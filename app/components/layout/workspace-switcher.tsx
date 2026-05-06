'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { ACCOUNT_MODULE_META, getEnabledAccountModules } from '@/lib/accountModules';
import { getApiErrorMessage, usersAPI } from '@/lib/api';
import { getDefaultRouteForUser } from '@/lib/routes';
import { useAuthStore, type UserRole } from '@/lib/store';
import { useToastStore } from '@/components/Toast';

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { user, activeRole, setUser, setActiveRole } = useAuthStore();
  const { addToast } = useToastStore();

  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<UserRole | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!user) return null;

  const enabledModules = getEnabledAccountModules(user.modules);

  /* Only render when there are 2+ modules — nothing to switch with a single one */
  if (enabledModules.length < 2) return null;

  const currentRole: UserRole = (activeRole ?? user.role) as UserRole;
  const CurrentMeta = ACCOUNT_MODULE_META[currentRole];
  const CurrentIcon = CurrentMeta?.icon;

  const otherModules = enabledModules.filter((m) => m.module !== currentRole);

  const handleSwitch = async (targetRole: UserRole) => {
    setOpen(false);
    if (targetRole === currentRole || switching) return;

    setSwitching(targetRole);
    try {
      let nextUser = user;

      if (user.role !== targetRole) {
        const response = await usersAPI.switchActiveModule(targetRole);
        nextUser = response.data;
        setUser(nextUser);
      }

      setActiveRole(targetRole);
      addToast(
        `Perfil alterado para ${ACCOUNT_MODULE_META[targetRole].label.toLowerCase()}.`,
        'success',
      );
      router.push(getDefaultRouteForUser(targetRole, nextUser.isVendor));
    } catch (err: unknown) {
      addToast(getApiErrorMessage(err, 'Não foi possível trocar de perfil agora.'), 'error');
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Perfil atual: ${CurrentMeta?.label ?? currentRole}. Clique para trocar.`}
        className={clsx(
          'inline-flex h-10 items-center gap-2 rounded-[20px] border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          open
            ? 'border-[var(--color-line-strong)] bg-[var(--color-background-soft)] text-[var(--color-primary-dark)]'
            : 'border-[var(--color-line)] bg-white/85 text-[var(--color-secondary)] hover:border-[var(--color-line-strong)] hover:bg-white',
          switching && 'pointer-events-none opacity-60',
        )}
      >
        {CurrentIcon && <CurrentIcon className="h-4 w-4 shrink-0" />}
        <span className="hidden sm:inline">{CurrentMeta?.label ?? currentRole}</span>
        <ChevronDown
          className={clsx('h-3.5 w-3.5 shrink-0 text-[var(--color-foreground-soft)] transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 min-w-[13rem] overflow-hidden rounded-[22px] border border-[var(--color-line)] bg-white shadow-[0_20px_44px_rgba(28,25,23,0.12)]"
        >
          <div className="px-2 py-2">
            <p className="px-3 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-foreground-soft)]">
              Trocar para
            </p>

            {otherModules.map((mod) => {
              const meta = ACCOUNT_MODULE_META[mod.module];
              const Icon = meta.icon;
              const isLoading = switching === mod.module;

              return (
                <button
                  key={mod.module}
                  role="menuitem"
                  type="button"
                  onClick={() => void handleSwitch(mod.module)}
                  disabled={isLoading}
                  className="flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-sm font-medium text-[var(--color-secondary)] transition-colors hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] disabled:opacity-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[var(--color-background-soft)]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-left">{meta.label}</span>
                  {isLoading && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
