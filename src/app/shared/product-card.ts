import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { AddOnOption, Product } from '../core/api.models';
import { Icon } from './icon';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, Icon],
  template: `
    <article
      class="card-surface group relative flex h-full w-full flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(41,20,33,.06),0_16px_32px_-14px_rgba(41,20,33,.22)]"
      [class.z-10]="openIndex() !== null"
    >
      <div class="relative flex h-40 items-center justify-center overflow-hidden rounded-[var(--radius-paper)] bg-bg-base">
        @if (product().imageUrl) {
          <img [src]="product().imageUrl" [alt]="product().name" class="size-full object-contain transition duration-300 group-hover:scale-[1.03]" />
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
        <p class="line-clamp-2 min-h-[44px] font-semibold text-[17px] leading-snug text-text-primary">{{ product().name }}</p>
        <p class="mt-0.5 min-h-[16px] text-[12px] font-medium" [class]="product().stock > 0 && product().stock <= 5 ? 'text-status-pendiente' : 'text-text-secondary'">
          @if (product().stock > 0) { Quedan {{ product().stock }} unidades }
        </p>
        @if (product().giftable === false) {
          <p class="mt-0.5 text-[12px] font-medium text-text-secondary">Solo recogida en el stand — no se puede enviar</p>
        }
      </div>
      <div class="mt-auto flex h-10 items-center justify-between">
        <p class="mono-figure text-[18px] font-semibold text-brand-magenta">{{ product().price | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
        <div class="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border-default bg-bg-surface-elevated px-2.5 py-1.5">
          <button type="button" class="flex size-6 items-center justify-center rounded-full font-bold text-brand-magenta transition hover:bg-brand-magenta/10 disabled:opacity-30 disabled:hover:bg-transparent" [disabled]="quantity() <= 0" (click)="quantityChange.emit(quantity() - 1)" aria-label="Quitar uno">–</button>
          <span class="mono-figure w-4 text-center text-[14px] font-semibold">{{ quantity() }}</span>
          <button type="button" class="flex size-6 items-center justify-center rounded-full font-bold text-brand-magenta transition hover:bg-brand-magenta/10 disabled:opacity-30 disabled:hover:bg-transparent" [disabled]="quantity() >= product().stock" (click)="quantityChange.emit(quantity() + 1)" aria-label="Agregar uno">+</button>
        </div>
      </div>
      @if (quantity() > 0 && addOnGroup(); as group) {
        <div class="flex flex-col gap-3">
          @for (unit of unitIndexes(); track unit) {
            <div class="field relative paloma-enter">
              <span class="field-label">{{ quantity() > 1 ? group.name + ' — unidad ' + (unit + 1) + ' de ' + quantity() : group.name }}</span>

              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border p-2 text-left transition"
                [class]="selectedOptionAt(unit) ? 'border-brand-magenta/25 bg-brand-magenta/5' : 'border-border-default hover:border-brand-magenta/40'"
                [attr.aria-expanded]="openIndex() === unit"
                (click)="toggle(unit)"
              >
                <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-bg-surface-elevated">
                  @if (selectedOptionAt(unit); as selected) {
                    @if (selected.imageUrl) {
                      <img [src]="selected.imageUrl" [alt]="selected.name" class="size-full object-contain" />
                    } @else {
                      <app-icon name="envelope" [size]="18" [strokeWidth]="1.4" class="text-brand-magenta/40" />
                    }
                  } @else {
                    <app-icon name="envelope" [size]="18" [strokeWidth]="1.4" class="text-text-secondary/50" />
                  }
                </div>
                <div class="min-w-0 flex-1">
                  @if (selectedOptionAt(unit); as selected) {
                    <p class="text-[11px] font-medium text-text-secondary">Elegiste</p>
                    <p class="line-clamp-1 text-[13px] font-medium text-text-primary">{{ selected.name }}</p>
                  } @else {
                    <p class="text-[13px] font-medium text-brand-magenta">Elige tu opción</p>
                  }
                </div>
                <app-icon name="chevron-down" [size]="16" [strokeWidth]="2" class="shrink-0 text-text-secondary transition-transform" [class.rotate-180]="openIndex() === unit" />
              </button>

              @if (!selectedOptionAt(unit) && openIndex() !== unit) { <p class="field-hint">Elige una opción</p> }

              @if (openIndex() === unit) {
                <div class="fixed inset-0 z-20" (click)="openIndex.set(null)"></div>
                <div class="paloma-enter absolute inset-x-0 top-[calc(100%+8px)] z-30 rounded-[var(--radius-md)] border border-border-soft bg-bg-surface-elevated p-3 shadow-[0_4px_12px_rgba(41,20,33,.08),0_20px_44px_-16px_rgba(41,20,33,.28)]">
                  <div class="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto pr-1">
                    @for (option of group.options; track option.id) {
                      <button
                        type="button"
                        class="relative flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border-2 p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40"
                        [class]="option.id === selectedAddOnOptionIds()[unit] ? 'border-brand-magenta bg-brand-magenta/5' : 'border-border-default hover:border-brand-magenta/40'"
                        [disabled]="isOptionOutOfStock(option)"
                        (click)="selectOption(unit, option.id)"
                      >
                        <div class="flex size-14 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-bg-base">
                          @if (option.imageUrl) {
                            <img [src]="option.imageUrl" [alt]="option.name" class="size-full object-contain" />
                          } @else {
                            <app-icon name="envelope" [size]="18" [strokeWidth]="1.5" class="text-brand-magenta/40" />
                          }
                        </div>
                        <span class="line-clamp-1 text-[11px] text-text-secondary">{{ option.name }}</span>
                        @if (isOptionOutOfStock(option)) { <span class="text-[9px] font-bold uppercase tracking-wide text-status-error">Agotado</span> }
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </article>
  `,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly quantity = input(0);
  readonly selectedAddOnOptionIds = input<(string | undefined)[]>([]);
  readonly quantityChange = output<number>();
  readonly addOnOptionChange = output<{ index: number; optionId: string }>();

  // Índice de la unidad cuyo selector está abierto (una sola a la vez), o null si ninguna.
  protected readonly openIndex = signal<number | null>(null);

  protected readonly unitIndexes = computed(() => Array.from({ length: this.quantity() }, (_, i) => i));

  constructor() {
    // Abre automáticamente el selector de la primera unidad sin opción elegida — así no se
    // pierde el paso de elegir carta al agregar unidades nuevas, pero sin interrumpir si el
    // comprador ya cerró un selector sin elegir.
    effect(() => {
      if (this.quantity() <= 0 || !this.addOnGroup()) {
        this.openIndex.set(null);
        return;
      }
      if (this.openIndex() !== null) return;
      const firstMissing = this.selectedAddOnOptionIds().findIndex((id) => !id);
      if (firstMissing !== -1) this.openIndex.set(firstMissing);
    });
  }

  protected toggle(unit: number): void {
    this.openIndex.set(this.openIndex() === unit ? null : unit);
  }

  protected selectOption(unit: number, optionId: string): void {
    this.addOnOptionChange.emit({ index: unit, optionId });
    this.openIndex.set(null);
  }

  protected addOnGroup() {
    return this.product().addOnGroups?.[0] ?? null;
  }

  protected selectedOptionAt(unit: number) {
    const group = this.addOnGroup();
    const selectedId = this.selectedAddOnOptionIds()[unit];
    if (!group || !selectedId) return null;
    return group.options.find((option) => option.id === selectedId) ?? null;
  }

  // Una opción vinculada a un producto (ej. la paleta) comparte su stock con ese producto —
  // si se agotó o se desactivó por ese lado, ya no se puede elegir como acompañante tampoco.
  protected isOptionOutOfStock(option: AddOnOption): boolean {
    const linked = option.linkedProduct;
    return !!linked && (linked.stock <= 0 || !linked.isActive);
  }
}
