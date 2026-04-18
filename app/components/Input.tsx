import React, { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  hint,
  fullWidth = true,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      {label && (
        <label
          htmlFor={inputId}
          className="field-label"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        suppressHydrationWarning
        className={clsx(
          // min-h-[44px] satisfies the WCAG 2.5.5 minimum touch-target requirement
          'field-input px-4 py-3 transition-all focus:outline-none',
          error && 'border-red-400 focus:border-red-400 focus:ring-red-200',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      {!error && hint && <p className="mt-2 text-sm text-[var(--color-foreground-soft)]">{hint}</p>}
    </div>
  );
}
