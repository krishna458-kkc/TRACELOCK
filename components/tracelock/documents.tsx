'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileLock2, Info, Send, Shield, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ALGORITHMS, type Classification, type SecureDocument } from '@/lib/data'
import { formatBytes, formatTs, truncateHash } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ClassificationTag, Hash, Mono, PageHeader, StatusBadge, TraceButton, TraceCard } from './primitives'

export function DocumentCard({
  doc,
  onDistribute,
  onInspect,
}: {
  doc: SecureDocument
  onDistribute: (d: SecureDocument) => void
  onInspect: (d: SecureDocument) => void
}) {
  const { sessions } = useTracelock()
  const decryptions = sessions.filter((s) => s.documentId === doc.id)
  const isDemo = doc.id === 'DOC-A71F'
  const fileExt = doc.name.split('.').pop()?.toUpperCase() ?? 'PDF'

  const content = (
    <div className="flex flex-col justify-between h-full p-4">
      <div>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'grid size-10 shrink-0 place-items-center rounded-md border text-primary transition-all duration-200 group-hover:scale-105',
              isDemo ? 'border-primary/50 bg-primary/20 shadow-[0_0_12px_rgba(56,189,248,0.2)]' : 'border-border bg-background/80 group-hover:border-primary/40'
            )}>
              <FileLock2 className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{doc.name}</p>
                <span className="rounded border border-border bg-secondary/80 px-1.5 py-0.2 font-mono text-[9px] font-bold text-muted-foreground">
                  {fileExt}
                </span>
                {isDemo && (
                  <span className="rounded border border-primary/40 bg-primary/15 px-1 py-0.2 font-mono text-[8.5px] font-bold text-primary">
                    CANONICAL
                  </span>
                )}
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">
                {doc.id} · {formatBytes(doc.sizeBytes)} · {doc.pages} pp
              </p>
            </div>
          </div>
          <ClassificationTag value={doc.classification} />
        </div>

        {/* Compact stats grid */}
        <div className="grid grid-cols-2 gap-3 py-3 text-xs border-b border-border/40">
          <div>
            <p className="label-caps">Encryption</p>
            <StatusBadge tone="success" className="mt-1 text-[10px]">ENCRYPTED</StatusBadge>
          </div>
          <div>
            <p className="label-caps">Distribution</p>
            <StatusBadge tone={doc.distribution === 'DISTRIBUTED' ? 'success' : 'warning'} className="mt-1 text-[10px]">
              {doc.distribution}
            </StatusBadge>
          </div>
          <div>
            <p className="label-caps">Recipients</p>
            <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">{doc.recipients.length} keys bound</p>
          </div>
          <div>
            <p className="label-caps">Decryptions</p>
            <p className="mt-0.5 font-mono text-xs font-semibold text-primary">{decryptions.length} sessions logged</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-3 flex items-center justify-between gap-2">
        <TraceButton
          variant={isDemo ? 'primary' : 'secondary'}
          size="sm"
          className="flex-1 font-mono text-xs gap-1.5"
          onClick={() => onDistribute(doc)}
        >
          <Send className="size-3" />
          DISTRIBUTE SECURELY
        </TraceButton>

        <TraceButton
          variant="outline"
          size="sm"
          className="font-mono text-xs px-2.5"
          onClick={() => onInspect(doc)}
          title="Inspect cryptographic proof"
        >
          <Info className="size-3.5" />
        </TraceButton>
      </div>
    </div>
  )

  return (
    <div className="tracelock-gradient-card min-h-[240px] group">
      <div className="tracelock-gradient-inner h-full flex flex-col justify-between bg-card/90">
        {content}
      </div>
    </div>
  )
}

function DocumentDetailDrawer({
  doc,
  open,
  onOpenChange,
}: {
  doc: SecureDocument | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { ledger, recipients } = useTracelock()
  if (!doc) return null

  const relatedRecords = ledger.filter((r) => r.documentId === doc.id)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="border-border bg-card sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-mono text-sm font-bold tracking-wider">
            PROTECTED DOCUMENT DETAILS
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Cryptographic specification and ledger events for {doc.id}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4 text-xs">
          <div className="rounded-md border border-border/80 bg-background/60 p-3">
            <p className="label-caps">Canonical Name & Classification</p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">{doc.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{doc.classification} · {doc.originator}</p>
          </div>

          <div className="rounded-md border border-border/80 bg-background/60 p-3">
            <p className="label-caps">Plaintext SHA3-256 Digest</p>
            <p className="mt-1 font-mono text-[10px] break-all text-primary">{doc.hash}</p>
          </div>

          <div className="rounded-md border border-border/80 bg-background/60 p-3">
            <p className="label-caps">Post-Quantum Cryptographic Envelope</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <dt className="text-muted-foreground">Symmetric Cipher</dt>
                <dd className="font-mono text-foreground">{ALGORITHMS.symmetric}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">KEM Scheme</dt>
                <dd className="font-mono text-foreground">{ALGORITHMS.kem}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Signature Scheme</dt>
                <dd className="font-mono text-foreground">{ALGORITHMS.signature}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hash Algorithm</dt>
                <dd className="font-mono text-foreground">{ALGORITHMS.hash}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-border/80 bg-background/60 p-3">
            <p className="label-caps">Authorized Recipient Tokens</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {doc.recipients.map((rid) => {
                const rec = recipients.find((r) => r.id === rid)
                return (
                  <span
                    key={rid}
                    className="inline-flex items-center gap-1 rounded border border-border bg-secondary/70 px-2 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    <span className="size-1.5 rounded-full bg-success" />
                    {rid} {rec ? `(${rec.name.split(' ')[0]})` : ''}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="rounded-md border border-border/80 bg-background/60 p-3">
            <p className="label-caps">Ledger Chain History ({relatedRecords.length} records)</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {relatedRecords.slice(0, 4).map((rec) => (
                <div key={rec.recordId} className="flex items-center justify-between text-[11px] font-mono border-b border-border/30 pb-1 last:border-0 last:pb-0">
                  <span className="text-foreground">#{rec.height} {rec.type}</span>
                  <span className="text-muted-foreground">{formatTs(rec.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Link href={`/sessions?doc=${doc.id}`} className="w-full">
              <TraceButton variant="outline" size="sm" className="w-full font-mono text-xs">
                VIEW DECRYPTION SESSIONS
              </TraceButton>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const CLASSIFICATIONS: Classification[] = ['TOP SECRET', 'SECRET', 'CONFIDENTIAL', 'RESTRICTED']

function RegisterDocumentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { registerDocument } = useTracelock()
  const [file, setFile] = useState<File | null>(null)
  const [hash, setHash] = useState<string | null>(null)
  const [classification, setClassification] = useState<Classification>('TOP SECRET')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  async function pick(f: File | undefined) {
    if (!f) return
    setFile(f)
    const buf = await f.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buf)
    setHash(Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(''))
  }

  function reset() {
    setFile(null)
    setHash(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="sm:max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-base font-bold">REGISTER DEFENCE DOCUMENT</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Document is ingested, hashed, and pre-encrypted with {ALGORITHMS.symmetric}. Per-recipient key encapsulation uses {ALGORITHMS.kem}.
          </DialogDescription>
        </DialogHeader>

        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pick(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 bg-background/50',
          )}
        >
          <Upload className="size-5 text-primary" />
          <span className="text-xs font-semibold text-foreground">{file ? file.name : 'Select or drop document'}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{file ? formatBytes(file.size) : 'PDF supported'}</span>
          <input type="file" accept=".pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>

        {file && (
          <div className="rounded-md border border-border bg-background/60 p-2.5 text-xs">
            <p className="label-caps">Plaintext SHA-256 Digest</p>
            <p className="mt-1 font-mono text-[10px] break-all text-primary">{hash ?? 'Computing…'}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5 text-xs">
          <label htmlFor="classification" className="label-caps">
            Security Classification
          </label>
          <select
            id="classification"
            value={classification}
            onChange={(e) => setClassification(e.target.value as Classification)}
            className="h-9 rounded-md border border-border bg-background px-3 font-mono text-xs"
          >
            {CLASSIFICATIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <DialogFooter className="gap-2">
          <TraceButton variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </TraceButton>
          <TraceButton
            variant="primary"
            size="sm"
            disabled={!file || !hash || loading}
            loading={loading}
            onClick={async () => {
              if (!file || !hash) return
              setLoading(true)
              try {
                await registerDocument({ name: file.name, sizeBytes: file.size, hash, classification, file })
                onOpenChange(false)
                reset()
              } finally {
                setLoading(false)
              }
            }}
          >
            REGISTER DOCUMENT
          </TraceButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DistributeDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: SecureDocument | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { recipients, distributeDocument } = useTracelock()
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  if (!doc) return null

  const eligible = recipients.filter((r) => r.authorization === 'AUTHORIZED' && !doc.recipients.includes(r.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-base font-bold">DISTRIBUTE SECURELY</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {doc.name} will have its AES-256-GCM content key encapsulated per selected recipient using {ALGORITHMS.kem}.
          </DialogDescription>
        </DialogHeader>

        {eligible.length === 0 ? (
          <p className="rounded-md border border-border bg-background/60 p-3 font-mono text-xs text-muted-foreground">
            All authorized recipients are already provisioned with access to this document.
          </p>
        ) : (
          <ul className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border bg-background/40">
            {eligible.map((r) => {
              const checked = selected.includes(r.id)
              return (
                <li key={r.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-secondary/40">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelected((s) => (checked ? s.filter((x) => x !== r.id) : [...s, r.id]))
                      }
                      className="size-4 accent-[var(--primary)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{r.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {r.id} · {r.role}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-primary">{r.scope}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter className="gap-2">
          <TraceButton variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </TraceButton>
          <TraceButton
            variant="primary"
            size="sm"
            disabled={selected.length === 0 || loading}
            loading={loading}
            onClick={async () => {
              setLoading(true)
              try {
                await distributeDocument(doc.id, selected)
                setSelected([])
                onOpenChange(false)
              } finally {
                setLoading(false)
              }
            }}
            className="gap-1.5 font-mono text-xs"
          >
            <Send className="size-3.5" />
            DISTRIBUTE ({selected.length})
          </TraceButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DocumentsView() {
  const { documents } = useTracelock()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [distributeTarget, setDistributeTarget] = useState<SecureDocument | null>(null)
  const [inspectTarget, setInspectTarget] = useState<SecureDocument | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Secure Documents"
        title="Protected Document Registry"
        description="Encrypted once and distributed to authorized recipients. Each decryption session yields a visually identical but forensically unique copy."
        actions={
          <TraceButton variant="primary" size="md" className="gap-2 font-mono text-xs" onClick={() => setRegisterOpen(true)}>
            <Upload className="size-4" />
            REGISTER DOCUMENT
          </TraceButton>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((d) => (
          <DocumentCard
            key={d.id}
            doc={d}
            onDistribute={(doc) => setDistributeTarget(doc)}
            onInspect={(doc) => setInspectTarget(doc)}
          />
        ))}
      </div>

      <RegisterDocumentDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      <DistributeDialog
        doc={distributeTarget}
        open={!!distributeTarget}
        onOpenChange={(open) => !open && setDistributeTarget(null)}
      />
      <DocumentDetailDrawer
        doc={inspectTarget}
        open={!!inspectTarget}
        onOpenChange={(open) => !open && setInspectTarget(null)}
      />
    </div>
  )
}
