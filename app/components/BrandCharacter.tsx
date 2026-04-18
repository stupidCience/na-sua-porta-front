'use client';

import clsx from 'clsx';

type BrandCharacterVariant = 'host' | 'courier';

const CHARACTER_MAP: Record<
  BrandCharacterVariant,
  { src: string; alt: string }
> = {
  host: {
    src: '/brand-host.svg',
    alt: 'Personagem anfitriã da marca Na Sua Porta',
  },
  courier: {
    src: '/brand-courier.svg',
    alt: 'Personagem entregador da marca Na Sua Porta',
  },
};

interface BrandCharacterProps {
  variant: BrandCharacterVariant;
  className?: string;
  imageClassName?: string;
}

export function BrandCharacter({
  variant,
  className,
  imageClassName,
}: BrandCharacterProps) {
  const character = CHARACTER_MAP[variant];

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-[32px] border border-[var(--color-line)] bg-white/90 shadow-[0_24px_44px_rgba(28,25,23,0.08)]',
        className,
      )}
    >
      <img
        src={character.src}
        alt={character.alt}
        className={clsx('h-full w-full object-contain', imageClassName)}
      />
    </div>
  );
}