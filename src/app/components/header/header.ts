import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, MenubarModule, AvatarModule, TagModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  items: MenuItem[] = [
    { label: 'Inicio', icon: 'pi pi-home', routerLink: '/' },
    { label: 'Dashboard', icon: 'pi pi-chart-line', routerLink: '/dashboard' },
    { label: 'Grupos', icon: 'pi pi-users', routerLink: '/groups' },
    { label: 'Usuarios', icon: 'pi pi-user', routerLink: '/users' },
    {
      label: 'Acceso',
      icon: 'pi pi-shield',
      items: [
        { label: 'Iniciar Sesión', icon: 'pi pi-sign-in', routerLink: '/auth/login' },
        { label: 'Crear Cuenta', icon: 'pi pi-user-plus', routerLink: '/auth/register' }
      ]
    }
  ];

}
