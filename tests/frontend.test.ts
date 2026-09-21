import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { canonicalJson } from '../src/contract.ts';
import { copyDonation, filterProjects, loadSnapshot, mountRoadmap } from '../src/frontend.ts';
import { DONATION_ADDRESS, MAX_SNAPSHOT_BYTES } from '../src/policy.ts';
import { renderShell } from '../src/shell.ts';
import { changed, snapshot } from './helpers.ts';

const EXACT_ADDRESS = 'ecash:qq7qn90ev23ecastqmn8as00u8mcp4tzsspvt5dtlk';
const url = new URL('https://roadmap.xolosarmy.xyz/roadmap-status.json');
async function dom() { return new JSDOM(await renderShell(), { url: 'https://roadmap.xolosarmy.xyz/' }); }
const fetchText = (text: string, status = 200): typeof fetch => async () => new Response(text, { status });

function delayedResponse() {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Response>((success, failure) => { resolve = success; reject = failure; });
  return { promise, resolve, reject };
}
function assertState(page: JSDOM, state: 'loading' | 'ready' | 'unavailable') {
  const doc = page.window.document;
  assert.equal(doc.getElementById('roadmap')?.getAttribute('aria-busy'), String(state === 'loading'));
  assert.equal(doc.getElementById('loading')?.hidden, state !== 'loading');
  assert.equal(doc.getElementById('unavailable')?.hidden, state !== 'unavailable');
  if (state !== 'ready') {
    assert.equal(doc.querySelectorAll('.project').length, 0);
    assert.equal(doc.getElementById('overview')?.hidden, true);
    assert.equal(doc.getElementById('snapshot-details')?.hidden, true);
  }
}
function nextIdle(page: JSDOM): Promise<void> {
  return new Promise((resolve, reject) => {
    const region = page.window.document.getElementById('roadmap')!;
    const observer = new page.window.MutationObserver(() => {
      if (region.getAttribute('aria-busy') === 'false') {
        clearTimeout(timer); observer.disconnect(); resolve();
      }
    });
    const timer = setTimeout(() => { observer.disconnect(); reject(new Error('Reload did not finish')); }, 2_000);
    observer.observe(region, { attributes: true, attributeFilter: ['aria-busy'] });
  });
}

test('initial HTML exposes loading, never a premature failure announcement', async () => {
  const page = await dom();
  assertState(page, 'loading');
  assert.equal(page.window.document.getElementById('loading')?.getAttribute('role'), 'status');
  page.window.close();
});
test('a delayed valid response keeps loading until the validated roadmap is ready', async () => {
  const page = await dom(); const response = delayedResponse();
  const controller = mountRoadmap(page.window.document, async () => response.promise);
  const pending = controller.reload();
  await new Promise(resolve => setImmediate(resolve));
  assertState(page, 'loading');
  assert.equal((page.window.document.getElementById('retry') as HTMLButtonElement).disabled, true);
  assert.equal(controller.getSnapshot(), undefined);
  response.resolve(new Response(canonicalJson(await snapshot())));
  await pending;
  assertState(page, 'ready');
  assert.equal(page.window.document.querySelectorAll('.project').length, 8);
  page.window.close();
});
test('valid public JSON renders all eight projects and reported metadata', async () => {
  const page = await dom(); const controller = mountRoadmap(page.window.document, fetchText(canonicalJson(await snapshot())));
  await controller.reload();
  assert.equal(page.window.document.querySelectorAll('.project').length, 8);
  assertState(page, 'ready');
  assert.equal(page.window.document.getElementById('observed-at')?.textContent, '2026-09-20 18:13:26 UTC');
  assert.match(page.window.document.getElementById('projects')!.textContent!, /Tonalli Wallet/);
  page.window.close();
});
for (const [name, response] of [['missing', () => fetchText('', 404)], ['corrupt', () => fetchText('{invalid')], ['network', () => (async () => { throw new Error('PRIVATE_CANARY'); }) as typeof fetch]] as const) {
  test(`${name} snapshot shows only controlled unavailable state`, async () => {
    const page = await dom(); const delayed = delayedResponse();
    const controller = mountRoadmap(page.window.document, async () => delayed.promise);
    const pending = controller.reload();
    await new Promise(resolve => setImmediate(resolve));
    assertState(page, 'loading');
    void response()(url).then(delayed.resolve, delayed.reject);
    await pending;
    assertState(page, 'unavailable');
    assert.equal(page.window.document.querySelectorAll('.project').length, 0);
    assert.equal(page.window.document.getElementById('unavailable')?.hidden, false);
    assert.equal(page.window.document.getElementById('overview')?.hidden, true);
    assert.equal(page.window.document.body.textContent?.includes('PRIVATE_CANARY'), false); page.window.close();
  });
}
test('invalid schema cannot render even with a valid recomputed digest', async () => {
  const page = await dom(); const invalid = await changed(s => { Reflect.set(s.projects[0], 'internal', 'PRIVATE_CANARY'); });
  await mountRoadmap(page.window.document, fetchText(canonicalJson(invalid))).reload();
  assert.equal(page.window.document.querySelectorAll('.project').length, 0);
  assert.equal(page.window.document.body.textContent?.includes('PRIVATE_CANARY'), false); page.window.close();
});
test('failed refresh clears a previously valid display, counts and metadata', async () => {
  const page = await dom(); let calls = 0; const bytes = canonicalJson(await snapshot());
  const response = delayedResponse();
  const controller = mountRoadmap(page.window.document, async () => ++calls === 1 ? new Response(bytes) : response.promise);
  await controller.reload(); assert.equal(page.window.document.querySelectorAll('.project').length, 8);
  const pending = controller.reload();
  assertState(page, 'loading');
  assert.equal(controller.getSnapshot(), undefined);
  assert.equal(page.window.document.getElementById('result-count')?.textContent, '');
  response.resolve(new Response('{}'));
  await pending;
  assertState(page, 'unavailable');
  assert.equal(page.window.document.querySelectorAll('.project').length, 0);
  assert.equal(page.window.document.getElementById('snapshot-details')?.hidden, true);
  assert.equal(page.window.document.getElementById('result-count')?.textContent, ''); page.window.close();
});
test('an older request cannot restore data after a newer failed refresh', async () => {
  const page = await dom();
  let finish!: (value: Response) => void;
  const first = new Promise<Response>(resolve => { finish = resolve; });
  let calls = 0;
  const controller = mountRoadmap(page.window.document, async () => ++calls === 1 ? first : new Response('{}'));
  const pending = controller.reload();
  await controller.reload();
  finish(new Response(canonicalJson(await snapshot())));
  await pending;
  assert.equal(page.window.document.querySelectorAll('.project').length, 0);
  assert.equal(controller.getSnapshot(), undefined);
  assertState(page, 'unavailable');
  page.window.close();
});
for (const outcome of ['valid', 'rejected'] as const) test(`an obsolete ${outcome} request cannot end a newer loading state`, async () => {
  const page = await dom(); const first = delayedResponse(); const second = delayedResponse();
  const signals: AbortSignal[] = [];
  const bytes = canonicalJson(await snapshot());
  const controller = mountRoadmap(page.window.document, async (_target, options) => {
    const signal = options?.signal; assert.ok(signal); signals.push(signal);
    return signals.length === 1 ? first.promise : second.promise;
  });
  const older = controller.reload(); const newer = controller.reload();
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
  if (outcome === 'valid') first.resolve(new Response(bytes)); else first.reject(new Error('Aborted earlier request'));
  await older;
  assertState(page, 'loading');
  assert.equal(controller.getSnapshot(), undefined);
  assert.equal((page.window.document.getElementById('retry') as HTMLButtonElement).disabled, true);
  second.resolve(new Response(bytes)); await newer;
  assertState(page, 'ready');
  assert.equal(page.window.document.querySelectorAll('.project').length, 8);
  assert.equal((page.window.document.getElementById('retry') as HTMLButtonElement).disabled, false);
  page.window.close();
});
test('retry hides the previous failure while pending and can recover successfully', async () => {
  const page = await dom(); const response = delayedResponse(); let calls = 0;
  const controller = mountRoadmap(page.window.document, async () => ++calls === 1 ? new Response('{}') : response.promise);
  await controller.reload(); assertState(page, 'unavailable');
  const button = page.window.document.getElementById('retry') as HTMLButtonElement;
  assert.equal(button.disabled, false);
  const finished = nextIdle(page); button.click();
  assertState(page, 'loading'); assert.equal(button.disabled, true);
  response.resolve(new Response(canonicalJson(await snapshot()))); await finished;
  assertState(page, 'ready'); assert.equal(button.disabled, false);
  assert.equal(page.window.document.querySelectorAll('.project').length, 8);
  assert.equal(calls, 2); page.window.close();
});
for (const [key, value, names] of [
  ['phase', 'A', ['Tonalli Memo', 'Tonalli Wallet']],
  ['status', 'REVIEW', ['Tonalli Wallet', 'x402-XEC']],
  ['priority', 'P0', ['Tonalli Contracts', 'Tonalli Wallet']],
  ['securityStatus', 'REPORTED_PASS', ['Tonalli Contracts']],
] as const) test(`${key} filter changes presentation without mutating snapshot`, async () => {
  const page = await dom(); const controller = mountRoadmap(page.window.document, fetchText(canonicalJson(await snapshot()))); await controller.reload();
  const before = canonicalJson(controller.getSnapshot());
  const select = page.window.document.getElementById('filter-' + key) as HTMLSelectElement;
  select.value = value; select.dispatchEvent(new page.window.Event('change', { bubbles: true }));
  assert.deepEqual([...page.window.document.querySelectorAll('.project h3')].map(n => n.textContent), [...names]);
  assert.equal(canonicalJson(controller.getSnapshot()), before); page.window.close();
});
test('combined filters use intersection and resetting restores the overview', async () => {
  const value = await snapshot(); assert.equal(filterProjects(value, { phase: 'A', status: 'REVIEW' })[0].id, 'tonalli-wallet');
  const page = await dom(); const controller = mountRoadmap(page.window.document, fetchText(canonicalJson(value))); await controller.reload();
  const select = page.window.document.getElementById('filter-phase') as HTMLSelectElement; select.value = 'C'; select.dispatchEvent(new page.window.Event('change', { bubbles: true }));
  (page.window.document.getElementById('reset-filters') as HTMLButtonElement).click();
  assert.equal(page.window.document.querySelectorAll('.project').length, 8); page.window.close();
});
test('empty result is explicit', async () => {
  const page = await dom(); await mountRoadmap(page.window.document, fetchText(canonicalJson(await snapshot()))).reload();
  for (const [key, value] of [['phase', 'C'], ['status', 'FROZEN']]) {
    const select = page.window.document.getElementById('filter-' + key) as HTMLSelectElement; select.value = value; select.dispatchEvent(new page.window.Event('change', { bubbles: true }));
  }
  assert.equal(page.window.document.getElementById('empty')?.hidden, false); page.window.close();
});
test('client requests only the snapshot with no credentials, redirects or stale cache', async () => {
  const value = await snapshot(); const fetcher: typeof fetch = async (target, options) => {
    assert.equal(String(target), String(url));
    assert.equal(options?.credentials, 'omit'); assert.equal(options?.redirect, 'error');
    assert.equal(options?.cache, 'no-store'); assert.equal(options?.mode, 'same-origin');
    return new Response(canonicalJson(value));
  };
  assert.equal((await loadSnapshot(fetcher, url)).snapshotId, value.snapshotId);
});
test('streaming size limit and invalid UTF-8 fail closed', async () => {
  await assert.rejects(loadSnapshot(fetchText('x'.repeat(MAX_SNAPSHOT_BYTES + 1)), url));
  await assert.rejects(loadSnapshot(async () => new Response(new Uint8Array([0x80])), url));
});
test('donation literal, rendered text and wallet URI are exactly canonical', async () => {
  assert.equal(DONATION_ADDRESS, EXACT_ADDRESS); const page = await dom();
  assert.equal(page.window.document.getElementById('donation-address')?.textContent, EXACT_ADDRESS);
  assert.equal(page.window.document.querySelector('.wallet-button')?.getAttribute('href'), EXACT_ADDRESS);
  assert.equal(page.window.document.querySelector('#support')?.previousElementSibling?.id, 'method'); page.window.close();
});
test('copy action writes exactly the full canonical address', async () => {
  const values: string[] = []; await copyDonation({ writeText: async text => { values.push(text); } });
  const page = await dom(); const controller = mountRoadmap(page.window.document, fetchText('', 404), { writeText: async text => { values.push(text); } });
  await controller.reload(); (page.window.document.getElementById('copy-address') as HTMLButtonElement).click();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(values, [EXACT_ADDRESS, EXACT_ADDRESS]);
  assert.equal(page.window.document.getElementById('copy-status')?.textContent, 'Address copied.'); page.window.close();
});
test('clipboard failure never falsely claims the address was copied', async () => {
  const page = await dom(); mountRoadmap(page.window.document, fetchText('', 404), { writeText: async () => { throw new Error(); } });
  (page.window.document.getElementById('copy-address') as HTMLButtonElement).click(); await new Promise(resolve => setImmediate(resolve));
  assert.match(page.window.document.getElementById('copy-status')!.textContent!, /Select and copy/); page.window.close();
});
test('no-JavaScript page still exposes context, complete address, wallet link and JSON access', async () => {
  const page = await dom(); assert.ok(page.window.document.querySelector('noscript a[href="roadmap-status.json"]'));
  assert.equal(page.window.document.getElementById('donation-address')?.textContent, EXACT_ADDRESS);
  assert.equal(page.window.document.querySelectorAll('.project').length, 0); page.window.close();
});
