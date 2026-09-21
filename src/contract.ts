import structuralValidation from '../generated/snapshot-validator.mjs';
import { CATALOG, MAX_SNAPSHOT_BYTES } from './policy.ts';
import type { Snapshot, UnsignedSnapshot } from './policy.ts';

/** Never include raw input, validator details, IDs or private row counts in errors. */
export function invalid(): never { throw new Error('PUBLIC_ROADMAP_INVALID'); }

export function utcTimestamp(value: unknown): number {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return invalid();
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString() !== value.replace('Z', '.000Z')) return invalid();
  return epoch;
}

export function canonicalJson(value: unknown): string {
  function normalize(input: unknown): unknown {
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (Array.isArray(input)) return input.map(normalize);
    if (typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype) return invalid();
    const output: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(input).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) return invalid();
      output[key] = normalize(descriptor.value);
    }
    return output;
  }
  try { return JSON.stringify(normalize(value)) + '\n'; } catch { return invalid(); }
}

export async function snapshotDigest(value: UnsignedSnapshot): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}

export async function validateSnapshot(input: unknown): Promise<Snapshot> {
  try {
    // Copy before awaits so a caller cannot swap validated values during hashing.
    const text = canonicalJson(input);
    if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) return invalid();
    const copy: unknown = JSON.parse(text);
    if (!structuralValidation(copy)) return invalid();
    const snapshot = copy as Snapshot;
    const generated = utcTimestamp(snapshot.generatedAt);
    const observed = utcTimestamp(snapshot.observedAt);
    if (generated < observed) return invalid();
    for (let i = 0; i < CATALOG.length; i++) {
      const project = snapshot.projects[i];
      const catalog = CATALOG[i];
      // Exact sorted roster also rejects missing, duplicate, unknown and ambiguous identity.
      if (project.id !== catalog.id || project.name !== catalog.name) return invalid();
      if (utcTimestamp(project.lastUpdate) > observed) return invalid();
    }
    const { snapshotId, ...unsigned } = snapshot;
    if (await snapshotDigest(unsigned) !== snapshotId) return invalid();
    for (const project of snapshot.projects) Object.freeze(project);
    Object.freeze(snapshot.projects);
    return Object.freeze(snapshot);
  } catch { return invalid(); }
}

export async function parseSnapshot(text: string): Promise<Snapshot> {
  try {
    if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) return invalid();
    const validated = await validateSnapshot(JSON.parse(text));
    // Byte-level canonical encoding excludes duplicate JSON keys and ambiguous representations.
    if (text !== canonicalJson(validated)) return invalid();
    return validated;
  } catch { return invalid(); }
}
