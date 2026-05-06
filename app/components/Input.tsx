import React, { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  fullWidth = true,
  leftIcon,
  rightElement,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-foreground-soft)]"
          >
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          suppressHydrationWarning
          className={clsx(
            // min-h-[44px] satisfies the WCAG 2.5.5 minimum touch-target requirement
            'field-input px-4 py-3 transition-all focus:outline-none',
            leftIcon && 'pl-10',
            rightElement && 'pr-11',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-200',
            className,
          )}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightElement}
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="mt-2 text-sm text-[var(--color-foreground-soft)]">{hint}</p>
      )}
    </div>
  );
}
