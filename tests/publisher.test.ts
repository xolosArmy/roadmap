import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { publishSnapshot } from '../src/publisher.ts';
import { canonicalJson, parseSnapshot } from '../src/contract.ts';
import { changed, snapshot } from './helpers.ts';

function directory(t: { after: (fn: () => void) => void }) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'roadmap-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root;
}
function current(root: string) { return fs.readFileSync(path.join(root, 'roadmap-status.json'), 'utf8'); }
function archive(root: string, value: Awaited<ReturnType<typeof snapshot>>) {
  return path.join(root, 'history', value.observedAt.slice(0, 10), value.snapshotId + '.json');
}

test('publisher writes a fully valid current artifact and immutable history', async t => {
  const root = directory(t); const value = await snapshot(); await publishSnapshot(value, root);
  assert.equal((await parseSnapshot(current(root))).snapshotId, value.snapshotId);
  assert.equal(fs.readFileSync(archive(root, value), 'utf8'), current(root));
  assert.notEqual(fs.statSync(archive(root, value)).ino, fs.statSync(path.join(root, 'roadmap-status.json')).ino);
});
test('same input gives identical bytes and idempotent history', async t => {
  const root = directory(t); const value = await snapshot(); await publishSnapshot(value, root);
  const original = current(root); await publishSnapshot(value, root);
  assert.equal(current(root), original);
  assert.equal(fs.readdirSync(path.dirname(archive(root, value))).length, 1);
});
test('invalid new candidate leaves current bytes and history untouched', async t => {
  const root = directory(t); await publishSnapshot(await snapshot(), root); const before = current(root);
  const invalid = await changed(s => { s.projects[0].status = 'INVALID'; });
  await assert.rejects(publishSnapshot(invalid, root)); assert.equal(current(root), before);
});
test('serialization failure leaves last valid snapshot untouched', async t => {
  const root = directory(t); await publishSnapshot(await snapshot(), root); const before = current(root);
  await assert.rejects(publishSnapshot(await snapshot(), root, { serialize() { throw new Error('PRIVATE_CANARY'); } }), { message: 'PUBLIC_ROADMAP_PUBLICATION_FAILED' });
  assert.equal(current(root), before);
});
test('serialization cannot replace validated input with a different valid snapshot', async t => {
  const root = directory(t); const value = await snapshot(); await publishSnapshot(value, root); const before = current(root);
  const other = await changed(s => { s.projects[0].status = 'REVIEW'; });
  await assert.rejects(publishSnapshot(other, root, { serialize: () => canonicalJson(value) }));
  assert.equal(current(root), before);
});
test('rename is the only promotion point; readers see old complete bytes until it', async t => {
  const root = directory(t); await publishSnapshot(await snapshot(), root); const before = current(root);
  const next = await changed(s => { s.generatedAt = '2026-09-21T00:00:00Z'; });
  let promoted = false;
  const io = { ...fs, renameSync(from: fs.PathLike, to: fs.PathLike) {
    assert.equal(current(root), before);
    assert.equal(fs.readFileSync(from, 'utf8'), canonicalJson(next));
    fs.renameSync(from, to); promoted = true;
  } };
  await publishSnapshot(next, root, { io }); assert.equal(promoted, true);
  assert.equal(current(root), canonicalJson(next));
});
test('rename failure preserves last snapshot, leaves at most a valid unpromoted archive', async t => {
  const root = directory(t); await publishSnapshot(await snapshot(), root); const before = current(root);
  const next = await changed(s => { s.generatedAt = '2026-09-21T00:00:00Z'; });
  await assert.rejects(publishSnapshot(next, root, { io: { ...fs, renameSync() { throw new Error(); } } }));
  assert.equal(current(root), before);
  await parseSnapshot(fs.readFileSync(archive(root, next), 'utf8'));
  assert.equal(fs.readdirSync(root).some(p => p.endsWith('.tmp') || p === '.publish.lock'), false);
});
test('partial write failure never promotes partial bytes', async t => {
  const root = directory(t); const value = await snapshot(); await publishSnapshot(value, root); const before = current(root);
  const io = { ...fs, writeFileSync(...args: Parameters<typeof fs.writeFileSync>) {
    fs.writeFileSync(args[0], '{"partial":', 'utf8'); throw new Error();
  } };
  await assert.rejects(publishSnapshot(value, root, { io })); assert.equal(current(root), before);
});
test('file fsync failure does not replace existing snapshot', async t => {
  const root = directory(t); const value = await snapshot(); await publishSnapshot(value, root); const before = current(root);
  await assert.rejects(publishSnapshot(value, root, { io: { ...fs, fsyncSync() { throw new Error(); } } }));
  assert.equal(current(root), before);
});
test('archive collision with different bytes fails without overwriting history or current', async t => {
  const root = directory(t); const value = await snapshot(); await publishSnapshot(value, root); const before = current(root);
  fs.writeFileSync(archive(root, value), 'corrupt');
  await assert.rejects(publishSnapshot(value, root)); assert.equal(current(root), before);
  assert.equal(fs.readFileSync(archive(root, value), 'utf8'), 'corrupt');
});
test('another writer lock is preserved and publication fails closed', async t => {
  const root = directory(t); const lock = path.join(root, '.publish.lock'); fs.writeFileSync(lock, 'other');
  await assert.rejects(publishSnapshot(await snapshot(), root)); assert.equal(fs.readFileSync(lock, 'utf8'), 'other');
  assert.equal(fs.existsSync(path.join(root, 'roadmap-status.json')), false);
});
test('older observation requires explicit rollback; restored time is preserved', async t => {
  const root = directory(t); const value = await snapshot();
  const newer = await changed(s => { s.observedAt = '2026-09-21T00:00:00Z'; s.generatedAt = s.observedAt; });
  await publishSnapshot(value, root); await publishSnapshot(newer, root);
  await assert.rejects(publishSnapshot(value, root)); assert.equal(current(root), canonicalJson(newer));
  await publishSnapshot(value, root, { allowRollback: true }); assert.equal(current(root), canonicalJson(value));
  assert.equal(fs.readFileSync(archive(root, newer), 'utf8'), canonicalJson(newer));
});
test('symlink target is refused', async t => {
  const root = directory(t); fs.writeFileSync(path.join(root, 'other.json'), 'unchanged');
  fs.symlinkSync('other.json', path.join(root, 'roadmap-status.json'));
  await assert.rejects(publishSnapshot(await snapshot(), root));
  assert.equal(fs.readFileSync(path.join(root, 'other.json'), 'utf8'), 'unchanged');
});
