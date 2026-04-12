import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { Auth } from '../../../components/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,            
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    ButtonModule,
    ToastModule,
  ],
  providers: [],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);     
  private auth = inject(Auth);
  private router = inject(Router);
  private msg = inject(MessageService);

  // Mantén el formulario visible incluso si hay sesión activa (evita redirección automática).
  constructor() {}

  form = this.fb.group({
    userOrEmail: ['', Validators.required],
    password: ['', Validators.required]
  });

  c(name: 'userOrEmail' | 'password') {
    return this.form.get(name)!;
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.add({ severity: 'warn', summary: 'Validación', detail: 'Completa usuario y contraseña' });
      return;
    }

    const { ok, error } = await this.auth.login(this.form.value.userOrEmail!, this.form.value.password!);

    if (!ok) {
      this.msg.add({ severity: 'error', summary: 'Login', detail: error ?? 'Credenciales incorrectas' });
      return;
    }

    this.router.navigate(['/group-select']);
  }
}
