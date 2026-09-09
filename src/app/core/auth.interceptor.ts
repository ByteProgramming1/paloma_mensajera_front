import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const authedRequest = authorize(request);

  return next(authedRequest).pipe(
    catchError((error) => {
      // Un 401/403 del backend significa que el token ya no es válido para lo que se pidió
      // (expiró, o el admin cambió el rol/permisos del usuario después de emitido el JWT).
      // El frontend cachea roleSlug/permissions en sessionStorage al login y no los revalida,
      // así que sin esto el usuario queda "atascado" viendo una sección que ya no le
      // corresponde hasta que hace logout+login manual. Se limpia la sesión y se saca de la
      // página actual (igual que el logout manual) para forzarlo.
      if ((error?.status === 401 || error?.status === 403) && auth.session()) {
        auth.logout();
        router.navigateByUrl('/');
      }
      return throwError(() => error);
    }),
  );
};

function authorize(request: Parameters<HttpInterceptorFn>[0]) {
  if (typeof sessionStorage === 'undefined') return request;
  try {
    const token = (JSON.parse(sessionStorage.getItem('paloma_session') ?? '{}') as { accessToken?: string }).accessToken;
    return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  } catch {
    return request;
  }
}