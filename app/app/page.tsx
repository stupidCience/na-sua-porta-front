'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && user) {
      if (user.role === 'VENDOR' || user.isVendor) {
        router.push('/vendor/orders');
      } else if (user.role === 'CONDOMINIUM_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/deliveries/available');
      }
    }
  }, [user, router, isAuthenticated]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-600 mb-4">🍕 Na Sua Porta</h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-2">
          Entregas internas para condomínios
        </p>
        <p className="text-gray-500 mb-8">
          Rapidez, facilidade e confiabilidade em cada entrega
        </p>
        <Link href="/demo">
          <Button size="lg">Solicitar demonstração</Button>
        </Link>
      </div>

      {!isAuthenticated ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full px-4">
          {/* Resident Card */}
          <Card>
            <div className="text-center">
              <div className="text-4xl mb-4">🏘️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Morador</h2>
              <p className="text-gray-600 mb-6">
                Solicite agilmente que entregadores busquem suas encomendas na portaria
              </p>
              <div className="space-y-3">
                <Link href="/register" className="block">
                  <Button fullWidth variant="primary" size="lg">
                    Cadastro Morador
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button fullWidth variant="secondary" size="lg">
                    Já tem conta?
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Delivery Person Card */}
          <Card>
            <div className="text-center">
              <div className="text-4xl mb-4">🚚</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Entregador</h2>
              <p className="text-gray-600 mb-6">
                Aceite pedidos e ganhe recibindo entregas entre edifícios
              </p>
              <div className="space-y-3">
                <Link href="/register?type=delivery" className="block">
                  <Button fullWidth variant="primary" size="lg">
                    Cadastro Entregador
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button fullWidth variant="secondary" size="lg">
                    Já tem conta?
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Condominium Admin Card */}
          <Card>
            <div className="text-center">
              <div className="text-4xl mb-4">🏢</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Administrador</h2>
              <p className="text-gray-600 mb-6">
                Gerencie fluxo, demanda e performance das entregas do condomínio
              </p>
              <div className="space-y-3">
                <Link href="/register?type=admin" className="block">
                  <Button fullWidth variant="primary" size="lg">
                    Cadastro Admin
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button fullWidth variant="secondary" size="lg">
                    Já tem conta?
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecionando...</p>
        </div>
      )}

      {/* Features Section */}
      <div className="mt-16 max-w-4xl w-full px-4">
        <h3 className="text-2xl font-bold text-center mb-8 text-gray-800">
          Por que escolher Na Sua Porta?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h4 className="font-bold text-gray-800 mb-2">Rapidez</h4>
              <p className="text-gray-600 text-sm">
                Entregas rápidas e confiáveis em tempo real
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-4xl mb-3">😊</div>
              <h4 className="font-bold text-gray-800 mb-2">Facilidade</h4>
              <p className="text-gray-600 text-sm">
                Interface simples e intuitiva para todos
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-4xl mb-3">🏢</div>
              <h4 className="font-bold text-gray-800 mb-2">Confiabilidade</h4>
              <p className="text-gray-600 text-sm">
                Rastreamento em tempo real de cada entrega
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
