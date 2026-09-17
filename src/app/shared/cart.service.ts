import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product } from '../core/api.models';

// Una entrada por unidad: addOnSelections[i] es la opción elegida para la unidad i (o undefined
// si esa unidad todavía no tiene opción, o el producto no tiene grupo de acompañantes).
interface CartLineEntry { addOnSelections: (string | undefined)[]; }

// Una línea visible del carrito agrupa las unidades de un mismo producto que comparten la misma
// opción de acompañante (incluida "ninguna"). Así dos combos iguales con carta distinta aparecen
// como dos líneas separadas — cada una asignable a un destinatario distinto.
export interface CartLine { key: string; product: Product; quantity: number; selectedAddOnOptionId: string | undefined; }

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cartLines = signal<Map<string, CartLineEntry>>(new Map());
  private readonly catalog = signal<Product[]>([]);

  readonly lines = computed<CartLine[]>(() => {
    const products = new Map(this.catalog().map((product) => [product.id, product]));
    const result: CartLine[] = [];
    for (const [productId, entry] of this.cartLines()) {
      const product = products.get(productId);
      if (!product) continue;
      const counts = new Map<string, number>();
      const order: string[] = [];
      for (const addOnOptionId of entry.addOnSelections) {
        const groupKey = addOnOptionId ?? '';
        if (!counts.has(groupKey)) {
          counts.set(groupKey, 0);
          order.push(groupKey);
        }
        counts.set(groupKey, counts.get(groupKey)! + 1);
      }
      for (const groupKey of order) {
        const selectedAddOnOptionId = groupKey || undefined;
        const key = selectedAddOnOptionId ? `${productId}::${selectedAddOnOptionId}` : productId;
        result.push({ key, product, quantity: counts.get(groupKey)!, selectedAddOnOptionId });
      }
    }
    return result;
  });

  readonly total = computed(() => this.lines().reduce((sum, line) => sum + line.product.price * line.quantity, 0));
  readonly itemCount = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));

  setCatalog(products: Product[]): void {
    this.catalog.set(products);
  }

  quantityOf(productId: string): number {
    return this.cartLines().get(productId)?.addOnSelections.length ?? 0;
  }

  // Una selección por unidad, en el mismo orden que se fueron agregando — permite que dos
  // unidades del mismo producto tengan cada una su propia opción (o ninguna).
  selectedAddOnOptionsOf(productId: string): (string | undefined)[] {
    return this.cartLines().get(productId)?.addOnSelections ?? [];
  }

  setQuantity(productId: string, quantity: number): void {
    const next = new Map(this.cartLines());
    if (quantity <= 0) {
      next.delete(productId);
      this.cartLines.set(next);
      return;
    }
    const current = next.get(productId)?.addOnSelections ?? [];
    const resized = current.slice(0, quantity);
    while (resized.length < quantity) resized.push(undefined);
    next.set(productId, { addOnSelections: resized });
    this.cartLines.set(next);
  }

  setAddOnOptionAt(productId: string, index: number, selectedAddOnOptionId: string): void {
    const next = new Map(this.cartLines());
    const current = next.get(productId);
    if (!current || index < 0 || index >= current.addOnSelections.length) return;
    const addOnSelections = [...current.addOnSelections];
    addOnSelections[index] = selectedAddOnOptionId;
    next.set(productId, { addOnSelections });
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
