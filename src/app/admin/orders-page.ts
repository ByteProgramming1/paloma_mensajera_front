import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Order, StaffUser } from '../core/api.models';
import { AdminService } from '../core/admin.service';
import { OrdersService } from '../core/orders.service';
import { ConfirmAction } from '../shared/confirm-action';
import { OrderStatusBadge } from '../shared/order-status-badge';

type Tab = 'pagos' | 'entregas' | 'todos';

@Component({
  selector: 'app-admin-orders-page',
  imports: [FormsModule, CurrencyPipe, ConfirmAction, OrderStatusBadge],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Pedidos</h1>
    <p class="mb-6 max-w-[640px] text-[15px] text-text-secondary">Visibilidad total: remitente, destinatario, dedicatoria y estado de pago de cualquier pedido, sin restricciones.</p>

    <div class="mb-6 flex flex-wrap gap-2">
      <button type="button" class="btn !px-4 !py-1.5 text-[13px] sm:!px-6 sm:!py-2 sm:text-[15px]" [class]="tab() === 'pagos' ? 'btn-primary' : 'btn-secondary'" (click)="tab.set('pagos')">Verificar pagos</button>
      <button type="button" class="btn !px-4 !py-1.5 text-[13px] sm:!px-6 sm:!py-2 sm:text-[15px]" [class]="tab() === 'entregas' ? 'btn-primary' : 'btn-secondary'" (click)="tab.set('entregas')">Asignar entregas</button>
      <button type="button" class="btn !px-4 !py-1.5 text-[13px] sm:!px-6 sm:!py-2 sm:text-[15px]" [class]="tab() === 'todos' ? 'btn-primary' : 'btn-secondary'" (click)="tab.set('todos')">Todos los pedidos</button>
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

            @if (tab() === 'pagos' && order.status === 'PAYMENT_PENDING') {
              <div class="flex flex-wrap items-center gap-3">
                <input class="field-input max-w-[280px]" [(ngModel)]="notesDrafts[order.id]" placeholder="Notas de verificación (opcional)" />
                <app-confirm-action label="Confirmar pago" confirmPrompt="¿Confirmas que el pago llegó por Nequi?" (confirm)="verifyPayment(order, true)" />
                <app-confirm-action label="Rechazar pago" variant="secondary" confirmPrompt="¿Rechazas este pago? Se libera el número de rifa." (confirm)="verifyPayment(order, false)" />
              </div>
            }

            @if (tab() === 'entregas' && order.status === 'PAYMENT_VERIFIED') {
              <div class="flex flex-wrap items-center gap-3">
                <select class="field-input max-w-[260px]" [(ngModel)]="assignDrafts[order.id]">
                  <option value="" disabled>Elige un vendedor…</option>
                  @for (seller of sellers(); track seller.id) { <option [value]="seller.id">{{ seller.fullName }}</option> }
                </select>
                <button type="button" class="btn-primary" [disabled]="!assignDrafts[order.id]" (click)="assign(order)">Asignar</button>
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
  private readonly adminApi = inject(AdminService);

  protected readonly tab = signal<Tab>('pagos');
  protected readonly orders = signal<Order[]>([]);
  protected readonly sellers = signal<StaffUser[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly notesDrafts: Record<string, string> = {};
  protected readonly assignDrafts: Record<string, string> = {};

  protected readonly visibleOrders = computed(() => {
    const all = this.orders();
    switch (this.tab()) {
      case 'pagos': return all.filter((order) => order.status === 'PAYMENT_PENDING');
      case 'entregas': return all.filter((order) => order.status === 'PAYMENT_VERIFIED');
      default: return all;
    }
  });

  constructor() {
    this.load();
    this.loadSellers();
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

  private async loadSellers(): Promise<void> {
    try {
      const users = await firstValueFrom(this.adminApi.listUsers());
      this.sellers.set(users.filter((user) => user.role === 'seller' && user.isActive));
    } catch {
      // El panel de asignación queda vacío si no hay permiso; el resto de la página sigue funcionando.
    }
  }

  protected async verifyPayment(order: Order, verified: boolean): Promise<void> {
    await firstValueFrom(this.ordersApi.verifyPayment(order.id, verified, this.notesDrafts[order.id]));
    this.load();
  }

  protected async assign(order: Order): Promise<void> {
    const deliveryPersonId = this.assignDrafts[order.id];
    if (!deliveryPersonId) return;
    await firstValueFrom(this.ordersApi.assignDelivery(order.id, deliveryPersonId));
    this.load();
  }
}
