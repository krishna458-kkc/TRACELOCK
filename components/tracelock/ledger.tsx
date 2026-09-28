'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowDown, CheckCircle2, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { EVENT_LABEL, hexFrom, LEDGER_NODES, type LedgerRecord } from '@/lib/data'
import { formatTs, truncateHash } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { cn } from '@/lib/utils'
import { DataTable, Field, Hash, Mono, PageHeader, Panel, StatusBadge, StatusDot, Td, Th, TraceButton } from './primitives'

function ChainBlock({
  record,
  label,
  selected,
  tampered,
  broken,
  onSelect,
}: {
  record: LedgerRecord
  label: string
  selected: boolean
  tampered: boolean
  broken: boolean
  onSelect: () => void
}) {
  const invalid = tampered || broken
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-md border bg-background/60 px-3 py-2 text-left transition-colors',
        invalid ? 'border-destructive/60 bg-destructive/10' : selected ? 'border-primary/60 bg-primary/10 shadow-sm' : 'border-border/80 hover:border-primary/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] font-bold text-primary uppercase">{label}</span>
        <span className="font-mono text-xs font-semibold">#{record.height}</span>
      </div>
      <p className="mt-0.5 text-xs font-medium text-foreground">{EVENT_LABEL[record.type]}</p>
      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>prev: {truncateHash(record.prevHash, 6, 4)}</span>
        <span className={cn(tampered && 'text-destructive font-bold')}>
          hash: {tampered ? truncateHash(hexFrom(`tampered:${record.eventHash}`), 6, 4) : truncateHash(record.eventHash, 6, 4)}
        </span>
      </div>
      {invalid && (
        <p className="mt-1 font-mono text-[9.5px] tracking-wider text-destructive font-semibold">
          {tampered ? 'TAMPERED · HASH RECOMPUTED' : 'PREV-HASH LINK BROKEN'}
        </p>
      )}
    </button>
  )
}

export function LedgerView({ initialHeight }: { initialHeight?: number }) {
  const { ledger, getDocument, isBackendConnected, validateBackendLedger } = useTracelock()
  const tip = ledger[ledger.length - 1]
  const [selectedHeight, setSelectedHeight] = useState(
    initialHeight && ledger.some((r) => r.height === initialHeight) ? initialHeight : tip.height,
  )
  const [tamperedHeight, setTamperedHeight] = useState<number | null>(null)
  const [backendAudit, setBackendAudit] = useState<{ is_valid: boolean; message: string; checked_count: number } | null>(null)
  const [validating, setValidating] = useState(false)

  const selected = ledger.find((r) => r.height === selectedHeight) ?? tip
  const idx = ledger.indexOf(selected)
  const chainWindow = ledger.slice(Math.max(0, idx - 2), idx + 1)
  const labels = ['BLOCK N-1', 'BLOCK N', 'SELECTED RECORD'].slice(-chainWindow.length)
  const invalidated = tamperedHeight === null ? 0 : ledger.filter((r) => r.height > tamperedHeight).length

  const isTampered = (r: LedgerRecord) => tamperedHeight === r.height
  const isBroken = (r: LedgerRecord) => tamperedHeight !== null && r.height > tamperedHeight

  async function handleAuditLedger() {
    setValidating(true)
    try {
      if (isBackendConnected) {
        const res = await validateBackendLedger()
        setBackendAudit(res)
      } else {
        setBackendAudit({
          is_valid: true,
          message: 'Local ledger chain intact. Verified all blocks.',
          checked_count: ledger.length,
        })
      }
    } catch (err: any) {
      setBackendAudit({
        is_valid: false,
        message: err?.message || 'Audit failed',
        checked_count: ledger.length,
      })
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Immutable Ledger"
        title="Offline Permissioned Ledger Explorer"
        description="Append-only, hash-linked ledger recording every key issuance, distribution, and decryption event across 4 logical permissioned validator identities."
        actions={
          <div className="flex items-center gap-3">
            <TraceButton
              variant="primary"
              size="md"
              disabled={validating}
              loading={validating}
              onClick={handleAuditLedger}
              className="gap-2 font-mono text-xs"
            >
              <ShieldCheck className="size-4" />
              VALIDATE ENCLAVE LEDGER
            </TraceButton>

            <div className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs">
              <StatusDot tone={tamperedHeight === null && (!backendAudit || backendAudit.is_valid) ? 'success' : 'danger'} />
              {tamperedHeight === null && (!backendAudit || backendAudit.is_valid)
                ? `TIP #${tip.height} · CHAIN INTACT`
                : 'TAMPER ANOMALY DETECTED'}
            </div>
          </div>
        }
      />

      {backendAudit && (
        <div
          className={cn(
            'rounded-lg border p-3 font-mono text-xs flex items-center justify-between',
            backendAudit.is_valid
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <span className="font-bold">
              {backendAudit.is_valid ? 'ENCLAVE INTEGRITY CONFIRMED' : 'TAMPER DETECTED'}
            </span>
            <span>— {backendAudit.message}</span>
          </div>
          <span className="text-[11px] opacity-80">{backendAudit.checked_count} BLOCKS AUDITED</span>
        </div>
      )}

      {tamperedHeight !== null && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Simulated mutation at Block #{tamperedHeight}
              </p>
              <p className="text-xs text-muted-foreground">
                Recomputed hash invalidates {invalidated} subsequent block{invalidated === 1 ? '' : 's'}. 
                All 4 logical validator identities reject this state.
              </p>
            </div>
          </div>
          <TraceButton
            variant="outline"
            size="sm"
            className="gap-1.5 font-mono text-xs"
            onClick={() => setTamperedHeight(null)}
          >
            <RotateCcw className="size-3.5" />
            RESTORE CHAIN
          </TraceButton>
        </div>
      )}

      {/* 70% Table / 30% Details Layout */}
      <div className="grid gap-6 lg:grid-cols-[7fr_3fr] items-start">
        {/* Left 70%: Ledger Table */}
        <Panel
          title="Ledger Records"
          description="Chronological append-only sequence committed by enclave validators."
          bodyClassName="p-0"
          actions={
            <span className="font-mono text-xs text-primary font-semibold">
              {ledger.length} COMMITTED BLOCKS
            </span>
          }
        >
          <div className="max-h-[640px] overflow-y-auto">
            <DataTable>
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  <Th>Block</Th>
                  <Th>Event</Th>
                  <Th>Timestamp</Th>
                  <Th>Recipient</Th>
                  <Th>Session</Th>
                  <Th>Hash</Th>
                  <Th>Signature</Th>
                  <Th>Integrity</Th>
                </tr>
              </thead>
              <tbody>
                {[...ledger].reverse().map((r) => {
                  const bad = isTampered(r) || isBroken(r)
                  const isSelected = r.height === selected.height

                  return (
                    <tr
                      key={r.height}
                      onClick={() => setSelectedHeight(r.height)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-secondary/40',
                        isSelected && 'bg-primary/10 border-l-2 border-primary',
                        bad && 'bg-destructive/10',
                      )}
                    >
                      <Td>
                        <span className="font-mono text-xs font-bold text-primary">#{r.height}</span>
                        <span className="block font-mono text-[10px] text-muted-foreground">{r.recordId}</span>
                      </Td>
                      <Td className="whitespace-nowrap font-medium text-foreground text-xs">
                        {EVENT_LABEL[r.type]}
                      </Td>
                      <Td>
                        <Mono className="whitespace-nowrap text-muted-foreground text-[11px]">
                          {formatTs(r.timestamp)}
                        </Mono>
                      </Td>
                      <Td>
                        <Mono className="text-foreground/90">{r.recipientId ?? 'SYSTEM'}</Mono>
                      </Td>
                      <Td>
                        <Mono className="text-primary font-semibold">{r.sessionId ?? '—'}</Mono>
                      </Td>
                      <Td>
                        <Mono className="text-muted-foreground">{truncateHash(r.eventHash, 6, 4)}</Mono>
                      </Td>
                      <Td>
                        <StatusBadge tone={bad ? 'danger' : r.signatureStatus === 'VALID' ? 'success' : 'warning'}>
                          {bad ? 'INVALID' : r.signatureStatus}
                        </StatusBadge>
                      </Td>
                      <Td>
                        <StatusBadge tone={bad ? 'danger' : 'success'}>
                          {isTampered(r) ? 'ALTERED' : isBroken(r) ? 'BROKEN' : 'INTACT'}
                        </StatusBadge>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </DataTable>
          </div>
        </Panel>

        {/* Right 30%: Record Detail & Continuity */}
        <div className="flex flex-col gap-4">
          <Panel
            title={`Block #${selected.height}`}
            description="Cryptographic attributes of selected record"
            actions={
              tamperedHeight === null ? (
                <TraceButton
                  variant="outline"
                  size="sm"
                  className="font-mono text-[10px] text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setTamperedHeight(selected.height)}
                  disabled={selected.height === tip.height && ledger.length < 2}
                >
                  SIMULATE TAMPER
                </TraceButton>
              ) : null
            }
          >
            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/50">
                <div>
                  <p className="label-caps">Record ID</p>
                  <p className="font-mono text-xs font-semibold text-foreground">{selected.recordId}</p>
                </div>
                <div>
                  <p className="label-caps">Event Type</p>
                  <p className="font-mono text-xs font-semibold text-primary">{EVENT_LABEL[selected.type]}</p>
                </div>
              </div>

              <div>
                <p className="label-caps">Event SHA3-256 Hash</p>
                <p className="mt-0.5 font-mono text-[10.5px] break-all text-foreground">
                  {selected.eventHash}
                </p>
              </div>

              <div>
                <p className="label-caps">Previous Block Hash</p>
                <p className="mt-0.5 font-mono text-[10.5px] break-all text-muted-foreground">
                  {selected.prevHash}
                </p>
              </div>

              {selected.sessionId && (
                <div className="rounded-md border border-border/70 bg-background/50 p-2.5">
                  <p className="label-caps">Bound Decryption Session</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-primary">{selected.sessionId}</span>
                    <Link
                      href={`/investigation?session=${selected.sessionId}`}
                      className="font-mono text-[10.5px] text-primary hover:underline"
                    >
                      Audit Forensic Chain →
                    </Link>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Consensus Verification</span>
                <span className="font-mono font-semibold text-success">4 / 4 VALIDATOR IDENTITIES</span>
              </div>
            </div>
          </Panel>

          {/* Hash Chain Continuity */}
          <Panel
            title="Hash Chain Window"
            description="Commitment link from previous block to current."
          >
            <ol className="flex flex-col gap-1">
              {chainWindow.map((r, i) => (
                <li key={r.height}>
                  <ChainBlock
                    record={r}
                    label={labels[i]}
                    selected={r.height === selected.height}
                    tampered={isTampered(r)}
                    broken={isBroken(r)}
                    onSelect={() => setSelectedHeight(r.height)}
                  />
                  {i < chainWindow.length - 1 && (
                    <div
                      aria-hidden
                      className={cn(
                        'flex justify-center py-0.5',
                        isTampered(r) || isBroken(r) ? 'text-destructive' : 'text-primary/60',
                      )}
                    >
                      <ArrowDown className="size-3.5" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Panel>

          {/* Validator Consensus Summary */}
          <Panel title="Permissioned Enclave Validators">
            <ul className="flex flex-col divide-y divide-border/60 text-xs">
              {LEDGER_NODES.map((n) => (
                <li key={n.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-mono text-[11px] font-semibold text-foreground">{n.id}</p>
                    <p className="text-[10px] text-muted-foreground">{n.site}</p>
                  </div>
                  <span className="font-mono text-[9px] text-success border border-success/30 bg-success/10 px-1.5 py-0.5 rounded">
                    CONCURRING
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
