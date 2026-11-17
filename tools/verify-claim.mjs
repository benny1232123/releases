#!/usr/bin/env node
// Verifies a Transit Fabric bounty registration claim (docs/claim.html).
//
//   npx -y -p @polkadot/util-crypto@14.0.3 -p @polkadot/util@14.0.3 -p @polkadot/keyring@14.0.3 \
//     node tools/verify-claim.mjs --message "<message>" --address <ss58> --signature <hex>
//   ... node tools/verify-claim.mjs --claim claim.txt     (the claim block from the claim page; "-" reads stdin)
//   ... node tools/verify-claim.mjs --self-test           (throwaway key: valid passes, tampering fails)
// Without npx: `cd tools && npm ci && node verify-claim.mjs ...` (versions pinned in package.json).
//
// Prints "valid" or "invalid" and exits 0 or 1. Exit 2 means bad usage.
//
// Two message formats (lib/terms.mjs holds the shared values):
//   v2: "Transit Fabric bounty v2: github=<user>, address=<ss58>, date=<YYYY-MM-DD>, age=18+,
//       terms=<version>. <attestation sentence>". The signer attests 18+ (or the age of majority
//       where they live, whichever is higher) and accepts the Terms and Privacy Policy.
//   v1: the old message with no age line. Valid only when dated before OLD_CLAIMS_BEFORE, and then
//       reported as "valid, needs re-attestation": registered, but not eligible for awards until
//       the signer signs a v2 message.
// A browser wallet's signRaw signs "<Bytes>" + message + "</Bytes>", and so does btcli (9.23.2,
// checked). A signature over the bare message is accepted too; the output says which one matched. Nothing here touches a network.
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OLD_CLAIMS_BEFORE, TERMS_VERSIONS, attestationSentence } from './lib/terms.mjs';

// Resolve a pinned package: normally from node_modules next to this script (npm ci); under
// `npx -p <pkg>` it lives in npx's cache, whose node_modules/.bin npx puts on PATH.
async function load(name) {
  try { return await import(name); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    const root = join(dir, '..', name);
    if (dir.endsWith(join('node_modules', '.bin')) && existsSync(join(root, 'package.json'))) {
      return import(pathToFileURL(join(root, 'index.js')).href);
    }
  }
  console.error(`cannot find ${name}; run: cd tools && npm ci`);
  process.exit(2);
}
const { hexToU8a, isHex, stringToU8a, u8aWrapBytes } = await load('@polkadot/util');
const { decodeAddress, signatureVerify, cryptoWaitReady, mnemonicGenerate } = await load('@polkadot/util-crypto');

const MESSAGE_RE = /^Transit Fabric bounty: github=([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))( ?), address=([1-9A-HJ-NP-Za-km-z]{40,60}), date=(\d{4}-\d{2}-\d{2})$/;
const MESSAGE_V2_RE = /^Transit Fabric bounty v2: github=([A-Za-z0-9](?:[A-Za-z0-9-]{0,38})), address=([1-9A-HJ-NP-Za-km-z]{40,60}), date=(\d{4}-\d{2}-\d{2}), age=18\+, terms=([0-9A-Za-z.-]{1,16})\. (.+)$/;

/** The v2 message for these fields: what the claim page asks a wallet to sign. */
export function claimMessage({ github, address, date, terms }) {
  return `Transit Fabric bounty v2: github=${github}, address=${address}, date=${date}, age=18+, terms=${terms}. ${attestationSentence(terms)}`;
}

const isCalendarDate = (d) => { const t = Date.parse(`${d}T00:00:00Z`); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d; };

/** Returns { ok, how, crypto, reason, fields }; fields.needs_reattest is true for a valid old-format claim. */
export function verifyClaim({ message, address, signature }) {
  const fields = {};
  const m2 = MESSAGE_V2_RE.exec(message);
  const m = m2 ? null : MESSAGE_RE.exec(message);
  if (m2) {
    fields.github = m2[1]; fields.address = m2[2]; fields.date = m2[3]; fields.terms = m2[4]; fields.format = 2; fields.needs_reattest = false;
    if (!isCalendarDate(fields.date)) return { ok: false, reason: 'date is not a calendar date', fields };
    if (!TERMS_VERSIONS.includes(fields.terms)) return { ok: false, reason: `terms version ${fields.terms} is not one that was published`, fields };
    if (message !== claimMessage(fields)) return { ok: false, reason: 'the attestation sentence is not the published one', fields };
  } else if (m && m[2] === '') {
    fields.github = m[1]; fields.address = m[3]; fields.date = m[4]; fields.terms = null; fields.format = 1; fields.needs_reattest = true;
    if (!isCalendarDate(fields.date)) return { ok: false, reason: 'date is not a calendar date', fields };
    if (fields.date >= OLD_CLAIMS_BEFORE) return { ok: false, reason: `the message has no age attestation; from ${OLD_CLAIMS_BEFORE} a claim must use the current claim page (message "Transit Fabric bounty v2: ...")`, fields };
  } else {
    return { ok: false, reason: 'message is not "Transit Fabric bounty v2: github=<user>, address=<ss58>, date=<YYYY-MM-DD>, age=18+, terms=<version>. <attestation>"', fields };
  }
  try { decodeAddress(address); } catch { return { ok: false, reason: 'address is not a valid ss58 address', fields }; }
  // The address in the message and the address that signed must be the same account.
  const same = (a, b) => Buffer.from(decodeAddress(a)).equals(Buffer.from(decodeAddress(b)));
  try { if (!same(fields.address, address)) return { ok: false, reason: 'address in the message differs from the signing address', fields }; }
  catch { return { ok: false, reason: 'address in the message is not a valid ss58 address', fields }; }
  const sig = String(signature).trim();
  if (!isHex(sig.startsWith('0x') ? sig : `0x${sig}`)) return { ok: false, reason: 'signature is not hex', fields };
  const sigBytes = hexToU8a(sig.startsWith('0x') ? sig : `0x${sig}`);
  const raw = stringToU8a(message);
  for (const [how, data] of [['<Bytes>-wrapped: browser wallet or btcli', u8aWrapBytes(raw)], ['raw bytes', raw]]) {
    let r;
    try { r = signatureVerify(data, sigBytes, address); } catch { continue; }
    if (r.isValid) return { ok: true, how, crypto: r.crypto, fields };
  }
  return { ok: false, reason: 'the signature does not match this message and address', fields };
}

await cryptoWaitReady();

function parseClaim(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf(': ');
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    if (['message', 'address', 'signature'].includes(k)) out[k] = line.slice(i + 2).trim();
  }
  return out;
}

async function selfTest() {
  const { Keyring } = await load('@polkadot/keyring');
  await cryptoWaitReady();
  const kp = new Keyring({ type: 'sr25519', ss58Format: 42 }).addFromMnemonic(mnemonicGenerate()); // throwaway, never stored
  const message = claimMessage({ github: 'octocat', address: kp.address, date: '2026-11-20', terms: TERMS_VERSIONS[TERMS_VERSIONS.length - 1] });
  const hex = (u) => `0x${Buffer.from(u).toString('hex')}`;
  const wrapped = hex(kp.sign(u8aWrapBytes(stringToU8a(message))));
  const rawSig = hex(kp.sign(stringToU8a(message)));
  const sign = (m) => hex(kp.sign(u8aWrapBytes(stringToU8a(m))));
  const oldBefore = `Transit Fabric bounty: github=octocat, address=${kp.address}, date=2026-11-12`;
  const oldAfter = `Transit Fabric bounty: github=octocat, address=${kp.address}, date=${OLD_CLAIMS_BEFORE}`;
  const edited = message.replace('18 or older', '16 or older');
  const r1 = verifyClaim({ message: oldBefore, address: kp.address, signature: sign(oldBefore) });
  const cases = [
    ['old-format claim before the switch is valid, flagged needs re-attestation', { message: oldBefore, address: kp.address, signature: sign(oldBefore) }, true],
    ['old-format claim on or after the switch is invalid', { message: oldAfter, address: kp.address, signature: sign(oldAfter) }, false],
    ['an edited attestation sentence is invalid, even if signed', { message: edited, address: kp.address, signature: sign(edited) }, false],
    ['wallet-style signature is valid', { message, address: kp.address, signature: wrapped }, true],
    ['raw-bytes signature is valid', { message, address: kp.address, signature: rawSig }, true],
    ['tampered github name is invalid', { message: message.replace('octocat', 'mallory'), address: kp.address, signature: wrapped }, false],
    ['tampered date is invalid', { message: message.replace('2026-11-20', '2026-11-21'), address: kp.address, signature: wrapped }, false],
    ['another account is invalid', { message, address: new Keyring({ type: 'sr25519', ss58Format: 42 }).addFromMnemonic(mnemonicGenerate()).address, signature: wrapped }, false],
    ['flipped signature byte is invalid', { message, address: kp.address, signature: wrapped.slice(0, -2) + (wrapped.endsWith('00') ? '01' : '00') }, false],
    ['wrong message shape is invalid', { message: 'hello', address: kp.address, signature: wrapped }, false],
  ];
  let bad = r1.fields.needs_reattest === true ? 0 : 1;
  if (bad) console.log('FAIL old-format claim is not flagged needs re-attestation');
  for (const [name, input, want] of cases) {
    const got = verifyClaim(input).ok;
    if (got !== want) bad++;
    console.log(`${got === want ? 'ok  ' : 'FAIL'} ${name}`);
  }
  console.log(bad ? `self-test FAILED (${bad})` : 'self-test passed');
  process.exit(bad ? 1 : 0);
}

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
if (args.includes('--self-test')) await selfTest();
let input = { message: opt('--message'), address: opt('--address'), signature: opt('--signature') };
if (opt('--claim')) {
  const f = opt('--claim');
  input = parseClaim(f === '-' ? readFileSync(0, 'utf8') : readFileSync(f, 'utf8'));
}
if (!input.message || !input.address || !input.signature) {
  console.error('usage: verify-claim --message <m> --address <ss58> --signature <hex>\n       verify-claim --claim <file|->\n       verify-claim --self-test');
  process.exit(2);
}
const r = verifyClaim(input);
if (r.ok) {
  const att = r.fields.needs_reattest ? 'NO age attestation: needs re-attestation, not eligible for awards until re-signed' : `age attested, terms ${r.fields.terms}`;
  console.log(`valid: ${r.fields.github} / ${r.fields.address} / ${r.fields.date} (${r.crypto}, ${r.how}; ${att})`);
  process.exit(0);
}
console.log(`invalid: ${r.reason}`);
process.exit(1);
