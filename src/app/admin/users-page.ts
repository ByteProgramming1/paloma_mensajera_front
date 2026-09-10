import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { StaffRole, StaffUser, UserRole } from '../core/api.models';
import { AdminService } from '../core/admin.service';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-admin-users-page',
  imports: [FormsModule, DatePipe, Icon],
  template: `
    <h1 class="page-title mb-1">Roles y turnos</h1>
    <p class="page-lede mb-8">Reasigna o desactiva a cualquier persona por su correo para acomodar la rotación de turnos, sin crear cuentas nuevas.</p>

    <div class="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div class="order-2 lg:order-1">
        <label class="field mb-4 max-w-[320px]">
          <span class="field-label">Buscar por nombre o correo</span>
          <div class="relative">
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input class="field-input pl-9" [ngModel]="nameFilter()" (ngModelChange)="nameFilter.set($event)" name="nameFilter" placeholder="Ej. Astrih González" />
          </div>
        </label>

        @if (errorMessage()) { <p class="field-error mb-4">{{ errorMessage() }}</p> }
        @if (isLoading()) {
          <p class="text-text-secondary">Cargando…</p>
        } @else if (filteredUsers().length === 0) {
          <p class="field-hint">No se encontró nadie con ese nombre o correo.</p>
        } @else {
          <ul class="flex flex-col gap-3">
            @for (user of filteredUsers(); track user.id) {
              <li class="card-surface flex flex-wrap items-center justify-between gap-4 p-4">
                <div class="flex items-center gap-3">
                  <span
                    class="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-text-on-accent"
                    [class]="user.isActive ? 'bg-brand-magenta' : 'bg-text-secondary'"
                  >{{ initialsOf(user.fullName) }}</span>
                  <div>
                    <p class="font-semibold text-text-primary">{{ user.fullName }}</p>
                    <p class="field-hint">{{ user.email }}{{ user.expiresAt ? ' · cuenta vence ' + (user.expiresAt | date:'short') : '' }}{{ user.roleExpiresAt ? ' · rol vence ' + (user.roleExpiresAt | date:'short') : '' }}</p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <select class="field-input !h-9 max-w-[160px]" [ngModel]="pendingRole(user)?.role ?? user.role" (ngModelChange)="prepareReassign(user, $event)">
                    <option value="comprador">Comprador</option>
                    <option value="seller">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                  @if (pendingRole(user); as pending) {
                    <input class="field-input !h-9" type="datetime-local" [min]="minRoleDateTime" [(ngModel)]="pending.expiresAt" />
                    <button type="button" class="btn-primary" (click)="confirmReassign(user)">Confirmar</button>
                    <button type="button" class="btn-ghost" (click)="cancelReassign(user)">Cancelar</button>
                  }
                  <button type="button" class="btn" [class]="user.isActive ? 'btn-secondary' : 'btn-primary'" (click)="toggle(user)">
                    {{ user.isActive ? 'Desactivar' : 'Activar' }}
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </div>

      <aside class="order-1 lg:sticky lg:top-6 lg:order-2 lg:h-fit">
        <section class="card-surface p-6">
          <h2 class="section-title mb-4">Crear cuenta temporal de staff</h2>
          <form class="flex flex-col gap-4" (ngSubmit)="createTemporary()">
            <label class="field">
              <span class="field-label field-required">Nombre</span>
              <input class="field-input" required [(ngModel)]="temp.name" name="name" />
            </label>
            <label class="field">
              <span class="field-label field-required">Correo institucional</span>
              <input class="field-input" type="email" required [(ngModel)]="temp.email" name="email" />
            </label>
            <label class="field">
              <span class="field-label field-required">Rol</span>
              <select class="field-input" [(ngModel)]="temp.roleSlug" name="roleSlug">
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <label class="field">
              <span class="field-label field-required">Vence el</span>
              <input class="field-input" type="datetime-local" required [(ngModel)]="temp.expiresAt" name="expiresAt" />
            </label>
            <button type="submit" class="btn-primary">Crear cuenta</button>
          </form>
          @if (tempMessage()) { <p class="field-hint mt-3">{{ tempMessage() }}</p> }
        </section>
      </aside>
    </div>

    @if (successMessage()) {
      <div class="paloma-enter pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end">
        <div class="pointer-events-auto flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-status-entregado/30 bg-bg-surface-elevated px-4 py-3 text-[13px] font-medium text-status-entregado shadow-[0_4px_12px_rgba(41,20,33,0.08),0_20px_44px_-16px_rgba(41,20,33,0.28)]">
          <app-icon name="check" [size]="16" [strokeWidth]="2.5" />
          {{ successMessage() }}
        </div>
      </div>
    }
  `,
})
export class AdminUsersPage {
  private readonly adminApi = inject(AdminService);

  protected readonly users = signal<StaffUser[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly tempMessage = signal('');
  protected readonly successMessage = signal('');
  private successTimeout?: ReturnType<typeof setTimeout>;
  protected readonly nameFilter = signal('');

  protected readonly filteredUsers = computed(() => {
    const query = this.nameFilter().trim().toLowerCase();
    if (!query) return this.users();
    return this.users().filter(
      (user) => user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
    );
  });
  protected readonly pendingRoles = signal<Record<string, { role: UserRole; expiresAt: string }>>({});
  protected readonly minRoleDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

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

  protected initialsOf(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected pendingRole(user: StaffUser): { role: UserRole; expiresAt: string } | undefined {
    return this.pendingRoles()[user.id];
  }

  protected prepareReassign(user: StaffUser, newRole: UserRole): void {
    this.pendingRoles.update((pending) => ({
      ...pending,
      [user.id]: { role: newRole, expiresAt: '' },
    }));
  }

  protected async confirmReassign(user: StaffUser): Promise<void> {
    const pending = this.pendingRole(user);
    if (!pending?.expiresAt) {
      this.errorMessage.set('Selecciona hasta qué fecha estará vigente el nuevo rol.');
      return;
    }

    this.errorMessage.set('');
    try {
      await firstValueFrom(this.adminApi.reassignRole(user.id, pending.role, new Date(pending.expiresAt).toISOString()));
      this.pendingRoles.update(({ [user.id]: _removed, ...remaining }) => remaining);
      await this.load();
      this.announceSuccess('Rol actualizado.');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cambiar el rol.');
    }
  }

  protected cancelReassign(user: StaffUser): void {
    this.pendingRoles.update(({ [user.id]: _removed, ...remaining }) => remaining);
  }

  protected async toggle(user: StaffUser): Promise<void> {
    const activating = !user.isActive;
    this.errorMessage.set('');
    try {
      await firstValueFrom(this.adminApi.toggleUser(user.id, activating));
      await this.load();
      this.announceSuccess(activating ? 'Usuario activado.' : 'Usuario desactivado.');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible actualizar el usuario.');
    }
  }

  private announceSuccess(message: string): void {
    clearTimeout(this.successTimeout);
    this.successMessage.set(message);
    this.successTimeout = setTimeout(() => this.successMessage.set(''), 3000);
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
