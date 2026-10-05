'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Download, FileWarning, ScanSearch, ShieldCheck, X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { API_BASE_URL } from '@/lib/api/client'
import { formatTs } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { cn } from '@/lib/utils'
import { DecryptionSimulator } from './decryption-simulator'
import { DataTable, Hash, Mono, PageHeader, Panel, StatusBadge, Td, Th, TraceButton } from './primitives'
import { SessionRecord } from './session-record'

export function DemoEvidenceGenerator() {
  const { sessions, getDocument, getRecipient, selectedDemoEvidence, setSelectedDemoEvidence } = useTracelock()
  const completed = Array.from(
    new Map(sessions.filter((s) => s.status === 'LEDGER VERIFIED' || !s.simulated).map((s) => [s.id, s])).values()
  )

  return (
    <Panel
      title="DEMO EVIDENCE GENERATOR"
      actions={
        completed.length > 0 ? (
          <StatusBadge tone="success" className="font-mono text-[10px]">
            READY FOR FORENSIC DEMO
          </StatusBadge>
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground">Awaiting Decryption</span>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Generate recipient-specific decrypted copies for controlled forensic demonstration. Each recipient copy carries an individual, cryptographically bound forensic watermark.
        </p>

        {selectedDemoEvidence && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-warning flex items-center gap-1.5">
                <FileWarning className="size-4" /> DEMO EVIDENCE SELECTED
              </span>
              <StatusBadge tone="warning">DEMO COPY READY</StatusBadge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs border-y border-warning/20 py-2.5">
              <div>
                <span className="text-[10px] text-muted-foreground block">RECIPIENT</span>
                <span className="font-semibold text-foreground">
                  {selectedDemoEvidence.recipientId} ({selectedDemoEvidence.recipientName})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">DOCUMENT</span>
                <span className="text-foreground truncate block">{selectedDemoEvidence.documentName}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">SESSION ID</span>
                <span className="text-primary font-bold">{selectedDemoEvidence.sessionId}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">WATERMARK ID</span>
                <span className="text-foreground">{selectedDemoEvidence.watermarkId}</span>
              </div>
            </div>

            <p className="text-[11px] text-warning/90 italic border-l-2 border-warning/60 pl-2">
              Simulated leak scenario — this recipient-specific copy is intentionally selected as simulated leaked evidence for demonstration.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={selectedDemoEvidence.downloadUrl || `${API_BASE_URL}/documents/download/${selectedDemoEvidence.sessionId}_decrypted.pdf`}
                download={`${selectedDemoEvidence.sessionId}_decrypted.pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <TraceButton variant="outline" size="sm" className="font-mono text-xs gap-1.5">
                  <Download className="size-3.5" /> DOWNLOAD COPY
                </TraceButton>
              </a>

              <Link href={`/investigation?demoSession=${selectedDemoEvidence.sessionId}`}>
                <TraceButton variant="primary" size="sm" className="font-mono text-xs gap-1.5">
                  <ScanSearch className="size-3.5" /> PROCEED TO FORENSIC INVESTIGATION →
                </TraceButton>
              </Link>
            </div>
          </div>
        )}

        {completed.length === 0 ? (
          <div className="rounded border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
            Execute a decryption session above to generate a recipient-bound demonstration copy.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completed.map((s) => {
              const r = getRecipient(s.recipientId)
              const d = getDocument(s.documentId)
              const isSelected = selectedDemoEvidence?.sessionId === s.id
              const downloadUrl = (s as any).downloadUrl || `${API_BASE_URL}/documents/download/${s.id}_decrypted.pdf`

              return (
                <div
                  key={s.id}
                  className={cn(
                    'rounded-lg border p-3.5 flex flex-col justify-between gap-3 transition-colors',
                    isSelected ? 'border-warning/60 bg-warning/5' : 'border-border/60 bg-background/50 hover:border-border'
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-foreground">{s.recipientId}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">· {r?.name || 'Authorized Recipient'}</span>
                      </div>
                      <StatusBadge tone="success" className="text-[10px]">DECRYPTED</StatusBadge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-secondary/30 rounded p-2 border border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">SESSION:</span>
                        <span className="text-primary font-semibold">{s.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">WATERMARK:</span>
                        <span className="text-foreground">{s.watermarkId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">DOCUMENT:</span>
                        <span className="text-foreground truncate block">{d?.name || s.documentId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9.5px]">TIMESTAMP:</span>
                        <span className="text-muted-foreground truncate block">{formatTs(s.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <a
                      href={downloadUrl}
                      download={`${s.id}_decrypted.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1"
                    >
                      <TraceButton variant="outline" size="sm" className="w-full font-mono text-[11px] gap-1.5">
                        <Download className="size-3" /> DOWNLOAD RECIPIENT COPY
                      </TraceButton>
                    </a>

                    <TraceButton
                      variant={isSelected ? 'secondary' : 'primary'}
                      size="sm"
                      className="flex-1 font-mono text-[11px] gap-1.5"
                      onClick={() => {
                        setSelectedDemoEvidence({
                          recipientId: s.recipientId,
                          recipientName: r?.name || s.recipientId,
                          recipientRole: r?.role,
                          documentId: s.documentId,
                          documentName: d?.name || s.documentId,
                          sessionId: s.id,
                          watermarkId: s.watermarkId,
                          timestamp: s.timestamp,
                          downloadUrl,
                        })
                      }}
                    >
                      <FileWarning className="size-3 text-warning" />
                      {isSelected ? 'SELECTED AS LEAK' : 'USE AS DEMO LEAK'}
                    </TraceButton>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Panel>
  )
}

export function SessionsView({ doc, recipient }: { doc?: string; recipient?: string }) {
  const { sessions, getDocument, getLedgerRecordForSession } = useTracelock()
  const [recipientFilter, setRecipientFilter] = useState(recipient)
  const rows = Array.from(
    new Map(
      sessions
        .filter((s) => !recipientFilter || s.recipientId === recipientFilter)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .map((s) => [s.id, s])
    ).values()
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Decryption Sessions"
        title="Recipient-bound decryption provenance"
        description="Each decryption runs through eight stages. The output is a copy that looks identical to every other recipient's copy, but carries a unique invisible watermark bound to a signed, immutable ledger record."
      />

      <DecryptionSimulator initialDoc={doc} initialRecipient={recipient} />

      <DemoEvidenceGenerator />

      <Panel
        title="Session Log"
        actions={
          recipientFilter ? (
            <button
              type="button"
              onClick={() => setRecipientFilter(undefined)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary"
            >
              recipient = {recipientFilter}
              <X className="size-3" />
              <span className="sr-only">Clear filter</span>
            </button>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">{rows.length} sessions</span>
          )
        }
        bodyClassName="p-0"
      >
        <DataTable>
          <thead>
            <tr>
              <Th>Session ID</Th>
              <Th>Document</Th>
              <Th>Recipient</Th>
              <Th>Watermark</Th>
              <Th>Watermark hash</Th>
              <Th>Timestamp</Th>
              <Th>Signature</Th>
              <Th>Ledger ref</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const rec = getLedgerRecordForSession(s.id)
              return (
                <tr key={s.id} className="transition-colors hover:bg-secondary/40">
                  <Td>
                    <Link href={`/sessions/${s.id}`} className="font-mono text-xs text-primary hover:underline">{s.id}</Link>
                    {s.simulated && <span className="ml-2 font-mono text-[10px] text-muted-foreground">SIMULATED</span>}
                  </Td>
                  <Td className="max-w-44 truncate">{getDocument(s.documentId)?.name}</Td>
                  <Td><Mono>{s.recipientId}</Mono></Td>
                  <Td><Mono>{s.watermarkId}</Mono></Td>
                  <Td><Hash value={s.watermarkHash} head={8} tail={4} copy={false} className="text-muted-foreground" /></Td>
                  <Td><Mono className="text-muted-foreground">{formatTs(s.timestamp)}</Mono></Td>
                  <Td><StatusBadge>{s.signatureStatus === 'VALID' ? 'SIGNED' : 'PENDING'}</StatusBadge></Td>
                  <Td>
                    {rec ? (
                      <Link href={`/ledger?record=${rec.height}`} className="font-mono text-xs text-primary hover:underline">#{rec.height}</Link>
                    ) : (
                      <Mono className="text-muted-foreground">—</Mono>
                    )}
                  </Td>
                  <Td><StatusBadge>{s.status}</StatusBadge></Td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      </Panel>
    </div>
  )
}

export function SessionDetail({ id }: { id: string }) {
  const { getSession, getDocument } = useTracelock()
  const session = getSession(id)
  return (
    <div className="flex flex-col gap-6">
      <Link href="/sessions" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Decryption Sessions
      </Link>
      {session ? (
        <>
          <PageHeader
            eyebrow="Decryption Session"
            title={session.id}
            description={`${getDocument(session.documentId)?.name} decrypted by ${session.recipientId} on ${formatTs(session.timestamp)}.`}
            actions={
              <>
                <StatusBadge>{session.status}</StatusBadge>
                <Link href={`/investigation?session=${session.id}`} className={cn(buttonVariants({ variant: 'outline' }))}>
                  Investigate leak of this copy
                </Link>
              </>
            }
          />
          <Panel title="Session Record">
            <SessionRecord session={session} />
          </Panel>
        </>
      ) : (
        <Panel title="Session not found">
          <p className="text-sm text-muted-foreground">
            No decryption session <Mono>{id}</Mono> exists. Simulated sessions are held in memory and reset on reload.
          </p>
        </Panel>
      )}
    </div>
  )
}
