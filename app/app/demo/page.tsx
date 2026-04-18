'use client';

import React from 'react';
import { Activity, Building2, Radar } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <PageHeader
        eyebrow="Demonstração comercial"
        title="Na Sua Porta para o seu condomínio"
        description="Transforme pedidos e entregas em uma experiência simples, rastreável e previsível para moradores, portaria e administração."
      />

      <div className="content-grid-auto">
        <StatCard label="Atendimento ágil" value="Mais fluidez" description="Menos espera na portaria e mais praticidade no dia a dia." icon={Activity} tone="amber" />
        <StatCard label="Atualizações ao vivo" value="Acompanhamento claro" description="Moradores e entregadores acompanham cada etapa do pedido." icon={Radar} tone="sky" />
        <StatCard label="Gestão mais simples" value="Decisão objetiva" description="Indicadores ajudam o condomínio a manter um serviço melhor." icon={Building2} tone="emerald" />
      </div>

      <Card className="rounded-[28px] p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[var(--color-secondary)] mb-2">Solicitar demonstração</h2>
        <p className="text-sm leading-6 text-[var(--color-foreground-soft)] mb-4">
            Entre em contato para agendar uma apresentação do sistema para sua equipe.
        </p>
        <a
          href="mailto:contato@nasuaporta.app?subject=Solicitar%20demonstracao%20-%20Na%20Sua%20Porta"
          className="inline-block"
        >
          <Button size="lg">Solicitar demonstração</Button>
        </a>
      </Card>
    </div>
  );
}
