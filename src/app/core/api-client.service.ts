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

// El backend ya arma mensajes 401/403/404 pensados para mostrarse tal cual y en español
// (ver AuthService, PermissionsGuard, OrdersService, etc. — todos sus throw new
// UnauthorizedException/ForbiddenException/NotFoundException llevan mensaje explícito). El
// único caso en que NO trae nada útil es cuando el propio framework genera el 401/403 antes
// de que nuestro código intervenga (ej. Passport rechazando un token ausente/inválido en una
// ruta protegida) — ahí el mensaje crudo es el default en inglés de Nest/Passport. Por eso acá
// solo se pisa el mensaje del backend cuando coincide con uno de esos defaults conocidos; si el
// backend ya mandó algo propio, se respeta siempre. Antes esto pisaba TODO 401/403/404 con un
// genérico sin importar lo que mandara el backend, lo que escondía mensajes de negocio válidos
// (ej. "Credenciales invalidas." o "Este pedido no te pertenece.") detrás de un genérico confuso.
const FRAMEWORK_DEFAULT_MESSAGES = new Set(['Unauthorized', 'Forbidden resource', 'Not Found']);

const FALLBACK_MESSAGE_BY_STATUS: Record<number, string> = {
  0: 'No hay conexión con el servidor. Verifica tu internet e intenta de nuevo.',
  401: 'Tu sesión expiró o no iniciaste sesión. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No se encontró lo que buscabas.',
  408: 'La solicitud tardó demasiado en responder. Intenta de nuevo.',
  429: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
};

function friendlyMessageFor(error: HttpErrorResponse): string {
  // 5xx y errores de red pueden traer detalles técnicos internos (ej. una excepción sin
  // capturar del proveedor de correo) que no le sirven al usuario y no deberían mostrarse tal
  // cual — a diferencia de los 4xx, un 5xx es siempre un bug, no un estado esperado, así que
  // acá sí conviene un genérico fijo en vez de confiar en lo que venga en el body.
  if (error.status >= 500) {
    return 'Ocurrió un error en el servidor. Intenta de nuevo en unos minutos; si sigue pasando, avisa al equipo.';
  }
  // 408 (timeout) y 429 (rate limit del ThrottlerModule) son de la capa HTTP/infraestructura,
  // no mensajes de negocio del backend — su versión cruda ("ThrottlerException: Too Many
  // Requests") tampoco le sirve al usuario, así que siempre van con el genérico.
  if (error.status === 408 || error.status === 429) return FALLBACK_MESSAGE_BY_STATUS[error.status];

  const payload = error.error as { message?: string | string[] } | null;
  if (Array.isArray(payload?.message)) return payload.message.map(translateValidationMessage).join(' ');

  const backendMessage = payload?.message;
  if (backendMessage && !FRAMEWORK_DEFAULT_MESSAGES.has(backendMessage)) {
    return translateValidationMessage(backendMessage);
  }

  return FALLBACK_MESSAGE_BY_STATUS[error.status] ?? (error.message ? translateValidationMessage(error.message) : 'No fue posible completar la solicitud.');
}

// Nombres de campo en español, más amigables que el nombre crudo de la propiedad del DTO
// (ej. "buyerFullName"). El backend (ver ValidationPipe.exceptionFactory en main.ts +
// validation-error-translator.ts) ya traduce el mensaje completo al español para los 27 DTOs,
// pero sigue usando el nombre de la propiedad tal cual como sujeto de la frase (ej. "buyerFullName
// no debe estar vacio"): esto solo reemplaza ese nombre crudo por una etiqueta legible cuando la
// conocemos. Un campo no listado se deja como venga del backend — ya está en español, solo menos
// pulido.
const FIELD_NAMES_ES: Record<string, string> = {
  email: 'El correo',
  password: 'La contraseña',
  name: 'El nombre',
  fullName: 'El nombre completo',
  buyerFullName: 'El nombre',
  buyerEmail: 'El correo',
  buyerPhone: 'El teléfono',
  code: 'El código',
  token: 'El enlace',
  phone: 'El teléfono',
  recipientFullName: 'El nombre del destinatario',
  recipientTeamsUser: 'El correo institucional del destinatario',
  letterContent: 'La dedicatoria',
};

// Sustituye el nombre crudo de la propiedad al inicio del mensaje (si lo reconocemos) por su
// etiqueta legible, preservando el resto de la frase que ya viene en español desde el backend.
function translateValidationMessage(message: string): string {
  const match = message.match(/^(\w+)\b/);
  const label = match ? FIELD_NAMES_ES[match[1]] : undefined;
  return label ? label + message.slice(match![1].length) : message;
}