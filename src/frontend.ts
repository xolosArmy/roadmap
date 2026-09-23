import { parseSnapshot } from './contract.ts';
import { DONATION_ADDRESS, MAX_SNAPSHOT_BYTES, SECURITY_LABELS } from './policy.ts';
import type { PublicProject, Snapshot } from './policy.ts';

export type Filters = Partial<Record<'phase' | 'status' | 'priority' | 'securityStatus', string>>;
export function filterProjects(snapshot: Snapshot, filters: Filters): PublicProject[] {
  return snapshot.projects.filter(project => Object.entries(filters).every(([key, value]) =>
    !value || project[key as keyof Filters] === value,
  ));
}

export async function loadSnapshot(fetcher: typeof fetch, url: URL, signal?: AbortSignal): Promise<Snapshot> {
  const response = await fetcher(url, { signal, credentials: 'omit', mode: 'same-origin', redirect: 'error', cache: 'no-store' });
  if (!response.ok || !response.body) throw new Error('UNAVAILABLE');
  const declared = response.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_SNAPSHOT_BYTES)) throw new Error('UNAVAILABLE');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_SNAPSHOT_BYTES) throw new Error('UNAVAILABLE');
      text += decoder.decode(result.value, { stream: true });
    }
    text += decoder.decode();
    return await parseSnapshot(text);
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

export async function copyDonation(clipboard: Pick<Clipboard, 'writeText'>): Promise<void> {
  await clipboard.writeText(DONATION_ADDRESS);
}

function label(value: string): string {
  return value.toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
}

export function mountRoadmap(doc: Document, fetcher: typeof fetch, clipboard?: Pick<Clipboard, 'writeText'>) {
  let snapshot: Snapshot | undefined;
  let request = 0;
  let active: AbortController | undefined;
  const element = <T extends HTMLElement>(id: string) => {
    const found = doc.getElementById(id);
    if (!found) throw new Error('MISSING_UI');
    return found as T;
  };
  const roadmap = element('roadmap');
  const loading = element('loading');
  const list = element('projects');
  const unavailable = element('unavailable');
  const overview = element('overview');
  const form = element<HTMLFormElement>('filters');
  const fieldset = element<HTMLFieldSetElement>('filter-fields');
  const count = element('result-count');
  const retry = element<HTMLButtonElement>('retry');
  const keys = ['phase', 'status', 'priority', 'securityStatus'] as const;
  const controls = keys.map(key => element<HTMLSelectElement>('filter-' + key));

  function render() {
    if (!snapshot) return;
    const filters = Object.fromEntries(keys.map((key, i) => [key, controls[i].value]));
    const visible = filterProjects(snapshot, filters);
    const fragment = doc.createDocumentFragment();
    for (const project of visible) {
      const article = doc.createElement('article'); article.className = 'project';
      const top = doc.createElement('div'); top.className = 'project-top';
      const h3 = doc.createElement('h3');
      // Presentation-only alias: the public contract/snapshot identity remains `tonalli-contracts` / `Tonalli Contracts`.
      h3.textContent = project.id === 'tonalli-contracts' ? 'Tonalli Core' : project.name;
      const status = doc.createElement('span'); status.className = 'status status-' + project.status.toLowerCase(); status.textContent = label(project.status);
      top.append(h3, status); article.append(top);
      const dl = doc.createElement('dl');
      const details: [string, string][] = [
        ['Roadmap phase', project.phase], ['Priority', project.priority],
        ['Security status', SECURITY_LABELS[project.securityStatus]], ['Last update (UTC)', project.lastUpdate.replace('T', ' ').replace('Z', '')],
      ];
      if (project.id === 'xolos-ramirez') details.splice(2, 0, ['Current gate', 'X402-XR1 · ACTIVE']);
      for (const [name, value] of details) {
        const group = doc.createElement('div');
        const dt = doc.createElement('dt'); dt.textContent = name;
        const dd = doc.createElement('dd'); dd.textContent = value;
        group.append(dt, dd); dl.append(group);
      }
      article.append(dl); fragment.append(article);
    }
    list.replaceChildren(fragment);
    count.textContent = `${visible.length} of ${snapshot.projects.length} public projects`;
    element('empty').hidden = visible.length !== 0;
  }

  function clear() {
    snapshot = undefined;
    list.replaceChildren();
    count.textContent = '';
    element('empty').hidden = true;
    overview.hidden = true;
    fieldset.disabled = true;
    form.hidden = true;
    element('snapshot-details').hidden = true;
  }

  function setState(state: 'loading' | 'ready' | 'unavailable') {
    loading.hidden = state !== 'loading';
    unavailable.hidden = state !== 'unavailable';
    roadmap.setAttribute('aria-busy', String(state === 'loading'));
  }

  async function reload() {
    const generation = ++request;
    active?.abort(); active = new AbortController();
    const controller = active;
    const timer = setTimeout(() => controller.abort(), 10_000);
    setState('loading'); clear(); retry.disabled = true;
    try {
      const loaded = await loadSnapshot(fetcher, new URL('roadmap-status.json', doc.baseURI), controller.signal);
      if (generation !== request) return;
      snapshot = loaded;
      for (let i = 0; i < keys.length; i++) {
        const select = controls[i]; select.replaceChildren();
        const option = doc.createElement('option'); option.value = ''; option.textContent = 'All'; select.append(option);
        for (const value of [...new Set(loaded.projects.map(p => p[keys[i]]))].sort()) {
          const option = doc.createElement('option'); option.value = value;
          option.textContent = keys[i] === 'securityStatus' ? SECURITY_LABELS[value] : value;
          select.append(option);
        }
      }
      element('public-count').textContent = String(loaded.projects.length);
      element('active-count').textContent = String(loaded.projects.filter(p => p.status === 'ACTIVE').length);
      element('review-count').textContent = String(loaded.projects.filter(p => p.status === 'REVIEW').length);
      element('observed-at').textContent = loaded.observedAt.replace('T', ' ').replace('Z', ' UTC');
      element('generated-at').textContent = loaded.generatedAt.replace('T', ' ').replace('Z', ' UTC');
      element('snapshot-id').textContent = loaded.snapshotId;
      element<HTMLAnchorElement>('history-link').href = `history/${loaded.observedAt.slice(0, 10)}/${loaded.snapshotId}.json`;
      overview.hidden = false;
      form.hidden = false; fieldset.disabled = false;
      element('snapshot-details').hidden = false;
      render();
      setState('ready');
    } catch { if (generation === request) { clear(); setState('unavailable'); } }
    finally { clearTimeout(timer); if (generation === request) retry.disabled = false; }
  }

  form.addEventListener('change', render);
  form.addEventListener('submit', event => event.preventDefault());
  element('reset-filters').addEventListener('click', () => { form.reset(); render(); });
  retry.addEventListener('click', () => { void reload(); });
  const copy = element<HTMLButtonElement>('copy-address');
  copy.hidden = false;
  copy.addEventListener('click', async () => {
    try {
      if (!clipboard) throw new Error();
      await copyDonation(clipboard);
      element('copy-status').textContent = 'Address copied.';
    } catch {
      element('copy-status').textContent = 'Select and copy the complete address shown above.';
      element('donation-address').focus();
    }
  });
  return { reload, getSnapshot: () => snapshot };
}
