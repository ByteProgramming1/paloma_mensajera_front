import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.html',
  styleUrl: './cart-summary.css'
})
export class CartSummaryComponent {
  readonly subtotal = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly checkout = output<void>();

  protected formatPrice(value: number): string {
    return value.toLocaleString('es-CO');
  }
}