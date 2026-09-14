import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { CheckoutPage } from './checkout-page';
import { OrdersService } from '../core/orders.service';
import { AuthService } from '../core/auth.service';
import { CartService } from '../shared/cart.service';
import { Router } from '@angular/router';
import { Product } from '../core/api.models';
import { RecipientGroupDraft } from './recipient-group-form';

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: overrides.id ?? 'product-1',
    name: overrides.name ?? 'Producto',
    type: 'COMBO',
    price: 10000,
    stock: 10,
    isActive: true,
    giftable: true,
    ...overrides,
  };
}

interface TestableCheckoutPage {
  form: { buyerFullName: string; buyerEmail: string; buyerPhone: string; buyerType: string; buyerCareerOrArea: string; salesChannel: string };
  recipientGroups: RecipientGroupDraft[];
  errorMessage: () => string;
  submit: () => Promise<void>;
  addRecipientGroup: () => void;
  assignLine: (productId: string, groupIndex: number) => void;
}

function asTestable(fixture: ComponentFixture<CheckoutPage>): TestableCheckoutPage {
  return fixture.componentInstance as unknown as TestableCheckoutPage;
}

describe('CheckoutPage', () => {
  let ordersServiceStub: { createPublic: ReturnType<typeof vi.fn>; createPublicMulti: ReturnType<typeof vi.fn> };
  let routerStub: { navigateByUrl: ReturnType<typeof vi.fn> };
  let cart: CartService;

  beforeEach(() => {
    ordersServiceStub = {
      createPublic: vi.fn().mockReturnValue(of({ id: 'order-1' })),
      createPublicMulti: vi.fn().mockReturnValue(of({ groupId: 'group-1', orders: [{ id: 'order-1' }, { id: 'order-2' }] })),
    };
    routerStub = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: OrdersService, useValue: ordersServiceStub },
        { provide: Router, useValue: routerStub },
        { provide: AuthService, useValue: { session: () => null } },
      ],
    });

    cart = TestBed.inject(CartService);
  });

  function fill(component: TestableCheckoutPage): void {
    component.form.buyerFullName = 'Comprador Test';
    component.form.buyerEmail = 'comprador@escuelaing.edu.co';
    component.form.buyerPhone = '3000000000';
    component.form.buyerCareerOrArea = 'Sistemas';
  }

  it('un solo destinatario arma el mismo payload de siempre y llama a createPublic (no a createPublicMulti)', async () => {
    const productA = makeProduct({ id: 'combo-a', giftable: true });
    const productB = makeProduct({ id: 'combo-b', giftable: true });
    cart.setCatalog([productA, productB]);
    cart.setQuantity('combo-a', 1);
    cart.setQuantity('combo-b', 2);

    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const component = asTestable(fixture);
    fill(component);
    component.recipientGroups[0].selfPickup = false;
    component.recipientGroups[0].recipientFullName = 'Destinatario Uno';
    component.recipientGroups[0].recipientCareerOrArea = 'Industrial';
    component.recipientGroups[0].recipientTeamsUser = 'destinatario@escuelaing.edu.co';
    component.recipientGroups[0].letterContent = 'Feliz día';
    component.recipientGroups[0].isAnonymous = true;

    await component.submit();

    expect(ordersServiceStub.createPublicMulti).not.toHaveBeenCalled();
    expect(ordersServiceStub.createPublic).toHaveBeenCalledWith({
      buyerFullName: 'Comprador Test',
      buyerEmail: 'comprador@escuelaing.edu.co',
      buyerPhone: '3000000000',
      buyerType: 'ESTUDIANTE',
      buyerCareerOrArea: 'Sistemas',
      salesChannel: 'ONLINE',
      selfPickup: false,
      recipientFullName: 'Destinatario Uno',
      recipientCareerOrArea: 'Industrial',
      recipientTeamsUser: 'destinatario@escuelaing.edu.co',
      cartItems: [
        { productId: 'combo-a', quantity: 1 },
        { productId: 'combo-b', quantity: 2 },
      ],
      letterContent: 'Feliz día',
      isAnonymous: true,
    });
    expect(routerStub.navigateByUrl).toHaveBeenCalledWith('/pedidos/order-1');
  });

  it('un carrito de solo producto no regalable fuerza autorrecogida y limpia la dedicatoria', async () => {
    const paleta = makeProduct({ id: 'paleta', giftable: false, price: 3000 });
    cart.setCatalog([paleta]);
    cart.setQuantity('paleta', 1);

    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const component = asTestable(fixture);
    fill(component);
    component.recipientGroups[0].letterContent = 'esto no debería enviarse';
    component.recipientGroups[0].deliveryNotes = 'paso a las 3pm';

    await component.submit();

    expect(ordersServiceStub.createPublic).toHaveBeenCalledWith(expect.objectContaining({
      selfPickup: true,
      deliveryNotes: 'paso a las 3pm',
      letterContent: '',
      isAnonymous: false,
    }));
  });

  it('autorrecogida elegida manualmente (no forzada) NO borra la dedicatoria ya escrita', async () => {
    const combo = makeProduct({ id: 'combo-a', giftable: true });
    cart.setCatalog([combo]);
    cart.setQuantity('combo-a', 1);

    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const component = asTestable(fixture);
    fill(component);
    component.recipientGroups[0].selfPickup = true;
    component.recipientGroups[0].letterContent = 'mensaje que sí debe llegar';
    component.recipientGroups[0].isAnonymous = true;

    await component.submit();

    expect(ordersServiceStub.createPublic).toHaveBeenCalledWith(expect.objectContaining({
      selfPickup: true,
      letterContent: 'mensaje que sí debe llegar',
      isAnonymous: true,
    }));
  });

  it('carrito mixto (regalable + no regalable) sin dividir NO fuerza autorrecogida', async () => {
    const combo = makeProduct({ id: 'combo-a', giftable: true });
    const paleta = makeProduct({ id: 'paleta', giftable: false, price: 3000 });
    cart.setCatalog([combo, paleta]);
    cart.setQuantity('combo-a', 1);
    cart.setQuantity('paleta', 1);

    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const component = asTestable(fixture);
    fill(component);
    component.recipientGroups[0].selfPickup = false;
    component.recipientGroups[0].recipientFullName = 'Destinatario';
    component.recipientGroups[0].recipientCareerOrArea = 'Sistemas';
    component.recipientGroups[0].recipientTeamsUser = 'd@escuelaing.edu.co';

    await component.submit();

    expect(ordersServiceStub.createPublic).toHaveBeenCalledWith(expect.objectContaining({ selfPickup: false }));
  });

  it('dividir el carrito entre 2 destinatarios llama a createPublicMulti con cartItems separados por destinatario', async () => {
    const comboA = makeProduct({ id: 'combo-a', giftable: true, price: 15000 });
    const comboB = makeProduct({ id: 'combo-b', giftable: true, price: 18000 });
    const paleta = makeProduct({ id: 'paleta', giftable: false, price: 3000 });
    cart.setCatalog([comboA, comboB, paleta]);
    cart.setQuantity('combo-a', 1);
    cart.setQuantity('combo-b', 1);
    cart.setQuantity('paleta', 1);

    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const component = asTestable(fixture);
    fill(component);

    component.addRecipientGroup();
    component.assignLine('combo-b', 1);
    component.assignLine('paleta', 1);

    component.recipientGroups[0].selfPickup = false;
    component.recipientGroups[0].recipientFullName = 'Destinatario Uno';
    component.recipientGroups[0].recipientCareerOrArea = 'Industrial';
    component.recipientGroups[0].recipientTeamsUser = 'uno@escuelaing.edu.co';

    component.recipientGroups[1].selfPickup = false;
    component.recipientGroups[1].recipientFullName = 'Destinatario Dos';
    component.recipientGroups[1].recipientCareerOrArea = 'Electrónica';
    component.recipientGroups[1].recipientTeamsUser = 'dos@escuelaing.edu.co';
    component.recipientGroups[1].letterContent = 'Feliz día';

    await component.submit();

    expect(ordersServiceStub.createPublic).not.toHaveBeenCalled();
    expect(ordersServiceStub.createPublicMulti).toHaveBeenCalledTimes(1);
    const payload = ordersServiceStub.createPublicMulti.mock.calls[0][0];
    expect(payload.buyerFullName).toBe('Comprador Test');
    expect(payload.recipients).toHaveLength(2);
    expect(payload.recipients[0].cartItems).toEqual([{ productId: 'combo-a', quantity: 1 }]);
    expect(payload.recipients[1].cartItems).toEqual(expect.arrayContaining([
      { productId: 'combo-b', quantity: 1 },
      { productId: 'paleta', quantity: 1 },
    ]));
    // El destinatario 2 tiene la paleta no-regalable MEZCLADA con un combo regalable, así que no
    // debe forzarse autorrecogida (bug ya corregido antes de esta feature — no debe reaparecer).
    expect(payload.recipients[1].selfPickup).toBe(false);
    expect(payload.recipients[1].letterContent).toBe('Feliz día');
    expect(routerStub.navigateByUrl).toHaveBeenCalledWith('/mis-pedidos');
  });

  it('bloquea el envío si un destinatario quedó sin productos asignados', async () => {
    const comboA = makeProduct({ id: 'combo-a', giftable: true });
    const comboB = makeProduct({ id: 'combo-b', giftable: true });
    cart.setCatalog([comboA, comboB]);
    cart.setQuantity('combo-a', 1);
    cart.setQuantity('combo-b', 1);

    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const component = asTestable(fixture);
    fill(component);

    component.addRecipientGroup();
    // No se asigna ninguna línea al grupo 2 — queda vacío a propósito.

    await component.submit();

    expect(ordersServiceStub.createPublic).not.toHaveBeenCalled();
    expect(ordersServiceStub.createPublicMulti).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('destinatario 2');
  });
});
