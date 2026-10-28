import { Injectable, signal } from '@angular/core';
import { EN, FR, Message, MessageKey } from './messages';

export type Lang = 'en' | 'fr';
const KEY = 'wm_lang';
const DICTS: Record<Lang, Record<MessageKey, Message>> = { en: EN, fr: FR };

function read(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'en' || v === 'fr') return v;
  } catch {
    /* fall through to the browser language */
  }
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

const current = signal<Lang>(read());
const rules: Record<Lang, Intl.PluralRules> = { en: new Intl.PluralRules('en'), fr: new Intl.PluralRules('fr') };

type Params = Record<string, string | number>;

/**
 * Translated text for `key`, with `{name}` placeholders filled from `params`.
 * Plural messages pick their form from `params.count`. Reads a signal, so templates,
 * computeds and effects that call it update when the language changes.
 */
export function t(key: MessageKey, params?: Params): string {
  const lang = current();
  const msg = DICTS[lang][key];
  const text = typeof msg === 'string' ? msg : rules[lang].select(Number(params?.['count'] ?? 0)) === 'one' ? msg.one : msg.other;
  return params ? text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : text;
}

/** Current language, for code that formats numbers or talks to locale-aware services. */
export const lang = current.asReadonly();

/** English or French. Follows the browser on first visit, then the user's pick. */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = lang;
  readonly t = t;

  constructor() {
    this.apply();
  }

  toggle(): void {
    current.set(current() === 'en' ? 'fr' : 'en');
    try {
      localStorage.setItem(KEY, current());
    } catch {
      /* preference just won't persist */
    }
    this.apply();
  }

  private apply(): void {
    document.documentElement.lang = current();
  }
}
