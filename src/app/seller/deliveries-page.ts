import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Order } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { ConfirmAction } from '../shared/confirm-action';
import { OrderStatusBadge } from '../shared/order-status-badge';
import { Icon } from '../shared/icon';
import { CopyButton } from '../shared/copy-button';
import { buildTeamsPickupMessage } from '../shared/teams-message';
import { Pagination } from '../shared/pagination';

const DELIVERABLE = new Set(['PAYMENT_VERIFIED', 'IN_PREPARATION', 'IN_ROUTE', 'DELIVERED']);
const PAGE_SIZE = 10;

@Component({
  selector: 'app-deliveries-page',
  imports: [FormsModule, ConfirmAction, OrderStatusBadge, Icon, CopyButton, Pagination],
  template: `
    <h1 class="page-title mb-1">Entregas</h1>
    <p class="page-lede mb-6">Todas las entregas pendientes le salen a cualquier vendedor — no hay asignación previa, el primero que marca un estado queda como encargado.</p>

    <div class="mb-6 flex flex-wrap items-center gap-4">
      <div class="relative max-w-[320px] flex-1">
        <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input class="field-input pl-9" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" placeholder="Buscar destinatario por nombre…" />
      </div>
      <label class="flex cursor-pointer items-center gap-2 text-[14px] text-text-secondary">
        <input type="checkbox" class="accent-brand-magenta size-4" [ngModel]="showAll()" (ngModelChange)="toggleShowAll($event)" />
        Ver todas (entregadas y pendientes)
      </label>
    </div>

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }
    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else if (filteredOrders().length === 0) {
      <div class="card-surface flex flex-col items-center gap-2 p-12 text-center">
        <app-icon name="check" [size]="28" [strokeWidth]="1.5" class="text-status-entregado" />
        <p class="text-[14px] text-text-secondary">No hay pedidos para mostrar con ese criterio.</p>
      </div>
    } @else {
      <ul class="mb-4 flex flex-col gap-4">
        @for (order of pagedOrders(); track order.id) {
          <li class="card-surface flex flex-col gap-3 p-5" [class.opacity-70]="order.status === 'DELIVERED'">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-semibold text-text-primary">
                <span class="font-normal text-text-secondary">Entrega a:</span> {{ order.recipientFullName }}
                <span class="mono-figure ml-2 text-[13px] text-text-secondary">{{ order.orderCode }}</span>
              </p>
              <div class="flex items-center gap-2">
                @if (order.isAnonymous) {
                  <span class="inline-flex items-center gap-1 rounded-full bg-bg-base px-2.5 py-1 text-[12px] font-semibold text-text-secondary">
                    <app-icon name="lock" [size]="12" [strokeWidth]="2" /> Anónimo
                  </span>
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
            } @else {
              <div class="flex flex-wrap items-end gap-3">
                <label class="field">
                  <span class="field-label">Nombre de quien recibió</span>
                  <input class="field-input max-w-[240px]" [(ngModel)]="receivedByDrafts[order.id]" [disabled]="order.status === 'DELIVERED'" />
                </label>
                @if (order.status !== 'DELIVERED') {
                  <app-confirm-action label="Marcar entregado" confirmPrompt="¿Confirmas la entrega?" (confirm)="markDelivered(order)" />
                }
                @if (!order.selfPickup && order.status !== 'DELIVERED') {
                  <app-copy-button [text]="teamsMessage(order)" label="Copiar mensaje de Teams" />
                  @if (!order.teamsNotificationSent) {
                    <button type="button" class="btn-ghost" (click)="notify(order)">Notificar automático</button>
                  }
                }
              </div>
            }
          </li>
        }
      </ul>
      <app-pagination [page]="clampedPage()" [totalPages]="totalPages()" (pageChange)="currentPage.set($event)" />
    }
  `,
})
export class DeliveriesPage {
  private readonly ordersApi = inject(OrdersService);
  protected readonly DELIVERABLE_SET = DELIVERABLE;

  protected readonly search = signal('');
  protected readonly showAll = signal(false);
  protected readonly orders = signal<Order[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly receivedByDrafts: Record<string, string> = {};

  protected readonly filteredOrders = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.orders().filter((order) => !query || order.recipientFullName.toLowerCase().includes(query));
  });

  protected readonly currentPage = signal(1);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredOrders().length / PAGE_SIZE)));
  protected readonly clampedPage = computed(() => Math.min(this.currentPage(), this.totalPages()));
  protected readonly pagedOrders = computed(() => {
    const page = this.clampedPage();
    return this.filteredOrders().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  });

  constructor() {
    this.load();
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
  }

  protected toggleShowAll(value: boolean): void {
    this.showAll.set(value);
    this.currentPage.set(1);
    this.load();
  }

  protected async load(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      this.setOrders(await firstValueFrom(this.ordersApi.myDeliveries(this.showAll())));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar tus entregas.');
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

  protected async markDelivered(order: Order): Promise<void> {
    await firstValueFrom(this.ordersApi.updateDeliveryStatus(order.id, 'DELIVERED', { receivedBy: this.receivedByDrafts[order.id] }));
    this.load();
  }

  protected async notify(order: Order): Promise<void> {
    await firstValueFrom(this.ordersApi.notifyTeams(order.id));
    this.load();
  }

  protected teamsMessage(order: Order): string {
    return buildTeamsPickupMessage(order);
  }
}
