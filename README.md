# xolosArmy Public Roadmap

A small, versioned public view of xolosArmy Network. The canonical production URL is `https://roadmap.xolosarmy.xyz/`. Repository changes do not modify the private canonical roadmap.

**The public roadmap is a sanitized derivative of the private operational roadmap and is not itself the canonical source of truth.**

## Authority and scope

The private Google Sheet and Drive strategy documents remain canonical. GitHub and tests are evidence only. This new implementation is based on tracker 1.2, the current strategic addendum and operating instruction, and an explicit public allowlist. It is not a recovered or equivalent copy of the unavailable historical implementation.

Contract: `xolosarmy-public-roadmap/1.0.0`. Catalog: `2026-09-20.1`.

Eight selected public surfaces are represented. The adapter reads only `Project`, `Roadmap Phase`, `Priority`, `Status`, `Security Status`, and `Last Update`. Unknown identities are excluded before reading their other fields; every selected public identity must occur exactly once. No private roster, source document IDs, raw operational exports, dependency graph, repository URLs or free-text evidence are included.

## Local verification

Use Node **24.19.0**, the version used by CI. All development dependencies are exact versions in the lockfile. The shipped frontend has no framework or runtime package dependency.

```bash
npm ci --ignore-scripts
npm run check
npm run serve
```

Preview: `http://localhost:4173/`. Build output is `dist/`. The preview server is for local review only.

## Manual publication

```bash
# Reproduce the included, dated public snapshot.
npm run publish:snapshot -- examples/publication-input.json public

# A fresh export belongs outside this public repository.
npm run publish:snapshot -- /secure/export.json public
```

The sample is a sanitized historical input, not a live source or an automatic refresh. Publication never contacts Google or GitHub. A trusted operator supplies a fresh read-only capture and explicit timestamps. Review the resulting diff before committing it. See [Publication](docs/PUBLICATION.md).

An invalid candidate cannot replace the last valid snapshot. The publisher validates before and after serialization, stages complete UTF-8 bytes, archives sanitized history and atomically replaces the current JSON. It serializes cooperating writers with an exclusive lock.

## Public page

The page fetches only its own public snapshot, checks schema, exact project identity, timestamps and integrity, then renders. It supports overview and phase/status/priority/security filters. Missing or invalid data shows a controlled unavailable state. Without JavaScript, context, the JSON link and donation address remain accessible. No progress percentages, rankings, analytics, Google access or fallback to unverified data are present.

At the bottom, voluntary project support uses exactly:

```text
ecash:qq7qn90ev23ecastqmn8as00u8mcp4tzsspvt5dtlk
```

The full address is displayed and copied unchanged. The wallet URI contains no amount. No QR, payment backend or donation tracking is included.

## Review documents

- [Contract and source derivation](docs/CONTRACT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security boundaries](docs/SECURITY.md)
- [Publication, history and rollback](docs/PUBLICATION.md)
- [Provenance and release limitations](docs/PROVENANCE.md)

Production uses GitHub Pages through the reviewed workflow in `.github/workflows/pages.yml`. Merge, Pages configuration, custom-domain setup and DNS changes remain separate authorized operations. Independent review must identify the exact candidate HEAD before any release operation.
