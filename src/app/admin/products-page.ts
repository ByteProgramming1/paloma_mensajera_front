import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Product, ProductAddOnGroup, ProductType } from '../core/api.models';
import { ProductsService } from '../core/products.service';
import { AddOnGroupsService } from '../core/addon-groups.service';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-admin-products-page',
  imports: [FormsModule, CurrencyPipe, RouterLink, Icon],
  template: `
    <h1 class="page-title mb-1">Catálogo</h1>
    <p class="page-lede mb-8">Administra combos, adicionales, precios, stock e imágenes.</p>

    <div class="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div class="order-2 lg:order-1">
        @if (isLoading()) {
          <p class="text-text-secondary">Cargando…</p>
        } @else if (products().length === 0) {
          <div class="card-surface flex flex-col items-center gap-2 p-12 text-center">
            <app-icon name="gift" [size]="32" [strokeWidth]="1.4" class="text-brand-magenta/40" />
            <p class="text-[14px] text-text-secondary">Todavía no hay productos en el catálogo. Crea el primero a la derecha.</p>
          </div>
        } @else {
          <ul class="grid gap-4 sm:grid-cols-2">
            @for (product of products(); track product.id) {
              <li class="card-surface flex flex-col gap-3 p-5">
            <div class="relative flex h-32 items-center justify-center overflow-hidden rounded-[var(--radius-paper)] bg-bg-base">
              @if (product.imageUrl) {
                <img [src]="product.imageUrl" [alt]="product.name" class="size-full object-cover" />
              } @else {
                <app-icon name="gift" [size]="28" [strokeWidth]="1.4" class="text-brand-magenta/35" />
              }
              <span
                class="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                [class]="product.isActive ? 'bg-status-entregado text-text-on-accent' : 'bg-text-secondary text-text-on-accent'"
              >{{ product.isActive ? 'Activo' : 'Inactivo' }}</span>
            </div>
            <label class="field">
              <span class="field-label">Foto del producto</span>
              <input
                class="w-full rounded-[var(--radius-sm)] border border-border-default bg-bg-surface-elevated px-3 py-2 text-[13px] text-text-secondary file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-brand-magenta file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-text-on-accent"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                (change)="uploadImage(product, $event)"
              />
            </label>
            @if (uploadingId() === product.id) { <p class="field-hint">Subiendo imagen…</p> }
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
            <p class="mono-figure text-[15px] font-semibold text-brand-magenta">{{ product.price | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            <button type="button" class="btn" [class]="product.isActive ? 'btn-secondary' : 'btn-primary'" (click)="update(product, { isActive: !product.isActive })">
              {{ product.isActive ? 'Desactivar' : 'Activar' }}
            </button>

            @if (product.type === 'COMBO') {
              <div class="mt-2 flex flex-col gap-3 border-t border-border-soft pt-3">
                <p class="field-label">Acompañantes asociados</p>
                @for (group of product.addOnGroups ?? []; track group.id) {
                  <div class="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-bg-base p-2">
                    <div>
                      <p class="text-[13px] font-semibold text-text-primary">{{ group.name }}</p>
                      <p class="text-[12px] text-text-secondary">{{ group.options.length }} opción(es)</p>
                    </div>
                    <button type="button" class="text-[12px] text-text-secondary underline" (click)="dissociateGroup(product, group)">Quitar</button>
                  </div>
                } @empty {
                  <p class="field-hint">Este combo no tiene acompañantes asociados todavía.</p>
                }
                <div class="flex gap-2">
                  <select class="field-input !h-9 max-w-[220px] text-[13px]" [(ngModel)]="associateDrafts[product.id]" [name]="'associate-' + product.id">
                    <option value="" disabled>Elige un grupo…</option>
                    @for (group of unassociatedGroups(product); track group.id) { <option [value]="group.id">{{ group.name }}</option> }
                  </select>
                  <button type="button" class="btn-secondary !px-3 !py-1 text-[13px]" [disabled]="!associateDrafts[product.id]" (click)="associateGroup(product)">Asociar</button>
                </div>
                <p class="field-hint">¿Falta un grupo o quieres agregar opciones nuevas? Gestiónalos desde <a routerLink="/admin/acompanantes" class="text-brand-magenta underline">Acompañantes</a>.</p>
              </div>
            }
              </li>
            }
          </ul>
        }
      </div>

      <aside class="order-1 lg:sticky lg:top-6 lg:order-2 lg:h-fit">
        <section class="card-surface p-6">
          <h2 class="section-title mb-4">Nuevo producto</h2>
          <form class="flex flex-col gap-4" (ngSubmit)="create()">
            <label class="field">
              <span class="field-label field-required">Nombre</span>
              <input class="field-input" required [(ngModel)]="draft.name" name="name" placeholder="Ej. Combo Carta de Otoño" />
            </label>
            <label class="field">
              <span class="field-label field-required">Tipo</span>
              <select class="field-input" [(ngModel)]="draft.type" name="type">
                <option value="COMBO">Combo</option>
                <option value="ADICIONAL">Adicional</option>
              </select>
            </label>
            <label class="field">
              <span class="field-label field-required">Precio (COP)</span>
              <input class="field-input" type="number" min="0" required [(ngModel)]="draft.price" name="price" />
            </label>
            <label class="field">
              <span class="field-label field-required">Stock disponible</span>
              <input class="field-input" type="number" min="0" required [(ngModel)]="draft.stock" name="stock" />
            </label>
            <button type="submit" class="btn-primary">Agregar al catálogo</button>
          </form>
          <p class="field-hint mt-3">La imagen se sube en un segundo paso, desde la tarjeta del producto a la izquierda (el archivo se guarda en almacenamiento de objetos, no en la base de datos).</p>
          @if (errorMessage()) { <p class="field-error mt-3">{{ errorMessage() }}</p> }
        </section>
      </aside>
    </div>
  `,
})
export class AdminProductsPage {
  private readonly productsApi = inject(ProductsService);
  private readonly addOnGroupsApi = inject(AddOnGroupsService);

  protected readonly products = signal<Product[]>([]);
  protected readonly allGroups = signal<ProductAddOnGroup[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly uploadingId = signal<string | null>(null);
  protected readonly associateDrafts: Record<string, string> = {};

  protected unassociatedGroups(product: Product) {
    const associatedIds = new Set((product.addOnGroups ?? []).map((group) => group.id));
    return this.allGroups().filter((group) => !associatedIds.has(group.id));
  }

  protected draft: { name: string; type: ProductType; price: number; stock: number } = {
    name: '',
    type: 'COMBO',
    price: 0,
    stock: 0,
  };

  constructor() {
    this.load();
    this.loadGroups();
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

  private async loadGroups(): Promise<void> {
    try {
      this.allGroups.set(await firstValueFrom(this.addOnGroupsApi.list()));
    } catch {
      // El selector de asociación queda vacío si no hay permiso; el resto de la página sigue funcionando.
    }
  }

  protected async create(): Promise<void> {
    this.errorMessage.set('');
    try {
      await firstValueFrom(this.productsApi.create({ ...this.draft, isActive: true }));
      this.draft = { name: '', type: 'COMBO', price: 0, stock: 0 };
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
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingId.set(product.id);
    try {
      await firstValueFrom(this.productsApi.uploadImage(product.id, file));
      await this.load();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible subir la imagen.');
    } finally {
      this.uploadingId.set(null);
      input.value = '';
    }
  }

  protected async associateGroup(product: Product): Promise<void> {
    const groupId = this.associateDrafts[product.id];
    if (!groupId) return;
    try {
      await firstValueFrom(this.productsApi.associateAddOnGroup(product.id, groupId));
      this.associateDrafts[product.id] = '';
      await this.load();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible asociar el grupo.');
    }
  }

  protected async dissociateGroup(product: Product, group: ProductAddOnGroup): Promise<void> {
    try {
      await firstValueFrom(this.productsApi.dissociateAddOnGroup(product.id, group.id));
      await this.load();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible quitar el grupo.');
    }
  }
}
