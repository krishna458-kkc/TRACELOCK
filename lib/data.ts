/**
 * TRACELOCK prototype demo dataset.
 * All identifiers, hashes, fingerprints and signatures below are illustrative
 * placeholders produced by a non-cryptographic generator. They are NOT
 * cryptographically valid and exist only to drive the interface.
 */

export const ALGORITHMS = {
  kem: 'ML-KEM-768',
  kemStandard: 'FIPS 203',
  signature: 'ML-DSA-65',
  signatureStandard: 'FIPS 204',
  hash: 'SHA3-256',
  symmetric: 'AES-256-GCM',
  watermark: 'Spread-spectrum invisible watermark (v2)',
} as const

export type Classification = 'TOP SECRET' | 'SECRET' | 'CONFIDENTIAL' | 'RESTRICTED'
export type AuthorizationStatus = 'AUTHORIZED' | 'PENDING' | 'REVOKED'
export type IdentityStatus = 'ISSUED' | 'ACTIVE' | 'REVOKED'
export type DistributionStatus = 'DISTRIBUTED' | 'NOT DISTRIBUTED'

export interface Recipient {
  id: string
  name: string
  role: string
  organization: string
  authorization: AuthorizationStatus
  identity: IdentityStatus
  fingerprint: string
  publicKey: string
  keyIssued: string
  keyActivated?: string
  keyRevoked?: string
  keyExpires: string
  scope: Classification
  device: string
}

export interface SecureDocument {
  id: string
  name: string
  classification: Classification
  sizeBytes: number
  pages: number
  hash: string
  registered: string
  originator: string
  distribution: DistributionStatus
  recipients: string[]
}

export type SessionStatus = 'LEDGER VERIFIED' | 'PENDING VERIFICATION'

export interface DecryptionSession {
  id: string
  documentId: string
  recipientId: string
  timestamp: string
  watermarkId: string
  watermarkHash: string
  sessionFingerprint: string
  signature: string
  signatureStatus: 'VALID' | 'PENDING'
  status: SessionStatus
  simulated?: boolean
}

export type LedgerEventType =
  | 'DOCUMENT_REGISTERED'
  | 'DOCUMENT_DISTRIBUTED'
  | 'RECIPIENT_AUTHORIZED'
  | 'KEY_REVOKED'
  | 'DECRYPTION_EVENT'

export interface LedgerEvent {
  type: LedgerEventType
  timestamp: string
  documentId?: string
  recipientId?: string
  sessionId?: string
  signer: string
}

export interface LedgerRecord extends LedgerEvent {
  height: number
  recordId: string
  prevHash: string
  eventHash: string
  documentHash?: string
  signatureStatus: 'VALID'
  integrity: 'INTACT'
}

export type InvestigationStatus = 'OPEN' | 'ATTRIBUTED'

export interface Investigation {
  id: string
  title: string
  documentId: string
  opened: string
  source: string
  status: InvestigationStatus
  sessionId?: string
}

/** Deterministic, non-cryptographic hex generator for stable demo identifiers. */
export function hexFrom(seed: string, length = 64) {
  let h = 0x811c9dc5
  let out = ''
  let i = 0
  while (out.length < length) {
    const c = seed.charCodeAt(i % Math.max(seed.length, 1)) || 0
    h ^= c + i * 31
    h = Math.imul(h, 0x01000193) >>> 0
    h ^= h >>> 13
    h = Math.imul(h, 0x5bd1e995) >>> 0
    out += h.toString(16).padStart(8, '0')
    i++
  }
  return out.slice(0, length)
}

export function randomHex(length: number) {
  const bytes = new Uint8Array(Math.ceil(length / 2))
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

function publicKeyFrom(seed: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const hex = hexFrom(`pk:${seed}`, 256)
  let out = ''
  for (let i = 0; i < hex.length; i += 2) out += chars[parseInt(hex.slice(i, i + 2), 16) % 64]
  return out
}

export function makeRecipientKeys(id: string) {
  return { fingerprint: hexFrom(`fp:${id}`, 64), publicKey: publicKeyFrom(id) }
}

function recipient(
  id: string,
  name: string,
  role: string,
  organization: string,
  scope: Classification,
  keyIssued: string,
  extra: Partial<Recipient> = {},
): Recipient {
  return {
    id,
    name,
    role,
    organization,
    scope,
    authorization: 'AUTHORIZED',
    identity: 'ACTIVE',
    keyIssued,
    keyActivated: keyIssued,
    keyExpires: '2027-09-30T23:59:59',
    device: `HSM-TOKEN-${id.slice(-3)}`,
    ...makeRecipientKeys(id),
    ...extra,
  }
}

export const SEED_RECIPIENTS: Recipient[] = [
  recipient('RECIPIENT-021', 'Lt. Col. S. Varma', 'Joint Operations Coordinator', 'Strategic Planning Cell', 'SECRET', '2026-07-15T08:30:00'),
  recipient('RECIPIENT-047', 'Cdr. R. Iyer', 'Naval Operations Liaison', 'Integrated Defence Staff', 'SECRET', '2026-08-02T10:15:00'),
  recipient('RECIPIENT-063', 'Dr. A. Raman', 'Technical Director, Cryptography', 'Scientific Analysis Directorate', 'TOP SECRET', '2026-08-14T11:20:00'),
  recipient('RECIPIENT-012', 'S. Banerjee', 'Deputy Director, Acquisitions', 'Acquisitions Wing', 'SECRET', '2026-07-18T09:40:00'),
  recipient('RECIPIENT-023', 'Maj. K. Rathore', 'Field Operations Planner', 'Operations Directorate', 'SECRET', '2026-07-21T11:05:00'),
  recipient('RECIPIENT-031', 'Dr. P. Nair', 'Senior Threat Analyst', 'Defence Cyber Agency', 'TOP SECRET', '2026-07-25T14:22:00'),
  recipient('RECIPIENT-058', 'A. Kulkarni', 'Legal Advisor', 'Office of the Judge Advocate General', 'SECRET', '2026-08-11T16:48:00'),
  recipient('RECIPIENT-064', 'V. Sharma', 'Finance Controller', 'Defence Finance Division', 'CONFIDENTIAL', '2026-08-19T08:30:00'),
  recipient('RECIPIENT-071', 'N. Joshi', 'Contractor Liaison', 'External Vendor Cell', 'RESTRICTED', '2026-06-30T12:00:00', {
    authorization: 'REVOKED',
    identity: 'REVOKED',
    keyRevoked: '2026-09-26T09:12:44',
  }),
]

export const SEED_DOCUMENTS: SecureDocument[] = [
  {
    id: 'DOC-A71F',
    name: 'DEFENCE_BRIEF_07.pdf',
    classification: 'SECRET',
    sizeBytes: 2_481_337,
    pages: 38,
    hash: hexFrom('doc:DEFENCE_BRIEF_07'),
    registered: '2026-09-22T09:03:41',
    originator: 'Directorate of Strategic Planning',
    distribution: 'DISTRIBUTED',
    recipients: ['RECIPIENT-021', 'RECIPIENT-047', 'RECIPIENT-063', 'RECIPIENT-012', 'RECIPIENT-023', 'RECIPIENT-031', 'RECIPIENT-058'],
  },
  {
    id: 'DOC-B3E2',
    name: 'PROCUREMENT_REVIEW_Q3.pdf',
    classification: 'CONFIDENTIAL',
    sizeBytes: 1_204_912,
    pages: 21,
    hash: hexFrom('doc:PROCUREMENT_REVIEW'),
    registered: '2026-09-20T15:27:09',
    originator: 'Acquisitions Wing',
    distribution: 'DISTRIBUTED',
    recipients: ['RECIPIENT-012', 'RECIPIENT-064', 'RECIPIENT-031'],
  },
  {
    id: 'DOC-C904',
    name: 'FIELD_OPS_DIRECTIVE.docx',
    classification: 'SECRET',
    sizeBytes: 684_220,
    pages: 12,
    hash: hexFrom('doc:FIELD_OPS'),
    registered: '2026-09-23T07:48:15',
    originator: 'Operations Directorate',
    distribution: 'DISTRIBUTED',
    recipients: ['RECIPIENT-023', 'RECIPIENT-047', 'RECIPIENT-058', 'RECIPIENT-064'],
  },
  {
    id: 'DOC-D518',
    name: 'CYBER_INCIDENT_REPORT.pdf',
    classification: 'TOP SECRET',
    sizeBytes: 3_912_004,
    pages: 54,
    hash: hexFrom('doc:CYBER_INCIDENT'),
    registered: '2026-09-24T18:10:52',
    originator: 'Defence Cyber Agency',
    distribution: 'DISTRIBUTED',
    recipients: ['RECIPIENT-031', 'RECIPIENT-012'],
  },
  {
    id: 'DOC-E6A0',
    name: 'BUDGET_ALLOCATION_FY27.xlsx',
    classification: 'CONFIDENTIAL',
    sizeBytes: 418_560,
    pages: 6,
    hash: hexFrom('doc:BUDGET_FY27'),
    registered: '2026-09-27T12:36:20',
    originator: 'Defence Finance Division',
    distribution: 'NOT DISTRIBUTED',
    recipients: [],
  },
]

export function buildSession(
  id: string,
  documentId: string,
  recipientId: string,
  timestamp: string,
  opts: { watermarkId?: string; pending?: boolean; simulated?: boolean } = {},
): DecryptionSession {
  return {
    id,
    documentId,
    recipientId,
    timestamp,
    watermarkId: opts.watermarkId ?? `WM-${hexFrom(`wm:${id}`, 8).toUpperCase()}`,
    watermarkHash: hexFrom(`wmh:${id}:${recipientId}`),
    sessionFingerprint: hexFrom(`sfp:${documentId}:${recipientId}:${id}`),
    signature: hexFrom(`sig:${id}:${recipientId}`, 128),
    signatureStatus: 'VALID',
    status: opts.pending ? 'PENDING VERIFICATION' : 'LEDGER VERIFIED',
    simulated: opts.simulated,
  }
}

export const SEED_SESSIONS: DecryptionSession[] = [
  buildSession('SES-1C4E07', 'DOC-B3E2', 'RECIPIENT-012', '2026-09-24T09:14:52'),
  buildSession('SES-2A91D3', 'DOC-A71F', 'RECIPIENT-012', '2026-09-25T10:02:11'),
  buildSession('SES-3F7B28', 'DOC-C904', 'RECIPIENT-023', '2026-09-25T16:47:30'),
  buildSession('SES-47E0B5', 'DOC-A71F', 'RECIPIENT-031', '2026-09-26T08:21:05'),
  buildSession('SES-5B63C9', 'DOC-D518', 'RECIPIENT-031', '2026-09-26T13:55:44'),
  buildSession('SES-6D18F2', 'DOC-A71F', 'RECIPIENT-058', '2026-09-27T11:09:38'),
  buildSession('SES-7E42A6', 'DOC-C904', 'RECIPIENT-064', '2026-09-27T17:30:12'),
  buildSession('SES-8F29A1', 'DOC-A71F', 'RECIPIENT-047', '2026-09-28T14:32:17', { watermarkId: 'WM-72C9E41B' }),
  buildSession('SES-90B3D4', 'DOC-A71F', 'RECIPIENT-023', '2026-09-28T15:48:03'),
  buildSession('SES-A1C7E8', 'DOC-B3E2', 'RECIPIENT-064', '2026-09-28T16:05:29', { pending: true }),
]

export const DEMO_LEAK_SESSION_ID = 'SES-8F29A1'

export const SEED_INVESTIGATIONS: Investigation[] = [
  {
    id: 'INV-2026-0109',
    title: 'Procurement review excerpt circulated externally',
    documentId: 'DOC-B3E2',
    opened: '2026-09-25T11:30:00',
    source: 'Recovered from vendor email thread',
    status: 'ATTRIBUTED',
    sessionId: 'SES-1C4E07',
  },
  {
    id: 'INV-2026-0114',
    title: 'Defence brief copy recovered from external channel',
    documentId: 'DOC-A71F',
    opened: '2026-09-28T17:02:40',
    source: 'Seized removable media, Evidence Tag EV-3381',
    status: 'OPEN',
  },
]

function baseEvents(documents: SecureDocument[], sessions: DecryptionSession[]): LedgerEvent[] {
  const events: LedgerEvent[] = []
  for (const r of SEED_RECIPIENTS) {
    events.push({ type: 'RECIPIENT_AUTHORIZED', timestamp: r.keyIssued, recipientId: r.id, signer: 'SECURITY-ADMIN-01' })
  }
  for (const d of documents) {
    events.push({ type: 'DOCUMENT_REGISTERED', timestamp: d.registered, documentId: d.id, signer: d.originator })
    if (d.distribution === 'DISTRIBUTED') {
      const [date, time] = d.registered.split('T')
      const later = `${date}T${String(Math.min(Number(time.slice(0, 2)) + 1, 23)).padStart(2, '0')}${time.slice(2)}`
      events.push({ type: 'DOCUMENT_DISTRIBUTED', timestamp: later, documentId: d.id, signer: d.originator })
    }
  }
  events.push({ type: 'KEY_REVOKED', timestamp: '2026-09-26T09:12:44', recipientId: 'RECIPIENT-071', signer: 'SECURITY-ADMIN-01' })
  for (const s of sessions) {
    if (s.status === 'LEDGER VERIFIED') {
      events.push({ type: 'DECRYPTION_EVENT', timestamp: s.timestamp, documentId: s.documentId, recipientId: s.recipientId, sessionId: s.id, signer: s.recipientId })
    }
  }
  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export const SEED_EVENTS = baseEvents(SEED_DOCUMENTS, SEED_SESSIONS)

export const GENESIS_HEIGHT = 1180
export const GENESIS_HASH = hexFrom('tracelock-genesis-anchor')

export function eventDigest(e: LedgerEvent, prevHash: string, height: number, documentHash?: string) {
  return hexFrom(`${height}|${prevHash}|${e.type}|${e.timestamp}|${e.documentId ?? ''}|${documentHash ?? ''}|${e.recipientId ?? ''}|${e.sessionId ?? ''}|${e.signer}`)
}

export function buildChain(events: LedgerEvent[], documents: SecureDocument[]): LedgerRecord[] {
  const docHash = new Map(documents.map((d) => [d.id, d.hash]))
  const records: LedgerRecord[] = []
  let prev = GENESIS_HASH
  events.forEach((e, i) => {
    const height = GENESIS_HEIGHT + i + 1
    const documentHash = e.documentId ? docHash.get(e.documentId) : undefined
    const eventHash = eventDigest(e, prev, height, documentHash)
    records.push({
      ...e,
      height,
      recordId: `TXN-${eventHash.slice(0, 10).toUpperCase()}`,
      prevHash: prev,
      eventHash,
      documentHash,
      signatureStatus: 'VALID',
      integrity: 'INTACT',
    })
    prev = eventHash
  })
  return records
}

export const LEDGER_NODES = [
  { id: 'NODE-HQ-01', site: 'Headquarters Vault', role: 'Validator', status: 'IN AGREEMENT' },
  { id: 'NODE-HQ-02', site: 'Headquarters Vault (standby)', role: 'Validator', status: 'IN AGREEMENT' },
  { id: 'NODE-FR-03', site: 'Forensic Lab Enclave', role: 'Validator', status: 'IN AGREEMENT' },
  { id: 'NODE-AR-04', site: 'Archive Facility', role: 'Validator', status: 'IN AGREEMENT' },
] as const

export const EVENT_LABEL: Record<LedgerEventType, string> = {
  DOCUMENT_REGISTERED: 'Document registered',
  DOCUMENT_DISTRIBUTED: 'Document distributed',
  RECIPIENT_AUTHORIZED: 'Recipient authorized',
  KEY_REVOKED: 'Signing key revoked',
  DECRYPTION_EVENT: 'Decryption event',
}
