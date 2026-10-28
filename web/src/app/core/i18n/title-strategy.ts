import { Injectable, effect, inject, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { MessageKey } from './messages';
import { lang, t } from './i18n';

/** Route `title`s are message keys; this translates them and retitles the tab when the language changes. */
@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private snapshot?: RouterStateSnapshot;

  constructor() {
    super();
    effect(() => {
      lang();
      untracked(() => this.snapshot && this.updateTitle(this.snapshot));
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.snapshot = snapshot;
    const key = this.buildTitle(snapshot) as MessageKey | undefined;
    if (!key) return;
    this.title.setTitle(key === 'title.landing' ? t(key) : `${t(key)} · Waymark`);
  }
}
