import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class SystemService {
  private readonly api = inject(ApiClientService);
  health() { return this.api.get<{ status: string }>('/health'); }
}