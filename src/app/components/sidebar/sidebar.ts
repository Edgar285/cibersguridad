import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, PanelMenuModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  readonly version = 'v0.0.0';

  items: MenuItem[] = [
    {
      label: 'Inicio',
      icon: 'pi pi-home',
      routerLink: '/home'
    },
    {
      label: 'Dashboard',
      icon: 'pi pi-chart-line',
      routerLink: '/dashboard'
    },
    {
      label: 'Grupos',
      icon: 'pi pi-users',
      routerLink: '/groups'
    },
    {
      label: 'Usuarios',
      icon: 'pi pi-user',
      routerLink: '/users'
    },
    {
      label: 'Reportes',
      icon: 'pi pi-file',
      items: [
        { label: 'Ventas', icon: 'pi pi-shopping-cart' },
        { label: 'Inventario', icon: 'pi pi-warehouse' }
      ]
    },
    {
      label: 'Perfil',
      icon: 'pi pi-user',
      routerLink: '/auth/login'
    }
  ];
}
