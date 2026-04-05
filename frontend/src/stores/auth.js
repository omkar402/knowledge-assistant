import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services'
import { hashPassword } from '@/utils/crypto'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const refreshTokenValue = ref(localStorage.getItem('refreshToken'))
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function initAuth() {
    if (initialized.value) return
    
    if (token.value) {
      try {
        const response = await authService.getMe()
        user.value = response.user
      } catch (error) {
        // Token invalid, clear it
        logout()
      }
    }
    initialized.value = true
  }

  async function login(email, password) {
    loading.value = true
    try {
      const hashedPassword = await hashPassword(password)
      const response = await authService.login(email, hashedPassword)
      setTokens(response.token, response.refreshToken)
      user.value = response.user
      return response
    } finally {
      loading.value = false
    }
  }

  async function register(name, email, password) {
    loading.value = true
    try {
      const hashedPassword = await hashPassword(password)
      const response = await authService.register(name, email, hashedPassword)
      setTokens(response.token, response.refreshToken)
      user.value = response.user
      return response
    } finally {
      loading.value = false
    }
  }

  async function refreshToken() {
    if (!refreshTokenValue.value) {
      throw new Error('No refresh token')
    }
    
    const response = await authService.refreshToken(refreshTokenValue.value)
    setTokens(response.token, response.refreshToken)
    return response
  }

  function setTokens(accessToken, refresh) {
    token.value = accessToken
    refreshTokenValue.value = refresh
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refresh)
  }

  function handleOAuthCallback(accessToken, refresh) {
    setTokens(accessToken, refresh)
    return initAuth()
  }

  async function logout() {
    try {
      if (token.value) {
        await authService.logout()
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      user.value = null
      token.value = null
      refreshTokenValue.value = null
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
    }
  }

  function updateUser(updates) {
    if (user.value) {
      user.value = { ...user.value, ...updates }
    }
  }

  return {
    user,
    token,
    loading,
    initialized,
    isAuthenticated,
    initAuth,
    login,
    register,
    refreshToken,
    handleOAuthCallback,
    logout,
    updateUser
  }
})
