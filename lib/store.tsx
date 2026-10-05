'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  buildChain,
  buildSession,
  type Classification,
  type DecryptionSession,
  type Investigation,
  type LedgerEvent,
  type LedgerRecord,
  makeRecipientKeys,
  randomHex,
  type Recipient,
  type SecureDocument,
  SEED_DOCUMENTS,
  SEED_EVENTS,
  SEED_INVESTIGATIONS,
  SEED_RECIPIENTS,
  SEED_SESSIONS,
} from './data'
import { nowTs } from './format'
import {
  fetchHealth,
  type HealthResponse,
  fetchDocuments,
  fetchRecipients,
  fetchSessions,
  fetchLedgerRecords,
  executeDecryption,
  analyzeLeakedDocument,
  validateLedgerChain,
  uploadDocument as uploadDocumentApi,
  encryptDocument as encryptDocumentApi,
  createRecipient as createRecipientApi,
  authorizeRecipient as authorizeRecipientApi,
  revokeRecipient as revokeRecipientApi,
  type ApiInvestigationReport,
  type ApiLedgerValidation,
  type ApiLedgerRecord,
  API_BASE_URL,
} from './api'

export interface ExtendedDecryptionSession extends DecryptionSession {
  downloadUrl?: string
  ledgerRecordId?: number
}

export interface SelectedDemoEvidence {
  sessionId: string
  documentId: string
  documentName: string
  recipientId: string
  recipientName: string
  recipientRole?: string
  watermarkId: string
  timestamp: string
  downloadUrl?: string
}

interface TracelockState {
  isBackendConnected: boolean
  backendHealth: HealthResponse | null
  documents: SecureDocument[]
  recipients: Recipient[]
  sessions: ExtendedDecryptionSession[]
  ledger: LedgerRecord[]
  investigations: Investigation[]
  selectedDemoEvidence: SelectedDemoEvidence | null
  setSelectedDemoEvidence: (evidence: SelectedDemoEvidence | null) => void
  getDocument: (id: string) => SecureDocument | undefined
  getRecipient: (id: string) => Recipient | undefined
  getSession: (id: string) => ExtendedDecryptionSession | undefined
  getLedgerRecordForSession: (sessionId: string) => LedgerRecord | undefined
  registerDocument: (input: { name: string; sizeBytes: number; hash: string; classification: Classification; file?: File }) => Promise<SecureDocument>
  distributeDocument: (documentId: string, recipientIds: string[]) => Promise<void>
  addRecipient: (input: { name: string; role: string; organization: string; scope: Classification }) => Promise<Recipient>
  authorizeRecipient: (id: string) => Promise<void>
  revokeRecipient: (id: string) => Promise<void>
  draftSession: (documentId: string, recipientId: string) => DecryptionSession
  commitSession: (session: DecryptionSession) => LedgerRecord | undefined
  recordAttribution: (documentId: string, sessionId: string) => Investigation
  performBackendDecryption: (
    documentId: string,
    recipientId: string,
    customSessionId?: string,
    customWatermarkId?: string
  ) => Promise<ExtendedDecryptionSession>
  performBackendInvestigation: (file: File) => Promise<ApiInvestigationReport>
  validateBackendLedger: () => Promise<ApiLedgerValidation>
  refreshBackendData: () => Promise<void>
}

const TracelockContext = createContext<TracelockState | null>(null)

export function TracelockProvider({ children }: { children: React.ReactNode }) {
  const [isBackendConnected, setIsBackendConnected] = useState(false)
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null)
  const [documents, setDocuments] = useState<SecureDocument[]>(SEED_DOCUMENTS)
  const [recipients, setRecipients] = useState<Recipient[]>(SEED_RECIPIENTS)
  const [sessions, setSessions] = useState<ExtendedDecryptionSession[]>(SEED_SESSIONS)
  const [events, setEvents] = useState<LedgerEvent[]>(SEED_EVENTS)
  const [backendLedger, setBackendLedger] = useState<LedgerRecord[]>([])
  const [investigations, setInvestigations] = useState(SEED_INVESTIGATIONS)
  const [selectedDemoEvidence, setSelectedDemoEvidence] = useState<SelectedDemoEvidence | null>(null)

  const computedLedger = useMemo(() => buildChain(events, documents), [events, documents])
  const ledger = useMemo(() => {
    if (isBackendConnected && backendLedger.length > 0) {
      return backendLedger
    }
    return computedLedger
  }, [isBackendConnected, backendLedger, computedLedger])

  const appendEvent = useCallback((e: Omit<LedgerEvent, 'timestamp'> & { timestamp?: string }) => {
    setEvents((prev) => [...prev, { ...e, timestamp: e.timestamp ?? nowTs() }])
  }, [])

  const getDocument = useCallback((id: string) => documents.find((d) => d.id === id), [documents])
  const getRecipient = useCallback((id: string) => recipients.find((r) => r.id === id), [recipients])
  const getSession = useCallback((id: string) => sessions.find((s) => s.id === id), [sessions])
  const getLedgerRecordForSession = useCallback(
    (sessionId: string) => ledger.find((r) => r.sessionId === sessionId),
    [ledger],
  )

  // Synchronize state with real backend if accessible
  const refreshBackendData = useCallback(async () => {
    try {
      const health = await fetchHealth()
      if (health && health.status === 'HEALTHY') {
        setIsBackendConnected(true)
        setBackendHealth(health)

        // Sync recipients
        try {
          const apiRecipients = await fetchRecipients()
          if (apiRecipients && apiRecipients.length > 0) {
            setRecipients((prev) => {
              const updated = [...prev]
              for (const ar of apiRecipients) {
                const idx = updated.findIndex((r) => r.id === ar.recipient_id)
                const recData: Recipient = {
                  id: ar.recipient_id,
                  name: ar.name,
                  role: ar.role,
                  organization: 'Directorate of Naval Operations',
                  scope: 'TOP SECRET',
                  authorization: ar.status === 'ACTIVE' ? 'AUTHORIZED' : 'REVOKED',
                  identity: ar.status === 'ACTIVE' ? 'ACTIVE' : 'REVOKED',
                  fingerprint: ar.dsa_fingerprint,
                  publicKey: ar.dsa_public_key,
                  keyIssued: ar.created_at,
                  keyExpires: '2027-09-30T23:59:59',
                  device: `PROTOTYPE-VAULT-${ar.recipient_id.slice(-3)}`,
                }
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], ...recData }
                } else {
                  updated.push(recData)
                }
              }
              const seen = new Set<string>()
              return updated.filter((r) => {
                if (!r.id || seen.has(r.id)) return false
                seen.add(r.id)
                return true
              })
            })
          }
        } catch {
          // Ignore partial recipient sync error
        }

        // Sync documents
        try {
          const apiDocs = await fetchDocuments()
          if (apiDocs && apiDocs.length > 0) {
            setDocuments((prev) => {
              const updated = [...prev]
              for (const ad of apiDocs) {
                const idx = updated.findIndex((d) => d.id === ad.document_id)
                const docData: SecureDocument = {
                  id: ad.document_id,
                  name: ad.filename,
                  classification: 'TOP SECRET',
                  sizeBytes: 24576,
                  pages: 3,
                  hash: ad.document_hash,
                  registered: ad.created_at,
                  originator: 'Naval Cyber Command',
                  distribution: ad.is_encrypted ? 'DISTRIBUTED' : 'NOT DISTRIBUTED',
                  recipients: ad.authorized_recipients || [],
                }
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], ...docData }
                } else {
                  updated.push(docData)
                }
              }
              const seen = new Set<string>()
              return updated.filter((d) => {
                if (!d.id || seen.has(d.id)) return false
                seen.add(d.id)
                return true
              })
            })
          }
        } catch {
          // Ignore partial document sync error
        }

        // Sync sessions
        try {
          const apiSessions = await fetchSessions()
          if (apiSessions && apiSessions.length > 0) {
            setSessions((prev) => {
              const updated = [...prev]
              for (const as of apiSessions) {
                const idx = updated.findIndex((s) => s.id === as.session_id)
                const sessData: ExtendedDecryptionSession = {
                  id: as.session_id,
                  documentId: as.document_id,
                  recipientId: as.recipient_id,
                  timestamp: as.timestamp,
                  watermarkId: as.watermark_id,
                  watermarkHash: as.watermark_hash,
                  sessionFingerprint: as.document_hash,
                  signature: as.signature,
                  signatureStatus: 'VALID',
                  status: 'LEDGER VERIFIED',
                  simulated: false,
                  ledgerRecordId: as.ledger_record_id,
                  downloadUrl: as.watermarked_pdf_download_url
                    ? `${API_BASE_URL}${as.watermarked_pdf_download_url}`
                    : undefined,
                }
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], ...sessData }
                } else {
                  updated.unshift(sessData)
                }
              }
              const seen = new Set<string>()
              return updated.filter((s) => {
                if (!s.id || seen.has(s.id)) return false
                seen.add(s.id)
                return true
              })
            })
          }
        } catch {
          // Ignore partial session sync error
        }

        // Sync ledger records
        try {
          const apiLedger = await fetchLedgerRecords()
          if (apiLedger && apiLedger.length > 0) {
            const realRecords: LedgerRecord[] = apiLedger.map((ar: ApiLedgerRecord) => ({
              height: ar.record_id,
              recordId: `BLK-${String(ar.record_id).padStart(4, '0')}`,
              type: 'DECRYPTION_EVENT',
              timestamp: ar.timestamp,
              documentId: ar.document_id,
              recipientId: ar.recipient_id,
              sessionId: ar.session_id,
              signer: ar.recipient_id,
              prevHash: ar.previous_record_hash,
              eventHash: ar.record_hash,
              documentHash: ar.event_payload?.document_hash,
              signatureStatus: 'VALID',
              integrity: 'INTACT',
            }))
            setBackendLedger(realRecords)
          }
        } catch {
          // Ignore partial ledger sync error
        }
      }
    } catch {
      setIsBackendConnected(false)
      setBackendHealth(null)
    }
  }, [])

  useEffect(() => {
    refreshBackendData()
  }, [refreshBackendData])

  const registerDocument = useCallback(
    async ({ name, sizeBytes, hash, classification, file }: { name: string; sizeBytes: number; hash: string; classification: Classification; file?: File }) => {
      let createdDocId = `DOC-${randomHex(4).toUpperCase()}`
      if (file && isBackendConnected) {
        try {
          const apiDoc = await uploadDocumentApi(file)
          createdDocId = apiDoc.document_id
          await refreshBackendData()
        } catch (err) {
          console.warn('Backend document upload fallback:', err)
        }
      }
      const doc: SecureDocument = {
        id: createdDocId,
        name,
        classification,
        sizeBytes,
        pages: Math.max(1, Math.round(sizeBytes / 65000)),
        hash,
        registered: nowTs(),
        originator: 'Security Administration',
        distribution: 'NOT DISTRIBUTED',
        recipients: [],
      }
      setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)])
      appendEvent({ type: 'DOCUMENT_REGISTERED', documentId: doc.id, signer: doc.originator, timestamp: doc.registered })
      return doc
    },
    [appendEvent, isBackendConnected, refreshBackendData],
  )

  const distributeDocument = useCallback(
    async (documentId: string, recipientIds: string[]) => {
      if (isBackendConnected) {
        try {
          await encryptDocumentApi(documentId, recipientIds)
          await refreshBackendData()
        } catch (err) {
          console.warn('Backend distribute fallback:', err)
        }
      }
      let signer = 'Security Administration'
      setDocuments((prev) => {
        const updated = prev.map((d) => {
          if (d.id !== documentId) return d
          signer = d.originator
          return { ...d, distribution: 'DISTRIBUTED' as const, recipients: Array.from(new Set([...d.recipients, ...recipientIds])) }
        })
        const seen = new Set<string>()
        return updated.filter((d) => {
          if (!d.id || seen.has(d.id)) return false
          seen.add(d.id)
          return true
        })
      })
      appendEvent({ type: 'DOCUMENT_DISTRIBUTED', documentId, signer })
    },
    [appendEvent, isBackendConnected, refreshBackendData],
  )

  const addRecipient = useCallback(
    async ({ name, role, organization, scope }: { name: string; role: string; organization: string; scope: Classification }) => {
      const id = `RECIPIENT-${String(Math.floor(100 + Math.random() * 899))}`
      if (isBackendConnected) {
        try {
          await createRecipientApi({ recipient_id: id, name, role })
          await refreshBackendData()
        } catch (err) {
          console.warn('Backend addRecipient fallback:', err)
        }
      }
      const r: Recipient = {
        id,
        name,
        role,
        organization,
        scope,
        authorization: 'PENDING',
        identity: 'ISSUED',
        keyIssued: nowTs(),
        keyExpires: '2027-09-30T23:59:59',
        device: `PROTOTYPE-VAULT-${id.slice(-3)}`,
        ...makeRecipientKeys(id),
      }
      setRecipients((prev) => [...prev, r])
      return r
    },
    [isBackendConnected, refreshBackendData],
  )

  const authorizeRecipient = useCallback(
    async (id: string) => {
      const ts = nowTs()
      if (isBackendConnected) {
        try {
          await authorizeRecipientApi(id)
          await refreshBackendData()
        } catch (err) {
          console.warn('Backend authorizeRecipient fallback:', err)
        }
      }
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, authorization: 'AUTHORIZED', identity: 'ACTIVE', keyActivated: ts } : r)),
      )
      appendEvent({ type: 'RECIPIENT_AUTHORIZED', recipientId: id, signer: 'SECURITY-ADMIN-01', timestamp: ts })
    },
    [appendEvent, isBackendConnected, refreshBackendData],
  )

  const revokeRecipient = useCallback(
    async (id: string) => {
      const ts = nowTs()
      if (isBackendConnected) {
        try {
          await revokeRecipientApi(id)
          await refreshBackendData()
        } catch (err) {
          console.warn('Backend revokeRecipient fallback:', err)
        }
      }
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, authorization: 'REVOKED', identity: 'REVOKED', keyRevoked: ts } : r)),
      )
      appendEvent({ type: 'KEY_REVOKED', recipientId: id, signer: 'SECURITY-ADMIN-01', timestamp: ts })
    },
    [appendEvent, isBackendConnected, refreshBackendData],
  )

  const draftSession = useCallback(
    (documentId: string, recipientId: string) =>
      buildSession(`SES-${randomHex(6).toUpperCase()}`, documentId, recipientId, nowTs(), {
        watermarkId: `WM-${randomHex(8).toUpperCase()}`,
        simulated: true,
      }),
    [],
  )

  const commitSession = useCallback(
    (session: DecryptionSession) => {
      setSessions((prev) => (prev.some((s) => s.id === session.id) ? prev : [...prev, session]))
      appendEvent({
        type: 'DECRYPTION_EVENT',
        timestamp: session.timestamp,
        documentId: session.documentId,
        recipientId: session.recipientId,
        sessionId: session.id,
        signer: session.recipientId,
      })
      return undefined
    },
    [appendEvent],
  )

  // Real Backend Decryption Call
  const performBackendDecryption = useCallback(
    async (
      documentId: string,
      recipientId: string,
      customSessionId?: string,
      customWatermarkId?: string
    ): Promise<ExtendedDecryptionSession> => {
      const res = await executeDecryption({
        document_id: documentId,
        recipient_id: recipientId,
        custom_session_id: customSessionId,
        custom_watermark_id: customWatermarkId,
      })

      const downloadUrl = res.watermarked_pdf_download_url
        ? `${API_BASE_URL}${res.watermarked_pdf_download_url}`
        : undefined

      const sessionObj: ExtendedDecryptionSession = {
        id: res.session_id,
        documentId: res.document_id,
        recipientId: res.recipient_id,
        timestamp: res.timestamp,
        watermarkId: res.watermark_id,
        watermarkHash: res.watermark_hash,
        sessionFingerprint: res.document_hash,
        signature: res.signature,
        signatureStatus: 'VALID',
        status: 'LEDGER VERIFIED',
        simulated: false,
        ledgerRecordId: res.ledger_record_id,
        downloadUrl,
      }

      setSessions((prev) => [sessionObj, ...prev.filter((s) => s.id !== sessionObj.id)])
      appendEvent({
        type: 'DECRYPTION_EVENT',
        timestamp: sessionObj.timestamp,
        documentId: sessionObj.documentId,
        recipientId: sessionObj.recipientId,
        sessionId: sessionObj.id,
        signer: sessionObj.recipientId,
      })

      // Refresh backend data to pick up newly committed block and sessions
      setTimeout(() => {
        refreshBackendData()
      }, 100)

      return sessionObj
    },
    [appendEvent, refreshBackendData]
  )

  // Real Backend Forensic Investigation Call
  const performBackendInvestigation = useCallback(async (file: File) => {
    return analyzeLeakedDocument(file)
  }, [])

  // Real Backend Ledger Validation Call
  const validateBackendLedger = useCallback(async () => {
    return validateLedgerChain()
  }, [])

  const recordAttribution = useCallback(
    (documentId: string, sessionId: string) => {
      const existing = investigations.find((i) => i.documentId === documentId && i.status === 'OPEN')
      const resolved: Investigation = existing
        ? { ...existing, status: 'ATTRIBUTED', sessionId }
        : {
            id: `INV-2026-${String(115 + investigations.length).padStart(4, '0')}`,
            title: 'Leaked copy submitted for analysis',
            documentId,
            opened: nowTs(),
            source: 'Investigator upload',
            status: 'ATTRIBUTED',
            sessionId,
          }
      setInvestigations((prev) =>
        existing ? prev.map((i) => (i.id === existing.id ? resolved : i)) : [...prev, resolved],
      )
      return resolved
    },
    [investigations],
  )

  const value = useMemo<TracelockState>(
    () => ({
      isBackendConnected,
      backendHealth,
      documents,
      recipients,
      sessions,
      ledger,
      investigations,
      selectedDemoEvidence,
      setSelectedDemoEvidence,
      getDocument,
      getRecipient,
      getSession,
      getLedgerRecordForSession,
      registerDocument,
      distributeDocument,
      addRecipient,
      authorizeRecipient,
      revokeRecipient,
      draftSession,
      commitSession,
      recordAttribution,
      performBackendDecryption,
      performBackendInvestigation,
      validateBackendLedger,
      refreshBackendData,
    }),
    [
      isBackendConnected,
      backendHealth,
      documents,
      recipients,
      sessions,
      ledger,
      investigations,
      selectedDemoEvidence,
      setSelectedDemoEvidence,
      getDocument,
      getRecipient,
      getSession,
      getLedgerRecordForSession,
      registerDocument,
      distributeDocument,
      addRecipient,
      authorizeRecipient,
      revokeRecipient,
      draftSession,
      commitSession,
      recordAttribution,
      performBackendDecryption,
      performBackendInvestigation,
      validateBackendLedger,
      refreshBackendData,
    ],
  )

  return <TracelockContext.Provider value={value}>{children}</TracelockContext.Provider>
}

export function useTracelock() {
  const ctx = useContext(TracelockContext)
  if (!ctx) throw new Error('useTracelock must be used within TracelockProvider')
  return ctx
}
