# Prueba manual: sesión/rol cacheado obsoleto (2026-09-09)

## Bug original

`AuthService` decodifica el JWT una sola vez al login y cachea
`roleSlug`/`permissions` en `sessionStorage`, sin revalidarlos nunca. Un
cambio de rol hecho por un admin no se reflejaba hasta que el usuario
afectado hacía logout + login manual.

Reportado por la sesión de backend (`paloma-mensajera-backend-07`), que
confirmó que el backend (`JwtStrategy.validate`) siempre re-consulta el rol
vigente en la BD y nunca confía en los claims del token — el problema era
100% frontend.

## Fixes implementados

- `src/app/core/auth.interceptor.ts` — cualquier 401/403 de respuesta
  dispara `AuthService.logout()` + redirect a `/` (commit `f84b916`).
- `src/app/core/auth.service.ts` (`refreshSession`) + `app.config.ts`
  (`provideAppInitializer`) — revalida contra `GET /auth/me` antes de que
  corran las guards de rutas al arrancar/recargar la app (commit `c3d48cf`).

## Prueba end-to-end en navegador

Backend real en `localhost:3000` (SQLite local, seed aplicado) + frontend
con `ng serve` en `localhost:4200`, controlados con Playwright headless.
Credenciales: `admin@escuelaing.edu.co` (admin) y
`vendedor.prueba@escuelaing.edu.co` (seller de prueba).

### Escenario A — revalidación al recargar (fix #2)

1. Login como vendedor → aterriza en `/vendedor/mensajes`.
2. Admin cambia su rol a "comprador" desde `/admin/usuarios` (UI real).
3. Sin re-loguear, se recarga la pestaña del vendedor → `GET /auth/me` se
   ejecuta en el `appInitializer` antes de las guards → queda redirigido a
   `/` solo, ya no puede seguir en la página de vendedor.

### Escenario B — logout forzado en caliente (fix #3)

1. Admin revierte el rol a "seller", el vendedor vuelve a loguear.
2. Admin le cambia el rol a "comprador" de nuevo.
3. Sin recargar, el vendedor hace clic en "Buscar" (dispara
   `GET /orders?view=message`) → el backend responde 403 → el interceptor
   limpia `sessionStorage` (confirmado `null` vía `sessionStorage.getItem`)
   y redirige a `/`.

Ambos escenarios terminan en la landing page mostrando "Ingresar" (sesión
realmente cerrada). Sin errores de consola inesperados — solo el 403
esperado, que es la señal que dispara el fix.

## Resultado

Los 3 puntos del bug reportado quedan verificados end-to-end contra un
backend real, no solo por tipos/build.
