<template>
  <div class="min-h-screen bg-dark-50 dark:bg-dark-900">
    <!-- Toast notifications -->
    <Teleport to="body">
      <ToastContainer />
    </Teleport>

    <!-- Main router view -->
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import ToastContainer from '@/components/ui/ToastContainer.vue'

const authStore = useAuthStore()
const themeStore = useThemeStore()

onMounted(async () => {
  // Initialize theme
  themeStore.initTheme()
  
  // Try to restore auth session
  await authStore.initAuth()
})
</script>
