import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

// Execute the actual built client, including its generated validator, in a DOM.
// This does not claim real-browser layout, CSP or compatibility verification.
for (const valid of [true, false]) test(`built client ${valid ? 'renders validated data' : 'fails closed on corrupt data'}`, async () => {
  const page = new JSDOM(await readFile('dist/index.html', 'utf8'), {
    url: 'https://roadmap.xolosarmy.xyz/', runScripts: 'outside-only',
  });
  try {
    const bytes = valid ? await readFile('dist/roadmap-status.json', 'utf8') : '{"projects":[]}';
    let finish!: (value: Response) => void;
    const pending = new Promise<Response>(resolve => { finish = resolve; });
    const doc = page.window.document;
    assert.equal(doc.getElementById('loading')?.hidden, false);
    assert.equal(doc.getElementById('unavailable')?.hidden, true);
    assert.equal(doc.getElementById('roadmap')?.getAttribute('aria-busy'), 'true');
    Object.defineProperties(page.window, {
      fetch: { value: async () => pending },
      TextEncoder: { value: TextEncoder },
      TextDecoder: { value: TextDecoder },
      crypto: { value: webcrypto },
    });
    page.window.eval(await readFile('dist/assets/app.js', 'utf8'));
    const retry = page.window.document.getElementById('retry') as HTMLButtonElement;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(retry.disabled, true);
    assert.equal(doc.getElementById('loading')?.hidden, false);
    assert.equal(doc.getElementById('unavailable')?.hidden, true);
    assert.equal(doc.getElementById('roadmap')?.getAttribute('aria-busy'), 'true');
    assert.equal(doc.querySelectorAll('.project').length, 0);
    finish(new Response(bytes));
    const deadline = Date.now() + 2_000;
    while (retry.disabled && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(retry.disabled, false, 'built client completed its validation');
    assert.equal(doc.getElementById('loading')?.hidden, true);
    assert.equal(doc.getElementById('roadmap')?.getAttribute('aria-busy'), 'false');
    assert.equal(page.window.document.querySelectorAll('.project').length, valid ? 8 : 0);
    assert.equal(page.window.document.getElementById('unavailable')?.hidden, valid);
    assert.equal(page.window.document.getElementById('donation-address')?.textContent,
      'ecash:qq7qn90ev23ecastqmn8as00u8mcp4tzsspvt5dtlk');
  } finally { page.window.close(); }
});
