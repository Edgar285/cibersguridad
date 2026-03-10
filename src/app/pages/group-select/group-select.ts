import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Router } from '@angular/router';
import { GroupService, Group } from '../../components/services/group.service';
import { GroupContextService } from '../../components/services/group-context.service';
import { MainLayout } from '../../layouts/main-layout/main-layout';

@Component({
  selector: 'app-group-select',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, MainLayout],
  templateUrl: './group-select.html',
  styleUrl: './group-select.css'
})
export class GroupSelect implements OnInit {
  private groupsSvc = inject(GroupService);
  private ctx = inject(GroupContextService);
  private router = inject(Router);

  groups: Group[] = [];

  ngOnInit() {
    this.groups = this.groupsSvc.list();
    if (!this.groups.length) {
      const seed = [
        {
          nombre: 'Ventas Norte',
          nivel: 'Estratégico',
          actor: 'Líder ventas',
          integrantes: 10,
          tickets: 5,
          descripcion: 'Cuentas clave y pipeline',
          estado: 'success' as const
        },
        {
          nombre: 'Soporte TI',
          nivel: 'Operativo',
          actor: 'Mesa de ayuda',
          integrantes: 8,
          tickets: 12,
          descripcion: 'Incidentes y cambios',
          estado: 'agree' as const
        }
      ];
      seed.forEach(s => this.groupsSvc.create(s));
      this.groups = this.groupsSvc.list();
    }
  }

  select(group: Group) {
    this.ctx.set(group.id);
    this.router.navigate(['/dashboard']);
  }
}
