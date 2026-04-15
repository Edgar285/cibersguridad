import { Injectable, inject, signal } from '@angular/core';
import {
  Ticket,
  TicketComment,
  TicketInput,
  TicketPriority,
  TicketStatus
} from '../../models/ticket';
import { Auth } from './auth';

const PRIORITY_ORDER: TicketPriority[] = [
  'supremo',
  'critico',
  'alto',
  'medio',
  'bajo',
  'muy_bajo',
  'observacion'
];

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly apiBase = 'http://localhost:3000/api/v1/tickets';
  private readonly auth = inject(Auth);
  private cache = signal<Ticket[]>([]);

  // ── Sync reads (from cache) ────────────────────────────────────

  listByGroup(groupId: string): Ticket[] {
    return this.cache().filter(t => t.groupId === groupId);
  }

  get(id: string): Ticket | null {
    return this.cache().find(t => t.id === id) ?? null;
  }

  // ── Async backend operations ──────────────────────────────────

  async loadByGroup(groupId: string): Promise<void> {
    const token = this.auth.getToken();
    if (!token) return;
    try {
      const res = await fetch(`${this.apiBase}?groupId=${encodeURIComponent(groupId)}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) return;
      const payload = await res.json();
      const tickets: Ticket[] = payload?.data?.tickets ?? [];
      const other = this.cache().filter(t => t.groupId !== groupId);
      this.cache.set([...other, ...tickets]);
    } catch { /* silencioso */ }
  }

  async loadOne(id: string): Promise<Ticket | null> {
    const token = this.auth.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${this.apiBase}/${id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) return null;
      const payload = await res.json();
      const ticket: Ticket = payload?.data?.ticket;
      if (ticket) {
        const other = this.cache().filter(t => t.id !== id);
        this.cache.set([...other, ticket]);
      }
      return ticket ?? null;
    } catch { return null; }
  }

  async create(groupId: string, author: string, input: TicketInput): Promise<Ticket> {
    const token = this.auth.getToken();
    const res = await fetch(this.apiBase, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        status: input.status ?? 'pending',
        priority: input.priority ?? 'medio',
        groupId,
        assignedTo: input.assignedTo,
        dueDate: input.dueDate
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.data?.message ?? 'Error al crear ticket');
    const ticket: Ticket = data?.data?.ticket;
    this.cache.set([...this.cache(), ticket]);
    return ticket;
  }

  async update(id: string, changes: Partial<Ticket>, _actor?: string): Promise<Ticket | null> {
    const token = this.auth.getToken();
    const { status, ...rest } = changes as Partial<Ticket> & { status?: TicketStatus };
    let ticket: Ticket | null = null;

    if (status !== undefined) {
      const res = await fetch(`${this.apiBase}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.data?.message ?? 'Error al actualizar estado');
      ticket = data?.data?.ticket;
    }

    if (Object.keys(rest).length > 0) {
      const res = await fetch(`${this.apiBase}/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(rest)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.data?.message ?? 'Error al actualizar ticket');
      ticket = data?.data?.ticket;
    }

    if (ticket) {
      const other = this.cache().filter(t => t.id !== id);
      this.cache.set([...other, ticket]);
    }
    return ticket;
  }

  async delete(id: string): Promise<boolean> {
    const token = this.auth.getToken();
    const res = await fetch(`${this.apiBase}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) return false;
    this.cache.set(this.cache().filter(t => t.id !== id));
    return true;
  }

  async addComment(ticketId: string, comment: Omit<TicketComment, 'id' | 'at'>): Promise<void> {
    const token = this.auth.getToken();
    await fetch(`${this.apiBase}/${ticketId}/comments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    await this.loadOne(ticketId);
  }

  statuses(): { label: string; value: TicketStatus }[] {
    return [
      { label: 'Pendiente', value: 'pending' },
      { label: 'En progreso', value: 'in_progress' },
      { label: 'Revisión', value: 'review' },
      { label: 'Hecho', value: 'done' },
      { label: 'Bloqueado', value: 'blocked' }
    ];
  }

  priorities(): TicketPriority[] {
    return [...PRIORITY_ORDER];
  }
}
