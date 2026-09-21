# Security boundaries

The public roadmap is a sanitized derivative of the private operational roadmap and is not itself the canonical source of truth.

## Disclosure model

Open interface, closed implementation. Ambiguity fails closed to private.

Public source code contains only the selected public catalog. It does not contain the complete source roster, private repository names or URLs, private branch names, source file IDs, credentials, operational prose, private hostnames or internal graph. Fixtures use invented hostile canaries rather than real private identifiers.

Raw operational exports must be supplied from outside this public checkout. Only the six fields for selected public identities may survive the projection. Extra headers and source text have no publication authority. An unselected row is not logged, counted or copied into output. Missing or mistyped selected identities cause complete rejection.

No dependency or evidence field is exposed in contract 1.0.0. This is an intentional conservative boundary, not a claim that no dependencies exist. Publishing a repository does not establish that it belongs in the catalog. Schema changes and catalog changes require reviewed public classification.

## Failure behavior

Invalid input, schema/version mismatch, incomplete/duplicate/unknown public identity, unrecognized enums, invalid dates, unknown properties and integrity failure abort the whole candidate. There is no first-wins merge, best-effort partial roster, default enum, silently shortened address or inferred progress.

Public errors are fixed codes. Private row values and validator diagnostics are not included. The browser exposes a fixed unavailable message. Refresh races cannot resurrect the result of an older request.

## Trusted computing base and limitations

- The source reader/operator, publication policy, checked-out code and output directory are trusted. The adapter validates an input's permitted shape; it does not authenticate Google origin. A malicious authorized publisher could supply incorrect allowlisted statuses. Independent review remains necessary.
- SHA-256 protects artifact integrity, not origin or correctness. An attacker controlling the hosting origin can replace both code and data. HTTPS, deployment controls and reviewed releases remain host responsibilities.
- The local publisher assumes a local filesystem with POSIX same-directory atomic rename and hard links, and cooperating writers that respect its exclusive lock. It rejects symlink output targets. It is not a distributed transaction, NFS safety mechanism or OS-level immutable ledger.
- Complete staging files are flushed before promotion. The guarantee is atomic visibility to concurrent readers and preservation on pre-commit failures; it is not a complete power-loss durability guarantee for filesystem directory metadata.
- A process crash may leave a lock or staged file; recovery is manual. Do not remove a lock until its writer is known to have stopped. An archive created before a failed pointer promotion is valid but was not necessarily ever published.
- History is append-only under the publisher, with independent inodes and create-if-absent publication. Filesystem administrators can still alter files. History validation detects corruption; there is no cryptographic signature hierarchy.
- Date conversion depends on the runtime's IANA timezone data. Node is pinned in CI; ambiguous or nonexistent historical local times are rejected.
- This page reports source security labels without asserting independent security review, successful deployment or production readiness.

## Browser and donation behavior

The UI uses text nodes, a closed catalog, bounded reads and no credential-bearing requests. A restrictive meta Content Security Policy excludes remote scripts and dynamic evaluation, and a meta referrer policy applies `no-referrer`. GitHub Pages is the selected static host and does not provide arbitrary custom response-header configuration for this deployment. The absence of custom `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` and Content Security Policy response headers is a known, accepted hosting limitation; this repository does not claim those headers are present. `frame-ancestors` cannot be expressed in a meta policy. A future requirement for those response headers would require an edge/proxy or different static host.

Support is voluntary and direct to the exact constant in `src/policy.ts`. Copy failure provides a manual fallback without falsely claiming success. The wallet link has no amount or intermediary. There is no QR, donation backend, donor identity capture or donation analytics. Opening a wallet does not initiate or sign a transfer in this application.

The test suite checks these properties within its stated scope. A green suite does not constitute a general security audit. Independent exact-HEAD review is required before merge or deployment.
