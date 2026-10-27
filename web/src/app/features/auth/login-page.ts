import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { errorMessage } from '@core/utils/http-error';
import { ContourField } from '@shared/components/contour-field';
import { Icon } from '@shared/components/icon';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, ContourField, Icon],
  template: `
    <div class="form-side">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="intro">
          <h1>Welcome back</h1>
          <p class="muted">Log in to open your route planner.</p>
        </div>
        @if (error(); as msg) { <p class="notice notice-error" role="alert"><app-icon name="alert" />{{ msg }}</p> }

        <label class="field"><span>Email</span>
          <input type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.touched && form.controls.email.invalid) { <span class="field-error">Enter a valid email address.</span> }
        </label>
        <label class="field"><span>Password</span>
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>

        <button class="btn btn-block" type="submit" [disabled]="loading()">
          @if (loading()) { <app-icon name="loader" class="spin" /> Logging in… } @else { Log in }
        </button>
        <p class="switch">New to Waymark? <a routerLink="/signup">Create an account</a></p>
      </form>
    </div>
    <div class="art" aria-hidden="true">
      <app-contour-field [width]="800" [height]="900" [seed]="23" [levels]="18" />
      <blockquote>Your stops and fleet settings are saved in this browser between visits.</blockquote>
    </div>
  `,
  styleUrls: ['./auth-layout.scss'],
  styles: `.spin { animation: spin 0.9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl() || '/home'),
      error: (err) => {
        this.error.set(errorMessage(err, 'That email and password don’t match an account.'));
        this.loading.set(false);
      },
    });
  }
}
