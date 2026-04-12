import { Component, inject } from '@angular/core';
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

  get f() {
    return this.form.controls;
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }

  submit() {
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
    this.tickets.create(groupId, author, {
      title: value.title!,
      description: value.description!,
      status: value.status as TicketStatus,
      priority: value.priority as TicketPriority,
      assignedTo: value.assignedTo || undefined,
      dueDate: value.dueDate ? new Date(value.dueDate).toISOString() : undefined
    });

    this.msg.add({ severity: 'success', summary: 'Ticket', detail: 'Creado' });
    setTimeout(() => this.router.navigate(['/dashboard']), 400);
  }
}
