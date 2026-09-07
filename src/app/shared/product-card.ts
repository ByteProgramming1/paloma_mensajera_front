import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Product } from '../core/api.models';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  template: `
    <article class="card-surface flex w-full max-w-[320px] flex-col gap-4 p-5">
      <div class="flex h-40 items-center justify-center overflow-hidden rounded-[var(--radius-paper)] bg-bg-base">
        @if (product().imageUrl) {
          <img [src]="product().imageUrl" [alt]="product().name" class="size-full object-cover" />
        } @else {
          <span class="text-4xl" aria-hidden="true">🎁</span>
        }
      </div>
      <p class="font-semibold text-[18px] text-text-primary">{{ product().name }}</p>
      <div class="flex h-10 items-center justify-between">
        <p class="mono-figure text-[17px] text-brand-magenta">{{ product().price | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
        <div class="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border-default px-2.5 py-1.5">
          <button type="button" class="font-bold text-brand-magenta disabled:opacity-35" [disabled]="quantity() <= 0" (click)="quantityChange.emit(quantity() - 1)" aria-label="Quitar uno">–</button>
          <span class="mono-figure w-4 text-center text-[14px]">{{ quantity() }}</span>
          <button type="button" class="font-bold text-brand-magenta disabled:opacity-35" [disabled]="quantity() >= product().stock" (click)="quantityChange.emit(quantity() + 1)" aria-label="Agregar uno">+</button>
        </div>
      </div>
      @if (product().stock <= 0) {
        <p class="field-error">Agotado</p>
      } @else if (product().stock <= 5) {
        <p class="field-hint">Quedan {{ product().stock }} unidades</p>
      }
      @if (quantity() > 0 && addOnGroup(); as group) {
        <div class="field">
          <span class="field-label">{{ group.name }}</span>
          <div class="grid grid-cols-3 gap-2">
            @for (option of group.options; track option.id) {
              <button
                type="button"
                class="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border-2 p-1.5 transition"
                [class]="option.id === selectedAddOnOptionId() ? 'border-brand-magenta bg-brand-magenta/5' : 'border-border-default'"
                (click)="addOnOptionChange.emit(option.id)"
              >
                <div class="flex size-14 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-bg-base">
                  @if (option.imageUrl) {
                    <img [src]="option.imageUrl" [alt]="option.name" class="size-full object-cover" />
                  } @else {
                    <span class="text-xl" aria-hidden="true">💌</span>
                  }
                </div>
                <span class="line-clamp-1 text-[11px] text-text-secondary">{{ option.name }}</span>
              </button>
            }
          </div>
          @if (!selectedAddOnOptionId()) { <p class="field-hint mt-1">Elige una opción</p> }
        </div>
      }
    </article>
  `,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly quantity = input(0);
  readonly selectedAddOnOptionId = input<string | undefined>(undefined);
  readonly quantityChange = output<number>();
  readonly addOnOptionChange = output<string>();

  protected addOnGroup() {
    return this.product().addOnGroups?.[0] ?? null;
  }
}
