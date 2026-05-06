import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import { Button } from '@/components/Button';
import type { AccountModule } from '@/lib/store';

interface OnboardingNoticeProps {
  pendingModules: AccountModule[];
  completionRoute: string;
}

export function OnboardingNotice({ pendingModules, completionRoute }: OnboardingNoticeProps) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="flex justify-center mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,213,58,0.2)] ring-1 ring-[rgba(243,183,27,0.35)]">
          <Clock3 className="h-7 w-7 text-[var(--color-secondary)]" aria-hidden="true" />
        </div>
      </div>

      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-secondary)]">
        Falta só mais um passo
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--color-foreground-soft)]">
        Complete seu cadastro para liberar o acesso e começar a usar a plataforma dentro do condomínio.
      </p>

      {pendingModules.length > 0 && (
        <div className="mt-6 space-y-2 text-left">
          {pendingModules.map((mod) => (
            <div
              key={mod.module}
              className="rounded-2xl border border-[rgba(243,183,27,0.35)] bg-[rgba(255,213,58,0.1)] px-4 py-3"
            >
              <p className="text-sm font-semibold text-[var(--color-secondary)]">
                Pendências encontradas
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {mod.missingRequirements.map((req) => (
                  <li
                    key={req}
                    className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--color-foreground-soft)] ring-1 ring-[rgba(243,183,27,0.35)]"
                  >
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href={completionRoute}>
          <Button size="lg">
            Continuar cadastro
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
