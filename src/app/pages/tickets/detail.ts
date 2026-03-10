import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { TicketService } from '../../components/services/ticket.service';
import { Ticket, TicketPriority, TicketStatus } from '../../models/ticket';
import { Auth } from '../../components/services/auth';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, TagModule, SelectModule, TextareaModule, ButtonModule, ToastModule, MainLayout],
  providers: [MessageService],
  templateUrl: './detail.html',
  styleUrl: './detail.css'
})
export class TicketDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tickets = inject(TicketService);
  private msg = inject(MessageService);
  private auth = inject(Auth);

  ticket: Ticket | null = null;
  priorities: TicketPriority[] = this.tickets.priorities();
  statuses = this.tickets.statuses();

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.ticket = this.tickets.get(id);
  }

  updateStatus(status: TicketStatus) {
    if (!this.ticket) return;
    this.ticket = this.tickets.update(this.ticket.id, { status });
  }

  updatePriority(priority: TicketPriority) {
    if (!this.ticket) return;
    this.ticket = this.tickets.update(this.ticket.id, { priority });
  }

  assignMe() {
    if (!this.ticket) return;
    const me = this.auth.getCurrentUser()?.email;
    if (!me) return;
    this.ticket = this.tickets.update(this.ticket.id, { assignedTo: me });
    this.msg.add({ severity: 'success', summary: 'Asignado', detail: 'Te asignaste el ticket.' });
  }

  delete() {
    if (!this.ticket) return;
    this.tickets.delete(this.ticket.id);
    this.msg.add({ severity: 'success', summary: 'Ticket', detail: 'Eliminado' });
    setTimeout(() => this.router.navigate(['/tickets/list']), 300);
  }
}
