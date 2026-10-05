import type { Metadata } from 'next'
import { InvestigationView } from '@/components/tracelock/investigation'

export const metadata: Metadata = { title: 'Forensic Investigation' }

export default async function Page({ searchParams }: { searchParams: Promise<{ session?: string; demoSession?: string }> }) {
  const { session, demoSession } = await searchParams
  const target = demoSession || session
  return <InvestigationView key={target ?? 'default'} sessionId={target} />
}
