'use client';

import React from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  tone?: 'amber' | 'emerald' | 'sky' | 'violet' | 'slate' | 'rose';
  className?: string;
}

const toneMap: Record<NonNullable<StatCardProps['tone']>, string> = {
  amber: 'text-[var(--color-primary-dark)] bg-[rgba(255,213,58,0.22)] ring-[rgba(243,183,27,0.35)]',
  emerald: 'text-[var(--color-primary-dark)] bg-[rgba(26,166,75,0.14)] ring-[rgba(26,166,75,0.2)]',
  sky: 'text-[var(--color-secondary)] bg-[rgba(26,166,75,0.08)] ring-[rgba(26,166,75,0.16)]',
  violet: 'text-[var(--color-secondary)] bg-[rgba(31,41,51,0.07)] ring-[rgba(31,41,51,0.1)]',
  slate: 'text-slate-700 bg-slate-100 ring-slate-200',
  rose: 'text-rose-700 bg-rose-50 ring-rose-100',
};

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'amber',
  className,
}: StatCardProps) {
  return (
    <Card className={clsx('rounded-[26px] p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-foreground-soft)]">{label}</p>
          <div className="mt-3 break-words text-[clamp(1.75rem,4vw,2.6rem)] font-semibold tracking-[-0.03em] text-[var(--color-secondary)]">
            {value}
          </div>
          {description && (
            <div className="mt-3 text-sm leading-6 text-[var(--color-foreground-soft)]">{description}</div>
          )}
        </div>

        {Icon && (
          <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 shadow-[0_12px_24px_rgba(20,33,24,0.06)]', toneMap[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}