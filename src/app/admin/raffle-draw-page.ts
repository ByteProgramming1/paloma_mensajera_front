import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Order, RaffleDrawHistoryEntry, RaffleDrawResult, RaffleNumber } from '../core/api.models';
import { RaffleService } from '../core/raffle.service';
import { OrdersService } from '../core/orders.service';
import { ConfirmAction } from '../shared/confirm-action';

@Component({
  selector: 'app-admin-raffle-draw-page',
  imports: [DatePipe, FormsModule, ConfirmAction],
  template: `
    <h1 class="page-title mb-1">Sorteo de la rifa</h1>
    <p class="page-lede mb-8">Solo los números con pago verificado entran al sorteo. Puedes repetir la ronda tantas veces como premios tengas — cada ronda excluye a los ganadores anteriores.</p>

    <section class="card-surface mb-8 flex flex-col gap-3 p-6">
      <h2 class="section-title">Cantidad de números de la rifa</h2>
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

    <section class="card-surface mb-8 flex flex-col gap-3 p-6">
      <h2 class="section-title">Mapa de números — trazabilidad</h2>
      <p class="field-hint mb-1">Todos los números configurados, para que puedas ver de un vistazo cuáles están libres y cuáles ya tiene un comprador.</p>
      <div class="mb-1 flex flex-wrap items-center gap-4 text-[12px] text-text-secondary">
        <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full border-[1.5px] border-brand-magenta"></span> Disponible ({{ availableCount() }})</span>
        <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-border-soft"></span> Asignado ({{ assignedCount() }})</span>
        <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand-magenta"></span> Ganador</span>
        <span class="ml-auto font-medium text-text-primary">{{ allNumbers().length }} número(s) en total</span>
      </div>
      @if (allNumbers().length === 0) {
        <p class="field-hint">Todavía no hay números configurados.</p>
      } @else {
        <div class="flex max-h-[360px] flex-wrap gap-2 overflow-y-auto pr-1">
          @for (n of allNumbers(); track n.id) {
            <div
              class="mono-figure flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-[13px] font-medium transition"
              [class]="n.drawnAsWinner ? 'bg-brand-magenta text-text-on-accent' : n.status === 'AVAILABLE' ? 'border-[1.5px] border-brand-magenta text-brand-magenta' : 'bg-border-soft text-text-secondary/70'"
              [title]="n.status === 'AVAILABLE' ? 'Disponible' : n.drawnAsWinner ? 'Ganador' : 'Asignado'"
            >{{ n.number }}</div>
          }
        </div>
      }
    </section>

    <div class="mb-8 flex flex-col items-center gap-6 overflow-hidden rounded-[var(--radius-md)] border border-border-soft bg-bg-surface-elevated p-10">
      <div
        class="mono-figure relative flex size-40 items-center justify-center rounded-full border-4 border-brand-magenta text-[48px] font-semibold text-brand-magenta shadow-[0_8px_28px_-8px_rgba(151,2,123,0.4)] transition-transform duration-700"
        [class.animate-spin]="isSpinning()"
      >{{ lastResult() ? lastResult()!.raffleNumber : '?' }}</div>

      <p class="field-hint">{{ eligibleCount() }} número(s) elegibles para esta ronda</p>
      <button type="button" class="btn-primary" [disabled]="isSpinning() || eligibleCount() === 0" (click)="draw()">
        {{ isSpinning() ? 'Girando…' : 'Girar la ruleta' }}
      </button>
      @if (errorMessage()) { <p class="field-error">{{ errorMessage() }}</p> }
    </div>

    @if (lastResult(); as result) {
      <section class="card-surface paloma-enter mb-8 p-6">
        <h2 class="section-title mb-3">Ganador — número <span class="mono-figure text-brand-magenta">{{ result.raffleNumber }}</span></h2>
        <p class="text-[14px] text-text-secondary">Remitente: {{ result.buyerFullName }}</p>
        <p class="text-[14px] text-text-secondary">Destinatario: {{ result.recipientFullName }}</p>
        <ul class="mt-2 flex flex-col gap-1 text-[14px] text-text-secondary">
          @for (item of result.items; track item.productName) { <li>{{ item.quantity }}× {{ item.productName }}</li> }
        </ul>
      </section>
    }

    <section class="card-surface mb-8 p-6">
      <h2 class="section-title">Números confirmados (pago verificado)</h2>
      <p class="field-hint mb-4">Se va llenando a medida que se verifican pagos — solo entran aquí compradores con pago verificado y pedido no cancelado.</p>
      @if (verifiedParticipants().length === 0) {
        <p class="field-hint">Todavía no hay ningún número confirmado.</p>
      } @else {
        <div class="mb-5 flex flex-wrap gap-3">
          @for (entry of verifiedParticipants(); track entry.order.id) {
            <div class="paloma-enter mono-figure flex size-14 items-center justify-center rounded-[var(--radius-sm)] bg-brand-magenta text-[16px] font-medium text-text-on-accent" [title]="entry.order.buyerFullName ?? 'Anónimo'">
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
      <h2 class="section-title mb-3">Historial de rondas</h2>
      @if (history().length === 0) {
        <p class="field-hint">Todavía no se ha hecho ningún sorteo.</p>
      } @else {
        <ul class="flex flex-col gap-2">
          @for (round of history(); track round.id) {
            <li class="flex items-center justify-between rounded-[var(--radius-sm)] border border-border-soft bg-bg-surface-elevated px-4 py-3 text-[14px] text-text-secondary transition hover:border-brand-magenta/30">
              <span class="mono-figure font-semibold text-brand-magenta">{{ round.raffleNumber.number }}</span>
              <span>{{ round.order.deliveryDetail.recipientFullName }}</span>
              <span>{{ round.drawnAt | date:'short' }}</span>
            </li>
          }
        </ul>
      }
    </section>

    <section class="card-surface mt-10 flex flex-col gap-3 border-status-error/30 p-6">
      <h2 class="section-title text-status-error">Zona de peligro</h2>
      <p class="field-hint">Borra permanentemente todos los números de la rifa configurados (disponibles y asignados) junto con su historial de sorteo. Úsalo solo para reiniciar la plataforma antes de un evento futuro — no se puede deshacer.</p>
      <div>
        <app-confirm-action
          label="Borrar todos los números de la rifa"
          variant="secondary"
          confirmPrompt="Esto borra TODOS los números y su historial de sorteo, sin deshacer. ¿Confirmas?"
          [disabled]="isDeletingAll() || allNumbers().length === 0"
          (confirm)="deleteAllNumbers()"
        />
      </div>
      @if (deleteAllMessage()) { <p class="field-hint">{{ deleteAllMessage() }}</p> }
      @if (deleteAllError()) { <p class="field-error">{{ deleteAllError() }}</p> }
    </section>
  `,
})
export class AdminRaffleDrawPage {
  private readonly raffleApi = inject(RaffleService);
  private readonly ordersApi = inject(OrdersService);

  protected readonly eligible = signal<RaffleNumber[]>([]);
  protected readonly orders = signal<Order[]>([]);
  protected readonly history = signal<RaffleDrawHistoryEntry[]>([]);
  protected readonly allNumbers = signal<RaffleNumber[]>([]);
  protected readonly isDeletingAll = signal(false);
  protected readonly deleteAllMessage = signal('');
  protected readonly deleteAllError = signal('');

  protected readonly availableCount = computed(() => this.allNumbers().filter((n) => n.status === 'AVAILABLE').length);
  protected readonly assignedCount = computed(() => this.allNumbers().filter((n) => n.status !== 'AVAILABLE').length);

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
      const [eligible, history, orders, allNumbers] = await Promise.all([
        firstValueFrom(this.raffleApi.eligibleForDraw()),
        firstValueFrom(this.raffleApi.history()),
        firstValueFrom(this.ordersApi.list()),
        firstValueFrom(this.raffleApi.map()),
      ]);
      this.eligible.set(eligible);
      this.history.set(history);
      this.orders.set(orders);
      this.allNumbers.set(allNumbers.slice().sort((a, b) => a.number - b.number));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar el sorteo.');
    }
  }

  protected async deleteAllNumbers(): Promise<void> {
    this.deleteAllError.set('');
    this.deleteAllMessage.set('');
    this.isDeletingAll.set(true);
    try {
      const result = await firstValueFrom(this.raffleApi.deleteAll());
      this.deleteAllMessage.set(`Se borraron ${result.deletedCount} número(s). Puedes configurar la rifa de nuevo cuando quieras.`);
      this.lastResult.set(null);
      this.refresh();
    } catch (error) {
      this.deleteAllError.set(error instanceof Error ? error.message : 'No fue posible borrar los números de la rifa.');
    } finally {
      this.isDeletingAll.set(false);
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
