'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';

const HEADERLESS_ROUTES = new Set(['/', '/login']);

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHeaderless = HEADERLESS_ROUTES.has(pathname);

  if (isHeaderless) {
    return <div className="flex-1">{children}</div>;
  }

  return (
    <>
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </>
  );
}
