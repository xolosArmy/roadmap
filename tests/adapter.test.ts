import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptSheetRows, sheetTimestamp } from '../src/adapter.ts';
import { canonicalJson } from '../src/contract.ts';
import { SOURCE_FIELDS } from '../src/policy.ts';
import { freeze, input, snapshot } from './helpers.ts';

for (const name of SOURCE_FIELDS) {
  test(`missing required header ${name} rejects entire input`, async () => {
    const source = input(); source.rows[0][source.rows[0].indexOf(name)] = 'other';
    await assert.rejects(adaptSheetRows(source.rows, source));
  });
  test(`duplicate required header ${name} rejects entire input`, async () => {
    const source = input(); source.rows[0].push(name);
    await assert.rejects(adaptSheetRows(source.rows, source));
  });
}
test('reordered headers and rows preserve exact serialized bytes', async () => {
  const source = input(); const expected = canonicalJson(await snapshot());
  source.rows = source.rows.map(row => [row[5], row[2], row[4], row[0], row[3], row[1]]);
  source.rows = [source.rows[0], ...source.rows.slice(1).reverse()];
  assert.equal(canonicalJson(await adaptSheetRows(source.rows, source)), expected);
});
test('extra operational columns never influence the public output', async () => {
  const source = input(); const expected = canonicalJson(await snapshot());
  const excluded = ['Work', 'Repo', 'HEAD', 'Active PR', 'Last Achievement', 'Current Gate', 'Blocker', 'Next Iteration', 'Prior Dependency', 'Enables', 'Evidence', 'Coordination Note'];
  source.rows[0].push(...excluded);
  for (const row of source.rows.slice(1)) row.push(...excluded.map(() => 'PRIVATE_CANARY_8f07'));
  assert.equal(canonicalJson(await adaptSheetRows(source.rows, source)), expected);
});
test('excluded identity does not allow its invalid values or duplicate rows into output', async () => {
  const source = input(); const expected = canonicalJson(await snapshot());
  source.rows.push(['unclassified-project', 'SECRET', 'HIGH', 'NONSENSE', 'BROKEN', 'yesterday']);
  source.rows.push([...source.rows.at(-1)!]);
  assert.equal(canonicalJson(await adaptSheetRows(source.rows, source)), expected);
});
test('adapter never reads excluded row fields or unknown columns', async () => {
  const source = input(); const row = ['unclassified-project'];
  Object.defineProperty(row, 1, { get() { throw new Error('PRIVATE_CANARY'); } }); source.rows.push(row);
  source.rows[0].push('unknown');
  Object.defineProperty(source.rows[1], 6, { get() { throw new Error('PRIVATE_CANARY'); } });
  assert.equal(canonicalJson(await adaptSheetRows(source.rows, source)), canonicalJson(await snapshot()));
});
test('one-character typo of a selected identity fails roster completeness', async () => {
  const source = input(); source.rows[1][0] += 'x'; await assert.rejects(adaptSheetRows(source.rows, source));
});
test('missing selected project is rejected', async () => {
  const source = input(); source.rows.pop(); await assert.rejects(adaptSheetRows(source.rows, source));
});
test('duplicate selected identity is rejected, not first-wins or last-wins', async () => {
  const source = input(); source.rows.push([...source.rows[1]]); await assert.rejects(adaptSheetRows(source.rows, source));
});
for (const header of ['project', ' Project', 'Prоject']) test(`lookalike header ${JSON.stringify(header)} is not authority`, async () => {
  const source = input(); source.rows[0][0] = header; await assert.rejects(adaptSheetRows(source.rows, source));
});
for (const [column, value] of [[1, 'Unknown phase'], [2, 'HIGH'], [3, 'ready'], [4, 'PASS '], [5, '2026-02-30 12:00']] as const) {
  test(`invalid selected value in column ${column} rejects candidate`, async () => {
    const source = input(); source.rows[1][column] = value; await assert.rejects(adaptSheetRows(source.rows, source));
  });
}
test('N/A does not become PASS or an assessment claim', async () => {
  const result = await snapshot(); assert.equal(result.projects.find(p => p.id === 'ecash-magazine')?.securityStatus, 'NOT_REPORTED');
});
test('reported PASS is explicitly labeled, never called secure', async () => {
  const result = await snapshot(); assert.equal(result.projects.find(p => p.id === 'tonalli-contracts')?.securityStatus, 'REPORTED_PASS');
});
test('real formatted Sheet timestamps convert using Mexico City zone', () => {
  assert.equal(sheetTimestamp('2026-09-20 11:28'), '2026-09-20T17:28:00Z');
  assert.equal(sheetTimestamp('2026-08-24 18:00:00'), '2026-08-25T00:00:00Z');
});
test('historical Mexico City DST fold and gap are rejected', () => {
  assert.throws(() => sheetTimestamp('2021-10-31 01:30'));
  assert.throws(() => sheetTimestamp('2021-04-04 02:30'));
});
test('host timezone never influences parsing', () => {
  const previous = process.env.TZ;
  try { process.env.TZ = 'Pacific/Auckland'; assert.equal(sheetTimestamp('2026-09-20 11:28'), '2026-09-20T17:28:00Z'); }
  finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test('deep-frozen source and options remain unchanged', async () => {
  const source = freeze(input()); const before = JSON.stringify(source);
  await adaptSheetRows(source.rows, source); assert.equal(JSON.stringify(source), before);
});
for (const value of [null, {}, [], [['Project']], [null], [['Project'], {}]]) test(`malformed input ${JSON.stringify(value)} fails generically`, async () => {
  await assert.rejects(adaptSheetRows(value, input()), { message: 'PUBLIC_ROADMAP_INVALID' });
});
test('short selected row is rejected', async () => {
  const source = input(); source.rows[1] = [source.rows[1][0]]; await assert.rejects(adaptSheetRows(source.rows, source));
});
test('sparse selected row is rejected', async () => {
  const source = input(); delete source.rows[1][3]; await assert.rejects(adaptSheetRows(source.rows, source));
});
test('generation time must be explicit and no earlier than observation', async () => {
  const source = input(); source.generatedAt = ''; await assert.rejects(adaptSheetRows(source.rows, source));
  source.generatedAt = '2026-01-01T00:00:00Z'; await assert.rejects(adaptSheetRows(source.rows, source));
});
