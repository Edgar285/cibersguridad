import { AbstractControl, ValidationErrors } from '@angular/forms';

// Símbolos definidos
const SPECIAL = /[!@#$%^&*()_\+\-=\[\]{};:'",.<>\/\?]/;

// Password mínimo 10 + 1 símbolo
export function password10WithSymbol(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '') as string;
  if (!v) return null;

  if (v.length < 10) return { min10: true };
  if (!SPECIAL.test(v)) return { symbol: true };

  return null;
}

// Mayores de edad (18+)
export function onlyAdult(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;

  const birth = new Date(control.value);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  return age >= 18 ? null : { underage: true };
}

// Match password
export function matchPass(group: AbstractControl): ValidationErrors | null {
  const p = group.get('password')?.value;
  const c = group.get('confirmPassword')?.value;

  if (!p || !c) return null;
  return p === c ? null : { mismatch: true };
}