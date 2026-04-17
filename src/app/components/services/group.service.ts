import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

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
  private readonly api = inject(ApiService);
  private _groups = signal<Group[]>([]);

  list(): Group[] {
    return this._groups();
  }

  get(id: string): Group | null {
    return this._groups().find(g => g.id === id) ?? null;
  }

  async load(): Promise<void> {
    try {
      const payload = await this.api.get<{ data: { groups: Group[] } }>('/groups');
      this._groups.set(payload?.data?.groups ?? []);
    } catch (err) {
      console.error('[GroupService] Error al cargar grupos:', err);
    }
  }

  async create(payload: GroupInput): Promise<Group> {
    const data = await this.api.post<{ data: { group: Group } }>('/groups', payload);
    const group: Group = data?.data?.group;
    this._groups.set([...this._groups(), group]);
    return group;
  }

  async update(id: string, payload: Partial<GroupInput>): Promise<Group> {
    const data = await this.api.patch<{ data: { group: Group } }>(`/groups/${id}`, payload);
    const group: Group = data?.data?.group;
    this._groups.set(this._groups().map(g => g.id === id ? group : g));
    return group;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.api.delete(`/groups/${id}`);
      this._groups.set(this._groups().filter(g => g.id !== id));
      return true;
    } catch { return false; }
  }

  async getMembers(groupId: string): Promise<GroupMemberRecord[]> {
    try {
      const payload = await this.api.get<{ data: { members: GroupMemberRecord[] } }>(`/groups/${groupId}/members`);
      return payload?.data?.members ?? [];
    } catch { return []; }
  }

  async setMemberPermissions(groupId: string, userId: string, permissions: string[]): Promise<boolean> {
    try {
      await this.api.put(`/groups/${groupId}/members/${userId}`, { permissions });
      return true;
    } catch { return false; }
  }

  async removeMember(groupId: string, userId: string): Promise<boolean> {
    try {
      await this.api.delete(`/groups/${groupId}/members/${userId}`);
      return true;
    } catch { return false; }
  }
}

