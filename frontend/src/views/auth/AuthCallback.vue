<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="spinner w-8 h-8 mx-auto mb-4"></div>
      <p class="text-dark-600 dark:text-dark-400">Completing authentication...</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore, useToastStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()

onMounted(async () => {
  const { token, refreshToken, error } = route.query

  if (error) {
    toastStore.error('Authentication failed. Please try again.')
    router.push('/login')
    return
  }

  if (token && refreshToken) {
    try {
      await authStore.handleOAuthCallback(token, refreshToken)
      toastStore.success('Welcome!')
      router.push('/')
    } catch (err) {
      toastStore.error('Authentication failed. Please try again.')
      router.push('/login')
    }
  } else {
    toastStore.error('Invalid authentication response.')
    router.push('/login')
  }
})
</script>
