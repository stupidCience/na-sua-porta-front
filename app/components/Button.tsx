import React, { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  children,
  className,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-2xl border font-semibold tracking-[-0.01em] shadow-sm transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50';

  const variantClasses = {
    primary:
      'button-primary',
    secondary:
      'border-[var(--color-line)] bg-white/80 text-[var(--color-secondary)] hover:border-[var(--color-line-strong)] hover:bg-white active:bg-white/90',
    danger:
      'border-red-300 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-[0_16px_28px_rgba(180,35,24,0.18)]',
  };

  const sizeClasses = {
    // min-h-[44px] satisfies the WCAG 2.5.5 minimum touch-target requirement
    sm: 'px-4 py-2.5 text-sm min-h-[44px]',
    md: 'px-5 py-3 text-base min-h-[44px]',
    lg: 'px-7 py-3.5 text-lg min-h-[44px]',
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        loading && 'opacity-75 cursor-not-allowed',
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Carregando...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
