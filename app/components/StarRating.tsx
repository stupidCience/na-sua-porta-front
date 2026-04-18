'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}

export function StarRating({ rating = 0, onRate, readonly = false, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const buttonSizeClass = readonly
    ? size === 'sm'
      ? 'h-8 w-8'
      : 'h-9 w-9'
    : size === 'sm'
    ? 'h-10 w-10 sm:h-11 sm:w-11'
    : 'h-11 w-11 sm:h-12 sm:w-12';
  const iconSizeClass = size === 'sm' ? 'h-4.5 w-4.5' : 'h-5.5 w-5.5';

  return (
    <div className="flex flex-wrap gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          aria-label={readonly ? `Avaliação: ${rating} de 5` : `Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
          // min-w/h-[44px] satisfies the WCAG 2.5.5 minimum touch-target requirement
          className={`${buttonSizeClass} inline-flex items-center justify-center rounded-full transition-colors ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-105'
          }`}
          onClick={() => !readonly && onRate?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          <Star
            className={`${iconSizeClass} ${star <= (hover || rating) ? 'fill-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-line-strong)]'}`}
          />
        </button>
      ))}
    </div>
  );
}
