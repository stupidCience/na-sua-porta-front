'use client';

import React from 'react';

const statusConfig: Record<string, { bg: string; text: string; icon: string; label: string; pulse?: boolean }> = {
  REQUESTED: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-900', icon: '🟡', label: 'Procurando entregador', pulse: true },
  ACCEPTED: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-900', icon: '🔵', label: 'Entregador a caminho' },
  PICKED_UP: { bg: 'bg-orange-100 border-orange-300', text: 'text-orange-900', icon: '🟠', label: 'A caminho' },
  DELIVERED: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-900', icon: '🟢', label: 'Entrega finalizada' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.REQUESTED;
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={`badge-status inline-flex items-center gap-1.5 ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
        </span>
      )}
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
