import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RaffleNumber } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { RaffleService } from '../core/raffle.service';
import { RaffleChip, RaffleChipState } from '../shared/raffle-chip';

@Component({
  selector: 'app-raffle-page',
  imports: [RaffleChip],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold tracking-tight text-text-primary">Elige tu número de la rifa</h1>
    <p class="page-lede mb-4">Tu número queda asegurado sin límite de tiempo apenas lo eliges — solo se libera si tu pago llega a rechazarse.</p>

    <div class="mb-6 flex flex-wrap items-center gap-4 text-[12px] text-text-secondary">
      <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full border-[1.5px] border-brand-magenta"></span> Disponible</span>
      <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-border-soft"></span> Tomado</span>
      <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-brand-magenta"></span> Tu elección</span>
    </div>

    @if (errorMessage()) { <p class="field-error mb-4" role="alert">{{ errorMessage() }}</p> }

    @if (isLoading()) {
      <p class="text-text-secondary">Cargando números disponibles…</p>
    } @else {
      <div class="flex flex-wrap gap-3 pb-24">
        @for (number of numbers(); track number.id) {
          <app-raffle-chip [number]="number.number" [state]="stateOf(number)" (pick)="pick(number)" />
        }
      </div>
    }

    @if (pendingNumber(); as pending) {
      <div class="paloma-enter sticky bottom-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-brand-magenta bg-bg-surface-elevated p-4 shadow-[0_4px_12px_rgba(41,20,33,0.08),0_20px_44px_-16px_rgba(41,20,33,0.28)]">
        <p class="text-[15px] text-text-primary">¿Confirmas el número <span class="mono-figure font-semibold text-brand-magenta">{{ pending.number }}</span>? No podrás cambiarlo después.</p>
        <button type="button" class="btn-primary" [disabled]="isSubmitting()" (click)="confirmSelection(pending)">
          {{ isSubmitting() ? 'Confirmando…' : 'Sí, confirmar' }}
        </button>
        <button type="button" class="btn-ghost" [disabled]="isSubmitting()" (click)="cancelSelection()">Elegir otro</button>
      </div>
    }
  `,
})
export class RafflePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly raffleApi = inject(RaffleService);
  private readonly ordersApi = inject(OrdersService);

  protected readonly numbers = signal<RaffleNumber[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly pendingNumber = signal<RaffleNumber | null>(null);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.numbers.set(await firstValueFrom(this.raffleApi.map()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar el mapa de la rifa.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected stateOf(number: RaffleNumber): RaffleChipState {
    if (number.id === this.pendingNumber()?.id) return 'seleccionado';
    return number.status === 'AVAILABLE' ? 'disponible' : 'tomado';
  }

  protected pick(number: RaffleNumber): void {
    if (this.isSubmitting()) return;
    this.errorMessage.set('');
    this.pendingNumber.set(number);
  }

  protected cancelSelection(): void {
    this.pendingNumber.set(null);
  }

  protected async confirmSelection(number: RaffleNumber): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId || this.isSubmitting()) return;
    this.errorMessage.set('');
    this.isSubmitting.set(true);
    try {
      await firstValueFrom(this.ordersApi.selectRaffleNumber(orderId, number.id));
      this.router.navigateByUrl(`/pedidos/${orderId}`);
    } catch (error) {
      this.pendingNumber.set(null);
      this.errorMessage.set(error instanceof Error ? error.message : 'Ese número ya no está disponible, elige otro.');
      this.load();
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
