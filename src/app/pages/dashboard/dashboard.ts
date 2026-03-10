import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { GroupContextService } from '../../components/services/group-context.service';
import { GroupService } from '../../components/services/group.service';
import { TicketService } from '../../components/services/ticket.service';
import { Ticket } from '../../models/ticket';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonModule, RouterModule, CardModule, TagModule, TableModule, MainLayout],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  private ctx = inject(GroupContextService);
  private groups = inject(GroupService);
  private tickets = inject(TicketService);
  private router = inject(Router);

  group = computed(() => {
    const id = this.ctx.get();
    return id ? this.groups.get(id) : null;
  });

  stats = computed(() => {
    const g = this.group();
    if (!g) return null;
    const list = this.tickets.listByGroup(g.id);
    const total = list.length;
    const byStatus = (status: Ticket['status']) => list.filter(t => t.status === status).length;
    return {
      total,
      pending: byStatus('pending'),
      inProgress: byStatus('in_progress'),
      review: byStatus('review'),
      done: byStatus('done'),
      blocked: byStatus('blocked'),
      recent: list.slice(0, 5)
    };
  });

  goSelect() {
    this.router.navigate(['/group-select']);
  }

  goCreate() {
    this.router.navigate(['/tickets/create']);
  }
}
