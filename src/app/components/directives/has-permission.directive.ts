import { Directive, Input, TemplateRef, ViewContainerRef, effect } from '@angular/core';
import { Permission } from '../../models/permissions';
import { PermissionService } from '../services/permission.service';

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
    private readonly permSvc: PermissionService
  ) {
    // Re-evalúa cuando cambian los permisos del grupo activo
    effect(() => {
      this.permSvc.groupPermsToken();
      this.updateView();
    });
  }

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
      ? this.required.some(p => this.permSvc.hasPermission(p as string))
      : this.required.every(p => this.permSvc.hasPermission(p as string));

    this.viewContainer.clear();
    if (allowed) this.viewContainer.createEmbeddedView(this.templateRef);
  }
}
