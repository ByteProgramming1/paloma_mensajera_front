import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FooterComponent } from '../footer/footer';
import { AuthService } from '../core/auth.service';
import { UserRole } from '../core/api.models';

const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin/pedidos',
  seller: '/vendedor/mensajes',
  comprador: '/catalogo',
};

@Component({
  selector: 'app-landing-page',
  imports: [FooterComponent, FormsModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly authMode = signal<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
  protected readonly email = signal('');
  protected readonly name = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly code = signal('');
  protected readonly resetToken = signal('');

  constructor() {
    const token = inject(ActivatedRoute).snapshot.queryParamMap.get('resetToken');
    if (token) {
      this.resetToken.set(token);
      this.authMode.set('reset');
    }
  }

  protected setAuthMode(mode: 'login' | 'register' | 'verify' | 'forgot' | 'reset'): void {
    this.authMode.set(mode);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  protected updateField(field: 'email' | 'name' | 'password' | 'confirmPassword' | 'code', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this[field].set(value);
  }

  protected async submitAuth(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.authMode() === 'reset' && this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Las contraseñas no coinciden. Escríbelas de nuevo.');
      return;
    }

    this.isLoading.set(true);
    try {
      if (this.authMode() === 'login') {
        const session = await this.auth.login({ email: this.email(), password: this.password() });
        this.goHome(session.roleSlug);
      } else if (this.authMode() === 'register') {
        const response = await this.auth.register({ email: this.email(), name: this.name(), password: this.password() });
        this.successMessage.set(response.message);
        this.authMode.set('verify');
      } else if (this.authMode() === 'verify') {
        const session = await this.auth.verifyEmail(this.email(), this.code());
        this.goHome(session.roleSlug);
      } else if (this.authMode() === 'forgot') {
        const response = await this.auth.forgotPassword(this.email());
        this.successMessage.set(response.message);
      } else {
        const response = await this.auth.resetPassword(this.resetToken(), this.password());
        this.successMessage.set(response.message);
        this.password.set('');
        this.confirmPassword.set('');
        this.authMode.set('login');
      }
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible completar la solicitud.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private goHome(role: UserRole): void {
    this.router.navigateByUrl(HOME_BY_ROLE[role] ?? '/catalogo');
  }
}
