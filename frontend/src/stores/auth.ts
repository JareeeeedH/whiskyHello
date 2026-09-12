import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../constants/authStorage'
import {
  fetchCurrentUser,
  loginUser,
  loginWithGoogle as loginWithGoogleApi,
} from '../services/authService'
import type { LoginPayload, PublicUser } from '../types/auth'
import { resolveUserRole } from '../types/auth'

function normalizeUser(raw: PublicUser): PublicUser {
  return {
    ...raw,
    role: resolveUserRole(raw.role),
  }
}

function readStoredUser(): PublicUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) {
    return null
  }

  try {
    return normalizeUser(JSON.parse(raw) as PublicUser)
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(AUTH_TOKEN_KEY))
  const user = ref<PublicUser | null>(readStoredUser())
  const initialized = ref(false)

  let restorePromise: Promise<void> | null = null

  const isAuthenticated = computed(() => Boolean(token.value))
  const isAdmin = computed(
    () => resolveUserRole(user.value?.role) === 'admin',
  )

  function setSession(nextToken: string, nextUser: PublicUser) {
    token.value = nextToken
    user.value = normalizeUser(nextUser)
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user.value))
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  }

  async function login(payload: LoginPayload) {
    const result = await loginUser(payload)
    setSession(result.token, result.user)
    return result
  }

  async function loginWithGoogle(credential: string) {
    const result = await loginWithGoogleApi(credential)
    setSession(result.token, result.user)
    return result
  }

  function logout() {
    clearSession()
  }

  async function restoreSession() {
    if (initialized.value) {
      return
    }

    if (restorePromise) {
      return restorePromise
    }

    restorePromise = (async () => {
      if (!token.value) {
        user.value = null
        initialized.value = true
        return
      }

      try {
        const currentUser = await fetchCurrentUser()
        user.value = normalizeUser(currentUser)
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user.value))
      } catch {
        clearSession()
      } finally {
        initialized.value = true
      }
    })()

    return restorePromise
  }

  return {
    token,
    user,
    initialized,
    isAuthenticated,
    isAdmin,
    setSession,
    clearSession,
    login,
    loginWithGoogle,
    logout,
    restoreSession,
  }
})
