import axios from 'axios'
import { AUTH_TOKEN_KEY } from '../constants/authStorage'

function resolveApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) {
    return configured
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3000/api/v1'
  }

  throw new Error(
    'Missing VITE_API_BASE_URL. Set it for production builds (do not fall back to localhost).',
  )
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type UnauthorizedHandler = (context: { url: string }) => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/** Wired from main.ts after Pinia/router exist (avoids circular imports). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

function isAuthCredentialRequest(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/google')
  )
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = String(error.config?.url ?? '')
      // Failed credential exchange must not clear an existing session or redirect.
      if (!isAuthCredentialRequest(url) && unauthorizedHandler) {
        unauthorizedHandler({ url })
      }
    }
    return Promise.reject(error)
  },
)
