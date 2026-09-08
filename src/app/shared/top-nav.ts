import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { UserRole } from '../core/api.models';
import { Icon } from './icon';

interface NavLink { path: string; label: string; }

const ROLE_LABEL: Record<UserRole, string> = { admin: 'Administrador', seller: 'Vendedor', comprador: 'Comprador' };

@Component({
  selector: 'app-top-nav',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <header class="sticky top-0 z-10 border-b border-border-soft bg-bg-surface-elevated/90 backdrop-blur-md">
      <div class="flex min-h-[64px] items-center justify-between gap-4 px-4 sm:px-6">
        <a [routerLink]="homePath()" class="flex shrink-0 items-center gap-2.5 text-[13px] font-semibold text-text-primary">
          <img src="assets/logos/paloma-mensajera.png" alt="" class="h-8 w-8 object-contain sm:h-9 sm:w-9" />
          <span class="hidden sm:inline">Paloma Mensajera</span>
        </a>

        <nav class="hidden flex-1 items-center gap-1 overflow-x-auto sm:flex" aria-label="Navegación de la aplicación">
          @for (link of links(); track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="!bg-brand-magenta/10 !text-brand-magenta"
              class="whitespace-nowrap rounded-[var(--radius-sm)] px-3.5 py-2 text-[13px] font-medium text-text-secondary transition hover:bg-bg-base hover:text-text-primary"
            >{{ link.label }}</a>
          }
        </nav>

        <div class="hidden items-center gap-3 sm:flex">
          <div class="text-right leading-tight">
            <p class="text-[13px] font-medium text-text-primary">{{ auth.session()?.user?.name }}</p>
            <p class="text-[11px] text-text-secondary">{{ roleLabel() }}</p>
          </div>
          <button type="button" class="btn-ghost !px-3 !py-1.5 text-[13px]" (click)="logout()">Salir</button>
        </div>

        <button
          type="button"
          class="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-text-primary transition hover:bg-bg-base sm:hidden"
          [attr.aria-expanded]="menuOpen()"
          aria-label="Abrir menú de navegación"
          (click)="menuOpen.set(!menuOpen())"
        >
          <app-icon [name]="menuOpen() ? 'close' : 'menu'" [size]="22" />
        </button>
      </div>

      @if (menuOpen()) {
        <nav class="paloma-enter flex flex-col gap-1 border-t border-border-soft px-4 py-3 sm:hidden" aria-label="Navegación de la aplicación (móvil)">
          @for (link of links(); track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="!bg-brand-magenta/10 !text-brand-magenta"
              class="rounded-[var(--radius-sm)] px-3.5 py-2.5 text-[15px] font-medium text-text-secondary transition"
              (click)="menuOpen.set(false)"
            >{{ link.label }}</a>
          }
          <div class="mt-2 flex items-center justify-between border-t border-border-soft pt-3">
            <div class="leading-tight">
              <p class="text-[13px] font-medium text-text-primary">{{ auth.session()?.user?.name }}</p>
              <p class="text-[11px] text-text-secondary">{{ roleLabel() }}</p>
            </div>
            <button type="button" class="btn-ghost !px-3 !py-1.5 text-[13px]" (click)="logout()">Salir</button>
          </div>
        </nav>
      }
    </header>
  `,
})
export class TopNav {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);

  protected links(): NavLink[] {
    if (this.auth.hasRole('admin')) {
      return [
        { path: '/admin/pedidos', label: 'Pedidos' },
        { path: '/admin/sorteo', label: 'Sorteo' },
        { path: '/admin/usuarios', label: 'Usuarios' },
        { path: '/admin/productos', label: 'Catálogo' },
        { path: '/admin/acompanantes', label: 'Acompañantes' },
        { path: '/admin/metricas', label: 'Métricas' },
      ];
    }
    if (this.auth.hasRole('seller')) {
      return [
        { path: '/vendedor/mensajes', label: 'Dedicatorias' },
        { path: '/vendedor/entregas', label: 'Entregas' },
      ];
    }
    const links: NavLink[] = [{ path: '/catalogo', label: 'Catálogo' }];
    const lastOrderId = this.lastOrderId();
    if (lastOrderId) links.push({ path: `/pedidos/${lastOrderId}`, label: 'Mi pedido' });
    return links;
  }

  protected roleLabel(): string {
    const role = this.auth.session()?.roleSlug as UserRole | undefined;
    return role ? ROLE_LABEL[role] : '';
  }

  protected homePath(): string {
    const role = this.auth.session()?.roleSlug as UserRole | undefined;
    return role === 'admin' ? '/admin/pedidos' : role === 'seller' ? '/vendedor/mensajes' : '/catalogo';
  }

  private lastOrderId(): string | null {
    try { return localStorage.getItem('paloma_last_order_id'); } catch { return null; }
  }

  protected logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
