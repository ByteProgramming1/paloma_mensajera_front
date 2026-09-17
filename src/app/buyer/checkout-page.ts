import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { BuyerType, CreateOrderMultiRequest, CreateOrderRecipientDto, CreateOrderRequest, SalesChannel } from '../core/api.models';
import { OrdersService } from '../core/orders.service';
import { CartService, CartLine } from '../shared/cart.service';
import { ACADEMIC_PROGRAMS } from '../core/academic-programs.const';
import { RecipientGroupForm, RecipientGroupDraft, RecipientGroupLine, createEmptyRecipientGroupDraft } from './recipient-group-form';

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, CurrencyPipe, RouterLink, RecipientGroupForm],
  template: `
    <h1 class="mb-1 text-[28px] font-semibold tracking-tight text-text-primary">Cuéntanos a quién va dirigido</h1>
    <p class="page-lede mb-1">
      Tu dedicatoria pasa por una revisión manual antes de habilitar la rifa — no hay filtros automáticos, la lee una persona del equipo.
    </p>
    <p class="field-hint mb-8">Los campos marcados con <span class="font-bold text-status-error">*</span> son obligatorios.</p>

    @if (cart.itemCount() === 0) {
      <p class="field-hint">Tu carrito está vacío. <a routerLink="/catalogo" class="text-brand-magenta underline">Vuelve al catálogo</a>.</p>
    } @else {
      <div class="grid gap-10 lg:grid-cols-[1fr_320px]">
        <form class="flex flex-col gap-8" (ngSubmit)="submit()">
          <section class="card-surface flex flex-col gap-4 p-6">
            <h2 class="section-title">Tus datos</h2>
            @if (buyerNameMismatch()) {
              <p class="field-hint rounded-[var(--radius-sm)] bg-status-pendiente/10 p-3 text-status-pendiente">
                Este pedido va a quedar con tu cuenta ({{ auth.session()!.user.email }}) pero un nombre distinto al de tu perfil ({{ auth.session()!.user.name }}). Si estás comprando para ti, corrige el nombre; si le haces el favor de comprar a otra persona, tu nombre real va aquí en "Tus datos" y el de ella en "¿Quién recibe el regalo?".
              </p>
            }
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="field">
                <span class="field-label field-required">Nombre completo</span>
                <input class="field-input" name="buyerFullName" required [(ngModel)]="form.buyerFullName" placeholder="Tu nombre completo" />
              </label>
              <label class="field">
                <span class="field-label field-required">Correo institucional</span>
                <input class="field-input" name="buyerEmail" type="email" required [(ngModel)]="form.buyerEmail" [disabled]="!!auth.session()" />
              </label>
              <label class="field">
                <span class="field-label field-required">Teléfono de contacto</span>
                <input class="field-input" name="buyerPhone" required [(ngModel)]="form.buyerPhone" placeholder="300 000 0000" />
              </label>
              <label class="field">
                <span class="field-label field-required">Tipo</span>
                <select class="field-input" name="buyerType" required [(ngModel)]="form.buyerType">
                  <option value="ESTUDIANTE">Estudiante</option>
                  <option value="PROFESOR">Profesor</option>
                  <option value="ADMINISTRATIVO">Administrativo</option>
                </select>
              </label>
              <label class="field sm:col-span-2">
                <span class="field-label field-required">{{ form.buyerType === 'ESTUDIANTE' ? 'Carrera o programa' : 'Área de trabajo' }}</span>
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

          @if (cart.lines().length > 1) {
            <section class="card-surface flex flex-col gap-4 p-6">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="section-title">¿Es todo para la misma persona?</h2>
                <button type="button" class="btn-secondary !px-3 !py-1 text-[13px]" (click)="addRecipientGroup()">
                  {{ recipientGroups.length > 1 ? '+ Agregar otro destinatario' : 'Dividir entre varias personas' }}
                </button>
              </div>
              @if (recipientGroups.length > 1) {
                <p class="field-hint">Elige a qué destinatario va cada producto de tu carrito.</p>
                <ul class="flex flex-col gap-2">
                  @for (line of cart.lines(); track line.key) {
                    <li class="flex flex-wrap items-center justify-between gap-2 text-[14px] text-text-primary">
                      <span>{{ line.quantity }}× {{ line.product.name }}</span>
                      <select
                        class="field-input max-w-[220px]"
                        [name]="'assign-' + line.key"
                        [ngModel]="lineAssignments[line.key] ?? 0"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="assignLine(line.key, $event)"
                      >
                        @for (group of recipientGroups; let gi = $index; track gi) {
                          <option [value]="gi">Destinatario {{ gi + 1 }}</option>
                        }
                      </select>
                    </li>
                  }
                </ul>
              }
            </section>
          }

          @for (group of recipientGroups; let gi = $index; track gi) {
            <app-recipient-group-form
              [group]="group"
              [index]="gi"
              [lines]="groupLineViews(gi)"
              [forcedPickup]="groupForcedPickup(gi)"
              [showHeader]="recipientGroups.length > 1"
              [removable]="gi > 0"
              (remove)="removeRecipientGroup(gi)"
            />
          }

          <section class="card-surface flex flex-col gap-4 p-6">
            <h2 class="section-title">Confirma antes de pagar</h2>
            <p class="field-hint">Revisa que los datos y el modo de envío de cada dedicatoria sean correctos — después de pagar ya no podrás editarlos tú mismo.</p>
            @for (group of recipientGroups; let gi = $index; track gi) {
              <div class="rounded-[var(--radius-sm)] bg-bg-base p-4">
                @if (recipientGroups.length > 1) { <p class="field-label mb-1">Destinatario {{ gi + 1 }}</p> }
                @if (groupForcedPickup(gi) || group.selfPickup) {
                  <p class="text-[14px] text-text-primary">Autorrecogida — lo recoges tú mismo en el stand.</p>
                } @else {
                  <p class="text-[14px] text-text-primary">Para: <strong>{{ group.recipientFullName || '(falta el nombre)' }}</strong></p>
                  <p class="mt-1 text-[13px] text-text-secondary">
                    Se enviará
                    @if (group.isAnonymous) {
                      <strong class="text-brand-magenta">en modo incógnito (anónimo)</strong> — el vendedor no verá tu nombre.
                    } @else {
                      <strong>con tu nombre</strong> — el vendedor verá quién lo envía.
                    }
                  </p>
                  @if (group.letterContent) {
                    <p class="mt-2 rounded bg-bg-surface-elevated p-2 text-[13px] leading-relaxed whitespace-pre-wrap text-text-secondary italic">"{{ group.letterContent }}"</p>
                  }
                }
              </div>
            }
          </section>

          <section class="card-surface flex flex-col gap-3 p-6">
            <h2 class="section-title">¿Cómo vas a pagar?</h2>
            <div class="flex gap-2">
              <button type="button" class="btn" [class]="form.salesChannel === 'ONLINE' ? 'btn-primary' : 'btn-secondary'" (click)="form.salesChannel = 'ONLINE'">Pago digital (Nequi / Bre-B)</button>
              <button type="button" class="btn" [class]="form.salesChannel === 'PRESENCIAL' ? 'btn-primary' : 'btn-secondary'" (click)="form.salesChannel = 'PRESENCIAL'">Pago en el stand</button>
            </div>
            <p class="field-hint">
              @if (form.salesChannel === 'ONLINE') {
                Al enviar el pedido te mostraremos el número de Nequi y la llave Bre-B para transferir.
              } @else {
                Un vendedor autorizado en el stand recibe tu pago en efectivo y aprueba la compra ahí mismo — no necesitas pagar en línea.
              }
            </p>
            @if (recipientGroups.length > 1) {
              <p class="field-hint">Es un solo pago por el total combinado de los {{ recipientGroups.length }} destinatarios — no se paga por separado.</p>
            }
          </section>

          @if (errorMessage()) { <p class="field-error" role="alert">{{ errorMessage() }}</p> }

          <button type="submit" class="btn-primary self-start" [disabled]="isSubmitting()">
            {{ isSubmitting() ? 'Enviando…' : 'Enviar pedido para revisión' }}
          </button>
        </form>

        <aside class="card-surface sticky top-6 h-fit p-6">
          <h2 class="section-title mb-4">Resumen</h2>
          @if (recipientGroups.length > 1) {
            @for (group of recipientGroups; let gi = $index; track gi) {
              <div class="mb-4">
                <p class="field-label mb-1">Destinatario {{ gi + 1 }}</p>
                <ul class="flex flex-col gap-2">
                  @for (line of linesForGroup(gi); track line.key) {
                    <li class="flex items-center justify-between text-[14px] text-text-secondary">
                      <span>{{ line.quantity }}× {{ line.product.name }}</span>
                      <span class="mono-figure">{{ line.product.price * line.quantity | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
          } @else {
            <ul class="flex flex-col gap-3">
              @for (line of cart.lines(); track line.key) {
                <li class="flex items-center justify-between text-[14px] text-text-secondary">
                  <span>{{ line.quantity }}× {{ line.product.name }}</span>
                  <span class="mono-figure">{{ line.product.price * line.quantity | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                </li>
              }
            </ul>
          }
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
    salesChannel: SalesChannel;
  } = {
    buyerFullName: '',
    buyerEmail: '',
    buyerPhone: '',
    buyerType: 'ESTUDIANTE',
    buyerCareerOrArea: '',
    salesChannel: 'ONLINE',
  };

  // Un solo grupo por defecto = comportamiento de siempre (un destinatario, todo el carrito).
  // Dividir el carrito entre varios destinatarios agrega grupos aquí; lineAssignments dice a
  // cuál de estos grupos pertenece cada línea del carrito (sin entrada = grupo 0).
  protected recipientGroups: RecipientGroupDraft[] = [createEmptyRecipientGroupDraft()];
  protected lineAssignments: Partial<Record<string, number>> = {};

  ngOnInit(): void {
    const user = this.auth.session()?.user;
    if (user) {
      this.form.buyerFullName = user.name;
      this.form.buyerEmail = user.email;
    }
  }

  // El correo queda bloqueado a la cuenta logueada, pero el nombre es editable — si alguien
  // presta su cuenta para comprarle a un amigo y escribe el nombre del amigo aquí, el pedido
  // queda con buyerEmail de una persona y buyerFullName de otra. No lo bloqueamos (a veces es
  // intencional, ej. alguien comprando "de parte de" otra persona con su misma cuenta), pero se
  // avisa para que no sea un error accidental por pereza de crear una cuenta nueva.
  protected buyerNameMismatch(): boolean {
    const user = this.auth.session()?.user;
    return !!user && this.form.buyerFullName.trim() !== '' && this.form.buyerFullName.trim() !== user.name;
  }

  protected linesForGroup(index: number): CartLine[] {
    return this.cart.lines().filter((line) => (this.lineAssignments[line.key] ?? 0) === index);
  }

  protected groupLineViews(index: number): RecipientGroupLine[] {
    return this.linesForGroup(index).map((line) => ({ productId: line.product.id, productName: line.product.name, quantity: line.quantity }));
  }

  // Un destinatario queda forzado a autorrecogida solo si TODAS sus líneas asignadas son no
  // regalables (ej. una paleta sola) — igual que la regla de siempre, pero evaluada por grupo.
  protected groupForcedPickup(index: number): boolean {
    const lines = this.linesForGroup(index);
    return lines.length > 0 && lines.every((line) => line.product.giftable === false);
  }

  protected assignLine(lineKey: string, groupIndex: number): void {
    this.lineAssignments = { ...this.lineAssignments, [lineKey]: Number(groupIndex) };
  }

  protected addRecipientGroup(): void {
    this.recipientGroups = [...this.recipientGroups, createEmptyRecipientGroupDraft()];
  }

  protected removeRecipientGroup(index: number): void {
    if (index === 0) return;
    const next: Record<string, number> = {};
    for (const [lineKey, groupIndex] of Object.entries(this.lineAssignments)) {
      const current = groupIndex ?? 0;
      if (current === index) next[lineKey] = 0;
      else if (current > index) next[lineKey] = current - 1;
      else next[lineKey] = current;
    }
    this.lineAssignments = next;
    this.recipientGroups = this.recipientGroups.filter((_, i) => i !== index);
  }

  private buildRecipientDto(group: RecipientGroupDraft, index: number): CreateOrderRecipientDto {
    // La dedicatoria solo se limpia cuando la autorrecogida es FORZADA (producto no regalable) —
    // si el comprador elige autorrecogida por su cuenta con un carrito regalable, la dedicatoria
    // que haya escrito igual se envía (igual que el comportamiento de siempre, de un solo
    // destinatario: forzar y limpiar son cosas distintas).
    const forced = this.groupForcedPickup(index);
    const selfPickup = forced || group.selfPickup;
    return {
      selfPickup,
      ...(selfPickup
        ? { deliveryNotes: group.deliveryNotes || undefined }
        : { recipientFullName: group.recipientFullName, recipientCareerOrArea: group.recipientCareerOrArea, recipientTeamsUser: group.recipientTeamsUser }),
      cartItems: this.linesForGroup(index).map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
        ...(line.selectedAddOnOptionId ? { selectedAddOnOptionId: line.selectedAddOnOptionId } : {}),
      })),
      letterContent: forced ? '' : group.letterContent,
      isAnonymous: forced ? false : group.isAnonymous,
    };
  }

  protected async submit(): Promise<void> {
    this.errorMessage.set('');

    if (this.recipientGroups.length > 1) {
      const emptyGroupIndex = this.recipientGroups.findIndex((_, i) => this.linesForGroup(i).length === 0);
      if (emptyGroupIndex !== -1) {
        this.errorMessage.set(`El destinatario ${emptyGroupIndex + 1} no tiene productos asignados — asígnale al menos uno o quítalo.`);
        return;
      }
    }

    this.isSubmitting.set(true);
    try {
      if (this.recipientGroups.length === 1) {
        const payload: CreateOrderRequest = {
          buyerFullName: this.form.buyerFullName,
          buyerEmail: this.form.buyerEmail,
          buyerPhone: this.form.buyerPhone,
          buyerType: this.form.buyerType,
          buyerCareerOrArea: this.form.buyerCareerOrArea,
          salesChannel: this.form.salesChannel,
          ...this.buildRecipientDto(this.recipientGroups[0], 0),
        };
        const order = await firstValueFrom(this.ordersApi.createPublic(payload));
        this.cart.clear();
        this.router.navigateByUrl(`/pedidos/${order.id}`);
      } else {
        const payload: CreateOrderMultiRequest = {
          buyerFullName: this.form.buyerFullName,
          buyerEmail: this.form.buyerEmail,
          buyerPhone: this.form.buyerPhone,
          buyerType: this.form.buyerType,
          buyerCareerOrArea: this.form.buyerCareerOrArea,
          salesChannel: this.form.salesChannel,
          recipients: this.recipientGroups.map((group, index) => this.buildRecipientDto(group, index)),
        };
        await firstValueFrom(this.ordersApi.createPublicMulti(payload));
        this.cart.clear();
        this.router.navigateByUrl('/mis-pedidos');
      }
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible enviar tu pedido.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
