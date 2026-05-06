'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Bell, House, Link2, Shield, Star, UserRound } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { useAuthStore } from '@/lib/store';

const NAV_ITEMS = [
  { href: '/morador/conta/perfil', label: 'Perfil', icon: UserRound },
  { href: '/morador/conta/endereco', label: 'Endereço', icon: House },
  { href: '/morador/conta/vinculo', label: 'Vínculo', icon: Link2 },
  { href: '/morador/conta/seguranca', label: 'Segurança', icon: Shield },
  { href: '/morador/conta/avaliacoes', label: 'Avaliações', icon: Star },
  { href: '/configuracoes', label: 'Notificações', icon: Bell },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <nav aria-label="Configurações da conta">
      {/* ── User summary ─────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3 rounded-[24px] border border-[var(--color-line)] bg-white/80 px-4 py-4 backdrop-blur-md">
        <Avatar name={user.name} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-secondary)]">
            {user.name}
          </p>
          <p className="truncate text-xs text-[var(--color-foreground-soft)]">{user.email}</p>
          {user.apartment && (
            <p className="mt-0.5 truncate text-xs text-[var(--color-foreground-soft)]">
              Bloco {user.block} · Apto {user.apartment}
            </p>
          )}
        </div>
      </div>

      {/* ── Nav links ────────────────────────────────────────────────── */}
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={clsx(
                  'flex min-h-[44px] items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)]'
                    : 'text-[var(--color-foreground-soft)] hover:bg-[var(--color-background-soft)] hover:text-[var(--color-secondary)]',
                )}
              >
                <Icon
                  className={clsx(
                    'h-4 w-4 shrink-0 transition-colors duration-150',
                    isActive ? 'text-[var(--color-primary)]' : 'opacity-70',
                  )}
                />
                {label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── Back link ────────────────────────────────────────────────── */}
      <div className="mt-5 border-t border-[var(--color-line)] pt-4">
        <button
          type="button"
          onClick={() => router.push('/morador')}
          className="flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-medium text-[var(--color-foreground-soft)] transition-colors hover:text-[var(--color-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          ← Voltar ao painel
        </button>
      </div>
    </nav>
  );
}
