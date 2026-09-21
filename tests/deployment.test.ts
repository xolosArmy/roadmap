import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { canonicalJson } from '../src/contract.ts';
import { mountRoadmap } from '../src/frontend.ts';
import { CONTRACT_VERSION, DONATION_ADDRESS, SCHEMA } from '../src/policy.ts';
import { renderShell } from '../src/shell.ts';
import { snapshot } from './helpers.ts';

const ORIGIN = 'https://roadmap.xolosarmy.xyz';
const SNAPSHOT_ID = '2edabb015a79f3f66a63f02d14a01cb15814c2e26e4b5e02cfdd564ab94ce734';
const SNAPSHOT_BYTES_SHA256 = '5dc27e9a4ec22034a96a120ff5dab0bdf5f5a2726b45dc91584c5075a0651e14';
const EXACT_ADDRESS = 'ecash:qq7qn90ev23ecastqmn8as00u8mcp4tzsspvt5dtlk';

test('root custom-domain shell resolves assets and public artifacts from the host root', async () => {
  const page = new JSDOM(await renderShell(), { url: ORIGIN + '/' });
  const doc = page.window.document;
  assert.equal(doc.baseURI, ORIGIN + '/');
  assert.equal((doc.querySelector('link[rel="stylesheet"]') as HTMLLinkElement).href, ORIGIN + '/assets/style.css');
  assert.equal((doc.querySelector('link[rel="icon"]') as HTMLLinkElement).href, ORIGIN + '/assets/favicon.svg');
  assert.equal((doc.querySelector('script[type="module"]') as HTMLScriptElement).src, ORIGIN + '/assets/app.js');
  assert.equal((doc.querySelector('a[href="roadmap-status.json"]') as HTMLAnchorElement).href, ORIGIN + '/roadmap-status.json');
  assert.equal((doc.querySelector('a[href="schema.json"]') as HTMLAnchorElement).href, ORIGIN + '/schema.json');

  const value = await snapshot();
  await mountRoadmap(doc, async () => new Response(canonicalJson(value))).reload();
  assert.equal((doc.getElementById('history-link') as HTMLAnchorElement).href,
    `${ORIGIN}/history/2026-09-20/${SNAPSHOT_ID}.json`);
  page.window.close();
});

test('active deployment sources contain no legacy subpath or canonical URL', async () => {
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const legacyUrl = 'https://xolosarmy.xyz' + '/roadmap/';
  const legacyBase = '<base href="' + '/roadmap/' + '">';
  for (const path of paths) {
    const text = await readFile(path, 'utf8');
    assert.equal(text.includes(legacyUrl), false, `${path}: legacy canonical URL`);
    assert.equal(text.includes(legacyBase), false, `${path}: legacy base path`);
  }
});

test('location migration preserves snapshot, contract and donation identity', async () => {
  const current = await readFile('public/roadmap-status.json');
  const archived = await readFile(`public/history/2026-09-20/${SNAPSHOT_ID}.json`);
  assert.deepEqual(current, archived);
  assert.equal(createHash('sha256').update(current).digest('hex'), SNAPSHOT_BYTES_SHA256);
  assert.equal(JSON.parse(current.toString('utf8')).snapshotId, SNAPSHOT_ID);
  assert.equal(CONTRACT_VERSION, 'xolosarmy-public-roadmap/1.0.0');
  assert.equal(DONATION_ADDRESS, EXACT_ADDRESS);
  assert.equal(SCHEMA.$id, ORIGIN + '/schema.json');
});

test('Pages workflow uploads only dist with job-scoped least privilege', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /permissions: \{\}/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /actions\/configure-pages@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/upload-pages-artifact@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/deploy-pages@[a-f0-9]{40}/);
  assert.match(workflow, /path: dist/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|contents: write/);
});
