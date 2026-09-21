import { readFile, readdir } from 'node:fs/promises';
import { parseSnapshot } from '../src/contract.ts';

const root = new URL('../public/', import.meta.url);
const current = await parseSnapshot(await readFile(new URL('roadmap-status.json', root), 'utf8'));
let count = 0;
for (const day of await readdir(new URL('history/', root))) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid history path');
  for (const name of await readdir(new URL(`history/${day}/`, root))) {
    const snapshot = await parseSnapshot(await readFile(new URL(`history/${day}/${name}`, root), 'utf8'));
    if (name !== snapshot.snapshotId + '.json' || day !== snapshot.observedAt.slice(0, 10)) throw new Error('History identity mismatch');
    count++;
  }
}
await parseSnapshot(await readFile(new URL(`history/${current.observedAt.slice(0, 10)}/${current.snapshotId}.json`, root), 'utf8'));
console.log(`Validated current snapshot and ${count} immutable history artifact(s).`);
