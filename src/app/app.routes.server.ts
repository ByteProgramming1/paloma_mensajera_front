import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    // El resto de la aplicación depende de la sesión guardada en sessionStorage/localStorage
    // (auth, carrito, último pedido), por lo que se sirve como CSR puro.
    path: '**',
    renderMode: RenderMode.Client,
  },
];
