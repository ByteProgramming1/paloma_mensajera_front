import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { BuyerType, CreateOrderRequest, SalesChannel } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { CartService } from '../shared/cart.service';
import { ACADEMIC_PROGRAMS } from '../core/academic-programs.const';

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <h1 class="mb-1 text-[28px] font-semibold text-text-primary">Cuéntanos a quién va dirigido</h1>
    <p class="mb-8 max-w-[620px] text-[15px] text-text-secondary">
      Tu dedicatoria pasa por una revisión manual antes de habilitar la rifa — no hay filtros automáticos, la lee una persona del equipo.
    </p>

    @if (cart.itemCount() === 0) {
      <p class="field-hint">Tu carrito está vacío. <a routerLink="/catalogo" class="text-brand-magenta underline">Vuelve al catálogo</a>.</p>
    } @else {
      <div class="grid gap-10 lg:grid-cols-[1fr_320px]">
        <form class="flex flex-col gap-8" (ngSubmit)="submit()">
          <section class="card-surface flex flex-col gap-4 p-6">
            <h2 class="text-[16px] font-semibold text-text-primary">Tus datos</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="field">
                <span class="field-label">Nombre completo</span>
                <input class="field-input" name="buyerFullName" required [(ngModel)]="form.buyerFullName" placeholder="Tu nombre completo" />
              </label>
              <label class="field">
                <span class="field-label">Correo institucional</span>
                <input class="field-input" name="buyerEmail" type="email" required [(ngModel)]="form.buyerEmail" [disabled]="!!auth.session()" />
              </label>
              <label class="field">
                <span class="field-label">Teléfono de contacto</span>
                <input class="field-input" name="buyerPhone" required [(ngModel)]="form.buyerPhone" placeholder="300 000 0000" />
              </label>
              <label class="field">
                <span class="field-label">Tipo</span>
                <select class="field-input" name="buyerType" required [(ngModel)]="form.buyerType">
                  <option value="ESTUDIANTE">Estudiante</option>
                  <option value="PROFESOR">Profesor</option>
                  <option value="ADMINISTRATIVO">Administrativo</option>
                </select>
              </label>
              <label class="field sm:col-span-2">
                <span class="field-label">{{ form.buyerType === 'ESTUDIANTE' ? 'Carrera o programa' : 'Área de trabajo' }}</span>
                @if (form.buyerType === 'ESTUDIANTE') {
                  <select class="field-input" name="buyerCareerOrArea" required [(ngModel)]="form.buyerCareerOrArea">
                    <option value="" disabled>Selecciona tu carrera</option>
                    @for (program of programs; track program) {
                      <option [value]="program">{{ program }}</option>
                    }
                  </select>
                } @else {
                  <input class="field-input" name="buyerCareerOrArea" required [(ngModel)]="form.buyerCareerOrArea" placeholder="Ej. Bienestar Universitario" />
                }
              </label>
            </div>
          </section>

          <section class="card-surface flex flex-col gap-4 p-6">
            <h2 class="text-[16px] font-semibold text-text-primary">¿Quién recibe el regalo?</h2>
            <div class="flex gap-2">
              <button type="button" class="btn" [class]="!form.selfPickup ? 'btn-primary' : 'btn-secondary'" (click)="form.selfPickup = false">Es para alguien más</button>
              <button type="button" class="btn" [class]="form.selfPickup ? 'btn-primary' : 'btn-secondary'" (click)="form.selfPickup = true">Yo mismo lo recojo</button>
            </div>

            @if (!form.selfPickup) {
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="field sm:col-span-2">
                  <span class="field-label">Nombre completo del destinatario</span>
                  <input class="field-input" name="recipientFullName" required [(ngModel)]="form.recipientFullName" />
                </label>
                <label class="field">
                  <span class="field-label">Carrera / área del destinatario</span>
                  <select class="field-input" name="recipientCareerOrArea" required [(ngModel)]="form.recipientCareerOrArea">
                    <option value="" disabled>Selecciona la carrera</option>
                    @for (program of programs; track program) {
                      <option [value]="program">{{ program }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">Usuario de Teams del destinatario</span>
                  <input class="field-input" name="recipientTeamsUser" required [(ngModel)]="form.recipientTeamsUser" placeholder="usuario@escuelaing.edu.co" />
                </label>
              </div>
            } @else {
              <label class="field">
                <span class="field-label">Comentario para quien te entregue (opcional)</span>
                <textarea class="field-input !h-auto min-h-[80px] py-3" name="deliveryNotes" [(ngModel)]="form.deliveryNotes" placeholder="Ej. paso a recogerlo después de las 3pm, soy la persona de gorra roja…"></textarea>
              </label>
            }
          </section>

          <section class="card-surface flex flex-col gap-4 p-6">
            <h2 class="text-[16px] font-semibold text-text-primary">Tu dedicatoria</h2>
            <p class="field-hint">Un vendedor la lee manualmente antes de aprobarla — cuida el tono, no hay filtro automático que la corrija.</p>
            <label class="field">
              <span class="field-label">Dedicatoria</span>
              <textarea class="field-input !h-auto min-h-[120px] py-3" name="letterContent" required [(ngModel)]="form.letterContent" placeholder="Escribe tu mensaje…"></textarea>
            </label>
            <label class="flex items-center gap-2 text-[14px] text-text-secondary">
              <input type="checkbox" name="isAnonymous" [(ngModel)]="form.isAnonymous" />
              Enviar como anónimo (el vendedor no verá tu nombre)
            </label>
          </section>

          <section class="card-surface flex flex-col gap-3 p-6">
            <h2 class="text-[16px] font-semibold text-text-primary">Canal de venta</h2>
            <div class="flex gap-2">
              <button type="button" class="btn" [class]="form.salesChannel === 'ONLINE' ? 'btn-primary' : 'btn-secondary'" (click)="form.salesChannel = 'ONLINE'">En línea</button>
              <button type="button" class="btn" [class]="form.salesChannel === 'PRESENCIAL' ? 'btn-primary' : 'btn-secondary'" (click)="form.salesChannel = 'PRESENCIAL'">Presencial en stand</button>
            </div>
          </section>

          @if (errorMessage()) { <p class="field-error" role="alert">{{ errorMessage() }}</p> }

          <button type="submit" class="btn-primary self-start" [disabled]="isSubmitting()">
            {{ isSubmitting() ? 'Enviando…' : 'Enviar pedido para revisión' }}
          </button>
        </form>

        <aside class="card-surface h-fit p-6">
          <h2 class="mb-4 text-[16px] font-semibold text-text-primary">Resumen</h2>
          <ul class="flex flex-col gap-3">
            @for (line of cart.lines(); track line.product.id) {
              <li class="flex items-center justify-between text-[14px] text-text-secondary">
                <span>{{ line.quantity }}× {{ line.product.name }}</span>
                <span class="mono-figure">{{ line.product.price * line.quantity | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
              </li>
            }
          </ul>
          <div class="mt-4 flex items-center justify-between border-t border-border-soft pt-4">
            <span class="font-semibold text-text-primary">Total</span>
            <span class="mono-figure text-[18px] text-brand-magenta">{{ cart.total() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
          </div>
        </aside>
      </div>
    }
  `,
})
export class CheckoutPage implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  private readonly ordersApi = inject(OrdersService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly programs = ACADEMIC_PROGRAMS;

  protected form: {
    buyerFullName: string;
    buyerEmail: string;
    buyerPhone: string;
    buyerType: BuyerType;
    buyerCareerOrArea: string;
    selfPickup: boolean;
    recipientFullName: string;
    recipientCareerOrArea: string;
    recipientTeamsUser: string;
    deliveryNotes: string;
    letterContent: string;
    isAnonymous: boolean;
    salesChannel: SalesChannel;
  } = {
    buyerFullName: '',
    buyerEmail: '',
    buyerPhone: '',
    buyerType: 'ESTUDIANTE',
    buyerCareerOrArea: '',
    selfPickup: false,
    recipientFullName: '',
    recipientCareerOrArea: '',
    recipientTeamsUser: '',
    deliveryNotes: '',
    letterContent: '',
    isAnonymous: false,
    salesChannel: 'ONLINE',
  };

  ngOnInit(): void {
    const user = this.auth.session()?.user;
    if (user) {
      this.form.buyerFullName = user.name;
      this.form.buyerEmail = user.email;
    }
  }

  protected async submit(): Promise<void> {
    this.errorMessage.set('');
    this.isSubmitting.set(true);
    try {
      const payload: CreateOrderRequest = {
        buyerFullName: this.form.buyerFullName,
        buyerEmail: this.form.buyerEmail,
        buyerPhone: this.form.buyerPhone,
        buyerType: this.form.buyerType,
        buyerCareerOrArea: this.form.buyerCareerOrArea,
        selfPickup: this.form.selfPickup,
        cartItems: this.cart.toCartItems(),
        letterContent: this.form.letterContent,
        isAnonymous: this.form.isAnonymous,
        salesChannel: this.form.salesChannel,
        ...(this.form.selfPickup
          ? { deliveryNotes: this.form.deliveryNotes || undefined }
          : {
              recipientFullName: this.form.recipientFullName,
              recipientCareerOrArea: this.form.recipientCareerOrArea,
              recipientTeamsUser: this.form.recipientTeamsUser,
            }),
      };
      const order = await firstValueFrom(this.ordersApi.createPublic(payload));
      this.cart.clear();
      try { localStorage.setItem('paloma_last_order_id', order.id); } catch { /* almacenamiento no disponible */ }
      this.router.navigateByUrl(`/pedidos/${order.id}`);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible enviar tu pedido.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
