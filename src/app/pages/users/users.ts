import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { Auth } from '../../components/services/auth';
import { TicketService } from '../../components/services/ticket.service';
import { GroupContextService } from '../../components/services/group-context.service';
import { Ticket } from '../../models/ticket';
import { HasPermissionDirective } from '../../components/directives/has-permission.directive';
import { Permission } from '../../models/permissions';

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
    DividerModule,
    InputTextModule,
    ToastModule,
    MainLayout,
    HasPermissionDirective
  ],
  providers: [MessageService],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {
  private auth = inject(Auth);
  private tickets = inject(TicketService);
  private ctx = inject(GroupContextService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private msg = inject(MessageService);

  protected permission = Permission;

  user = {
    name: '—',
    email: '—',
    role: 'Usuario registrado',
    status: 'Activo',
    location: '—',
    phone: '—'
  };

  form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    username: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\+?\d[\d\s-]{7,}$/)]],
    address: ['', Validators.required]
  });

  assigned: Ticket[] = [];

  canEdit() {
    return this.auth.hasAnyPermission([Permission.UsersEdit, Permission.UserEdit]);
  }

  canDelete() {
    return this.auth.hasAnyPermission([Permission.UserDelete]);
  }

  ngOnInit() {
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
      this.assigned = this.tickets.listByGroup(groupId).filter(t => t.assignedTo === current.email);
    }

    this.form.setValue({
      fullName: current.fullName || '',
      email: current.email,
      username: current.username,
      phone: current.phone || '',
      address: current.address || ''
    });
  }

  save() {
    if (!this.canEdit()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No puedes editar usuarios.' });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.add({ severity: 'warn', summary: 'Perfil', detail: 'Revisa los campos obligatorios' });
      return;
    }

    const result = this.auth.updateCurrentUser({
      fullName: this.form.value.fullName!,
      email: this.form.value.email!,
      username: this.form.value.username!,
      phone: this.form.value.phone!,
      address: this.form.value.address!
    });

    if (!result.ok) {
      this.msg.add({ severity: 'error', summary: 'Perfil', detail: result.error ?? 'No se pudo guardar' });
      return;
    }

    this.user = {
      ...this.user,
      name: this.form.value.fullName!,
      email: this.form.value.email!,
      location: this.form.value.address!,
      phone: this.form.value.phone!
    };

    this.msg.add({ severity: 'success', summary: 'Perfil', detail: 'Datos actualizados' });
  }

  deactivate() {
    if (!this.canDelete()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No puedes eliminar usuarios.' });
      return;
    }
    const res = this.auth.deleteCurrentUser();
    if (res.ok) {
      this.msg.add({ severity: 'success', summary: 'Cuenta', detail: 'Cuenta eliminada' });
      setTimeout(() => this.router.navigate(['/auth/login']), 500);
    } else {
      this.msg.add({ severity: 'error', summary: 'Cuenta', detail: res.error ?? 'No se pudo eliminar' });
    }
  }
}
