import { readFile, mkdir, writeFile, readdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { parseSnapshot } from '../src/contract.ts';
import { renderShell } from '../src/shell.ts';
import { checkArtifacts } from './compile-contract.mjs';

await checkArtifacts();
const bytes = await readFile('public/roadmap-status.json', 'utf8');
await parseSnapshot(bytes);
const history: [string, string][] = [];
for (const day of (await readdir('public/history')).sort()) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid history directory');
  for (const name of (await readdir(path.join('public/history', day))).sort()) {
    const data = await readFile(path.join('public/history', day, name), 'utf8');
    const item = await parseSnapshot(data);
    if (day !== item.observedAt.slice(0, 10) || name !== item.snapshotId + '.json') throw new Error('Invalid history identity');
    history.push([`history/${day}/${name}`, data]);
  }
}
// Build only from an explicit asset list. Raw source exports can never be copied wholesale.
await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
await writeFile('dist/index.html', await renderShell(), 'utf8');
await writeFile('dist/roadmap-status.json', bytes, 'utf8');
await copyFile('schemas/roadmap-status.schema.json', 'dist/schema.json');
await copyFile('web/style.css', 'dist/assets/style.css');
await copyFile('web/favicon.svg', 'dist/assets/favicon.svg');
for (const [relative, data] of history) {
  await mkdir(path.dirname(path.join('dist', relative)), { recursive: true });
  await writeFile(path.join('dist', relative), data, 'utf8');
}
await build({ entryPoints: ['src/main.ts'], outfile: 'dist/assets/app.js', bundle: true, minify: true, sourcemap: false, format: 'esm', target: 'es2022', legalComments: 'none' });
const files: string[] = [];
async function visit(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(full); else if (entry.isFile()) files.push(full);
  }
}
await visit('dist');
const integrity: Record<string, string> = {};
for (const file of files.sort()) integrity[file.slice(5)] = createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile('dist/build-integrity.json', JSON.stringify(integrity, null, 2) + '\n');
console.log(`Built ${files.length} static files for /roadmap/. No deployment performed.`);
