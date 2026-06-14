<template>
  <div class="min-h-screen flex bg-dark-50 dark:bg-dark-900">

    <!-- Left panel — branding -->
    <div class="hidden lg:flex lg:w-5/12 bg-primary-600 dark:bg-primary-700 flex-col items-center justify-center p-12 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px); background-size: 40px 40px;" />
      <div class="relative text-center">
        <div class="w-20 h-20 mx-auto mb-8 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
          <span class="text-5xl">🧠</span>
        </div>
        <h1 class="text-3xl font-bold text-white mb-4">Knowledge Assistant</h1>
        <ul class="text-left space-y-3 mt-6">
          <li v-for="feat in features" :key="feat" class="flex items-center gap-3 text-primary-100 text-sm">
            <CheckCircleIcon class="w-5 h-5 text-primary-300 flex-shrink-0" />
            {{ feat }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Right panel — form -->
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md">

        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <div class="w-14 h-14 mx-auto mb-3 bg-primary-600 rounded-2xl flex items-center justify-center">
            <span class="text-3xl">🧠</span>
          </div>
          <h1 class="text-2xl font-bold text-dark-900 dark:text-white">Knowledge Assistant</h1>
        </div>

        <div class="bg-white dark:bg-dark-800 rounded-2xl shadow-sm border border-dark-200 dark:border-dark-700 p-8">
          <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-1">Create your account</h2>
          <p class="text-dark-500 text-sm mb-8">Start for free — no credit card required</p>

          <!-- OAuth -->
          <div class="space-y-3 mb-6">
            <a
              :href="googleAuthUrl"
              class="flex items-center justify-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-xl border border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-200 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
            >
              <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </a>
            <a
              :href="githubAuthUrl"
              class="flex items-center justify-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-xl border border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-200 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
            >
              <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Sign up with GitHub
            </a>
          </div>

          <div class="relative mb-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-dark-200 dark:border-dark-700" />
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="px-3 bg-white dark:bg-dark-800 text-dark-400">or continue with email</span>
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" novalidate class="space-y-5">

            <!-- Server error banner -->
            <div
              v-if="serverError"
              class="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              <ExclamationCircleIcon class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p class="text-sm text-red-700 dark:text-red-400">{{ serverError }}</p>
            </div>

            <!-- Full name -->
            <div>
              <label for="name" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                v-model.trim="form.name"
                type="text"
                autocomplete="name"
                placeholder="Jane Smith"
                :class="['input', errors.name ? 'input-error' : '']"
                @blur="validateField('name')"
                @input="clearError('name')"
              />
              <p v-if="errors.name" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <ExclamationCircleIcon class="w-3.5 h-3.5 flex-shrink-0" />{{ errors.name }}
              </p>
            </div>

            <!-- Email -->
            <div>
              <label for="reg-email" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
                Email address
              </label>
              <input
                id="reg-email"
                v-model.trim="form.email"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                :class="['input', errors.email ? 'input-error' : '']"
                @blur="validateField('email')"
                @input="clearError('email')"
              />
              <p v-if="errors.email" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <ExclamationCircleIcon class="w-3.5 h-3.5 flex-shrink-0" />{{ errors.email }}
              </p>
            </div>

            <!-- Password + strength meter -->
            <div>
              <label for="reg-password" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
                Password
              </label>
              <div class="relative">
                <input
                  id="reg-password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Min. 8 characters"
                  :class="['input pr-10', errors.password ? 'input-error' : '']"
                  @blur="validateField('password')"
                  @input="clearError('password')"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 transition-colors"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                >
                  <EyeSlashIcon v-if="showPassword" class="w-4 h-4" />
                  <EyeIcon v-else class="w-4 h-4" />
                </button>
              </div>

              <!-- Strength bar -->
              <div v-if="form.password" class="mt-2 space-y-1.5">
                <div class="flex gap-1">
                  <div
                    v-for="i in 4"
                    :key="i"
                    :class="['h-1 flex-1 rounded-full transition-all duration-300', i <= passwordStrength.score ? passwordStrength.color : 'bg-dark-200 dark:bg-dark-700']"
                  />
                </div>
                <p :class="['text-xs font-medium', passwordStrength.textColor]">
                  {{ passwordStrength.label }}
                </p>
                <!-- Rules checklist -->
                <ul class="space-y-0.5 mt-2">
                  <li
                    v-for="rule in passwordRules"
                    :key="rule.label"
                    :class="['flex items-center gap-1.5 text-xs transition-colors', rule.passed ? 'text-green-600 dark:text-green-400' : 'text-dark-400']"
                  >
                    <CheckCircleIcon v-if="rule.passed" class="w-3.5 h-3.5 flex-shrink-0" />
                    <XCircleIcon v-else class="w-3.5 h-3.5 flex-shrink-0" />
                    {{ rule.label }}
                  </li>
                </ul>
              </div>
              <p v-if="errors.password" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <ExclamationCircleIcon class="w-3.5 h-3.5 flex-shrink-0" />{{ errors.password }}
              </p>
            </div>

            <!-- Confirm password -->
            <div>
              <label for="confirm-password" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
                Confirm password
              </label>
              <div class="relative">
                <input
                  id="confirm-password"
                  v-model="form.confirmPassword"
                  :type="showConfirm ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Re-enter password"
                  :class="['input pr-10', errors.confirmPassword ? 'input-error' : (form.confirmPassword && form.confirmPassword === form.password ? 'border-green-500 focus:ring-green-500' : '')]"
                  @blur="validateField('confirmPassword')"
                  @input="clearError('confirmPassword')"
                />
                <button
                  type="button"
                  @click="showConfirm = !showConfirm"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 transition-colors"
                  :aria-label="showConfirm ? 'Hide password' : 'Show password'"
                >
                  <EyeSlashIcon v-if="showConfirm" class="w-4 h-4" />
                  <EyeIcon v-else class="w-4 h-4" />
                </button>
                <!-- Match check indicator -->
                <CheckCircleIcon
                  v-if="form.confirmPassword && form.confirmPassword === form.password"
                  class="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none"
                />
              </div>
              <p v-if="errors.confirmPassword" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <ExclamationCircleIcon class="w-3.5 h-3.5 flex-shrink-0" />{{ errors.confirmPassword }}
              </p>
            </div>

            <!-- Terms -->
            <div>
              <label class="flex items-start gap-3 cursor-pointer group">
                <div class="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    v-model="form.terms"
                    class="sr-only"
                  />
                  <div
                    :class="[
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      form.terms
                        ? 'bg-primary-600 border-primary-600'
                        : errors.terms
                          ? 'border-red-500'
                          : 'border-dark-300 dark:border-dark-600 group-hover:border-primary-400'
                    ]"
                  >
                    <CheckIcon v-if="form.terms" class="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <span class="text-sm text-dark-600 dark:text-dark-300 leading-relaxed">
                  I agree to the
                  <a href="#" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium">Terms of Service</a>
                  and
                  <a href="#" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium">Privacy Policy</a>
                </span>
              </label>
              <p v-if="errors.terms" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1 ml-7">
                <ExclamationCircleIcon class="w-3.5 h-3.5 flex-shrink-0" />{{ errors.terms }}
              </p>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="loading"
              class="btn-primary w-full justify-center py-2.5 text-sm"
            >
              <span v-if="loading" class="spinner w-4 h-4 mr-2" />
              {{ loading ? 'Creating account…' : 'Create account' }}
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-dark-500">
            Already have an account?
            <router-link to="/login" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium transition-colors">
              Sign in
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { authService } from '@/services'
import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)
const serverError = ref('')

const form = reactive({ name: '', email: '', password: '', confirmPassword: '', terms: false })
const errors = reactive({ name: '', email: '', password: '', confirmPassword: '', terms: '' })

const googleAuthUrl = authService.getGoogleAuthUrl()
const githubAuthUrl = authService.getGithubAuthUrl()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const features = [
  'Upload PDFs, docs, and web pages',
  'Chat with your sources — answers with citations',
  'Generate study guides, FAQs, and briefings',
  'Organize research in focused notebooks'
]

const passwordRules = computed(() => [
  { label: 'At least 8 characters', passed: form.password.length >= 8 },
  { label: 'One uppercase letter (A–Z)', passed: /[A-Z]/.test(form.password) },
  { label: 'One lowercase letter (a–z)', passed: /[a-z]/.test(form.password) },
  { label: 'One number (0–9)', passed: /[0-9]/.test(form.password) },
  { label: 'One special character (!@#$…)', passed: /[^A-Za-z0-9]/.test(form.password) }
])

const passwordStrength = computed(() => {
  const passed = passwordRules.value.filter(r => r.passed).length
  if (passed <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' }
  if (passed === 2) return { score: 2, label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400' }
  if (passed === 3 || passed === 4) return { score: 3, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' }
  return { score: 4, label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400' }
})

function clearError(field) {
  errors[field] = ''
  serverError.value = ''
}

function validateField(field) {
  if (field === 'name') {
    if (!form.name) errors.name = 'Full name is required.'
    else if (form.name.length < 2) errors.name = 'Name must be at least 2 characters.'
    else errors.name = ''
  }
  if (field === 'email') {
    if (!form.email) errors.email = 'Email address is required.'
    else if (!EMAIL_RE.test(form.email)) errors.email = 'Please enter a valid email address.'
    else errors.email = ''
  }
  if (field === 'password') {
    if (!form.password) errors.password = 'Password is required.'
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
    else errors.password = ''
    // re-validate confirm if already touched
    if (form.confirmPassword) validateField('confirmPassword')
  }
  if (field === 'confirmPassword') {
    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.'
    else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.'
    else errors.confirmPassword = ''
  }
}

function validateAll() {
  validateField('name')
  validateField('email')
  validateField('password')
  validateField('confirmPassword')
  if (!form.terms) errors.terms = 'You must accept the Terms of Service to continue.'
  else errors.terms = ''
  return !errors.name && !errors.email && !errors.password && !errors.confirmPassword && !errors.terms
}

async function handleSubmit() {
  serverError.value = ''
  if (!validateAll()) return

  loading.value = true
  try {
    await authStore.register(form.name, form.email, form.password)
    router.push('/knowledge-bases')
  } catch (err) {
    const msg = err.response?.data?.error || 'Registration failed. Please try again.'
    serverError.value = msg
    if (msg.toLowerCase().includes('email')) errors.email = msg
    form.password = ''
    form.confirmPassword = ''
  } finally {
    loading.value = false
  }
}
</script>
