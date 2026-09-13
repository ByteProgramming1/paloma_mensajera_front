import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Order } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { ConfirmAction } from '../shared/confirm-action';
import { OrderStatusBadge } from '../shared/order-status-badge';
import { Pagination } from '../shared/pagination';
import { ToastService } from '../shared/toast.service';

const PAGE_SIZE = 10;

/**
 * Pagos en efectivo en el stand (salesChannel PRESENCIAL) — el Vendedor que recibió el
 * dinero es quien confirma o rechaza aquí, no el Administrador (ver admin/orders-page.ts,
 * que solo maneja pagos ONLINE por Nequi/Bre-B).
 */
@Component({
  selector: 'app-seller-verify-payments-page',
  imports: [FormsModule, CurrencyPipe, ConfirmAction, OrderStatusBadge, Pagination],
  template: `
    <h1 class="page-title mb-1">Pagos en el stand</h1>
    <p class="page-lede mb-6">Confirma aquí los pagos en efectivo que recibiste en persona. Los pagos por Nequi/Bre-B los verifica el Administrador.</p>

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }
    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else if (pendingOrders().length === 0) {
      <p class="field-hint">No hay pagos presenciales pendientes por confirmar.</p>
    } @else {
      <ul class="mb-4 flex flex-col gap-4">
        @for (order of pagedOrders(); track order.id) {
          <li class="card-surface flex flex-col gap-3 p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-semibold text-text-primary">
                {{ order.buyerFullName }}
                <span class="mono-figure ml-2 text-[13px] text-text-secondary">{{ order.orderCode }}</span>
              </p>
              <app-order-status-badge [status]="order.status" />
            </div>
            <p class="field-hint">Destinatario: {{ order.recipientFullName }} · {{ order.selfPickup ? 'Autorrecogida' : 'Entrega a terceros' }}</p>
            <p class="mono-figure text-[16px] text-brand-magenta">{{ order.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

            <div class="flex flex-wrap items-center gap-3">
              <input class="field-input max-w-[280px]" [(ngModel)]="notesDrafts[order.id]" [name]="'notes-' + order.id" placeholder="Notas de verificación (opcional)" />
              <app-confirm-action label="Confirmar pago" confirmPrompt="¿Confirmas que recibiste este pago en efectivo?" (confirm)="verifyPayment(order, true)" />
              <app-confirm-action label="Rechazar pago" variant="secondary" confirmPrompt="¿Rechazas este pago? Se libera el número de rifa." (confirm)="verifyPayment(order, false)" />
            </div>
          </li>
        }
      </ul>
      <app-pagination [page]="clampedPage()" [totalPages]="totalPages()" (pageChange)="currentPage.set($event)" />
    }
  `,
})
export class SellerVerifyPaymentsPage {
  private readonly ordersApi = inject(OrdersService);
  private readonly toast = inject(ToastService);

  protected readonly orders = signal<Order[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly notesDrafts: Record<string, string> = {};
  protected readonly currentPage = signal(1);

  protected readonly pendingOrders = computed(() =>
    this.orders().filter((order) => order.status === 'PAYMENT_PENDING' && order.salesChannel === 'PRESENCIAL'));

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.pendingOrders().length / PAGE_SIZE)));
  protected readonly clampedPage = computed(() => Math.min(this.currentPage(), this.totalPages()));
  protected readonly pagedOrders = computed(() => {
    const page = this.clampedPage();
    return this.pendingOrders().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  });

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
    try {
      await firstValueFrom(this.ordersApi.verifyPayment(order.id, verified, this.notesDrafts[order.id]));
      this.toast.success(verified ? 'Pago confirmado.' : 'Pago rechazado.');
      await this.load();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible actualizar el pago.');
    }
  }
}
