import { Component, input, output } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-pagination',
  imports: [Icon],
  template: `
    @if (totalPages() > 1) {
      <div class="flex items-center justify-center gap-2">
        <button type="button" class="btn-ghost !px-2.5 !py-1" [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)" aria-label="Página anterior">
          <app-icon name="chevron-left" [size]="16" />
        </button>
        <span class="text-[13px] text-text-secondary">Página <span class="font-semibold text-text-primary">{{ page() }}</span> de {{ totalPages() }}</span>
        <button type="button" class="btn-ghost !px-2.5 !py-1" [disabled]="page() >= totalPages()" (click)="pageChange.emit(page() + 1)" aria-label="Página siguiente">
          <app-icon name="chevron-right" [size]="16" />
        </button>
      </div>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();
}
