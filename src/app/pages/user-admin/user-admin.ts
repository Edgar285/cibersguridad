import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { Auth } from '../../components/services/auth';
import { DEFAULT_USER_PERMISSIONS, Permission, PERMISSIONS_BY_CATEGORY } from '../../models/permissions';

@Component({
  selector: 'app-user-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    InputTextModule,
    ToastModule,
    TooltipModule,
    AvatarModule,
    DialogModule,
    MainLayout
  ],
  templateUrl: './user-admin.html',
  styleUrl: './user-admin.css',
  providers: [MessageService]
})
export class UserAdmin implements OnInit {
  private auth = inject(Auth);
  private msg = inject(MessageService);

  users: any[] = [];
  selectedUser: any = null;
  dialogVisible = false;

  // Permisos individuales seleccionados en el modal
  formPermissions = new Set<Permission>();
  readonly permsByCategory = PERMISSIONS_BY_CATEGORY;

  protected permission = Permission;

  form = {
    username: '',
    email: '',
    password: ''
  };

  isSuperAdminUser(user: any): boolean {
    return user?.permissions?.includes(Permission.SuperAdmin);
  }

  hasPerm(p: Permission): boolean {
    return this.formPermissions.has(p);
  }

  togglePerm(p: Permission) {
    if (this.isSuperAdminUser(this.selectedUser)) return;
    if (this.formPermissions.has(p)) this.formPermissions.delete(p);
    else this.formPermissions.add(p);
  }

  canCreate() {
    return this.auth.hasPermissions([Permission.UserAdd]);
  }

  canUpdate() {
    return this.auth.hasPermissions([Permission.UserEdit]);
  }

  canDelete() {
    return this.auth.hasPermissions([Permission.UserDelete]);
  }

  get isSuperAdmin(): boolean {
    return this.auth.hasPermissions([Permission.SuperAdmin]);
  }

  canSave() {
    return this.selectedUser ? this.canUpdate() : this.canCreate();
  }

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.users = this.auth.listUsers();
  }

  select(user: any) {
    if (!this.canUpdate()) return;
    this.selectedUser = user;
    this.form = { username: user.username, email: user.email, password: '' };
    this.formPermissions = new Set(user.permissions ?? []);
    this.dialogVisible = true;
  }

  newUser() {
    this.selectedUser = null;
    this.form = { username: '', email: '', password: '' };
    this.formPermissions = new Set(DEFAULT_USER_PERMISSIONS);
    this.dialogVisible = true;
  }

  save() {
    if (!this.canSave()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No tienes permisos para guardar usuarios' });
      return;
    }

    if (!this.form.username || !this.form.email) {
      this.msg.add({ severity: 'warn', summary: 'Validación', detail: 'Usuario y email son obligatorios' });
      return;
    }

    const payload = {
      username: this.form.username,
      email: this.form.email,
      password: this.form.password,
      permissions: [...this.formPermissions]
    };

    const result = this.selectedUser
      ? this.auth.updateUser(this.selectedUser.email, payload)
      : this.auth.createUser(payload);

    if (!result.ok) {
      this.msg.add({ severity: 'error', summary: 'Usuarios', detail: result.error ?? 'Error al guardar' });
      return;
    }

    this.msg.add({ severity: 'success', summary: 'Usuarios', detail: 'Guardado correctamente' });
    this.refresh();
    this.selectedUser = null;
    this.dialogVisible = false;
    this.form = { username: '', email: '', password: '' };
  }

  delete(user: any) {
    if (!this.canDelete()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No tienes permisos para eliminar usuarios' });
      return;
    }
    const res = this.auth.deleteUser(user.email);
    if (!res.ok) {
      this.msg.add({ severity: 'error', summary: 'Usuarios', detail: res.error ?? 'No se pudo eliminar' });
      return;
    }
    this.msg.add({ severity: 'success', summary: 'Usuarios', detail: 'Eliminado' });
    this.refresh();
    if (this.selectedUser?.email === user.email) { this.selectedUser = null; this.dialogVisible = false; }
  }


}
