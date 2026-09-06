import { Component, inject } from '@angular/core';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { SectionHeaderComponent } from '../../shared/section-header/section-header';
import { CartItemComponent } from './components/cart-item/cart-item';
import { CartSummaryComponent } from './components/cart-summary/cart-summary';
import { CartService } from '../../core/cart.service';

@Component({
  selector: 'page-cart',
  imports: [NavbarComponent, SectionHeaderComponent, CartItemComponent, CartSummaryComponent],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart {
  protected readonly cart = inject(CartService);

  protected onCheckout(): void {
    console.log('Continuar con el pedido');
  }
}