import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { Group, GroupInput, GroupService, GroupState } from '../../components/services/group.service';
import { HasPermissionDirective } from '../../components/directives/has-permission.directive';
import { Permission, PERMISSIONS_BY_CATEGORY } from '../../models/permissions';
import { Auth } from '../../components/services/auth';
import { PermissionService } from '../../components/services/permission.service';

/** Miembro de grupo con sus permisos específicos */
interface GroupMember {
  userId: string;
  email: string;
  username: string;
  permissions: string[];
}

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    TagModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule,
    CheckboxModule,
    MainLayout,
    HasPermissionDirective
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './groups.html',
  styleUrl: './groups.css'
})
export class Groups implements OnInit {
  private fb = inject(FormBuilder);
  private groupsSvc = inject(GroupService);
  private confirm = inject(ConfirmationService);
  private msg = inject(MessageService);
  private auth = inject(Auth);
  private permSvc = inject(PermissionService);

  protected permission = Permission;
  readonly permsByCategory = PERMISSIONS_BY_CATEGORY;

  dialogVisible = false;
  editingId: string | null = null;

  // ── Gestión de miembros por grupo ──────────────────────────────
  membersDialogVisible = false;
  selectedGroupForMembers = signal<Group | null>(null);
  groupMembersMap = signal<Map<string, GroupMember[]>>(new Map());

  // Para nuevo miembro
  newMemberEmail = '';
  // Para editar permisos de un miembro
  editingMember = signal<GroupMember | null>(null);
  memberPermSet = signal<Set<string>>(new Set());

  stateOptions: { label: string; value: GroupState; tone: string }[] = [
    { label: 'Success', value: 'success', tone: 'success' },
    { label: 'Agree',   value: 'agree',   tone: 'info'    },
    { label: 'X',       value: 'x',       tone: 'danger'  }
  ];

  form = this.fb.group({
    nombre:      ['', Validators.required],
    nivel:       ['', Validators.required],
    actor:       ['', Validators.required],
    integrantes: [0, [Validators.required, Validators.min(1)]],
    tickets:     [0, [Validators.required, Validators.min(0)]],
    descripcion: ['', [Validators.required, Validators.maxLength(280)]],
    estado:      ['success' as GroupState, Validators.required]
  });

  groups = signal<Group[]>([]);

  canCreate() { return this.permSvc.hasPermission(Permission.GroupsAdd); }
  canEdit()   { return this.permSvc.hasPermission(Permission.GroupsEdit); }
  canDelete() { return this.permSvc.hasPermission(Permission.GroupsDelete); }
  canManage() { return this.canCreate() || this.canEdit() || this.canDelete() || this.permSvc.hasPermission(Permission.GroupsManage); }

  stats = computed(() => {
    const data = this.groups();
    const total   = data.length;
    const success = data.filter(g => g.estado === 'success').length;
    const agree   = data.filter(g => g.estado === 'agree').length;
    const blocked = data.filter(g => g.estado === 'x').length;
    return [
      { label: 'Total grupos', value: total,   icon: 'pi pi-users',       tone: 'info'    },
      { label: 'Success',      value: success,  icon: 'pi pi-check-circle', tone: 'success' },
      { label: 'Agree',        value: agree,    icon: 'pi pi-comment',      tone: 'warning' },
      { label: 'X',            value: blocked,  icon: 'pi pi-ban',          tone: 'danger'  }
    ];
  });

  currentMembers = computed(() => {
    const g = this.selectedGroupForMembers();
    if (!g) return [];
    return this.groupMembersMap().get(g.id) ?? [];
  });

  ngOnInit() {
    void this.loadGroups();
  }

  private async loadGroups() {
    await this.groupsSvc.load();
    const loaded = this.groupsSvc.list();
    if (!loaded.length) { this.seed(); return; }
    this.groups.set(loaded);
  }

  openCreate() {
    if (!this.canCreate()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No tienes permiso para crear grupos.' });
      return;
    }
    this.editingId = null;
    this.form.reset({ estado: 'success', integrantes: 1, tickets: 0 });
    this.dialogVisible = true;
  }

  openEdit(group: Group) {
    if (!this.canEdit()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No puedes editar grupos.' });
      return;
    }
    this.editingId = group.id;
    this.form.patchValue({
      nombre: group.nombre, nivel: group.nivel, actor: group.actor,
      integrantes: group.integrantes, tickets: group.tickets,
      descripcion: group.descripcion, estado: group.estado
    });
    this.dialogVisible = true;
  }

  async save() {
    if (this.editingId && !this.canEdit()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No puedes editar grupos.' });
      return;
    }
    if (!this.editingId && !this.canCreate()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No tienes permiso para crear grupos.' });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.add({ severity: 'warn', summary: 'Validación', detail: 'Completa los campos obligatorios' });
      return;
    }
    const payload = this.form.value as GroupInput;
    try {
      if (this.editingId) {
        const updated = await this.groupsSvc.update(this.editingId, payload);
        this.groups.set(this.groups().map(g => g.id === updated.id ? updated : g));
        this.msg.add({ severity: 'success', summary: 'Grupos', detail: 'Grupo actualizado' });
      } else {
        const created = await this.groupsSvc.create(payload);
        this.groups.set([...this.groups(), created]);
        this.msg.add({ severity: 'success', summary: 'Grupos', detail: 'Grupo creado' });
      }
      this.dialogVisible = false;
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'No se pudo guardar el grupo' });
    }
  }

  confirmDelete(group: Group) {
    if (!this.canDelete()) {
      this.msg.add({ severity: 'warn', summary: 'Permisos', detail: 'No puedes eliminar grupos.' });
      return;
    }
    this.confirm.confirm({
      header: 'Eliminar grupo',
      message: `¿Eliminar "${group.nombre}"?`,
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteGroup(group)
    });
  }

  private async deleteGroup(group: Group) {
    if (!this.canDelete()) return;
    try {
      const removed = await this.groupsSvc.delete(group.id);
      if (removed) {
        this.groups.set(this.groups().filter(g => g.id !== group.id));
        this.msg.add({ severity: 'success', summary: 'Grupos', detail: 'Grupo eliminado' });
      }
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'No se pudo eliminar' });
    }
  }

  // ── Gestión de miembros del grupo ──────────────────────────────

  openMembers(group: Group) {
    this.selectedGroupForMembers.set(group);
    this.newMemberEmail = '';
    this.editingMember.set(null);
    this.membersDialogVisible = true;
  }

  async addMember() {
    const email = this.newMemberEmail.trim();
    if (!email) return;
    const group = this.selectedGroupForMembers()!;
    const current = this.groupMembersMap().get(group.id) ?? [];
    if (current.find(m => m.email === email)) {
      this.msg.add({ severity: 'warn', summary: 'Miembros', detail: 'El usuario ya es miembro del grupo.' });
      return;
    }
    const newMember: GroupMember = {
      userId: `usr-${Date.now()}`,
      email,
      username: email.split('@')[0],
      permissions: ['tickets:view']
    };
    const updated = [...current, newMember];
    const map = new Map(this.groupMembersMap());
    map.set(group.id, updated);
    this.groupMembersMap.set(map);
    this.newMemberEmail = '';

    await this.groupsSvc.setMemberPermissions(group.id, newMember.userId, newMember.permissions);
    this.msg.add({ severity: 'success', summary: 'Miembros', detail: `${email} agregado al grupo.` });
  }

  async removeMember(member: GroupMember) {
    const group = this.selectedGroupForMembers()!;
    await this.groupsSvc.removeMember(group.id, member.userId);
    const current = this.groupMembersMap().get(group.id) ?? [];
    const map = new Map(this.groupMembersMap());
    map.set(group.id, current.filter(m => m.userId !== member.userId));
    this.groupMembersMap.set(map);
    this.msg.add({ severity: 'info', summary: 'Miembros', detail: `${member.email} removido del grupo.` });
  }

  openEditMemberPerms(member: GroupMember) {
    this.editingMember.set({ ...member });
    this.memberPermSet.set(new Set(member.permissions));
  }

  hasMemberPerm(perm: string): boolean {
    return this.memberPermSet().has(perm);
  }

  toggleMemberPerm(perm: string) {
    const set = new Set(this.memberPermSet());
    if (set.has(perm)) set.delete(perm); else set.add(perm);
    this.memberPermSet.set(set);
  }

  async saveMemberPerms() {
    const member = this.editingMember();
    const group  = this.selectedGroupForMembers();
    if (!member || !group) return;

    const newPerms = [...this.memberPermSet()];
    const current  = this.groupMembersMap().get(group.id) ?? [];
    const map      = new Map(this.groupMembersMap());
    map.set(group.id, current.map(m => m.userId === member.userId ? { ...m, permissions: newPerms } : m));
    this.groupMembersMap.set(map);

    await this.groupsSvc.setMemberPermissions(group.id, member.userId, newPerms);

    this.editingMember.set(null);
    this.msg.add({ severity: 'success', summary: 'Permisos', detail: 'Permisos actualizados.' });
  }

  severity(state: GroupState) {
    if (state === 'success') return 'success';
    if (state === 'agree')   return 'info';
    return 'danger';
  }

  private seed() {
    // En modo backend, no hacemos seed desde el frontend
    // El backend arranca con estado vacío, el usuario debe crear grupos
    this.groups.set([]);
  }
}
