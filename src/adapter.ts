import { CATALOG, CATALOG_VERSION, CONTRACT_VERSION, SOURCE_FIELDS, SECURITY_MAP } from './policy.ts';
import type { PublicProject, Snapshot, UnsignedSnapshot } from './policy.ts';
import { invalid, snapshotDigest, utcTimestamp, validateSnapshot } from './contract.ts';

const zone = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** Formatted Sheet DATE_TIME, explicit zone, including rejection of historical DST folds/gaps. */
export function sheetTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(value)) return invalid();
  const local = value.length === 16 ? value + ':00' : value;
  const base = utcTimestamp(local.replace(' ', 'T') + 'Z');
  const matches: string[] = [];
  // Mexico City offsets in the accepted 2000-2099 interval are integral hours.
  // Search rather than using the workstation zone or assuming a permanent UTC offset.
  for (let hours = -14; hours <= 14; hours++) {
    const candidate = new Date(base + hours * 3_600_000);
    const parts = Object.fromEntries(zone.formatToParts(candidate).map(p => [p.type, p.value]));
    const formatted = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    if (formatted === local) matches.push(candidate.toISOString().replace('.000Z', 'Z'));
  }
  if (matches.length !== 1) return invalid();
  return matches[0];
}

function cell(row: unknown[], index: number): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(row, index);
  if (!descriptor || !('value' in descriptor)) return invalid();
  return descriptor.value;
}

export async function adaptSheetRows(rows: unknown, options: { generatedAt: string; observedAt: string }): Promise<Snapshot> {
  try {
    const generatedAt = options.generatedAt;
    const observedAt = options.observedAt;
    utcTimestamp(generatedAt); utcTimestamp(observedAt);
    if (!Array.isArray(rows) || rows.length < 2 || rows.length > 10_001 || !Array.isArray(rows[0])) return invalid();
    const headers = rows[0] as unknown[];
    if (headers.length > 256) return invalid();
    const columns = SOURCE_FIELDS.map(name => {
      let found = -1;
      for (let i = 0; i < headers.length; i++) {
        if (cell(headers, i) === name) { if (found !== -1) return invalid(); found = i; }
      }
      if (found < 0) return invalid();
      return found;
    });
    const projects = new Map<string, PublicProject>();
    for (let n = 1; n < rows.length; n++) {
      const row = cell(rows, n);
      if (!Array.isArray(row)) return invalid();
      if (row.length === 0) continue; // Blank transport row, never a public project.
      const projectValue = cell(row, columns[0]);
      const entry = CATALOG.find(p => p.source === projectValue);
      // Deny by default. Never read, count, validate, diagnose or emit other fields for excluded identities.
      if (!entry) continue;
      if (projects.has(entry.id)) return invalid();
      const values = columns.slice(1).map(c => cell(row, c));
      if (values.some(v => typeof v !== 'string')) return invalid();
      const [phase, priority, status, rawSecurity, date] = values as string[];
      if (!Object.hasOwn(SECURITY_MAP, rawSecurity)) return invalid();
      projects.set(entry.id, {
        id: entry.id, name: entry.name, phase, priority, status,
        securityStatus: SECURITY_MAP[rawSecurity as keyof typeof SECURITY_MAP], lastUpdate: sheetTimestamp(date),
      });
    }
    const unsigned: UnsignedSnapshot = {
      contractVersion: CONTRACT_VERSION, catalogVersion: CATALOG_VERSION,
      generatedAt, observedAt, projects: CATALOG.map(p => projects.get(p.id) ?? invalid()),
    };
    return await validateSnapshot({ ...unsigned, snapshotId: await snapshotDigest(unsigned) });
  } catch { return invalid(); }
}
