import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Order, RaffleDrawHistoryEntry, RaffleDrawResult, RaffleNumber } from '../core/api.models';
import { RaffleService } from '../core/raffle.service';
import { OrdersService } from '../core/orders.service';

@Component({
  selector: 'app-admin-raffle-draw-page',
  imports: [DatePipe, FormsModule],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Sorteo de la rifa</h1>
    <p class="mb-8 max-w-[620px] text-[15px] text-text-secondary">Solo los números con pago verificado entran al sorteo. Puedes repetir la ronda tantas veces como premios tengas — cada ronda excluye a los ganadores anteriores.</p>

    <section class="card-surface mb-8 flex flex-col gap-3 p-6">
      <h2 class="text-[16px] font-semibold text-text-primary">Cantidad de números de la rifa</h2>
      <p class="field-hint">Antes de abrir las ventas, define hasta qué número va a llegar la rifa (ej. 100). Puedes subirlo más adelante — solo agrega los números que falten, nunca borra los que ya existen.</p>
      <div class="flex flex-wrap items-end gap-3">
        <label class="field">
          <span class="field-label">Total de números</span>
          <input class="field-input max-w-[160px]" type="number" min="1" [(ngModel)]="targetCount" name="targetCount" />
        </label>
        <button type="button" class="btn-primary" [disabled]="isConfiguring()" (click)="configure()">
          {{ isConfiguring() ? 'Configurando…' : 'Configurar' }}
        </button>
      </div>
      @if (configureMessage()) { <p class="field-hint">{{ configureMessage() }}</p> }
      @if (configureError()) { <p class="field-error">{{ configureError() }}</p> }
    </section>

    <div class="mb-8 flex flex-col items-center gap-6 rounded-[var(--radius-md)] border border-border-soft bg-bg-surface-elevated p-10">
      <div
        class="mono-figure flex size-40 items-center justify-center rounded-full border-4 border-brand-magenta text-[48px] text-brand-magenta transition-transform duration-700"
        [class.animate-spin]="isSpinning()"
      >{{ lastResult() ? lastResult()!.raffleNumber : '?' }}</div>

      <p class="field-hint">{{ eligibleCount() }} número(s) elegibles para esta ronda</p>
      <button type="button" class="btn-primary" [disabled]="isSpinning() || eligibleCount() === 0" (click)="draw()">
        {{ isSpinning() ? 'Girando…' : 'Girar la ruleta' }}
      </button>
      @if (errorMessage()) { <p class="field-error">{{ errorMessage() }}</p> }
    </div>

    @if (lastResult(); as result) {
      <section class="card-surface mb-8 p-6">
        <h2 class="mb-3 text-[16px] font-semibold text-text-primary">Ganador — número {{ result.raffleNumber }}</h2>
        <p class="text-[14px] text-text-secondary">Remitente: {{ result.buyerFullName }}</p>
        <p class="text-[14px] text-text-secondary">Destinatario: {{ result.recipientFullName }}</p>
        <ul class="mt-2 flex flex-col gap-1 text-[14px] text-text-secondary">
          @for (item of result.items; track item.productName) { <li>{{ item.quantity }}× {{ item.productName }}</li> }
        </ul>
      </section>
    }

    <section class="card-surface mb-8 p-6">
      <h2 class="text-[16px] font-semibold text-text-primary">Números confirmados (pago verificado)</h2>
      <p class="field-hint mb-4">Se va llenando a medida que se verifican pagos — solo entran aquí compradores con pago verificado y pedido no cancelado.</p>
      @if (verifiedParticipants().length === 0) {
        <p class="field-hint">Todavía no hay ningún número confirmado.</p>
      } @else {
        <div class="mb-5 flex flex-wrap gap-3">
          @for (entry of verifiedParticipants(); track entry.order.id) {
            <div class="mono-figure flex size-14 items-center justify-center rounded-[var(--radius-sm)] bg-brand-magenta text-[16px] text-text-on-accent" [title]="entry.order.buyerFullName ?? 'Anónimo'">
              {{ entry.order.raffleNumber }}
            </div>
          }
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr class="bg-bg-base text-left text-text-secondary">
                <th class="p-2">N° rifa</th>
                <th class="p-2">Comprador</th>
                <th class="p-2">Destinatario</th>
                <th class="p-2">Anónimo</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of verifiedParticipants(); track entry.order.id) {
                <tr class="border-t border-border-soft text-text-primary">
                  <td class="mono-figure p-2">{{ entry.order.raffleNumber }}</td>
                  <td class="p-2">{{ entry.order.buyerFullName ?? '—' }}</td>
                  <td class="p-2">{{ entry.order.recipientFullName }}</td>
                  <td class="p-2">{{ entry.order.isAnonymous ? 'Sí' : 'No' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

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
  private readonly ordersApi = inject(OrdersService);

  protected readonly eligible = signal<RaffleNumber[]>([]);
  protected readonly orders = signal<Order[]>([]);
  protected readonly history = signal<RaffleDrawHistoryEntry[]>([]);

  protected readonly verifiedParticipants = computed(() =>
    this.orders()
      .filter((order) => order.payment?.verified === true && order.status !== 'CANCELLED' && order.raffleNumber !== null)
      .map((order) => ({ order }))
      .sort((a, b) => (a.order.raffleNumber ?? 0) - (b.order.raffleNumber ?? 0)),
  );
  protected readonly lastResult = signal<RaffleDrawResult | null>(null);
  protected readonly isSpinning = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isConfiguring = signal(false);
  protected readonly configureMessage = signal('');
  protected readonly configureError = signal('');
  protected targetCount = 100;

  protected eligibleCount(): number {
    return this.eligible().length;
  }

  protected async configure(): Promise<void> {
    this.configureError.set('');
    this.configureMessage.set('');
    this.isConfiguring.set(true);
    try {
      const result = await firstValueFrom(this.raffleApi.configure(this.targetCount));
      this.configureMessage.set(
        result.numbersCreated > 0
          ? `Listo: ahora hay ${result.totalNumbers} números en total (se agregaron ${result.numbersCreated} nuevos).`
          : `Ya había ${result.totalNumbers} números configurados; no se agregó ninguno.`,
      );
      this.refresh();
    } catch (error) {
      this.configureError.set(error instanceof Error ? error.message : 'No fue posible configurar la cantidad de números.');
    } finally {
      this.isConfiguring.set(false);
    }
  }

  constructor() {
    this.refresh();
  }

  private async refresh(): Promise<void> {
    try {
      const [eligible, history, orders] = await Promise.all([
        firstValueFrom(this.raffleApi.eligibleForDraw()),
        firstValueFrom(this.raffleApi.history()),
        firstValueFrom(this.ordersApi.list()),
      ]);
      this.eligible.set(eligible);
      this.history.set(history);
      this.orders.set(orders);
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
