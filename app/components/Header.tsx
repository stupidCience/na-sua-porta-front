'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Avatar } from './Avatar';
import { Button } from './Button';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    router.push('/');
  };

  return (
    <header className="bg-white shadow border-b-4 border-amber-500">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-amber-600">
            <span className="text-2xl">🍕</span>
            Na Sua Porta
          </Link>

          {user && (
            <div className="hidden md:flex items-center gap-4">
              {user.role === 'RESIDENT' ? (
                <>
                  <Link href="/deliveries/new">
                    <Button size="sm">Pedir entrega 🚀</Button>
                  </Link>
                  <Link href="/deliveries" className="text-gray-600 hover:text-amber-600 font-medium transition">
                    Meus Pedidos
                  </Link>
                  <Link href="/deliveries/history" className="text-gray-600 hover:text-amber-600 font-medium transition">
                    Histórico
                  </Link>
                  <Link href="/dashboard" className="text-gray-600 hover:text-amber-600 font-medium transition">
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/deliveries/available" className="text-gray-600 hover:text-amber-600 font-medium transition">
                    Pedidos Disponíveis
                  </Link>
                  <Link href="/deliveries/my-deliveries" className="text-gray-600 hover:text-amber-600 font-medium transition">
                    Minhas Entregas
                  </Link>
                  <Link href="/deliveries/history" className="text-gray-600 hover:text-amber-600 font-medium transition">
                    Histórico
                  </Link>
                  <Link href="/dashboard" className="text-gray-600 hover:text-amber-600 font-medium transition">
                    Dashboard
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <Avatar name={user.name} size="sm" />
                <span className="text-sm text-gray-600 hidden sm:block">{user.name}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="secondary" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Cadastro</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
