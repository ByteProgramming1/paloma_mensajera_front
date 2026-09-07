import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Order, ORDER_STATUS_CONFIG } from '../../../core/api.models';

@Component({
  selector: 'app-order-item',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './order-item.html',
  styleUrl: './order-item.css',
})
export class OrderItemComponent {
  @Input({ required: true }) order!: Order;

  get statusConfig() {
    return ORDER_STATUS_CONFIG[this.order.status];
  }

  get formattedPrice(): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(this.order.price);
  }
}