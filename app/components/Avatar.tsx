'use client';

import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const safeName = name?.trim() || 'NSP';
  const initials = safeName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const colors = [
    'bg-[var(--color-primary)]',
    'bg-[var(--color-primary-dark)]',
    'bg-[var(--color-secondary)]',
    'bg-emerald-700',
    'bg-teal-700',
    'bg-lime-700',
    'bg-stone-700',
    'bg-zinc-700',
  ];

  const colorIndex = safeName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  const sizeClasses = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-14 w-14 text-lg',
  };

  const ringClasses = {
    xs: 'ring-1 shadow-[0_6px_16px_rgba(28,25,23,0.1)]',
    sm: 'ring-1 shadow-[0_8px_18px_rgba(28,25,23,0.1)]',
    md: 'ring-2 shadow-[0_12px_26px_rgba(28,25,23,0.12)]',
    lg: 'ring-2 shadow-[0_16px_30px_rgba(28,25,23,0.13)]',
    xl: 'ring-2 shadow-[0_18px_34px_rgba(28,25,23,0.14)]',
  };

  return (
    <div className={`${sizeClasses[size]} ${ringClasses[size]} ${bgColor} ring-white/85 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}
