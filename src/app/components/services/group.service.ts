import { Injectable } from '@angular/core';

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

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly storeKey = 'erp-groups';
  private cache: Group[] = [];

  constructor() {
    this.cache = this.load();
  }

  list(): Group[] {
    return [...this.cache];
  }

  get(id: string): Group | null {
    return this.cache.find(g => g.id === id) ?? null;
  }

  create(payload: GroupInput): Group {
    const now = new Date().toISOString();
    const group: Group = {
      ...payload,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: now,
      updatedAt: now
    };

    this.cache = [...this.cache, group];
    this.persist();
    return group;
  }

  update(id: string, payload: Partial<GroupInput>): Group | null {
    const idx = this.cache.findIndex(g => g.id === id);
    if (idx < 0) return null;

    const updated: Group = {
      ...this.cache[idx],
      ...payload,
      updatedAt: new Date().toISOString()
    };

    this.cache = [...this.cache.slice(0, idx), updated, ...this.cache.slice(idx + 1)];
    this.persist();
    return updated;
  }

  delete(id: string): boolean {
    const before = this.cache.length;
    this.cache = this.cache.filter(g => g.id !== id);
    this.persist();
    return this.cache.length !== before;
  }

  private load(): Group[] {
    const saved = localStorage.getItem(this.storeKey);
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved) as Group[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist() {
    localStorage.setItem(this.storeKey, JSON.stringify(this.cache));
  }
}
