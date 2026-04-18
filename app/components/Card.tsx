import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={clsx(
        'card-default surface-panel transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_54px_rgba(28,25,23,0.12)]',
        padding && 'p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
