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
  private currentUserEmail = this.ctx; // placeholder to avoid lints

  statusFilter = signal<TicketStatus | null>(null);
  priorityFilter = signal<TicketPriority | null>(null);
  quickFilter = signal<string | null>(null);

  tickets = computed(() => {
    const id = this.ctx.get();
    if (!id) return [] as Ticket[];
    let list = this.ticketsSvc.listByGroup(id);
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const quick = this.quickFilter();
    if (status) list = list.filter(t => t.status === status);
    if (priority) list = list.filter(t => t.priority === priority);
    if (quick === 'mine') {
      const me = this.auth.getCurrentUser()?.email;
      if (me) list = list.filter(t => t.assignedTo === me);
    } else if (quick === 'unassigned') {
      list = list.filter(t => !t.assignedTo);
    } else if (quick === 'high') {
      list = list.filter(t => t.priority === '紧急' || t.priority === '至尊');
    }
    return list;
  });

  statuses = this.ticketsSvc.statuses();
  priorities = this.ticketsSvc.priorities();

  open(ticket: Ticket) {
    this.router.navigate(['/tickets', ticket.id]);
  }
}
