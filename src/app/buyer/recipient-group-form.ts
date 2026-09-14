import { Component, computed, inject, input, output } from '@angular/core';
import { ControlContainer, FormsModule } from '@angular/forms';
import { ACADEMIC_PROGRAMS } from '../core/academic-programs.const';

export interface RecipientGroupDraft {
  selfPickup: boolean;
  recipientFullName: string;
  recipientCareerOrArea: string;
  recipientTeamsUser: string;
  deliveryNotes: string;
  letterContent: string;
  isAnonymous: boolean;
}

export function createEmptyRecipientGroupDraft(): RecipientGroupDraft {
  return {
    selfPickup: false,
    recipientFullName: '',
    recipientCareerOrArea: '',
    recipientTeamsUser: '',
    deliveryNotes: '',
    letterContent: '',
    isAnonymous: false,
  };
}

export interface RecipientGroupLine {
  productId: string;
  productName: string;
  quantity: number;
}

// La sección "¿Quién recibe el regalo?" + "Tu dedicatoria" de checkout-page.ts, extraída para
// poder repetirla una vez por destinatario en el checkout multi-destinatario. El [ngModelGroup]
// indexado por `index` aísla el formulario de cada instancia dentro del <form> del padre, así
// varias instancias hermanas no chocan por nombre de campo.
@Component({
  selector: 'app-recipient-group-form',
  imports: [FormsModule],
  // ngModelGroup dentro de un componente hijo no encuentra el <form> del padre por sí solo
  // (los form directives de Angular no cruzan el límite de componente automáticamente) — esto
  // reexpone el ControlContainer del padre (buscándolo un nivel arriba) como si fuera propio de
  // este componente, que es el patrón estándar de Angular para "sub-formularios" en componentes hijos.
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
  template: `
    <section class="card-surface flex flex-col gap-4 p-6" [ngModelGroup]="'recipient' + index()">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="section-title">{{ showHeader() ? 'Destinatario ' + (index() + 1) : '¿Quién recibe el regalo?' }}</h2>
          @if (showHeader() && lines().length > 0) {
            <p class="field-hint">Incluye: {{ lineNames() }}</p>
          }
        </div>
        @if (removable()) {
          <button type="button" class="text-[12px] font-medium text-status-error underline underline-offset-2" (click)="remove.emit()">Quitar este destinatario</button>
        }
      </div>

      @if (forcedPickup()) {
        <p class="field-hint">Este destinatario incluye un producto que solo se puede recoger en el stand — no se puede enviar a otra persona, así que queda como autorrecogida.</p>
      } @else {
        <div class="flex gap-2">
          <button type="button" class="btn" [class]="!group().selfPickup ? 'btn-primary' : 'btn-secondary'" (click)="group().selfPickup = false">Es para alguien más</button>
          <button type="button" class="btn" [class]="group().selfPickup ? 'btn-primary' : 'btn-secondary'" (click)="group().selfPickup = true">Yo mismo lo recojo</button>
        </div>
      }

      @if (!effectiveSelfPickup()) {
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="field sm:col-span-2">
            <span class="field-label field-required">Nombre completo del destinatario</span>
            <input class="field-input" name="recipientFullName" required [(ngModel)]="group().recipientFullName" />
          </label>
          <label class="field">
            <span class="field-label field-required">Carrera / área del destinatario</span>
            <select class="field-input" name="recipientCareerOrArea" required [(ngModel)]="group().recipientCareerOrArea">
              <option value="" disabled>Selecciona la carrera</option>
              @for (program of programs; track program) {
                <option [value]="program">{{ program }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="field-label field-required">Correo institucional del destinatario</span>
            <input class="field-input" name="recipientTeamsUser" type="email" required [(ngModel)]="group().recipientTeamsUser" placeholder="usuario@escuelaing.edu.co" />
            <span class="field-hint">Si no sabes cómo obtenerlo, a través del buscador de Teams lo puedes hacer.</span>
          </label>
        </div>
      } @else {
        <label class="field">
          <span class="field-label">Comentario para quien te entregue (opcional)</span>
          <textarea class="field-input !h-auto min-h-[80px] py-3" name="deliveryNotes" [(ngModel)]="group().deliveryNotes" placeholder="Ej. paso a recogerlo después de las 3pm, soy la persona de gorra roja…"></textarea>
        </label>
      }
    </section>

    @if (!forcedPickup()) {
      <section class="card-surface flex flex-col gap-4 p-6" [ngModelGroup]="'letter' + index()">
        <h2 class="section-title">{{ showHeader() ? 'Dedicatoria para ' + (group().recipientFullName || 'este destinatario') : 'Tu dedicatoria' }}</h2>
        <p class="field-hint">Es opcional. Si escribes algo, un vendedor la lee manualmente antes de aprobarla — cuida el tono, no hay filtro automático que la corrija.</p>
        <label class="field">
          <span class="field-label">Dedicatoria (opcional)</span>
          <textarea class="field-input !h-auto min-h-[120px] py-3" name="letterContent" [(ngModel)]="group().letterContent" placeholder="Escribe tu mensaje… (puedes dejarlo en blanco)"></textarea>
        </label>
        <div class="flex flex-col gap-2">
          <span class="field-label">¿Cómo quieres firmar tu dedicatoria?</span>
          <div class="flex gap-2">
            <button type="button" class="btn flex-1 !py-3 !text-[14px]" [class]="!group().isAnonymous ? 'btn-primary' : 'btn-secondary'" (click)="group().isAnonymous = false">Con mi nombre</button>
            <button type="button" class="btn flex-1 !py-3 !text-[14px]" [class]="group().isAnonymous ? 'btn-primary' : 'btn-secondary'" (click)="group().isAnonymous = true">Enviar anónimo</button>
          </div>
          <p class="field-hint">{{ group().isAnonymous ? 'Modo incógnito activado: el vendedor no verá tu nombre al revisar la dedicatoria.' : 'El vendedor verá tu nombre al revisar la dedicatoria.' }}</p>
        </div>
      </section>
    }
  `,
})
export class RecipientGroupForm {
  readonly group = input.required<RecipientGroupDraft>();
  readonly index = input.required<number>();
  readonly lines = input<RecipientGroupLine[]>([]);
  readonly forcedPickup = input(false);
  readonly showHeader = input(false);
  readonly removable = input(false);
  readonly remove = output<void>();

  protected readonly programs = ACADEMIC_PROGRAMS;

  protected readonly effectiveSelfPickup = computed(() => this.forcedPickup() || this.group().selfPickup);

  protected lineNames(): string {
    return this.lines().map((line) => (line.quantity > 1 ? `${line.quantity}× ${line.productName}` : line.productName)).join(', ');
  }
}
