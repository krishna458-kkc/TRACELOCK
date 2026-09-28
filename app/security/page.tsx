import type { Metadata } from 'next'
import { SecurityView } from '@/components/tracelock/security'

export const metadata: Metadata = { title: 'Security Center' }

export default function Page() {
  return <SecurityView />
}
