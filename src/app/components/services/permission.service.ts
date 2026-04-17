import { Injectable, inject, signal } from '@angular/core';
import { Auth } from './auth';
import { ApiService } from './api.service';

/**
 * PermissionService — servicio central de permisos.
 *
 * Expone:
 *  - hasPermission(permission: string): boolean
 *  - refreshPermissionsForGroup(groupId: string): void
 *
 * Soporta permisos globales del usuario Y permisos específicos por grupo.
 * Los permisos por grupo se almacenan en memoria; se refrescan llamando a
 * refreshPermissionsForGroup() al seleccionar un grupo.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(Auth);
  private readonly api = inject(ApiService);

  /** Map<groupId, permission[]> — permisos asignados al usuario en cada grupo */
  private groupPermissions = new Map<string, string[]>();

  /** Grupo actualmente seleccionado */
  private currentGroupId: string | null = null;

  /** Se incrementa cada vez que cambian los permisos del grupo activo */
  readonly groupPermsToken = signal(0);

  /**
   * Verifica si el usuario actual tiene el permiso indicado.
   * Comprueba permisos globales y, si hay un grupo activo, también los del grupo.
   */
  hasPermission(permission: string): boolean {
    const user = this.auth.getCurrentUser();
    if (!user) return false;

    // super-admin siempre tiene acceso
    if ((user.permissions as string[]).includes('super-admin')) return true;

    // Comprobar permisos globales del usuario
    if ((user.permissions as string[]).includes(permission)) return true;

    // Comprobar permisos específicos del grupo activo
    if (this.currentGroupId) {
      const groupPerms = this.groupPermissions.get(this.currentGroupId) ?? [];
      if (groupPerms.includes(permission)) return true;
    }

    return false;
  }

  /**
   * Carga / refresca los permisos del usuario para el grupo dado.
   * Llama al endpoint GET /api/v1/groups/:id/members para obtener los permisos
   * del usuario actual en ese grupo.
   */
  refreshPermissionsForGroup(groupId: string): void {
    this.currentGroupId = groupId;

    this.api.get<{ data: { members: { userId: string; permissions: string[] }[] } }>(`/groups/${groupId}/members`)
      .then((payload) => {
        const user = this.auth.getCurrentUser();
        if (!user) return;
        const members = payload?.data?.members ?? [];
        const myEntry = members.find(m => m.userId === user.id);
        this.groupPermissions.set(groupId, myEntry?.permissions ?? []);
        this.groupPermsToken.update(v => v + 1);
      })
      .catch(() => {
        this.groupPermissions.delete(groupId);
        this.groupPermsToken.update(v => v + 1);
        console.warn('[PermissionService] No se pudieron cargar permisos del grupo:', groupId);
      });
  }

  /**
   * Establece los permisos de un usuario en un grupo.
   */
  setGroupPermissionsForUser(groupId: string, userId: string, permissions: string[]): Promise<boolean> {
    return this.api.put(`/groups/${groupId}/members/${userId}`, { permissions })
      .then(() => true)
      .catch(() => false);
  }

  /** Devuelve el ID del grupo actualmente activo */
  getCurrentGroupId(): string | null {
    return this.currentGroupId;
  }

  /** Limpia permisos en caché (al hacer logout) */
  clear(): void {
    this.groupPermissions.clear();
    this.currentGroupId = null;
  }
}
