import * as fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { canonicalJson, parseSnapshot, validateSnapshot } from './contract.ts';
import type { Snapshot } from './policy.ts';

export interface PublishOptions {
  allowRollback?: boolean;
  /** Explicit seams for fault-injection tests; never populated by input JSON. */
  io?: typeof fs;
  serialize?: (snapshot: Snapshot) => string;
}

/** Local publisher only: no credentials, network, source writes or unattended scheduling. */
export async function publishSnapshot(candidate: unknown, root: string, options: PublishOptions = {}): Promise<Snapshot> {
  const io = options.io ?? fs;
  let lock: number | undefined;
  let temp: string | undefined;
  let historyTemp: string | undefined;
  const lockPath = path.join(root, '.publish.lock');
  function safeDirectory(directory: string) {
    io.mkdirSync(directory, { recursive: true });
    if (!io.lstatSync(directory).isDirectory() || io.lstatSync(directory).isSymbolicLink()) throw new Error();
  }
  function readRegular(file: string) {
    const info = io.lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error();
    return io.readFileSync(file, 'utf8');
  }
  try {
    const snapshot = await validateSnapshot(candidate);
    const serialized = (options.serialize ?? canonicalJson)(snapshot);
    const roundTrip = await parseSnapshot(serialized);
    if (roundTrip.snapshotId !== snapshot.snapshotId || serialized !== canonicalJson(snapshot)) throw new Error();
    safeDirectory(root);
    lock = io.openSync(lockPath, 'wx', 0o600);
    const currentPath = path.join(root, 'roadmap-status.json');
    if (io.existsSync(currentPath)) {
      const current = await parseSnapshot(readRegular(currentPath));
      if (!options.allowRollback && (snapshot.observedAt < current.observedAt || snapshot.generatedAt < current.generatedAt)) throw new Error();
    }
    const historyRoot = path.join(root, 'history');
    safeDirectory(historyRoot);
    const historyDay = path.join(historyRoot, snapshot.observedAt.slice(0, 10));
    safeDirectory(historyDay);
    const historyFile = path.join(historyDay, snapshot.snapshotId + '.json');
    temp = path.join(root, `.snapshot-${randomUUID()}.tmp`);
    const fd = io.openSync(temp, 'wx', 0o644);
    try {
      io.writeFileSync(fd, serialized, 'utf8');
      io.fsyncSync(fd);
    } finally { io.closeSync(fd); }
    // Verify bytes actually written before publishing either path.
    if (readRegular(temp) !== serialized) throw new Error();
    if (io.existsSync(historyFile)) {
      if (readRegular(historyFile) !== serialized) throw new Error();
    } else {
      // Atomic create-if-absent: immutable content-addressed history is never overwritten.
      // Separate inode: editing the current file outside this publisher cannot alter history.
      historyTemp = path.join(historyDay, `.history-${randomUUID()}.tmp`);
      const archiveFd = io.openSync(historyTemp, 'wx', 0o644);
      try { io.writeFileSync(archiveFd, serialized, 'utf8'); io.fsyncSync(archiveFd); }
      finally { io.closeSync(archiveFd); }
      if (readRegular(historyTemp) !== serialized) throw new Error();
      io.linkSync(historyTemp, historyFile);
      io.unlinkSync(historyTemp); historyTemp = undefined;
    }
    // Commit point. Same-directory POSIX rename gives readers the old or the complete new file.
    io.renameSync(temp, currentPath);
    temp = undefined;
    return snapshot;
  } catch { throw new Error('PUBLIC_ROADMAP_PUBLICATION_FAILED'); }
  finally {
    if (temp) { try { io.unlinkSync(temp); } catch { /* A failed cleanup never changes the published snapshot. */ } }
    if (historyTemp) { try { io.unlinkSync(historyTemp); } catch { /* Stale history staging files are never publication pointers. */ } }
    if (lock !== undefined) {
      try { io.closeSync(lock); } catch { /* Commit result is not rewritten by lock cleanup. */ }
      try { io.unlinkSync(lockPath); } catch { /* A stale lock fails closed on the next attempt. */ }
    }
  }
}
