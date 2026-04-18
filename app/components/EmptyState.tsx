'use client';

import React from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <Card className={clsx('rounded-[28px] px-5 py-8 sm:px-8 sm:py-10', className)}>
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-[var(--color-line)] bg-[rgba(255,213,58,0.18)] text-[var(--color-primary-dark)] shadow-[0_18px_34px_rgba(20,33,24,0.08)]">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-[var(--color-secondary)]">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-7 text-[var(--color-foreground-soft)] sm:text-base">
          {description}
        </div>
        {actions && (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {actions}
          </div>
        )}
      </div>
    </Card>
  );
}