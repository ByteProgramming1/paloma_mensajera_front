import { Component, input, output, signal } from '@angular/core';

/**
 * Botón con doble confirmación en el cliente, requerida por el SDD (secciones 3.2 y 3.3)
 * para aprobar/rechazar dedicatorias y confirmar/rechazar pagos.
 */
@Component({
  selector: 'app-confirm-action',
  template: `
    @if (!confirming()) {
      <button type="button" class="btn" [class]="variantClass()" [disabled]="disabled()" (click)="confirming.set(true)">
        {{ label() }}
      </button>
    } @else {
      <div class="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border-soft bg-bg-base px-3 py-2">
        <span class="text-[13px] text-text-secondary">{{ confirmPrompt() }}</span>
        <button type="button" class="btn" [class]="variantClass()" (click)="confirmed()">Sí, confirmar</button>
        <button type="button" class="btn-ghost !px-3 !py-1 text-[13px]" (click)="confirming.set(false)">Cancelar</button>
      </div>
    }
  `,
})
export class ConfirmAction {
  readonly label = input.required<string>();
  readonly confirmPrompt = input('¿Confirmas esta acción?');
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('primary');
  readonly disabled = input(false);
  readonly confirm = output<void>();

  protected readonly confirming = signal(false);
  protected readonly variantClass = () => `btn-${this.variant()}`;

  protected confirmed(): void {
    this.confirming.set(false);
    this.confirm.emit();
  }
}
