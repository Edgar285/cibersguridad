import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Permission } from '../../models/permissions';
import { Auth } from '../services/auth';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private required: Permission[] = [];
  private mode: 'any' | 'all' = 'all';

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly auth: Auth
  ) {}

  @Input()
  set appHasPermission(value: Permission | Permission[]) {
    this.required = Array.isArray(value) ? value : [value];
    this.updateView();
  }

  @Input()
  set appHasPermissionMode(mode: 'any' | 'all') {
    this.mode = mode;
    this.updateView();
  }

  private updateView() {
    const allowed = this.mode === 'any'
      ? this.auth.hasAnyPermission(this.required)
      : this.auth.hasPermissions(this.required);

    this.viewContainer.clear();
    if (allowed) this.viewContainer.createEmbeddedView(this.templateRef);
  }
}
