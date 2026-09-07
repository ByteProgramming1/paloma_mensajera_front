import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { StaffRole, StaffUser } from '../core/api.models';
import { AdminService } from '../core/admin.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [FormsModule, DatePipe],
  template: `
    <h1 class="mb-1 text-[26px] font-semibold text-text-primary">Roles y turnos</h1>
    <p class="mb-8 max-w-[620px] text-[15px] text-text-secondary">Reasigna o desactiva a cualquier persona por su correo para acomodar la rotación de turnos, sin crear cuentas nuevas.</p>

    <section class="card-surface mb-8 p-6">
      <h2 class="mb-4 text-[16px] font-semibold text-text-primary">Crear cuenta temporal de staff</h2>
      <form class="grid gap-4 sm:grid-cols-2" (ngSubmit)="createTemporary()">
        <label class="field">
          <span class="field-label">Nombre</span>
          <input class="field-input" required [(ngModel)]="temp.name" name="name" />
        </label>
        <label class="field">
          <span class="field-label">Correo institucional</span>
          <input class="field-input" type="email" required [(ngModel)]="temp.email" name="email" />
        </label>
        <label class="field">
          <span class="field-label">Rol</span>
          <select class="field-input" [(ngModel)]="temp.roleSlug" name="roleSlug">
            <option value="seller">Vendedor</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">Vence el</span>
          <input class="field-input" type="datetime-local" required [(ngModel)]="temp.expiresAt" name="expiresAt" />
        </label>
        <button type="submit" class="btn-primary self-end sm:col-span-2">Crear cuenta</button>
      </form>
      @if (tempMessage()) { <p class="field-hint mt-3">{{ tempMessage() }}</p> }
    </section>

    <label class="field mb-4 max-w-[320px]">
      <span class="field-label">Buscar por nombre o correo</span>
      <input class="field-input" [ngModel]="nameFilter()" (ngModelChange)="nameFilter.set($event)" name="nameFilter" placeholder="Ej. Astrih González" />
    </label>

    @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }
    @if (isLoading()) {
      <p class="text-text-secondary">Cargando…</p>
    } @else {
      @if (filteredUsers().length === 0) {
        <p class="field-hint">No se encontró nadie con ese nombre o correo.</p>
      }
      <ul class="flex flex-col gap-3">
        @for (user of filteredUsers(); track user.id) {
          <li class="card-surface flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p class="font-semibold text-text-primary">{{ user.fullName }}</p>
              <p class="field-hint">{{ user.email }}{{ user.expiresAt ? ' · vence ' + (user.expiresAt | date:'short') : '' }}</p>
            </div>
            <div class="flex items-center gap-3">
              <select class="field-input !h-9 max-w-[160px]" [ngModel]="user.role" (ngModelChange)="reassign(user, $event)">
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
              <button type="button" class="btn" [class]="user.isActive ? 'btn-secondary' : 'btn-primary'" (click)="toggle(user)">
                {{ user.isActive ? 'Desactivar' : 'Activar' }}
              </button>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class AdminUsersPage {
  private readonly adminApi = inject(AdminService);

  protected readonly users = signal<StaffUser[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly tempMessage = signal('');
  protected readonly nameFilter = signal('');

  protected readonly filteredUsers = computed(() => {
    const query = this.nameFilter().trim().toLowerCase();
    if (!query) return this.users();
    return this.users().filter(
      (user) => user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
    );
  });

  protected temp: { name: string; email: string; roleSlug: StaffRole; expiresAt: string } = {
    name: '',
    email: '',
    roleSlug: 'seller',
    expiresAt: '',
  };

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.users.set(await firstValueFrom(this.adminApi.listUsers()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar el equipo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async reassign(user: StaffUser, newRole: StaffRole): Promise<void> {
    await firstValueFrom(this.adminApi.reassignRole(user.id, newRole));
    this.load();
  }

  protected async toggle(user: StaffUser): Promise<void> {
    await firstValueFrom(this.adminApi.toggleUser(user.id, !user.isActive));
    this.load();
  }

  protected async createTemporary(): Promise<void> {
    this.tempMessage.set('');
    try {
      const response = await firstValueFrom(this.adminApi.createTemporaryUser({
        ...this.temp,
        expiresAt: new Date(this.temp.expiresAt).toISOString(),
      }));
      this.tempMessage.set(response.message);
      this.temp = { name: '', email: '', roleSlug: 'seller', expiresAt: '' };
      this.load();
    } catch (error) {
      this.tempMessage.set(error instanceof Error ? error.message : 'No fue posible crear la cuenta.');
    }
  }
}
