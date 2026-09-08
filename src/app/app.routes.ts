import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/role.guard';
import { AppShell } from './shared/app-shell';
import { LandingPage } from './landing/landing-page';
import { CatalogPage } from './buyer/catalog-page';
import { CheckoutPage } from './buyer/checkout-page';
import { OrderStatusPage } from './buyer/order-status-page';
import { RafflePage } from './buyer/raffle-page';
import { MessagesQueuePage } from './seller/messages-queue-page';
import { DeliveriesPage } from './seller/deliveries-page';
import { AdminOrdersPage } from './admin/orders-page';
import { AdminRaffleDrawPage } from './admin/raffle-draw-page';
import { AdminUsersPage } from './admin/users-page';
import { AdminProductsPage } from './admin/products-page';
import { AdminMetricsPage } from './admin/metrics-page';
import { AdminAddOnGroupsPage } from './admin/addon-groups-page';

export const routes: Routes = [
  { path: '', component: LandingPage },
  {
    path: '',
    component: AppShell,
    canActivateChild: [authGuard],
    children: [
      { path: 'catalogo', component: CatalogPage },
      { path: 'comprar', component: CheckoutPage },
      { path: 'pedidos/:id', component: OrderStatusPage },
      { path: 'pedidos/:id/rifa', component: RafflePage },
      { path: 'vendedor/mensajes', component: MessagesQueuePage, canActivate: [roleGuard(['seller', 'admin'])] },
      { path: 'vendedor/entregas', component: DeliveriesPage, canActivate: [roleGuard(['seller', 'admin'])] },
      { path: 'admin/pedidos', component: AdminOrdersPage, canActivate: [roleGuard(['admin'])] },
      { path: 'admin/sorteo', component: AdminRaffleDrawPage, canActivate: [roleGuard(['admin'])] },
      { path: 'admin/usuarios', component: AdminUsersPage, canActivate: [roleGuard(['admin'])] },
      { path: 'admin/productos', component: AdminProductsPage, canActivate: [roleGuard(['admin'])] },
      { path: 'admin/acompanantes', component: AdminAddOnGroupsPage, canActivate: [roleGuard(['admin'])] },
      { path: 'admin/metricas', component: AdminMetricsPage, canActivate: [roleGuard(['admin'])] },
    ],
  },
  { path: '**', redirectTo: '' },
];
