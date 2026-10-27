import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Paginated, User, UserRole } from '@core/models/user.model';
import { UserInput, UsersService } from '@core/services/users.service';
import { errorMessage } from '@core/utils/http-error';
import { Icon } from '@shared/components/icon';

@Component({
  selector: 'app-users-page',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit {
  private readonly users = inject(UsersService);

  protected readonly page = signal<Paginated<User> | null>(null);
  protected readonly editing = signal<User | 'new' | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['User' as UserRole, Validators.required],
    password: ['', Validators.minLength(8)],
  });

  ngOnInit(): void {
    this.load(1);
  }

  protected load(pageNumber: number): void {
    this.users.list(pageNumber).subscribe({
      next: (page) => this.page.set(page),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  protected openNew(): void {
    this.form.reset({ email: '', role: 'User', password: '' });
    this.form.controls.password.addValidators(Validators.required);
    this.form.controls.password.updateValueAndValidity();
    this.editing.set('new');
  }

  protected openEdit(user: User): void {
    this.form.reset({ email: user.email, role: user.role, password: '' });
    this.form.controls.password.removeValidators(Validators.required);
    this.form.controls.password.updateValueAndValidity();
    this.editing.set(user);
  }

  protected save(): void {
    const target = this.editing();
    if (!target || this.form.invalid) return;

    const { password, ...rest } = this.form.getRawValue();
    const input: UserInput = password ? { ...rest, password } : rest;
    const request = target === 'new' ? this.users.create(input) : this.users.update(target.id, input);

    request.subscribe({
      next: () => {
        this.editing.set(null);
        this.load(this.page()?.current_page ?? 1);
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  protected remove(user: User): void {
    if (!confirm(`Delete ${user.email}?`)) return;
    this.users.remove(user.id).subscribe({
      next: () => this.load(this.page()?.current_page ?? 1),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
