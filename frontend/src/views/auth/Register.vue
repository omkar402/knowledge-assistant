<template>
  <div class="min-h-screen flex">
    <!-- Left side - Illustration -->
    <div class="hidden lg:flex lg:w-1/2 bg-primary-600 items-center justify-center p-12">
      <div class="max-w-md text-center">
        <div class="w-24 h-24 mx-auto mb-8 bg-white/20 rounded-2xl flex items-center justify-center">
          <span class="text-5xl">🚀</span>
        </div>
        <h1 class="text-3xl font-bold text-white mb-4">
          Start Your Journey
        </h1>
        <p class="text-primary-100 text-lg">
          Join thousands of researchers and knowledge workers who trust Knowledge Assistant.
        </p>
      </div>
    </div>

    <!-- Right side - Register form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8">
      <div class="w-full max-w-md">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <div class="w-16 h-16 mx-auto mb-4 bg-primary-600 rounded-2xl flex items-center justify-center">
            <span class="text-3xl">🚀</span>
          </div>
          <h1 class="text-2xl font-bold text-dark-900 dark:text-white">
            Knowledge Assistant
          </h1>
        </div>

        <div class="card p-8">
          <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-2">
            Create an account
          </h2>
          <p class="text-dark-500 mb-8">
            Start your free trial today
          </p>

          <!-- OAuth buttons -->
          <!-- <div class="space-y-3 mb-6">
            <a 
              :href="googleAuthUrl"
              class="btn-secondary w-full justify-center gap-3"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </a>

            <a 
              :href="githubAuthUrl"
              class="btn-secondary w-full justify-center gap-3"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Sign up with GitHub
            </a>
          </div>

          <div class="relative mb-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-dark-200 dark:border-dark-700"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-dark-800 text-dark-500">
                or continue with email
              </span>
            </div>
          </div> -->

          <!-- Email/Password form -->
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <Input
              v-model="form.name"
              type="text"
              label="Full Name"
              placeholder="John Doe"
              :error="errors.name"
              required
            />

            <Input
              v-model="form.email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              :error="errors.email"
              required
            />

            <Input
              v-model="form.password"
              type="password"
              label="Password"
              placeholder="••••••••"
              hint="At least 6 characters"
              :error="errors.password"
              required
            />

            <Input
              v-model="form.confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              :error="errors.confirmPassword"
              required
            />

            <div class="flex items-start gap-2">
              <input 
                type="checkbox" 
                v-model="form.terms" 
                id="terms"
                class="mt-1 rounded border-dark-300"
                required
              >
              <label for="terms" class="text-sm text-dark-600 dark:text-dark-400">
                I agree to the 
                <a href="#" class="text-primary-600 hover:text-primary-500">Terms of Service</a>
                and
                <a href="#" class="text-primary-600 hover:text-primary-500">Privacy Policy</a>
              </label>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              class="w-full justify-center"
              :loading="loading"
            >
              Create account
            </Button>
          </form>

          <p class="mt-6 text-center text-sm text-dark-500">
            Already have an account?
            <router-link to="/login" class="text-primary-600 hover:text-primary-500 font-medium">
              Sign in
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useToastStore } from '@/stores'
import { authService } from '@/services'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()

const loading = ref(false)
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  terms: false
})
const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const googleAuthUrl = authService.getGoogleAuthUrl()
const githubAuthUrl = authService.getGithubAuthUrl()

async function handleSubmit() {
  // Reset errors
  Object.keys(errors).forEach(key => errors[key] = '')

  // Validate
  let hasErrors = false

  if (!form.name) {
    errors.name = 'Name is required'
    hasErrors = true
  }
  if (!form.email) {
    errors.email = 'Email is required'
    hasErrors = true
  }
  if (!form.password) {
    errors.password = 'Password is required'
    hasErrors = true
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
    hasErrors = true
  }
  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
    hasErrors = true
  }
  if (!form.terms) {
    toastStore.error('Please accept the terms of service')
    hasErrors = true
  }

  if (hasErrors) return

  loading.value = true

  try {
    await authStore.register(form.name, form.email, form.password)
    toastStore.success('Account created successfully!')
    router.push('/')
  } catch (error) {
    const message = error.response?.data?.error || 'Registration failed. Please try again.'
    toastStore.error(message)
    
    if (message.toLowerCase().includes('email')) {
      errors.email = message
    }
  } finally {
    loading.value = false
  }
}
</script>
