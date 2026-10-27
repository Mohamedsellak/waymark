import { HttpErrorResponse } from '@angular/common/http';

/** Turns a Supabase or solver error into one readable message. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Cannot reach the server. Check your connection.';
    return error.error?.error ?? error.error?.message ?? fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
