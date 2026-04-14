'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function DemoPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Na Sua Porta para o seu condomínio</h1>
          <p className="text-gray-600 mt-2">
            Transforme o fluxo de entregas em uma operação simples, rastreável e sem confusão.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <p className="text-2xl mb-2">⚡</p>
            <p className="font-semibold text-gray-800">Operação ágil</p>
            <p className="text-sm text-gray-600 mt-1">Menos tempo de espera na portaria e mais eficiência diária.</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
            <p className="text-2xl mb-2">📡</p>
            <p className="font-semibold text-gray-800">Tempo real</p>
            <p className="text-sm text-gray-600 mt-1">Moradores e entregadores acompanham tudo ao vivo.</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="font-semibold text-gray-800">Métricas claras</p>
            <p className="text-sm text-gray-600 mt-1">Dados para melhorar continuamente o serviço do condomínio.</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-5 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Solicitar demonstração</h2>
          <p className="text-sm text-gray-600 mb-4">
            Entre em contato para agendar uma apresentação do sistema para sua equipe.
          </p>
          <a
            href="mailto:contato@nasuaporta.app?subject=Solicitar%20demonstracao%20-%20Na%20Sua%20Porta"
            className="inline-block"
          >
            <Button size="lg">Solicitar demonstração</Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
