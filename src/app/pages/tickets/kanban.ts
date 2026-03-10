import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { GroupContextService } from '../../components/services/group-context.service';
import { TicketService } from '../../components/services/ticket.service';
import { Ticket, TicketPriority, TicketStatus } from '../../models/ticket';
import { QuickFilters } from '../../components/filters/quick-filters';
import { Auth } from '../../components/services/auth';

@Component({
  selector: 'app-ticket-kanban',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TagModule,
    ButtonModule,
    SelectModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    MainLayout,
    QuickFilters
  ],
  providers: [MessageService],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css'
})
export class TicketKanban {
  private ctx = inject(GroupContextService);
  private ticketsSvc = inject(TicketService);
  private msg = inject(MessageService);
  private auth = inject(Auth);

  filter = signal<string | null>(null);
  dialogVisible = false;
  selectedTicket = signal<Ticket | null>(null);

  statuses = this.ticketsSvc.statuses();
  priorities: TicketPriority[] = this.ticketsSvc.priorities();

  tickets = computed(() => {
    const groupId = this.ctx.get();
    if (!groupId) return [] as Ticket[];
    let list = this.ticketsSvc.listByGroup(groupId);
    const active = this.filter();
    if (active === 'mine') {
      const me = this.auth.getCurrentUser()?.email;
      list = list.filter(t => t.assignedTo === me);
    } else if (active === 'high') {
      list = list.filter(t => t.priority === '紧急' || t.priority === '至尊');
    } else if (active === 'unassigned') {
      list = list.filter(t => !t.assignedTo);
    }
    return list;
  });

  grouped = computed(() => {
    const list = this.tickets();
    const map: Record<TicketStatus, Ticket[]> = {
      pending: [],
      in_progress: [],
      review: [],
      done: [],
      blocked: []
    };
    list.forEach(t => map[t.status].push(t));
    return map;
  });

  openDetail(ticket: Ticket) {
    this.selectedTicket.set(ticket);
    this.dialogVisible = true;
  }

  changeStatus(ticket: Ticket, status: TicketStatus) {
    const updated = this.ticketsSvc.update(ticket.id, { status });
    if (updated) this.selectedTicket.set(updated);
  }

  updatePriority(ticket: Ticket, priority: TicketPriority) {
    const updated = this.ticketsSvc.update(ticket.id, { priority });
    if (updated) this.selectedTicket.set(updated);
  }

  assignMe(ticket: Ticket) {
    const me = this.auth.getCurrentUser()?.email;
    if (!me) return;
    const updated = this.ticketsSvc.update(ticket.id, { assignedTo: me });
    if (updated) this.selectedTicket.set(updated);
    this.msg.add({ severity: 'success', summary: 'Asignación', detail: 'Te asignaste el ticket.' });
  }

  moveNext(ticket: Ticket) {
    const order: TicketStatus[] = ['pending', 'in_progress', 'review', 'done'];
    const idx = order.indexOf(ticket.status as TicketStatus);
    if (idx >= 0 && idx < order.length - 1) this.changeStatus(ticket, order[idx + 1]);
  }
}
