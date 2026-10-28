import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { I18nTitleStrategy } from '@core/i18n/title-strategy';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { AuthService } from '@core/services/auth.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
    provideHttpClient(withInterceptors([authInterceptor])),
    // Restore the session before the first navigation so guards see the real user.
    provideAppInitializer(() => inject(AuthService).restore()),
  ],
};
