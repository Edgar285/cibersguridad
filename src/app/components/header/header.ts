import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { Auth } from '../services/auth';
import { Permission } from '../../models/permissions';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, MenubarModule, AvatarModule, TagModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  private auth = inject(Auth);

  items: MenuItem[] = [];

  ngOnInit() {
    const base: MenuItem[] = [
      { label: 'Dashboard', icon: 'pi pi-chart-line', routerLink: '/dashboard' }
    ];

    const current = this.auth.getCurrentUser();
    const perms = new Set(current?.permissions ?? []);
    const isAdminOrHigher = perms.has(Permission.GroupsView);
    const isSuper = perms.has(Permission.SuperAdmin);

    if (isAdminOrHigher) {
      base.push(
        { label: 'Grupos',   icon: 'pi pi-users',    routerLink: '/groups' },
        { label: 'Usuarios', icon: 'pi pi-user-edit', routerLink: '/users'  }
      );
    }

    base.push({ label: 'Perfil', icon: 'pi pi-user', routerLink: '/profile' });

    if (isSuper) {
      base.push({ label: 'Admin usuarios', icon: 'pi pi-lock', routerLink: '/users' });
    }

    base.push({
      label: 'Acceso',
      icon: 'pi pi-shield',
      items: [
        { label: 'Iniciar Sesión', icon: 'pi pi-sign-in', routerLink: '/auth/login' },
        { label: 'Crear Cuenta',   icon: 'pi pi-user-plus', routerLink: '/auth/register' }
      ]
    });

    this.items = base;
  }
}
