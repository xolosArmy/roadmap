# Provenance and release notes

**CANONICAL ROADMAP SOURCE:** private Google Sheet / Drive.

**HISTORICAL PUBLIC-ROADMAP IMPLEMENTATION:** unavailable locally and remotely; not provenance-recovered.

**NEW IMPLEMENTATION BASIS:** current canonical Sheet, tracker 1.2; current strategic documents; explicit public allowlist; current Operating Rules; the owner's scope correction authorizing a new implementation.

The public roadmap is a sanitized derivative of the private operational roadmap and is not itself the canonical source of truth.

## Historical inspection

The source website repository was inspected at `5e9de58ac065d0887ae0aded8fb44bd2dfed83b9`, tree `282a170ba8e9fe0267c80f5ba1466989f6fdc1d6`. No source changes were made there.

Historical public-contract candidate `c2f5cd8119f3b7b8091df77ebf22ea75d228f7d9` and adapter candidate `9dceba429b399a5bc3e06e0897ce762a5f4074e8` were unavailable through GitHub and the retrieved source history. They are recorded only as **PRIOR IMPLEMENTATION — UNAVAILABLE / NOT PROVENANCE-RECOVERED**.

No historical implementation files, catalog, manifest, validator, adapter, tests or dependencies were copied. Historical test counts and acceptance statements are not current verification results. The new implementation is not claimed to be byte-identical, code-identical, semantically identical or wire-compatible with that work.

## New work and classification

This repository is an intentionally public interoperability/presentation surface. It contains a newly defined public contract, pure adapter, deterministic publisher, public-only catalog, frontend, tests and CI. It contains no production orchestration, wallet keys, signer, settlement engine, private discovery or source reader credentials.

The minimal initial `main` baseline contains only a five-line README. It establishes a PR base; all feature implementation belongs on `astra/public-roadmap-v1`. A bootstrap README is not an implementation release.

The initial public observation is `2026-09-20T18:13:26Z`, from a single bounded read of the source table. Only the six allowed columns for the eight selected public identities were retained for the reproducible public input. All six named source tabs were inspected; their raw content was not committed. The PDF and both current strategic documents were read; they are not redistributed here. This is source observation, not an independent attestation of every reported project state.

## Known limitations and release gates

- The catalog is deliberately limited to eight clear public surfaces. Other identities and all dependency/evidence data remain excluded pending explicit public classification and a versioned contract change.
- No live Google transport or unattended update exists. New public snapshots require a fresh read-only operator capture and review.
- Interactive rendering requires JavaScript and Web Crypto. The no-JavaScript page provides context, raw JSON access and full donation details.
- Snapshot integrity is unkeyed; it is not origin authentication, a signed statement, an independent audit or a deployment attestation.
- Publisher guarantees assume a trusted local POSIX filesystem and cooperating writers. Read the documented crash/rollback limitations.
- Automated frontend tests exercise the DOM and generated JavaScript. They do not establish real-browser rendering, visual accessibility or actual wallet application handling. Graphical desktop/mobile verification remains a review gate when a browser can reach the local preview.
- Independent exact-HEAD review, successful hosted CI and a separate approved deployment/routing plan are still required. No merge, DNS change, production routing change or deployment is authorized by this implementation.

**MERGED: NO**

**PRODUCTION DEPLOYED: NO**
