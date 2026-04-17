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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (previousStatus.current === 'reconnecting' && connectionStatus === 'connected') {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }

    previousStatus.current = connectionStatus;
  }, [connectionStatus]);


  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    localStorage.removeItem('access_token');
    router.push('/');
  };

  const navLinks =
    user?.role === 'RESIDENT'
      ? [
          { href: '/deliveries/new', label: '📦 Solicitar coleta' },
          { href: '/shop', label: '🍽 Guia de restaurantes' },
          { href: '/deliveries', label: 'Minhas entregas' },
          { href: '/chats', label: 'Chats' },
          { href: '/deliveries/history', label: 'Histórico' },
        ]
      : user?.role === 'VENDOR'
      ? [
          { href: '/vendor/store', label: 'Meu Comércio' },
          { href: '/vendor/orders', label: 'Pedidos' },
          { href: '/chats', label: 'Chats' },
          { href: '/vendor/history', label: 'Histórico de pedidos' },
          { href: '/vendor/dashboard', label: 'Dashboard' },
        ]
      : user?.role === 'CONDOMINIUM_ADMIN'
      ? [
          { href: '/admin', label: 'Painel do Condomínio' },
          { href: '/admin/vendors', label: 'Comércios' },
        ]
      : user
      ? [
          { href: '/deliveries/available', label: 'Coletas disponíveis' },
          { href: '/deliveries/my-deliveries', label: 'Minhas Entregas' },
          { href: '/chats', label: 'Chats' },
          { href: '/deliveries/history', label: 'Histórico' },
          { href: '/dashboard', label: 'Dashboard' },
        ]
      : [];

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
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-black text-amber-400 tracking-tight">
            <span className="text-2xl">🍕</span>
            <span className="hidden xs:inline">Na Sua Porta</span>
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

        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
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
              <Button variant="secondary" size="sm" onClick={handleLogout} className="hidden md:inline-flex">
                Sair
              </Button>
              {/* Hamburger button — visible only on mobile */}
              {navLinks.length > 0 && (
                <button
                  type="button"
                  aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                  aria-expanded={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="md:hidden flex flex-col justify-center items-center w-11 h-11 gap-1.5 rounded-lg text-amber-400 hover:bg-white/10 transition"
                >
                  <span className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                  <span className={`block h-0.5 w-6 bg-current transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </button>
              )}
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

      {/* Mobile navigation drawer */}
      {user && mobileMenuOpen && (
        <div className="md:hidden bg-black border-t border-amber-500/30">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3 py-2 rounded-lg text-amber-100 hover:bg-white/10 hover:text-amber-400 font-medium transition"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="px-4 pb-4 pt-2 border-t border-white/10">
            <p className="text-xs text-amber-300 mb-1">
              {user.condominiumName ? `Condomínio: ${user.condominiumName}` : 'Condomínio não definido'}
            </p>
            <Button variant="secondary" size="sm" onClick={handleLogout} className="w-full">
              Sair
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
