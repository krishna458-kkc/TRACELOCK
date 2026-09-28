import type { Metadata } from 'next'
import { InvestigationView } from '@/components/tracelock/investigation'

export const metadata: Metadata = { title: 'Forensic Investigation' }

export default async function Page({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session } = await searchParams
  return <InvestigationView key={session ?? 'default'} sessionId={session} />
}
