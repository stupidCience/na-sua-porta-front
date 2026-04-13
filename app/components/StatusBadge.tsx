'use client';

import React from 'react';

const statusConfig: Record<string, { bg: string; text: string; icon: string; label: string; pulse?: boolean }> = {
  REQUESTED: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡', label: 'Aguardando', pulse: true },
  ACCEPTED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔵', label: 'Em andamento' },
  PICKED_UP: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🟠', label: 'Em coleta' },
  DELIVERED: { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢', label: 'Entregue' },
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
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses[size]}`}>
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
