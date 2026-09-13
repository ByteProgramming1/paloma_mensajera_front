import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SellerVerifyPaymentsPage } from './verify-payments-page';
import { OrdersService } from '../core/orders.service';
import { ToastService } from '../shared/toast.service';
import { Order } from '../core/api.models';

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: overrides.id ?? 'order-1',
    orderCode: 'PM-2026-0001',
    status: 'PAYMENT_PENDING',
    totalAmount: 10000,
    salesChannel: 'PRESENCIAL',
    createdAt: new Date().toISOString(),
    items: [],
    raffleNumber: 1,
    selfPickup: true,
    recipientFullName: 'Alguien',
    letterContent: '',
    isAnonymous: false,
    buyerFullName: 'Comprador',
    ...overrides,
  };
}

describe('SellerVerifyPaymentsPage', () => {
  let ordersServiceStub: { list: ReturnType<typeof vi.fn>; verifyPayment: ReturnType<typeof vi.fn> };
  let toastServiceStub: { success: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ordersServiceStub = { list: vi.fn(), verifyPayment: vi.fn() };
    toastServiceStub = { success: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: OrdersService, useValue: ordersServiceStub },
        { provide: ToastService, useValue: toastServiceStub },
      ],
    });
  });

  it('solo muestra pedidos PAYMENT_PENDING con salesChannel PRESENCIAL', async () => {
    ordersServiceStub.list.mockReturnValue(of([
      makeOrder({ id: 'presencial-pendiente', status: 'PAYMENT_PENDING', salesChannel: 'PRESENCIAL' }),
      makeOrder({ id: 'online-pendiente', status: 'PAYMENT_PENDING', salesChannel: 'ONLINE' }),
      makeOrder({ id: 'presencial-verificado', status: 'PAYMENT_VERIFIED', salesChannel: 'PRESENCIAL' }),
    ]));

    const fixture = TestBed.createComponent(SellerVerifyPaymentsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as { pendingOrders: () => Order[] };

    expect(component.pendingOrders().map((order) => order.id)).toEqual(['presencial-pendiente']);
  });

  it('al confirmar un pago llama a verifyPayment y muestra un toast de éxito', async () => {
    const order = makeOrder({ id: 'a-confirmar', status: 'PAYMENT_PENDING', salesChannel: 'PRESENCIAL' });
    ordersServiceStub.list.mockReturnValue(of([order]));
    ordersServiceStub.verifyPayment.mockReturnValue(of({ ...order, status: 'PAYMENT_VERIFIED' }));

    const fixture = TestBed.createComponent(SellerVerifyPaymentsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as { verifyPayment: (order: Order, verified: boolean) => Promise<void> };

    await component.verifyPayment(order, true);

    expect(ordersServiceStub.verifyPayment).toHaveBeenCalledWith('a-confirmar', true, undefined);
    expect(toastServiceStub.success).toHaveBeenCalledWith('Pago confirmado.');
  });

  it('si el backend rechaza la verificación, muestra el error en vez de fallar silenciosamente', async () => {
    const order = makeOrder({ id: 'rechazado-por-backend', status: 'PAYMENT_PENDING', salesChannel: 'PRESENCIAL' });
    ordersServiceStub.list.mockReturnValue(of([order]));
    ordersServiceStub.verifyPayment.mockReturnValue(throwError(() => new Error('Solo un vendedor puede confirmar este pago.')));

    const fixture = TestBed.createComponent(SellerVerifyPaymentsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as { verifyPayment: (order: Order, verified: boolean) => Promise<void>; errorMessage: () => string };

    await component.verifyPayment(order, true);

    expect(component.errorMessage()).toBe('Solo un vendedor puede confirmar este pago.');
    expect(toastServiceStub.success).not.toHaveBeenCalled();
  });
});
