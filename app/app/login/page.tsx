import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { BRAND } from '@/lib/brand';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: `Entrar | ${BRAND.name}`,
  description: 'Acesse sua conta para retomar pedidos, entregas e gestão do condomínio.',
};

export default function LoginPage() {
  return (
    <div>
      <header className="flex items-center justify-between px-6 py-5 max-w-xl mx-auto w-full">
        <Link href="/" aria-label="Voltar para a página inicial">
          <BrandLogo size="sm" />
        </Link>
      </header>

      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
