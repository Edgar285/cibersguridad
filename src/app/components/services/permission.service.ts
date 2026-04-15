import { Injectable, inject } from '@angular/core';
import { Auth } from './auth';

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

  /** Map<groupId, permission[]> — permisos asignados al usuario en cada grupo */
  private groupPermissions = new Map<string, string[]>();

  /** Grupo actualmente seleccionado */
  private currentGroupId: string | null = null;

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

    const token = this.auth.getToken();
    if (!token) return;

    fetch(`http://localhost:3000/api/v1/groups/${groupId}/members`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then((payload: { data?: { members?: { userId: string; permissions: string[] }[] } }) => {
        const user = this.auth.getCurrentUser();
        if (!user) return;
        const members: { userId: string; permissions: string[] }[] = payload?.data?.members ?? [];
        const myEntry = members.find(m => m.userId === user.id);
        if (myEntry) {
          this.groupPermissions.set(groupId, myEntry.permissions);
        }
      })
      .catch(() => { /* silencioso */ });
  }

  /**
   * Establece los permisos de un usuario en un grupo.
   */
  setGroupPermissionsForUser(groupId: string, userId: string, permissions: string[]): Promise<boolean> {
    const token = this.auth.getToken();
    if (!token) return Promise.resolve(false);

    return fetch(`http://localhost:3000/api/v1/groups/${groupId}/members/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ permissions })
    })
      .then(res => res.ok)
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
