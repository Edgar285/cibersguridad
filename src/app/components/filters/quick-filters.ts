import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface QuickFilter {
  key: string;
  label: string;
}

@Component({
  selector: 'app-quick-filters',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="quick-filters">
      <button
        pButton
        *ngFor="let filter of filters"
        type="button"
        [label]="filter.label"
        class="p-button-text"
        [outlined]="active !== filter.key"
        (click)="toggle(filter.key)"
      ></button>
      <button
        pButton
        type="button"
        label="Limpiar"
        class="p-button-text"
        [outlined]="!active"
        (click)="clear()"
      ></button>
    </div>
  `,
  styles: [
    `
      .quick-filters {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
    `
  ]
})
export class QuickFilters {
  @Input() filters: QuickFilter[] = [];
  @Input() active: string | null = null;
  @Output() change = new EventEmitter<string | null>();

  toggle(key: string) {
    this.active = this.active === key ? null : key;
    this.change.emit(this.active);
  }

  clear() {
    this.active = null;
    this.change.emit(null);
  }
}
