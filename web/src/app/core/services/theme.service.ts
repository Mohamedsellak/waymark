import { Injectable, computed, signal } from '@angular/core';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'wm_theme';

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Light "survey sheet" or dark "chart night". Follows the OS unless the user picks one. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media.matches);
  readonly choice = signal<ThemeChoice>(read());
  readonly isDark = computed(() => (this.choice() === 'system' ? this.systemDark() : this.choice() === 'dark'));

  constructor() {
    this.media.addEventListener('change', (e) => this.systemDark.set(e.matches));
    this.apply();
  }

  toggle(): void {
    this.choice.set(this.isDark() ? 'light' : 'dark');
    try {
      localStorage.setItem(KEY, this.choice());
    } catch {
      /* preference just won't persist */
    }
    this.apply();
  }

  private apply(): void {
    const c = this.choice();
    if (c === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', c);
  }
}
