// Sustituye valores de configuración en el index.html ya compilado, usando variables de entorno
// definidas en el proveedor de hosting (ej. Vercel). Angular no expone variables de entorno de
// Node al bundle del navegador, así que este paso corre después de `ng build` y reescribe los
// campos de `window.PALOMA_CONFIG` que ya trae src/index.html.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPLACEMENTS = [
  { key: 'apiUrl', env: 'PALOMA_API_URL' },
  { key: 'nequiPhone', env: 'PALOMA_NEQUI_PHONE' },
];

const browserDir = join(process.cwd(), 'dist', 'paloma-mensajera', 'browser');

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry === 'index.html') patch(full);
  }
}

function patch(file) {
  let html = readFileSync(file, 'utf8');
  let changed = false;

  for (const { key, env } of REPLACEMENTS) {
    const value = process.env[env];
    if (!value) {
      console.log(`[inject-runtime-config] ${env} no está definida; se conserva el valor de src/index.html para "${key}".`);
      continue;
    }
    const pattern = new RegExp(`${key}:\\s*'[^']*'`);
    const patched = html.replace(pattern, `${key}: '${value}'`);
    if (patched === html) {
      console.warn(`[inject-runtime-config] No se encontró el marcador "${key}" en ${file}; revisa src/index.html.`);
      continue;
    }
    html = patched;
    changed = true;
    console.log(`[inject-runtime-config] ${key} -> ${value} (${file})`);
  }

  if (changed) writeFileSync(file, html);
}

walk(browserDir);
