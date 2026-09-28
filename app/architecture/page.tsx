import type { Metadata } from 'next'
import { ArchitectureView } from '@/components/tracelock/architecture'

export const metadata: Metadata = { title: 'System Architecture' }

export default function Page() {
  return <ArchitectureView />
}
