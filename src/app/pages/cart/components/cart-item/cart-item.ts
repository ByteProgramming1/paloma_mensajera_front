import { Component, input, output } from '@angular/core';
import { CartItem } from '../../../../core/cart.service';

@Component({
  selector: 'app-cart-item',
  templateUrl: './cart-item.html',
  styleUrl: './cart-item.css'
})
export class CartItemComponent {
  readonly item = input.required<CartItem>();
  readonly increment = output<string>();
  readonly decrement = output<string>();
  readonly remove = output<string>();

  protected formatPrice(value: number): string {
    return value.toLocaleString('es-CO');
  }

  protected get lineTotal(): number {
    return this.item().product.price * this.item().quantity;
  }
}