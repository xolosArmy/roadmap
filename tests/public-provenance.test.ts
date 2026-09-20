import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

test('public documentation omits exact Git object IDs and transient branch references', async () => {
  const paths = execFileSync('git', ['ls-files', '-z', '--', '*.md'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  // Generic patterns avoid reintroducing removed identifiers as test fixtures.
  const objectId = /\b[a-f0-9]{40}\b/i;
  const transientBranch = /\b(?:agent|astra|codex|feature|fix|wip|worktree|tmp|temp)\/[a-z0-9._/-]+/i;
  for (const path of paths) {
    const text = await readFile(path, 'utf8');
    assert.equal(objectId.test(text), false, `${path}: exact Git object identifier`);
    assert.equal(transientBranch.test(text), false, `${path}: transient branch reference`);
  }
});
