import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { Auth } from '../../components/services/auth';
import { Permission } from '../../models/permissions';

@Component({
  selector: 'app-user-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, TagModule, MainLayout],
  templateUrl: './user-admin.html',
  styleUrl: './user-admin.css'
})
export class UserAdmin implements OnInit {
  private auth = inject(Auth);

  users = [] as any[];
  allPerms = Object.values(Permission);
  selectedUser: any = null;
  selectedPerm: Permission | null = null;

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    // Nota: auth no expone listado completo; usamos getLastUser como base mock.
    const current = this.auth.getCurrentUser();
    const last = this.auth.getLastUser();
    const base = [] as any[];
    if (current) base.push(current);
    if (last && (!current || last.email !== current.email)) base.push(last);
    // Agrega superAdmin de semilla manualmente
    base.push({ username: 'superAdmin', email: 'super@erp.com', permissions: this.allPerms });
    this.users = base;
  }

  select(user: any) {
    this.selectedUser = user;
  }

  addPermission() {
    if (!this.selectedUser || !this.selectedPerm) return;
    const set = new Set(this.selectedUser.permissions || []);
    set.add(this.selectedPerm);
    this.selectedUser.permissions = Array.from(set);
  }

  removePermission(perm: Permission) {
    if (!this.selectedUser) return;
    this.selectedUser.permissions = (this.selectedUser.permissions || []).filter((p: Permission) => p !== perm);
  }
}
