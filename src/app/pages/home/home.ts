import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { MainLayout } from '../../layouts/main-layout/main-layout';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, CardModule, TagModule, ProgressBarModule, MainLayout],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  stats = [
    { label: 'Grupos', value: 12, trend: '+2 esta semana', icon: 'pi pi-users', tone: 'info' },
    { label: 'Usuarios activos', value: 84, trend: '+5 hoy', icon: 'pi pi-user', tone: 'success' },
    { label: 'Reportes', value: 24, trend: '3 pendientes', icon: 'pi pi-file', tone: 'warning' }
  ];

  quickActions = [
    { label: 'Nuevo grupo', icon: 'pi pi-plus', routerLink: '/groups' },
    { label: 'Invitar usuario', icon: 'pi pi-send', routerLink: '/users' },
    { label: 'Ver reportes', icon: 'pi pi-file', routerLink: '/dashboard' }
  ];

  highlights = [
    { title: 'Avance de proyectos', value: 72 },
    { title: 'Adopción de usuarios', value: 64 }
  ];
}
