import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '../services/auth.service';

/** Sends the Supabase access token to the solver service, which checks the login with it. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.solverUrl)) return next(req);

  return from(inject(AuthService).accessToken()).pipe(
    switchMap((token) => next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req)),
  );
};
