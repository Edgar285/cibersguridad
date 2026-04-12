import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { Auth } from '../services/auth';
import { Permission } from '../../models/permissions';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, PanelMenuModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  private auth = inject(Auth);
  readonly version = 'v0.0.0';

  items: MenuItem[] = [];

  ngOnInit() {
    const isAdmin = this.auth.hasAnyPermission([Permission.GroupsView]);

    this.items = [
      { label: 'Dashboard', icon: 'pi pi-chart-line', routerLink: '/dashboard' }
    ];

    if (isAdmin) {
      this.items.push(
        { label: 'Grupos',   icon: 'pi pi-users',    routerLink: '/groups' },
        { label: 'Usuarios', icon: 'pi pi-user-edit', routerLink: '/users'  }
      );
    }

    this.items.push({ label: 'Perfil', icon: 'pi pi-user', routerLink: '/profile' });
  }
}
