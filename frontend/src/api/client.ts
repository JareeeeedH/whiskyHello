import axios from 'axios'
import { AUTH_TOKEN_KEY } from '../constants/authStorage'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
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
  return url.includes('/auth/login') || url.includes('/auth/register')
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = String(error.config?.url ?? '')
      // Failed login/register must not clear an existing session or redirect.
      if (!isAuthCredentialRequest(url) && unauthorizedHandler) {
        unauthorizedHandler({ url })
      }
    }
    return Promise.reject(error)
  },
)
