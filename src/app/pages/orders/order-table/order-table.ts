import { Component } from '@angular/core';
import { Order } from '../../../core/api.models';
import { OrderItemComponent } from '../order-item/order-item';

export const MOCK_ORDERS: Order[] = [
  { id: 'PM-2900', description: 'Combo Enamorados', price: 45000, status: 'pendiente' },
  { id: 'PM-2847', description: 'Combo Clásico + Combo Anónimo', price: 40000, status: 'pagado' },
  { id: 'PM-2760', description: 'Rosa Clásica', price: 8000, status: 'en_camino' },
  { id: 'PM-2611', description: 'Caja de Bombones', price: 18000, status: 'entregado' },
];

@Component({
  selector: 'app-order-table',
  standalone: true,
  styleUrl: "./order-table.css",
  imports: [OrderItemComponent],
  templateUrl: './order-table.html',
})
export class OrdersOrderTableComponent {
  orders: Order[] = MOCK_ORDERS;
}