import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProductsService } from '../core/products.service';
import { CartService } from '../shared/cart.service';
import { ProductCard } from '../shared/product-card';

@Component({
  selector: 'app-catalog-page',
  imports: [ProductCard, CurrencyPipe],
  template: `
    <h1 class="mb-1 text-[28px] font-semibold tracking-tight text-text-primary">Elige el detalle que quieres enviar</h1>
    <p class="page-lede mb-8">Arma tu carrito con combos y adicionales. Cuando termines, escribe tu dedicatoria en el siguiente paso.</p>

    @if (isLoading()) {
      <p class="text-text-secondary">Cargando catálogo…</p>
    } @else if (errorMessage()) {
      <p class="field-error">{{ errorMessage() }}</p>
    } @else {
      <div class="flex flex-wrap gap-6 pb-4">
        @for (product of products(); track product.id) {
          <app-product-card
            [product]="product"
            [quantity]="cart.quantityOf(product.id)"
            [selectedAddOnOptionId]="cart.selectedAddOnOptionOf(product.id)"
            (quantityChange)="cart.setQuantity(product.id, $event)"
            (addOnOptionChange)="cart.setAddOnOption(product.id, $event)"
          />
        }
      </div>
    }

    @if (cart.itemCount() > 0) {
      <div class="paloma-enter sticky bottom-4 mt-10 flex items-center justify-between rounded-[var(--radius-md)] border border-border-soft bg-bg-surface-elevated px-6 py-4 shadow-[0_4px_12px_rgba(41,20,33,0.08),0_20px_44px_-16px_rgba(41,20,33,0.28)]">
        <div>
          <p class="text-[13px] text-text-secondary">{{ cart.itemCount() }} producto(s) en el carrito</p>
          <p class="mono-figure text-[20px] font-semibold text-brand-magenta">{{ cart.total() | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
        </div>
        <button type="button" class="btn-primary" (click)="continue()">Continuar con mi dedicatoria</button>
      </div>
    }
  `,
})
export class CatalogPage {
  private readonly productsApi = inject(ProductsService);
  private readonly router = inject(Router);
  protected readonly cart = inject(CartService);

  protected readonly products = signal<import('../core/api.models').Product[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const products = await firstValueFrom(this.productsApi.list());
      const active = products.filter((product) => product.isActive);
      this.products.set(active);
      this.cart.setCatalog(active);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar el catálogo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected continue(): void {
    this.router.navigateByUrl('/comprar');
  }
}
