import type { Metadata } from 'next'
import { DocumentsView } from '@/components/tracelock/documents'

export const metadata: Metadata = { title: 'Secure Documents' }

export default function Page() {
  return <DocumentsView />
}
