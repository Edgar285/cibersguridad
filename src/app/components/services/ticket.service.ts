import { Injectable, inject, signal } from '@angular/core';
import {
  Ticket,
  TicketComment,
  TicketInput,
  TicketPriority,
  TicketStatus
} from '../../models/ticket';
import { ApiService } from './api.service';

const PRIORITY_ORDER: TicketPriority[] = [
  'supremo',
  'critico',
  'alto',
  'medio',
  'bajo',
  'muy_bajo',
  'observacion'
];

type Envelope<T> = { statusCode: number; intOpCode: number; data: T };

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly api = inject(ApiService);
  private cache = signal<Ticket[]>([]);

  // ── Sync reads (from cache) ────────────────────────────────────

  listByGroup(groupId: string): Ticket[] {
    const seen = new Set<string>();
    return this.cache().filter(t => {
      if (t.groupId !== groupId || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }

  get(id: string): Ticket | null {
    return this.cache().find(t => t.id === id) ?? null;
  }

  // ── Async backend operations ──────────────────────────────────

  async loadByGroup(groupId: string): Promise<void> {
    try {
      const payload = await this.api.get<Envelope<{ tickets: Ticket[] }>>(`/tickets?groupId=${encodeURIComponent(groupId)}`);
      const tickets: Ticket[] = payload?.data?.tickets ?? [];
      // Reemplazar tickets del grupo en caché (evita duplicados)
      const other = this.cache().filter(t => t.groupId !== groupId);
      this.cache.set([...other, ...tickets]);
    } catch { /* silencioso */ }
  }

  async loadOne(id: string): Promise<Ticket | null> {
    try {
      const payload = await this.api.get<Envelope<{ ticket: Ticket }>>(`/tickets/${id}`);
      const ticket: Ticket = payload?.data?.ticket;
      if (ticket) {
        const other = this.cache().filter(t => t.id !== id);
        this.cache.set([...other, ticket]);
      }
      return ticket ?? null;
    } catch { return null; }
  }

  async create(groupId: string, author: string, input: TicketInput): Promise<Ticket> {
    const payload = await this.api.post<Envelope<{ ticket: Ticket }>>('/tickets', {
      title: input.title,
      description: input.description,
      status: input.status ?? 'pending',
      priority: input.priority ?? 'medio',
      groupId,
      author,
      assignedTo: input.assignedTo,
      dueDate: input.dueDate
    });
    const ticket: Ticket = payload?.data?.ticket;
    // Agregar a caché solo si no existe ya (evita duplicados)
    if (ticket && !this.cache().find(t => t.id === ticket.id)) {
      this.cache.set([...this.cache(), ticket]);
    }
    return ticket;
  }

  async update(id: string, changes: Partial<Ticket>, _actor?: string): Promise<Ticket | null> {
    const { status, ...rest } = changes as Partial<Ticket> & { status?: TicketStatus };
    let ticket: Ticket | null = null;

    if (status !== undefined) {
      const data = await this.api.patch<Envelope<{ ticket: Ticket }>>(`/tickets/${id}/status`, { status });
      ticket = data?.data?.ticket ?? null;
    }

    if (Object.keys(rest).length > 0) {
      const data = await this.api.patch<Envelope<{ ticket: Ticket }>>(`/tickets/${id}`, rest);
      ticket = data?.data?.ticket ?? null;
    }

    if (ticket) {
      const other = this.cache().filter(t => t.id !== id);
      this.cache.set([...other, ticket]);
    }
    return ticket;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.api.delete(`/tickets/${id}`);
      this.cache.set(this.cache().filter(t => t.id !== id));
      return true;
    } catch { return false; }
  }

  async addComment(ticketId: string, comment: Omit<TicketComment, 'id' | 'at'>): Promise<void> {
    await this.api.post(`/tickets/${ticketId}/comments`, comment);
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

