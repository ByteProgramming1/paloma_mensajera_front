import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SellerVerifyPaymentsPage } from './verify-payments-page';
import { OrdersService } from '../core/orders.service';
import { ToastService } from '../shared/toast.service';
import { Order } from '../core/api.models';
import { OrderGroup } from '../shared/order-grouping';

function makeGroup(order: Order): OrderGroup {
  return { groupId: order.groupId ?? null, orders: [order], totalAmount: order.totalAmount };
}

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
  let ordersServiceStub: { list: ReturnType<typeof vi.fn>; verifyPayment: ReturnType<typeof vi.fn>; verifyPaymentGroup: ReturnType<typeof vi.fn> };
  let toastServiceStub: { success: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ordersServiceStub = { list: vi.fn(), verifyPayment: vi.fn(), verifyPaymentGroup: vi.fn() };
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
    const component = fixture.componentInstance as unknown as { pendingGroups: () => OrderGroup[] };

    const groups = component.pendingGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].orders.map((order) => order.id)).toEqual(['presencial-pendiente']);
  });

  it('un pago combinado con un destinatario que aún no llega a PAYMENT_PENDING sigue mostrándose (no desaparece), pero no está listo para confirmar', async () => {
    const ready = makeOrder({ id: 'grupo-listo', groupId: 'grupo-2', status: 'PAYMENT_PENDING', salesChannel: 'PRESENCIAL' });
    const stuck = makeOrder({ id: 'grupo-atascado', groupId: 'grupo-2', status: 'MESSAGE_APPROVED', salesChannel: 'PRESENCIAL' });
    ordersServiceStub.list.mockReturnValue(of([ready, stuck]));

    const fixture = TestBed.createComponent(SellerVerifyPaymentsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      pendingGroups: () => OrderGroup[];
      isReady: (group: OrderGroup) => boolean;
    };

    const groups = component.pendingGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].orders.map((order) => order.id).sort()).toEqual(['grupo-atascado', 'grupo-listo']);
    expect(component.isReady(groups[0])).toBe(false);
  });

  it('al confirmar un pago de un pedido suelto llama a verifyPayment (no al de grupo) y muestra un toast de éxito', async () => {
    const order = makeOrder({ id: 'a-confirmar', status: 'PAYMENT_PENDING', salesChannel: 'PRESENCIAL' });
    ordersServiceStub.list.mockReturnValue(of([order]));
    ordersServiceStub.verifyPayment.mockReturnValue(of({ ...order, status: 'PAYMENT_VERIFIED' }));

    const fixture = TestBed.createComponent(SellerVerifyPaymentsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as { verifyGroup: (group: OrderGroup, verified: boolean) => Promise<void> };

    await component.verifyGroup(makeGroup(order), true);

    expect(ordersServiceStub.verifyPayment).toHaveBeenCalledWith('a-confirmar', true, undefined);
    expect(toastServiceStub.success).toHaveBeenCalledWith('Pago confirmado.');
  });

  it('al confirmar un pago combinado (mismo groupId) llama a verifyPaymentGroup con el groupId', async () => {
    const orderA = makeOrder({ id: 'grupo-a', groupId: 'grupo-1', status: 'PAYMENT_PENDING', salesChannel: 'PRESENCIAL', totalAmount: 10000 });
    const orderB = makeOrder({ id: 'grupo-b', groupId: 'grupo-1', status: 'PAYMENT_PENDING', salesChannel: 'PRESENCIAL', totalAmount: 8000 });
    ordersServiceStub.list.mockReturnValue(of([orderA, orderB]));
    ordersServiceStub.verifyPaymentGroup.mockReturnValue(of({ groupId: 'grupo-1', orders: [orderA, orderB] }));

    const fixture = TestBed.createComponent(SellerVerifyPaymentsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as { pendingGroups: () => OrderGroup[]; verifyGroup: (group: OrderGroup, verified: boolean) => Promise<void> };

    const groups = component.pendingGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].totalAmount).toBe(18000);

    await component.verifyGroup(groups[0], true);

    expect(ordersServiceStub.verifyPaymentGroup).toHaveBeenCalledWith('grupo-1', true, undefined);
    expect(ordersServiceStub.verifyPayment).not.toHaveBeenCalled();
    expect(toastServiceStub.success).toHaveBeenCalledWith('Pago confirmado.');
  });

  it('si el backend rechaza la verificación, muestra el error en vez de fallar silenciosamente', async () => {
    const order = makeOrder({ id: 'rechazado-por-backend', status: 'PAYMENT_PENDING', salesChannel: 'PRESENCIAL' });
    ordersServiceStub.list.mockReturnValue(of([order]));
    ordersServiceStub.verifyPayment.mockReturnValue(throwError(() => new Error('Solo un vendedor puede confirmar este pago.')));

    const fixture = TestBed.createComponent(SellerVerifyPaymentsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as { verifyGroup: (group: OrderGroup, verified: boolean) => Promise<void>; errorMessage: () => string };

    await component.verifyGroup(makeGroup(order), true);

    expect(component.errorMessage()).toBe('Solo un vendedor puede confirmar este pago.');
    expect(toastServiceStub.success).not.toHaveBeenCalled();
  });
});
