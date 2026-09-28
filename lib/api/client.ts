/**
 * TRACELOCK Base API Client
 * Configurable via NEXT_PUBLIC_API_BASE_URL (defaults to http://127.0.0.1:8000)
 * Air-gapped local execution with robust timeout and error handling.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://127.0.0.1:8000'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 6000
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      let errorDetails: any = null
      try {
        errorDetails = await res.json()
      } catch {
        errorDetails = await res.text()
      }
      throw new ApiError(
        errorDetails?.detail || `API Request failed with status ${res.status}`,
        res.status,
        errorDetails
      )
    }

    return (await res.json()) as T
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request timeout after ${timeoutMs}ms`, 408)
    }
    if (err instanceof ApiError) {
      throw err
    }
    throw new ApiError(err?.message || 'Network connection failed', 0, err)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
  timeoutMs = 15000
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    if (!res.ok) {
      let errorDetails: any = null
      try {
        errorDetails = await res.json()
      } catch {
        errorDetails = await res.text()
      }
      throw new ApiError(
        errorDetails?.detail || `Upload failed with status ${res.status}`,
        res.status,
        errorDetails
      )
    }

    return (await res.json()) as T
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Upload timeout after ${timeoutMs}ms`, 408)
    }
    if (err instanceof ApiError) {
      throw err
    }
    throw new ApiError(err?.message || 'Network upload failed', 0, err)
  } finally {
    clearTimeout(timeoutId)
  }
}
