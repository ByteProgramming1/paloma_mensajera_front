import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Product } from '../../../core/api.models';
import { NavbarComponent } from '../../../layout/navbar/navbar';
import { CartService } from '../../../core/cart.service';
import { toast } from 'ngx-sonner';

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Combo Especial',
    type: 'combos',
    imageUrl: 'assets/products/combo-especial.png',
    description: 'Caja con chocolates, una rosa y una carta personalizada.',
    price: 25000,
    stock: 18,
    isActive: true
  },
  {
    id: '2',
    name: 'Combo Enamorados',
    type: 'combos',
    imageUrl: 'assets/products/combo-enamorados.png',
    description: 'Peluche, dulces surtidos y dedicatoria en tarjeta premium.',
    price: 45000,
    stock: 18,
    isActive: false
  }
];

@Component({
  selector: 'app-product-detail',
  imports: [NavbarComponent, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  private route = inject(ActivatedRoute);
  private id = this.route.snapshot.paramMap.get('id');
  private readonly cart = inject(CartService);

  product = computed<Product | undefined>(() =>
    MOCK_PRODUCTS.find((p) => p.id === this.id)
  );

  quantity = signal(1);

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO').format(price);
  }

  incrementQuantity(): void {
    const max = this.product()?.stock ?? 1;
    this.quantity.update((qty) => Math.min(qty + 1, max));
  }

  decrementQuantity(): void {
    this.quantity.update((qty) => Math.max(qty - 1, 1));
  }

  onAddToCart(): void {
    const product = this.product();
    if (!product || !product.isActive) return;

    this.cart.add(product);
    toast.success(`${product.name} agregado al carrito`);
  }
}