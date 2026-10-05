'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Download, FileText, FileWarning, Play, RotateCcw, ScanSearch, Server, ShieldCheck } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api/client'
import { ALGORITHMS } from '@/lib/data'
import { formatTs, truncateHash } from '@/lib/format'
import { useTracelock, type ExtendedDecryptionSession } from '@/lib/store'
import { cn } from '@/lib/utils'
import { BhaveshCard, GlassBlobCard, Panel, StatusBadge, TraceButton, TraceCard } from './primitives'
import { WorkflowStepper, type WorkflowStep } from './workflow-stepper'

const STEP_MS = 450
const COMMIT_INDEX = 6

export function DecryptionSimulator({
  initialDoc,
  initialRecipient,
}: {
  initialDoc?: string
  initialRecipient?: string
}) {
  const {
    isBackendConnected,
    documents,
    getDocument,
    getRecipient,
    draftSession,
    commitSession,
    getLedgerRecordForSession,
    performBackendDecryption,
    selectedDemoEvidence,
    setSelectedDemoEvidence,
  } = useTracelock()

  const distributed = Array.from(
    new Map(documents.filter((d) => d.distribution === 'DISTRIBUTED').map((d) => [d.id, d])).values()
  )
  const [docId, setDocId] = useState(initialDoc && getDocument(initialDoc) ? initialDoc : 'DOC-A71F')
  const doc = getDocument(docId)
  const eligible = Array.from(
    new Map(
      (doc?.recipients ?? [])
        .map((id) => getRecipient(id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r && r.authorization === 'AUTHORIZED'))
        .map((r) => [r.id, r])
    ).values()
  )
  const [recipientId, setRecipientId] = useState(initialRecipient ?? 'RECIPIENT-047')
  const activeRecipientId = eligible.some((r) => r?.id === recipientId) ? recipientId : eligible[0]?.id
  const recipient = activeRecipientId ? getRecipient(activeRecipientId) : undefined

  const [draft, setDraft] = useState<ExtendedDecryptionSession | null>(null)
  const [current, setCurrent] = useState(-1)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const running = draft !== null && current >= 0 && current < 8
  const finished = draft !== null && current >= 8

  useEffect(() => {
    if (!draft || current < 0 || current >= 8) return
    const t = setTimeout(() => {
      if (current === COMMIT_INDEX && draft.simulated) commitSession(draft)
      setCurrent((c) => c + 1)
    }, STEP_MS)
    return () => clearTimeout(t)
  }, [draft, current, commitSession])

  const record = draft ? getLedgerRecordForSession(draft.id) : undefined

  const steps: WorkflowStep[] = [
    {
      key: 'auth',
      title: 'AUTHENTICATE',
      detail: 'Recipient proves possession of private ML-DSA signing identity.',
      output: recipient && <span>Identity verified · {recipient.id} ({recipient.name})</span>,
    },
    {
      key: 'authz',
      title: 'AUTHORIZE',
      detail: 'Clearance scope verified against document classification.',
      output: recipient && doc && <span>Clearance valid · {recipient.scope} vs {doc.classification}</span>,
    },
    {
      key: 'decrypt',
      title: 'DECRYPT',
      detail: 'Content key decapsulated via ML-KEM-768; AES-256-GCM decrypted.',
      output: <span>Decapsulation OK · Plaintext restored</span>,
    },
    {
      key: 'fp',
      title: 'GENERATE SESSION FINGERPRINT',
      detail: 'Derives cryptographic session ID from document, recipient, and nonce.',
      output: draft && <span>Session: {draft.id}</span>,
    },
    {
      key: 'wm',
      title: 'EMBED FORENSIC WATERMARK',
      detail: 'Embeds imperceptible session-specific watermark payload.',
      output: draft && <span>Watermark: {draft.watermarkId} embedded</span>,
    },
    {
      key: 'sign',
      title: 'SIGN DECRYPTION EVENT',
      detail: "Recipient private key signs session, watermark, and document hash.",
      output: draft && <span>ML-DSA-65 signature generated</span>,
    },
    {
      key: 'commit',
      title: 'COMMIT TO IMMUTABLE LEDGER',
      detail: 'Signed event committed to offline permissioned ledger.',
      output: <span>Appended to ledger block chain</span>,
    },
    {
      key: 'deliver',
      title: 'DELIVER DOCUMENT',
      detail: 'Recipient receives watermarked, cryptographically traceable PDF.',
      output: draft && <span>Watermarked PDF ready for viewing</span>,
    },
  ]

  async function start() {
    if (!doc || !recipient) return
    setErrorMessage(null)
    setLoading(true)

    if (isBackendConnected) {
      try {
        const realSession = await performBackendDecryption(doc.id, recipient.id)
        setDraft(realSession)
        setCurrent(0)
      } catch (err: any) {
        console.warn('Backend decryption fallback to local enclave:', err?.message)
        const simSession = draftSession(doc.id, recipient.id)
        setDraft(simSession)
        setCurrent(0)
      } finally {
        setLoading(false)
      }
    } else {
      setDraft(draftSession(doc.id, recipient.id))
      setCurrent(0)
      setLoading(false)
    }
  }

  function reset() {
    setDraft(null)
    setCurrent(-1)
    setErrorMessage(null)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
      <Panel
        title="Decryption Workflow"
        description="Broadcast-encrypt, individually-decrypt model with dynamic watermarking."
        actions={
          <div className="flex items-center gap-2">
            {isBackendConnected && (
              <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] text-success bg-success/10 border border-success/30 px-2 py-0.5 rounded">
                <Server className="size-3" />
                PQC ENCLAVE ONLINE
              </span>
            )}
            {finished && (
              <TraceButton variant="outline" size="sm" className="gap-1.5 font-mono text-xs" onClick={reset}>
                <RotateCcw className="size-3.5" />
                NEW DECRYPTION
              </TraceButton>
            )}
          </div>
        }
      >
        {errorMessage && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between">
            <span className="font-semibold">DECRYPTION DENIED: {errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Main Control Area */}
        <div className="mb-5 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3 bg-secondary/30 p-3 rounded-lg border border-border/70">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label htmlFor="sim-doc" className="label-caps">DOCUMENT</label>
            <select
              id="sim-doc"
              value={docId}
              disabled={running}
              onChange={(e) => {
                setDocId(e.target.value)
                reset()
              }}
              className="h-9 w-full min-w-0 truncate rounded-md border border-border bg-card px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {distributed.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label htmlFor="sim-recipient" className="label-caps">RECIPIENT</label>
            <select
              id="sim-recipient"
              value={activeRecipientId ?? ''}
              disabled={running}
              onChange={(e) => {
                setRecipientId(e.target.value)
                reset()
              }}
              className="h-9 w-full min-w-0 truncate rounded-md border border-border bg-card px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {eligible.map((r) => r && (
                <option key={r.id} value={r.id}>{r.id} · {r.name}</option>
              ))}
            </select>
          </div>

          <TraceButton
            variant="primary"
            size="md"
            icon={Play}
            className="w-full sm:w-auto min-w-[210px] shrink-0 whitespace-nowrap px-5 font-mono text-xs font-semibold tracking-wider"
            onClick={start}
            disabled={running || !recipient || finished}
            loading={loading || running}
          >
            {running ? 'DECRYPTING…' : 'EXECUTE DECRYPTION'}
          </TraceButton>
        </div>

        {/* 8-Step Timeline */}
        <WorkflowStepper steps={steps} current={draft ? current : -1} finished={finished} />
      </Panel>

      {/* Completed Session Provenance Panel */}
      <Panel
        title="Decryption Provenance Record"
        description="Hardware-signed session identity committed to the permissioned ledger."
        actions={
          finished && draft ? (
            <StatusBadge tone="success">COMMITTED TO LEDGER</StatusBadge>
          ) : null
        }
      >
        {finished && draft ? (
          <div className="flex flex-col gap-4">
            <BhaveshCard tone="success" className="p-0" innerClassName="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="label-caps">Generated Session ID</span>
                <span className="font-mono text-xs font-bold text-primary">{draft.id}</span>
              </div>

              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="label-caps">Embedded Watermark ID</span>
                <span className="font-mono text-xs font-bold text-foreground">{draft.watermarkId}</span>
              </div>

              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="label-caps">Recipient Attributed</span>
                <span className="font-mono text-xs text-foreground font-semibold">{draft.recipientId} ({recipient?.name})</span>
              </div>

              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="label-caps">Ledger Block Height</span>
                <span className="font-mono text-xs font-bold text-success">
                  {record ? `#${record.height} (${record.recordId})` : '#1'}
                </span>
              </div>

              <div className="flex flex-col gap-1 border-b border-border/40 pb-2">
                <span className="label-caps">Post-Quantum ML-DSA-65 Signature</span>
                <span className="font-mono text-[10px] text-muted-foreground break-all">
                  {draft.signature ? truncateHash(draft.signature, 24, 16) : 'Valid (FIPS 204 Enclave Signed)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="label-caps">Decryption Timestamp</span>
                <span className="font-mono text-xs text-muted-foreground">{formatTs(draft.timestamp)}</span>
              </div>
            </BhaveshCard>

            {/* Demo Copy Status */}
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[11px] text-muted-foreground">Forensic Status:</span>
              <StatusBadge tone="success" className="text-[10px] font-mono">
                DEMO COPY READY
              </StatusBadge>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={draft.downloadUrl || `${API_BASE_URL}/documents/download/${draft.id}_decrypted.pdf`}
                  download={`${draft.id}_decrypted.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full"
                >
                  <TraceButton variant="primary" size="sm" className="w-full font-mono text-xs gap-2">
                    <Download className="size-3.5" />
                    DOWNLOAD RECIPIENT COPY
                  </TraceButton>
                </a>

                <TraceButton
                  variant="secondary"
                  size="sm"
                  className="w-full font-mono text-xs gap-1.5"
                  onClick={() => {
                    setSelectedDemoEvidence({
                      recipientId: draft.recipientId,
                      recipientName: recipient?.name || draft.recipientId,
                      recipientRole: recipient?.role,
                      documentId: draft.documentId,
                      documentName: doc?.name || draft.documentId,
                      sessionId: draft.id,
                      watermarkId: draft.watermarkId,
                      timestamp: draft.timestamp,
                      downloadUrl: draft.downloadUrl || `${API_BASE_URL}/documents/download/${draft.id}_decrypted.pdf`,
                    })
                  }}
                >
                  <FileWarning className="size-3.5 text-warning" />
                  USE AS DEMO LEAK EVIDENCE
                </TraceButton>
              </div>

              {selectedDemoEvidence?.sessionId === draft.id && (
                <div className="rounded-md border border-warning/50 bg-warning/10 p-3 space-y-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-warning flex items-center gap-1.5">
                      <FileWarning className="size-3.5" /> DEMO EVIDENCE SELECTED
                    </span>
                    <StatusBadge tone="warning" className="text-[10px]">READY FOR DEMO</StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">RECIPIENT:</span>
                      <span className="font-semibold text-foreground">{draft.recipientId} ({recipient?.name})</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">DOCUMENT:</span>
                      <span className="text-foreground truncate block">{doc?.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">SESSION ID:</span>
                      <span className="text-primary">{draft.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">WATERMARK:</span>
                      <span className="text-foreground">{draft.watermarkId}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-warning/90 italic border-l-2 border-warning/60 pl-2">
                    Simulated leak scenario — this recipient-specific copy is intentionally selected as simulated leaked evidence for demonstration.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={draft.downloadUrl || `${API_BASE_URL}/documents/download/${draft.id}_decrypted.pdf`}
                      download={`${draft.id}_decrypted.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1"
                    >
                      <TraceButton variant="outline" size="sm" className="w-full font-mono text-[11px] gap-1.5">
                        <Download className="size-3" /> DOWNLOAD COPY
                      </TraceButton>
                    </a>
                    <Link href={`/investigation?demoSession=${draft.id}`} className="flex-1">
                      <TraceButton variant="primary" size="sm" className="w-full font-mono text-[11px] gap-1.5">
                        <ScanSearch className="size-3" /> INVESTIGATE IN KEY DEMO →
                      </TraceButton>
                    </Link>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-1">
                <Link href={`/investigation?demoSession=${draft.id}`} className="w-full">
                  <TraceButton variant="outline" size="sm" className="w-full font-mono text-xs gap-1.5">
                    <ScanSearch className="size-3.5 text-warning" />
                    TRACE LEAK OF THIS COPY
                  </TraceButton>
                </Link>

                <Link href={`/ledger?record=${record?.height ?? 1}`} className="w-full">
                  <TraceButton variant="outline" size="sm" className="w-full font-mono text-xs">
                    INSPECT LEDGER BLOCK
                  </TraceButton>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-md bg-background/30 gap-3">
            <StatusBadge tone={running ? 'info' : 'neutral'} className="text-xs">
              {running ? 'DECRYPTION IN PROGRESS' : 'AWAITING SELECTION'}
            </StatusBadge>
            <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">
              Select a target document and recipient above, then execute decryption. The system decapsulates the key,
              embeds the watermark, signs the event, and records the block.
            </p>
          </div>
        )}
      </Panel>
    </div>
  )
}
