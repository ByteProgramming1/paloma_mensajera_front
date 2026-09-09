import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay()),
    // Revalida roleSlug/permissions contra el backend antes de que arranquen las rutas/guards,
    // por si el rol cambió desde otra sesión (ver AuthService.refreshSession). En el servidor
    // no hay sesión cacheada, así que ahí resuelve de inmediato sin llamar al backend.
    provideAppInitializer(() => inject(AuthService).refreshSession()),
  ]
};
