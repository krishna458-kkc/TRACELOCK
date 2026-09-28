'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { formatTs } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { cn } from '@/lib/utils'
import { DecryptionSimulator } from './decryption-simulator'
import { DataTable, Hash, Mono, PageHeader, Panel, StatusBadge, Td, Th } from './primitives'
import { SessionRecord } from './session-record'

export function SessionsView({ doc, recipient }: { doc?: string; recipient?: string }) {
  const { sessions, getDocument, getLedgerRecordForSession } = useTracelock()
  const [recipientFilter, setRecipientFilter] = useState(recipient)
  const rows = sessions
    .filter((s) => !recipientFilter || s.recipientId === recipientFilter)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Decryption Sessions"
        title="Recipient-bound decryption provenance"
        description="Each decryption runs through eight stages. The output is a copy that looks identical to every other recipient's copy, but carries a unique invisible watermark bound to a signed, immutable ledger record."
      />

      <DecryptionSimulator initialDoc={doc} initialRecipient={recipient} />

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
