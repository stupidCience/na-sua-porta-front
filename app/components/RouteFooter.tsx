'use client';

import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { BRAND } from '@/lib/brand';

const FOOTER_ROUTES = new Set(['/', '/login']);

export function RouteFooter() {
  const pathname = usePathname();

  if (!pathname || !FOOTER_ROUTES.has(pathname)) {
    return null;
  }

  return (
    <footer className="mt-12 border-t border-[var(--color-line)] bg-white/72 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <BrandLogo size="sm" showSubtitle subtitle={BRAND.slogan} />
        <div className="text-sm text-[var(--color-foreground-soft)] lg:text-right">
          <p>{BRAND.footerDescription}</p>
          <p className="mt-1">&copy; 2026 {BRAND.name}. Pedidos, entregas e operação com mais clareza no condomínio.</p>
        </div>
      </div>
    </footer>
  );
}