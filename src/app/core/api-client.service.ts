import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

interface RuntimeConfig { apiUrl?: string; }

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: object): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.params(params) }).pipe(catchError(this.handleError));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body).pipe(catchError(this.handleError));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body).pipe(catchError(this.handleError));
  }

  upload<T>(path: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(this.url(path), formData).pipe(catchError(this.handleError));
  }

  private url(path: string): string {
    const config = typeof window !== 'undefined'
      ? (window as Window & { PALOMA_CONFIG?: RuntimeConfig }).PALOMA_CONFIG
      : undefined;
    return `${config?.apiUrl ?? 'http://localhost:3000'}${path}`;
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