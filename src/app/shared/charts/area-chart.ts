import { Component, computed, input, signal } from '@angular/core';

export interface AreaChartPoint { label: string; value: number; }

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const MAX_X_LABELS = 8;

/**
 * Curva suave rellena ("de montañitas") para una sola serie ordenada (ej. pedidos por hora del
 * día) — pensada para leer picos de un vistazo, con tooltip al pasar el mouse sobre cualquier
 * punto. Para comparar dos series en el tiempo, usar StackedBarChart en su lugar.
 */
@Component({
  selector: 'app-area-chart',
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
          <tr class="text-left text-text-secondary"><th class="pb-2 font-medium">{{ labelHeader() }}</th><th class="pb-2 text-right font-medium">{{ valueHeader() }}</th></tr>
        </thead>
        <tbody>
          @for (point of points(); track point.label) {
            <tr class="border-t border-border-soft">
              <td class="py-1.5 text-text-primary">{{ point.label }}</td>
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

          <path [attr.d]="areaPath()" [attr.fill]="color()" fill-opacity="0.16" stroke="none" />
          <path [attr.d]="linePath()" fill="none" [attr.stroke]="color()" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

          @for (point of points(); track point.label; let i = $index) {
            <circle
              [attr.cx]="xOf(i)"
              [attr.cy]="yOf(point.value)"
              [attr.r]="hoverIndex() === i ? 5 : 3"
              [attr.fill]="color()"
              [attr.stroke]="hoverIndex() === i ? 'var(--bg-surface-elevated)' : 'none'"
              stroke-width="2"
            />
          }

          @if (hoverIndex(); as index) {
            <line [attr.x1]="xOf(index)" [attr.x2]="xOf(index)" [attr.y1]="PAD_TOP" [attr.y2]="baselineY()" stroke="var(--border-soft)" stroke-width="1" stroke-dasharray="3 3" />
          }

          @for (label of xLabels(); track label.x) {
            <text [attr.x]="label.x" [attr.y]="HEIGHT - 8" text-anchor="middle" font-size="10" fill="var(--text-secondary)">{{ label.text }}</text>
          }
        </svg>

        @if (hoverIndex(); as index) {
          <div
            class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[var(--radius-sm)] bg-text-primary px-2.5 py-1.5 text-[12px] whitespace-nowrap text-bg-surface-elevated shadow-lg"
            [style.left.%]="(xOf(index) / WIDTH) * 100"
            [style.top.%]="(yOf(points()[index].value) / HEIGHT) * 100 - 4"
          >
            <p>{{ points()[index].label }}</p>
            <p>{{ valueHeader() }}: <span class="font-semibold">{{ format(points()[index].value) }}</span></p>
          </div>
        }
      </div>
    }
  `,
})
export class AreaChart {
  readonly title = input.required<string>();
  readonly points = input.required<AreaChartPoint[]>();
  readonly formatter = input<(value: number) => string>((value) => String(value));
  readonly labelHeader = input('Categoría');
  readonly valueHeader = input('Valor');
  readonly color = input('var(--brand-magenta)');

  protected readonly WIDTH = WIDTH;
  protected readonly HEIGHT = HEIGHT;
  protected readonly PAD_LEFT = PAD_LEFT;
  protected readonly PAD_RIGHT = PAD_RIGHT;
  protected readonly PAD_TOP = PAD_TOP;

  protected readonly showTable = signal(false);
  protected readonly hoverIndex = signal<number | null>(null);

  private readonly rawMax = computed(() => Math.max(1, ...this.points().map((point) => point.value)));
  private readonly niceMax = computed(() => {
    const step = this.niceStep(this.rawMax() / 4);
    return Math.max(step, Math.ceil(this.rawMax() / step) * step);
  });

  protected readonly baselineY = computed(() => HEIGHT - PAD_BOTTOM);

  protected xOf(index: number): number {
    const count = this.points().length;
    const usable = WIDTH - PAD_LEFT - PAD_RIGHT;
    if (count <= 1) return PAD_LEFT + usable / 2;
    return PAD_LEFT + (index / (count - 1)) * usable;
  }

  protected yOf(value: number): number {
    const usable = HEIGHT - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + usable - (value / this.niceMax()) * usable;
  }

  // Curva suave: por cada tramo se dibuja una cuadrática hasta el punto medio entre el punto
  // actual y el siguiente, usando el punto actual como control — evita picos angulosos sin
  // necesitar una librería de splines externa.
  protected linePath(): string {
    const pts = this.points();
    if (pts.length === 0) return '';
    const coords = pts.map((point, i) => ({ x: this.xOf(i), y: this.yOf(point.value) }));
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y} L ${coords[0].x} ${coords[0].y}`;

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
    }
    const last = coords[coords.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }

  protected areaPath(): string {
    const pts = this.points();
    if (pts.length === 0) return '';
    const first = this.xOf(0);
    const last = this.xOf(pts.length - 1);
    return `${this.linePath()} L ${last} ${this.baselineY()} L ${first} ${this.baselineY()} Z`;
  }

  protected yTicks(): { value: number; y: number; label: string }[] {
    const top = this.niceMax();
    const step = this.niceStep(top / 4);
    const ticks: { value: number; y: number; label: string }[] = [];
    for (let value = 0; value <= top + step / 2; value += step) {
      ticks.push({ value, y: this.yOf(value), label: String(Math.round(value)) });
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
    if (points.length <= MAX_X_LABELS) return points.map((point, i) => ({ x: this.xOf(i), text: point.label }));
    const step = Math.ceil(points.length / MAX_X_LABELS);
    const indices = new Set<number>();
    for (let i = 0; i < points.length; i += step) indices.add(i);
    indices.add(points.length - 1);
    return [...indices].map((i) => ({ x: this.xOf(i), text: points[i].label }));
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
}
