# Proposed roadmap: Tonalli Memo conversations and community tips

> **Proposal, 17 October 2026 — PLANNED.** This document is a public product/technical proposal, **not** a canonical roadmap status update, an approved protocol, evidence of a deployed feature, or authorization to move funds. The private xolosArmy Network operational roadmap remains authoritative. The public roadmap snapshot and its six-field publication contract are unchanged.

## Product outcome

Evolve [Tonalli Memo](https://github.com/xolosArmy/tonalli-memo) from a verified publishing feed into a place where the xolosArmy community can reply to Memos, react to posts and voluntarily tip creators in **eCash (XEC)** or **RMZ (eToken ALP)**. This is not a private messaging network or a replacement for Tonalli Wallet.

### Architectural principles

- **Wallet remains the authority:** only [Tonalli Wallet](https://github.com/xolosArmy/RMZWallet) holds user keys and performs reviewed, user-authorized signing and broadcast. Memo never becomes a custodian, an autonomous payer or a replacement wallet.
- **Distinct evidentiary layers:** posts/replies and payment receipts are verified against eCash; free likes are signed off-chain and must never be represented as blockchain facts.
- **Versioned compatibility:** the existing TM0 and TM1 Draft 0.2 postings and feed remain readable. A new reply wire format cannot silently reinterpret old transactions.
- **Fail closed:** no displayed “paid” or “tip verified” state without actual output/token evidence, correct payee, asset, chain and amount.
- **Controlled release:** every write and payment capability ships behind an independent flag with regression tests, security review and separate human go/no-go.

## Delivery phases and acceptance gates

| ID | Milestone | Main outcome | Acceptance gate |
| --- | --- | --- | --- |
| **S0** | Protocol RFC & threat model | Specify reply/reference envelope, reaction signatures, tip-intent/receipt links, abuse policies | Versioned RFC, compatibility analysis, negative test vectors and security sign-off |
| **S1** | Verified public replies | Threaded replies referencing original TXIDs; confirmed/reorg-aware indexing and safe rendering | Regtest/parser tests, restart/backfill and reorg tests; initially verified authors only |
| **S2** | Signed likes | Off-chain signed like/unlike, noncustodial identity checks and reliable aggregates | Replay/cross-origin/Sybil safeguards, idempotency and privacy review |
| **S3** | XEC tips | Wallet-mediated voluntary XEC transfer with independently verified receipt linked to a post | Explicit preview/approval, destination- and amount-matching, replay/double-count prevention, rollback |
| **S4** | RMZ tips | ALP RMZ transfers with XEC network-fee support and verified token receipt | Token ID/decimals/change/burn safeguards, insufficient-fee handling and explicit funds gate |
| **S5** | Trust, moderation & operations | User reporting, presentation-only moderation, rate limits, monitoring and recovery | Abuse/load tests, websocket/backfill continuity, support/incident runbooks |
| **S6** | Progressive community pilot | Opt-in launch by independent flags and measured expansion | Production acceptance and no regression to publishing, feed, Wallet or security boundaries |

No milestone is considered complete solely because a PR is created, tests pass locally or code is merged. Releases require reviewed exact code state and evidence from the relevant environment. No fixed dates or percentages are asserted before estimating and measuring delivery.

## Design sketch

**Reply envelope (proposed, not final):** a new versioned public post type contains a parent TXID, bounded UTF-8 content and a verifiable author binding. Unknown versions, invalid parents, cycles and unsupported encodings fail safely. Moderation can hide material from the app's presentation, but cannot erase public blockchain transactions.

**Reaction (proposed):** an authenticated signed message carries its domain, chain, actor, target TXID, like/unlike action, nonce or sequence and expiration. The server verifies signatures and maintains an auditable, rate-limited derived count. Private keys never reach the server.

**Tip (proposed):** the author links a verified receipt address to a profile. The viewer prepares a bounded, immutable tip intent targeting a specific post and asset; Wallet shows exact destination, amount and fee before separate approval/sign/broadcast. The post view reflects payment only after checking blockchain outputs (and ALP token details for RMZ). The source of economic authority is Wallet and eCash, not the Memo API.

**Payment attribution:** txid alone is insufficient to claim that a specific actor tipped a specific post. The RFC must specify a trustworthy link among signed intent, payer authorization, published transaction, verified destination and accounting status; ambiguous transfers remain unattributed rather than guessed. No speculative token return/yield is promised.

## Cross-repository responsibilities

- **tonalli-memo:** event contracts, parser/indexer, thread read models and API, reaction verification, tip-receipt verification, anti-abuse, public UI and operational metrics.
- **RMZWallet:** user signature/approval surface, reply broadcast when applicable, XEC/ALP transaction construction and broadcast, fee and token safety.
- **tonalli-core:** shared contracts only when ownership review shows a genuine canonical cross-product need. Avoid duplicating signing or token semantics.
- **roadmap:** public, sanitized progress projection only; this proposal is an optional supplementary explanation and does not alter the status dataset.
- **Future consumers:** visualizers and reputation systems may consume verified events after separate contracts and security review.

## PR sequence

1. RFC, security boundaries, compatibility and fixtures (documentation only).
2. Read-only reply indexing/API/UI behind flags, then Wallet reply composer with explicit approval.
3. Signed likes/unlikes and off-chain aggregation.
4. XEC tips intent/Wallet approval, then verification and receipt UI.
5. RMZ/ALP tip flows and token-aware settlement verification.
6. Abuse protection, monitoring, regtest/staging test matrix, pilot and rollout.

Each money-related PR requires **no-key-server**, **no-unapproved-broadcast**, **no-false-settlement** and **no-double-attribution** checks. Initial financial features remain disabled until an explicit go/no-go.

## Quality checklist

Compatibility with TM0/TM1 history; OP_RETURN size limits; input/author binding; XSS and malformed UTF-8; invalid TXIDs/cycles; websocket interruption; backfill and shallow reorg; false finalization; forged/cross-origin/replayed reaction signatures; fake receipts; altered recipient; wrong token ID; decimals and fee insufficiency; unintentional token burn; Wallet cancellation; app accessibility and Spanish/English presentation; observability; backups and rollback.

## Decision register for S0

1. Reply protocol version and its relation to existing TM1 drafts.
2. Author eligibility for replies during and after the pilot.
3. Signed-like identity, privacy/retention and Sybil policy.
4. Exact transaction-to-post attribution semantics for tips.
5. Publisher receipt-address authorization and rotation.
6. Moderation appeal and permanently public content warnings.
7. Wallet-controlled fee displays, transaction confirmation and cancellation.
8. Clear separation from private-message functionality.

## Publication boundary

This plan intentionally omits private operational rows, topology, credentials, internal deployment links, treasury/risk rules and unreleased implementation details. It is subject to the canonical roadmap's review process. The live public **roadmap-status.json is unchanged**; only an authorized, freshly observed and validated publication may update that snapshot.
