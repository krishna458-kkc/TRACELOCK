import type { Metadata } from 'next'
import { LedgerView } from '@/components/tracelock/ledger'

export const metadata: Metadata = { title: 'Immutable Ledger' }

export default async function Page({ searchParams }: { searchParams: Promise<{ record?: string }> }) {
  const { record } = await searchParams
  const height = record ? Number(record) : undefined
  return <LedgerView key={record ?? 'tip'} initialHeight={Number.isFinite(height) ? height : undefined} />
}
