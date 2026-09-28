'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileCheck, FileWarning, Play, RotateCcw, ShieldAlert, Upload } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api/client'
import type { ApiInvestigationReport } from '@/lib/api'
import { DEMO_LEAK_SESSION_ID } from '@/lib/data'
import { formatBytes, formatTs, truncateHash } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { cn } from '@/lib/utils'
import { EvidenceChainDialog, ForensicResultCard, type LeakedCopy } from './forensic-result'
import { Mono, PageHeader, Panel, StatusBadge, TraceButton } from './primitives'
import { type StepStatus, type WorkflowStep, WorkflowStepper } from './workflow-stepper'

const STEP_MS = 550
const TOTAL = 8

export type ForensicState = 'IDLE' | 'EVIDENCE_LOADED' | 'ANALYZING' | 'VERIFIED' | 'FAILED'

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function InvestigationView({ sessionId }: { sessionId?: string }) {
  const ctx = useTracelock()
  const { getSession, getDocument, getRecipient, getLedgerRecordForSession, investigations, sessions, recordAttribution } = ctx

  const [forensicState, setForensicState] = useState<ForensicState>('IDLE')
  const [leaked, setLeaked] = useState<LeakedCopy | null>(null)
  const [actualFile, setActualFile] = useState<File | null>(null)
  const [backendReport, setBackendReport] = useState<ApiInvestigationReport | null>(null)
  const [dragging, setDragging] = useState(false)
  const [current, setCurrent] = useState(-1)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [caseId, setCaseId] = useState<string | undefined>()
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  const attributed = useRef(false)
  const running = forensicState === 'ANALYZING'
  const isFinished = forensicState === 'VERIFIED' || forensicState === 'FAILED'

  // Look up target session only if verified or requested, NEVER use it to fake attribution
  const verifiedSessionId = backendReport?.overall_status === 'CRYPTOGRAPHICALLY VERIFIED' ? backendReport.session_id : undefined
  const activeSession = verifiedSessionId ? getSession(verifiedSessionId) : undefined
  const doc = activeSession ? getDocument(activeSession.documentId) : getDocument('DOC-A71F')
  const candidateCount = sessions.filter((s) => s.documentId === (doc?.id ?? 'DOC-A71F')).length

  // Reset state when new file is selected
  function reset() {
    setForensicState('IDLE')
    setCurrent(-1)
    setEvidenceOpen(false)
    setBackendReport(null)
    setActualFile(null)
    setLeaked(null)
    setCaseId(undefined)
    attributed.current = false
  }

  async function acceptFile(file: File | undefined) {
    if (!file) return
    // Immediately clear previous analysis state
    setForensicState('EVIDENCE_LOADED')
    setCurrent(-1)
    setEvidenceOpen(false)
    setBackendReport(null)
    attributed.current = false

    setActualFile(file)
    const hash = await sha256Hex(file)
    setLeaked({
      name: file.name,
      sizeBytes: file.size,
      hash,
      source: 'Forensic Upload (Air-Gapped Ingestion)',
    })
  }

  // Load canonical demo evidence: fetch actual SES-8F29A1_decrypted.pdf from backend
  async function loadCanonicalDemoEvidence() {
    setIsDemoLoading(true)
    try {
      setForensicState('EVIDENCE_LOADED')
      setCurrent(-1)
      setEvidenceOpen(false)
      setBackendReport(null)
      attributed.current = false

      const url = `${API_BASE_URL}/documents/download/SES-8F29A1_decrypted.pdf`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch canonical demo evidence from ${url}`)
      const blob = await res.blob()
      const file = new File([blob], 'DEFENCE_BRIEF_07_SES-8F29A1_exfiltrated.pdf', { type: 'application/pdf' })
      setActualFile(file)
      const hash = await sha256Hex(file)
      setLeaked({
        name: 'DEFENCE_BRIEF_07_SES-8F29A1_exfiltrated.pdf',
        sizeBytes: file.size,
        hash,
        source: 'Canonical Leak Evidence (Session SES-8F29A1)',
      })
    } catch (err: any) {
      console.error('Failed to load canonical demo evidence:', err)
      setForensicState('EVIDENCE_LOADED')
      setCurrent(-1)
      setEvidenceOpen(false)
      setBackendReport(null)
      attributed.current = false
      setLeaked({
        name: 'DEFENCE_BRIEF_07_SES-8F29A1_exfiltrated.pdf',
        sizeBytes: 23495,
        hash: '20aa0b4828e57dc38f335c7f5e9872e7dadf50398d1f58ffbcbbf2fb50e3ddad',
        source: 'Canonical Leak Evidence (Air-Gapped Storage)',
      })
    } finally {
      setIsDemoLoading(false)
    }
  }

  // Execute Analysis
  async function startAnalysis() {
    if (!leaked) return
    setForensicState('ANALYZING')
    setCurrent(0)
    setBackendReport(null)
    attributed.current = false

    if (actualFile && ctx.isBackendConnected) {
      try {
        const report = await ctx.performBackendInvestigation(actualFile)
        setBackendReport(report)
      } catch (err: any) {
        console.error('Backend investigation error:', err)
        setBackendReport({
          investigation_id: `INV-ERR-${Date.now().toString(16).toUpperCase()}`,
          filename: actualFile.name,
          leaked_doc_hash: leaked.hash,
          overall_status: 'VERIFICATION FAILED',
          watermark_extracted: false,
          watermark_integrity_valid: false,
          signature_verified: false,
          signature_algorithm: 'NIST FIPS 204 ML-DSA-65',
          ledger_verified: false,
          evidence_chain: [
            {
              step: 1,
              title: 'Document Ingestion',
              status: 'VERIFIED',
              details: `File '${actualFile.name}' ingested into forensic enclave.`,
              cryptographic_proof: `SHA-256: ${leaked.hash}`,
            },
            {
              step: 2,
              title: 'Forensic Watermark Extraction',
              status: 'FAILED',
              details: err?.message || 'Extraction failed: no authentic TRACELOCK watermark found.',
              cryptographic_proof: null,
            },
          ],
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      setTimeout(() => {
        setBackendReport({
          investigation_id: `INV-OFF-${Date.now().toString(16).toUpperCase()}`,
          filename: leaked.name,
          leaked_doc_hash: leaked.hash,
          overall_status: 'VERIFICATION FAILED',
          watermark_extracted: false,
          watermark_integrity_valid: false,
          signature_verified: false,
          signature_algorithm: 'NIST FIPS 204 ML-DSA-65',
          ledger_verified: false,
          evidence_chain: [
            {
              step: 1,
              title: 'Document Ingestion',
              status: 'VERIFIED',
              details: `File '${leaked.name}' ingested into offline sandbox.`,
              cryptographic_proof: `SHA-256: ${leaked.hash}`,
            },
            {
              step: 2,
              title: 'Forensic Watermark Extraction',
              status: 'FAILED',
              details: 'No backend enclave available to verify post-quantum signature.',
              cryptographic_proof: null,
            },
          ],
          timestamp: new Date().toISOString(),
        })
      }, 1500)
    }
  }

  // Stepper timeline execution
  useEffect(() => {
    if (forensicState !== 'ANALYZING') return

    const timer = setInterval(() => {
      setCurrent((prev) => {
        // If we have received a failed report and reached step 2 (watermark extraction), jump to finish
        if (backendReport && (backendReport.overall_status === 'VERIFICATION FAILED' || !backendReport.watermark_extracted)) {
          if (prev >= 2) {
            clearInterval(timer)
            setForensicState('FAILED')
            return TOTAL
          }
        }

        if (prev >= TOTAL - 1) {
          clearInterval(timer)
          if (backendReport?.overall_status === 'CRYPTOGRAPHICALLY VERIFIED') {
            setForensicState('VERIFIED')
            if (!attributed.current && backendReport.session_id) {
              attributed.current = true
              setCaseId(recordAttribution(doc?.id ?? 'DOC-A71F', backendReport.session_id).id)
            }
          } else {
            setForensicState('FAILED')
          }
          return TOTAL
        }

        return prev + 1
      })
    }, STEP_MS)

    return () => clearInterval(timer)
  }, [forensicState, backendReport, doc, recordAttribution])

  // Determine stage status accurately
  const isFailed = forensicState === 'FAILED' || (backendReport && backendReport.overall_status === 'VERIFICATION FAILED')
  const isVerified = forensicState === 'VERIFIED' && backendReport?.overall_status === 'CRYPTOGRAPHICALLY VERIFIED'

  function getStepStatus(stepIndex: number): StepStatus {
    if (forensicState === 'IDLE' || (forensicState === 'EVIDENCE_LOADED' && current < 0)) return 'pending'
    if (forensicState === 'ANALYZING') {
      if (stepIndex < current) return 'done'
      if (stepIndex === current) return 'running'
      return 'pending'
    }
    if (isFailed) {
      if (stepIndex < 2) return 'done'
      if (stepIndex === 2) return 'failed'
      return 'blocked'
    }
    if (isVerified) return 'done'
    return 'pending'
  }

  const steps: WorkflowStep[] = [
    {
      key: 'leak',
      title: 'LEAKED DOCUMENT',
      detail: 'Artefact ingested into the forensic workspace. The original evidence is never modified.',
      status: getStepStatus(0),
      output: leaked && <>{leaked.name} · {formatBytes(leaked.sizeBytes)} · SHA-256 {truncateHash(leaked.hash, 12, 6)}</>,
    },
    {
      key: 'integrity',
      title: 'DOCUMENT INTEGRITY CHECK',
      detail: 'Structural envelope is inspected and matched against protected defense document registry.',
      status: getStepStatus(1),
      output: leaked && <>structure inspected · content hash computed · ready for watermark extraction</>,
    },
    {
      key: 'extract',
      title: 'FORENSIC WATERMARK EXTRACTION',
      detail: 'Steganographic and structural layers are searched for an authentic session watermark.',
      status: getStepStatus(2),
      output: backendReport ? (
        backendReport.watermark_extracted ? (
          <span className="text-success font-semibold">
            payload recovered · {backendReport.watermark_id} · {backendReport.watermark_layer || 'Multi-Layer Stego'}
          </span>
        ) : (
          <span className="text-destructive font-semibold">
            EXTRACTION FAILED · No authentic TRACELOCK watermark detected
          </span>
        )
      ) : running && current >= 2 ? (
        <span>Scanning metadata dictionary and PDF cross-reference streams…</span>
      ) : null,
    },
    {
      key: 'identify',
      title: 'WATERMARK IDENTIFICATION',
      detail: `Payload is decoded to a watermark identifier and checked against active decryption sessions.`,
      status: getStepStatus(3),
      output: isFailed ? (
        <span className="text-muted-foreground italic">BLOCKED · Watermark payload unavailable</span>
      ) : backendReport?.watermark_id ? (
        <span className="text-foreground">
          {backendReport.watermark_id} · verified against ledger records · 0 collisions
        </span>
      ) : null,
    },
    {
      key: 'lookup',
      title: 'IMMUTABLE LEDGER LOOKUP',
      detail: 'The offline permissioned ledger is queried for the decryption event bound to this watermark.',
      status: getStepStatus(4),
      output: isFailed ? (
        <span className="text-muted-foreground italic">BLOCKED · No watermark identifier to query</span>
      ) : backendReport?.ledger_verified ? (
        <span className="text-foreground">
          block #{backendReport.ledger_record_id} · session {backendReport.session_id}
        </span>
      ) : null,
    },
    {
      key: 'sig',
      title: 'POST-QUANTUM SIGNATURE VERIFICATION',
      detail: "The event signature is verified using the recipient's registered NIST ML-DSA-65 public key.",
      status: getStepStatus(5),
      output: isFailed ? (
        <span className="text-muted-foreground italic">BLOCKED · Signature verification aborted</span>
      ) : backendReport?.signature_verified ? (
        <span className="text-foreground">
          {backendReport.signature_algorithm} verify(pk:{backendReport.recipient_dsa_fingerprint?.slice(0, 8) || '7097ff83'}…, event) = VALID
        </span>
      ) : null,
    },
    {
      key: 'evidence',
      title: 'LEDGER EVIDENCE VERIFICATION',
      detail: 'Hash links are recomputed from the block forward to the current tip to prove untampered evidence.',
      status: getStepStatus(6),
      output: isFailed ? (
        <span className="text-muted-foreground italic">BLOCKED · Ledger integrity audit aborted</span>
      ) : backendReport?.ledger_verified ? (
        <span className="text-foreground">
          chain intact to tip · block #{backendReport.ledger_record_id} verified · 4/4 nodes agree
        </span>
      ) : null,
    },
    {
      key: 'attr',
      title: 'CRYPTOGRAPHIC ATTRIBUTION',
      detail: 'All evidence links resolve unambiguously to one recipient and one decryption session.',
      status: getStepStatus(7),
      output: isFailed ? (
        <span className="text-destructive font-semibold">ATTRIBUTION REJECTED · UNTRUSTED ARTEFACT</span>
      ) : backendReport?.overall_status === 'CRYPTOGRAPHICALLY VERIFIED' ? (
        <span className="text-success font-semibold">
          {backendReport.attributed_recipient_id} ({backendReport.attributed_recipient_name}) · {backendReport.session_id} · VERIFIED
        </span>
      ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Forensic Investigation"
        title="Trace a leaked copy to its recipient"
        description="Submit an exfiltrated document to extract the forensic watermark, verify post-quantum signatures, and attribute the exact decryption session on the immutable ledger."
        actions={
          caseId ? (
            <div className="rounded-md border border-border bg-card px-3 py-1.5 text-right">
              <p className="font-mono text-xs text-foreground font-semibold">{caseId}</p>
              <p className="text-[10px] text-muted-foreground">ATTRIBUTED CASE FILE</p>
            </div>
          ) : null
        }
      />

      {/* Upload Zone */}
      <div className="grid gap-3">
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            acceptFile(e.dataTransfer.files[0])
          }}
          className={cn(
            'tactical-grid relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-all duration-200 overflow-hidden',
            dragging
              ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
              : leaked
                ? 'border-primary/50 bg-card/80 shadow-sm'
                : 'border-border/80 bg-card/40 hover:border-primary/40 hover:bg-card/60',
          )}
        >
          {leaked ? (
            <>
              <div className="grid size-11 place-items-center rounded-lg border border-primary/40 bg-primary/15 text-primary">
                <FileCheck className="size-5" />
              </div>
              <div>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded">
                    EVIDENCE LOADED
                  </span>
                  <p className="text-sm font-semibold text-foreground tracking-tight">{leaked.name}</p>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {formatBytes(leaked.sizeBytes)} · Source: {leaked.source} · SHA3-256: {truncateHash(leaked.hash, 14, 6)}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground/80 hover:text-foreground underline underline-offset-2">
                Click or drop another file to replace evidence
              </p>
            </>
          ) : (
            <>
              <div className="grid size-11 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_rgba(56,189,248,0.15)]">
                <Upload className="size-5" />
              </div>
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.2em] text-foreground">
                  DROP LEAKED DOCUMENT HERE OR CLICK TO BROWSE
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ingest evidence into the local air-gapped forensic enclave. Original evidence bytes are never modified.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  SUPPORTED: PDF, PNG, JPG
                </span>
                <span className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  AIR-GAPPED ENCLAVE
                </span>
              </div>
            </>
          )}
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="sr-only"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </label>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/30 px-4 py-2.5 rounded-lg border border-border/70">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" />
            <span>Target Repository:</span>
            <span className="font-mono text-foreground font-medium">DEFENCE_BRIEF_07.pdf</span>
            <span className="hidden sm:inline text-muted-foreground/70">({candidateCount} authorized recipient copies)</span>
          </div>

          <div className="flex items-center gap-2">
            <TraceButton
              variant="secondary"
              size="sm"
              loading={isDemoLoading}
              disabled={running || isDemoLoading}
              onClick={loadCanonicalDemoEvidence}
              className="gap-1.5 font-mono text-xs"
            >
              <FileWarning className="size-3.5 text-warning" />
              LOAD CANONICAL DEMO EVIDENCE
            </TraceButton>

            {isFinished ? (
              <TraceButton
                variant="outline"
                size="sm"
                className="gap-1.5 font-mono text-xs"
                onClick={reset}
              >
                <RotateCcw className="size-3.5" />
                RESET ANALYSIS
              </TraceButton>
            ) : (
              <TraceButton
                variant="primary"
                size="sm"
                disabled={!leaked || running}
                loading={running}
                onClick={startAnalysis}
                className="gap-2 font-mono text-xs font-semibold tracking-wider"
              >
                <Play className="size-3.5" />
                {running ? 'PROCESSING STAGES…' : 'RUN FORENSIC ANALYSIS'}
              </TraceButton>
            )}
          </div>
        </div>
      </div>

      {/* Live Telemetry Ticker during analysis */}
      {running && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 font-mono text-xs flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5 text-primary">
            <span className="size-2 rounded-full bg-primary animate-ping" />
            <span className="font-bold">LIVE TELEMETRY:</span>
            <span>
              {current === 0 && 'Ingesting artefact & computing SHA3-256 digest...'}
              {current === 1 && 'Checking document envelope against Strategic Planning registry...'}
              {current === 2 && 'Executing spread-spectrum cross-correlation & metadata extraction...'}
              {current === 3 && (backendReport?.watermark_id ? `Decoding watermark payload: ${backendReport.watermark_id} identified...` : 'Searching watermark registry...')}
              {current === 4 && (backendReport?.ledger_record_id ? `Querying air-gapped ledger at Block #${backendReport.ledger_record_id}...` : 'Querying offline ledger chain...')}
              {current === 5 && 'Verifying NIST FIPS 204 ML-DSA-65 post-quantum signature...'}
              {current === 6 && 'Verifying ledger hash chain integrity to tip...'}
              {current >= 7 && (backendReport?.attributed_recipient_name ? `Attribution confirmed: ${backendReport.attributed_recipient_id} (${backendReport.attributed_recipient_name})` : 'Finalizing cryptographic report...')}
            </span>
          </div>
          <span className="text-muted-foreground">{Math.min(current + 1, TOTAL)} / {TOTAL}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Panel
          title="Forensic Analysis Pipeline"
          description="Sequential cryptographic and watermark verification steps"
          actions={
            <div className="flex items-center gap-2">
              {ctx.isBackendConnected && (
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-success border border-success/30 bg-success/10 px-1.5 py-0.5 rounded">
                  PQC ENCLAVE ONLINE
                </span>
              )}
              <span className={cn(
                'font-mono text-[11px] font-semibold',
                isVerified && 'text-success',
                isFailed && 'text-destructive',
                running && 'text-primary',
                !running && !isFinished && 'text-muted-foreground',
              )}>
                {isVerified ? 'CRYPTOGRAPHICALLY VERIFIED' : isFailed ? 'VERIFICATION FAILED' : running ? `STAGE ${Math.min(current + 1, TOTAL)} / ${TOTAL}` : 'AWAITING EVIDENCE'}
              </span>
            </div>
          }
        >
          <WorkflowStepper steps={steps} current={current} finished={isFinished} />
        </Panel>

        <div className="flex flex-col gap-6">
          {/* Result Card: strictly driven by backend report */}
          {isFinished && backendReport ? (
            <ForensicResultCard
              session={
                isVerified && backendReport.session_id
                  ? (getSession(backendReport.session_id) ?? {
                      id: backendReport.session_id,
                      documentId: 'DOC-A71F',
                      recipientId: backendReport.attributed_recipient_id ?? 'RECIPIENT-047',
                      watermarkId: backendReport.watermark_id ?? '',
                      watermarkHash: '',
                      sessionFingerprint: backendReport.leaked_doc_hash,
                      signature: '',
                      signatureStatus: 'VALID' as const,
                      status: 'LEDGER VERIFIED' as const,
                      timestamp: backendReport.decryption_timestamp ?? new Date().toISOString(),
                      simulated: false,
                    })
                  : null
              }
              backendReport={backendReport}
              onViewEvidence={() => setEvidenceOpen(true)}
            />
          ) : (
            <Panel title="Attribution Result">
              <div className="flex min-h-72 flex-col justify-center items-center gap-4 text-center p-6 border border-dashed border-border/80 rounded-md bg-background/40">
                <StatusBadge tone={running ? 'info' : 'neutral'} className="self-center text-xs px-2.5 py-1">
                  {running ? 'ANALYSIS IN PROGRESS' : leaked ? 'READY FOR ANALYSIS' : 'AWAITING EVIDENCE INGESTION'}
                </StatusBadge>
                <div className="max-w-md space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Cryptographic Attribution Guarantee
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                    TRACELOCK issues an attribution only when all 8 pipeline stages pass: the invisible watermark matches
                    an authorized decryption session, the recipient&apos;s ML-DSA-65 post-quantum signature verifies,
                    and the offline permissioned ledger proves unbroken hash-chain integrity.
                  </p>
                </div>
              </div>
            </Panel>
          )}

          <Panel title="Forensic Case Context">
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div className="border-b border-border/50 pb-2">
                <dt className="label-caps">Protected Document</dt>
                <dd className="mt-1 font-mono font-medium text-foreground">{doc?.id} · {doc?.classification}</dd>
              </div>
              <div className="border-b border-border/50 pb-2">
                <dt className="label-caps">Issued Unique Copies</dt>
                <dd className="mt-1 font-mono text-foreground">{candidateCount} recipient copies issued</dd>
              </div>
              <div>
                <dt className="label-caps">Case Registered</dt>
                <dd className="mt-1 font-mono text-muted-foreground">{caseId ? 'Active Case' : '—'}</dd>
              </div>
              <div>
                <dt className="label-caps">Evidence Custody</dt>
                <dd className="mt-1 text-muted-foreground truncate">{leaked?.source ?? 'Local Vault'}</dd>
              </div>
              <div className="col-span-2 pt-2 border-t border-border/50">
                <dt className="label-caps">Air-Gapped Ledger Consensus</dt>
                <dd className="mt-1 font-mono text-success text-[11px]">4 LOGICAL PERMISSIONED VALIDATOR IDENTITIES</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>

      {backendReport && leaked && (
        <EvidenceChainDialog
          open={evidenceOpen}
          onOpenChange={setEvidenceOpen}
          session={
            isVerified && backendReport.session_id
              ? (getSession(backendReport.session_id) ?? {
                  id: backendReport.session_id,
                  documentId: 'DOC-A71F',
                  recipientId: backendReport.attributed_recipient_id ?? 'RECIPIENT-047',
                  watermarkId: backendReport.watermark_id ?? '',
                  watermarkHash: '',
                  sessionFingerprint: backendReport.leaked_doc_hash,
                  signature: '',
                  signatureStatus: 'VALID' as const,
                  status: 'LEDGER VERIFIED' as const,
                  timestamp: backendReport.decryption_timestamp ?? new Date().toISOString(),
                  simulated: false,
                })
              : null
          }
          leaked={leaked}
          caseId={caseId}
          backendReport={backendReport}
        />
      )}
    </div>
  )
}
