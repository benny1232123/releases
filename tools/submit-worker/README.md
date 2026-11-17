# Findings sandbox (submit.transitfabric.xyz)

A small worker that takes Transit Fabric findings privately. The source is `worker.js` and the shared code in `../lib/`. It is published so anyone can see what it does with what you send.

## The signed finding form: `GET /finding`, `POST /finding`

This is the only way a finding earns points.

- **Who:** anyone registered on the [claim page](https://transitfabric.xyz/claim.html) with their hotkey or coldkey address. The form must be signed by that address.
  - The worker keeps a list of registered addresses and their tiers, which the maintainers rebuild from the registration Issues and validators' published test results (`PUT /admin/registered`).
  - A finding from any other address gets a 403 and nothing is stored. A new registration is picked up within the hour.
- **Fields:** all are required except `details`.

  | Field | What it is |
  |---|---|
  | `github`, `address` | Your registration |
  | `title` | The finding in one line |
  | `version` | A release tag, or `redteam-pack-<sha>` |
  | `severity` | `critical`, `high`, `medium` or `low` |
  | `eligibility` | `verified` or `open` |
  | `component` | Which part of the software |
  | `repro` | Steps to reproduce |
  | `expected`, `actual` | What should happen, and what did |
  | `details` | Optional |
  | `poc` | A proof-of-concept `.zip`, up to 10 MiB |
  | `date`, `signature` | The date in the message, and your signature over it |
  | `age_attested`, `terms_version` | `yes`, and the [Terms](https://transitfabric.xyz/terms.html) and [Privacy Policy](https://transitfabric.xyz/privacy.html) version you accept (now `1`). See "Age attestation" below |

- **Signature:** the wallet signs
  `Transit Fabric finding: github=<user>, address=<ss58>, sha256=<digest>, date=<YYYY-MM-DD>`.
  - `<digest>` is the SHA-256 of the fields' canonical JSON. That is the twelve keys in `../lib/finding.mjs` (`SIGNED_KEYS`), sorted, each value with CRLF turned into LF and its ends trimmed, and no whitespace. `poc_sha256` is the zip's SHA-256.
  - The worker computes the digest from what it received and checks the signature as the claim page does (`../lib/sig.mjs`). That means sr25519 or ed25519, over `<Bytes>message</Bytes>` (a browser wallet or `btcli wallet sign`) or over the bare message.
  - The date must be today or yesterday (UTC).
- **What it refuses:**
  - No age attestation, or a terms version we haven't published (400, before anything is read from or written to storage).
  - A missing field, or no zip.
  - The `open` tier with a severity below High. The tier used is the lower of the one you claim and the one on the list.
  - A bad signature. The reply is a 401 that gives the exact message expected.
  - A finding already submitted (409), compared by your public key, so another ss58 prefix doesn't make it new.
  - Going over the open-findings limit (429). The limit is 5 for `verified` and 1 for `open`, counted per address until a maintainer records a verdict.
- **What it doesn't decide:** the maintainers' first pass recounts open findings and checks everything else, and a maintainer decides every finding.

## The plain upload: `POST /upload`

Markdown (UTF-8, up to 1 MiB) in form field `file`, an optional `.zip` up to 10 MiB in `attachment`, and an optional `contact` of up to 200 characters. A raw `text/markdown` body works too, with the attestation in the headers `X-TF-Age-Attested: yes` and `X-TF-Terms-Version: 1`. It needs no account and **earns no credit**. Like the signed form, it needs `age_attested=yes` and `terms_version`.

## Age attestation

Both ways in need a ticked box: "I am 18 or older, or the age of majority where I live, whichever is higher, and I accept the Terms and Privacy Policy". From a script, send `age_attested=yes` and `terms_version=1`. Without them the request gets a 400 and nothing is stored.

The worker stores only `{"age_attested": true, "terms_version": "1", "ts": "<time received>"}` with the submission. It never asks for or stores a date of birth.

A registration signed before the age line was added to the claim message still works here, and the reply says `"needs_reattest": true`. Such a registration isn't payable until you sign the current message on the [claim page](https://transitfabric.xyz/claim.html). Nothing you sent is deleted.

## Storage and limits

- **Storage:** everything is stored privately in the worker's key-value store and never served back to the public.
- **Your address:** client addresses are never stored.
  - The limits count by IPv4 address, or by IPv6 /64: a few requests a minute, and 10 uploads and 10 findings a day.
  - The daily counter's key is a hash salted per day, kept for two days.
  - Every cheap check (size, type, fields, date, signature) runs before anything is written.
- **The reply:** JSON with a receipt ID, the SHA-256 and the time received.

## For maintainers

The bearer-authenticated `/admin/*` routes take a token that is a worker secret, never in this repository:

- `GET /admin/list` lists both kinds.
- `GET /admin/get/<key>` returns one submission.
- `GET /admin/zip/<receipt>` returns its zip.
- `POST /admin/verdict/<receipt>` takes `{"status": "valid|invalid|duplicate|closed", "reason": "..."}`. It records the decision and frees the submitter's open-findings slot.
- `GET /admin/verdict/<receipt>` returns the recorded decision.
- `PUT /admin/registered` takes `{"accounts": [{"address" or "account", "github", "tier", "needs_reattest"?}]}` and replaces the registered-accounts list. `GET /admin/registered` returns it.

## Building it yourself

`worker.js` imports `../lib/sig.mjs`, `../lib/finding.mjs` and `../lib/terms.mjs` (in `tools/lib/`). Those need `@noble/curves` 2.4.0, `@noble/hashes` 2.4.0, `@scure/base` 2.4.0 and `@scure/sr25519` 2.4.0. `wrangler.toml` shows the bindings the worker expects (a key-value namespace `SUB` and a rate limiter `RATE_LIMITER`); the namespace id there is a placeholder, and the two secrets are never in this repository.
