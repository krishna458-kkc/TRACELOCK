import { requestJson } from './client'

export interface ApiRecipient {
  recipient_id: string
  name: string
  role: string
  status: 'ACTIVE' | 'REVOKED' | string
  dsa_fingerprint: string
  kem_fingerprint: string
  dsa_public_key: string
  kem_public_key: string
  created_at: string
  revoked_at?: string | null
}

export interface ApiRecipientIdentity extends ApiRecipient {
  key_type_kem: string
  key_type_dsa: string
  security_level: string
}

export async function fetchRecipients(): Promise<ApiRecipient[]> {
  return requestJson<ApiRecipient[]>('/recipients', { method: 'GET' })
}

export async function fetchRecipient(recipientId: string): Promise<ApiRecipient> {
  return requestJson<ApiRecipient>(`/recipients/${recipientId}`, { method: 'GET' })
}

export async function createRecipient(payload: {
  recipient_id: string
  name: string
  role: string
}): Promise<ApiRecipient> {
  return requestJson<ApiRecipient>('/recipients', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function authorizeRecipient(recipientId: string): Promise<ApiRecipient> {
  return requestJson<ApiRecipient>(`/recipients/${recipientId}/authorize`, {
    method: 'POST',
  })
}

export async function revokeRecipient(recipientId: string): Promise<ApiRecipient> {
  return requestJson<ApiRecipient>(`/recipients/${recipientId}/revoke`, {
    method: 'POST',
  })
}

export async function fetchRecipientIdentity(recipientId: string): Promise<ApiRecipientIdentity> {
  return requestJson<ApiRecipientIdentity>(`/recipients/${recipientId}/identity`, {
    method: 'GET',
  })
}
