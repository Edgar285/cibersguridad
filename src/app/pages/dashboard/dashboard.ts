import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { GroupContextService } from '../../components/services/group-context.service';
import { GroupService } from '../../components/services/group.service';
import { TicketService } from '../../components/services/ticket.service';
import { Ticket, TicketPriority, TicketStatus } from '../../models/ticket';
import { Auth } from '../../components/services/auth';
import { QuickFilters } from '../../components/filters/quick-filters';
import { HasPermissionDirective } from '../../components/directives/has-permission.directive';
import { PermissionService } from '../../components/services/permission.service';
import { Permission } from '../../models/permissions';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, RouterModule, CardModule, TagModule, TableModule, ProgressBarModule, SelectModule, DialogModule, ToastModule, ChartModule, MainLayout, QuickFilters, HasPermissionDirective],
  providers: [MessageService],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private ctx = inject(GroupContextService);
  private groups = inject(GroupService);
  private tickets = inject(TicketService);
  private router = inject(Router);
  private auth = inject(Auth);
  private msg = inject(MessageService);
  private permSvc = inject(PermissionService);

  protected permission = Permission;

  // Toggle de vista
  activeView = signal<'dashboard' | 'kanban'>('dashboard');

  // Kanban
  kanbanFilter = signal<string | null>(null);
  dialogVisible = false;
  selectedTicket = signal<Ticket | null>(null);
  dragged = signal<Ticket | null>(null);

  private get me(): string | undefined {
    return this.auth.getCurrentUser()?.email;
  }

  get isPrivileged(): boolean {
    return this.permSvc.hasPermission(Permission.TicketsEdit as string);
  }

  canEditTicket(ticket: Ticket): boolean {
    const isAdmin = this.permSvc.hasPermission(Permission.TicketsEdit as string);
    const canMove = this.permSvc.hasPermission(Permission.TicketsMove as string);
    return isAdmin || (canMove && ticket.assignedTo === this.me);
  }

  statuses = this.tickets.statuses();
  priorities: TicketPriority[] = this.tickets.priorities();

  constructor() {
    // Recargar tickets del backend cuando cambia el grupo activo
    effect(() => {
      const id = this.ctx.get();
      if (id) void this.tickets.loadByGroup(id);
    });
  }

  kanbanTickets = computed(() => {
    const g = this.group();
    if (!g) return [] as Ticket[];
    let list = this.tickets.listByGroup(g.id);
    if (!this.isPrivileged) {
      list = list.filter(t => t.assignedTo === this.me);
    } else {
      const active = this.kanbanFilter();
      if (active === 'mine') list = list.filter(t => t.assignedTo === this.me);
      else if (active === 'high') list = list.filter(t => t.priority === 'critico' || t.priority === 'supremo');
      else if (active === 'unassigned') list = list.filter(t => !t.assignedTo);
    }
    return list;
  });

  grouped = computed(() => {
    const list = this.kanbanTickets();
    const map: Record<TicketStatus, Ticket[]> = { pending: [], in_progress: [], review: [], done: [], blocked: [] };
    list.forEach(t => map[t.status].push(t));
    return map;
  });

  openDetail(ticket: Ticket) {
    this.selectedTicket.set(ticket);
    this.dialogVisible = true;
  }

  async changeStatus(ticket: Ticket, status: TicketStatus) {
    if (!this.canEditTicket(ticket)) return;
    try {
      const updated = await this.tickets.update(ticket.id, { status }, this.me);
      if (updated) this.selectedTicket.set(updated);
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'No se pudo mover el ticket' });
    }
  }

  async updatePriority(ticket: Ticket, priority: TicketPriority) {
    if (!this.canEditTicket(ticket)) return;
    try {
      const updated = await this.tickets.update(ticket.id, { priority }, this.me);
      if (updated) this.selectedTicket.set(updated);
    } catch { /* silencioso */ }
  }

  async assignMe(ticket: Ticket) {
    const me = this.me;
    if (!me) return;
    try {
      const updated = await this.tickets.update(ticket.id, { assignedTo: me }, me);
      if (updated) this.selectedTicket.set(updated);
      this.msg.add({ severity: 'success', summary: 'Asignación', detail: 'Te asignaste el ticket.' });
    } catch { /* silencioso */ }
  }

  async moveNext(ticket: Ticket) {
    if (!this.canEditTicket(ticket)) return;
    const order: TicketStatus[] = ['pending', 'in_progress', 'review', 'done'];
    const idx = order.indexOf(ticket.status as TicketStatus);
    if (idx >= 0 && idx < order.length - 1) await this.changeStatus(ticket, order[idx + 1]);
  }

  dragStart(ticket: Ticket) {
    if (!this.canEditTicket(ticket)) return;
    this.dragged.set(ticket);
  }

  allowDrop(event: DragEvent) { event.preventDefault(); }

  async drop(status: TicketStatus) {
    const ticket = this.dragged();
    if (!ticket) return;
    await this.changeStatus(ticket, status);
    this.dragged.set(null);
  }

  group = computed(() => {
    const id = this.ctx.get();
    return id ? this.groups.get(id) : null;
  });

  currentUser = computed(() => this.auth.getCurrentUser());

  ticketStats = computed(() => {
    const g = this.group();
    if (!g) return null;
    const list = this.tickets.listByGroup(g.id);
    const total = list.length;
    const byStatus = (status: Ticket['status']) => list.filter(t => t.status === status).length;
    return {
      total,
      pending: byStatus('pending'),
      inProgress: byStatus('in_progress'),
      review: byStatus('review'),
      done: byStatus('done'),
      blocked: byStatus('blocked'),
      recent: list.slice(0, 5)
    };
  });

  assignedToMe = computed(() => {
    const g = this.group();
    const me = this.currentUser()?.email;
    if (!g || !me) return [] as Ticket[];
    return this.tickets.listByGroup(g.id).filter(t => t.assignedTo === me).slice(0, 5);
  });

  readonly globalStats = computed(() => {
    const today = new Date().toDateString();
    const allTickets = this.groups.list().flatMap(g => this.tickets.listByGroup(g.id));
    const ticketsHoy = allTickets.filter(t => new Date(t.createdAt).toDateString() === today).length;
    return [
      { label: 'Grupos activos', value: this.groups.list().length, icon: 'pi pi-users', color: '#3b82f6' },
      { label: 'Usuarios totales', value: 0, icon: 'pi pi-user', color: '#22c55e' },
      { label: 'Tickets hoy', value: ticketsHoy, icon: 'pi pi-ticket', color: '#f59e0b' }
    ];
  });

  readonly quickActions = computed(() => {
    const canViewGroups  = this.permSvc.hasPermission(Permission.GroupsView as string);
    const canManageUsers = this.permSvc.hasPermission(Permission.UsersView as string)
                        || this.permSvc.hasPermission(Permission.UsersManage as string);
    return [
      ...(canViewGroups  ? [{ label: 'Ver grupos',           icon: 'pi pi-users',     action: null, route: '/groups' }] : []),
      ...(canManageUsers ? [{ label: 'Administrar usuarios', icon: 'pi pi-user-edit', action: null, route: '/users'  }] : [])
    ];
  });

  highlights = [
    { title: 'Tickets completados', value: 0 },
    { title: 'Adopción de usuarios', value: 64 }
  ];

  // ── Datos para gráficos Chart.js / PrimeNG ─────────────────
  readonly chartStatusData = computed(() => {
    const s = this.ticketStats();
    if (!s) return null;
    return {
      labels: ['Pendiente', 'En progreso', 'Revisión', 'Completado', 'Bloqueado'],
      datasets: [{
        data: [s.pending, s.inProgress, s.review, s.done, s.blocked],
        backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e', '#ef4444'],
        hoverBackgroundColor: ['#fbbf24', '#60a5fa', '#a78bfa', '#4ade80', '#f87171'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  });

  readonly chartPriorityData = computed(() => {
    const g = this.group();
    if (!g) return null;
    const list = this.tickets.listByGroup(g.id);
    const prioKeys = ['supremo', 'critico', 'alto', 'medio', 'bajo', 'muy_bajo', 'observacion'];
    const prioLabels = ['Supremo', 'Crítico', 'Alto', 'Medio', 'Bajo', 'Muy bajo', 'Obs.'];
    const colors = ['#7c3aed', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6', '#64748b'];
    return {
      labels: prioLabels,
      datasets: [{
        label: 'Tickets',
        data: prioKeys.map(p => list.filter(t => t.priority === p).length),
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false
      }]
    };
  });

  readonly chartStatusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#334155', font: { size: 12 } } }
    }
  };

  readonly chartBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#64748b', stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { ticks: { color: '#64748b' }, grid: { display: false } }
    }
  };

  highlightValue(label: string): number {
    const s = this.ticketStats();
    if (!s) return 0;
    if (label === 'Tickets completados') {
      return s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
    }
    return 64;
  }

  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      done: 'success', in_progress: 'info', pending: 'warn', blocked: 'danger', review: 'secondary'
    };
    return map[status] ?? 'secondary';
  }

  async ngOnInit() {
    await this.groups.load();
    const groupId = this.ctx.get();
    if (groupId) {
      await this.tickets.loadByGroup(groupId);
    }
  }

  goSelect() { this.router.navigate(['/group-select']); }
  goCreate() { this.router.navigate(['/tickets/create']); }
}
