import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { OrderMessageQueueItem } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { ConfirmAction } from '../shared/confirm-action';

@Component({
  selector: 'app-messages-queue-page',
  imports: [FormsModule, ConfirmAction],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Cola de dedicatorias</h1>
    <p class="mb-6 max-w-[620px] text-[15px] text-text-secondary">
      Revisión 100% manual: busca al comprador por nombre, lee su dedicatoria y apruébala o recházala. No hay filtro automático.
    </p>

    <div class="mb-6 flex gap-2">
      <input class="field-input max-w-[320px]" [(ngModel)]="search" (keyup.enter)="load()" placeholder="Buscar comprador por nombre…" />
      <button type="button" class="btn-secondary" (click)="load()">Buscar</button>
    </div>

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }
    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else if (orders().length === 0) {
      <p class="field-hint">No hay dedicatorias pendientes con ese criterio.</p>
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
            <p class="rounded-[var(--radius-sm)] bg-bg-base p-4 text-[15px] italic text-text-primary">“{{ order.letterContent }}”</p>
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
