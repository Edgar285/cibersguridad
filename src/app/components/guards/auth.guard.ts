import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { Auth } from '../services/auth';
import { Permission } from '../../models/permissions';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.isLogged()) {
    router.navigate(['/auth/login']);
    return false;
  }

  const required = (route.data['permissions'] as Permission[] | undefined) ?? [];
  const logic = (route.data['permissionLogic'] as 'any' | 'all' | undefined) ?? 'any';

  if (required.length) {
    const ok = logic === 'all' ? auth.hasPermissions(required) : auth.hasAnyPermission(required);
    if (!ok) {
      router.navigate(['/dashboard']);
      return false;
    }
  }

  return true;
};

