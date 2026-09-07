import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MetricsSummary } from '../core/api.models';
import { AdminService } from '../core/admin.service';

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
  imports: [CurrencyPipe],
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
  `,
})
export class AdminMetricsPage {
  private readonly adminApi = inject(AdminService);
  protected readonly metrics = signal<MetricsSummary | null>(null);
  protected readonly errorMessage = signal('');

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
  }

  private async load(): Promise<void> {
    try {
      this.metrics.set(await firstValueFrom(this.adminApi.metrics()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar las métricas.');
    }
  }
}
