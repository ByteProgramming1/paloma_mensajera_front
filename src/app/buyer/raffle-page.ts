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
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Elige tu número de la rifa</h1>
    <p class="mb-6 max-w-[560px] text-[15px] text-text-secondary">Tu número queda asegurado sin límite de tiempo apenas lo eliges — solo se libera si tu pago llega a rechazarse.</p>

    @if (errorMessage()) { <p class="field-error mb-4" role="alert">{{ errorMessage() }}</p> }

    @if (isLoading()) {
      <p class="text-text-secondary">Cargando números disponibles…</p>
    } @else {
      <div class="flex flex-wrap gap-3">
        @for (number of numbers(); track number.id) {
          <app-raffle-chip [number]="number.number" [state]="stateOf(number)" (pick)="select(number)" />
        }
      </div>
    }

    @if (isSubmitting()) { <p class="mt-4 text-text-secondary">Confirmando tu número…</p> }
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
  protected readonly selectedId = signal<string | null>(null);

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
    if (number.id === this.selectedId()) return 'seleccionado';
    return number.status === 'AVAILABLE' ? 'disponible' : 'tomado';
  }

  protected async select(number: RaffleNumber): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId || this.isSubmitting()) return;
    this.errorMessage.set('');
    this.isSubmitting.set(true);
    this.selectedId.set(number.id);
    try {
      await firstValueFrom(this.ordersApi.selectRaffleNumber(orderId, number.id));
      this.router.navigateByUrl(`/pedidos/${orderId}`);
    } catch (error) {
      this.selectedId.set(null);
      this.errorMessage.set(error instanceof Error ? error.message : 'Ese número ya no está disponible, elige otro.');
      this.load();
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
