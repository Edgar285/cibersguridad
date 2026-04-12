import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { GroupContextService } from '../../components/services/group-context.service';
import { TicketService } from '../../components/services/ticket.service';
import { Ticket, TicketPriority, TicketStatus } from '../../models/ticket';
import { QuickFilters } from '../../components/filters/quick-filters';
import { Router } from '@angular/router';
import { Auth } from '../../components/services/auth';
import { Permission } from '../../models/permissions';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, SelectModule, TagModule, ButtonModule, MainLayout, QuickFilters],
  templateUrl: './list.html',
  styleUrl: './list.css'
})
export class TicketList {
  private ctx = inject(GroupContextService);
  private ticketsSvc = inject(TicketService);
  private router = inject(Router);
  private auth = inject(Auth);

  statusFilter = signal<TicketStatus | null>(null);
  priorityFilter = signal<TicketPriority | null>(null);
  quickFilter = signal<string | null>(null);

  private get me(): string | undefined {
    return this.auth.getCurrentUser()?.email;
  }

  get isPrivileged(): boolean {
    return this.auth.hasAnyPermission([Permission.TicketsEdit]);
  }

  tickets = computed(() => {
    const id = this.ctx.get();
    if (!id) return [] as Ticket[];
    let list = this.ticketsSvc.listByGroup(id);

    // Usuario normal: solo ve sus propios tickets
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

  open(ticket: Ticket) {
    this.router.navigate(['/tickets', ticket.id]);
  }
}
