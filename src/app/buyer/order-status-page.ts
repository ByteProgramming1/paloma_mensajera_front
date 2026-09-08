import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Order } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { OrderStatusBadge } from '../shared/order-status-badge';

@Component({
  selector: 'app-order-status-page',
  imports: [CurrencyPipe, RouterLink, OrderStatusBadge],
  template: `
    @if (order(); as order) {
      <div class="paloma-enter max-w-[640px]">
        <div class="mb-6 flex items-center gap-3">
          <h1 class="text-[26px] font-semibold tracking-tight text-text-primary">Pedido <span class="mono-figure">{{ order.orderCode }}</span></h1>
          <app-order-status-badge [status]="order.status" />
        </div>

        @switch (true) {
          @case (order.status === 'MESSAGE_PENDING_REVIEW') {
            <p class="text-[15px] leading-relaxed text-text-secondary">Un vendedor va a leer tu dedicatoria pronto. No necesitas hacer nada más por ahora — vuelve a esta página para elegir tu número de rifa apenas la aprueben.</p>
          }
          @case (order.status === 'MESSAGE_REJECTED') {
            <p class="field-error text-[14px]">Tu dedicatoria fue rechazada{{ order.messageReview?.rejectionReason ? ': ' + order.messageReview?.rejectionReason : '.' }}</p>
            <a routerLink="/catalogo" class="btn-primary mt-4 inline-flex">Editar y volver a enviar</a>
          }
          @case (order.status === 'MESSAGE_APPROVED') {
            <p class="mb-4 text-[15px] leading-relaxed text-text-secondary">¡Tu dedicatoria fue aprobada! Ya puedes elegir tu número de la rifa.</p>
            <a [routerLink]="['/pedidos', order.id, 'rifa']" class="btn-primary inline-flex">Elegir mi número</a>
          }
          @case (order.status === 'PAYMENT_PENDING') {
            <div class="card-surface mb-4 flex flex-col items-center gap-1 p-6 text-center">
              <p class="text-[13px] font-medium uppercase tracking-wide text-text-secondary">Tu número de rifa</p>
              <p class="mono-figure text-[48px] font-semibold leading-none text-brand-magenta">{{ order.raffleNumber }}</p>
            </div>
            <div class="card-surface p-5">
              <p class="section-title mb-2">Paga por Nequi</p>
              <p class="text-[14px] leading-relaxed text-text-secondary">Transfiere <span class="mono-figure font-semibold text-text-primary">{{ order.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</span> por Nequi. No necesitas enviar comprobante — el Administrador confirma el pago directamente en la app comparando el nombre y el monto.</p>
            </div>
          }
          @case (order.status === 'PAYMENT_REJECTED') {
            <p class="field-error text-[14px]">Tu pago no pudo verificarse. Tu número de rifa fue liberado. Si crees que es un error, contacta al equipo en el stand.</p>
          }
          @default {
            <p class="text-[15px] leading-relaxed text-text-secondary">Tu pago fue verificado{{ order.raffleNumber ? ' — tu número es ' + order.raffleNumber : '' }}. Te avisaremos por Teams cuando tu regalo esté en camino.</p>
          }
        }

        <ul class="mt-8 flex flex-col gap-2 border-t border-border-soft pt-4">
          @for (item of order.items; track item.id) {
            <li class="flex items-center justify-between text-[14px] text-text-secondary">
              <span>{{ item.quantity }}× {{ item.productName ?? item.productId }}</span>
              <span class="mono-figure">{{ item.unitPrice * item.quantity | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
            </li>
          }
        </ul>
      </div>
    } @else if (errorMessage()) {
      <p class="field-hint max-w-[520px]">{{ errorMessage() }}</p>
      <a routerLink="/catalogo" class="btn-secondary mt-4 inline-flex">Volver al catálogo</a>
    } @else {
      <p class="text-text-secondary">Cargando tu pedido…</p>
    }
  `,
})
export class OrderStatusPage {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersApi = inject(OrdersService);

  protected readonly order = signal<Order | null>(null);
  protected readonly errorMessage = signal('');

  constructor() {
    // Siempre se recarga desde la API (en vez de confiar en el estado de navegación) para
    // reflejar el estado real inmediatamente después de una mutación (aprobar mensaje, elegir
    // número de rifa, etc.), evitando mostrar una respuesta parcial o desactualizada.
    this.loadFromApi();
  }

  private async loadFromApi(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    try {
      const order = await firstValueFrom(this.ordersApi.getById(id));
      this.order.set(order);
    } catch {
      this.errorMessage.set('No pudimos recuperar el estado de tu pedido en este momento. Revisa el correo de confirmación que te enviamos, o vuelve a intentarlo más tarde.');
    }
  }
}
