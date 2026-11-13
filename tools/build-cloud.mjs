import { cp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'dist');
const { build } = await import('../server/build.mjs');
if (typeof build === 'function') await build();
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['index.html', 'styles.css', 'app.js', 'engine.js', 'diagnostics.js', 'cloud-transport.js',
  'sw.js', 'sw-register.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'icon.svg', 'og.jpg', 'audio', 'chars', 'data', 'fonts', 'src', 'ui', 'vendor']) {
  await cp(path.join(root, name), path.join(out, name), { recursive: true });
}
await writeFile(path.join(out, 'runtime-config.js'),
  '// Public endpoints only; never put credentials here.\n' +
  'globalThis.TAVERN_CLOUD = Object.freeze({apiOrigin:location.origin,publicUrl:location.origin+"/"});\n');
await writeFile(path.join(out, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: DENY
/runtime-config.js
  Cache-Control: no-store
/sw.js
  Cache-Control: no-cache
`);
let index = await readFile(path.join(out, 'index.html'), 'utf8');
index = index.replace('<script src="vendor/peerjs.min.js"></script>', '').replace(/connect-src [^;]+;/, "connect-src 'self' wss://*.workers.dev;");
await writeFile(path.join(out, 'index.html'), index);
if (!index.includes('runtime-config.js') || !index.includes('cloud-transport.js')) throw new Error('Cloud transport missing from HTML');
for (const privatePath of ['server', '.git', '.env', 'android', 'package.json']) {
  try { await access(path.join(out, privatePath)); throw new Error('Private source copied: ' + privatePath); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
}
console.log('Cloudflare static assets prepared in dist; authoritative server configured.');
