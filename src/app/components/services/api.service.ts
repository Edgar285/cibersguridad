import { Injectable, inject } from '@angular/core';
import { Auth } from './auth';

/**
 * ApiService — interceptor centralizado para todas las llamadas HTTP.
 * Adjunta automáticamente el token JWT, maneja errores de red y 429.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly auth = inject(Auth);
  readonly base = 'http://localhost:3000/api/v1';

  async request<T = unknown>(
    method: string,
    url: string,
    body?: unknown,
    skipAuth = false
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (!skipAuth) {
      const token = this.auth.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (res.status === 401) {
      this.auth.logout();
      window.location.href = '/auth/login';
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }

    if (res.status === 429) {
      throw new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.');
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.data?.message ?? data?.message ?? `Error ${res.status}`);
    }

    return data as T;
  }

  get<T = unknown>(path: string, skipAuth = false) {
    return this.request<T>('GET', `${this.base}${path}`, undefined, skipAuth);
  }

  post<T = unknown>(path: string, body: unknown, skipAuth = false) {
    return this.request<T>('POST', `${this.base}${path}`, body, skipAuth);
  }

  patch<T = unknown>(path: string, body: unknown) {
    return this.request<T>('PATCH', `${this.base}${path}`, body);
  }

  put<T = unknown>(path: string, body: unknown) {
    return this.request<T>('PUT', `${this.base}${path}`, body);
  }

  delete<T = unknown>(path: string) {
    return this.request<T>('DELETE', `${this.base}${path}`);
  }
}
