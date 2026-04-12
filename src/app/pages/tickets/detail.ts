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
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { TicketService } from '../../components/services/ticket.service';
import { Ticket, TicketPriority, TicketStatus } from '../../models/ticket';
import { Permission } from '../../models/permissions';
import { Auth } from '../../components/services/auth';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TagModule,
    SelectModule,
    TextareaModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    DatePickerModule,
    MainLayout
  ],
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
  comment = '';
  dueDateValue: Date | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.ticket = this.tickets.get(id);
    if (this.ticket?.dueDate) this.dueDateValue = new Date(this.ticket.dueDate);
  }

  private actorEmail() {
    return this.auth.getCurrentUser()?.email;
  }

  get isCreator() {
    const me = this.actorEmail();
    return !!(me && this.ticket && this.ticket.author === me);
  }

  get isAssignee() {
    const me = this.actorEmail();
    return !!(me && this.ticket && this.ticket.assignedTo === me);
  }

  get isAdmin() {
    return this.auth.hasAnyPermission([
      Permission.TicketsEdit,
      Permission.TicketEdit,
      Permission.TicketDelete
    ]);
  }

  get canEditAll() {
    return this.isCreator || this.isAdmin;
  }

  get canChangeStatus() {
    return this.canEditAll || this.isAssignee;
  }

  get canComment() {
    return !!this.actorEmail();
  }

  updateStatus(status: TicketStatus) {
    if (!this.ticket || !this.canChangeStatus) return;
    this.ticket = this.tickets.update(this.ticket.id, { status }, this.actorEmail() ?? undefined);
  }

  updatePriority(priority: TicketPriority) {
    if (!this.ticket || !this.canEditAll) return;
    this.ticket = this.tickets.update(this.ticket.id, { priority }, this.actorEmail() ?? undefined);
  }

  assignMe() {
    if (!this.ticket || !this.canEditAll) return;
    const me = this.auth.getCurrentUser()?.email;
    if (!me) return;
    this.ticket = this.tickets.update(this.ticket.id, { assignedTo: me }, me);
    this.msg.add({ severity: 'success', summary: 'Asignado', detail: 'Te asignaste el ticket.' });
  }

  delete() {
    if (!this.ticket || !this.canEditAll) return;
    this.tickets.delete(this.ticket.id);
    this.msg.add({ severity: 'success', summary: 'Ticket', detail: 'Eliminado' });
    setTimeout(() => this.router.navigate(['/tickets/list']), 300);
  }

  addComment() {
    if (!this.ticket || !this.comment.trim() || !this.canComment) return;
    const author = this.actorEmail() ?? 'system';
    this.tickets.addComment(this.ticket.id, { author, message: this.comment.trim() });
    const updated = this.tickets.get(this.ticket.id);
    if (updated) this.ticket = updated;
    this.comment = '';
  }

  updateTitle(value: string) {
    if (!this.ticket || !this.canEditAll || !value.trim()) return;
    this.ticket = this.tickets.update(this.ticket.id, { title: value.trim() }, this.actorEmail() ?? undefined);
  }

  updateDescription(value: string) {
    if (!this.ticket || !this.canEditAll || !value.trim()) return;
    this.ticket = this.tickets.update(this.ticket.id, { description: value.trim() }, this.actorEmail() ?? undefined);
  }

  updateDueDate(value: Date | null) {
    if (!this.ticket || !this.canEditAll) return;
    const iso = value ? new Date(value).toISOString() : undefined;
    this.dueDateValue = value;
    this.ticket = this.tickets.update(this.ticket.id, { dueDate: iso }, this.actorEmail() ?? undefined);
  }
}
