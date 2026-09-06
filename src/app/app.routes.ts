import { Routes } from '@angular/router';

// Views components
import { Home } from './pages/home/home';
import { Catalog } from './pages/catalog/catalog';
import { Orders } from './pages/orders/orders';
import { Cart } from './pages/cart/cart';

export const routes: Routes = [
    { path: "", component: Home },
    { path: "catalog", component: Catalog },
    { path: "cart", component: Cart },
    { path: "orders", component: Orders }
];
