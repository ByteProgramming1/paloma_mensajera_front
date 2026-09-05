import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { RaffleDrawRequest } from './api.models';

@Injectable({ providedIn: 'root' })
export class RaffleService {
  private readonly api = inject(ApiClientService);
  map() { return this.api.get('/raffle-numbers'); }
  eligibleForDraw() { return this.api.get('/raffle-numbers/eligible-for-draw'); }
  draw(payload: RaffleDrawRequest = {}) { return this.api.post('/raffle-numbers/draw', payload); }
  history() { return this.api.get('/raffle-numbers/draw-history'); }
}