import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Router } from '@angular/router';
import { GroupService, Group } from '../../components/services/group.service';
import { GroupContextService } from '../../components/services/group-context.service';
import { PermissionService } from '../../components/services/permission.service';
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
  private permSvc = inject(PermissionService);
  private router = inject(Router);

  groups: Group[] = [];

  async ngOnInit() {
    await this.groupsSvc.load();
    this.groups = this.groupsSvc.list();
  }

  select(group: Group) {
    this.ctx.set(group.id);
    this.permSvc.refreshPermissionsForGroup(group.id);
    this.router.navigate(['/dashboard']);
  }
}
