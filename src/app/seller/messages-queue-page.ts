import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { OrderMessageQueueItem } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { ConfirmAction } from '../shared/confirm-action';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-messages-queue-page',
  imports: [FormsModule, ConfirmAction, Icon],
  template: `
    <h1 class="page-title mb-1">Cola de dedicatorias</h1>
    <p class="page-lede mb-6">
      Revisión 100% manual: busca al comprador por nombre, lee su dedicatoria y apruébala o recházala. No hay filtro automático.
    </p>

    <div class="mb-6 flex gap-2">
      <div class="relative max-w-[320px] flex-1">
        <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input class="field-input pl-9" [(ngModel)]="search" (keyup.enter)="load()" placeholder="Buscar comprador por nombre…" />
      </div>
      <button type="button" class="btn-secondary" (click)="load()">Buscar</button>
    </div>

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }
    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else if (orders().length === 0) {
      <div class="card-surface flex flex-col items-center gap-2 p-12 text-center">
        <app-icon name="check" [size]="28" [strokeWidth]="1.5" class="text-status-entregado" />
        <p class="text-[14px] text-text-secondary">No hay dedicatorias pendientes con ese criterio.</p>
      </div>
    } @else {
      <ul class="flex flex-col gap-4">
        @for (order of orders(); track order.orderId) {
          <li class="card-surface flex flex-col gap-3 p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-semibold text-text-primary">
                {{ order.isAnonymous ? 'Comprador anónimo' : order.buyerFullName }}
                <span class="mono-figure ml-2 text-[13px] text-text-secondary">{{ order.orderCode }}</span>
              </p>
              <span class="field-hint">{{ order.selfPickup ? 'Recoge él mismo' : 'Para: ' + order.recipientFullName }}</span>
            </div>
            <p class="rounded-[var(--radius-sm)] bg-bg-base p-4 text-[15px] leading-relaxed italic text-text-primary">“{{ order.letterContent }}”</p>
            @if (order.selfPickup && order.deliveryNotes) {
              <p class="field-hint">Nota del comprador: {{ order.deliveryNotes }}</p>
            }

            <div class="flex flex-wrap items-center gap-3">
              <app-confirm-action label="Aprobar" variant="primary" confirmPrompt="¿Apruebas esta dedicatoria?" (confirm)="approve(order)" />
              @if (rejectingId() === order.orderId) {
                <input class="field-input max-w-[280px]" [(ngModel)]="rejectionReason" placeholder="Motivo del rechazo (obligatorio)" />
                <app-confirm-action label="Confirmar rechazo" variant="secondary" confirmPrompt="¿Rechazas esta dedicatoria?" [disabled]="!rejectionReason.trim()" (confirm)="reject(order)" />
                <button type="button" class="btn-ghost" (click)="rejectingId.set(null)">Cancelar</button>
              } @else {
                <button type="button" class="btn-secondary" (click)="startReject(order.orderId)">Rechazar</button>
              }
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class MessagesQueuePage {
  private readonly ordersApi = inject(OrdersService);

  protected search = '';
  protected readonly orders = signal<OrderMessageQueueItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly rejectingId = signal<string | null>(null);
  protected rejectionReason = '';

  constructor() {
    this.load();
  }

  protected async load(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const orders = await firstValueFrom(this.ordersApi.messageQueue(this.search || undefined));
      this.orders.set(orders);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar la cola de mensajes.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected startReject(orderId: string): void {
    this.rejectionReason = '';
    this.rejectingId.set(orderId);
  }

  protected async approve(order: OrderMessageQueueItem): Promise<void> {
    await firstValueFrom(this.ordersApi.verifyMessage(order.orderId, true));
    this.load();
  }

  protected async reject(order: OrderMessageQueueItem): Promise<void> {
    await firstValueFrom(this.ordersApi.verifyMessage(order.orderId, false, this.rejectionReason.trim()));
    this.rejectingId.set(null);
    this.load();
  }
}
