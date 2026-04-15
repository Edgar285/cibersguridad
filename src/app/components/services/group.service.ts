import { Injectable, inject, signal } from '@angular/core';
import { Auth } from './auth';

export type GroupState = 'success' | 'agree' | 'x';

export interface Group {
  id: string;
  nivel: string;
  actor: string;
  nombre: string;
  integrantes: number;
  tickets: number;
  descripcion: string;
  estado: GroupState;
  createdAt: string;
  updatedAt: string;
}

export interface GroupInput {
  nivel: string;
  actor: string;
  nombre: string;
  integrantes: number;
  tickets: number;
  descripcion: string;
  estado: GroupState;
}

export interface GroupMemberRecord {
  userId: string;
  permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly apiBase = 'http://localhost:3000/api/v1/groups';
  private readonly auth = inject(Auth);
  private _groups = signal<Group[]>([]);

  list(): Group[] {
    return this._groups();
  }

  get(id: string): Group | null {
    return this._groups().find(g => g.id === id) ?? null;
  }

  async load(): Promise<void> {
    const token = this.auth.getToken();
    if (!token) return;
    try {
      const res = await fetch(this.apiBase, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) return;
      const payload = await res.json();
      const groups: Group[] = payload?.data?.groups ?? [];
      this._groups.set(groups);
    } catch { /* silencioso */ }
  }

  async create(payload: GroupInput): Promise<Group> {
    const token = this.auth.getToken();
    const res = await fetch(this.apiBase, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.data?.message ?? 'Error al crear grupo');
    const group: Group = data?.data?.group;
    this._groups.set([...this._groups(), group]);
    return group;
  }

  async update(id: string, payload: Partial<GroupInput>): Promise<Group> {
    const token = this.auth.getToken();
    const res = await fetch(`${this.apiBase}/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.data?.message ?? 'Error al actualizar grupo');
    const group: Group = data?.data?.group;
    this._groups.set(this._groups().map(g => g.id === id ? group : g));
    return group;
  }

  async delete(id: string): Promise<boolean> {
    const token = this.auth.getToken();
    const res = await fetch(`${this.apiBase}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) return false;
    this._groups.set(this._groups().filter(g => g.id !== id));
    return true;
  }

  async getMembers(groupId: string): Promise<GroupMemberRecord[]> {
    const token = this.auth.getToken();
    if (!token) return [];
    try {
      const res = await fetch(`${this.apiBase}/${groupId}/members`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) return [];
      const payload = await res.json();
      return payload?.data?.members ?? [];
    } catch { return []; }
  }

  async setMemberPermissions(groupId: string, userId: string, permissions: string[]): Promise<boolean> {
    const token = this.auth.getToken();
    if (!token) return false;
    try {
      const res = await fetch(`${this.apiBase}/${groupId}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      });
      return res.ok;
    } catch { return false; }
  }

  async removeMember(groupId: string, userId: string): Promise<boolean> {
    const token = this.auth.getToken();
    if (!token) return false;
    try {
      const res = await fetch(`${this.apiBase}/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return res.ok;
    } catch { return false; }
  }
}
