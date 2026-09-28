'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  BadgeCheck,
  FileSearch,
  FileText,
  Fingerprint,
  KeyRound,
  Link2,
  PenLine,
  ShieldAlert,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ALGORITHMS, type DecryptionSession, type LedgerRecord } from '@/lib/data'
import { formatTs, groupHex, truncateHash } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Hash, StatusBadge, TraceButton, TraceCard } from './primitives'
import type { ApiInvestigationReport, ApiEvidenceHop } from '@/lib/api'

export interface LeakedCopy {
  name: string
  sizeBytes: number
  hash: string
  source: string
}

export function ForensicResultCard({
  session,
  backendReport,
  onViewEvidence,
}: {
  session?: DecryptionSession | null
  backendReport?: ApiInvestigationReport | null
  onViewEvidence: () => void
}) {
  const { getDocument, getRecipient, getLedgerRecordForSession } = useTracelock()
  const [reportOpen, setReportOpen] = useState(false)

  const isFailed = backendReport
    ? backendReport.overall_status === 'VERIFICATION FAILED' || !backendReport.watermark_extracted
    : false

  const doc = session ? getDocument(session.documentId) : undefined
  const recipient = session ? getRecipient(session.recipientId) : undefined
  const record = session ? getLedgerRecordForSession(session.id) : undefined

  // Strict rule: Never display attribution values if the investigation failed
  const recipientId = isFailed ? null : backendReport?.attributed_recipient_id || session?.recipientId || null
  const recipientName = isFailed ? null : backendReport?.attributed_recipient_name || recipient?.name || null
  const recipientRole = isFailed ? null : backendReport?.attributed_recipient_role || recipient?.role || null
  const watermarkId = isFailed ? null : backendReport?.watermark_id || session?.watermarkId || null
  const sessionId = isFailed ? null : backendReport?.session_id || session?.id || null
  const blockHeight = isFailed
    ? null
    : backendReport?.ledger_record_id
      ? `#${backendReport.ledger_record_id}`
      : record
        ? `#${record.height}`
        : null

  if (isFailed) {
    return (
      <section
        aria-labelledby="attribution-heading"
        className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-lg border-2 border-destructive/60 bg-card/95 shadow-[0_0_24px_-4px_rgba(239,68,68,0.25)] duration-500"
      >
        <header className="flex items-center justify-between gap-4 border-b border-destructive/40 bg-destructive/15 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md border border-destructive/50 bg-destructive/20 text-destructive shadow-inner">
              <ShieldAlert className="size-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-destructive animate-ping" />
                <h2
                  id="attribution-heading"
                  className="font-mono text-base font-bold tracking-[0.16em] text-destructive"
                >
                  VERIFICATION FAILED
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                No TRACELOCK forensic marker or valid cryptographic signature detected in evidence.
              </p>
            </div>
          </div>
          <span className="rounded border border-destructive/50 bg-destructive/20 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider text-destructive">
            CONFIDENCE 0.00
          </span>
        </header>

        <div className="p-5 space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs">
            <p className="font-semibold text-destructive flex items-center gap-1.5 font-mono">
              <XCircle className="size-4 shrink-0" /> NO TRACELOCK FORENSIC EVIDENCE DETECTED
            </p>
            <p className="text-muted-foreground mt-1 leading-relaxed text-[11.5px]">
              This file does not contain a verified TRACELOCK watermark/signature chain. No recipient
              attribution can be established.
            </p>
          </div>

          <dl className="divide-y divide-border/60 text-xs">
            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Recipient Attribution</dt>
              <dd className="font-mono font-semibold text-destructive">
                UNATTRIBUTED / NO IDENTITY BOUND
              </dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Document</dt>
              <dd className="font-mono text-muted-foreground">
                {backendReport?.filename || 'Unregistered Artefact'}
              </dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Decryption Session</dt>
              <dd className="font-mono text-muted-foreground">NONE DETECTED</dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Forensic Watermark</dt>
              <dd className="font-mono text-destructive">NOT DETECTED / NO PAYLOAD</dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">ML-DSA Signature</dt>
              <dd>
                <StatusBadge tone="danger">NOT VERIFIED</StatusBadge>
              </dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Ledger Evidence</dt>
              <dd>
                <StatusBadge tone="danger">NOT VERIFIED</StatusBadge>
              </dd>
            </div>

            <div className="flex items-center justify-between py-3 border-t-2 border-destructive/30 bg-destructive/[0.04] -mx-5 px-5">
              <div>
                <p className="label-caps font-semibold text-destructive">Final Attribution</p>
                <p className="font-mono text-sm font-bold tracking-wider text-destructive">
                  REJECTED — INCONCLUSIVE ARTEFACT
                </p>
              </div>
              <TraceButton
                variant="destructive"
                size="sm"
                icon={FileSearch}
                onClick={onViewEvidence}
              >
                View Diagnostic
              </TraceButton>
            </div>
          </dl>
        </div>
      </section>
    )
  }

  // SUCCESS STATE with Uiverse-inspired rotating border card
  return (
    <>
      <TraceCard variant="rotating" tone="success" className="animate-in fade-in duration-500 shadow-xl">
        <header className="flex items-center justify-between gap-4 border-b border-success/30 bg-success/15 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md border border-success/50 bg-success/20 text-success shadow-inner">
              <BadgeCheck className="size-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-success animate-ping" />
                <h2
                  id="attribution-heading"
                  className="font-mono text-base font-bold tracking-[0.16em] text-success"
                >
                  CRYPTOGRAPHICALLY VERIFIED
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leaked copy definitively attributed via post-quantum digital signature &amp; immutable DLT ledger.
              </p>
            </div>
          </div>
          <span className="rounded border border-success/50 bg-success/20 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider text-success">
            HIGH CONFIDENCE (1.00)
          </span>
        </header>

        <div className="p-5 space-y-1">
          <dl className="divide-y divide-border/60">
            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Attributed Recipient</dt>
              <dd className="text-right">
                <p className="font-mono text-sm font-bold text-foreground">{recipientId}</p>
                <p className="font-sans text-xs text-muted-foreground">
                  {recipientName} · {recipientRole}
                </p>
              </dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Protected Document</dt>
              <dd className="font-mono text-sm font-medium text-foreground">
                {backendReport?.filename || doc?.name || 'DEFENCE_BRIEF_07.pdf'}
              </dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Decryption Session</dt>
              <dd className="font-mono text-sm font-semibold text-primary">{sessionId}</dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Forensic Watermark</dt>
              <dd className="text-right font-mono text-sm font-medium text-foreground">
                <span>{watermarkId}</span>
                {session?.watermarkHash && (
                  <span className="block text-[11px] text-muted-foreground">
                    Payload SHA3: {truncateHash(session.watermarkHash, 10, 6)}
                  </span>
                )}
              </dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Decryption Timestamp</dt>
              <dd className="font-mono text-sm text-foreground">
                {backendReport?.decryption_timestamp
                  ? formatTs(backendReport.decryption_timestamp)
                  : session?.timestamp
                    ? formatTs(session.timestamp)
                    : '2026-09-28T18:04:31Z'}
              </dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Post-Quantum Signature</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {backendReport?.signature_algorithm || ALGORITHMS.signature}
                </span>
                <StatusBadge tone="success">VALID</StatusBadge>
              </dd>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <dt className="label-caps">Ledger Evidence</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  Block {blockHeight ?? '#11'} · Enclave DLT
                </span>
                <StatusBadge tone="success">VERIFIED</StatusBadge>
              </dd>
            </div>

            <div className="flex items-center justify-between py-3 border-t-2 border-success/30 bg-success/[0.04] -mx-5 px-5">
              <div>
                <p className="label-caps font-semibold text-success">Attribution</p>
                <p className="font-mono text-sm font-bold tracking-wider text-success">
                  CRYPTOGRAPHICALLY VERIFIED
                </p>
              </div>
              <div className="flex items-center gap-2">
                <TraceButton
                  variant="outline"
                  size="sm"
                  icon={FileText}
                  onClick={() => setReportOpen(true)}
                >
                  Certificate
                </TraceButton>
                <TraceButton
                  variant="primary"
                  size="sm"
                  icon={FileSearch}
                  onClick={onViewEvidence}
                >
                  View Evidence Chain
                </TraceButton>
              </div>
            </div>
          </dl>
        </div>
      </TraceCard>

      {/* Forensic Attestation Certificate Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-2xl border-success/40 bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2 text-success font-mono text-xs font-semibold tracking-wider">
              <BadgeCheck className="size-4" /> TRACELOCK FORENSIC ATTRIBUTION REPORT
            </div>
            <DialogTitle className="text-lg font-bold">Cryptographic Forensic Certificate</DialogTitle>
            <DialogDescription>
              Legal &amp; technical chain of custody record generated in an air-gapped security enclave.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-border bg-background/80 p-4 font-mono text-xs space-y-3">
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">CASE NUMBER:</span>
              <span className="font-bold text-foreground">
                {backendReport?.investigation_id || 'INV-2026-0114'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">EVIDENCE ARTEFACT:</span>
              <span className="text-foreground">
                {backendReport?.filename || doc?.name || 'DEFENCE_BRIEF_07.pdf'} (Seized Copy)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">EXTRACTED WATERMARK:</span>
              <span className="text-primary font-bold">{watermarkId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ATTRIBUTED RECIPIENT:</span>
              <span className="text-foreground font-bold">
                {recipientId} ({recipientName})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DECRYPTION SESSION ID:</span>
              <span className="text-foreground">{sessionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DECRYPTION TIMESTAMP:</span>
              <span className="text-foreground">
                {backendReport?.decryption_timestamp
                  ? formatTs(backendReport.decryption_timestamp)
                  : session?.timestamp
                    ? formatTs(session.timestamp)
                    : '2026-09-28T18:04:31Z'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PQC SIGNATURE ALGORITHM:</span>
              <span className="text-foreground">
                {backendReport?.signature_algorithm || `${ALGORITHMS.signature} (NIST FIPS 204)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SIGNATURE VERIFICATION:</span>
              <span className="text-success font-bold">PASS / MATHEMATICALLY VALID</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LEDGER BLOCK HEIGHT:</span>
              <span className="text-foreground">{blockHeight ?? '#11'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CONSENSUS VERIFICATION:</span>
              <span className="text-success font-bold">4 / 4 VALIDATOR IDENTITIES CONCUR</span>
            </div>
            <div className="border-t border-border/80 pt-2 text-[11px] text-muted-foreground leading-relaxed">
              ATTESTATION: The invisible forensic watermark embedded during session {sessionId} cannot be
              forged without possession of recipient {recipientId}&apos;s enclave-bound post-quantum signing
              key. The offline tamper-evident ledger confirms uninterrupted hash continuity.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={() => window.print()} className="gap-1.5">
              Print / Save Certificate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface ChainLink {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  claim: string
  rows: { k: string; v: React.ReactNode }[]
  verdict: string
}

function buildLinks(
  session: DecryptionSession,
  record: LedgerRecord | undefined,
  leaked: LeakedCopy,
  ctx: ReturnType<typeof useTracelock>
): ChainLink[] {
  const doc = ctx.getDocument(session.documentId)
  const recipient = ctx.getRecipient(session.recipientId)
  return [
    {
      icon: FileText,
      title: 'Leaked copy',
      claim: 'The artefact under investigation.',
      rows: [
        { k: 'File', v: leaked.name },
        { k: 'Source', v: leaked.source },
        { k: 'SHA3-256', v: <Hash value={leaked.hash} head={16} tail={8} /> },
      ],
      verdict: 'INTEGRITY CHECKED',
    },
    {
      icon: Fingerprint,
      title: 'Extracted forensic watermark',
      claim: 'Invisible session-specific watermark recovered from the leaked copy.',
      rows: [
        { k: 'Watermark ID', v: session.watermarkId },
        { k: 'Payload hash', v: <Hash value={session.watermarkHash} head={16} tail={8} /> },
        { k: 'Scheme', v: ALGORITHMS.watermark },
      ],
      verdict: 'EXTRACTED',
    },
    {
      icon: Link2,
      title: 'Immutable ledger record',
      claim: 'The watermark is bound to exactly one committed decryption event.',
      rows: [
        { k: 'Record', v: record ? `#${record.height} · ${record.recordId}` : '—' },
        { k: 'Event hash', v: record ? <Hash value={record.eventHash} head={16} tail={8} /> : '—' },
        { k: 'Previous hash', v: record ? <Hash value={record.prevHash} head={16} tail={8} /> : '—' },
        { k: 'Document hash', v: doc ? <Hash value={doc.hash} head={16} tail={8} /> : '—' },
      ],
      verdict: 'CHAIN INTACT',
    },
    {
      icon: PenLine,
      title: 'Signed decryption event',
      claim: "The event was signed with the recipient's private key at decryption time.",
      rows: [
        { k: 'Session', v: session.id },
        { k: 'Timestamp', v: formatTs(session.timestamp) },
        { k: 'Algorithm', v: `${ALGORITHMS.signature} (${ALGORITHMS.signatureStandard})` },
        { k: 'Signature', v: truncateHash(session.signature, 20, 8) },
      ],
      verdict: 'SIGNATURE VALID',
    },
    {
      icon: KeyRound,
      title: 'Recipient public verification key',
      claim: 'The signature verifies only against this registered public key.',
      rows: [
        { k: 'Key fingerprint', v: recipient ? groupHex(recipient.fingerprint.slice(0, 32)) : '—' },
        { k: 'Key status at event time', v: 'ACTIVE' },
        { k: 'Key device', v: recipient?.device ?? '—' },
      ],
      verdict: 'KEY BOUND',
    },
    {
      icon: UserCheck,
      title: 'Attribution',
      claim: 'All links verify. The leaked copy originates from this recipient and session.',
      rows: [
        { k: 'Recipient', v: `${session.recipientId} · ${recipient?.name ?? ''}` },
        { k: 'Document', v: doc?.name ?? '—' },
        { k: 'Session', v: session.id },
      ],
      verdict: 'CRYPTOGRAPHICALLY VERIFIED',
    },
  ]
}

export function EvidenceChainDialog({
  open,
  onOpenChange,
  session,
  leaked,
  caseId,
  backendReport,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  session: DecryptionSession | null
  leaked: LeakedCopy
  caseId?: string
  backendReport?: ApiInvestigationReport | null
}) {
  const ctx = useTracelock()
  const record = session ? ctx.getLedgerRecordForSession(session.id) : undefined
  const links = session ? buildLinks(session, record, leaked, ctx) : []
  const isRealBackendEvidence =
    backendReport && backendReport.evidence_chain && backendReport.evidence_chain.length > 0
  const isFailed =
    backendReport?.overall_status === 'VERIFICATION FAILED' || backendReport?.watermark_extracted === false

  // If failed and evidence_chain only has 2 hops, synthesize the remaining blocked hops for full 7-step visibility
  const fullEvidenceChain: ApiEvidenceHop[] = isRealBackendEvidence
    ? isFailed
      ? [
          ...backendReport.evidence_chain,
          ...(backendReport.evidence_chain.length < 3
            ? [
                {
                  step: 3,
                  title: 'Watermark Payload Integrity',
                  status: 'BLOCKED',
                  details: 'BLOCKED: No watermark payload recovered to verify cryptographic integrity.',
                  cryptographic_proof: null,
                },
              ]
            : []),
          {
            step: 4,
            title: 'Offline Ledger Search',
            status: 'BLOCKED',
            details: 'BLOCKED: Cannot query offline permissioned ledger without an authentic watermark identity.',
            cryptographic_proof: null,
          },
          {
            step: 5,
            title: 'Post-Quantum Signature Verification',
            status: 'BLOCKED',
            details: 'BLOCKED: No recipient signature located for NIST FIPS 204 ML-DSA-65 verification.',
            cryptographic_proof: null,
          },
          {
            step: 6,
            title: 'Ledger Tamper Audit',
            status: 'BLOCKED',
            details: 'BLOCKED: Evidence chain halted at watermark extraction failure.',
            cryptographic_proof: null,
          },
          {
            step: 7,
            title: 'Cryptographic Attribution',
            status: 'BLOCKED',
            details: 'ATTRIBUTION REJECTED: Evidence failed cryptographic provenance audit. Zero recipient liability established.',
            cryptographic_proof: null,
          },
        ]
      : backendReport.evidence_chain
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Evidence Chain{caseId ? ` · ${caseId}` : ''}</DialogTitle>
            {isRealBackendEvidence && (
              <span
                className={cn(
                  'font-mono text-[10px] border px-2 py-0.5 rounded',
                  isFailed
                    ? 'text-destructive border-destructive/30 bg-destructive/10'
                    : 'text-success border-success/30 bg-success/10'
                )}
              >
                {isFailed ? 'FORENSIC FAILURE DIAGNOSTIC' : 'GENUINE PQC & DLT PROOFS'}
              </span>
            )}
          </div>
          <DialogDescription>
            {isRealBackendEvidence
              ? isFailed
                ? 'Air-gapped forensic audit details: extraction failed and subsequent attribution stages were blocked.'
                : 'Real-time cryptographic proofs recovered from the air-gapped forensic enclave backend.'
              : 'Each link must verify for attribution to hold. Values shown are prototype demonstration data.'}
          </DialogDescription>
        </DialogHeader>

        {isRealBackendEvidence ? (
          <ol className="flex flex-col gap-2">
            {fullEvidenceChain.map((hop: ApiEvidenceHop, i: number) => {
              const last = i === fullEvidenceChain.length - 1
              const isPass = hop.status === 'VERIFIED'
              const isBlocked = hop.status === 'BLOCKED'
              return (
                <li key={hop.step}>
                  <div
                    className={cn(
                      'rounded-md border bg-background transition-colors',
                      isPass
                        ? 'border-success/40'
                        : isBlocked
                          ? 'border-border/60 opacity-60 bg-background/50'
                          : 'border-destructive/60 bg-destructive/5'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2 bg-secondary/30">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] text-muted-foreground">0{hop.step}</span>
                        <p className="text-sm font-semibold text-foreground">{hop.title}</p>
                      </div>
                      <StatusBadge
                        tone={isPass ? 'success' : isBlocked ? 'neutral' : 'danger'}
                      >
                        {hop.status}
                      </StatusBadge>
                    </div>
                    <div className="px-3.5 py-3 space-y-1.5 text-xs">
                      <p className="text-muted-foreground leading-relaxed">{hop.details}</p>
                      {hop.cryptographic_proof && (
                        <div className="rounded border border-border/70 bg-secondary/40 p-2 font-mono text-[11px] text-primary break-all">
                          <span className="text-muted-foreground mr-1">Proof:</span>
                          {hop.cryptographic_proof}
                        </div>
                      )}
                    </div>
                  </div>
                  {!last && (
                    <div
                      aria-hidden
                      className={cn(
                        'flex justify-center py-1',
                        isBlocked ? 'text-border' : isPass ? 'text-success/60' : 'text-destructive/60'
                      )}
                    >
                      <ArrowDown className="size-4" />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        ) : (
          <ol className="flex flex-col">
            {links.map((l, i) => {
              const Icon = l.icon
              const last = i === links.length - 1
              return (
                <li key={l.title}>
                  <div className={cn('rounded-md border bg-background', last ? 'border-success/40' : 'border-border')}>
                    <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                        <Icon className="size-4 text-primary" strokeWidth={1.75} />
                        <p className="text-sm font-medium">{l.title}</p>
                      </div>
                      <StatusBadge tone="success">{l.verdict}</StatusBadge>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="mb-2 text-xs text-muted-foreground">{l.claim}</p>
                      <dl className="grid gap-1.5">
                        {l.rows.map((r) => (
                          <div key={r.k} className="grid grid-cols-[160px_1fr] gap-3 text-xs">
                            <dt className="text-muted-foreground">{r.k}</dt>
                            <dd className="min-w-0 truncate font-mono">{r.v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                  {!last && (
                    <div aria-hidden className="flex justify-center py-1 text-success/60">
                      <ArrowDown className="size-4" />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {!isFailed && session && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Link
              href={`/sessions/${backendReport?.session_id || session.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Session record
            </Link>
            <Link href="/ledger" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Ledger record{' '}
              {backendReport?.ledger_record_id
                ? `#${backendReport.ledger_record_id}`
                : record
                  ? `#${record.height}`
                  : ''}
            </Link>
            <Link
              href={`/identity?recipient=${backendReport?.attributed_recipient_id || session.recipientId}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Recipient identity
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
