import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors & token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Check if it's a token expiration
      if (error.response?.data?.code === 'TOKEN_EXPIRED') {
        try {
          const authStore = useAuthStore()
          await authStore.refreshToken()
          
          // Retry original request with new token
          const token = localStorage.getItem('token')
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, logout
          const authStore = useAuthStore()
          authStore.logout()
          router.push({ name: 'login' })
          return Promise.reject(refreshError)
        }
      }
      
      // Other 401 errors - logout
      const authStore = useAuthStore()
      authStore.logout()
      router.push({ name: 'login' })
    }

    return Promise.reject(error)
  }
)

export default api
