import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Product, ProductType } from '../core/api.models';
import { ProductsService } from '../core/products.service';

@Component({
  selector: 'app-admin-products-page',
  imports: [FormsModule, CurrencyPipe],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Catálogo</h1>
    <p class="mb-8 max-w-[620px] text-[15px] text-text-secondary">Administra combos, adicionales, precios, stock e imágenes.</p>

    <section class="card-surface mb-8 p-6">
      <h2 class="mb-4 text-[16px] font-semibold text-text-primary">Nuevo producto</h2>
      <form class="grid gap-4 sm:grid-cols-2" (ngSubmit)="create()">
        <label class="field">
          <span class="field-label">Nombre</span>
          <input class="field-input" required [(ngModel)]="draft.name" name="name" />
        </label>
        <label class="field">
          <span class="field-label">Tipo</span>
          <select class="field-input" [(ngModel)]="draft.type" name="type">
            <option value="COMBO">Combo</option>
            <option value="ADICIONAL">Adicional</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">Precio (COP)</span>
          <input class="field-input" type="number" min="0" required [(ngModel)]="draft.price" name="price" />
        </label>
        <label class="field">
          <span class="field-label">Stock</span>
          <input class="field-input" type="number" min="0" required [(ngModel)]="draft.stock" name="stock" />
        </label>
        <label class="field sm:col-span-2">
          <span class="field-label">Descripción</span>
          <input class="field-input" [(ngModel)]="draft.description" name="description" />
        </label>
        <button type="submit" class="btn-primary self-end sm:col-span-2">Agregar al catálogo</button>
      </form>
      @if (errorMessage()) { <p class="field-error mt-3">{{ errorMessage() }}</p> }
    </section>

    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else {
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (product of products(); track product.id) {
          <li class="card-surface flex flex-col gap-3 p-5">
            <div class="flex h-32 items-center justify-center overflow-hidden rounded-[var(--radius-paper)] bg-bg-base">
              @if (product.imageUrl) {
                <img [src]="product.imageUrl" [alt]="product.name" class="size-full object-cover" />
              } @else {
                <span class="text-3xl" aria-hidden="true">🎁</span>
              }
            </div>
            <input class="field-input" type="file" accept="image/png,image/jpeg,image/webp" (change)="uploadImage(product, $event)" />
            <p class="font-semibold text-text-primary">{{ product.name }}</p>
            <div class="grid grid-cols-2 gap-3">
              <label class="field">
                <span class="field-label">Precio</span>
                <input class="field-input" type="number" [ngModel]="product.price" (ngModelChange)="update(product, { price: $event })" />
              </label>
              <label class="field">
                <span class="field-label">Stock</span>
                <input class="field-input" type="number" [ngModel]="product.stock" (ngModelChange)="update(product, { stock: $event })" />
              </label>
            </div>
            <p class="mono-figure text-[15px] text-brand-magenta">{{ product.price | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            <button type="button" class="btn" [class]="product.isActive ? 'btn-secondary' : 'btn-primary'" (click)="update(product, { isActive: !product.isActive })">
              {{ product.isActive ? 'Desactivar' : 'Activar' }}
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class AdminProductsPage {
  private readonly productsApi = inject(ProductsService);

  protected readonly products = signal<Product[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected draft: { name: string; type: ProductType; price: number; stock: number; description: string } = {
    name: '',
    type: 'COMBO',
    price: 0,
    stock: 0,
    description: '',
  };

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.products.set(await firstValueFrom(this.productsApi.list()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar el catálogo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async create(): Promise<void> {
    this.errorMessage.set('');
    try {
      await firstValueFrom(this.productsApi.create({ ...this.draft, isActive: true }));
      this.draft = { name: '', type: 'COMBO', price: 0, stock: 0, description: '' };
      this.load();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible crear el producto.');
    }
  }

  protected async update(product: Product, changes: Partial<Product>): Promise<void> {
    await firstValueFrom(this.productsApi.update(product.id, changes));
    this.load();
  }

  protected async uploadImage(product: Product, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await firstValueFrom(this.productsApi.uploadImage(product.id, file));
    this.load();
  }
}
