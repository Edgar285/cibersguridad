import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GroupContextService {
  private readonly storeKey = 'erp-selected-group';
  private current = signal<string | null>(this.load());

  set(groupId: string) {
    this.current.set(groupId);
    localStorage.setItem(this.storeKey, groupId);
  }

  get() {
    return this.current();
  }

  clear() {
    this.current.set(null);
    localStorage.removeItem(this.storeKey);
  }

  private load(): string | null {
    return localStorage.getItem(this.storeKey);
  }
}
