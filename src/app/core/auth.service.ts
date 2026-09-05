import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { AuthSession, LoginResponse, UserRole } from './api.models';

const SESSION_KEY = 'paloma_session';
interface LoginPayload { email: string; password: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly session = signal<AuthSession | null>(this.readSession());

  async login(payload: LoginPayload): Promise<AuthSession> {
    return this.setSession(await firstValueFrom(this.api.post<LoginResponse>('/auth/login', payload)));
  }

  async loginWithMicrosoft(idToken: string): Promise<AuthSession> {
    return this.setSession(await firstValueFrom(this.api.post<LoginResponse>('/auth/microsoft', { idToken })));
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem(SESSION_KEY);
    this.session.set(null);
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