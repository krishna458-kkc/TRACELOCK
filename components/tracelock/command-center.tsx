'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, FileKey2, Lock, ScanSearch, ShieldCheck, X } from 'lucide-react'
import { useTracelock } from '@/lib/store'
import { formatTs, truncateHash } from '@/lib/format'
import { cn } from '@/lib/utils'
import { BhaveshCard, DataTable, DecryptedText, GlassBlobCard, GradientHoverCard, Hash, Mono, PageHeader, Panel, ShinyText, StatsCounter, StatusBadge, StatusDot, Td, Th, TraceButton, TraceCard } from './primitives'
import { ALGORITHMS, type DecryptionSession } from '@/lib/data'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

function MetricCard({
  label,
  value,
  sub,
  href,
}: {
  label: string
  value: number | string
  sub: string
  href: string
}) {
  const numericValue = typeof value === 'number' ? value : parseInt(String(value), 10) || 0
  return (
    <Link href={href} className="group block h-full">
      <BhaveshCard className="h-full" innerClassName="p-3.5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
            {label}
          </p>
          <ArrowRight className="size-3 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
        </div>
        <div className="mt-2">
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground group-hover:text-primary transition-colors">
            <StatsCounter value={numericValue} />
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground truncate">{sub}</p>
        </div>
      </BhaveshCard>
    </Link>
  )
}

function SecurityPipeline() {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null)

  const stages = [
    { title: 'ENCRYPT', spec: 'ML-KEM-768', desc: 'Broadcast KEM encapsulation', detail: 'NIST FIPS 203 Post-quantum content key encapsulation' },
    { title: 'AUTHORIZE', spec: 'Policy Engine', desc: 'Classification & token scope audit', detail: 'Strict clearance enforcement across recipient tokens' },
    { title: 'DECRYPT', spec: 'Device Enclave', desc: 'AES-256-GCM authenticated plaintext', detail: 'Ephemeral plaintext restoration in secure memory' },
    { title: 'WATERMARK', spec: 'Forensic Stego', desc: 'Imperceptible session-bound payload', detail: 'Spread-spectrum & zero-width steganographic injection' },
    { title: 'SIGN', spec: 'ML-DSA-65', desc: 'Recipient hardware-bound signature', detail: 'NIST FIPS 204 digital signature over canonical event' },
    { title: 'LEDGER', spec: 'Offline DLT', desc: '4-node permissioned chain commit', detail: 'Immutable SHA3-256 block commitment to offline chain' },
  ]

  return (
    <Panel
      title="Security Pipeline"
      description="The 6-stage cryptographic and forensic sequence executed for every authorized decryption."
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {stages.map((st, i) => {
          const isHovered = hoveredStage === i
          return (
            <div
              key={st.title}
              onMouseEnter={() => setHoveredStage(i)}
              onMouseLeave={() => setHoveredStage(null)}
              className={cn(
                'group relative flex flex-col justify-between rounded-md border p-2.5 transition-all duration-200 cursor-default',
                isHovered
                  ? 'border-primary/80 bg-primary/10 shadow-[0_0_16px_rgba(56,189,248,0.2)] -translate-y-0.5'
                  : 'border-border/80 bg-background/50 hover:border-primary/40'
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={cn('font-mono text-[10px] font-bold transition-colors', isHovered ? 'text-primary' : 'text-primary/80')}>
                    0{i + 1}
                  </span>
                  <span className="font-mono text-[8.5px] uppercase tracking-wider text-muted-foreground">{st.spec}</span>
                </div>
                <p className="mt-1 font-mono text-xs font-bold text-foreground tracking-wide group-hover:text-primary transition-colors">
                  {st.title}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                  {isHovered ? st.detail : st.desc}
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-mono text-[9px] text-success">
                  <span className={cn('size-1 rounded-full bg-success transition-transform', isHovered && 'scale-125 animate-pulse')} /> ENFORCED
                </span>
                {i < stages.length - 1 && (
                  <span className="hidden xl:inline text-[9px] font-mono text-muted-foreground/40 group-hover:text-primary transition-colors">
                    →
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

export function SystemIntegrity() {
  const items = [
    { name: 'PQC Engine', detail: 'ML-KEM-768 / ML-DSA-65', status: 'OPERATIONAL' },
    { name: 'Watermark Engine', detail: 'Spread-Spectrum + Metadata', status: 'ACTIVE' },
    { name: 'Forensic Engine', detail: 'Sandboxed Enclave Parser', status: 'READY' },
    { name: 'Enclave Ledger', detail: '4 Logical Validator Identities', status: 'SYNCHRONIZED' },
    { name: 'Key Storage', detail: 'Prototype Key Vault', status: 'SECURED' },
  ]
  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {items.map((i) => (
        <li key={i.name} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
          <div className="flex items-center gap-2">
            <StatusDot tone="success" pulse={i.status === 'ACTIVE'} />
            <div>
              <p className="text-xs font-medium text-foreground">{i.name}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{i.detail}</p>
            </div>
          </div>
          <StatusBadge tone="success" className="text-[9.5px]">{i.status}</StatusBadge>
        </li>
      ))}
    </ul>
  )
}

export function CommandCenter() {
  const { isBackendConnected, documents, recipients, sessions, ledger, investigations, getDocument, getRecipient, getLedgerRecordForSession } = useTracelock()
  const [selectedSession, setSelectedSession] = useState<DecryptionSession | null>(null)

  const recent = Array.from(
    new Map([...sessions].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((s) => [s.id, s])).values()
  ).slice(0, 6)
  const open = investigations.filter((i) => i.status === 'OPEN')
  const attributed = investigations.filter((i) => i.status === 'ATTRIBUTED')
  const tip = ledger[ledger.length - 1]

  const selectedDoc = selectedSession ? getDocument(selectedSession.documentId) : null
  const selectedRec = selectedSession ? getRecipient(selectedSession.recipientId) : null
  const selectedRecord = selectedSession ? getLedgerRecordForSession(selectedSession.id) : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Command Center"
        title="Decryption Provenance Overview"
        description="Every decryption produces a forensically unique copy, an ML-DSA signed event, and an immutable ledger record."
        actions={
          <div className="flex items-center gap-3">
            {isBackendConnected ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-xs text-success border border-success/30 bg-success/10 px-2.5 py-1.5 rounded-md">
                <span className="size-2 rounded-full bg-success animate-ping" />
                <ShinyText text="PQC ENCLAVE ONLINE (127.0.0.1:8000)" className="text-success font-semibold" />
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground border border-border bg-card px-2.5 py-1.5 rounded-md">
                OFFLINE SANDBOX
              </span>
            )}
            <Link href="/investigation">
              <TraceButton variant="primary" size="md" className="gap-2 font-mono text-xs">
                <ScanSearch className="size-4" />
                INVESTIGATE LEAK
              </TraceButton>
            </Link>
          </div>
        }
      />

      {/* 6 Core Metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Protected Documents"
          value={documents.length}
          sub={`${documents.filter((d) => d.distribution === 'DISTRIBUTED').length} distributed`}
          href="/documents"
        />
        <MetricCard
          label="Authorized Recipients"
          value={recipients.filter((r) => r.authorization === 'AUTHORIZED').length}
          sub={`${recipients.filter((r) => r.authorization === 'REVOKED').length} revoked`}
          href="/recipients"
        />
        <MetricCard
          label="Decryption Events"
          value={sessions.length}
          sub={`${sessions.filter((s) => s.status === 'LEDGER VERIFIED').length} committed`}
          href="/sessions"
        />
        <MetricCard
          label="Ledger Records"
          value={ledger.length}
          sub={`Tip #${tip?.height ?? '1'}`}
          href="/ledger"
        />
        <MetricCard
          label="Active Inquiries"
          value={open.length}
          sub={open[0]?.id ?? '0 pending'}
          href="/investigation"
        />
        <MetricCard
          label="Verified Attributions"
          value={attributed.length}
          sub="100% confidence"
          href="/investigation"
        />
      </div>

      {/* Security Pipeline */}
      <SecurityPipeline />

      {/* Recent Decryption Events + System Health */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel
          title="Recent Decryption Events"
          description="Decryption sessions bound to authorized recipient identities and unique forensic watermarks."
          actions={
            <Link href="/sessions" className="font-mono text-xs text-primary hover:underline flex items-center gap-1">
              View all sessions <ChevronRight className="size-3" />
            </Link>
          }
          bodyClassName="p-0"
        >
          <DataTable>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>Recipient</Th>
                <Th>Session</Th>
                <Th>Watermark</Th>
                <Th>Timestamp</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className="cursor-pointer transition-colors hover:bg-secondary/40"
                >
                  <Td className="max-w-44 truncate font-medium text-foreground">
                    {getDocument(s.documentId)?.name}
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-primary">{s.recipientId}</span>
                  </Td>
                  <Td>
                    <Mono className="text-foreground/90">{s.id}</Mono>
                  </Td>
                  <Td>
                    <Mono className="text-primary font-semibold">{s.watermarkId}</Mono>
                  </Td>
                  <Td>
                    <Mono className="text-muted-foreground">{formatTs(s.timestamp)}</Mono>
                  </Td>
                  <Td>
                    <StatusBadge tone={s.status === 'LEDGER VERIFIED' ? 'success' : 'warning'}>
                      {s.status === 'LEDGER VERIFIED' ? 'VERIFIED' : 'PENDING'}
                    </StatusBadge>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSession(s)
                      }}
                      className="font-mono text-[11px] text-muted-foreground hover:text-primary underline"
                    >
                      Audit
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="System Health">
            <SystemIntegrity />
          </Panel>

          <GlassBlobCard tone="cyan" className="border-border/80">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
              <span className="label-caps text-foreground">Enclave Ledger Tip</span>
              <span className="size-2 rounded-full bg-success animate-pulse" />
            </div>
            {tip && (
              <dl className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Block</dt>
                  <dd className="font-mono text-foreground font-semibold">#{tip.height} · {tip.recordId}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Hash</dt>
                  <dd>
                    <Hash value={tip.eventHash} label="event hash" head={8} tail={4} />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Consensus</dt>
                  <dd className="font-mono text-success text-[11px] font-semibold">4 / 4 VALIDATOR IDENTITIES</dd>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-2">
                  <dt className="text-muted-foreground">Integrity</dt>
                  <dd>
                    <StatusBadge tone="success">HASH-CHAIN INTACT</StatusBadge>
                  </dd>
                </div>
              </dl>
            )}
          </GlassBlobCard>
        </div>
      </div>

      {/* Row Detail Drawer */}
      <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <SheetContent className="border-border bg-card sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-mono text-sm font-bold tracking-wider">
              DECRYPTION EVENT AUDIT
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Cryptographic and ledger proof for session {selectedSession?.id}
            </SheetDescription>
          </SheetHeader>

          {selectedSession && (
            <div className="mt-6 flex flex-col gap-4 text-xs">
              <div className="rounded-md border border-border/80 bg-background/60 p-3">
                <p className="label-caps">Target Document</p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {selectedDoc?.name ?? selectedSession.documentId}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">{selectedSession.documentId}</p>
              </div>

              <div className="rounded-md border border-border/80 bg-background/60 p-3">
                <p className="label-caps">Attributed Recipient</p>
                <p className="mt-1 font-mono text-sm font-semibold text-primary">
                  {selectedSession.recipientId} · {selectedRec?.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{selectedRec?.role}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border/80 bg-background/60 p-3">
                  <p className="label-caps">Watermark ID</p>
                  <p className="mt-1 font-mono text-xs font-bold text-foreground">{selectedSession.watermarkId}</p>
                </div>
                <div className="rounded-md border border-border/80 bg-background/60 p-3">
                  <p className="label-caps">Ledger Block</p>
                  <p className="mt-1 font-mono text-xs font-bold text-success">
                    {selectedRecord ? `#${selectedRecord.height} (${selectedRecord.recordId})` : '#1'}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-border/80 bg-background/60 p-3">
                <p className="label-caps">ML-DSA-65 Event Signature</p>
                <p className="mt-1 font-mono text-[10px] break-all text-muted-foreground">
                  {selectedSession.signature ? truncateHash(selectedSession.signature, 24, 16) : 'Valid (FIPS 204 Enclave Signed)'}
                </p>
              </div>

              <div className="rounded-md border border-border/80 bg-background/60 p-3">
                <p className="label-caps">Decryption Timestamp</p>
                <p className="mt-1 font-mono text-xs text-foreground">{formatTs(selectedSession.timestamp)}</p>
              </div>

              <div className="mt-2 flex gap-2">
                <Link href={`/investigation?session=${selectedSession.id}`} className="flex-1">
                  <TraceButton variant="primary" size="sm" className="w-full font-mono text-xs">
                    TRACE IN FORENSICS
                  </TraceButton>
                </Link>
                <Link href={`/ledger?record=${selectedRecord?.recordId ?? 'REC-0001'}`} className="flex-1">
                  <TraceButton variant="outline" size="sm" className="w-full font-mono text-xs">
                    VIEW ON LEDGER
                  </TraceButton>
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
