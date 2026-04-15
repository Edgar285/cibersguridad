import { Component, OnInit, inject, signal } from '@angular/core';
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
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { Auth } from '../../components/services/auth';
import { GroupService, Group } from '../../components/services/group.service';
import { PermissionService } from '../../components/services/permission.service';
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
    SelectModule,
    MainLayout
  ],
  templateUrl: './user-admin.html',
  styleUrl: './user-admin.css',
  providers: [MessageService]
})
export class UserAdmin implements OnInit {
  private auth    = inject(Auth);
  private msg     = inject(MessageService);
  private groups  = inject(GroupService);
  private permSvc = inject(PermissionService);

  users: any[] = [];
  selectedUser: any = null;
  dialogVisible = false;

  // Permisos globales del usuario
  formPermissions = new Set<Permission>();
  readonly permsByCategory = PERMISSIONS_BY_CATEGORY;

  // Permisos por grupo
  allGroups: Group[] = [];
  selectedGroupForPerms: Group | null = null;
  // Map<groupId, Set<string>> — permisos del usuario en ese grupo
  groupPermsMap = signal<Map<string, Set<string>>>(new Map());

  protected permission = Permission;

  form = {
    username: '',
    email: '',
    password: ''
  };

  isSuperAdminUser(user: any): boolean {
    return user?.permissions?.includes(Permission.SuperAdmin);
  }

  hasPerm(p: Permission): boolean { return this.formPermissions.has(p); }

  togglePerm(p: Permission) {
    if (this.isSuperAdminUser(this.selectedUser)) return;
    if (this.formPermissions.has(p)) this.formPermissions.delete(p);
    else this.formPermissions.add(p);
  }

  // ── Permisos por grupo ────────────────────────────────────────
  currentGroupPerms(): Set<string> {
    if (!this.selectedGroupForPerms) return new Set();
    return this.groupPermsMap().get(this.selectedGroupForPerms.id) ?? new Set();
  }

  hasGroupPerm(p: string): boolean {
    return this.currentGroupPerms().has(p);
  }

  toggleGroupPerm(p: string) {
    if (!this.selectedGroupForPerms) return;
    const map  = new Map(this.groupPermsMap());
    const set  = new Set(map.get(this.selectedGroupForPerms.id) ?? []);
    if (set.has(p)) set.delete(p); else set.add(p);
    map.set(this.selectedGroupForPerms.id, set);
    this.groupPermsMap.set(map);
  }

  async saveGroupPerms() {
    const g = this.selectedGroupForPerms;
    const u = this.selectedUser;
    if (!g || !u) return;
    const perms = [...(this.groupPermsMap().get(g.id) ?? [])];
    await this.groups.setMemberPermissions(g.id, u.id, perms);
    this.msg.add({ severity: 'success', summary: 'Permisos por grupo', detail: `Permisos de ${u.username} en "${g.nombre}" actualizados.` });
  }

  canCreate() { return this.permSvc.hasPermission(Permission.UsersAdd as string) || this.permSvc.hasPermission(Permission.UsersManage as string); }
  canUpdate() { return this.permSvc.hasPermission(Permission.UsersEdit as string) || this.permSvc.hasPermission(Permission.UsersManage as string); }
  canDelete() { return this.permSvc.hasPermission(Permission.UsersDelete as string) || this.permSvc.hasPermission(Permission.UsersManage as string); }

  get isSuperAdmin(): boolean {
    return this.permSvc.hasPermission(Permission.SuperAdmin as string);
  }

  canSave() { return this.selectedUser ? this.canUpdate() : this.canCreate(); }

  async ngOnInit() {
    await this.refresh();
    await this.groups.load();
    this.allGroups = this.groups.list();
  }

  async refresh() {
    this.users = await this.auth.listUsers();
  }

  select(user: any) {
    if (!this.canUpdate()) return;
    this.selectedUser = user;
    this.form = { username: user.username, email: user.email, password: '' };
    this.formPermissions = new Set(user.permissions ?? []);
    this.selectedGroupForPerms = null;
    this.groupPermsMap.set(new Map());
    this.dialogVisible = true;
  }

  newUser() {
    this.selectedUser = null;
    this.form = { username: '', email: '', password: '' };
    this.formPermissions = new Set(DEFAULT_USER_PERMISSIONS);
    this.selectedGroupForPerms = null;
    this.groupPermsMap.set(new Map());
    this.dialogVisible = true;
  }

  async save() {
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
      ? await this.auth.updateUser(this.selectedUser.id, payload)
      : await this.auth.createUser(payload);
    if (!result.ok) {
      this.msg.add({ severity: 'error', summary: 'Usuarios', detail: result.error ?? 'Error al guardar' });
      return;
    }
    this.msg.add({ severity: 'success', summary: 'Usuarios', detail: 'Guardado correctamente' });
    await this.refresh();
    this.selectedUser = null;
    this.dialogVisible = false;
    this.form = { username: '', email: '', password: '' };
  }

  async delete(user: any) {
    if (!this.canDelete()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No tienes permisos para eliminar usuarios' });
      return;
    }
    const res = await this.auth.deleteUser(user.id);
    if (!res.ok) {
      this.msg.add({ severity: 'error', summary: 'Usuarios', detail: res.error ?? 'No se pudo eliminar' });
      return;
    }
    this.msg.add({ severity: 'success', summary: 'Usuarios', detail: 'Eliminado' });
    await this.refresh();
    if (this.selectedUser?.email === user.email) { this.selectedUser = null; this.dialogVisible = false; }
  }
}
