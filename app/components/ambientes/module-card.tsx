'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/Button';
import type { AccountModule, UserRole } from '@/lib/store';

const TONE: Record<UserRole, { ring: string; iconBg: string; iconText: string; activeBadge: string }> = {
  RESIDENT: {
    ring: 'hover:ring-[var(--color-primary)] focus-visible:ring-[var(--color-primary)]',
    iconBg: 'bg-[rgba(26,166,75,0.1)]',
    iconText: 'text-[var(--color-primary-dark)]',
    activeBadge: 'bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)] ring-[rgba(26,166,75,0.25)]',
  },
  DELIVERY_PERSON: {
    ring: 'hover:ring-[var(--color-accent-strong)] focus-visible:ring-[var(--color-accent-strong)]',
    iconBg: 'bg-[rgba(255,213,58,0.2)]',
    iconText: 'text-[var(--color-secondary)]',
    activeBadge: 'bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)] ring-[rgba(243,183,27,0.4)]',
  },
  VENDOR: {
    ring: 'hover:ring-[var(--color-secondary)] focus-visible:ring-[var(--color-secondary)]',
    iconBg: 'bg-[rgba(31,41,51,0.06)]',
    iconText: 'text-[var(--color-secondary)]',
    activeBadge: 'bg-[rgba(31,41,51,0.06)] text-[var(--color-secondary)] ring-[rgba(31,41,51,0.15)]',
  },
  CONDOMINIUM_ADMIN: {
    ring: 'hover:ring-[var(--color-line-strong)] focus-visible:ring-[var(--color-line-strong)]',
    iconBg: 'bg-[var(--color-background-soft)]',
    iconText: 'text-[var(--color-secondary)]',
    activeBadge: 'bg-[var(--color-background-soft)] text-[var(--color-secondary)] ring-[var(--color-line)]',
  },
};

interface ModuleCardProps {
  module: AccountModule;
  label: string;
  description: string;
  ctaLabel: string;
  Icon: LucideIcon;
  isEntering: boolean;
  completionRoute: string;
  onEnter: (role: UserRole) => void;
}

export function ModuleCard({
  module,
  label,
  description,
  ctaLabel,
  Icon,
  isEntering,
  onEnter,
}: ModuleCardProps) {
  const tone = TONE[module.module];

  return (
    <div
      className="card-default group flex flex-col gap-5 rounded-[28px] p-7 outline-none ring-1 ring-[var(--color-line)] transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_28px_56px_rgba(20,33,24,0.12)] focus-visible:outline-none focus-visible:ring-2 cursor-pointer"
      style={{ '--tw-ring-color': 'transparent' } as React.CSSProperties}
      tabIndex={0}
      role="button"
      aria-label={`Entrar como ${label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEnter(module.module);
        }
      }}
      onClick={() => onEnter(module.module)}
    >
      {/* Icon + active badge */}
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${tone.iconBg} ${tone.iconText} ring-[var(--color-line)] transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        {module.active && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone.activeBadge}`}
          >
            Em uso
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-xl font-semibold tracking-[-0.01em] text-[var(--color-secondary)]">
          {label}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-foreground-soft)]">{description}</p>
      </div>

      {/* Missing requirements */}
      {module.missingRequirements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {module.missingRequirements.map((req) => (
            <span
              key={req}
              className="rounded-full bg-[var(--color-background-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-foreground-soft)] ring-1 ring-[var(--color-line)]"
            >
              {req}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onEnter(module.module);
        }}
        loading={isEntering}
        fullWidth
        aria-label={module.active ? `Continuar como ${label}` : ctaLabel}
      >
        {module.active ? `Continuar como ${label}` : ctaLabel}
      </Button>
    </div>
  );
}
