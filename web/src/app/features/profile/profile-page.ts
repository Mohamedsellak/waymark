import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ProfileService } from '@core/services/profile.service';
import { errorMessage } from '@core/utils/http-error';
import { Icon } from '@shared/components/icon';

const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('password')?.value === group.get('password_confirmation')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly message = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      current_password: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected changePassword(): void {
    if (this.form.invalid) return;
    this.profile.changePassword(this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset();
        this.message.set({ type: 'success', text: 'Password updated.' });
      },
      error: (err) => this.message.set({ type: 'error', text: errorMessage(err) }),
    });
  }

  protected deleteAccount(): void {
    if (!confirm('Delete your account permanently? This cannot be undone.')) return;
    this.profile.deleteAccount().subscribe({
      next: () => {
        this.auth.clear();
        this.router.navigate(['/']);
      },
      error: (err) => this.message.set({ type: 'error', text: errorMessage(err) }),
    });
  }
}
