import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { GroupContextService } from '../../components/services/group-context.service';
import { GroupService } from '../../components/services/group.service';
import { TicketService } from '../../components/services/ticket.service';
import { Ticket, TicketPriority, TicketStatus } from '../../models/ticket';
import { QuickFilters } from '../../components/filters/quick-filters';
import { Router } from '@angular/router';
import { Auth } from '../../components/services/auth';
import { PermissionService } from '../../components/services/permission.service';
import { Permission } from '../../models/permissions';
import { HasPermissionDirective } from '../../components/directives/has-permission.directive';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, SelectModule, TagModule, ButtonModule, TooltipModule, MainLayout, QuickFilters, HasPermissionDirective],
  templateUrl: './list.html',
  styleUrl: './list.css'
})
export class TicketList implements OnInit {
  private ctx = inject(GroupContextService);
  private ticketsSvc = inject(TicketService);
  private groupSvc = inject(GroupService);
  private router = inject(Router);
  private auth = inject(Auth);
  private permSvc = inject(PermissionService);

  statusFilter = signal<TicketStatus | null>(null);
  priorityFilter = signal<TicketPriority | null>(null);
  quickFilter = signal<string | null>(null);
  loading = signal(false);

  private get me(): string | undefined {
    return this.auth.getCurrentUser()?.email;
  }

  get isPrivileged(): boolean {
    return this.permSvc.hasPermission(Permission.TicketsEdit as string);
  }

  tickets = computed(() => {
    const id = this.ctx.get();
    if (!id) return [] as Ticket[];
    let list = this.ticketsSvc.listByGroup(id);

    if (!this.isPrivileged) {
      list = list.filter(t => t.assignedTo === this.me);
    } else {
      const status = this.statusFilter();
      const priority = this.priorityFilter();
      const quick = this.quickFilter();
      if (status) list = list.filter(t => t.status === status);
      if (priority) list = list.filter(t => t.priority === priority);
      if (quick === 'mine') {
        const me = this.me;
        if (me) list = list.filter(t => t.assignedTo === me);
      } else if (quick === 'unassigned') {
        list = list.filter(t => !t.assignedTo);
      } else if (quick === 'high') {
        list = list.filter(t => t.priority === 'critico' || t.priority === 'supremo');
      }
    }
    return list;
  });

  statuses = this.ticketsSvc.statuses();
  priorities = this.ticketsSvc.priorities();
  priorityOptions = [
    { label: 'Supremo',  value: 'supremo' },
    { label: 'Crítico',  value: 'critico' },
    { label: 'Alto',     value: 'alto' },
    { label: 'Medio',    value: 'medio' },
    { label: 'Bajo',     value: 'bajo' },
    { label: 'Muy bajo', value: 'muy_bajo' },
    { label: 'Obs.',     value: 'observacion' }
  ];

  async ngOnInit() {
    const groupId = this.ctx.get();
    if (groupId) {
      this.loading.set(true);
      await this.ticketsSvc.loadByGroup(groupId);
      this.loading.set(false);
    }
  }

  open(ticket: Ticket) {
    this.router.navigate(['/tickets', ticket.id]);
  }

  goCreate() { this.router.navigate(['/tickets/create']); }

  readonly permission = Permission;
  readonly today = new Date().toISOString().slice(0, 10);

  statusLabel(s: TicketStatus): string {
    const map: Record<TicketStatus, string> = {
      pending: 'Pendiente', in_progress: 'En progreso',
      review: 'Revisión', done: 'Completado', blocked: 'Bloqueado'
    };
    return map[s] ?? s;
  }

  statusClass(s: TicketStatus): string {
    const map: Record<TicketStatus, string> = {
      pending: 'st-pending', in_progress: 'st-progress',
      review: 'st-review', done: 'st-done', blocked: 'st-blocked'
    };
    return map[s] ?? '';
  }

  priorityLabel(p: TicketPriority): string {
    const map: Record<TicketPriority, string> = {
      supremo: 'Supremo', critico: 'Crítico', alto: 'Alto',
      medio: 'Medio', bajo: 'Bajo', muy_bajo: 'Muy bajo', observacion: 'Obs.'
    };
    return map[p] ?? p;
  }

  priorityClass(p: TicketPriority): string {
    const map: Record<TicketPriority, string> = {
      supremo: 'pr-supremo', critico: 'pr-critico', alto: 'pr-alto',
      medio: 'pr-medio', bajo: 'pr-bajo', muy_bajo: 'pr-muy-bajo', observacion: 'pr-obs'
    };
    return map[p] ?? '';
  }

  groupName(groupId: string): string {
    return this.groupSvc.get(groupId)?.nombre ?? groupId;
  }
}
