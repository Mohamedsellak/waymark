import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { BrandMark } from '@shared/components/brand-mark';
import { Icon } from '@shared/components/icon';
import { I18n } from '@core/i18n/i18n';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, BrandMark],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18n);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);

  protected logout(): void {
    this.menuOpen.set(false);
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
