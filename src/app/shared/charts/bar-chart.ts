import { Component, computed, input, signal } from '@angular/core';

export interface BarChartRow { label: string; value: number; }

@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="mb-3 flex items-center justify-between gap-3">
      <p class="section-title">{{ title() }}</p>
      @if (rows().length > 0) {
        <button type="button" class="shrink-0 text-[12px] font-medium text-brand-magenta underline underline-offset-2" (click)="showTable.set(!showTable())">
          {{ showTable() ? 'Ver gráfico' : 'Ver como tabla' }}
        </button>
      }
    </div>

    @if (rows().length === 0) {
      <p class="field-hint py-6 text-center">Sin datos todavía.</p>
    } @else if (showTable()) {
      <table class="w-full border-collapse text-[13px]">
        <thead>
          <tr class="text-left text-text-secondary"><th class="pb-2 font-medium">{{ labelHeader() }}</th><th class="pb-2 text-right font-medium">{{ valueHeader() }}</th></tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.label) {
            <tr class="border-t border-border-soft">
              <td class="py-1.5 text-text-primary">{{ row.label }}</td>
              <td class="mono-figure py-1.5 text-right font-medium text-text-primary">{{ format(row.value) }}</td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <div class="flex flex-col gap-2.5">
        @for (row of rows(); track row.label) {
          <div
            class="flex items-center gap-3 rounded-[var(--radius-sm)] px-1.5 py-1 outline-none transition-colors focus-visible:bg-bg-base"
            tabindex="0"
            [attr.aria-label]="row.label + ': ' + format(row.value)"
            (pointerenter)="hovered.set(row.label)"
            (pointerleave)="hovered.set(null)"
            (focus)="hovered.set(row.label)"
            (blur)="hovered.set(null)"
          >
            <span class="w-[38%] shrink-0 truncate text-[13px] text-text-secondary sm:w-[30%]" [title]="row.label">{{ row.label }}</span>
            <div class="relative h-[22px] flex-1 overflow-hidden rounded-full bg-bg-base">
              <div
                class="h-full rounded-full bg-brand-magenta transition-[width,filter] duration-500 ease-out"
                [style.width.%]="percentOf(row.value)"
                [class.brightness-110]="hovered() === row.label"
              ></div>
            </div>
            <span class="mono-figure w-[56px] shrink-0 text-right text-[13px] font-semibold text-text-primary">{{ format(row.value) }}</span>
          </div>
        }
      </div>
    }
  `,
})
export class BarChart {
  readonly title = input.required<string>();
  readonly rows = input.required<BarChartRow[]>();
  readonly formatter = input<(value: number) => string>((value) => String(value));
  readonly labelHeader = input('Categoría');
  readonly valueHeader = input('Valor');

  protected readonly showTable = signal(false);
  protected readonly hovered = signal<string | null>(null);

  private readonly maxValue = computed(() => Math.max(1, ...this.rows().map((row) => row.value)));

  protected percentOf(value: number): number {
    return (value / this.maxValue()) * 100;
  }

  protected format(value: number): string {
    return this.formatter()(value);
  }
}
