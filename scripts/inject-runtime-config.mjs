// Sustituye la URL del backend en el index.html ya compilado, usando la variable de entorno
// PALOMA_API_URL definida en el proveedor de hosting (ej. Vercel). Angular no expone variables
// de entorno de Node al bundle del navegador, así que este paso corre después de `ng build`
// y reescribe el `window.PALOMA_CONFIG.apiUrl` que ya trae src/index.html.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const apiUrl = process.env.PALOMA_API_URL;

if (!apiUrl) {
  console.log('[inject-runtime-config] PALOMA_API_URL no está definida; se conserva el valor de src/index.html.');
  process.exit(0);
}

const browserDir = join(process.cwd(), 'dist', 'paloma-mensajera', 'browser');

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry === 'index.html') patch(full);
  }
}

function patch(file) {
  const html = readFileSync(file, 'utf8');
  const patched = html.replace(/apiUrl:\s*'[^']*'/, `apiUrl: '${apiUrl}'`);
  if (patched === html) {
    console.warn(`[inject-runtime-config] No se encontró el marcador apiUrl en ${file}; revisa src/index.html.`);
    return;
  }
  writeFileSync(file, patched);
  console.log(`[inject-runtime-config] apiUrl -> ${apiUrl} (${file})`);
}

walk(browserDir);
