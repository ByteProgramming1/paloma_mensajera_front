import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { CreateOrderRequest, DeliveryStatus, Order, OrderMessageQueueItem, OrderQuery } from './api.models';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(ApiClientService);

  createPublic(payload: CreateOrderRequest) { return this.api.post<Order>('/orders/public', payload); }
  getById(id: string) { return this.api.get<Order>(`/orders/${id}`); }
  myDeliveries(includeDelivered = false) {
    return this.api.get<Order[]>('/orders/my-deliveries', includeDelivered ? { includeDelivered: 'true' } : undefined);
  }
  list(query?: OrderQuery) { return this.api.get<Order[]>('/orders', query); }
  messageQueue(search?: string) { return this.api.get<OrderMessageQueueItem[]>('/orders', { view: 'message', search }); }

  verifyMessage(id: string, approved: boolean, rejectionReason?: string) {
    return this.api.patch<Order>(`/orders/${id}/verify-message`, { approved, rejectionReason });
  }

  selectRaffleNumber(id: string, raffleNumberId: string) {
    return this.api.post<Order>(`/orders/${id}/select-raffle-number`, { raffleNumberId });
  }

  verifyPayment(id: string, verified: boolean, verificationNotes?: string) {
    return this.api.patch<Order>(`/orders/${id}/verify-payment`, { verified, verificationNotes });
  }

  updateDeliveryStatus(id: string, status: DeliveryStatus, details?: { receivedBy?: string; teamsConfirmationLog?: string; notes?: string }) {
    return this.api.patch<Order>(`/orders/${id}/delivery-status`, { status, ...details });
  }

  notifyTeams(id: string) { return this.api.post<{ sent: boolean }>(`/orders/${id}/notify-teams`); }
}
