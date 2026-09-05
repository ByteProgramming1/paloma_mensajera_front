import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { FooterComponent } from './footer/footer';
import { AuthService } from './core/auth.service';

interface WindowWithConfig extends Window {
  PALOMA_CONFIG?: { apiUrl?: string; microsoftClientId?: string; microsoftTenantId?: string };
}

@Component({
  selector: 'app-root',
  imports: [FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private msalClient?: import('@azure/msal-browser').PublicClientApplication;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected async login(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (!isPlatformBrowser(this.platformId)) return;

    const config = (window as WindowWithConfig).PALOMA_CONFIG;
    if (!config?.microsoftClientId) {
      this.errorMessage.set('Configura el Client ID de Microsoft Entra para continuar.');
      return;
    }

    this.isLoading.set(true);
    try {
      const { PublicClientApplication } = await import('@azure/msal-browser');
      this.msalClient ??= new PublicClientApplication({
        auth: {
          clientId: config.microsoftClientId,
          authority: `https://login.microsoftonline.com/${config.microsoftTenantId ?? 'common'}`,
          redirectUri: window.location.origin,
        },
        cache: { cacheLocation: 'sessionStorage' },
      });
      await this.msalClient.initialize();
      const result = await this.msalClient.loginPopup({
        scopes: ['openid', 'profile', 'email'],
      });
      const session = await this.auth.loginWithMicrosoft(result.idToken);
      this.successMessage.set(`Bienvenido, ${session.user.name}.`);
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible iniciar sesión.');
    } finally {
      this.isLoading.set(false);
    }
  }

}
