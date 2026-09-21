# Manual publication and history

The public roadmap is a sanitized derivative of the private operational roadmap and is not itself the canonical source of truth.

## Operator flow

1. Read current Config, Operating Rules and referenced strategic documents through an authorized **read-only** connection. Confirm that this catalog and version remain applicable.
2. Capture the source rows and exact canonical headers. Keep raw exports outside this public repository. Record `observedAt` when capture completes and supply a whole-second UTC `generatedAt` explicitly. Do not use generation time as a new evidence date.
3. Invoke the pure adapter through the CLI with a JSON envelope containing `rows`, `observedAt` and `generatedAt`.
4. Review only the sanitized output and public diff. Commit the current snapshot and validated new history together on a review branch.
5. Run CI and obtain review before a separate authorized merge or deployment.

```bash
npm run publish:snapshot -- /secure/export.json public
npm run check
```

`examples/publication-input.json` contains only already-selected public rows from the initial observation. It reproduces that dated artifact; it is not a replacement for the private canonical source and must not be mistaken for a live refresh.

No live Google transport is included. There are no Google credentials, OAuth scopes, triggers, Sheet writes, scheduled jobs or unattended publication steps in this repository.

## Atomic commit boundary

The publisher executes:

1. Validate an independent candidate copy.
2. Canonically serialize it, parse and validate the serialized bytes, and compare identity/content to the candidate.
3. Acquire the output directory's exclusive publisher lock. Validate existing current data, if any, and reject accidental time rollback.
4. Write a unique same-directory temporary artifact, flush it and compare its complete bytes.
5. Create a separate flushed history staging file. Atomically link it into the append-only archive with create-if-absent semantics. An existing name must contain exactly the same bytes.
6. Atomically rename the complete staged artifact over `public/roadmap-status.json`. This is the sole promotion point.
7. Best-effort removal of staging files and the owned lock. Cleanup never rewrites the commit result.

The old current file remains untouched on validation, serialization, write, flush, archive collision or pre-commit rename failure. Readers observe old or new complete bytes. The publisher does not coordinate external writers that ignore the lock. See the [Node filesystem API](https://nodejs.org/api/fs.html) and the filesystem assumptions in [Security](SECURITY.md).

## History and rollback

Archive path: `public/history/YYYY-MM-DD/<snapshotId>.json`, using the **observation date in UTC**. It contains only valid public snapshots. The current JSON is the publication pointer; archive existence alone does not prove a snapshot was promoted. A failed promotion may leave a valid unpromoted archive. No raw inputs or internal audit trail are published.

An explicitly requested rollback validates the archived artifact and atomically restores it without changing its observation or per-project dates:

```bash
npm run publish:snapshot -- --restore public/history/YYYY-MM-DD/SNAPSHOT_ID.json public
```

Replace the path with an existing validated archive. The page labels the restored snapshot by its actual observation time. This never updates or rolls back the private operational source. The normal publishing path refuses older observation/generation times.

A corrupt current artifact is not silently repaired. Recover it under operator supervision from verified history. A stale lock requires manual investigation. Cross-version history needs a future explicit validator/version migration; v1 accepts only its own contract/catalog versions.

## GitHub Pages hosting

`npm run build` produces a static release under `dist/`, intended for the root of `https://roadmap.xolosarmy.xyz/`. The HTML base is `/`; assets, the current snapshot, schema and history therefore resolve from that host root. Serve the full release as one reviewed deployment. Do not copy source checkout contents to the public document root.

GitHub Pages is the selected static host. It does not provide arbitrary custom response-header configuration for this deployment. The application retains the restrictive meta Content Security Policy and referrer policy that can be expressed safely in the document, but the deployment does not claim custom `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` or `frame-ancestors` response headers. In particular, `frame-ancestors` is not supported in a meta policy. If future threat modeling requires those response headers, an edge/proxy or different static host will be required.

The local preview server sets the following review-oriented headers:

```text
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; object-src 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Cache-Control: no-store
```

The supplied preview server performs no deployment. The GitHub Actions Pages workflow validates and builds from `main`, uploads only `dist/`, and deploys with the minimum Pages permissions. Enabling Pages, assigning the custom domain, changing GoDaddy DNS, enforcing HTTPS and promoting a release remain separately controlled operations. Contract or catalog changes require a coordinated code/data release so an older browser rejects incompatible data rather than guessing its meaning.

## Future automation model

Any later live reader belongs in a private operator environment, with read-only Google access and an explicit source identity/version boundary. It must run the same adapter/contract and review the sanitized candidate before promotion. Credentials and source identifiers must never enter this public repository or frontend. Unattended publication and its authorization model require a separate task.
