import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { Permission } from '../../models/permissions';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, PanelMenuModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  private permSvc = inject(PermissionService);
  readonly version = 'v0.0.0';

  items: MenuItem[] = [];

  ngOnInit() {
    const canManageGroups = this.permSvc.hasPermission(Permission.GroupsView) || this.permSvc.hasPermission(Permission.GroupsManage);
    const canManageUsers  = this.permSvc.hasPermission(Permission.UsersView)  || this.permSvc.hasPermission(Permission.UsersManage);

    this.items = [
      { label: 'Dashboard', icon: 'pi pi-chart-line', routerLink: '/dashboard' },
      { label: 'Tickets',   icon: 'pi pi-ticket',     routerLink: '/tickets/list' }
    ];

    if (canManageGroups) {
      this.items.push({ label: 'Grupos', icon: 'pi pi-users', routerLink: '/groups' });
    }

    if (canManageUsers) {
      this.items.push({ label: 'Usuarios', icon: 'pi pi-user-edit', routerLink: '/users' });
    }

    this.items.push({ label: 'Perfil', icon: 'pi pi-user', routerLink: '/profile' });
  }
}
