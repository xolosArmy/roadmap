import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, parseSnapshot, validateSnapshot } from '../src/contract.ts';
import { MAX_SNAPSHOT_BYTES, SCHEMA } from '../src/policy.ts';
import { changed, snapshot } from './helpers.ts';

test('valid snapshot satisfies structure, exact public roster, chronology and digest', async () => {
  const value = await snapshot(); assert.equal((await validateSnapshot(value)).projects.length, 8);
  assert.equal((await parseSnapshot(canonicalJson(value))).snapshotId, value.snapshotId);
});

const invalidCases: [string, Parameters<typeof changed>[0]][] = [
  ['unsupported contract', s => { s.contractVersion = 'other/1'; }],
  ['unsupported catalog', s => { s.catalogVersion = 'other'; }],
  ['duplicate project', s => { s.projects[1] = s.projects[0]; }],
  ['unknown project', s => { s.projects[0].id = 'unlisted'; }],
  ['missing public project', s => { s.projects.pop(); }],
  ['wrong name bound to known ID', s => { s.projects[0].name = s.projects[1].name; }],
  ['unknown phase', s => { s.projects[0].phase = 'Secret phase'; }],
  ['unknown priority', s => { s.projects[0].priority = 'HIGH'; }],
  ['unknown status', s => { s.projects[0].status = 'READY'; }],
  ['unsupported security claim', s => { s.projects[0].securityStatus = 'SECURE'; }],
  ['invalid calendar date', s => { s.projects[0].lastUpdate = '2026-02-30T00:00:00Z'; }],
  ['timezone-less date', s => { s.projects[0].lastUpdate = '2026-08-20T00:00:00'; }],
  ['date beyond observation', s => { s.projects[0].lastUpdate = '2027-01-01T00:00:00Z'; }],
  ['generation before observation', s => { s.generatedAt = '2026-01-01T00:00:00Z'; }],
  ['unsorted projects', s => { s.projects.reverse(); }],
  ['extra root field', s => { Reflect.set(s, 'internal', 'private payload'); }],
  ['extra project field', s => { Reflect.set(s.projects[0], 'Blocker', 'private payload'); }],
  ['nested private URL', s => { Reflect.set(s.projects[0], 'repoUrl', 'https://github.com/example/private-engine'); }],
  ['malformed URL', s => { Reflect.set(s.projects[0], 'url', 'javascript:alert(1)'); }],
  ['public URL is also outside v1 schema', s => { Reflect.set(s.projects[0], 'url', 'https://example.org/'); }],
  ['unknown dependency', s => { Reflect.set(s.projects[0], 'dependencies', ['unlisted']); }],
  ['duplicate dependencies', s => { Reflect.set(s.projects[0], 'dependencies', ['tonalli-wallet', 'tonalli-wallet']); }],
  ['evidence object outside v1', s => { Reflect.set(s.projects[0], 'evidence', { verified: true }); }],
  ['false canonical remote claim', s => { Reflect.set(s, 'canonicalRemote', true); }],
];
for (const [name, change] of invalidCases) test(`${name} is rejected even with recomputed integrity`, async () => {
  await assert.rejects(validateSnapshot(await changed(change)), { message: 'PUBLIC_ROADMAP_INVALID' });
});

test('tampered digest is rejected', async () => {
  const value = structuredClone(await snapshot()); value.snapshotId = '0'.repeat(64);
  await assert.rejects(validateSnapshot(value));
});
test('prototype pollution field rejected without changing Object.prototype', async () => {
  const value = await snapshot(); const parsed = JSON.parse(canonicalJson(value).replace('{', '{"__proto__":{"polluted":true},'));
  await assert.rejects(validateSnapshot(parsed)); assert.equal(Reflect.get({}, 'polluted'), undefined);
});
test('canonical serialized form rejects duplicate keys', async () => {
  const text = canonicalJson(await snapshot());
  await assert.rejects(parseSnapshot(text.replace('{', '{"contractVersion":"xolosarmy-public-roadmap/1.0.0",')));
});
test('truncated or noncanonical JSON is rejected', async () => {
  const text = canonicalJson(await snapshot());
  await assert.rejects(parseSnapshot(text.slice(0, -10)));
  await assert.rejects(parseSnapshot(' ' + text));
});
test('oversized data rejected', async () => { await assert.rejects(parseSnapshot(' '.repeat(MAX_SNAPSHOT_BYTES + 1))); });
test('schema is closed at both public object boundaries', () => {
  assert.equal(SCHEMA.additionalProperties, false);
  assert.equal(SCHEMA.properties.projects.items.additionalProperties, false);
});
test('validation returns an independent immutable object', async () => {
  const source = structuredClone(await snapshot()); const result = await validateSnapshot(source);
  source.projects[0].name = 'Changed'; assert.notEqual(result.projects[0].name, 'Changed');
  assert.throws(() => { result.projects[0].status = 'ACTIVE'; });
});
test('raw validation errors never include hostile content', async () => {
  const value = await changed(s => { s.projects[0].name = 'PRIVATE_CANARY_8f07'; });
  await assert.rejects(validateSnapshot(value), error => {
    assert.equal((error as Error).message, 'PUBLIC_ROADMAP_INVALID'); return true;
  });
});
