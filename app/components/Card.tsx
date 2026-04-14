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
        'card-default hover:shadow-lg transition-shadow',
        padding && 'p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
