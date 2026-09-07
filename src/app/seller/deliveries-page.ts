import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Order } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { ConfirmAction } from '../shared/confirm-action';
import { OrderStatusBadge } from '../shared/order-status-badge';

const DELIVERABLE = new Set(['PAYMENT_VERIFIED', 'IN_PREPARATION', 'IN_ROUTE', 'DELIVERED']);

@Component({
  selector: 'app-deliveries-page',
  imports: [FormsModule, ConfirmAction, OrderStatusBadge],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Entregas</h1>
    <p class="mb-6 max-w-[620px] text-[15px] text-text-secondary">Busca por el nombre de quien llega a recoger — si el comprador recoge su propio regalo, verás el mismo nombre y su comentario.</p>

    <div class="mb-6 flex flex-wrap gap-2">
      <input class="field-input max-w-[320px]" [(ngModel)]="search" (keyup.enter)="searchByName()" placeholder="Buscar destinatario por nombre…" />
      <button type="button" class="btn-secondary" (click)="searchByName()">Buscar</button>
      <button type="button" class="btn-ghost" (click)="loadMine()">Ver mis entregas asignadas</button>
    </div>

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }
    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else if (orders().length === 0) {
      <p class="field-hint">No hay pedidos para mostrar con ese criterio.</p>
    } @else {
      <ul class="flex flex-col gap-4">
        @for (order of orders(); track order.id) {
          <li class="card-surface flex flex-col gap-3 p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-semibold text-text-primary">
                {{ order.recipientFullName }}
                <span class="mono-figure ml-2 text-[13px] text-text-secondary">{{ order.orderCode }}</span>
              </p>
              <div class="flex items-center gap-2">
                @if (order.isAnonymous) {
                  <span class="rounded-full bg-bg-base px-2.5 py-1 text-[12px] font-semibold text-text-secondary">🔒 Anónimo</span>
                }
                <app-order-status-badge [status]="order.status" />
              </div>
            </div>
            @if (order.selfPickup && order.deliveryNotes) {
              <p class="field-hint">Nota del comprador: {{ order.deliveryNotes }}</p>
            }
            @if (order.isAnonymous) {
              <p class="field-hint">Remitente: pidió entrega anónima — no se muestra su nombre.</p>
            } @else {
              <p class="field-hint">Remitente: {{ order.buyerFullName }}</p>
            }
            @if (order.letterContent) {
              <div class="rounded-[var(--radius-sm)] bg-bg-base p-3">
                <p class="field-label mb-1">Dedicatoria</p>
                <p class="text-[14px] whitespace-pre-wrap text-text-primary">{{ order.letterContent }}</p>
              </div>
            }
            <ul class="flex flex-col gap-1 text-[14px] text-text-secondary">
              @for (item of order.items; track item.id) {
                <li>{{ item.quantity }}× {{ item.productName ?? item.productId }}{{ item.selectedAddOnOption ? ' — ' + item.selectedAddOnOption.name : '' }}</li>
              }
            </ul>

            @if (!DELIVERABLE_SET.has(order.status)) {
              <p class="field-hint">Este pedido aún no está pagado — no se puede entregar todavía.</p>
            } @else if (order.status === 'IN_ROUTE' || order.status === 'DELIVERED') {
              <div class="flex flex-wrap items-end gap-3">
                <label class="field">
                  <span class="field-label">Nombre de quien recibió</span>
                  <input class="field-input max-w-[240px]" [(ngModel)]="receivedByDrafts[order.id]" [disabled]="order.status === 'DELIVERED'" />
                </label>
                @if (order.status !== 'DELIVERED') {
                  <app-confirm-action label="Marcar entregado" confirmPrompt="¿Confirmas la entrega?" (confirm)="markDelivered(order)" />
                }
                @if (!order.selfPickup && !order.teamsNotificationSent) {
                  <button type="button" class="btn-secondary" (click)="notify(order)">Notificar por Teams</button>
                }
              </div>
            } @else {
              <div class="flex flex-wrap gap-3">
                <button type="button" class="btn-secondary" (click)="markInRoute(order)">Marcar en camino</button>
                @if (!order.selfPickup && !order.teamsNotificationSent) {
                  <button type="button" class="btn-ghost" (click)="notify(order)">Notificar por Teams</button>
                }
              </div>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class DeliveriesPage {
  private readonly ordersApi = inject(OrdersService);
  protected readonly DELIVERABLE_SET = DELIVERABLE;

  protected search = '';
  protected readonly orders = signal<Order[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly receivedByDrafts: Record<string, string> = {};

  constructor() {
    this.loadMine();
  }

  protected async loadMine(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      this.setOrders(await firstValueFrom(this.ordersApi.myDeliveries()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar tus entregas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async searchByName(): Promise<void> {
    if (!this.search.trim()) return this.loadMine();
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      this.setOrders(await firstValueFrom(this.ordersApi.list({ recipientName: this.search.trim() })));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible buscar ese destinatario.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private setOrders(orders: Order[]): void {
    this.orders.set(orders);
    for (const order of orders) {
      this.receivedByDrafts[order.id] ??= order.recipientFullName;
    }
  }

  protected async markInRoute(order: Order): Promise<void> {
    await firstValueFrom(this.ordersApi.updateDeliveryStatus(order.id, 'IN_ROUTE'));
    this.refresh();
  }

  protected async markDelivered(order: Order): Promise<void> {
    await firstValueFrom(this.ordersApi.updateDeliveryStatus(order.id, 'DELIVERED', { receivedBy: this.receivedByDrafts[order.id] }));
    this.refresh();
  }

  protected async notify(order: Order): Promise<void> {
    await firstValueFrom(this.ordersApi.notifyTeams(order.id));
    this.refresh();
  }

  private refresh(): void {
    if (this.search.trim()) this.searchByName();
    else this.loadMine();
  }
}
