import { requestJson } from './client'

export interface DecryptRequestPayload {
  document_id: string
  recipient_id: string
  custom_session_id?: string
  custom_watermark_id?: string
}

export interface ApiDecryptionSession {
  session_id: string
  document_id: string
  recipient_id: string
  watermark_id: string
  watermark_hash: string
  document_hash: string
  signature: string
  public_key_fingerprint: string
  ledger_record_id: number
  status: string
  timestamp: string
  watermarked_pdf_download_url?: string
}

export async function executeDecryption(payload: DecryptRequestPayload): Promise<ApiDecryptionSession> {
  return requestJson<ApiDecryptionSession>('/sessions/decrypt', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchSessions(): Promise<ApiDecryptionSession[]> {
  return requestJson<ApiDecryptionSession[]>('/sessions', { method: 'GET' })
}

export async function fetchSession(sessionId: string): Promise<ApiDecryptionSession> {
  return requestJson<ApiDecryptionSession>(`/sessions/${sessionId}`, { method: 'GET' })
}
