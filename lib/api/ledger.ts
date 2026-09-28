import { requestJson } from './client'

export interface ApiLedgerRecord {
  record_id: number
  previous_record_hash: string
  event_hash: string
  event_payload: Record<string, any>
  recipient_id: string
  document_id: string
  session_id: string
  watermark_id: string
  signature: string
  public_key_fingerprint: string
  timestamp: string
  record_hash: string
}

export interface ApiLedgerValidation {
  is_valid: boolean
  status: 'VALID' | 'CORRUPTED' | string
  checked_count: number
  message: string
  errors: string[]
}

export async function fetchLedgerRecords(): Promise<ApiLedgerRecord[]> {
  return requestJson<ApiLedgerRecord[]>('/ledger', { method: 'GET' })
}

export async function fetchLedgerRecord(recordId: number): Promise<ApiLedgerRecord> {
  return requestJson<ApiLedgerRecord>(`/ledger/${recordId}`, { method: 'GET' })
}

export async function validateLedgerChain(): Promise<ApiLedgerValidation> {
  return requestJson<ApiLedgerValidation>('/ledger/validate', { method: 'POST' })
}
