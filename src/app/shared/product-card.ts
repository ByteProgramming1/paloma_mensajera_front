import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Product } from '../core/api.models';
import { Icon } from './icon';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, Icon],
  template: `
    <article class="card-surface group flex w-full max-w-[320px] flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(41,20,33,.06),0_16px_32px_-14px_rgba(41,20,33,.22)]">
      <div class="relative flex h-40 items-center justify-center overflow-hidden rounded-[var(--radius-paper)] bg-bg-base">
        @if (product().imageUrl) {
          <img [src]="product().imageUrl" [alt]="product().name" class="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        } @else {
          <app-icon name="gift" [size]="36" [strokeWidth]="1.4" class="text-brand-magenta/35" />
        }
        @if (product().stock <= 0) {
          <div class="absolute inset-0 flex items-center justify-center bg-bg-surface-elevated/75 backdrop-blur-[1px]">
            <span class="rounded-full bg-status-error px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-text-on-accent">Agotado</span>
          </div>
        }
      </div>
      <div>
        <p class="font-semibold text-[17px] leading-snug text-text-primary">{{ product().name }}</p>
        @if (product().stock > 0 && product().stock <= 5) {
          <p class="mt-0.5 text-[12px] font-medium text-status-pendiente">Quedan {{ product().stock }} unidades</p>
        }
      </div>
      <div class="flex h-10 items-center justify-between">
        <p class="mono-figure text-[18px] font-semibold text-brand-magenta">{{ product().price | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
        <div class="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border-default bg-bg-surface-elevated px-2.5 py-1.5">
          <button type="button" class="flex size-6 items-center justify-center rounded-full font-bold text-brand-magenta transition hover:bg-brand-magenta/10 disabled:opacity-30 disabled:hover:bg-transparent" [disabled]="quantity() <= 0" (click)="quantityChange.emit(quantity() - 1)" aria-label="Quitar uno">–</button>
          <span class="mono-figure w-4 text-center text-[14px] font-semibold">{{ quantity() }}</span>
          <button type="button" class="flex size-6 items-center justify-center rounded-full font-bold text-brand-magenta transition hover:bg-brand-magenta/10 disabled:opacity-30 disabled:hover:bg-transparent" [disabled]="quantity() >= product().stock" (click)="quantityChange.emit(quantity() + 1)" aria-label="Agregar uno">+</button>
        </div>
      </div>
      @if (quantity() > 0 && addOnGroup(); as group) {
        <div class="field paloma-enter">
          <span class="field-label">{{ group.name }}</span>
          <div class="grid grid-cols-3 gap-2">
            @for (option of group.options; track option.id) {
              <button
                type="button"
                class="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border-2 p-1.5 transition"
                [class]="option.id === selectedAddOnOptionId() ? 'border-brand-magenta bg-brand-magenta/5' : 'border-border-default hover:border-brand-magenta/40'"
                (click)="addOnOptionChange.emit(option.id)"
              >
                <div class="flex size-14 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-bg-base">
                  @if (option.imageUrl) {
                    <img [src]="option.imageUrl" [alt]="option.name" class="size-full object-cover" />
                  } @else {
                    <app-icon name="envelope" [size]="18" [strokeWidth]="1.5" class="text-brand-magenta/40" />
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
