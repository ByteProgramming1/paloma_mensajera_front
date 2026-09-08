import { Component, input, signal } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-copy-button',
  imports: [Icon],
  template: `
    <button type="button" class="btn-secondary !px-3 !py-1.5 text-[13px]" (click)="copy()">
      <app-icon [name]="copied() ? 'check' : 'copy'" [size]="14" [strokeWidth]="2" />
      {{ copied() ? '¡Copiado!' : label() }}
    </button>
  `,
})
export class CopyButton {
  readonly text = input.required<string>();
  readonly label = input('Copiar mensaje');

  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard API no disponible en este navegador/contexto — el botón simplemente no confirma.
    }
  }
}
