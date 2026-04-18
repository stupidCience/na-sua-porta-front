'use client';

import React from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

type NoticeTone = 'info' | 'warning' | 'error' | 'success';

const toneMap: Record<
  NoticeTone,
  { wrapper: string; icon: LucideIcon }
> = {
  info: {
    wrapper: 'border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] text-[var(--color-secondary)]',
    icon: Info,
  },
  warning: {
    wrapper: 'border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.2)] text-[var(--color-secondary)]',
    icon: AlertTriangle,
  },
  error: {
    wrapper: 'border-red-200 bg-red-50 text-red-800',
    icon: AlertCircle,
  },
  success: {
    wrapper: 'border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.1)] text-[var(--color-primary-dark)]',
    icon: CheckCircle2,
  },
};

interface NoticeBannerProps {
  tone?: NoticeTone;
  children: React.ReactNode;
  className?: string;
}

export function NoticeBanner({ tone = 'info', children, className }: NoticeBannerProps) {
  const Icon = toneMap[tone].icon;

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6',
        toneMap[tone].wrapper,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}