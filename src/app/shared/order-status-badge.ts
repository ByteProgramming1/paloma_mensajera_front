import { Component, computed, input } from '@angular/core';
import { OrderStatus } from '../core/api.models';

interface BadgeVisual { label: string; className: string; }

const VISUALS: Record<OrderStatus, BadgeVisual> = {
  MESSAGE_PENDING_REVIEW: { label: 'Mensaje por revisar', className: 'bg-status-pendiente' },
  MESSAGE_APPROVED: { label: 'Mensaje aprobado', className: 'bg-status-en-camino' },
  MESSAGE_REJECTED: { label: 'Mensaje rechazado', className: 'bg-status-error' },
  PAYMENT_PENDING: { label: 'Pago pendiente', className: 'bg-status-pendiente' },
  PAYMENT_VERIFIED: { label: 'Pagado', className: 'bg-status-pagado' },
  PAYMENT_REJECTED: { label: 'Pago rechazado', className: 'bg-status-error' },
  IN_PREPARATION: { label: 'En preparación', className: 'bg-status-pagado' },
  IN_ROUTE: { label: 'En camino', className: 'bg-status-en-camino' },
  DELIVERED: { label: 'Entregado', className: 'bg-status-entregado' },
  CANCELLED: { label: 'Cancelado', className: 'bg-text-secondary' },
};

@Component({
  selector: 'app-order-status-badge',
  template: `
    <span
      class="inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-[0.02em] text-text-on-accent"
      [class]="visual().className"
    >{{ visual().label }}</span>
  `,
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();
  protected readonly visual = computed(() => VISUALS[this.status()]);
}
