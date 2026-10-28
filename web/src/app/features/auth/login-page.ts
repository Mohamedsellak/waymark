import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { errorMessage } from '@core/utils/http-error';
import { ContourField } from '@shared/components/contour-field';
import { Icon } from '@shared/components/icon';
import { I18n, t } from '@core/i18n/i18n';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, ContourField, Icon],
  template: `
    <div class="form-side">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="intro">
          <h1>{{ i18n.t('login.h1') }}</h1>
          <p class="muted">{{ i18n.t('login.lede') }}</p>
        </div>
        @if (error(); as msg) { <p class="notice notice-error" role="alert"><app-icon name="alert" />{{ msg }}</p> }

        <label class="field"><span>{{ i18n.t('auth.email') }}</span>
          <input type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.touched && form.controls.email.invalid) { <span class="field-error">{{ i18n.t('auth.invalidEmail') }}</span> }
        </label>
        <label class="field"><span>{{ i18n.t('auth.password') }}</span>
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>

        <button class="btn btn-block" type="submit" [disabled]="loading()">
          @if (loading()) { <app-icon name="loader" class="spin" /> {{ i18n.t('login.busy') }} } @else { {{ i18n.t('login.submit') }} }
        </button>
        <p class="switch">{{ i18n.t('login.new') }} <a routerLink="/signup">{{ i18n.t('login.create') }}</a></p>
      </form>
    </div>
    <div class="art" aria-hidden="true">
      <app-contour-field [width]="800" [height]="900" [seed]="23" [levels]="18" />
      <blockquote>{{ i18n.t('login.quote') }}</blockquote>
    </div>
  `,
  styleUrls: ['./auth-layout.scss'],
  styles: `.spin { animation: spin 0.9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`,
})
export class LoginPage {
  protected readonly i18n = inject(I18n);
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
        this.error.set(errorMessage(err, t('login.failed')));
        this.loading.set(false);
      },
    });
  }
}
