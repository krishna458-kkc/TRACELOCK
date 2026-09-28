import type { Metadata } from 'next'
import { RecipientsView } from '@/components/tracelock/recipients'

export const metadata: Metadata = { title: 'Recipients' }

export default async function Page({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams
  return <RecipientsView initialOpen={open} />
}
