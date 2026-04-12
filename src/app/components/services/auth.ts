import { Injectable } from '@angular/core';
import { ADMIN_PERMISSIONS, DEFAULT_USER_PERMISSIONS, Permission, SUPERADMIN_PERMISSIONS } from '../../models/permissions';

type User = {
  username: string;
  email: string;
  password: string;
  permissions: Permission[];
  fullName?: string;
  address?: string;
  phone?: string;
  birthdate?: string;
};

type NewUser = Omit<User, 'permissions'> & { permissions?: Permission[] };

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly storeKey = 'users';
  private readonly tokenKey = 'token';
  private readonly hardcodedUsers: User[] = [
    {
      username: 'Edgy',
      email: 'edu@mail.com',
      password: this.hashPassword('1234567E@'),
      permissions: ADMIN_PERMISSIONS
    },
    {
      username: 'superAdmin',
      email: 'super@erp.com',
      password: this.hashPassword('Super123!'),
      permissions: SUPERADMIN_PERMISSIONS
    }
  ];
  private users: User[] = [...this.hardcodedUsers];

  constructor() {
    this.load();
  }

  private load() {
    const saved = localStorage.getItem(this.storeKey);
    const map = new Map<string, User>();

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as User[];
        for (const user of parsed) {
          map.set(this.key(user), this.normalize(user));
        }
      } catch {
        // Si el JSON está corrupto, lo ignoramos y reconstruimos.
        localStorage.removeItem(this.storeKey);
      }
    }

    // Primero los guardados válidos, después los hardcodeados para que estos últimos prevalezcan.
    for (const seed of this.hardcodedUsers) {
      map.set(this.key(seed), this.normalize(seed));
    }

    this.users = Array.from(map.values());
    this.persist();
  }

  private persist() {
    localStorage.setItem(this.storeKey, JSON.stringify(this.users));
  }

  private key(user: Pick<User, 'username' | 'email'>) {
    return `${user.username.toLowerCase()}|${user.email.toLowerCase()}`;
  }

  private normalize(user: User): User {
    // Permisos válidos = solo los que siguen existiendo en el enum Permission.
    // Si el profe borra un permiso del enum, aquí se purga del localStorage
    // automáticamente y la directiva *appHasPermission deja de mostrarlo.
    const validPerms = new Set<string>(Object.values(Permission));
    const pruned = (user.permissions ?? []).filter(p => validPerms.has(p as string)) as Permission[];

    return {
      ...user,
      username: user.username.trim(),
      email: user.email.trim().toLowerCase(),
      fullName: user.fullName?.trim(),
      address: user.address?.trim(),
      phone: user.phone?.trim(),
      password: user.password,
      permissions: pruned.length ? pruned : [...DEFAULT_USER_PERMISSIONS]
    };
  }

  private hashPassword(value: string) {
    // No es seguro para producción; evita guardar en claro mientras no hay backend.
    return btoa(`erp-${value}-salt`);
  }

  login(userOrEmail: string, password: string): { ok: boolean; error?: string } {
    const u = userOrEmail.toLowerCase().trim();
    const hashed = this.hashPassword(password);

    const found = this.users.find(
      x => (x.username.toLowerCase() === u || x.email.toLowerCase() === u) && x.password === hashed
    );

    if (!found) return { ok: false, error: 'Credenciales incorrectas' };

    localStorage.setItem(this.tokenKey, found.email);
    return { ok: true };
  }

  register(user: NewUser): { ok: boolean; error?: string } {
    const normalized = this.normalize({ ...user, permissions: user.permissions ?? DEFAULT_USER_PERMISSIONS });
    const duplicate = this.users.some(
      x => x.username.toLowerCase() === normalized.username.toLowerCase() || x.email === normalized.email
    );

    if (duplicate) return { ok: false, error: 'Usuario o email ya registrado' };

    this.users.push({ ...normalized, password: this.hashPassword(normalized.password) });
    this.persist();
    return { ok: true };
  }

  updateCurrentUser(payload: Partial<User>): { ok: boolean; error?: string } {
    const current = this.getCurrentUser();
    if (!current) return { ok: false, error: 'Sesión no válida' };

    const idx = this.users.findIndex(u => u.email === current.email);
    if (idx < 0) return { ok: false, error: 'Usuario no encontrado' };

    const updated = this.normalize({
      ...current,
      ...payload,
      password: current.password,
      permissions: payload.permissions ?? current.permissions
    });

    // Verificar colisiones de email/username si cambian
    const collision = this.users.some(
      (u, i) =>
        i !== idx &&
        (u.email.toLowerCase() === updated.email.toLowerCase() ||
          u.username.toLowerCase() === updated.username.toLowerCase())
    );
    if (collision) return { ok: false, error: 'Email o usuario en uso' };

    this.users[idx] = updated;
    this.persist();
    localStorage.setItem(this.tokenKey, updated.email);
    return { ok: true };
  }

  deleteCurrentUser(): { ok: boolean; error?: string } {
    const current = this.getCurrentUser();
    if (!current) return { ok: false, error: 'Sesión no válida' };

    this.users = this.users.filter(u => u.email !== current.email);
    this.persist();
    this.logout();
    return { ok: true };
  }

  getCurrentUser(): User | null {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return null;
    return this.users.find(u => u.email === token) ?? null;
  }

  getLastUser(): User | null {
    if (!this.users.length) return null;
    return this.users[this.users.length - 1];
  }

  listUsers(): User[] {
    return [...this.users];
  }

  createUser(user: NewUser): { ok: boolean; error?: string } {
    const normalized = this.normalize({ ...user, permissions: user.permissions ?? DEFAULT_USER_PERMISSIONS });
    const duplicate = this.users.some(
      x => x.username.toLowerCase() === normalized.username.toLowerCase() || x.email === normalized.email
    );
    if (duplicate) return { ok: false, error: 'Usuario o email ya registrado' };
    this.users.push({ ...normalized, password: this.hashPassword(normalized.password) });
    this.persist();
    return { ok: true };
  }

  updateUser(email: string, payload: Partial<User>): { ok: boolean; error?: string } {
    const idx = this.users.findIndex(u => u.email === email);
    if (idx < 0) return { ok: false, error: 'Usuario no encontrado' };
    const current = this.users[idx];
    const updated = this.normalize({
      ...current,
      ...payload,
      password: payload.password ? this.hashPassword(payload.password) : current.password,
      permissions: payload.permissions ?? current.permissions
    });
    const collision = this.users.some(
      (u, i) =>
        i !== idx &&
        (u.email.toLowerCase() === updated.email.toLowerCase() ||
          u.username.toLowerCase() === updated.username.toLowerCase())
    );
    if (collision) return { ok: false, error: 'Email o usuario en uso' };
    this.users[idx] = updated;
    this.persist();
    const token = localStorage.getItem(this.tokenKey);
    if (token && token === email) localStorage.setItem(this.tokenKey, updated.email);
    return { ok: true };
  }

  deleteUser(email: string): { ok: boolean; error?: string } {
    const target = this.users.find(u => u.email === email);
    if (!target) return { ok: false, error: 'Usuario no encontrado' };
    if (target.username.toLowerCase() === 'superadmin') return { ok: false, error: 'No puedes eliminar al superAdmin' };
    this.users = this.users.filter(u => u.email !== email);
    this.persist();
    const token = localStorage.getItem(this.tokenKey);
    if (token === email) this.logout();
    return { ok: true };
  }

  isLogged() {
    const token = localStorage.getItem(this.tokenKey);
    return !!token && !!this.users.find(u => u.email === token);
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
    const current = this.getCurrentUser();
    return current?.permissions ?? [];
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
  }
}
