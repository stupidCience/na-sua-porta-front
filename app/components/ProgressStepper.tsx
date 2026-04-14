'use client';

import React from 'react';

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
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const isDone = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li key={step.key} className="relative">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black ${
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
              <p className={`mt-2 text-[11px] font-semibold ${isDone ? 'text-gray-800' : 'text-gray-500'}`}>
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
