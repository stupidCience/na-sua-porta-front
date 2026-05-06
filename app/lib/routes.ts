import type { AccountModule, User, UserRole } from './store';

export function getDefaultRouteForUser(role?: string, isVendor?: boolean) {
  if (role === 'VENDOR' || isVendor) {
    return '/comercio';
  }

  if (role === 'CONDOMINIUM_ADMIN') {
    return '/admin';
  }

  if (role === 'RESIDENT') {
    return '/morador';
  }

  return '/entregador';
}

/** Returns the role the user should operate as by default after login.
 *  Priority: RESIDENT (if enabled) → first enabled module → null (no enabled modules). */
export function getSmartDefaultRole(
  user?: Pick<User, 'role' | 'modules'> | null,
): UserRole | null {
  if (!user) return null;
  const enabled = (user.modules ?? [] as AccountModule[]).filter((m) => m.enabled);
  if (enabled.length === 0) return null;
  const resident = enabled.find((m) => m.module === 'RESIDENT');
  if (resident) return 'RESIDENT';
  return enabled[0].module;
}

export function getPostAuthLandingRoute(user?: Pick<User, 'role' | 'modules'> | null) {
  const role = getSmartDefaultRole(user);
  if (!role) return '/ambientes';
  return getDefaultRouteForUser(role);
}