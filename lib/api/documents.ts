import { requestJson, uploadFile, API_BASE_URL } from './client'

export interface ApiDocument {
  document_id: string
  filename: string
  content_type: string
  document_hash: string
  is_encrypted: boolean
  authorized_recipients: string[]
  created_at: string
}

export interface EncryptDocumentResponse {
  document_id: string
  is_encrypted: boolean
  authorized_recipients: string[]
  document_hash: string
  content_cipher: string
  pqc_kem_algorithm: string
  recipient_encapsulations_count: number
}

export async function fetchDocuments(): Promise<ApiDocument[]> {
  return requestJson<ApiDocument[]>('/documents', { method: 'GET' })
}

export async function fetchDocument(documentId: string): Promise<ApiDocument> {
  return requestJson<ApiDocument>(`/documents/${documentId}`, { method: 'GET' })
}

export async function uploadDocument(file: File, documentId?: string): Promise<ApiDocument> {
  const formData = new FormData()
  formData.append('file', file)
  if (documentId) {
    formData.append('document_id', documentId)
  }
  return uploadFile<ApiDocument>('/documents', formData)
}

export async function encryptDocument(
  documentId: string,
  recipientIds: string[]
): Promise<EncryptDocumentResponse> {
  return requestJson<EncryptDocumentResponse>(`/documents/${documentId}/encrypt`, {
    method: 'POST',
    body: JSON.stringify({ recipient_ids: recipientIds }),
  })
}

export function getDocumentDownloadUrl(filename: string): string {
  return `${API_BASE_URL}/documents/download/${filename}`
}
