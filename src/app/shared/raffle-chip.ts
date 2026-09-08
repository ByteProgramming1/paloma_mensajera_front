import { Component, computed, input, output } from '@angular/core';

export type RaffleChipState = 'disponible' | 'tomado' | 'seleccionado';

@Component({
  selector: 'app-raffle-chip',
  template: `
    <button
      type="button"
      class="mono-figure flex size-14 items-center justify-center rounded-[var(--radius-sm)] text-[16px] font-medium transition"
      [class]="classes()"
      [disabled]="state() !== 'disponible'"
      (click)="pick.emit(number())"
    >{{ number() }}</button>
  `,
})
export class RaffleChip {
  readonly number = input.required<number>();
  readonly state = input<RaffleChipState>('disponible');
  readonly pick = output<number>();

  protected readonly classes = computed(() => {
    switch (this.state()) {
      case 'seleccionado': return 'bg-brand-magenta text-text-on-accent shadow-[0_4px_12px_-2px_rgba(151,2,123,0.45)]';
      case 'tomado': return 'cursor-not-allowed bg-border-soft text-text-secondary/60';
      default: return 'border-[1.5px] border-brand-magenta bg-bg-surface-elevated text-brand-magenta hover:-translate-y-0.5 hover:bg-brand-magenta/5 hover:shadow-[0_4px_10px_-4px_rgba(151,2,123,0.35)] active:translate-y-0';
    }
  });
}
