'use client';

import React from 'react';
import clsx from 'clsx';
import { BRAND } from '@/lib/brand';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={clsx('surface-panel relative overflow-hidden rounded-[30px] px-5 py-6 sm:px-7 sm:py-7', className)}>
      <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-[var(--color-accent)]/18 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            {eyebrow && <p className="eyebrow text-[var(--color-primary-dark)]">{eyebrow}</p>}
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
              {BRAND.name}
            </span>
          </div>
          <h1 className="mt-3 text-[clamp(1.95rem,4vw,2.75rem)] font-semibold tracking-[-0.03em] text-[var(--color-secondary)]">
            {title}
          </h1>
          {description && (
            <div className="mt-3 text-sm leading-7 text-[var(--color-foreground-soft)] sm:text-base">
              {description}
            </div>
          )}
          {meta && <div className="mt-4 flex flex-wrap gap-2 text-sm">{meta}</div>}
        </div>

        {actions && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}