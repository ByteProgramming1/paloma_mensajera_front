import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Order } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { OrderStatusBadge } from '../shared/order-status-badge';
import { Icon } from '../shared/icon';
import { groupOrders, OrderGroup } from '../shared/order-grouping';

@Component({
  selector: 'app-my-orders-page',
  imports: [CurrencyPipe, DatePipe, RouterLink, OrderStatusBadge, Icon],
  template: `
    <h1 class="page-title mb-1">Mis pedidos</h1>
    <p class="page-lede mb-8">Todo lo que has comprado, incluso si fue para distintas personas — abre cualquiera para ver el detalle completo.</p>

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }

    @if (isLoading()) {
      <p class="text-text-secondary">Cargando tus pedidos…</p>
    } @else if (groups().length === 0) {
      <div class="card-surface flex flex-col items-center gap-3 p-12 text-center">
        <app-icon name="gift" [size]="32" [strokeWidth]="1.4" class="text-brand-magenta/40" />
        <p class="text-[14px] text-text-secondary">Todavía no has hecho ningún pedido.</p>
        <a routerLink="/catalogo" class="btn-primary">Ir al catálogo</a>
      </div>
    } @else {
      <ul class="flex flex-col gap-3">
        @for (group of groups(); track group.groupId ?? group.orders[0].id) {
          <li class="card-surface overflow-hidden">
            <button
              type="button"
              class="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-bg-base"
              [attr.aria-expanded]="isExpanded(groupKey(group))"
              [attr.aria-controls]="'order-detail-' + groupKey(group)"
              (click)="toggle(groupKey(group))"
            >
              <div class="flex min-w-0 items-center gap-3">
                <app-icon
                  name="chevron-down"
                  [size]="18"
                  class="shrink-0 text-text-secondary transition-transform duration-300"
                  [class.rotate-180]="isExpanded(groupKey(group))"
                />
                <div class="min-w-0">
                  @if (group.orders.length > 1) {
                    <p class="truncate font-semibold text-text-primary">Pago combinado — {{ group.orders.length }} destinatarios</p>
                    <p class="field-hint">{{ group.orders[0].createdAt | date:'mediumDate' }}</p>
                  } @else {
                    <p class="truncate font-semibold text-text-primary">
                      {{ group.orders[0].selfPickup ? 'Para mí mismo' : 'Entrega a: ' + group.orders[0].recipientFullName }}
                    </p>
                    <p class="field-hint">
                      <span class="mono-figure">{{ group.orders[0].orderCode }}</span> · {{ group.orders[0].createdAt | date:'mediumDate' }}
                    </p>
                  }
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <span class="mono-figure text-[15px] font-semibold text-brand-magenta">{{ group.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                @if (group.orders.length === 1) {
                  <app-order-status-badge [status]="group.orders[0].status" />
                } @else {
                  <span class="field-hint">{{ groupPaymentSummary(group) }}</span>
                }
              </div>
            </button>

            @if (isExpanded(groupKey(group))) {
              <div [id]="'order-detail-' + groupKey(group)" class="paloma-enter flex flex-col gap-4 border-t border-border-soft bg-bg-base p-5">
                @for (order of group.orders; track order.id) {
                  <div [class]="group.orders.length > 1 ? 'rounded-[var(--radius-sm)] border border-border-soft p-4' : ''">
                    @if (group.orders.length > 1) {
                      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p class="font-semibold text-text-primary">{{ order.selfPickup ? 'Para mí mismo' : 'Entrega a: ' + order.recipientFullName }}</p>
                        <app-order-status-badge [status]="order.status" />
                      </div>
                    }
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
  protected readonly expandedKeys = signal<ReadonlySet<string>>(new Set());

  // Pedidos de un mismo checkout multi-destinatario comparten groupId y un solo pago combinado
  // — se agrupan para mostrarse como una sola tarjeta (ver shared/order-grouping.ts).
  protected readonly groups = computed<OrderGroup[]>(() => groupOrders(this.orders()));

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

  protected groupKey(group: OrderGroup): string {
    return group.groupId ?? group.orders[0].id;
  }

  protected groupPaymentSummary(group: OrderGroup): string {
    return group.orders.every((order) => order.payment?.verified === true) ? 'Pago verificado' : 'Pago pendiente';
  }

  protected isExpanded(key: string): boolean {
    return this.expandedKeys().has(key);
  }

  protected toggle(key: string): void {
    const next = new Set(this.expandedKeys());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.expandedKeys.set(next);
  }
}
