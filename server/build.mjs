import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export async function build() {
const root = new URL('../', import.meta.url);
const data = await readFile(new URL('data/questions.js', root), 'utf8');
const engine = await readFile(new URL('engine.js', root), 'utf8');
await mkdir(new URL('generated/', import.meta.url), { recursive: true });
await writeFile(new URL('generated/engine.mjs', import.meta.url), `${data}\n${engine}\nexport { createRecoverableGame };\n`);
console.log('Built server engine from shared engine.js and questions.js');

}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
