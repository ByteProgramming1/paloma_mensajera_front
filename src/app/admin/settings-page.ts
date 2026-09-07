import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificationMode } from '../core/api.models';
import { AdminService } from '../core/admin.service';

@Component({
  selector: 'app-admin-settings-page',
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Configuración</h1>
    <p class="mb-8 max-w-[620px] text-[15px] text-text-secondary">Elige cómo se notifica la entrega por Teams. En modo automático, si Microsoft Graph falla para un pedido puntual, el sistema degrada a manual solo para ese caso.</p>

    <section class="card-surface flex flex-col gap-4 p-6">
      <h2 class="text-[16px] font-semibold text-text-primary">Modo de notificación de entrega</h2>
      <div class="flex gap-2">
        <button type="button" class="btn" [class]="mode() === 'MANUAL' ? 'btn-primary' : 'btn-secondary'" (click)="setMode('MANUAL')">Manual</button>
        <button type="button" class="btn" [class]="mode() === 'AUTOMATIC' ? 'btn-primary' : 'btn-secondary'" (click)="setMode('AUTOMATIC')">Automático (Teams / Graph)</button>
      </div>
      @if (message()) { <p class="field-hint">{{ message() }}</p> }
    </section>
  `,
})
export class AdminSettingsPage {
  private readonly adminApi = inject(AdminService);
  protected readonly mode = signal<NotificationMode>('MANUAL');
  protected readonly message = signal('');

  protected async setMode(mode: NotificationMode): Promise<void> {
    try {
      await firstValueFrom(this.adminApi.updateNotificationMode(mode));
      this.mode.set(mode);
      this.message.set('Modo de notificación actualizado.');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'No fue posible actualizar la configuración.');
    }
  }
}
