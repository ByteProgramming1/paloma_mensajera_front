import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ProductAddOnGroup } from '../core/api.models';
import { AddOnGroupsService } from '../core/addon-groups.service';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-admin-addon-groups-page',
  imports: [FormsModule, Icon],
  template: `
    <h1 class="page-title mb-1">Acompañantes</h1>
    <p class="page-lede mb-8">
      Catálogo reutilizable de acompañantes (ej. tipos de carta): créalos aquí una sola vez, con su imagen, y luego asócialos a los combos que quieras desde el Catálogo — sin tener que volver a crearlos por cada producto.
    </p>

    <div class="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div class="order-2 lg:order-1">
        @if (isLoading()) {
          <p class="text-text-secondary">Cargando…</p>
        } @else if (groups().length === 0) {
          <div class="card-surface flex flex-col items-center gap-2 p-12 text-center">
            <app-icon name="envelope" [size]="32" [strokeWidth]="1.4" class="text-brand-magenta/40" />
            <p class="text-[14px] text-text-secondary">Todavía no hay grupos de acompañantes. Crea el primero a la derecha.</p>
          </div>
        } @else {
          <ul class="flex flex-col gap-6">
            @for (group of groups(); track group.id) {
              <li class="card-surface flex flex-col gap-4 p-6">
                <h2 class="section-title">{{ group.name }}</h2>
                <ul class="flex flex-wrap gap-3">
                  @for (option of group.options; track option.id) {
                    <li class="flex flex-col items-center gap-2 rounded-[var(--radius-sm)] bg-bg-base p-3" [class.opacity-50]="!option.isActive">
                      <div class="flex size-16 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-bg-surface-elevated">
                        @if (option.imageUrl) {
                          <img [src]="option.imageUrl" [alt]="option.name" class="size-full object-contain" />
                        } @else {
                          <app-icon name="envelope" [size]="20" [strokeWidth]="1.5" class="text-brand-magenta/40" />
                        }
                      </div>
                      <span class="max-w-[90px] truncate text-[12px] font-medium text-text-primary">{{ option.name }}</span>
                      <label class="cursor-pointer text-[12px] text-brand-magenta underline underline-offset-2">
                        Foto
                        <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp" (change)="uploadOptionImage(option.id, $event)" />
                      </label>
                      <button type="button" class="text-[12px] text-text-secondary underline underline-offset-2" (click)="toggleOption(group, option)">
                        {{ option.isActive ? 'Desactivar' : 'Activar' }}
                      </button>
                    </li>
                  }
                </ul>
                <div class="flex flex-col gap-1">
                  <div class="flex gap-2">
                    <input class="field-input !h-9 max-w-[220px] text-[13px]" [(ngModel)]="newOptionDrafts[group.id]" [name]="'newOption-' + group.id" placeholder="Ej. Carta rosa" />
                    <button type="button" class="btn-secondary !px-3 !py-1 text-[13px]" [disabled]="!newOptionDrafts[group.id]?.trim()" (click)="addOption(group)">Agregar opción</button>
                  </div>
                  @if (!newOptionDrafts[group.id]?.trim()) { <p class="field-hint">Escribe un nombre antes de agregar la opción.</p> }
                </div>
              </li>
            }
          </ul>
        }
      </div>

      <aside class="order-1 lg:sticky lg:top-6 lg:order-2 lg:h-fit">
        <section class="card-surface p-6">
          <h2 class="section-title mb-4">Nuevo grupo</h2>
          <form class="flex flex-col gap-3" (ngSubmit)="createGroup()">
            <label class="field">
              <span class="field-label field-required">Nombre del grupo</span>
              <input class="field-input" required [(ngModel)]="newGroupName" name="newGroupName" placeholder="Ej. Cartas" />
            </label>
            @if (!newGroupName.trim()) { <p class="field-hint">Escribe un nombre antes de crear el grupo.</p> }
            <button type="submit" class="btn-primary" [disabled]="!newGroupName.trim()">Crear grupo</button>
          </form>
          @if (errorMessage()) { <p class="field-error mt-3">{{ errorMessage() }}</p> }
        </section>
      </aside>
    </div>
  `,
})
export class AdminAddOnGroupsPage {
  private readonly addOnGroupsApi = inject(AddOnGroupsService);

  protected readonly groups = signal<ProductAddOnGroup[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected newGroupName = '';
  protected readonly newOptionDrafts: Record<string, string> = {};

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.groups.set(await firstValueFrom(this.addOnGroupsApi.list()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar los acompañantes.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async createGroup(): Promise<void> {
    const name = this.newGroupName.trim();
    if (!name) return;
    this.errorMessage.set('');
    try {
      await firstValueFrom(this.addOnGroupsApi.create(name));
      this.newGroupName = '';
      await this.load();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible crear el grupo.');
    }
  }

  protected async addOption(group: ProductAddOnGroup): Promise<void> {
    const name = this.newOptionDrafts[group.id]?.trim();
    if (!name) return;
    try {
      await firstValueFrom(this.addOnGroupsApi.createOption(group.id, name));
      this.newOptionDrafts[group.id] = '';
      await this.load();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible crear la opción.');
    }
  }

  protected async toggleOption(group: ProductAddOnGroup, option: ProductAddOnGroup['options'][number]): Promise<void> {
    await firstValueFrom(this.addOnGroupsApi.updateOption(option.id, { isActive: !option.isActive }));
    this.load();
  }

  protected async uploadOptionImage(optionId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await firstValueFrom(this.addOnGroupsApi.uploadOptionImage(optionId, file));
      await this.load();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible subir la imagen.');
    } finally {
      input.value = '';
    }
  }
}
