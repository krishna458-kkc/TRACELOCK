import Link from 'next/link'
import { EVENT_LABEL, type LedgerRecord } from '@/lib/data'
import { formatTs, truncateHash } from '@/lib/format'
import { cn } from '@/lib/utils'

const DOT: Record<LedgerRecord['type'], string> = {
  DOCUMENT_REGISTERED: 'bg-muted-foreground',
  DOCUMENT_DISTRIBUTED: 'bg-primary',
  RECIPIENT_AUTHORIZED: 'bg-primary',
  KEY_REVOKED: 'bg-destructive',
  DECRYPTION_EVENT: 'bg-success',
}

export function EventTimeline({ records, empty = 'No ledger events.' }: { records: LedgerRecord[]; empty?: string }) {
  if (records.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
      {records.map((r) => (
        <li key={r.recordId} className="relative">
          <span aria-hidden className={cn('absolute top-1.5 -left-[24.5px] size-2 rounded-full ring-4 ring-card', DOT[r.type])} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-sm">
              {EVENT_LABEL[r.type]}
              {r.recipientId && <span className="font-mono text-xs text-muted-foreground"> · {r.recipientId}</span>}
              {r.sessionId && (
                <>
                  {' · '}
                  <Link href={`/sessions/${r.sessionId}`} className="font-mono text-xs text-primary hover:underline">
                    {r.sessionId}
                  </Link>
                </>
              )}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">{formatTs(r.timestamp)}</p>
          </div>
          <Link href={`/ledger?record=${r.height}`} className="font-mono text-[11px] text-muted-foreground hover:text-primary">
            #{r.height} · {r.recordId} · {truncateHash(r.eventHash, 12, 6)}
          </Link>
        </li>
      ))}
    </ol>
  )
}
