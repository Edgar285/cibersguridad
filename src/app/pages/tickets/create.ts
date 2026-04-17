import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { TicketService } from '../../components/services/ticket.service';
import { GroupContextService } from '../../components/services/group-context.service';
import { Auth } from '../../components/services/auth';
import { PermissionService } from '../../components/services/permission.service';
import { Permission } from '../../models/permissions';
import { TicketPriority, TicketStatus } from '../../models/ticket';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    ButtonModule,
    ToastModule,
    MainLayout
  ],
  providers: [MessageService],
  templateUrl: './create.html',
  styleUrl: './create.css'
})
export class TicketCreate {
  private fb = inject(FormBuilder);
  private tickets = inject(TicketService);
  private ctx = inject(GroupContextService);
  private msg = inject(MessageService);
  private router = inject(Router);
  private auth = inject(Auth);
  private permSvc = inject(PermissionService);

  constructor() {
    if (!this.permSvc.hasPermission(Permission.TicketsAdd as string)) {
      this.router.navigate(['/dashboard']);
    }
  }

  statusOptions = this.tickets.statuses();
  private priorityLabels: Record<TicketPriority, string> = {
    supremo: 'Supremo',
    critico: 'Crítico',
    alto: 'Alto',
    medio: 'Medio',
    bajo: 'Bajo',
    muy_bajo: 'Muy bajo',
    observacion: 'Observación'
  };
  priorityOptions = this.tickets.priorities().map(p => ({ label: this.priorityLabels[p] ?? p, value: p }));

  form = this.fb.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    status: ['pending' as TicketStatus, Validators.required],
    priority: ['medio' as TicketPriority, Validators.required],
    assignedTo: [''],
    dueDate: [null]
  });

  loading = signal(false);

  get f() {
    return this.form.controls;
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }

  async submit() {
    if (this.loading()) return;
    const groupId = this.ctx.get();
    const author = this.auth.getCurrentUser()?.email ?? 'system';
    if (!groupId) {
      this.msg.add({ severity: 'warn', summary: 'Grupo', detail: 'Selecciona un grupo primero.' });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.add({ severity: 'warn', summary: 'Validación', detail: 'Completa los obligatorios.' });
      return;
    }

    const value = this.form.value;

    const duplicate = this.tickets.listByGroup(groupId)
      .find(t => t.title.trim().toLowerCase() === value.title!.trim().toLowerCase());
    if (duplicate) {
      this.msg.add({ severity: 'warn', summary: 'Ticket ya existente', detail: `Ya existe un ticket con el título "${duplicate.title}" en este grupo.` });
      return;
    }

    this.loading.set(true);
    try {
      await this.tickets.create(groupId, author, {
        title: value.title!,
        description: value.description!,
        status: value.status as TicketStatus,
        priority: value.priority as TicketPriority,
        assignedTo: value.assignedTo || undefined,
        dueDate: value.dueDate ? new Date(value.dueDate).toISOString() : undefined
      });
      this.msg.add({ severity: 'success', summary: 'Ticket', detail: 'Creado' });
      setTimeout(() => this.router.navigate(['/dashboard']), 400);
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'No se pudo crear el ticket' });
    } finally {
      this.loading.set(false);
    }
  }
}
