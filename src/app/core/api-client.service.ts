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
    const payload = error.error as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? error.message ?? 'No fue posible completar la solicitud.';
    return throwError(() => new Error(message));
  }
}