import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RaffleDrawResult, RaffleNumber } from '../core/api.models';
import { RaffleService } from '../core/raffle.service';

@Component({
  selector: 'app-admin-raffle-draw-page',
  imports: [DatePipe],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Sorteo de la rifa</h1>
    <p class="mb-8 max-w-[620px] text-[15px] text-text-secondary">Solo los números con pago verificado entran al sorteo. Puedes repetir la ronda tantas veces como premios tengas — cada ronda excluye a los ganadores anteriores.</p>

    <div class="mb-8 flex flex-col items-center gap-6 rounded-[var(--radius-md)] border border-border-soft bg-bg-surface-elevated p-10">
      <div
        class="mono-figure flex size-40 items-center justify-center rounded-full border-4 border-brand-magenta text-[48px] text-brand-magenta transition-transform duration-700"
        [class.animate-spin]="isSpinning()"
      >{{ lastResult() ? lastResult()!.raffleNumber.number : '?' }}</div>

      <p class="field-hint">{{ eligibleCount() }} número(s) elegibles para esta ronda</p>
      <button type="button" class="btn-primary" [disabled]="isSpinning() || eligibleCount() === 0" (click)="draw()">
        {{ isSpinning() ? 'Girando…' : 'Girar la ruleta' }}
      </button>
      @if (errorMessage()) { <p class="field-error">{{ errorMessage() }}</p> }
    </div>

    @if (lastResult(); as result) {
      <section class="card-surface mb-8 p-6">
        <h2 class="mb-3 text-[16px] font-semibold text-text-primary">Ganador — número {{ result.raffleNumber.number }}</h2>
        <p class="text-[14px] text-text-secondary">Remitente: {{ result.order.deliveryDetail.buyerFullName }}</p>
        <p class="text-[14px] text-text-secondary">Destinatario: {{ result.order.deliveryDetail.recipientFullName }}</p>
        <p class="text-[14px] text-text-secondary">Pedido: {{ result.order.orderCode }}</p>
      </section>
    }

    <section>
      <h2 class="mb-3 text-[16px] font-semibold text-text-primary">Historial de rondas</h2>
      @if (history().length === 0) {
        <p class="field-hint">Todavía no se ha hecho ningún sorteo.</p>
      } @else {
        <ul class="flex flex-col gap-2">
          @for (round of history(); track round.id) {
            <li class="flex items-center justify-between rounded-[var(--radius-sm)] border border-border-soft bg-bg-surface-elevated px-4 py-3 text-[14px] text-text-secondary">
              <span class="mono-figure text-brand-magenta">{{ round.raffleNumber.number }}</span>
              <span>{{ round.order.deliveryDetail.recipientFullName }}</span>
              <span>{{ round.drawnAt | date:'short' }}</span>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class AdminRaffleDrawPage {
  private readonly raffleApi = inject(RaffleService);

  protected readonly eligible = signal<RaffleNumber[]>([]);
  protected readonly history = signal<RaffleDrawResult[]>([]);
  protected readonly lastResult = signal<RaffleDrawResult | null>(null);
  protected readonly isSpinning = signal(false);
  protected readonly errorMessage = signal('');

  protected eligibleCount(): number {
    return this.eligible().length;
  }

  constructor() {
    this.refresh();
  }

  private async refresh(): Promise<void> {
    try {
      const [eligible, history] = await Promise.all([
        firstValueFrom(this.raffleApi.eligibleForDraw()),
        firstValueFrom(this.raffleApi.history()),
      ]);
      this.eligible.set(eligible);
      this.history.set(history);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar el sorteo.');
    }
  }

  protected async draw(): Promise<void> {
    this.errorMessage.set('');
    this.isSpinning.set(true);
    try {
      const result = await firstValueFrom(this.raffleApi.draw());
      await new Promise((resolve) => setTimeout(resolve, 900));
      this.lastResult.set(result);
      this.refresh();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible girar la ruleta.');
    } finally {
      this.isSpinning.set(false);
    }
  }
}
