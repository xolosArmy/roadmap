import { readFileSync } from 'node:fs';
import { adaptSheetRows } from '../src/adapter.ts';
import { snapshotDigest } from '../src/contract.ts';
import type { Snapshot } from '../src/policy.ts';

export interface Input { generatedAt: string; observedAt: string; rows: string[][] }
export function input(): Input {
  return JSON.parse(readFileSync(new URL('../examples/publication-input.json', import.meta.url), 'utf8'));
}
export async function snapshot(): Promise<Snapshot> {
  const source = input(); return adaptSheetRows(source.rows, source);
}
export async function changed(change: (copy: Snapshot) => void): Promise<Snapshot> {
  const copy: Snapshot = structuredClone(await snapshot()); change(copy);
  const unsigned = { ...copy }; Reflect.deleteProperty(unsigned, 'snapshotId');
  copy.snapshotId = await snapshotDigest(unsigned);
  return copy;
}
export function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}
