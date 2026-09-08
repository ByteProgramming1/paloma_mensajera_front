import { Component, computed, input, signal } from '@angular/core';

export interface LineChartPoint { date: Date; value: number; }

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

@Component({
  selector: 'app-line-chart',
  template: `
    <div class="mb-3 flex items-center justify-between gap-3">
      <p class="section-title">{{ title() }}</p>
      @if (points().length > 0) {
        <button type="button" class="shrink-0 text-[12px] font-medium text-brand-magenta underline underline-offset-2" (click)="showTable.set(!showTable())">
          {{ showTable() ? 'Ver gráfico' : 'Ver como tabla' }}
        </button>
      }
    </div>

    @if (points().length === 0) {
      <p class="field-hint py-6 text-center">Sin datos todavía.</p>
    } @else if (showTable()) {
      <table class="w-full border-collapse text-[13px]">
        <thead>
          <tr class="text-left text-text-secondary"><th class="pb-2 font-medium">Fecha</th><th class="pb-2 text-right font-medium">Monto</th></tr>
        </thead>
        <tbody>
          @for (point of points(); track point.date.getTime()) {
            <tr class="border-t border-border-soft">
              <td class="py-1.5 text-text-primary">{{ formatDate(point.date) }}</td>
              <td class="mono-figure py-1.5 text-right font-medium text-text-primary">{{ format(point.value) }}</td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <div class="relative">
        <svg
          [attr.viewBox]="'0 0 ' + WIDTH + ' ' + HEIGHT"
          class="w-full touch-none select-none"
          role="img"
          [attr.aria-label]="title()"
          (pointermove)="onPointerMove($event)"
          (pointerleave)="hoverIndex.set(null)"
        >
          @for (tick of yTicks(); track tick.value) {
            <line [attr.x1]="PAD_LEFT" [attr.x2]="WIDTH - PAD_RIGHT" [attr.y1]="tick.y" [attr.y2]="tick.y" stroke="var(--border-soft)" stroke-width="1" />
            <text [attr.x]="PAD_LEFT - 8" [attr.y]="tick.y + 3" text-anchor="end" font-size="10" fill="var(--text-secondary)">{{ tick.label }}</text>
          }

          <path [attr.d]="areaPath()" fill="var(--brand-magenta)" opacity="0.1" />
          <path [attr.d]="linePath()" fill="none" stroke="var(--brand-magenta)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

          @for (label of xLabels(); track label.x) {
            <text [attr.x]="label.x" [attr.y]="HEIGHT - 8" text-anchor="middle" font-size="10" fill="var(--text-secondary)">{{ label.text }}</text>
          }

          @if (hoverIndex(); as index) {
            <line [attr.x1]="xOf(index)" [attr.x2]="xOf(index)" [attr.y1]="PAD_TOP" [attr.y2]="HEIGHT - PAD_BOTTOM" stroke="var(--text-secondary)" stroke-width="1" stroke-dasharray="2 3" />
            <circle [attr.cx]="xOf(index)" [attr.cy]="yOf(points()[index].value)" r="4.5" fill="var(--brand-magenta)" stroke="var(--bg-surface-elevated)" stroke-width="2" />
          } @else {
            <circle [attr.cx]="xOf(points().length - 1)" [attr.cy]="yOf(points()[points().length - 1].value)" r="4.5" fill="var(--brand-magenta)" stroke="var(--bg-surface-elevated)" stroke-width="2" />
          }
        </svg>

        @if (hoverIndex(); as index) {
          <div
            class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[var(--radius-sm)] bg-text-primary px-2.5 py-1.5 text-[12px] whitespace-nowrap text-bg-surface-elevated shadow-lg"
            [style.left.%]="(xOf(index) / WIDTH) * 100"
            [style.top.%]="(yOf(points()[index].value) / HEIGHT) * 100 - 4"
          >
            <span class="font-semibold">{{ format(points()[index].value) }}</span>
            <span class="text-bg-surface-elevated/70"> · {{ formatDate(points()[index].date) }}</span>
          </div>
        }
      </div>
    }
  `,
})
export class LineChart {
  readonly title = input.required<string>();
  readonly points = input.required<LineChartPoint[]>();
  readonly formatter = input<(value: number) => string>((value) => String(value));

  protected readonly WIDTH = WIDTH;
  protected readonly HEIGHT = HEIGHT;
  protected readonly PAD_LEFT = PAD_LEFT;
  protected readonly PAD_RIGHT = PAD_RIGHT;
  protected readonly PAD_TOP = PAD_TOP;
  protected readonly PAD_BOTTOM = PAD_BOTTOM;

  protected readonly showTable = signal(false);
  protected readonly hoverIndex = signal<number | null>(null);

  private readonly rawMax = computed(() => Math.max(1, ...this.points().map((point) => point.value)));
  private readonly niceMax = computed(() => {
    const step = this.niceStep(this.rawMax() / 4);
    return Math.max(step, Math.ceil(this.rawMax() / step) * step);
  });

  protected xOf(index: number): number {
    const count = this.points().length;
    if (count <= 1) return (WIDTH + PAD_LEFT - PAD_RIGHT) / 2;
    return PAD_LEFT + (index / (count - 1)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
  }

  protected yOf(value: number): number {
    const usable = HEIGHT - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + usable - (value / this.niceMax()) * usable;
  }

  protected linePath(): string {
    return this.points().map((point, index) => `${index === 0 ? 'M' : 'L'}${this.xOf(index)},${this.yOf(point.value)}`).join(' ');
  }

  protected areaPath(): string {
    const points = this.points();
    if (points.length === 0) return '';
    const baseline = HEIGHT - PAD_BOTTOM;
    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${this.xOf(index)},${this.yOf(point.value)}`).join(' ');
    return `${line} L${this.xOf(points.length - 1)},${baseline} L${this.xOf(0)},${baseline} Z`;
  }

  protected yTicks(): { value: number; y: number; label: string }[] {
    const top = this.niceMax();
    const step = this.niceStep(top / 4);
    const ticks: { value: number; y: number; label: string }[] = [];
    for (let value = 0; value <= top + step / 2; value += step) {
      ticks.push({ value, y: this.yOf(value), label: this.compactFormat(value) });
    }
    return ticks;
  }

  private niceStep(roughStep: number): number {
    if (roughStep <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const fraction = roughStep / magnitude;
    const niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
    return niceFraction * magnitude;
  }

  protected xLabels(): { x: number; text: string }[] {
    const points = this.points();
    if (points.length === 0) return [];
    const indices = points.length <= 5
      ? points.map((_, i) => i)
      : [0, Math.round((points.length - 1) / 2), points.length - 1];
    return [...new Set(indices)].map((i) => ({ x: this.xOf(i), text: this.formatDate(points[i].date) }));
  }

  protected onPointerMove(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const count = this.points().length;
    if (count <= 1) { this.hoverIndex.set(0); return; }
    const ratio = (relativeX - PAD_LEFT) / (WIDTH - PAD_LEFT - PAD_RIGHT);
    const index = Math.round(ratio * (count - 1));
    this.hoverIndex.set(Math.min(count - 1, Math.max(0, index)));
  }

  protected format(value: number): string {
    return this.formatter()(value);
  }

  private compactFormat(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
    return String(Math.round(value));
  }

  protected formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }
}
