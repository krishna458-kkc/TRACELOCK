'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Fingerprint, Send } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { ALGORITHMS } from '@/lib/data'
import { formatBytes, formatTs } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { cn } from '@/lib/utils'
import { DistributeDialog } from './documents'
import { EventTimeline } from './event-timeline'
import { ClassificationTag, DataTable, Field, Hash, Mono, Panel, StatusBadge, Td, Th } from './primitives'

export function DocumentDetail({ id }: { id: string }) {
  const { getDocument, getRecipient, sessions, ledger } = useTracelock()
  const [distributeOpen, setDistributeOpen] = useState(false)
  const doc = getDocument(id)

  if (!doc) {
    return (
      <Panel title="Document not found">
        <p className="text-sm text-muted-foreground">
          No protected document with identifier <Mono>{id}</Mono> exists in the local registry.
        </p>
        <Link href="/documents" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}>
          Back to documents
        </Link>
      </Panel>
    )
  }

  const docSessions = sessions.filter((s) => s.documentId === doc.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const docRecords = ledger.filter((r) => r.documentId === doc.id).reverse()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/documents" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Secure Documents
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{doc.name}</h1>
              <ClassificationTag value={doc.classification} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {doc.id} · Originator: {doc.originator} · Registered {formatTs(doc.registered)}
            </p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => setDistributeOpen(true)}>
            <Send className="size-4" />
            Distribute securely
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Document Identity">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Document ID"><Mono>{doc.id}</Mono></Field>
            <Field label="Size / Pages"><Mono>{formatBytes(doc.sizeBytes)} · {doc.pages} pp</Mono></Field>
            <Field label="Distribution"><StatusBadge>{doc.distribution}</StatusBadge></Field>
            <Field label="Integrity"><StatusBadge>INTACT</StatusBadge></Field>
            <Field label="Cryptographic hash (plaintext)" className="col-span-2">
              <Hash value={doc.hash} label="document hash" full />
            </Field>
          </dl>
        </Panel>
        <Panel title="Encryption Metadata">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Content encryption"><Mono>{ALGORITHMS.symmetric}</Mono></Field>
            <Field label="Key establishment"><Mono>{ALGORITHMS.kem} ({ALGORITHMS.kemStandard})</Mono></Field>
            <Field label="Encapsulated keys"><Mono>{doc.recipients.length} (one per recipient)</Mono></Field>
            <Field label="Event signatures"><Mono>{ALGORITHMS.signature} ({ALGORITHMS.signatureStandard})</Mono></Field>
            <Field label="Ciphertext copies"><Mono>1 (shared by all recipients)</Mono></Field>
            <Field label="Watermarking"><Mono>At decryption time, per session</Mono></Field>
          </dl>
        </Panel>
      </div>

      <Panel
        title="Authorized Recipients"
        description="Start a simulated decryption session to see how a recipient-bound, forensically unique copy is produced."
        bodyClassName="p-0"
      >
        {doc.recipients.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Not yet distributed. Use Distribute securely to authorize recipients.</p>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Recipient</Th>
                <Th>Organization / role</Th>
                <Th>Authorization</Th>
                <Th>Decryptions</Th>
                <Th>Last decryption</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {doc.recipients.map((rid) => {
                const r = getRecipient(rid)
                if (!r) return null
                const rs = docSessions.filter((s) => s.recipientId === rid)
                return (
                  <tr key={rid}>
                    <Td>
                      <p className="text-sm">{r.name}</p>
                      <Link href={`/recipients?open=${r.id}`} className="font-mono text-[11px] text-primary hover:underline">
                        {r.id}
                      </Link>
                    </Td>
                    <Td className="text-muted-foreground">{r.organization} · {r.role}</Td>
                    <Td><StatusBadge>{r.authorization}</StatusBadge></Td>
                    <Td><Mono>{rs.length}</Mono></Td>
                    <Td><Mono className="text-muted-foreground">{rs[0] ? formatTs(rs[0].timestamp) : '—'}</Mono></Td>
                    <Td className="text-right">
                      {r.authorization === 'AUTHORIZED' ? (
                        <Link
                          href={`/sessions?doc=${doc.id}&recipient=${r.id}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
                        >
                          <Fingerprint className="size-3.5" />
                          Simulate decryption
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Access revoked</span>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Decryption History & Watermark Events" bodyClassName="p-0">
          <DataTable>
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Recipient</Th>
                <Th>Watermark</Th>
                <Th>Timestamp</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {docSessions.length === 0 && (
                <tr>
                  <Td className="text-muted-foreground">No decryptions recorded.</Td>
                </tr>
              )}
              {docSessions.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={`/sessions/${s.id}`} className="font-mono text-xs text-primary hover:underline">{s.id}</Link>
                  </Td>
                  <Td><Mono>{s.recipientId}</Mono></Td>
                  <Td>
                    <p className="font-mono text-xs">{s.watermarkId}</p>
                    <Hash value={s.watermarkHash} className="text-muted-foreground" copy={false} head={8} tail={4} />
                  </Td>
                  <Td><Mono className="text-muted-foreground">{formatTs(s.timestamp)}</Mono></Td>
                  <Td><StatusBadge>{s.status}</StatusBadge></Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
        <Panel title="Ledger References">
          <EventTimeline records={docRecords} />
        </Panel>
      </div>

      <DistributeDialog doc={doc} open={distributeOpen} onOpenChange={setDistributeOpen} />
    </div>
  )
}
