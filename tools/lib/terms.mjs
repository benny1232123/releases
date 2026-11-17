// The age attestation and the Terms/Privacy version a tester accepts (docs/legal/README.md).
//
// Shared by the claim checker (lib/claims.mjs), the submit Worker (the finding form and the plain
// upload) and the releases repo's tools/verify-claim.mjs, which keeps a copy of these values.
// Nothing here holds a date of birth: a tester attests "18 or older, or the age of majority where
// I live, whichever is higher", and we keep only that they did, which terms version, and when.

/** The Terms of Service and Privacy Policy version testers accept now. */
export const TERMS_VERSION = '1';

/** Every version a signed claim or a form may name. Add the new one here when the terms change. */
export const TERMS_VERSIONS = ['1'];

/**
 * The first UTC date on which the old claim message (no age line) is refused. An old-format claim
 * dated before it stays registered but is flagged `needs_reattest`: not payable until the tester
 * signs the new message. Set it to the day the new claim page is published.
 */
export const OLD_CLAIMS_BEFORE = '2026-11-18';

export const TERMS_URL = 'https://transitfabric.xyz/terms.html';
export const PRIVACY_URL = 'https://transitfabric.xyz/privacy.html';

/** The sentence a claim signer agrees to, for terms version `v`. No apostrophes: it goes inside a shell's single quotes. */
export function attestationSentence(v = TERMS_VERSION) {
  return `I am 18 or older, or the age of majority where I live, whichever is higher, and I accept the Transit Fabric Terms of Service and Privacy Policy version ${v}.`;
}

/** The checkbox text on the finding form and the plain upload. */
export const FORM_ATTESTATION =
  'I am 18 or older, or the age of majority where I live, whichever is higher, and I accept the Terms and Privacy Policy';

/** Values a form's `age_attested` field may carry when the box is ticked. */
export const ATTESTED_VALUES = ['yes', 'true', 'on', '1'];
