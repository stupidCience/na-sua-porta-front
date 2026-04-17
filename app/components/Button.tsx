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
    'font-extrabold rounded-2xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary:
      'button-primary',
    secondary:
      'bg-black text-[var(--color-primary)] border-2 border-black hover:bg-gray-900 active:bg-black',
    danger:
      'bg-red-600 text-white border-2 border-red-700 hover:bg-red-700 active:bg-red-800',
  };

  const sizeClasses = {
    // min-h-[44px] satisfies the WCAG 2.5.5 minimum touch-target requirement
    sm: 'px-4 py-2 text-sm min-h-[44px]',
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
