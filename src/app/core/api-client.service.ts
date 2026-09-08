import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

interface RuntimeConfig { apiUrl?: string; nequiPhone?: string; }

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);

  /** Número de Nequi al que se transfiere el pago — configurable vía PALOMA_NEQUI_PHONE (ver scripts/inject-runtime-config.mjs), no quemado en el código. */
  get nequiPhone(): string {
    return this.config()?.nequiPhone ?? '300 000 0000';
  }

  get<T>(path: string, params?: object): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.params(params) }).pipe(catchError(this.handleError));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body).pipe(catchError(this.handleError));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body).pipe(catchError(this.handleError));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path)).pipe(catchError(this.handleError));
  }

  upload<T>(path: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(this.url(path), formData).pipe(catchError(this.handleError));
  }

  private config(): RuntimeConfig | undefined {
    return typeof window !== 'undefined'
      ? (window as Window & { PALOMA_CONFIG?: RuntimeConfig }).PALOMA_CONFIG
      : undefined;
  }

  private url(path: string): string {
    return `${this.config()?.apiUrl ?? 'http://localhost:3000'}${path}`;
  }

  private params(values?: object): HttpParams {
    return Object.entries((values ?? {}) as Record<string, string | undefined>).reduce(
      (params, [key, value]) => value === undefined ? params : params.set(key, value),
      new HttpParams(),
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => new Error(friendlyMessageFor(error)));
  }
}

// Códigos que reciben un mensaje genérico y amable en vez del mensaje crudo del backend.
// 5xx y errores de red pueden traer detalles técnicos internos (ej. una excepción sin capturar
// del proveedor de correo) que no le sirven al usuario y no deberían mostrarse tal cual.
// 4xx (400/401 con mensaje de negocio/404/409/422, etc.) sí trae mensajes pensados para mostrarse.
const GENERIC_MESSAGE_BY_STATUS: Record<number, string> = {
  0: 'No hay conexión con el servidor. Verifica tu internet e intenta de nuevo.',
  401: 'Tu sesión expiró o no iniciaste sesión. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No se encontró lo que buscabas.',
  408: 'La solicitud tardó demasiado en responder. Intenta de nuevo.',
  429: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
};

function friendlyMessageFor(error: HttpErrorResponse): string {
  if (error.status >= 500) {
    return 'Ocurrió un error en el servidor. Intenta de nuevo en unos minutos; si sigue pasando, avisa al equipo.';
  }
  const generic = GENERIC_MESSAGE_BY_STATUS[error.status];
  if (generic) return generic;

  const payload = error.error as { message?: string | string[] } | null;
  if (Array.isArray(payload?.message)) return payload.message.join(', ');
  return payload?.message ?? error.message ?? 'No fue posible completar la solicitud.';
}