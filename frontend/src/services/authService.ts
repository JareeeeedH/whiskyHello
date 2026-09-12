import axios from 'axios'
import { apiClient } from '../api/client'
import type {
  LoginPayload,
  LoginResponse,
  MeResponse,
  PublicUser,
  RegisterPayload,
  RegisterResponse,
} from '../types/auth'

export class AuthApiError extends Error {
  readonly status: number
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
    this.details = details
  }
}

function toAuthApiError(error: unknown, fallbackMessage: string): AuthApiError {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status
    const body = error.response.data as {
      message?: string
      details?: string[]
    }

    if (status === 409) {
      return new AuthApiError(
        409,
        body.message ?? '此 Email 已被註冊',
      )
    }

    if (status === 401) {
      return new AuthApiError(
        401,
        body.message ?? 'Email 或密碼錯誤',
      )
    }

    if (status === 503) {
      return new AuthApiError(
        503,
        body.message ?? 'Google 登入暫時無法使用',
      )
    }

    if (status === 400) {
      return new AuthApiError(
        400,
        body.message ?? '資料驗證失敗',
        body.details ?? [],
      )
    }

    return new AuthApiError(status, body.message ?? fallbackMessage)
  }

  return new AuthApiError(0, '無法連線到伺服器，請稍後再試')
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  try {
    const { data } = await apiClient.post<RegisterResponse>(
      '/auth/register',
      payload,
    )
    return data
  } catch (error) {
    throw toAuthApiError(error, '註冊失敗，請稍後再試')
  }
}

export async function loginUser(
  payload: LoginPayload,
): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<LoginResponse>(
      '/auth/login',
      payload,
    )
    return data
  } catch (error) {
    throw toAuthApiError(error, '登入失敗，請稍後再試')
  }
}

export async function loginWithGoogle(
  credential: string,
): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<LoginResponse>('/auth/google', {
      credential,
    })
    return data
  } catch (error) {
    throw toAuthApiError(error, 'Google 登入失敗，請稍後再試')
  }
}

export async function fetchCurrentUser(): Promise<PublicUser> {
  try {
    const { data } = await apiClient.get<MeResponse>('/auth/me')
    return data.user
  } catch (error) {
    throw toAuthApiError(error, '無法取得登入狀態')
  }
}
