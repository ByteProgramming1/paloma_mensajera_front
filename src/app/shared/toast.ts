import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { Icon } from './icon';

@Component({
  selector: 'app-toast',
  imports: [Icon],
  template: `
    @if (toast.messages().length > 0) {
      <div class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
        @for (message of toast.messages(); track message.id) {
          <div class="paloma-enter pointer-events-auto flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-status-entregado/30 bg-bg-surface-elevated px-4 py-3 text-[13px] font-medium text-status-entregado shadow-[0_4px_12px_rgba(41,20,33,0.08),0_20px_44px_-16px_rgba(41,20,33,0.28)]">
            <app-icon name="check" [size]="16" [strokeWidth]="2.5" />
            {{ message.text }}
          </div>
        }
      </div>
    }
  `,
})
export class Toast {
  protected readonly toast = inject(ToastService);
}
