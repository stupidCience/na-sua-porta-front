'use client';

import React from 'react';
import { CheckCircle2, Clock3, PackageCheck, Truck } from 'lucide-react';

const statusConfig: Record<string, { bg: string; text: string; label: string; pulse?: boolean; icon: React.ReactNode }> = {
  REQUESTED: {
    bg: 'bg-[rgba(255,213,58,0.2)] border-[rgba(243,183,27,0.35)]',
    text: 'text-[var(--color-secondary)]',
    icon: <Clock3 className="h-3.5 w-3.5" />,
    label: 'Procurando entregador',
    pulse: true,
  },
  ACCEPTED: {
    bg: 'bg-[rgba(26,166,75,0.1)] border-[rgba(26,166,75,0.18)]',
    text: 'text-[var(--color-primary-dark)]',
    icon: <PackageCheck className="h-3.5 w-3.5" />,
    label: 'Entregador a caminho',
  },
  PICKED_UP: {
    bg: 'bg-[rgba(31,41,51,0.06)] border-[rgba(31,41,51,0.12)]',
    text: 'text-[var(--color-secondary)]',
    icon: <Truck className="h-3.5 w-3.5" />,
    label: 'A caminho',
  },
  DELIVERED: {
    bg: 'bg-[rgba(26,166,75,0.14)] border-[rgba(26,166,75,0.2)]',
    text: 'text-[var(--color-primary-dark)]',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Entrega finalizada',
  },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.REQUESTED;
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span className={`badge-status inline-flex max-w-full flex-wrap items-center gap-1.5 ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {config.pulse && (
        <span className="relative hidden h-2 w-2 sm:flex">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent-strong)] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent-strong)]"></span>
        </span>
      )}
      <span className="shrink-0">{config.icon}</span>
      <span className="leading-5">{config.label}</span>
    </span>
  );
}
