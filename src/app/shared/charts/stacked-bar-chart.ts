import { Component, computed, input, signal } from '@angular/core';

export interface StackedBarPoint { date: Date; a: number; b: number; }

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const BAR_GAP_RATIO = 0.35;

/** Barras apiladas por fecha (dos series, ej. canal online vs presencial) — la altura total de cada barra es la suma de ambas. */
@Component({
  selector: 'app-stacked-bar-chart',
  template: `
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p class="section-title">{{ title() }}</p>
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1.5 text-[12px] text-text-secondary"><span class="size-2.5 rounded-full" [style.background]="colorA()"></span>{{ labelA() }}</span>
        <span class="flex items-center gap-1.5 text-[12px] text-text-secondary"><span class="size-2.5 rounded-full" [style.background]="colorB()"></span>{{ labelB() }}</span>
        @if (points().length > 0) {
          <button type="button" class="shrink-0 text-[12px] font-medium text-brand-magenta underline underline-offset-2" (click)="showTable.set(!showTable())">
            {{ showTable() ? 'Ver gráfico' : 'Ver como tabla' }}
          </button>
        }
      </div>
    </div>

    @if (points().length === 0) {
      <p class="field-hint py-6 text-center">Sin datos todavía.</p>
    } @else if (showTable()) {
      <table class="w-full border-collapse text-[13px]">
        <thead>
          <tr class="text-left text-text-secondary">
            <th class="pb-2 font-medium">Fecha</th>
            <th class="pb-2 text-right font-medium">{{ labelA() }}</th>
            <th class="pb-2 text-right font-medium">{{ labelB() }}</th>
            <th class="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          @for (point of points(); track point.date.getTime()) {
            <tr class="border-t border-border-soft">
              <td class="py-1.5 text-text-primary">{{ formatDate(point.date) }}</td>
              <td class="mono-figure py-1.5 text-right text-text-primary">{{ format(point.a) }}</td>
              <td class="mono-figure py-1.5 text-right text-text-primary">{{ format(point.b) }}</td>
              <td class="mono-figure py-1.5 text-right font-semibold text-text-primary">{{ format(point.a + point.b) }}</td>
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

          @for (point of points(); track point.date.getTime(); let i = $index) {
            <rect
              [attr.x]="xOf(i) - barWidth() / 2"
              [attr.y]="yOf(point.a + point.b)"
              [attr.width]="barWidth()"
              [attr.height]="baselineY() - yOf(point.a + point.b)"
              [attr.fill]="colorB()"
              [attr.opacity]="hoverIndex() === null || hoverIndex() === i ? 1 : 0.35"
              rx="2"
            />
            <rect
              [attr.x]="xOf(i) - barWidth() / 2"
              [attr.y]="yOf(point.a)"
              [attr.width]="barWidth()"
              [attr.height]="baselineY() - yOf(point.a)"
              [attr.fill]="colorA()"
              [attr.opacity]="hoverIndex() === null || hoverIndex() === i ? 1 : 0.35"
              rx="2"
            />
          }

          @for (label of xLabels(); track label.x) {
            <text [attr.x]="label.x" [attr.y]="HEIGHT - 8" text-anchor="middle" font-size="10" fill="var(--text-secondary)">{{ label.text }}</text>
          }
        </svg>

        @if (hoverIndex(); as index) {
          <div
            class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[var(--radius-sm)] bg-text-primary px-2.5 py-1.5 text-[12px] whitespace-nowrap text-bg-surface-elevated shadow-lg"
            [style.left.%]="(xOf(index) / WIDTH) * 100"
            [style.top.%]="(yOf(points()[index].a + points()[index].b) / HEIGHT) * 100 - 4"
          >
            <p>{{ formatDate(points()[index].date) }}</p>
            <p>{{ labelA() }}: <span class="font-semibold">{{ format(points()[index].a) }}</span></p>
            <p>{{ labelB() }}: <span class="font-semibold">{{ format(points()[index].b) }}</span></p>
            <p>Total: <span class="font-semibold">{{ format(points()[index].a + points()[index].b) }}</span></p>
          </div>
        }
      </div>
    }
  `,
})
export class StackedBarChart {
  readonly title = input.required<string>();
  readonly points = input.required<StackedBarPoint[]>();
  readonly formatter = input<(value: number) => string>((value) => String(value));
  readonly labelA = input('Serie A');
  readonly labelB = input('Serie B');
  readonly colorA = input('var(--brand-magenta)');
  readonly colorB = input('var(--status-pendiente)');

  protected readonly WIDTH = WIDTH;
  protected readonly HEIGHT = HEIGHT;
  protected readonly PAD_LEFT = PAD_LEFT;
  protected readonly PAD_RIGHT = PAD_RIGHT;

  protected readonly showTable = signal(false);
  protected readonly hoverIndex = signal<number | null>(null);

  private readonly rawMax = computed(() => Math.max(1, ...this.points().map((point) => point.a + point.b)));
  private readonly niceMax = computed(() => {
    const step = this.niceStep(this.rawMax() / 4);
    return Math.max(step, Math.ceil(this.rawMax() / step) * step);
  });

  protected readonly baselineY = computed(() => HEIGHT - PAD_BOTTOM);
  protected readonly barWidth = computed(() => {
    const count = this.points().length;
    if (count === 0) return 0;
    const slot = (WIDTH - PAD_LEFT - PAD_RIGHT) / count;
    return Math.max(2, slot * (1 - BAR_GAP_RATIO));
  });

  // Centro de cada barra, dejando medio ancho de barra como margen a cada lado del área
  // graficable — si no, la barra de los extremos queda centrada justo en PAD_LEFT/WIDTH-PAD_RIGHT
  // y su mitad izquierda/derecha se monta encima de las etiquetas del eje Y o se sale del SVG.
  protected xOf(index: number): number {
    const count = this.points().length;
    const usable = WIDTH - PAD_LEFT - PAD_RIGHT;
    if (count <= 1) return PAD_LEFT + usable / 2;
    const half = this.barWidth() / 2;
    return PAD_LEFT + half + (index / (count - 1)) * (usable - this.barWidth());
  }

  protected yOf(value: number): number {
    const usable = HEIGHT - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + usable - (value / this.niceMax()) * usable;
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

  // Los puntos se agrupan por día en UTC (ver metrics-page.ts), así que hay que formatear
  // también en UTC — si no, en cualquier zona horaria detrás de UTC (ej. Colombia, UTC-5) la
  // medianoche UTC de un día cae en las 7pm del día anterior en hora local, y la etiqueta
  // mostrada queda corrida un día hacia atrás respecto a los datos reales.
  protected formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }
}
