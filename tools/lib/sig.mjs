// Wallet signatures, checked the way the claim page and tools/verify-claim.mjs check them.
//
// A browser wallet's signRaw (type "bytes") and `btcli wallet sign` sign
// "<Bytes>" + message + "</Bytes>"; a signature over the bare message is accepted too.
// The key is sr25519 or ed25519 (the claim page skips ecdsa and ethereum accounts).
// Pure JavaScript (no WebAssembly), so the same code runs in Node and in the Worker.
import { verify as sr25519Verify } from '@scure/sr25519';
import { ed25519 } from '@noble/curves/ed25519.js';
import { blake2b } from '@noble/hashes/blake2.js';
import { base58 } from '@scure/base';

const enc = new TextEncoder();
const SS58_PREFIX = enc.encode('SS58PRE');

/** Lowercase hex of `bytes`. */
export function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Bytes of a hex string with or without `0x`; `null` when it isn't even-length hex. */
export function fromHex(hex) {
  const h = String(hex).trim().replace(/^0x/i, '');
  if (h.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(h)) return null;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(2 * i, 2 * i + 2), 16);
  return out;
}

/**
 * The 32-byte public key of an ss58 address, any network prefix, checksum checked.
 * Returns `null` for anything else (a 1- or 2-byte prefix, 32-byte key, 2-byte checksum).
 */
export function ss58Decode(address) {
  if (typeof address !== 'string' || address.length < 40 || address.length > 60) return null;
  let raw;
  try {
    raw = base58.decode(address);
  } catch {
    return null;
  }
  const prefixLen = raw[0] < 64 ? 1 : raw[0] < 128 ? 2 : 0;
  if (prefixLen === 0 || raw.length !== prefixLen + 32 + 2) return null;
  const body = raw.subarray(0, prefixLen + 32);
  const hash = blake2b(new Uint8Array([...SS58_PREFIX, ...body]), { dkLen: 64 });
  if (hash[0] !== raw[prefixLen + 32] || hash[1] !== raw[prefixLen + 33]) return null;
  return raw.slice(prefixLen, prefixLen + 32);
}

/** The ss58 address's public key as lowercase hex, or `null`. Two addresses are one account when these match. */
export function accountId(address) {
  const pk = ss58Decode(address);
  return pk ? toHex(pk) : null;
}

/** `<Bytes>message</Bytes>`, what a wallet's signRaw and btcli sign. */
export function wrapBytes(message) {
  return enc.encode(`<Bytes>${message}</Bytes>`);
}

/**
 * Checks `signature` (hex) over `message` (a string) by `address` (ss58).
 * Returns `{ ok, scheme, how, reason }`; `ok` only when one of sr25519 or ed25519 verifies
 * over the wrapped or the raw message.
 */
export function verifyWalletSignature(message, address, signature) {
  const pk = ss58Decode(address);
  if (!pk) return { ok: false, reason: 'address is not a valid ss58 address' };
  const sig = fromHex(signature);
  if (!sig) return { ok: false, reason: 'signature is not hex' };
  if (sig.length !== 64) return { ok: false, reason: 'signature is not 64 bytes' };
  const raw = enc.encode(message);
  for (const [how, data] of [['wrapped', wrapBytes(message)], ['raw', raw]]) {
    try {
      if (sr25519Verify(data, sig, pk)) return { ok: true, scheme: 'sr25519', how };
    } catch {
      // not an sr25519 signature (no Schnorrkel marker or a bad point): try ed25519
    }
    try {
      if (ed25519.verify(sig, data, pk, { zip215: false })) return { ok: true, scheme: 'ed25519', how };
    } catch {
      // bad point
    }
  }
  return { ok: false, reason: 'the signature does not match this message and address' };
}
