'use client';

import React, { useState } from 'react';

interface StarRatingProps {
  rating?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}

export function StarRating({ rating = 0, onRate, readonly = false, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === 'sm' ? 'text-lg' : 'text-2xl';

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          // min-w/h-[44px] satisfies the WCAG 2.5.5 minimum touch-target requirement
          className={`${sizeClass} min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
          onClick={() => !readonly && onRate?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          {star <= (hover || rating) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}
