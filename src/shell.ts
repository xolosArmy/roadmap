import { readFile } from 'node:fs/promises';
import { DONATION_ADDRESS } from './policy.ts';

export async function renderShell(): Promise<string> {
  return (await readFile(new URL('../web/index.html', import.meta.url), 'utf8')).replaceAll('{{DONATION_ADDRESS}}', DONATION_ADDRESS);
}
