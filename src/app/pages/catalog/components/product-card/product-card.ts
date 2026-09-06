import { Component, input, output } from '@angular/core';
import { Product } from '../../../../core/api.models';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.html',
  styleUrl: './product-card.css'
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly addToCart = output<string>();

  protected formatPrice(value: number): string {
    return value.toLocaleString('es-CO');
  }

  protected onAddToCart(): void {
    if (this.product().isActive) {
      this.addToCart.emit(this.product().id);
    }
  }
}