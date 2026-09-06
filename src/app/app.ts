import { Component, inject, signal } from '@angular/core';
import { FooterComponent } from './footer/footer';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly auth = inject(AuthService);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly authMode = signal<'login' | 'register' | 'verify'>('login');
  protected readonly email = signal('');
  protected readonly name = signal('');
  protected readonly password = signal('');
  protected readonly code = signal('');

  protected setAuthMode(mode: 'login' | 'register' | 'verify'): void {
    this.authMode.set(mode);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  protected updateField(field: 'email' | 'name' | 'password' | 'code', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this[field].set(value);
  }

  protected async submitAuth(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isLoading.set(true);
    try {
      if (this.authMode() === 'login') {
        const session = await this.auth.login({ email: this.email(), password: this.password() });
        this.successMessage.set(`Bienvenido, ${session.user.name}.`);
      } else if (this.authMode() === 'register') {
        const response = await this.auth.register({ email: this.email(), name: this.name(), password: this.password() });
        this.successMessage.set(response.message);
        this.authMode.set('verify');
      } else {
        const session = await this.auth.verifyEmail(this.email(), this.code());
        this.successMessage.set(`Cuenta verificada. Bienvenido, ${session.user.name}.`);
      }
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible completar la solicitud.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
