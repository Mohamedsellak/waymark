import { HttpErrorResponse } from '@angular/common/http';
import { lang, t } from '@core/i18n/i18n';
import { MessageKey } from '@core/i18n/messages';

/** Solver statuses whose meaning doesn't depend on the body, so they can be shown in the user's language. */
const BY_STATUS: Record<number, MessageKey> = {
  0: 'error.offline',
  401: 'error.session',
  403: 'error.forbidden',
  413: 'error.tooLarge',
  429: 'error.rate',
  503: 'error.unavailable',
};

/** Turns a Supabase or solver error into one readable message. */
export function errorMessage(error: unknown, fallback = t('error.generic')): string {
  if (error instanceof HttpErrorResponse) {
    const known = BY_STATUS[error.status];
    if (known) return t(known);
    // The solver explains infeasible plans in English only.
    if (error.status === 422 && lang() !== 'en') return t('error.infeasible');
    return error.error?.error ?? error.error?.message ?? fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
