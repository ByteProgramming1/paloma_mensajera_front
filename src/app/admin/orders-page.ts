import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Order } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { ConfirmAction } from '../shared/confirm-action';
import { OrderStatusBadge } from '../shared/order-status-badge';

type Tab = 'pagos' | 'todos';

@Component({
  selector: 'app-admin-orders-page',
  imports: [FormsModule, CurrencyPipe, DatePipe, ConfirmAction, OrderStatusBadge],
  template: `
    <h1 class="page-title mb-1">Pedidos</h1>
    <p class="page-lede mb-6">Visibilidad total: remitente, destinatario, dedicatoria y estado de pago de cualquier pedido, sin restricciones.</p>

    <div class="mb-6 inline-flex gap-1 rounded-[var(--radius-sm)] border border-border-soft bg-bg-surface-elevated p-1">
      <button type="button" class="btn !px-4 !py-1.5 text-[13px] sm:!px-6 sm:!py-2 sm:text-[15px]" [class]="tab() === 'pagos' ? 'btn-primary' : 'btn-ghost'" (click)="tab.set('pagos')">
        Verificar pagos
        @if (pendingCount() > 0) { <span class="ml-1.5 rounded-full bg-status-pendiente px-1.5 py-0.5 text-[11px] font-bold text-text-on-accent">{{ pendingCount() }}</span> }
      </button>
      <button type="button" class="btn !px-4 !py-1.5 text-[13px] sm:!px-6 sm:!py-2 sm:text-[15px]" [class]="tab() === 'todos' ? 'btn-primary' : 'btn-ghost'" (click)="tab.set('todos')">Todos los pedidos</button>
    </div>

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }
    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else if (visibleOrders().length === 0) {
      <p class="field-hint">No hay pedidos en esta vista.</p>
    } @else {
      <ul class="flex flex-col gap-4">
        @for (order of visibleOrders(); track order.id) {
          <li class="card-surface flex flex-col gap-3 p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-semibold text-text-primary">
                {{ order.buyerFullName }}
                <span class="mono-figure ml-2 text-[13px] text-text-secondary">{{ order.orderCode }}</span>
              </p>
              <app-order-status-badge [status]="order.status" />
            </div>
            <p class="field-hint">Destinatario: {{ order.recipientFullName }} · {{ order.selfPickup ? 'Autorrecogida' : 'Entrega a terceros' }} · Canal: {{ order.salesChannel }}</p>
            <p class="italic text-[14px] text-text-primary">“{{ order.letterContent }}”</p>
            <p class="mono-figure text-[16px] text-brand-magenta">{{ order.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

            @if (tab() === 'todos') {
              <div class="paloma-enter grid gap-x-6 gap-y-3 rounded-[var(--radius-sm)] bg-bg-base p-4 text-[13px] text-text-primary sm:grid-cols-2">
                <p><span class="field-label block">Fecha</span> {{ order.createdAt | date:'medium' }}</p>
                <p><span class="field-label block">Anónimo</span> {{ order.isAnonymous ? 'Sí' : 'No' }}</p>
                <p><span class="field-label block">Correo comprador</span> {{ order.buyerEmail ?? '—' }}</p>
                <p><span class="field-label block">Teléfono comprador</span> {{ order.buyerPhone ?? '—' }}</p>
                <p><span class="field-label block">Tipo comprador</span> {{ order.buyerType ?? '—' }}</p>
                <p><span class="field-label block">Carrera / área comprador</span> {{ order.buyerCareerOrArea ?? '—' }}</p>
                <p><span class="field-label block">Carrera / área destinatario</span> {{ order.recipientCareerOrArea ?? '—' }}</p>
                <p><span class="field-label block">Usuario Teams destinatario</span> {{ order.recipientTeamsUser ?? '—' }}</p>
                <p><span class="field-label block">Notas de entrega</span> {{ order.deliveryNotes ?? '—' }}</p>
                <p><span class="field-label block">N° rifa</span> <span class="mono-figure">{{ order.raffleNumber ?? '—' }}</span></p>
                <p>
                  <span class="field-label block">Dedicatoria</span>
                  {{ order.messageReview?.humanReviewStatus ?? '—' }}
                  @if (order.messageReview?.rejectionReason) { ({{ order.messageReview!.rejectionReason }}) }
                </p>
                <p>
                  <span class="field-label block">Pago</span>
                  @if (order.payment) {
                    {{ order.payment.verified ? 'Verificado' : 'No verificado' }} — {{ order.payment.paymentMethod }}
                    @if (order.payment.verificationNotes) { ({{ order.payment.verificationNotes }}) }
                  } @else { Sin registro de pago }
                </p>
                <div class="sm:col-span-2">
                  <span class="field-label block">Productos</span>
                  <ul class="mt-1 flex flex-col gap-0.5">
                    @for (item of order.items; track item.id) {
                      <li>{{ item.quantity }}× {{ item.productName ?? item.productId }} · {{ item.unitPrice | currency:'COP':'symbol-narrow':'1.0-0' }}{{ item.selectedAddOnOption ? ' — ' + item.selectedAddOnOption.name : '' }}</li>
                    }
                  </ul>
                </div>
              </div>
            }

            @if (tab() === 'pagos' && order.status === 'PAYMENT_PENDING') {
              <div class="flex flex-wrap items-center gap-3">
                <input class="field-input max-w-[280px]" [(ngModel)]="notesDrafts[order.id]" placeholder="Notas de verificación (opcional)" />
                <app-confirm-action label="Confirmar pago" confirmPrompt="¿Confirmas que el pago llegó por Nequi?" (confirm)="verifyPayment(order, true)" />
                <app-confirm-action label="Rechazar pago" variant="secondary" confirmPrompt="¿Rechazas este pago? Se libera el número de rifa." (confirm)="verifyPayment(order, false)" />
              </div>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class AdminOrdersPage {
  private readonly ordersApi = inject(OrdersService);

  protected readonly tab = signal<Tab>('pagos');
  protected readonly orders = signal<Order[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly notesDrafts: Record<string, string> = {};

  protected readonly visibleOrders = computed(() => {
    const all = this.orders();
    switch (this.tab()) {
      case 'pagos': return all.filter((order) => order.status === 'PAYMENT_PENDING');
      default: return all;
    }
  });

  protected readonly pendingCount = computed(() => this.orders().filter((order) => order.status === 'PAYMENT_PENDING').length);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      this.orders.set(await firstValueFrom(this.ordersApi.list()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar los pedidos.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async verifyPayment(order: Order, verified: boolean): Promise<void> {
    await firstValueFrom(this.ordersApi.verifyPayment(order.id, verified, this.notesDrafts[order.id]));
    this.load();
  }
}
