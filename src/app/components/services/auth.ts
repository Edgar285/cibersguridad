import { Injectable } from '@angular/core';
import { Permission } from '../../models/permissions';

export type User = {
  id: string;
  username: string;
  email: string;
  permissions: Permission[];
  fullName?: string | null;
  address?: string;
  phone?: string;
  birthdate?: string;
  isActive?: boolean;
};

type NewUser = {
  username: string;
  email: string;
  password: string;
  permissions?: Permission[];
  fullName?: string;
  address?: string;
  phone?: string;
  birthdate?: string;
};

type ApiEnvelope<T> = {
  statusCode: number;
  intOpCode: number;
  data: T & { message?: string };
};

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly apiBase = 'http://localhost:3000/api/v1/users';
  private readonly tokenKey = 'user-service-token';
  private readonly currentUserKey = 'user-service-current-user';
  private currentUser: User | null = this.loadCurrentUser();

  private loadCurrentUser(): User | null {
    const raw = localStorage.getItem(this.currentUserKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      localStorage.removeItem(this.currentUserKey);
      return null;
    }
  }

  private setSession(token: string, user: User) {
    // Token en cookie (SameSite=Strict, expira en 8 horas)
    const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${this.tokenKey}=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Strict`;
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    this.currentUser = user;
  }

  private updateCachedUser(user: User) {
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    this.currentUser = user;
  }

  private clearSession() {
    document.cookie = `${this.tokenKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
    localStorage.removeItem(this.currentUserKey);
    this.currentUser = null;
  }

  getToken(): string | null {
    const match = document.cookie.match(new RegExp('(?:^|; )' + this.tokenKey + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  private mapUser(user: Partial<User>): User {
    return {
      id: user.id ?? '',
      username: user.username?.trim() ?? '',
      email: user.email?.trim().toLowerCase() ?? '',
      permissions: (user.permissions ?? []) as Permission[],
      fullName: user.fullName ?? null,
      address: user.address,
      phone: user.phone,
      birthdate: user.birthdate,
      isActive: user.isActive
    };
  }

  private async request<T>(path: string, init?: RequestInit, auth = false): Promise<ApiEnvelope<T>> {
    const headers = new Headers(init?.headers ?? {});
    headers.set('Content-Type', 'application/json');

    if (auth) {
      const token = this.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers
    });

    const payload = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok) {
      throw new Error(payload.data?.message ?? 'Error de comunicación con la API');
    }

    return payload;
  }

  async login(userOrEmail: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const payload = await this.request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ userOrEmail, password })
      });

      this.setSession(payload.data.token, this.mapUser(payload.data.user));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Credenciales incorrectas' };
    }
  }

  async register(user: NewUser): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: user.username,
          email: user.email,
          password: user.password,
          fullName: user.fullName
        })
      });

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudo registrar' };
    }
  }

  async updateCurrentUser(payload: Partial<User>): Promise<{ ok: boolean; error?: string }> {
    try {
      const result = await this.request<{ user: User }>(
        '/profile',
        {
          method: 'PATCH',
          body: JSON.stringify({
            username: payload.username,
            email: payload.email,
            fullName: payload.fullName
          })
        },
        true
      );

      this.updateCachedUser({
        ...this.currentUser,
        ...this.mapUser(result.data.user),
        address: payload.address ?? this.currentUser?.address,
        phone: payload.phone ?? this.currentUser?.phone,
        birthdate: payload.birthdate ?? this.currentUser?.birthdate
      } as User);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudo actualizar el perfil' };
    }
  }

  async deleteCurrentUser(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.request<{ message: string }>('/profile', { method: 'DELETE' }, true);
      this.clearSession();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudo eliminar la cuenta' };
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getLastUser(): User | null {
    return this.currentUser;
  }

  async listUsers(): Promise<User[]> {
    try {
      const result = await this.request<{ users: User[] }>('/admin/users', { method: 'GET' }, true);
      return result.data.users.map(user => this.mapUser(user));
    } catch {
      return [];
    }
  }

  async createUser(user: NewUser): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.request<{ user: User }>(
        '/admin/users',
        {
          method: 'POST',
          body: JSON.stringify({
            username: user.username,
            email: user.email,
            password: user.password,
            fullName: user.fullName,
            permissions: user.permissions ?? []
          })
        },
        true
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudo crear el usuario' };
    }
  }

  async updateUser(
    userId: string,
    payload: Partial<User> & { password?: string }
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.request<{ user: User }>(
        `/admin/users/${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            username: payload.username,
            email: payload.email,
            fullName: payload.fullName,
            password: payload.password,
            permissions: payload.permissions ?? []
          })
        },
        true
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudo actualizar el usuario' };
    }
  }

  async deleteUser(userId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.request<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' }, true);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudo eliminar el usuario' };
    }
  }

  isLogged() {
    return !!this.getToken() && !!this.currentUser;
  }

  hasPermission(permission: string): boolean {
    const current = this.getCurrentUser();
    if (!current) return false;
    return (current.permissions as string[]).includes(permission);
  }

  hasPermissions(required: Permission[]) {
    const current = this.getCurrentUser();
    if (!current) return false;
    if (!required.length) return true;
    const set = new Set(current.permissions ?? []);
    return required.every(p => set.has(p));
  }

  hasAnyPermission(required: Permission[]) {
    const current = this.getCurrentUser();
    if (!current) return false;
    if (!required.length) return true;
    const set = new Set(current.permissions ?? []);
    return required.some(p => set.has(p));
  }

  getPermissions(): Permission[] {
    return this.getCurrentUser()?.permissions ?? [];
  }

  logout() {
    this.clearSession();
  }
}
