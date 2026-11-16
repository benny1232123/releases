// The signed finding: its fields, their canonical form, and the message the wallet signs.
// Shared by the submit worker (server-side check), the form page (which runs PAGE_CANON_JS,
// the same two functions as browser source text; test/worker.test.mjs checks that they agree)
// and the triage tools.

export const SEVERITIES = ['critical', 'high', 'medium', 'low'];
/** Eligibility tiers a submitter claims (BOUNTY.md "Who can earn points"). */
export const ELIGIBILITY = ['verified', 'open'];
/** Components, as in the red-team pack's FINDING.md. */
export const COMPONENTS = [
  'scoring', 'measurement', 'receipts', 'identity', 'encoding', 'node',
  'validator', 'solver', 'cli', 'link-page', 'docs', 'other',
];
/** Severities an "open" (not verified) submitter may claim. */
export const OPEN_SEVERITIES = ['critical', 'high'];
/** Most findings open at once: verified testers, everyone else. */
export const MAX_OPEN = { verified: 5, open: 1 };

export const VERSION_RE = /^(v\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?|redteam-pack-[0-9a-f]{7,40})$/;
export const GITHUB_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const SHA256_RE = /^[0-9a-f]{64}$/;

/** Text fields of a finding and their limits in characters (`min`, `max`). */
export const TEXT_FIELDS = {
  title: [8, 200],
  repro: [1, 20000],
  expected: [1, 5000],
  actual: [1, 5000],
  details: [0, 200000],
};

/** The keys the signed digest covers, sorted. */
export const SIGNED_KEYS = [
  'actual', 'address', 'component', 'details', 'eligibility', 'expected', 'github',
  'poc_sha256', 'repro', 'severity', 'title', 'version',
];

/** CRLF and CR become LF, then the ends are trimmed: a browser form posts CRLF where the textarea held LF. */
export function normalizeField(value) {
  return String(value == null ? '' : value).replace(/\r\n?/g, '\n').trim();
}

/** The canonical JSON the wallet's message names by hash: the signed keys, sorted, normalised, no whitespace. */
export function canonicalFinding(fields) {
  const keys = [
    'actual', 'address', 'component', 'details', 'eligibility', 'expected', 'github',
    'poc_sha256', 'repro', 'severity', 'title', 'version',
  ];
  const norm = (v) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + JSON.stringify(norm(fields[k]))).join(',') + '}';
}

/**
 * `normalizeField` and `canonicalFinding` as source text for the form page's inline script.
 * Text, not Function.prototype.toString: the bundler rewrites function bodies (keepNames adds
 * `__name(...)` calls that don't exist in the browser), and a Worker can't evaluate text.
 */
export const PAGE_CANON_JS = `function normalizeField(value) {
  return String(value == null ? '' : value).replace(/\\r\\n?/g, '\\n').trim();
}
function canonicalFinding(fields) {
  var keys = ['actual', 'address', 'component', 'details', 'eligibility', 'expected', 'github',
    'poc_sha256', 'repro', 'severity', 'title', 'version'];
  return '{' + keys.map(function (k) { return JSON.stringify(k) + ':' + JSON.stringify(normalizeField(fields[k])); }).join(',') + '}';
}`;

/** The message the claimed wallet signs for a finding. */
export function findingMessage({ github, address, digest, date }) {
  return `Transit Fabric finding: github=${github}, address=${address}, sha256=${digest}, date=${date}`;
}

export const FINDING_MESSAGE_RE = /^Transit Fabric finding: github=([A-Za-z0-9](?:[A-Za-z0-9-]{0,38})), address=([1-9A-HJ-NP-Za-km-z]{40,60}), sha256=([0-9a-f]{64}), date=(\d{4}-\d{2}-\d{2})$/;

/**
 * Structural checks on a finding's fields (normalised). Returns a list of problems, empty when
 * the fields are complete. Address validity and the signature are checked by the caller.
 */
export function fieldProblems(f) {
  const out = [];
  for (const [k, [min, max]] of Object.entries(TEXT_FIELDS)) {
    const v = normalizeField(f[k]);
    if (v.length < min) out.push(min === 1 ? `${k} is required` : `${k} needs at least ${min} characters`);
    if (v.length > max) out.push(`${k} is longer than ${max} characters`);
  }
  const version = normalizeField(f.version);
  if (!version) out.push('version is required');
  else if (!VERSION_RE.test(version)) out.push('version must be a release tag (v0.1.0-tester.3.1) or a red-team pack tag (redteam-pack-<sha>)');
  if (!SEVERITIES.includes(normalizeField(f.severity))) out.push(`severity must be one of ${SEVERITIES.join(', ')}`);
  const elig = normalizeField(f.eligibility);
  if (!ELIGIBILITY.includes(elig)) out.push(`eligibility must be one of ${ELIGIBILITY.join(', ')}`);
  if (!COMPONENTS.includes(normalizeField(f.component))) out.push(`component must be one of ${COMPONENTS.join(', ')}`);
  if (!GITHUB_RE.test(normalizeField(f.github))) out.push('github must be your GitHub username');
  if (!SHA256_RE.test(normalizeField(f.poc_sha256))) out.push('a proof-of-concept attachment is required');
  if (elig === 'open' && !OPEN_SEVERITIES.includes(normalizeField(f.severity))) {
    out.push('without verified-tester status only critical or high findings earn points');
  }
  return out;
}

/** UTC calendar date `YYYY-MM-DD` of a `Date`. */
export function utcDate(d) {
  return d.toISOString().slice(0, 10);
}

/** A signed date is accepted when it is today or yesterday (UTC) at `now`, so a btcli signature can cross midnight. */
export function dateAccepted(date, now) {
  if (!DATE_RE.test(date)) return false;
  const today = utcDate(now);
  const yesterday = utcDate(new Date(now.getTime() - 86400000));
  return date === today || date === yesterday;
}
