import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ProductAddOnGroup } from '../core/api.models';
import { AddOnGroupsService } from '../core/addon-groups.service';

@Component({
  selector: 'app-admin-addon-groups-page',
  imports: [FormsModule],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Acompañantes</h1>
    <p class="mb-8 max-w-[640px] text-[15px] text-text-secondary">
      Catálogo reutilizable de acompañantes (ej. tipos de carta): créalos aquí una sola vez, con su imagen, y luego asócialos a los combos que quieras desde el Catálogo — sin tener que volver a crearlos por cada producto.
    </p>

    <section class="card-surface mb-8 p-6">
      <h2 class="mb-4 text-[16px] font-semibold text-text-primary">Nuevo grupo</h2>
      <div class="flex gap-2">
        <input class="field-input max-w-[280px]" [(ngModel)]="newGroupName" name="newGroupName" placeholder="Ej. Cartas" />
        <button type="button" class="btn-primary" (click)="createGroup()">Crear grupo</button>
      </div>
      @if (errorMessage()) { <p class="field-error mt-3">{{ errorMessage() }}</p> }
    </section>

    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else if (groups().length === 0) {
      <p class="field-hint">Todavía no hay grupos de acompañantes.</p>
    } @else {
      <ul class="flex flex-col gap-6">
        @for (group of groups(); track group.id) {
          <li class="card-surface flex flex-col gap-4 p-6">
            <h2 class="text-[16px] font-semibold text-text-primary">{{ group.name }}</h2>
            <ul class="flex flex-wrap gap-3">
              @for (option of group.options; track option.id) {
                <li class="flex flex-col items-center gap-2 rounded-[var(--radius-sm)] bg-bg-base p-3">
                  <div class="flex size-16 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-bg-surface-elevated">
                    @if (option.imageUrl) {
                      <img [src]="option.imageUrl" [alt]="option.name" class="size-full object-cover" />
                    } @else {
                      <span class="text-2xl" aria-hidden="true">💌</span>
                    }
                  </div>
                  <span class="max-w-[90px] truncate text-[12px] text-text-primary">{{ option.name }}</span>
                  <label class="cursor-pointer text-[12px] text-brand-magenta underline">
                    Foto
                    <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp" (change)="uploadOptionImage(option.id, $event)" />
                  </label>
                  <button type="button" class="text-[12px] text-text-secondary underline" (click)="toggleOption(group, option)">
                    {{ option.isActive ? 'Desactivar' : 'Activar' }}
                  </button>
                </li>
              }
            </ul>
            <div class="flex gap-2">
              <input class="field-input !h-9 max-w-[220px] text-[13px]" [(ngModel)]="newOptionDrafts[group.id]" [name]="'newOption-' + group.id" placeholder="Ej. Carta rosa" />
              <button type="button" class="btn-secondary !px-3 !py-1 text-[13px]" (click)="addOption(group)">Agregar opción</button>
            </div>
          </li>
        }
      </ul>
    }
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
