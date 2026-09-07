import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product } from '../core/api.models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly quantities = signal<Map<string, number>>(new Map());
  private readonly catalog = signal<Product[]>([]);

  readonly lines = computed(() => {
    const products = new Map(this.catalog().map((product) => [product.id, product]));
    return [...this.quantities().entries()]
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ product: products.get(productId), quantity }))
      .filter((line): line is { product: Product; quantity: number } => !!line.product);
  });

  readonly total = computed(() => this.lines().reduce((sum, line) => sum + line.product.price * line.quantity, 0));
  readonly itemCount = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));

  setCatalog(products: Product[]): void {
    this.catalog.set(products);
  }

  quantityOf(productId: string): number {
    return this.quantities().get(productId) ?? 0;
  }

  setQuantity(productId: string, quantity: number): void {
    const next = new Map(this.quantities());
    if (quantity <= 0) next.delete(productId);
    else next.set(productId, quantity);
    this.quantities.set(next);
  }

  toCartItems(): CartItem[] {
    return this.lines().map((line) => ({ productId: line.product.id, quantity: line.quantity }));
  }

  clear(): void {
    this.quantities.set(new Map());
  }
}
