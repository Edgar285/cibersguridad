import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DividerModule } from 'primeng/divider';
import { RippleModule } from 'primeng/ripple';

// App imports
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { Auth } from '../../components/services/auth';
import { TicketService } from '../../components/services/ticket.service';
import { GroupContextService } from '../../components/services/group-context.service';
import { HasPermissionDirective } from '../../components/directives/has-permission.directive';
import { Permission } from '../../models/permissions';
import { Ticket } from '../../models/ticket';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    AvatarModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    ToastModule,
    TableModule,
    DividerModule,
    RippleModule,
    MainLayout,
    HasPermissionDirective
  ],
  providers: [MessageService],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class Users implements OnInit {
  private auth = inject(Auth);
  private tickets = inject(TicketService);
  private ctx = inject(GroupContextService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private msg = inject(MessageService);

  protected permission = Permission;
  saving = false;

  user = {
    name: '—',
    email: '—',
    role: 'Usuario registrado',
    status: 'Activo',
    location: '—',
    phone: '—'
  };

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s-]{10,}$/)]],
    address: ['', Validators.required]
  });

  assigned: Ticket[] = [];
  summary = {
    abiertos: 0,
    enProgreso: 0,
    hechos: 0
  };

  ngOnInit() {
    this.loadUserData();
  }

  private loadUserData() {
    const current = this.auth.getCurrentUser();
    
    if (!current) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.user = {
      name: current.fullName || current.username,
      email: current.email,
      role: 'Usuario registrado',
      status: 'Activo',
      location: current.address || '—',
      phone: current.phone || '—'
    };

    const groupId = this.ctx.get();
    if (groupId) {
      this.loadTickets(groupId, current.email);
    }

    this.form.patchValue({
      fullName: current.fullName || '',
      email: current.email,
      username: current.username,
      phone: current.phone || '',
      address: current.address || ''
    });
  }

  private loadTickets(groupId: string, userEmail: string) {
    this.assigned = this.tickets
      .listByGroup(groupId)
      .filter(t => t.assignedTo === userEmail);

    this.summary = {
      abiertos: this.assigned.filter(t => 
        ['pending', 'blocked'].includes(t.status)).length,
      enProgreso: this.assigned.filter(t => 
        ['in_progress', 'review'].includes(t.status)).length,
      hechos: this.assigned.filter(t => t.status === 'done').length
    };
  }

  save() {
    if (!this.canEdit()) {
      this.showPermissionWarning();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor, revisa los campos requeridos'
      });
      return;
    }

    this.saving = true;
    
    setTimeout(() => {
      const result = this.auth.updateCurrentUser({
        fullName: this.form.value.fullName!,
        email: this.form.value.email!,
        username: this.form.value.username!,
        phone: this.form.value.phone!,
        address: this.form.value.address!
      });

      this.saving = false;

      if (!result.ok) {
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: result.error ?? 'No se pudo guardar'
        });
        return;
      }

      this.user = {
        ...this.user,
        name: this.form.value.fullName!,
        email: this.form.value.email!,
        location: this.form.value.address!,
        phone: this.form.value.phone!
      };

      this.msg.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Datos actualizados correctamente'
      });
    }, 1000);
  }

  deactivate() {
    if (!this.canDelete()) {
      this.showPermissionWarning();
      return;
    }

    const result = this.auth.deleteCurrentUser();
    
    if (result.ok) {
      this.msg.add({
        severity: 'success',
        summary: 'Cuenta desactivada',
        detail: 'Tu cuenta ha sido desactivada exitosamente'
      });
      setTimeout(() => this.router.navigate(['/auth/login']), 2000);
    } else {
      this.msg.add({
        severity: 'error',
        summary: 'Error',
        detail: result.error ?? 'No se pudo desactivar'
      });
    }
  }

  resetForm() {
    this.form.reset(this.form.value);
  }

  viewTicket(ticket: Ticket) {
    this.router.navigate(['/tickets', ticket.id]);
  }

  // Helper methods for ticket status
  getTicketSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const severities: Record<string, any> = {
      'pending': 'warn',
      'in_progress': 'info',
      'review': 'info',
      'done': 'success',
      'blocked': 'danger'
    };
    return severities[status] || 'secondary';
  }

  getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const severities: Record<string, any> = {
      'low': 'success',
      'medium': 'info',
      'high': 'warn',
      'critical': 'danger'
    };
    return severities[priority] || 'secondary';
  }

  // Permission checks
  canEdit(): boolean {
    return this.auth.hasAnyPermission([Permission.UsersEdit, Permission.UserEdit]);
  }

  canDelete(): boolean {
    return this.auth.hasAnyPermission([Permission.UserDelete]);
  }

  private showPermissionWarning() {
    this.msg.add({
      severity: 'warn',
      summary: 'Permisos insuficientes',
      detail: 'No tienes permisos para realizar esta acción'
    });
  }
}