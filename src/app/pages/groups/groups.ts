import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
import { ConfirmationService, MessageService } from 'primeng/api';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { Group, GroupInput, GroupService, GroupState } from '../../components/services/group.service';
import { HasPermissionDirective } from '../../components/directives/has-permission.directive';
import { Permission } from '../../models/permissions';
import { Auth } from '../../components/services/auth';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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

  protected permission = Permission;

  dialogVisible = false;
  editingId: string | null = null;

  stateOptions: { label: string; value: GroupState; tone: string }[] = [
    { label: 'Success', value: 'success', tone: 'success' },
    { label: 'Agree', value: 'agree', tone: 'info' },
    { label: 'X', value: 'x', tone: 'danger' }
  ];

  form = this.fb.group({
    nombre: ['', Validators.required],
    nivel: ['', Validators.required],
    actor: ['', Validators.required],
    integrantes: [0, [Validators.required, Validators.min(1)]],
    tickets: [0, [Validators.required, Validators.min(0)]],
    descripcion: ['', [Validators.required, Validators.maxLength(280)]],
    estado: ['success' as GroupState, Validators.required]
  });

  groups = signal<Group[]>([]);
  members = signal<string[]>(['super@erp.com', 'edgy@erp.com']);

  canCreate() {
    return this.auth.hasAnyPermission([Permission.GroupsAdd, Permission.GroupAdd]);
  }

  canEdit() {
    return this.auth.hasAnyPermission([Permission.GroupsEdit]);
  }

  canDelete() {
    return this.auth.hasAnyPermission([Permission.GroupsDelete, Permission.GroupDelete]);
  }

  stats = computed(() => {
    const data = this.groups();
    const total = data.length;
    const success = data.filter(g => g.estado === 'success').length;
    const agree = data.filter(g => g.estado === 'agree').length;
    const blocked = data.filter(g => g.estado === 'x').length;
    return [
      { label: 'Total grupos', value: total, icon: 'pi pi-users', tone: 'info' },
      { label: 'Success', value: success, icon: 'pi pi-check-circle', tone: 'success' },
      { label: 'Agree', value: agree, icon: 'pi pi-comment', tone: 'warning' },
      { label: 'X', value: blocked, icon: 'pi pi-ban', tone: 'danger' }
    ];
  });

  ngOnInit() {
    const loaded = this.groupsSvc.list();
    if (!loaded.length) {
      this.seed();
      return;
    }
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
      nombre: group.nombre,
      nivel: group.nivel,
      actor: group.actor,
      integrantes: group.integrantes,
      tickets: group.tickets,
      descripcion: group.descripcion,
      estado: group.estado
    });
    this.dialogVisible = true;
  }

  save() {
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

    if (this.editingId) {
      const updated = this.groupsSvc.update(this.editingId, payload);
      if (updated) {
        this.groups.set(this.groups().map(g => (g.id === updated.id ? updated : g)));
        this.msg.add({ severity: 'success', summary: 'Grupos', detail: 'Grupo actualizado' });
      }
    } else {
      const created = this.groupsSvc.create(payload);
      this.groups.set([...this.groups(), created]);
      this.msg.add({ severity: 'success', summary: 'Grupos', detail: 'Grupo creado' });
    }

    this.dialogVisible = false;
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
      accept: () => this.delete(group)
    });
  }

  private delete(group: Group) {
    if (!this.canDelete()) return;
    const removed = this.groupsSvc.delete(group.id);
    if (removed) {
      this.groups.set(this.groups().filter(g => g.id !== group.id));
      this.msg.add({ severity: 'success', summary: 'Grupos', detail: 'Grupo eliminado' });
    }
  }

  addMember(email: string) {
    if (!email) return;
    this.members.set([...this.members(), email]);
  }

  removeMember(email: string) {
    this.members.set(this.members().filter(m => m !== email));
  }

  severity(state: GroupState) {
    if (state === 'success') return 'success';
    if (state === 'agree') return 'info';
    return 'danger';
  }

  private seed() {
    const seedData: GroupInput[] = [
      {
        nombre: 'Ventas Norte',
        actor: 'María Torres',
        nivel: 'Estratégico',
        integrantes: 12,
        tickets: 3,
        descripcion: 'Pipeline y cuentas clave en la región norte.',
        estado: 'success'
      },
      {
        nombre: 'Soporte TI',
        actor: 'Luis Romero',
        nivel: 'Operativo',
        integrantes: 8,
        tickets: 11,
        descripcion: 'Mesa de ayuda y seguimiento de incidentes.',
        estado: 'agree'
      },
      {
        nombre: 'Finanzas',
        actor: 'Ana López',
        nivel: 'Táctico',
        integrantes: 6,
        tickets: 1,
        descripcion: 'Control de gastos, presupuestos y reportes.',
        estado: 'x'
      }
    ];

    seedData.forEach(item => this.groupsSvc.create(item));
    this.groups.set(this.groupsSvc.list());
  }
}
