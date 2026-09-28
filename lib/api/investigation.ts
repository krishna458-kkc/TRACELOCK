import { uploadFile, requestJson } from './client'

export interface ApiEvidenceHop {
  step: number
  title: string
  status: string
  details: string
  cryptographic_proof?: string | null
}

export interface ApiInvestigationReport {
  investigation_id: string
  filename: string
  leaked_doc_hash: string
  overall_status: 'CRYPTOGRAPHICALLY VERIFIED' | 'VERIFICATION FAILED' | string
  watermark_extracted: boolean
  watermark_id?: string | null
  watermark_integrity_valid: boolean
  watermark_layer?: string | null
  attributed_recipient_id?: string | null
  attributed_recipient_name?: string | null
  attributed_recipient_role?: string | null
  session_id?: string | null
  decryption_timestamp?: string | null
  signature_verified: boolean
  signature_algorithm: string
  recipient_dsa_fingerprint?: string | null
  ledger_verified: boolean
  ledger_record_id?: number | null
  ledger_record_hash?: string | null
  ledger_prev_hash?: string | null
  evidence_chain: ApiEvidenceHop[]
  timestamp: string
}

export async function analyzeLeakedDocument(
  file: File,
  investigationId?: string
): Promise<ApiInvestigationReport> {
  const formData = new FormData()
  formData.append('file', file)
  if (investigationId) {
    formData.append('investigation_id', investigationId)
  }
  return uploadFile<ApiInvestigationReport>('/investigation/analyze', formData)
}

export async function fetchInvestigation(investigationId: string): Promise<ApiInvestigationReport> {
  return requestJson<ApiInvestigationReport>(`/investigation/${investigationId}`, { method: 'GET' })
}
