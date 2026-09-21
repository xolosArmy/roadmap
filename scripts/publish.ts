import { readFile } from 'node:fs/promises';
import { adaptSheetRows } from '../src/adapter.ts';
import { parseSnapshot } from '../src/contract.ts';
import { publishSnapshot } from '../src/publisher.ts';

try {
  const args = process.argv.slice(2);
  const restore = args[0] === '--restore';
  if (restore) args.shift();
  if (args.length !== 2) throw new Error();
  const [inputPath, outputDirectory] = args;
  const bytes = await readFile(inputPath, 'utf8');
  if (Buffer.byteLength(bytes) > 8 * 1024 * 1024) throw new Error();
  const input = restore ? null : JSON.parse(bytes);
  const candidate = restore ? await parseSnapshot(bytes) : await adaptSheetRows(input.rows, input);
  const snapshot = await publishSnapshot(candidate, outputDirectory, { allowRollback: restore });
  console.log(`${restore ? 'Restored previous validated snapshot' : 'Published validated snapshot'} ${snapshot.snapshotId}`);
} catch {
  console.error('PUBLIC_ROADMAP_PUBLICATION_FAILED');
  process.exitCode = 1;
}
