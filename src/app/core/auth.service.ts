import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { AuthSession, LoginResponse, MeResponse, RegisterResponse, UserRole } from './api.models';

const SESSION_KEY = 'paloma_session';
interface LoginPayload { email: string; password: string; }
interface RegisterPayload { email: string; name: string; password: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly session = signal<AuthSession | null>(this.readSession());

  async login(payload: LoginPayload): Promise<AuthSession> {
    return this.setSession(await firstValueFrom(this.api.post<LoginResponse>('/auth/login', payload)));
  }

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    return firstValueFrom(this.api.post<RegisterResponse>('/auth/register', payload));
  }

  async verifyEmail(email: string, code: string): Promise<AuthSession> {
    return this.setSession(await firstValueFrom(this.api.post<LoginResponse>('/auth/verify-email', { email, code })));
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return firstValueFrom(this.api.post<{ message: string }>('/auth/forgot-password', { email }));
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return firstValueFrom(this.api.post<{ message: string }>('/auth/reset-password', { token, password }));
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem(SESSION_KEY);
    this.session.set(null);
  }

  // Se llama al arrancar la app (ver appInitializer en app.config.ts): roleSlug/permissions
  // quedan cacheados en sessionStorage desde el login y nunca se revalidan por su cuenta, así
  // que si un admin cambió el rol del usuario en otra sesión, esto lo refresca antes de que las
  // guards/menús decidan qué mostrar con datos viejos. Si falla (ej. sin conexión), se sigue con
  // lo que ya había en cache — un 401/403 real ya fuerza logout vía el interceptor.
  async refreshSession(): Promise<void> {
    const current = this.session();
    if (!current) return;
    try {
      const fresh = await firstValueFrom(this.api.get<MeResponse>('/auth/me'));
      const session: AuthSession = { ...current, user: fresh.user, roleSlug: fresh.roleSlug, permissions: fresh.permissions };
      if (isPlatformBrowser(this.platformId)) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      this.session.set(session);
    } catch {
      // sin conexión u otro error no-401/403: se mantiene la sesión cacheada
    }
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.session()?.roleSlug;
    return role !== undefined && roles.includes(role);
  }

  hasPermission(permission: string): boolean { return this.session()?.permissions.includes(permission) ?? false; }

  private setSession(response: LoginResponse): AuthSession {
    const claims = this.decodeToken(response.accessToken);
    const session: AuthSession = {
      ...response,
      roleSlug: claims.roleSlug ?? response.user.role,
      permissions: claims.permissions ?? [],
    };
    if (isPlatformBrowser(this.platformId)) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.session.set(session);
    return session;
  }

  private decodeToken(token: string): { roleSlug?: UserRole; permissions?: string[] } {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
        roleSlug?: UserRole;
        permissions?: string[];
      };
      return decoded;
    } catch {
      return {};
    }
  }

  private readSession(): AuthSession | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthSession; } catch { return null; }
  }
}