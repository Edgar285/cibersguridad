import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
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
import { Permission } from '../../models/permissions';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, RouterModule, CardModule, TagModule, TableModule, ProgressBarModule, SelectModule, DialogModule, ToastModule, MainLayout, QuickFilters, HasPermissionDirective],
  providers: [MessageService],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  private ctx = inject(GroupContextService);
  private groups = inject(GroupService);
  private tickets = inject(TicketService);
  private router = inject(Router);
  private auth = inject(Auth);
  private msg = inject(MessageService);

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
    return this.auth.hasAnyPermission([Permission.TicketsEdit]);
  }  canEditTicket(ticket: Ticket): boolean {
    return this.isPrivileged || ticket.assignedTo === this.me;
  }

  statuses = this.tickets.statuses();
  priorities: TicketPriority[] = this.tickets.priorities();

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

  changeStatus(ticket: Ticket, status: TicketStatus) {
    if (!this.canEditTicket(ticket)) return;
    const updated = this.tickets.update(ticket.id, { status }, this.me);
    if (updated) this.selectedTicket.set(updated);
  }

  updatePriority(ticket: Ticket, priority: TicketPriority) {
    if (!this.canEditTicket(ticket)) return;
    const updated = this.tickets.update(ticket.id, { priority }, this.me);
    if (updated) this.selectedTicket.set(updated);
  }

  assignMe(ticket: Ticket) {
    const me = this.me;
    if (!me) return;
    const updated = this.tickets.update(ticket.id, { assignedTo: me }, me);
    if (updated) this.selectedTicket.set(updated);
    this.msg.add({ severity: 'success', summary: 'Asignación', detail: 'Te asignaste el ticket.' });
  }

  moveNext(ticket: Ticket) {
    if (!this.canEditTicket(ticket)) return;
    const order: TicketStatus[] = ['pending', 'in_progress', 'review', 'done'];
    const idx = order.indexOf(ticket.status as TicketStatus);
    if (idx >= 0 && idx < order.length - 1) this.changeStatus(ticket, order[idx + 1]);
  }

  dragStart(ticket: Ticket) {
    if (!this.canEditTicket(ticket)) return;
    this.dragged.set(ticket);
  }

  allowDrop(event: DragEvent) { event.preventDefault(); }

  drop(status: TicketStatus) {
    const ticket = this.dragged();
    if (!ticket) return;
    this.changeStatus(ticket, status);
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

  globalStats = [
    { label: 'Grupos activos', value: 4, icon: 'pi pi-users', color: '#3b82f6' },
    { label: 'Usuarios totales', value: 3, icon: 'pi pi-user', color: '#22c55e' },
    { label: 'Tickets hoy', value: 0, icon: 'pi pi-ticket', color: '#f59e0b' }
  ];

  quickActions = [
    { label: 'Crear ticket', icon: 'pi pi-plus', action: () => this.goCreate() },
    { label: 'Cambiar grupo', icon: 'pi pi-refresh', action: () => this.goSelect() },
    { label: 'Ver grupos', icon: 'pi pi-users', route: '/groups' },
    { label: 'Administrar usuarios', icon: 'pi pi-user-edit', route: '/users' }
  ];

  highlights = [
    { title: 'Tickets completados', value: 0 },
    { title: 'Adopción de usuarios', value: 64 }
  ];

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

  goSelect() { this.router.navigate(['/group-select']); }
  goCreate() { this.router.navigate(['/tickets/create']); }
}
