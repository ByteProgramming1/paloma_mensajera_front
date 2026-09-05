import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { CreateOrderRequest, OrderQuery } from './api.models';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(ApiClientService);
  createPublic(payload: CreateOrderRequest) { return this.api.post('/orders/public', payload); }
  myDeliveries() { return this.api.get('/orders/my-deliveries'); }
  list(query?: OrderQuery) { return this.api.get('/orders', query); }
  verifyMessage(id: string, approved: boolean, rejectionReason?: string) { return this.api.patch(`/orders/${id}/verify-message`, { approved, rejectionReason }); }
  selectRaffleNumber(id: string, number: number) { return this.api.post(`/orders/${id}/select-raffle-number`, { number }); }
  verifyPayment(id: string, verified: boolean, verificationNotes?: string) { return this.api.patch(`/orders/${id}/verify-payment`, { verified, verificationNotes }); }
  assignDelivery(id: string, deliveryPersonId: string) { return this.api.patch(`/orders/${id}/assign-delivery`, { deliveryPersonId }); }
  updateDeliveryStatus(id: string, status: string, details?: { receivedBy?: string; teamsConfirmationLog?: string; notes?: string }) { return this.api.patch(`/orders/${id}/delivery-status`, { status, ...details }); }
  notifyTeams(id: string) { return this.api.post(`/orders/${id}/notify-teams`); }
}