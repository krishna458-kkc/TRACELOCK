import type { Metadata } from 'next'
import { SessionsView } from '@/components/tracelock/sessions'

export const metadata: Metadata = { title: 'Decryption Sessions' }

export default async function Page({ searchParams }: { searchParams: Promise<{ doc?: string; recipient?: string }> }) {
  const { doc, recipient } = await searchParams
  return <SessionsView key={`${doc ?? ''}-${recipient ?? ''}`} doc={doc} recipient={recipient} />
}
