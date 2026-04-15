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
import { PermissionService } from '../../components/services/permission.service';

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
  private permSvc = inject(PermissionService);

  ticket: Ticket | null = null;
  priorities: TicketPriority[] = this.tickets.priorities();
  statuses = this.tickets.statuses();
  comment = '';
  dueDateValue: Date | null = null;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.ticket = await this.tickets.loadOne(id);
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
    return this.permSvc.hasPermission(Permission.TicketsEdit as string)
        || this.permSvc.hasPermission(Permission.TicketEdit as string)
        || this.permSvc.hasPermission(Permission.TicketDelete as string);
  }

  get canEditAll() {
    return this.isCreator || this.isAdmin;
  }

  /** Puede cambiar estado solo si tiene tickets:move Y el ticket está asignado a él, o si es admin */
  get canChangeStatus() {
    const canMove = this.permSvc.hasPermission(Permission.TicketsMove as string);
    return this.isAdmin || (canMove && this.isAssignee);
  }

  /** Puede comentar cualquier usuario autenticado con acceso al ticket */
  get canComment() {
    return !!this.actorEmail();
  }

  async updateStatus(status: TicketStatus) {
    if (!this.ticket || !this.canChangeStatus) return;
    try {
      const updated = await this.tickets.update(this.ticket.id, { status }, this.actorEmail() ?? undefined);
      if (updated) this.ticket = updated;
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'No se pudo actualizar estado' });
    }
  }

  async updatePriority(priority: TicketPriority) {
    if (!this.ticket || !this.canEditAll) return;
    try {
      const updated = await this.tickets.update(this.ticket.id, { priority }, this.actorEmail() ?? undefined);
      if (updated) this.ticket = updated;
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'No se pudo actualizar prioridad' });
    }
  }

  async assignMe() {
    if (!this.ticket || !this.canEditAll) return;
    const me = this.auth.getCurrentUser()?.email;
    if (!me) return;
    try {
      const updated = await this.tickets.update(this.ticket.id, { assignedTo: me }, me);
      if (updated) this.ticket = updated;
      this.msg.add({ severity: 'success', summary: 'Asignado', detail: 'Te asignaste el ticket.' });
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'No se pudo asignar' });
    }
  }

  async delete() {
    if (!this.ticket || !this.canEditAll) return;
    const ok = await this.tickets.delete(this.ticket.id);
    if (ok) {
      this.msg.add({ severity: 'success', summary: 'Ticket', detail: 'Eliminado' });
      setTimeout(() => this.router.navigate(['/tickets/list']), 300);
    }
  }

  async addComment() {
    if (!this.ticket || !this.comment.trim() || !this.canComment) return;
    const author = this.actorEmail() ?? 'system';
    await this.tickets.addComment(this.ticket.id, { author, message: this.comment.trim() });
    this.ticket = this.tickets.get(this.ticket.id);
    this.comment = '';
  }

  async updateTitle(value: string) {
    if (!this.ticket || !this.canEditAll || !value.trim()) return;
    try {
      const updated = await this.tickets.update(this.ticket.id, { title: value.trim() }, this.actorEmail() ?? undefined);
      if (updated) this.ticket = updated;
    } catch { /* silencioso */ }
  }

  async updateDescription(value: string) {
    if (!this.ticket || !this.canEditAll || !value.trim()) return;
    try {
      const updated = await this.tickets.update(this.ticket.id, { description: value.trim() }, this.actorEmail() ?? undefined);
      if (updated) this.ticket = updated;
    } catch { /* silencioso */ }
  }

  async updateDueDate(value: Date | null) {
    if (!this.ticket || !this.canEditAll) return;
    const iso = value ? new Date(value).toISOString() : undefined;
    this.dueDateValue = value;
    try {
      const updated = await this.tickets.update(this.ticket.id, { dueDate: iso }, this.actorEmail() ?? undefined);
      if (updated) this.ticket = updated;
    } catch { /* silencioso */ }
  }
}
