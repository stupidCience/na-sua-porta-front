import type { ReactNode } from 'react';
import { AccountSidebar } from '@/components/features/account/AccountSidebar';

export const metadata = {
  title: 'Minha Conta',
};

export default function ContaMoradorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-full lg:w-64 lg:shrink-0">
          {/* Sticky on large screens */}
          <div className="lg:sticky lg:top-24">
            <AccountSidebar />
          </div>
        </aside>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1">
          {children}
        </main>

      </div>
    </div>
  );
}
