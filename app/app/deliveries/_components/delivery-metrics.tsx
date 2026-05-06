'use client';

import React from 'react';
import { Bike, History, MessageSquareText, PackageSearch } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/useSocket';

interface DeliveryMetricsProps {
  activeCount: number;
  totalCount: number;
  unreadChatCount: number;
}

export function DeliveryMetrics({ activeCount, totalCount, unreadChatCount }: DeliveryMetricsProps) {
  const { user } = useAuthStore();
  const { onlineDeliveryPeople } = useSocket(user?.id, user?.role, user?.condominiumId);

  const isResident = user?.role === 'RESIDENT';

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {isResident && (
        <StatCard
          label="Entregadores online"
          value={onlineDeliveryPeople}
          description="disponíveis agora"
          icon={Bike}
          tone="emerald"
          className="transition-transform duration-200 hover:-translate-y-1"
        />
      )}
      <StatCard
        label="Entregas ativas"
        value={activeCount}
        description={activeCount === 1 ? 'em andamento' : activeCount === 0 ? 'nenhuma no momento' : 'em andamento'}
        icon={PackageSearch}
        tone="amber"
        className="transition-transform duration-200 hover:-translate-y-1"
      />
      <StatCard
        label="Histórico total"
        value={totalCount}
        description={totalCount === 1 ? 'entrega realizada' : 'entregas realizadas'}
        icon={History}
        tone="violet"
        className="transition-transform duration-200 hover:-translate-y-1"
      />
      {isResident && unreadChatCount > 0 && (
        <StatCard
          label="Mensagens pendentes"
          value={unreadChatCount}
          description="aguardando sua leitura"
          icon={MessageSquareText}
          tone="sky"
          className="transition-transform duration-200 hover:-translate-y-1"
        />
      )}
    </div>
  );
}
