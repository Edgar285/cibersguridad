import { Injectable, signal } from '@angular/core';
import {
  Ticket,
  TicketComment,
  TicketHistoryEntry,
  TicketInput,
  TicketPriority,
  TicketStatus
} from '../../models/ticket';

interface SeedGroupTickets {
  groupId: string;
  tickets: TicketInput[];
}

const PRIORITY_ORDER: TicketPriority[] = [
  'supremo',
  'critico',
  'alto',
  'medio',
  'bajo',
  'muy_bajo',
  'observacion'
];

const LEGACY_PRIORITY_MAP: Record<string, TicketPriority> = {
  至尊: 'supremo',
  '紧急': 'critico',
  '高': 'alto',
  '中': 'medio',
  '低': 'bajo',
  '很低': 'muy_bajo',
  '观察': 'observacion'
};

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
      priority: input.priority ?? 'medio',
      createdAt: now,
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      groupId,
      author,
      comments: [],
      history: [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          field: 'status',
          from: undefined,
          to: input.status ?? 'pending',
          at: now,
          author
        }
      ]
    };

    this.cache.set([...this.cache(), ticket]);
    this.persist();
    return ticket;
  }

  update(id: string, changes: Partial<Ticket>, actor?: string): Ticket | null {
    const idx = this.cache().findIndex(t => t.id === id);
    if (idx < 0) return null;
    const current = this.cache()[idx];
    const updated = { ...current, ...changes } as Ticket;
    const at = new Date().toISOString();

    const history: TicketHistoryEntry[] = [];
    const track = (
      field: TicketHistoryEntry['field'],
      fromVal?: string,
      toVal?: string
    ) => {
      if (fromVal === toVal) return;
      history.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        field,
        from: fromVal,
        to: toVal,
        at,
        author: actor
      });
    };

    track('status', current.status, updated.status);
    track('priority', current.priority, updated.priority);
    track('assignedTo', current.assignedTo, updated.assignedTo);
    track('dueDate', current.dueDate, updated.dueDate);
    track('title', current.title, updated.title);
    track('description', current.description, updated.description);

    updated.history = [...(current.history ?? []), ...history];
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

  addComment(ticketId: string, comment: Omit<TicketComment, 'id' | 'at'>) {
    const idx = this.cache().findIndex(t => t.id === ticketId);
    if (idx < 0) return null;
    const now = new Date().toISOString();
    const nextComment: TicketComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: now,
      ...comment
    };
    const target = this.cache()[idx];
    const next = { ...target, comments: [...(target.comments ?? []), nextComment] } as Ticket;
    this.cache.set([...this.cache().slice(0, idx), next, ...this.cache().slice(idx + 1)]);
    this.persist();
    return nextComment;
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
            priority: 'critico',
            assignedTo: 'edgy@erp.com'
          },
          {
            title: 'Demo semanal',
            description: 'Coordinar agenda con cliente clave',
            status: 'in_progress',
            priority: 'medio',
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
            priority: 'alto',
            assignedTo: 'super@erp.com'
          },
          {
            title: 'Actualizar agentes EDR',
            description: 'EDR desactualizado en 30 equipos',
            status: 'in_progress',
            priority: 'bajo'
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
          priority: t.priority ?? 'medio',
          createdAt: now,
          dueDate: undefined,
          assignedTo: t.assignedTo,
          groupId: seed.groupId,
          author: 'system',
          comments: [],
          history: [
            {
              id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              field: 'status',
              from: undefined,
              to: t.status ?? 'pending',
              at: now,
              author: 'system'
            }
          ]
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
      if (!Array.isArray(parsed)) return [];
      // Normaliza tickets antiguos sin comentarios/historial y convierte prioridades legacy
      return parsed.map(t => {
        const legacy = LEGACY_PRIORITY_MAP[(t as any).priority as string];
        const priority = legacy ?? (PRIORITY_ORDER.includes(t.priority as TicketPriority) ? (t.priority as TicketPriority) : 'medio');
        return {
          ...t,
          priority,
          comments: t.comments ?? [],
          history: t.history ?? []
        } as Ticket;
      });
    } catch {
      return [];
    }
  }

  private persist() {
    localStorage.setItem(this.storeKey, JSON.stringify(this.cache()));
  }
}
