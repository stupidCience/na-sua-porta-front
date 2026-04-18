import type { LucideIcon } from 'lucide-react';
import { Bike, Building2, House, Store } from 'lucide-react';
import type { AccountModule, User, UserRole } from './store';

export const ACCOUNT_MODULE_META: Record<
  UserRole,
  {
    label: string;
    icon: LucideIcon;
    description: string;
    ctaLabel: string;
  }
> = {
  RESIDENT: {
    label: 'Morador',
    icon: House,
    description:
      'Solicite coletas, acompanhe entregas e acesse o marketplace interno com o mesmo cadastro.',
    ctaLabel: 'Entrar como morador',
  },
  DELIVERY_PERSON: {
    label: 'Entregador',
    icon: Bike,
    description:
      'Aceite entregas, acompanhe suas rotas e confirme recebimentos com mais agilidade.',
    ctaLabel: 'Entrar como entregador',
  },
  VENDOR: {
    label: 'Comerciante',
    icon: Store,
    description:
      'Cuide da sua loja, receba pedidos e acompanhe o atendimento sem trocar de conta.',
    ctaLabel: 'Entrar como comerciante',
  },
  CONDOMINIUM_ADMIN: {
    label: 'Condomínio',
    icon: Building2,
    description:
      'Acompanhe moradores, entregas e lojas do condomínio em um só lugar.',
    ctaLabel: 'Entrar no condomínio',
  },
};

export function getModuleLabel(role?: string | null) {
  if (!role) {
    return 'Conta';
  }

  return ACCOUNT_MODULE_META[role as UserRole]?.label ?? role;
}

export function getEnabledAccountModules(modules?: AccountModule[] | null) {
  return (modules ?? []).filter((module) => module.enabled);
}

export function getRecommendedProfileTab(user?: Pick<User, 'role' | 'modules'> | null) {
  if (!user) {
    return 'perfil';
  }

  if (user.role === 'CONDOMINIUM_ADMIN') {
    return 'condominio';
  }

  const residentModule = user.modules?.find((module) => module.module === 'RESIDENT');
  const residentMissing = residentModule?.missingRequirements ?? [];

  if (residentMissing.includes('condominio vinculado')) {
    return 'vinculo';
  }

  if (
    residentMissing.includes('apartamento') ||
    residentMissing.includes('bloco')
  ) {
    return 'endereco';
  }

  return 'perfil';
}

export function getProfileCompletionRoute(user?: Pick<User, 'role' | 'modules'> | null) {
  return `/profile?tab=${getRecommendedProfileTab(user)}`;
}