import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Order } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { ConfirmAction } from '../shared/confirm-action';
import { OrderStatusBadge } from '../shared/order-status-badge';
import { CopyButton } from '../shared/copy-button';
import { buildTeamsPickupMessage } from '../shared/teams-message';
import { Pagination } from '../shared/pagination';
import { ToastService } from '../shared/toast.service';
import { groupOrders, OrderGroup } from '../shared/order-grouping';

const PAGE_SIZE = 10;
// Pedido explícito: ocultar el botón de copiar mensaje de Teams hasta nuevo aviso. Poner en `true` para reactivarlo.
const TEAMS_COPY_ENABLED = false;

type Tab = 'pagos' | 'todos';

@Component({
  selector: 'app-admin-orders-page',
  imports: [FormsModule, CurrencyPipe, DatePipe, ConfirmAction, OrderStatusBadge, CopyButton, Pagination],
  template: `
    <h1 class="page-title mb-1">Pedidos</h1>
    <p class="page-lede mb-6">Visibilidad total: remitente, destinatario, dedicatoria y estado de pago de cualquier pedido, sin restricciones.</p>

    <div class="mb-6 inline-flex gap-1 rounded-[var(--radius-sm)] border border-border-soft bg-bg-surface-elevated p-1">
      <button type="button" class="btn !px-4 !py-1.5 text-[13px] sm:!px-6 sm:!py-2 sm:text-[15px]" [class]="tab() === 'pagos' ? 'btn-primary' : 'btn-ghost'" (click)="setTab('pagos')">
        Verificar pagos en línea
        @if (pendingCount() > 0) { <span class="ml-1.5 rounded-full bg-status-pendiente px-1.5 py-0.5 text-[11px] font-bold text-text-on-accent">{{ pendingCount() }}</span> }
      </button>
      <button type="button" class="btn !px-4 !py-1.5 text-[13px] sm:!px-6 sm:!py-2 sm:text-[15px]" [class]="tab() === 'todos' ? 'btn-primary' : 'btn-ghost'" (click)="setTab('todos')">Todos los pedidos</button>
    </div>
    @if (tab() === 'pagos') {
      <p class="field-hint mb-4">Solo pagos por Nequi/Bre-B — los pagos en efectivo en el stand los confirma un Vendedor desde su propia sección de Pagos.</p>
    }

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }
    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else if (tab() === 'pagos') {
      @if (pagedGroups().length === 0) {
        <p class="field-hint">No hay pedidos en esta vista.</p>
      } @else {
        <ul class="mb-4 flex flex-col gap-4">
          @for (group of pagedGroups(); track group.groupId ?? group.orders[0].id) {
            <li class="card-surface flex flex-col gap-3 p-5">
              @if (group.orders.length > 1) {
                <p class="field-hint">Pago combinado — {{ group.orders.length }} destinatarios, mismo comprador ({{ group.orders[0].buyerFullName }}).</p>
                <ul class="flex flex-col gap-2">
                  @for (order of group.orders; track order.id) {
                    <li class="rounded-[var(--radius-sm)] bg-bg-base p-3 text-[13px]">
                      <p class="font-medium text-text-primary">
                        {{ order.selfPickup ? 'Autorrecogida' : 'Entrega a: ' + order.recipientFullName }}
                        <span class="mono-figure ml-2 text-text-secondary">{{ order.orderCode }}</span>
                      </p>
                      <p class="field-hint">{{ order.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
                    </li>
                  }
                </ul>
              } @else {
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="font-semibold text-text-primary">
                    {{ group.orders[0].buyerFullName }}
                    <span class="mono-figure ml-2 text-[13px] text-text-secondary">{{ group.orders[0].orderCode }}</span>
                  </p>
                  <app-order-status-badge [status]="group.orders[0].status" />
                </div>
                <p class="field-hint">Destinatario: {{ group.orders[0].recipientFullName }} · {{ group.orders[0].selfPickup ? 'Autorrecogida' : 'Entrega a terceros' }}</p>
                <p class="italic text-[14px] text-text-primary">“{{ group.orders[0].letterContent }}”</p>
              }
              <p class="mono-figure text-[16px] text-brand-magenta">{{ group.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

              <div class="flex flex-wrap items-center gap-3">
                <input class="field-input max-w-[280px]" [(ngModel)]="notesDrafts[groupKey(group)]" [name]="'notes-' + groupKey(group)" placeholder="Notas de verificación (opcional)" />
                <app-confirm-action label="Confirmar pago" confirmPrompt="¿Confirmas que el pago llegó por Nequi/Bre-B?" (confirm)="verifyGroup(group, true)" />
                <app-confirm-action label="Rechazar pago" variant="secondary" confirmPrompt="¿Rechazas este pago? Se libera el número de rifa." (confirm)="verifyGroup(group, false)" />
              </div>
            </li>
          }
        </ul>
        <app-pagination [page]="clampedPage()" [totalPages]="totalPages()" (pageChange)="currentPage.set($event)" />
      }
    } @else if (pagedOrders().length === 0) {
      <p class="field-hint">No hay pedidos en esta vista.</p>
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
            <p class="field-hint">Destinatario: {{ order.recipientFullName }} · {{ order.selfPickup ? 'Autorrecogida' : 'Entrega a terceros' }} · Canal: {{ order.salesChannel }}</p>
            <p class="italic text-[14px] text-text-primary">“{{ order.letterContent }}”</p>
            <p class="mono-figure text-[16px] text-brand-magenta">{{ order.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

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
              @if (order.groupId) {
                <p><span class="field-label block">Pago compartido con</span> otro(s) destinatario(s) del mismo comprador</p>
              }
              <p>
                <span class="field-label block">Dedicatoria</span>
                {{ order.messageReview?.humanReviewStatus ?? '—' }}
                @if (order.messageReview?.rejectionReason) { ({{ order.messageReview!.rejectionReason }}) }
              </p>
              <p>
                <span class="field-label block">Pago</span>
                @if (order.payment) {
                  {{ order.payment.verified ? 'Verificado' : 'No verificado' }} — {{ order.payment.paymentMethod === 'CASH' ? 'Efectivo en el stand' : 'Nequi / Bre-B' }}
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
              @if (teamsCopyEnabled && !order.selfPickup && order.payment?.verified && order.status !== 'DELIVERED') {
                <div class="sm:col-span-2">
                  <app-copy-button [text]="teamsMessage(order)" label="Copiar mensaje de Teams" />
                </div>
              }
            </div>
          </li>
        }
      </ul>
      <app-pagination [page]="clampedPage()" [totalPages]="totalPages()" (pageChange)="currentPage.set($event)" />
    }
  `,
})
export class AdminOrdersPage {
  private readonly ordersApi = inject(OrdersService);
  private readonly toast = inject(ToastService);
  protected readonly teamsCopyEnabled = TEAMS_COPY_ENABLED;

  protected readonly tab = signal<Tab>('pagos');
  protected readonly orders = signal<Order[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly notesDrafts: Record<string, string> = {};
  protected readonly currentPage = signal(1);

  // Solo ONLINE: los pagos PRESENCIAL (efectivo en el stand) los verifica un Vendedor,
  // no el Administrador — ver seller/verify-payments-page.ts.
  protected readonly pendingOrders = computed(() =>
    this.orders().filter((order) => order.status === 'PAYMENT_PENDING' && order.salesChannel === 'ONLINE'));

  protected readonly pendingGroups = computed<OrderGroup[]>(() => groupOrders(this.pendingOrders()));

  protected readonly visibleLength = computed(() => (this.tab() === 'pagos' ? this.pendingGroups().length : this.orders().length));
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.visibleLength() / PAGE_SIZE)));
  protected readonly clampedPage = computed(() => Math.min(this.currentPage(), this.totalPages()));

  protected readonly pagedGroups = computed(() => {
    const page = this.clampedPage();
    return this.pendingGroups().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  });

  protected readonly pagedOrders = computed(() => {
    const page = this.clampedPage();
    return this.orders().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  });

  protected readonly pendingCount = computed(() => this.pendingOrders().length);

  constructor() {
    this.load();
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
    this.currentPage.set(1);
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

  protected groupKey(group: OrderGroup): string {
    return group.groupId ?? group.orders[0].id;
  }

  protected async verifyGroup(group: OrderGroup, verified: boolean): Promise<void> {
    const notes = this.notesDrafts[this.groupKey(group)];
    if (group.groupId) {
      await firstValueFrom(this.ordersApi.verifyPaymentGroup(group.groupId, verified, notes));
    } else {
      await firstValueFrom(this.ordersApi.verifyPayment(group.orders[0].id, verified, notes));
    }
    this.toast.success(verified ? 'Pago confirmado.' : 'Pago rechazado.');
    this.load();
  }

  protected teamsMessage(order: Order): string {
    return buildTeamsPickupMessage(order);
  }
}
