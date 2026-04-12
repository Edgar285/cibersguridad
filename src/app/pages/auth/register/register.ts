import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { KeyFilterModule } from 'primeng/keyfilter';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { Auth } from '../../../components/services/auth';
import {
  password10WithSymbol,
  onlyAdult,
  matchPass
} from '../../../components/validators/simple.validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    KeyFilterModule,
    ToastModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);
  private msg = inject(MessageService);

  // Allow access even if already logged in so users can registrar otra cuenta.
  constructor() {}

  showPassword = false;
  showConfirm = false;

  form = this.fb.group(
    {
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', Validators.required],
      address: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      birthdate: [null, [Validators.required, onlyAdult]],
      password: ['', [Validators.required, password10WithSymbol]],
      confirmPassword: ['', Validators.required]
    },
    { validators: matchPass }
  );

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirm() {
    this.showConfirm = !this.showConfirm;
  }

  limitTo10(controlName: string) {
    const control = this.form.get(controlName);
    if (!control) return;

    const value = (control.value ?? '') as string;
    if (value.length > 10) {
      control.setValue(value.slice(0, 10), { emitEvent: false });
    }
  }

  c(name: string) {
    return this.form.get(name)!;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Corrige los campos obligatorios para continuar.'
      });
      return;
    }

    const result = this.auth.register({
      username: this.form.value.username!,
      email: this.form.value.email!,
      password: this.form.value.password!,
      fullName: this.form.value.fullName!,
      address: this.form.value.address!,
      phone: this.form.value.phone!,
      birthdate: this.form.value.birthdate
        ? new Date(this.form.value.birthdate).toISOString()
        : undefined
    });

    if (!result.ok) {
      this.msg.add({ severity: 'error', summary: 'Registro', detail: result.error ?? 'No se pudo registrar' });
      return;
    }

    this.msg.add({
      severity: 'success',
      summary: 'Registro exitoso',
      detail: 'Tu cuenta fue creada correctamente.'
    });

    setTimeout(() => this.router.navigate(['/auth/login']), 800);
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}