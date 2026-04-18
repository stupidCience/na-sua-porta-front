import type { User } from './store';

export function getDefaultRouteForUser(role?: string, isVendor?: boolean) {
  if (role === 'VENDOR' || isVendor) {
    return '/vendor/orders';
  }

  if (role === 'CONDOMINIUM_ADMIN') {
    return '/admin';
  }

  if (role === 'RESIDENT') {
    return '/deliveries';
  }

  return '/deliveries/available';
}

export function getPostAuthLandingRoute(_user?: Pick<User, 'role' | 'modules'> | null) {
  return '/ambientes';
}