'use client';

import React from 'react';
import clsx from 'clsx';
import { Check, CircleDot } from 'lucide-react';

type Step = {
  key: string;
  label: string;
  icon?: string;
};

interface ProgressStepperProps {
  title?: string;
  steps: Step[];
  currentKey: string;
}

export function ProgressStepper({ title, steps, currentKey }: ProgressStepperProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === currentKey),
  );

  const gridClass =
    steps.length <= 3
      ? 'grid-cols-3'
      : steps.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  return (
    <div className="mt-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-background-soft)] p-3.5 sm:p-4">
      {title && <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-foreground-soft)]">{title}</p>}
      <ol
        className={clsx(
          'grid gap-2 sm:gap-3',
          gridClass,
        )}
      >
        {steps.map((step, index) => {
          const isDone = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li key={step.key} className="relative min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${
                    isDone
                      ? 'border-[var(--color-primary-dark)] bg-[var(--color-primary)] text-white'
                      : 'border-[var(--color-line-strong)] bg-white text-[var(--color-foreground-soft)]'
                  } ${isCurrent ? 'ring-4 ring-[rgba(255,213,58,0.28)]' : ''}`}
                >
                  {index < currentIndex ? <Check className="h-4 w-4" /> : isCurrent ? <CircleDot className="h-4 w-4" /> : step.icon ?? index + 1}
                </span>
                {index < steps.length - 1 && (
                  <span
                    className={`h-1.5 min-w-3 flex-1 rounded-full ${
                      index < currentIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-line)]'
                    }`}
                  />
                )}
              </div>
              <p className={`mt-2 text-[11px] font-semibold leading-5 sm:text-xs ${isDone ? 'text-[var(--color-secondary)]' : 'text-[var(--color-foreground-soft)]'}`}>
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
