'use client';

import React from 'react';
import clsx from 'clsx';

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

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      {title && <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">{title}</p>}
      {/* Use complete class strings so Tailwind JIT can detect them statically */}
      <ol
        className={clsx(
          'grid gap-1',
          steps.length <= 3 && 'grid-cols-3',
          steps.length === 4 && 'grid-cols-4',
          steps.length >= 5 && 'grid-cols-5',
        )}
      >
        {steps.map((step, index) => {
          const isDone = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li key={step.key} className="relative">
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                    isDone
                      ? 'border-black bg-[var(--color-primary)] text-black'
                      : 'border-gray-300 bg-white text-gray-400'
                  } ${isCurrent ? 'ring-2 ring-amber-300' : ''}`}
                >
                  {step.icon ?? index + 1}
                </span>
                {index < steps.length - 1 && (
                  <span
                    className={`h-1 flex-1 rounded-full ${
                      index < currentIndex ? 'bg-[var(--color-primary)]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
              <p className={`mt-1.5 text-[10px] font-semibold leading-tight ${isDone ? 'text-gray-800' : 'text-gray-500'}`}>
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
