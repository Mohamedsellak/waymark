import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { errorMessage } from '@core/utils/http-error';
import { ContourField } from '@shared/components/contour-field';
import { Icon } from '@shared/components/icon';

const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('password')?.value === group.get('password_confirmation')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink, ContourField, Icon],
  template: `
    <div class="form-side">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="intro">
          <h1>Create your account</h1>
          <p class="muted">Plan routes for one van or a whole fleet.</p>
        </div>
        @if (error(); as msg) { <p class="notice notice-error" role="alert"><app-icon name="alert" />{{ msg }}</p> }
        @if (notice(); as msg) { <p class="notice notice-success" role="status"><app-icon name="check" />{{ msg }}</p> }

        <label class="field"><span>Work email</span>
          <input type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.touched && form.controls.email.invalid) { <span class="field-error">Enter a valid email address.</span> }
        </label>
        <label class="field"><span>Password</span>
          <input type="password" formControlName="password" autocomplete="new-password" />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <span class="field-error">Use at least 8 characters.</span>
          } @else { <span class="hint">At least 8 characters.</span> }
        </label>
        <label class="field"><span>Confirm password</span>
          <input type="password" formControlName="password_confirmation" autocomplete="new-password" />
          @if (form.hasError('mismatch') && form.controls.password_confirmation.touched) {
            <span class="field-error">The two passwords don’t match.</span>
          }
        </label>

        <button class="btn btn-block" type="submit" [disabled]="loading()">
          @if (loading()) { <app-icon name="loader" class="spin" /> Creating account… } @else { Create account }
        </button>
        <p class="switch">Already have an account? <a routerLink="/login">Log in</a></p>
      </form>
    </div>
    <div class="art" aria-hidden="true">
      <app-contour-field [width]="800" [height]="900" [seed]="41" [levels]="18" />
      <blockquote>Start with a sample of eleven deliveries, or import your own stops from a CSV.</blockquote>
    </div>
  `,
  styleUrls: ['./auth-layout.scss'],
  styles: `.spin { animation: spin 0.9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`,
})
export class SignupPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.signup(this.form.getRawValue()).subscribe({
      next: (user) => {
        if (user) {
          this.router.navigate(['/home']);
        } else {
          this.notice.set('Almost there. Open the link we emailed you to confirm your address, then log in.');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
