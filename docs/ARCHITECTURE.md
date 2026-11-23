# Architecture

The public roadmap is a sanitized derivative of the private operational roadmap and is not itself the canonical source of truth.

The dependency consumed by this project is the current publication policy and canonical operational source. The downstream capability is a read-only public roadmap. No wallet, identity, signing, payment or operational authority is created. This is independent publication work authorized explicitly by the project owner; no new operational row or strategic phase is invented for it.

## Authority hierarchy

1. Private Google Sheet: operational truth.
2. Drive Roadmap and current Addendum: strategy and visibility doctrine.
3. New public contract: publication allowlist, schema and validation policy.
4. Read-only adapter: constrained transformation of a supplied source capture.
5. Snapshot: sanitized derivative.
6. Frontend: presentation only.

GitHub commits, pull requests and tests are evidence of their stated scope. They never override Sheet state. Neither the artifact nor browser writes back into the source.

## Code boundaries

| Area | Responsibility |
| --- | --- |
| `src/policy.ts` | Public-only catalog, six input field names, versioned vocabulary, schema and donation constant |
| `generated/snapshot-validator.mjs` | Generated structural validator; shared by Node and the browser |
| `src/contract.ts` | Canonical JSON, identity/chronology validation, integrity and immutable snapshots |
| `src/adapter.ts` | Pure exact-column projection and explicit timezone normalization |
| `src/publisher.ts` | Local fail-closed atomic JSON publication and append-only sanitized history |
| `src/frontend.ts` | Bounded same-origin read, validation, filters, DOM rendering and copy action |
| `web/` | Static presentation; no embedded project status |
| `scripts/build.ts` | Validates and copies an explicit static artifact list into `dist/` |

Ajv runs at build time to generate a standalone validator. Runtime code does not compile schemas or require `unsafe-eval`. See [Ajv standalone documentation](https://ajv.js.org/standalone.html).

The frontend performs one same-origin GET of `roadmap-status.json`, with credentials omitted, redirects rejected and browser cache bypassed. It enforces a size limit while streaming, validates UTF-8, schema, semantic invariants and the digest, then renders text nodes. No `innerHTML` is used for data. Filters work on a fresh selection of an immutable snapshot.

No data is rendered until validation finishes. A failed refresh removes the former project display and metadata. No local-storage/service-worker cache or unverified last-known-good fallback exists in the browser. An older artifact intentionally restored by the publisher remains labeled by its original observation and update dates.

The page exposes context, full support address, wallet link and JSON access without JavaScript. Browser-side validation and interactive project rendering require JavaScript and Web Crypto. This limitation is explicit in the page and release notes.

The build has no Google credentials or source IDs. It copies only the shell, CSS, favicon, bundled frontend, public schema, validated current snapshot and validated history. Private exports, tests, local diagnostic paths, package sources and publisher code are not static hosting assets.


## Dated audiovisual outlook (editorial, not a snapshot)

On 23 November 2026 the owner requested a public-facing summary of four strategic audiovisual initiatives related to Xolos Ramírez TV. The static `#audiovisual` section presents only their public identifiers and bounded descriptions: XR-TV-TIP-01, TM-VIDEO-01, XR-TV-LIVE-01 and XR-TV-MEMBER-01. Public disclosure is limited to conceptual plans; there are no internal gates, implementation repositories, funding details, infrastructure paths, private dependencies, user identities or credentials.

This is an explicitly dated editorial note, not a project record in contract 1.0.0 and not an alternate data transport. It contains no structured status, priority, security or update fields; the validated eight-project snapshot and its counts remain unchanged. Editors must manually reconcile the note against the canonical roadmap before revising it, and remove stale claims rather than silently declaring a deployment. A future release that adds these identities to the filterable project roster requires a separately reviewed public catalog classification, versioned contract, regenerated validator and an immutable-history migration plan.
