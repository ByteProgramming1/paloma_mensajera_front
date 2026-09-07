import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product } from '../core/api.models';

interface CartLine { quantity: number; selectedAddOnOptionId?: string; }

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cartLines = signal<Map<string, CartLine>>(new Map());
  private readonly catalog = signal<Product[]>([]);

  readonly lines = computed(() => {
    const products = new Map(this.catalog().map((product) => [product.id, product]));
    return [...this.cartLines().entries()]
      .filter(([, line]) => line.quantity > 0)
      .map(([productId, line]) => ({ product: products.get(productId), quantity: line.quantity, selectedAddOnOptionId: line.selectedAddOnOptionId }))
      .filter((line): line is { product: Product; quantity: number; selectedAddOnOptionId: string | undefined } => !!line.product);
  });

  readonly total = computed(() => this.lines().reduce((sum, line) => sum + line.product.price * line.quantity, 0));
  readonly itemCount = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));

  setCatalog(products: Product[]): void {
    this.catalog.set(products);
  }

  quantityOf(productId: string): number {
    return this.cartLines().get(productId)?.quantity ?? 0;
  }

  selectedAddOnOptionOf(productId: string): string | undefined {
    return this.cartLines().get(productId)?.selectedAddOnOptionId;
  }

  setQuantity(productId: string, quantity: number): void {
    const next = new Map(this.cartLines());
    if (quantity <= 0) next.delete(productId);
    else next.set(productId, { ...next.get(productId), quantity });
    this.cartLines.set(next);
  }

  setAddOnOption(productId: string, selectedAddOnOptionId: string): void {
    const next = new Map(this.cartLines());
    const current = next.get(productId);
    if (!current) return;
    next.set(productId, { ...current, selectedAddOnOptionId });
    this.cartLines.set(next);
  }

  toCartItems(): CartItem[] {
    return this.lines().map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
      ...(line.selectedAddOnOptionId ? { selectedAddOnOptionId: line.selectedAddOnOptionId } : {}),
    }));
  }

  clear(): void {
    this.cartLines.set(new Map());
  }
}
