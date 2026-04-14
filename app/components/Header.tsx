'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { useSocket } from '@/lib/useSocket';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { connectionStatus } = useSocket(user?.id, user?.role);
  const previousStatus = useRef(connectionStatus);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (previousStatus.current === 'reconnecting' && connectionStatus === 'connected') {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }

    previousStatus.current = connectionStatus;
  }, [connectionStatus]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    router.push('/');
  };

  return (
    <header className="bg-black shadow-xl border-b-4 border-amber-500">
      {user && connectionStatus !== 'connected' && (
        <div className="px-4 py-2 text-sm text-center bg-amber-100 text-amber-900 border-b border-amber-300 font-semibold">
          {connectionStatus === 'reconnecting' ? 'Reconectando ao tempo real...' : 'Conexão em tempo real indisponível no momento.'}
        </div>
      )}
      {user && showReconnected && (
        <div className="px-4 py-2 text-sm text-center bg-emerald-100 text-emerald-900 border-b border-emerald-300 font-semibold">
          Conectado novamente.
        </div>
      )}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-black text-amber-400 tracking-tight">
            <span className="text-2xl">🍕</span>
            Na Sua Porta
          </Link>

          {user && (
            <div className="hidden md:flex items-center gap-4">
              {user.role === 'RESIDENT' ? (
                <>
                  <Link href="/deliveries/new">
                    <Button size="sm">📦 Solicitar coleta</Button>
                  </Link>
                  <Link href="/shop">
                    <Button size="sm" variant="secondary">🍽 Guia de restaurantes</Button>
                  </Link>
                  <Link href="/deliveries" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Minhas entregas
                  </Link>
                  <Link href="/chats" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Chats
                  </Link>
                  <Link href="/deliveries/history" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Histórico
                  </Link>
                </>
              ) : user.role === 'VENDOR' ? (
                <>
                  <Link href="/vendor/store" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Meu Comércio
                  </Link>
                  <Link href="/vendor/orders" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Pedidos
                  </Link>
                  <Link href="/chats" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Chats
                  </Link>
                  <Link href="/vendor/history" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Histórico de pedidos
                  </Link>
                  <Link href="/vendor/dashboard" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Dashboard
                  </Link>
                </>
              ) : user.role === 'CONDOMINIUM_ADMIN' ? (
                <>
                  <Link href="/admin" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Painel do Condomínio
                  </Link>
                  <Link href="/admin/vendors" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Comércios
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/deliveries/available" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Coletas disponíveis
                  </Link>
                  <Link href="/deliveries/my-deliveries" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Minhas Entregas
                  </Link>
                  <Link href="/chats" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Chats
                  </Link>
                  <Link href="/deliveries/history" className="text-amber-100 hover:text-amber-400 font-medium transition">
                    Histórico
                  </Link>
                  <Link href="/dashboard" className="text-amber-100 hover:text-amber-400 font-medium transition">
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
              {['RESIDENT', 'VENDOR', 'DELIVERY_PERSON'].includes(user.role) && (
                <Link href="/chats" className="md:hidden">
                  <Button variant="secondary" size="sm">
                    Chats
                  </Button>
                </Link>
              )}
              <div className="hidden md:block text-right mr-1">
                <p className="text-xs text-amber-200">Condomínio</p>
                <p className="text-sm font-medium text-white">
                  {user.condominiumName || 'Não definido'}
                </p>
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                title="Meu Perfil"
              >
                <Avatar name={user.name} size="sm" />
                <span className="text-sm text-amber-100 hidden sm:block font-semibold">{user.name}</span>
              </Link>
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
