import type { Metadata } from 'next'
import { IdentityView } from '@/components/tracelock/identity'

export const metadata: Metadata = { title: 'Cryptographic Identity' }

export default function Page() {
  return <IdentityView />
}
