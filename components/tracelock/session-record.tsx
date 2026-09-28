'use client'

import Link from 'next/link'
import { ALGORITHMS, type DecryptionSession } from '@/lib/data'
import { formatTs } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { Field, Hash, Mono, StatusBadge } from './primitives'

export function SessionRecord({ session }: { session: DecryptionSession }) {
  const { getDocument, getRecipient, getLedgerRecordForSession } = useTracelock()
  const doc = getDocument(session.documentId)
  const recipient = getRecipient(session.recipientId)
  const record = getLedgerRecordForSession(session.id)

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
      <Field label="Document ID">
        <Link href={`/documents/${session.documentId}`} className="font-mono text-xs text-primary hover:underline">
          {session.documentId}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{doc?.name}</p>
      </Field>
      <Field label="Recipient ID">
        <Link href={`/recipients?open=${session.recipientId}`} className="font-mono text-xs text-primary hover:underline">
          {session.recipientId}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{recipient?.name}</p>
      </Field>
      <Field label="Session ID"><Mono>{session.id}</Mono></Field>
      <Field label="Timestamp"><Mono>{formatTs(session.timestamp)}</Mono></Field>
      <Field label="Watermark ID"><Mono>{session.watermarkId}</Mono></Field>
      <Field label="Watermark hash"><Hash value={session.watermarkHash} label="watermark hash" /></Field>
      <Field label="Signature algorithm">
        <Mono>{ALGORITHMS.signature}</Mono>
        <p className="text-xs text-muted-foreground">{ALGORITHMS.signatureStandard} · recipient key</p>
      </Field>
      <Field label="Signature verification"><StatusBadge>{session.signatureStatus}</StatusBadge></Field>
      <Field label="Integrity status">
        <StatusBadge>{record ? 'INTACT' : 'PENDING VERIFICATION'}</StatusBadge>
      </Field>
      <Field label="Ledger transaction ID">
        {record ? <Mono>{record.recordId}</Mono> : <span className="text-xs text-muted-foreground">Awaiting commit</span>}
      </Field>
      <Field label="Ledger block / reference">
        {record ? (
          <Link href={`/ledger?record=${record.height}`} className="font-mono text-xs text-primary hover:underline">
            #{record.height}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </Field>
      <Field label="Session fingerprint"><Hash value={session.sessionFingerprint} label="session fingerprint" /></Field>
      <Field label="Event signature" className="col-span-2 md:col-span-3">
        <p className="rounded-md border border-border bg-background p-2.5 font-mono text-[11px] break-all text-muted-foreground">
          {session.signature}
        </p>
      </Field>
    </dl>
  )
}
