import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (typeof sessionStorage === 'undefined') return next(request);
  try {
    const token = (JSON.parse(sessionStorage.getItem('paloma_session') ?? '{}') as { accessToken?: string }).accessToken;
    return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request);
  } catch {
    return next(request);
  }
};