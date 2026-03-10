import { Injectable, signal } from '@angular/core';
import { Ticket, TicketInput, TicketPriority, TicketStatus } from '../../models/ticket';

interface SeedGroupTickets {
  groupId: string;
  tickets: TicketInput[];
}

const PRIORITY_ORDER: TicketPriority[] = ['至尊', '紧急', '高', '中', '低', '很低', '观察'];

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly storeKey = 'erp-tickets';
  private cache = signal<Ticket[]>([]);

  constructor() {
    const loaded = this.load();
    if (!loaded.length) {
      this.seed();
    } else {
      this.cache.set(loaded);
    }
  }

  listByGroup(groupId: string) {
    return this.cache().filter(t => t.groupId === groupId);
  }

  get(id: string) {
    return this.cache().find(t => t.id === id) ?? null;
  }

  create(groupId: string, author: string, input: TicketInput): Ticket {
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: input.title,
      description: input.description,
      status: input.status ?? 'pending',
      priority: input.priority ?? '中',
      createdAt: now,
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      groupId,
      author
    };

    this.cache.set([...this.cache(), ticket]);
    this.persist();
    return ticket;
  }

  update(id: string, changes: Partial<Ticket>): Ticket | null {
    const idx = this.cache().findIndex(t => t.id === id);
    if (idx < 0) return null;
    const updated = { ...this.cache()[idx], ...changes } as Ticket;
    const next = [...this.cache()];
    next[idx] = updated;
    this.cache.set(next);
    this.persist();
    return updated;
  }

  delete(id: string) {
    const before = this.cache().length;
    this.cache.set(this.cache().filter(t => t.id !== id));
    this.persist();
    return this.cache().length !== before;
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

  private seed() {
    const seeds: SeedGroupTickets[] = [
      {
        groupId: 'seed-ventas',
        tickets: [
          {
            title: 'Onboard nueva cuenta',
            description: 'Configurar CRM y dashboards de ventas',
            status: 'pending',
            priority: '紧急',
            assignedTo: 'edgy@erp.com'
          },
          {
            title: 'Demo semanal',
            description: 'Coordinar agenda con cliente clave',
            status: 'in_progress',
            priority: '中',
            assignedTo: 'ana@erp.com'
          }
        ]
      },
      {
        groupId: 'seed-ti',
        tickets: [
          {
            title: 'Incidente VPN',
            description: 'Cortes aleatorios en VPN corporativa',
            status: 'review',
            priority: '高',
            assignedTo: 'super@erp.com'
          },
          {
            title: 'Actualizar agentes EDR',
            description: 'EDR desactualizado en 30 equipos',
            status: 'in_progress',
            priority: '低'
          }
        ]
      }
    ];

    const now = new Date().toISOString();
    const all: Ticket[] = [];
    for (const seed of seeds) {
      for (const t of seed.tickets) {
        all.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          title: t.title,
          description: t.description,
          status: t.status ?? 'pending',
          priority: t.priority ?? '中',
          createdAt: now,
          dueDate: undefined,
          assignedTo: t.assignedTo,
          groupId: seed.groupId,
          author: 'system'
        });
      }
    }
    this.cache.set(all);
    this.persist();
  }

  private load(): Ticket[] {
    const saved = localStorage.getItem(this.storeKey);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as Ticket[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist() {
    localStorage.setItem(this.storeKey, JSON.stringify(this.cache()));
  }
}
