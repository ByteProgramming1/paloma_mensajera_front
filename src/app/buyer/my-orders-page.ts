import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Order } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { OrderStatusBadge } from '../shared/order-status-badge';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-my-orders-page',
  imports: [CurrencyPipe, DatePipe, RouterLink, OrderStatusBadge, Icon],
  template: `
    <h1 class="page-title mb-1">Mis pedidos</h1>
    <p class="page-lede mb-8">Todo lo que has comprado, incluso si fue para distintas personas — abre cualquiera para ver el detalle completo.</p>

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }

    @if (isLoading()) {
      <p class="text-text-secondary">Cargando tus pedidos…</p>
    } @else if (orders().length === 0) {
      <div class="card-surface flex flex-col items-center gap-3 p-12 text-center">
        <app-icon name="gift" [size]="32" [strokeWidth]="1.4" class="text-brand-magenta/40" />
        <p class="text-[14px] text-text-secondary">Todavía no has hecho ningún pedido.</p>
        <a routerLink="/catalogo" class="btn-primary">Ir al catálogo</a>
      </div>
    } @else {
      <ul class="flex flex-col gap-3">
        @for (order of orders(); track order.id) {
          <li class="card-surface overflow-hidden">
            <button
              type="button"
              class="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-bg-base"
              [attr.aria-expanded]="isExpanded(order.id)"
              [attr.aria-controls]="'order-detail-' + order.id"
              (click)="toggle(order.id)"
            >
              <div class="flex min-w-0 items-center gap-3">
                <app-icon
                  name="chevron-down"
                  [size]="18"
                  class="shrink-0 text-text-secondary transition-transform duration-300"
                  [class.rotate-180]="isExpanded(order.id)"
                />
                <div class="min-w-0">
                  <p class="truncate font-semibold text-text-primary">
                    {{ order.selfPickup ? 'Para mí mismo' : 'Entrega a: ' + order.recipientFullName }}
                  </p>
                  <p class="field-hint">
                    <span class="mono-figure">{{ order.orderCode }}</span> · {{ order.createdAt | date:'mediumDate' }}
                  </p>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <span class="mono-figure text-[15px] font-semibold text-brand-magenta">{{ order.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                <app-order-status-badge [status]="order.status" />
              </div>
            </button>

            @if (isExpanded(order.id)) {
              <div [id]="'order-detail-' + order.id" class="paloma-enter border-t border-border-soft bg-bg-base p-5">
                <div class="grid gap-x-6 gap-y-3 text-[13px] text-text-primary sm:grid-cols-2">
                  @if (!order.selfPickup) {
                    <p><span class="field-label block">Carrera / área del destinatario</span> {{ order.recipientCareerOrArea ?? '—' }}</p>
                    <p><span class="field-label block">Correo institucional</span> {{ order.recipientTeamsUser ?? '—' }}</p>
                  } @else if (order.deliveryNotes) {
                    <p class="sm:col-span-2"><span class="field-label block">Tu comentario para quien te entregue</span> {{ order.deliveryNotes }}</p>
                  }
                  <p><span class="field-label block">Canal</span> {{ order.salesChannel === 'ONLINE' ? 'En línea' : 'Presencial' }}</p>
                  <p><span class="field-label block">Enviado como</span> {{ order.isAnonymous ? 'Anónimo' : 'Con tu nombre' }}</p>
                  @if (order.raffleNumber !== null) {
                    <p><span class="field-label block">N° de rifa</span> <span class="mono-figure">{{ order.raffleNumber }}</span></p>
                  }
                  <p>
                    <span class="field-label block">Pago</span>
                    @if (order.payment) {
                      {{ order.payment.verified ? 'Verificado' : 'Pendiente de verificación' }}
                    } @else { Pendiente }
                  </p>
                </div>

                <div class="mt-4 rounded-[var(--radius-sm)] bg-bg-surface-elevated p-3">
                  <p class="field-label mb-1">Tu dedicatoria</p>
                  <p class="text-[13px] leading-relaxed whitespace-pre-wrap text-text-primary">{{ order.letterContent }}</p>
                </div>

                <ul class="mt-4 flex flex-col gap-1.5 text-[13px] text-text-secondary">
                  @for (item of order.items; track item.id) {
                    <li class="flex items-center justify-between">
                      <span>{{ item.quantity }}× {{ item.productName ?? item.productId }}{{ item.selectedAddOnOption ? ' — ' + item.selectedAddOnOption.name : '' }}</span>
                      <span class="mono-figure">{{ item.unitPrice * item.quantity | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                    </li>
                  }
                </ul>

                <a [routerLink]="['/pedidos', order.id]" class="btn-secondary mt-4 inline-flex !px-4 !py-1.5 text-[13px]">Ver seguimiento completo</a>
              </div>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class MyOrdersPage {
  private readonly ordersApi = inject(OrdersService);

  protected readonly orders = signal<Order[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const orders = await firstValueFrom(this.ordersApi.mine());
      this.orders.set([...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar tus pedidos.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected isExpanded(orderId: string): boolean {
    return this.expandedIds().has(orderId);
  }

  protected toggle(orderId: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(orderId)) next.delete(orderId);
    else next.add(orderId);
    this.expandedIds.set(next);
  }
}
