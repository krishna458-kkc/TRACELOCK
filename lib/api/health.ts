import { requestJson } from './client'

export interface HealthResponse {
  status: string
  system: string
  version: string
  air_gapped_enclave: boolean
  cloud_kms_dependency: boolean
  public_blockchain_dependency: boolean
  crypto_algorithms: {
    key_establishment: string
    digital_signatures: string
    content_cipher: string
    cryptographic_hash: string
  }
  ledger_blocks_committed: number
  timestamp: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/health', { method: 'GET' }, 2000)
}
