import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BuyerType, MetricsSummary, Order, OrderStatus, SalesChannel } from '../core/api.models';
import { AdminService } from '../core/admin.service';
import { OrdersService } from '../core/orders.service';
import { ACADEMIC_PROGRAMS } from '../core/academic-programs.const';
import { OrderStatusBadge } from '../shared/order-status-badge';

type TriState = 'ALL' | 'YES' | 'NO';

const STATUS_LABELS: Record<string, string> = {
  MESSAGE_PENDING_REVIEW: 'Dedicatoria por revisar',
  MESSAGE_APPROVED: 'Dedicatoria aprobada',
  MESSAGE_REJECTED: 'Dedicatoria rechazada',
  PAYMENT_PENDING: 'Pago pendiente',
  PAYMENT_VERIFIED: 'Pago verificado',
  PAYMENT_REJECTED: 'Pago rechazado',
  IN_PREPARATION: 'En preparación',
  IN_ROUTE: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

@Component({
  selector: 'app-admin-metrics-page',
  imports: [CurrencyPipe, DatePipe, FormsModule, OrderStatusBadge],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Métricas</h1>
    <p class="mb-8 max-w-[620px] text-[15px] text-text-secondary">Ninguna revisión (mensajes ni pagos) tiene filtro automático que reduzca el volumen — este panel ayuda a ver dónde se está acumulando la cola.</p>

    @if (errorMessage()) { <p class="field-error">{{ errorMessage() }}</p> }
    @if (metrics(); as metrics) {
      <div class="mb-8 grid gap-4 sm:grid-cols-3">
        <div class="card-surface p-5">
          <p class="field-label">Dedicatorias por revisar</p>
          <p class="mono-figure text-[28px] text-status-pendiente">{{ metrics.ordersByStatus['MESSAGE_PENDING_REVIEW'] ?? 0 }}</p>
        </div>
        <div class="card-surface p-5">
          <p class="field-label">Pagos por verificar</p>
          <p class="mono-figure text-[28px] text-status-pendiente">{{ metrics.ordersByStatus['PAYMENT_PENDING'] ?? 0 }}</p>
        </div>
        <div class="card-surface p-5">
          <p class="field-label">Ingresos totales</p>
          <p class="mono-figure text-[28px] text-brand-magenta">{{ metrics.totalRevenue | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
        </div>
      </div>

      <section class="card-surface mb-8 p-6">
        <h2 class="mb-4 text-[16px] font-semibold text-text-primary">Pedidos por estado</h2>
        <ul class="flex flex-col gap-3">
          @for (row of statusRows(); track row.label) {
            <li>
              <div class="mb-1 flex items-center justify-between text-[13px] text-text-secondary">
                <span>{{ row.label }}</span>
                <span class="mono-figure">{{ row.value }}</span>
              </div>
              <div class="h-2 rounded-full bg-bg-base">
                <div class="h-2 rounded-full bg-brand-magenta" [style.width.%]="row.percent"></div>
              </div>
            </li>
          }
        </ul>
      </section>

      <section class="card-surface p-6">
        <h2 class="mb-4 text-[16px] font-semibold text-text-primary">Pedidos por canal</h2>
        <ul class="flex flex-col gap-3">
          @for (row of channelRows(); track row.label) {
            <li class="flex items-center justify-between text-[14px] text-text-secondary">
              <span>{{ row.label }}</span>
              <span>{{ row.count }} pedido(s) · <span class="mono-figure">{{ row.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</span></span>
            </li>
          }
        </ul>
      </section>
    } @else if (!errorMessage()) {
      <p class="text-text-secondary">Cargando métricas…</p>
    }

    <section class="card-surface mt-8 p-6">
      <h2 class="text-[16px] font-semibold text-text-primary">Lista de preparación</h2>
      <p class="field-hint mb-4">Cuánto hay que alistar para el día de la entrega — solo cuenta pedidos con pago verificado y no cancelados.</p>
      @if (prepList().length === 0) {
        <p class="field-hint">Todavía no hay nada que preparar.</p>
      } @else {
        <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          @for (row of prepList(); track row.name) {
            <li class="flex items-center justify-between rounded-[var(--radius-sm)] bg-bg-base px-3 py-2 text-[14px] text-text-primary">
              <span>{{ row.name }}</span>
              <span class="mono-figure font-semibold text-brand-magenta">{{ row.quantity }}</span>
            </li>
          }
        </ul>
      }
    </section>

    <section class="card-surface mt-8 flex flex-col gap-4 p-6">
      <div>
        <h2 class="text-[16px] font-semibold text-text-primary">Explorador completo de pedidos</h2>
        <p class="field-hint">Todos los campos de todos los pedidos, con filtros — equivalente a la base de datos completa.</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <label class="field">
          <span class="field-label">Buscar (nombre, correo, carrera)</span>
          <input class="field-input" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Ej. Astrih o Sistemas" />
        </label>
        <label class="field">
          <span class="field-label">Estado</span>
          <select class="field-input" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
            <option value="">Todos</option>
            @for (status of statusOptions; track status) { <option [value]="status">{{ STATUS_LABELS[status] }}</option> }
          </select>
        </label>
        <label class="field">
          <span class="field-label">Canal</span>
          <select class="field-input" [ngModel]="channelFilter()" (ngModelChange)="channelFilter.set($event)">
            <option value="">Todos</option>
            <option value="ONLINE">En línea</option>
            <option value="PRESENCIAL">Presencial</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">Tipo de comprador</span>
          <select class="field-input" [ngModel]="buyerTypeFilter()" (ngModelChange)="buyerTypeFilter.set($event)">
            <option value="">Todos</option>
            <option value="ESTUDIANTE">Estudiante</option>
            <option value="PROFESOR">Profesor</option>
            <option value="ADMINISTRATIVO">Administrativo</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">Carrera / programa</span>
          <select class="field-input" [ngModel]="careerFilter()" (ngModelChange)="careerFilter.set($event)">
            <option value="">Todas</option>
            @for (program of programs; track program) { <option [value]="program">{{ program }}</option> }
          </select>
        </label>
        <label class="field">
          <span class="field-label">Anónimo</span>
          <select class="field-input" [ngModel]="anonymousFilter()" (ngModelChange)="anonymousFilter.set($event)">
            <option value="ALL">Todos</option>
            <option value="YES">Sí</option>
            <option value="NO">No</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">Autorrecogida</span>
          <select class="field-input" [ngModel]="selfPickupFilter()" (ngModelChange)="selfPickupFilter.set($event)">
            <option value="ALL">Todas</option>
            <option value="YES">Sí</option>
            <option value="NO">No</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">Desde</span>
          <input class="field-input" type="date" [ngModel]="dateFrom()" (ngModelChange)="dateFrom.set($event)" />
        </label>
        <label class="field">
          <span class="field-label">Hasta</span>
          <input class="field-input" type="date" [ngModel]="dateTo()" (ngModelChange)="dateTo.set($event)" />
        </label>
        <div class="field self-end">
          <button type="button" class="btn-secondary" (click)="clearFilters()">Limpiar filtros</button>
        </div>
      </div>

      @if (ordersError()) { <p class="field-error">{{ ordersError() }}</p> }
      @if (ordersLoading()) {
        <p class="text-text-secondary">Cargando pedidos…</p>
      } @else {
        <p class="field-hint">{{ filteredOrders().length }} de {{ allOrders().length }} pedido(s)</p>
        <div class="overflow-x-auto rounded-[var(--radius-sm)] border border-border-soft">
          <table class="w-full min-w-[1520px] border-collapse text-[13px]">
            <thead>
              <tr class="bg-bg-base text-left text-text-secondary">
                <th class="p-2">Código</th>
                <th class="p-2">Fecha</th>
                <th class="p-2">Estado</th>
                <th class="p-2">Canal</th>
                <th class="p-2">Comprador</th>
                <th class="p-2">Correo</th>
                <th class="p-2">Teléfono</th>
                <th class="p-2">Tipo</th>
                <th class="p-2">Carrera / área (comprador)</th>
                <th class="p-2">Autorrecogida</th>
                <th class="p-2">Destinatario</th>
                <th class="p-2">Carrera / área (destinatario)</th>
                <th class="p-2">Anónimo</th>
                <th class="p-2">Productos</th>
                <th class="p-2">Total</th>
                <th class="p-2">N° rifa</th>
                <th class="p-2">Dedicatoria</th>
              </tr>
            </thead>
            <tbody>
              @for (order of filteredOrders(); track order.id) {
                <tr class="border-t border-border-soft align-top text-text-primary">
                  <td class="mono-figure p-2">{{ order.orderCode }}</td>
                  <td class="p-2 whitespace-nowrap">{{ order.createdAt | date:'short' }}</td>
                  <td class="p-2"><app-order-status-badge [status]="order.status" /></td>
                  <td class="p-2">{{ order.salesChannel === 'ONLINE' ? 'En línea' : 'Presencial' }}</td>
                  <td class="p-2">{{ order.buyerFullName ?? '—' }}{{ order.isAnonymous ? ' (pidió anonimato con el vendedor)' : '' }}</td>
                  <td class="p-2">{{ order.buyerEmail ?? '—' }}</td>
                  <td class="p-2">{{ order.buyerPhone ?? '—' }}</td>
                  <td class="p-2">{{ order.buyerType ?? '—' }}</td>
                  <td class="p-2">{{ order.buyerCareerOrArea ?? '—' }}</td>
                  <td class="p-2">{{ order.selfPickup ? 'Sí' : 'No' }}</td>
                  <td class="p-2">{{ order.recipientFullName }}</td>
                  <td class="p-2">{{ order.recipientCareerOrArea ?? '—' }}</td>
                  <td class="p-2">{{ order.isAnonymous ? 'Sí' : 'No' }}</td>
                  <td class="p-2">
                    @for (item of order.items; track item.id) {
                      <div>{{ item.quantity }}× {{ item.productName ?? item.productId }}{{ item.selectedAddOnOption ? ' — ' + item.selectedAddOnOption.name : '' }}</div>
                    }
                  </td>
                  <td class="mono-figure p-2">{{ order.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                  <td class="mono-figure p-2">{{ order.raffleNumber ?? '—' }}</td>
                  <td class="max-w-[260px] p-2" [title]="order.letterContent">{{ order.letterContent }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class AdminMetricsPage {
  private readonly adminApi = inject(AdminService);
  private readonly ordersApi = inject(OrdersService);
  protected readonly metrics = signal<MetricsSummary | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly programs = ACADEMIC_PROGRAMS;
  protected readonly statusOptions: OrderStatus[] = [
    'MESSAGE_PENDING_REVIEW', 'MESSAGE_APPROVED', 'MESSAGE_REJECTED',
    'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED',
    'IN_PREPARATION', 'IN_ROUTE', 'DELIVERED', 'CANCELLED',
  ];

  protected readonly allOrders = signal<Order[]>([]);
  protected readonly ordersLoading = signal(true);
  protected readonly ordersError = signal('');

  protected readonly prepList = computed(() => {
    const counts = new Map<string, number>();
    for (const order of this.allOrders()) {
      if (order.status === 'CANCELLED' || order.payment?.verified !== true) continue;
      for (const item of order.items) {
        const productName = item.productName ?? item.productId;
        counts.set(productName, (counts.get(productName) ?? 0) + item.quantity);
        if (item.selectedAddOnOption) {
          const optionName = item.selectedAddOnOption.name;
          counts.set(optionName, (counts.get(optionName) ?? 0) + item.quantity);
        }
      }
    }
    return [...counts.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  });

  protected readonly search = signal('');
  protected readonly statusFilter = signal<OrderStatus | ''>('');
  protected readonly channelFilter = signal<SalesChannel | ''>('');
  protected readonly buyerTypeFilter = signal<BuyerType | ''>('');
  protected readonly careerFilter = signal('');
  protected readonly anonymousFilter = signal<TriState>('ALL');
  protected readonly selfPickupFilter = signal<TriState>('ALL');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  protected readonly filteredOrders = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const channel = this.channelFilter();
    const buyerType = this.buyerTypeFilter();
    const career = this.careerFilter();
    const anonymous = this.anonymousFilter();
    const selfPickup = this.selfPickupFilter();
    const from = this.dateFrom() ? new Date(this.dateFrom()).getTime() : null;
    const to = this.dateTo() ? new Date(this.dateTo()).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    return this.allOrders().filter((order) => {
      if (status && order.status !== status) return false;
      if (channel && order.salesChannel !== channel) return false;
      if (buyerType && order.buyerType !== buyerType) return false;
      if (career && order.buyerCareerOrArea !== career && order.recipientCareerOrArea !== career) return false;
      if (anonymous === 'YES' && !order.isAnonymous) return false;
      if (anonymous === 'NO' && order.isAnonymous) return false;
      if (selfPickup === 'YES' && !order.selfPickup) return false;
      if (selfPickup === 'NO' && order.selfPickup) return false;
      const createdAt = new Date(order.createdAt).getTime();
      if (from !== null && createdAt < from) return false;
      if (to !== null && createdAt > to) return false;
      if (query) {
        const haystack = [
          order.buyerFullName, order.buyerEmail, order.buyerPhone, order.buyerCareerOrArea,
          order.recipientFullName, order.recipientCareerOrArea, order.orderCode,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  });

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.channelFilter.set('');
    this.buyerTypeFilter.set('');
    this.careerFilter.set('');
    this.anonymousFilter.set('ALL');
    this.selfPickupFilter.set('ALL');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  protected readonly statusRows = computed(() => {
    const byStatus = this.metrics()?.ordersByStatus ?? {};
    const max = Math.max(1, ...Object.values(byStatus).map((value) => value ?? 0));
    return Object.entries(byStatus).map(([status, value]) => ({
      label: STATUS_LABELS[status] ?? status,
      value: value ?? 0,
      percent: ((value ?? 0) / max) * 100,
    }));
  });

  protected readonly channelRows = computed(() => {
    const byChannel = this.metrics()?.ordersBySalesChannel ?? {};
    return Object.entries(byChannel).map(([label, metric]) => ({
      label: label === 'ONLINE' ? 'En línea' : 'Presencial',
      count: metric?.count ?? 0,
      totalAmount: metric?.totalAmount ?? 0,
    }));
  });

  constructor() {
    this.load();
    this.loadOrders();
  }

  private async load(): Promise<void> {
    try {
      this.metrics.set(await firstValueFrom(this.adminApi.metrics()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar las métricas.');
    }
  }

  private async loadOrders(): Promise<void> {
    this.ordersLoading.set(true);
    this.ordersError.set('');
    try {
      this.allOrders.set(await firstValueFrom(this.ordersApi.list()));
    } catch (error) {
      this.ordersError.set(error instanceof Error ? error.message : 'No fue posible cargar los pedidos.');
    } finally {
      this.ordersLoading.set(false);
    }
  }
}
