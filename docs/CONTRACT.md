# Public Roadmap Contract 1.0.0

## Source derivation

The public roadmap is a sanitized derivative of the private operational roadmap and is not itself the canonical source of truth.

This is a new implementation. The sources inspected for its design were:

| Canonical source | Role in this contract |
| --- | --- |
| Operational tracker, version 1.2; observed 20 September 2026 | Project state, phases, priorities, source security values and update timestamps |
| Strategic Roadmap PDF, revision 24 August 2026 | Project roles and identity distinctions; public contracts, Wallet, Memo and editorial surfaces |
| Strategic Roadmap Addendum, effective 18 September 2026 | Open interface / closed implementation; private by default; separation of public discovery from internal topology |
| Canonical Roadmap Operating Instruction v1.2, effective 18 September 2026 | Authority boundaries, evidence semantics, dates, state vocabularies and source classification |
| Current Operating Rules R3, R5-R6, R10-R15 | No duplicate authority; evidence before completion claims; private source boundaries |

Source document IDs, private URLs, private project names and raw source text are deliberately absent. Authorized maintainers resolve the private references through the operational tracker's Config. The input source is not inferred from repository activity.

The new contract version is `xolosarmy-public-roadmap/1.0.0`; this is an independent version line, with no claim of compatibility with historical Contract v1. The public schema is generated from `src/policy.ts`, compiled once by Ajv, and shared by the publisher and browser.

## Selected public catalog

| Exact source Project | Public ID | Display name | Publication basis |
| --- | --- | --- | --- |
| `tonalli-core` | `tonalli-contracts` | Tonalli Contracts | Shared contracts and primitives: Roadmap §2 and §4; Instruction §4; Addendum §2. The label distinguishes existing contracts from a prospective full node. |
| `RMZWallet / Tonalli Wallet` | `tonalli-wallet` | Tonalli Wallet | User-facing wallet and cryptographic client: Roadmap §2 and §4; Instruction §4; Addendum §2. |
| `tonalli-memo` | `tonalli-memo` | Tonalli Memo | Public publication/verification surface: Roadmap §6; Instruction §4; Addendum §2. |
| `x402-XEC` | `x402-xec` | x402-XEC | Public payment-protocol interface: Roadmap §7; Instruction §4; Addendum §2 and §7. |
| `xolosramirez` | `xolos-ramirez` | Xolos Ramírez | Human-facing website/editorial surface: Roadmap §11; Addendum §2. |
| `ecash-mexico` | `ecash-mexico` | eCash México | Editorial website: Roadmap §11; Addendum §2. |
| `ecash-magazine` | `ecash-magazine` | eCash Magazine | Editorial website: Roadmap §11; Addendum §2. |
| `tonalli-landing` | `tonalli-website` | Tonalli Website | Human-facing landing site: Roadmap §11; Addendum §2. |

This is a conservative selected catalog, not an inventory of all operational rows. Selecting a public interface does not release its backend. No excluded count, private roster or classification rationale identifying private implementations is published. Mixed or ambiguous surfaces remain excluded. Future catalog additions need an explicit documented public classification, a version change and review.

## Input authority

`adaptSheetRows(rows, { observedAt, generatedAt })` accepts a tabular JSON array. Row zero is the header; remaining rows are cell arrays. It is pure and has no reader credentials, network client, filesystem access or write capability.

| Source field | Public transformation |
| --- | --- |
| Project | Exact lookup only; ID and display name come from the closed catalog |
| Roadmap Phase | Exact accepted phase; no percentage or phase progress is derived |
| Priority | Exact P0-P3; never a computed project rank |
| Status | Exact closed operational vocabulary |
| Security Status | Closed conservative mapping below; no free text |
| Last Update | Strict local timestamp, resolved explicitly in America/Mexico_City, output as UTC |

Headers are case-sensitive and whitespace-sensitive. Missing or duplicated canonical headers fail. Unknown columns are ignored and are not read. Source identity must be exactly matched; no trim, case folding, fuzzy match or invented project is allowed.

Unselected identities are denied by default and never enter a public candidate. Their other cells, number and private metadata cannot affect valid output. A typo or missing row for a selected project fails the required complete public roster. Duplicate selected identities fail the whole operation. This deliberately distinguishes an excluded source row from an unknown public project ID: unknown IDs in a candidate are always rejected.

Dependencies and evidence are **absent in v1**. The private dependency table was inspected for classification, not exported. No public edge-level release classification was available to justify reproducing it. Every dependency/evidence/URL property, including a well-formed public URL, is outside this schema and is rejected. Introducing any such field requires a separately reviewed contract version with structured references and an intentional public classification.

## Vocabularies and source differences

Phases: `0/Core`, `A`, `B`, `C`, `D`, `E`, `F`, `Long-term`, `Ops`. Priorities: `P0`, `P1`, `P2`, `P3`. Specialized private phase/priority values are not imported into the public vocabulary.

Statuses: `ACTIVE`, `BLOCKED`, `REVIEW`, `FROZEN`, `COMPLETE`, `PLANNED`, `MAINTENANCE`, `RESEARCH`, `PRE-ENGINEERING`, `WAITING`.

The current Config and source rows include `PLANNED` and `PRE-ENGINEERING`; Instruction §15 also defines `WAITING`. This new contract explicitly accepts their union rather than silently remapping observed states. Acceptance of a vocabulary value does not create a project or assign that state.

| Source security value | Public value | Meaning shown |
| --- | --- | --- |
| PASS | REPORTED_PASS | Reported gate passed |
| CONDITIONAL | CONDITIONAL | Conditions remain |
| BLOCKED | BLOCKED | Gate blocked |
| PENDING | PENDING | Assessment pending |
| NOT_ASSESSED | NOT_ASSESSED | Not assessed |
| N/A | NOT_REPORTED | No assessment reported |

`N/A` is observed in current rows despite not being listed in Instruction §16. Its mapping conveys no positive assurance. PASS is not an audit, security certification, deployment or production-readiness claim. The page reports the source's value; it does not independently reassess that gate.

## Output and exact validity

Root fields are only `contractVersion`, `catalogVersion`, `observedAt`, `generatedAt`, `snapshotId`, `projects`. Each project has only `id`, `name`, `phase`, `priority`, `status`, `securityStatus`, `lastUpdate`. All fields are required, with additional properties rejected at both object levels.

- `catalogVersion` binds the intentionally selected publication roster.
- `observedAt` is the time the read-only source capture completed, not a per-project assessment.
- `generatedAt` is the caller-supplied artifact generation time, not evidence time. The initial artifact uses the same explicitly supplied capture time for reproducibility.
- `snapshotId` is SHA-256 of the canonical unsigned object (the root without `snapshotId`). It detects byte changes; it is not a signature, provenance attestation or proof of truth.
- `projects` is the exact complete catalog in ascending public-ID order. No internal total or excluded count is emitted.

Timestamps use whole-second UTC `YYYY-MM-DDTHH:MM:SSZ`, years 2000-2099, and must round-trip as actual calendar instants. Every `lastUpdate <= observedAt <= generatedAt`. Invalid dates, DST gaps and ambiguous historical local times fail. Local input accepts `YYYY-MM-DD HH:MM` or `YYYY-MM-DD HH:MM:SS` only. Numeric Google serial dates, locale formats and implicit workstation-timezone parsing are unsupported.

Canonical encoding recursively sorts object keys, preserves the required array order, emits compact JSON in UTF-8 and appends exactly one LF. Wire input must match that encoding exactly. This rejects duplicate JSON keys, alternate encodings and trailing payload. Maximum public artifact size: 64 KiB. No secret values appear in public errors.

JSON Schema checks structure and vocabularies. Shared semantic validation checks identity bindings, complete sorted roster, actual calendar dates, chronology and digest. Both layers are mandatory. Structural validation alone is insufficient.
