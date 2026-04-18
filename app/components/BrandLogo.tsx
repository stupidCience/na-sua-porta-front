import React from 'react';
import clsx from 'clsx';
import { BRAND } from '@/lib/brand';

type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'light';
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
};

const SIZE_MAP = {
  sm: {
    wrapper: 'gap-2.5',
    mark: 'h-11 w-11',
    title: 'text-sm tracking-[0.14em]',
    subtitle: 'text-[11px]',
  },
  md: {
    wrapper: 'gap-3',
    mark: 'h-14 w-14',
    title: 'text-base tracking-[0.16em]',
    subtitle: 'text-xs',
  },
  lg: {
    wrapper: 'gap-3.5',
    mark: 'h-16 w-16',
    title: 'text-lg tracking-[0.18em]',
    subtitle: 'text-sm',
  },
} as const;

export function BrandLogo({
  size = 'md',
  tone = 'default',
  className,
  showSubtitle = false,
  subtitle,
}: BrandLogoProps) {
  const sizeConfig = SIZE_MAP[size];
  const titleClass = tone === 'light' ? 'text-white' : 'text-[var(--color-secondary)]';
  const subtitleClass = tone === 'light' ? 'text-white/72' : 'text-[var(--color-foreground-soft)]';

  return (
    <div className={clsx('flex items-center', sizeConfig.wrapper, className)}>
      <svg
        viewBox="0 0 96 96"
        className={clsx('shrink-0 drop-shadow-[0_18px_28px_rgba(12,122,52,0.18)]', sizeConfig.mark)}
        aria-hidden="true"
      >
        <circle cx="48" cy="48" r="44" fill="var(--color-accent)" />
        <circle cx="48" cy="48" r="32" fill="#fffdf6" stroke="rgba(243, 183, 27, 0.86)" strokeWidth="8" />
        <path d="M30 19h24a5 5 0 0 1 5 5v35H25V24a5 5 0 0 1 5-5Z" fill="var(--color-primary)" />
        <path d="M35 24h15a4 4 0 0 1 4 4v26H31V28a4 4 0 0 1 4-4Z" fill="var(--color-primary-dark)" />
        <rect x="45" y="38" width="2.8" height="8" rx="1.4" fill="#fff4d4" />
        <path
          d="M61.5 26c-4.3 0-7.8 3.4-7.8 7.7 0 6.1 7.8 12.3 7.8 12.3s7.8-6.2 7.8-12.3c0-4.3-3.5-7.7-7.8-7.7Zm0 10.6a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8Z"
          fill="var(--color-accent)"
        />
        <path
          d="M18.2 55.4 62.8 51c1.5-.2 2.9.9 3.1 2.4l.8 6c.2 1.5-.9 2.9-2.4 3.1l-44.6 4.4c-1.5.2-2.9-.9-3.1-2.4l-.8-6c-.2-1.5.9-2.9 2.4-3.1Z"
          fill="white"
          stroke="#d9d5ca"
          strokeWidth="1.2"
        />
        <path d="M27 59h27.5" stroke="var(--color-secondary)" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M27 64h20" stroke="var(--color-secondary)" strokeWidth="4.2" strokeLinecap="round" />
      </svg>

      <div className="min-w-0">
        <p className={clsx('font-black uppercase leading-none', sizeConfig.title, titleClass)}>{BRAND.name}</p>
        {showSubtitle && (
          <p className={clsx('mt-1 max-w-sm font-medium leading-tight', sizeConfig.subtitle, subtitleClass)}>
            {subtitle ?? BRAND.slogan}
          </p>
        )}
      </div>
    </div>
  );
}