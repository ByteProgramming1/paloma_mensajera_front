import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { RaffleConfigureResult, RaffleDeleteAllResult, RaffleDrawHistoryEntry, RaffleDrawRequest, RaffleDrawResult, RaffleNumber } from './api.models';

@Injectable({ providedIn: 'root' })
export class RaffleService {
  private readonly api = inject(ApiClientService);
  map() { return this.api.get<RaffleNumber[]>('/raffle-numbers'); }
  eligibleForDraw() { return this.api.get<RaffleNumber[]>('/raffle-numbers/eligible-for-draw'); }
  draw(payload: RaffleDrawRequest = {}) { return this.api.post<RaffleDrawResult>('/raffle-numbers/draw', payload); }
  history() { return this.api.get<RaffleDrawHistoryEntry[]>('/raffle-numbers/draw-history'); }
  configure(count: number) { return this.api.post<RaffleConfigureResult>('/raffle-numbers/configure', { count }); }
  deleteAll() { return this.api.delete<RaffleDeleteAllResult>('/raffle-numbers'); }
}
