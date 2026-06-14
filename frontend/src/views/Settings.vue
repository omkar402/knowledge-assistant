<template>
  <div class="min-h-full bg-dark-50 dark:bg-dark-900">
    <div class="max-w-3xl mx-auto px-6 py-10">

      <!-- Page header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-dark-900 dark:text-white">Settings</h1>
        <p class="text-dark-500 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div class="flex gap-8">

        <!-- Tab sidebar -->
        <nav class="w-44 flex-shrink-0 space-y-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
              activeTab === tab.id
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800 hover:text-dark-900 dark:hover:text-white'
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4 flex-shrink-0" />
            {{ tab.label }}
          </button>
        </nav>

        <!-- Tab content -->
        <div class="flex-1 min-w-0">

          <!-- ── PROFILE ── -->
          <section v-if="activeTab === 'profile'" class="space-y-6">
            <div class="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-6">
              <h2 class="text-base font-semibold text-dark-900 dark:text-white mb-5">Profile information</h2>
              <form @submit.prevent="saveProfile" novalidate class="space-y-5">

                <!-- Avatar preview -->
                <div class="flex items-center gap-4 mb-2">
                  <div class="relative">
                    <img
                      v-if="profile.avatar && isValidUrl(profile.avatar)"
                      :src="profile.avatar"
                      :alt="profile.name"
                      class="w-16 h-16 rounded-full object-cover ring-2 ring-dark-200 dark:ring-dark-700"
                    />
                    <div
                      v-else
                      class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center ring-2 ring-dark-200 dark:ring-dark-700"
                    >
                      <span class="text-primary-700 dark:text-primary-300 font-bold text-xl">
                        {{ initials(profile.name) }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-dark-900 dark:text-white">{{ profile.name || 'Your name' }}</p>
                    <p class="text-xs text-dark-400">{{ authStore.user?.email }}</p>
                  </div>
                </div>

                <!-- Name -->
                <div>
                  <label for="profile-name" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">Full name</label>
                  <input
                    id="profile-name"
                    v-model.trim="profile.name"
                    type="text"
                    autocomplete="name"
                    placeholder="Jane Smith"
                    :class="['input', profileErrors.name ? 'input-error' : '']"
                    @blur="validateProfileField('name')"
                    @input="profileErrors.name = ''"
                  />
                  <p v-if="profileErrors.name" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ExclamationCircleIcon class="w-3.5 h-3.5" />{{ profileErrors.name }}
                  </p>
                </div>

                <!-- Avatar URL -->
                <div>
                  <label for="avatar-url" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
                    Avatar URL <span class="font-normal text-dark-400">(optional)</span>
                  </label>
                  <input
                    id="avatar-url"
                    v-model.trim="profile.avatar"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    :class="['input', profileErrors.avatar ? 'input-error' : '']"
                    @blur="validateProfileField('avatar')"
                    @input="profileErrors.avatar = ''"
                  />
                  <p v-if="profileErrors.avatar" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ExclamationCircleIcon class="w-3.5 h-3.5" />{{ profileErrors.avatar }}
                  </p>
                  <p v-else class="mt-1.5 text-xs text-dark-400">Must be a publicly accessible image URL.</p>
                </div>

                <div class="flex items-center justify-between pt-1">
                  <span v-if="profileSaved" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <CheckCircleIcon class="w-4 h-4" /> Saved
                  </span>
                  <div v-else />
                  <button type="submit" :disabled="profileLoading" class="btn-primary">
                    <span v-if="profileLoading" class="spinner w-4 h-4 mr-2" />
                    {{ profileLoading ? 'Saving…' : 'Save changes' }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Danger zone -->
            <div class="bg-white dark:bg-dark-800 rounded-2xl border border-red-200 dark:border-red-900/50 p-6">
              <h2 class="text-base font-semibold text-red-700 dark:text-red-400 mb-1">Danger zone</h2>
              <p class="text-sm text-dark-500 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
              <button @click="showDeleteModal = true" class="btn-danger text-sm">Delete account</button>
            </div>
          </section>

          <!-- ── PREFERENCES ── -->
          <section v-else-if="activeTab === 'preferences'" class="space-y-6">
            <div class="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-6">
              <h2 class="text-base font-semibold text-dark-900 dark:text-white mb-5">Appearance</h2>
              <p class="text-sm font-medium text-dark-700 dark:text-dark-300 mb-3">Theme</p>
              <div class="grid grid-cols-3 gap-3">
                <button
                  v-for="opt in themeOptions"
                  :key="opt.value"
                  @click="themeStore.setTheme(opt.value)"
                  :class="[
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    themeStore.theme === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-dark-200 dark:border-dark-700 hover:border-dark-300 dark:hover:border-dark-600'
                  ]"
                >
                  <component :is="opt.icon" :class="['w-5 h-5', themeStore.theme === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-dark-500']" />
                  <span :class="['text-xs font-medium', themeStore.theme === opt.value ? 'text-primary-700 dark:text-primary-400' : 'text-dark-600 dark:text-dark-400']">
                    {{ opt.label }}
                  </span>
                  <div v-if="themeStore.theme === opt.value" class="w-1.5 h-1.5 rounded-full bg-primary-500" />
                </button>
              </div>
            </div>

            <div class="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-6">
              <h2 class="text-base font-semibold text-dark-900 dark:text-white mb-5">Language</h2>
              <div>
                <label for="output-lang" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">Output language</label>
                <select id="output-lang" v-model="preferences.language" class="input">
                  <option v-for="lang in languages" :key="lang.code" :value="lang.code">{{ lang.label }}</option>
                </select>
                <p class="mt-1.5 text-xs text-dark-400">Used for AI-generated content (Study Guides, FAQs, etc.)</p>
              </div>
              <div class="flex justify-end mt-5">
                <button @click="savePreferences" :disabled="prefLoading" class="btn-primary">
                  <span v-if="prefLoading" class="spinner w-4 h-4 mr-2" />
                  {{ prefLoading ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </div>
          </section>

          <!-- ── SECURITY ── -->
          <section v-else-if="activeTab === 'security'">
            <div class="bg-white dark:bg-dark-800 rounded-2xl border border-dark-200 dark:border-dark-700 p-6">
              <h2 class="text-base font-semibold text-dark-900 dark:text-white mb-5">Change password</h2>
              <form @submit.prevent="changePassword" novalidate class="space-y-5">

                <div v-if="securityError" class="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <ExclamationCircleIcon class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p class="text-sm text-red-700 dark:text-red-400">{{ securityError }}</p>
                </div>

                <!-- Current password -->
                <div>
                  <label for="current-pw" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">Current password</label>
                  <div class="relative">
                    <input
                      id="current-pw"
                      v-model="security.currentPassword"
                      :type="showCurrentPw ? 'text' : 'password'"
                      autocomplete="current-password"
                      placeholder="••••••••"
                      :class="['input pr-10', securityErrors.currentPassword ? 'input-error' : '']"
                      @blur="validateSecurityField('currentPassword')"
                      @input="securityErrors.currentPassword = ''; securityError = ''"
                    />
                    <button type="button" @click="showCurrentPw = !showCurrentPw" class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 transition-colors">
                      <EyeSlashIcon v-if="showCurrentPw" class="w-4 h-4" /><EyeIcon v-else class="w-4 h-4" />
                    </button>
                  </div>
                  <p v-if="securityErrors.currentPassword" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ExclamationCircleIcon class="w-3.5 h-3.5" />{{ securityErrors.currentPassword }}
                  </p>
                </div>

                <!-- New password -->
                <div>
                  <label for="new-pw" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">New password</label>
                  <div class="relative">
                    <input
                      id="new-pw"
                      v-model="security.newPassword"
                      :type="showNewPw ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="Min. 8 characters"
                      :class="['input pr-10', securityErrors.newPassword ? 'input-error' : '']"
                      @blur="validateSecurityField('newPassword')"
                      @input="securityErrors.newPassword = ''"
                    />
                    <button type="button" @click="showNewPw = !showNewPw" class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 transition-colors">
                      <EyeSlashIcon v-if="showNewPw" class="w-4 h-4" /><EyeIcon v-else class="w-4 h-4" />
                    </button>
                  </div>
                  <div v-if="security.newPassword" class="mt-2 space-y-1">
                    <div class="flex gap-1">
                      <div v-for="i in 4" :key="i" :class="['h-1 flex-1 rounded-full transition-all duration-300', i <= newPwStrength.score ? newPwStrength.color : 'bg-dark-200 dark:bg-dark-700']" />
                    </div>
                    <p :class="['text-xs font-medium', newPwStrength.textColor]">{{ newPwStrength.label }}</p>
                  </div>
                  <p v-if="securityErrors.newPassword" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ExclamationCircleIcon class="w-3.5 h-3.5" />{{ securityErrors.newPassword }}
                  </p>
                </div>

                <!-- Confirm new password -->
                <div>
                  <label for="confirm-new-pw" class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">Confirm new password</label>
                  <div class="relative">
                    <input
                      id="confirm-new-pw"
                      v-model="security.confirmPassword"
                      :type="showConfirmPw ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="Re-enter new password"
                      :class="['input pr-10', securityErrors.confirmPassword ? 'input-error' : (security.confirmPassword && security.confirmPassword === security.newPassword ? 'border-green-500 focus:ring-green-500' : '')]"
                      @blur="validateSecurityField('confirmPassword')"
                      @input="securityErrors.confirmPassword = ''"
                    />
                    <button type="button" @click="showConfirmPw = !showConfirmPw" class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 transition-colors">
                      <EyeSlashIcon v-if="showConfirmPw" class="w-4 h-4" /><EyeIcon v-else class="w-4 h-4" />
                    </button>
                    <CheckCircleIcon v-if="security.confirmPassword && security.confirmPassword === security.newPassword" class="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
                  </div>
                  <p v-if="securityErrors.confirmPassword" class="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ExclamationCircleIcon class="w-3.5 h-3.5" />{{ securityErrors.confirmPassword }}
                  </p>
                </div>

                <div class="flex items-center justify-between pt-1">
                  <span v-if="passwordSaved" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <CheckCircleIcon class="w-4 h-4" /> Password updated
                  </span>
                  <div v-else />
                  <button type="submit" :disabled="securityLoading" class="btn-primary">
                    <span v-if="securityLoading" class="spinner w-4 h-4 mr-2" />
                    {{ securityLoading ? 'Updating…' : 'Update password' }}
                  </button>
                </div>
              </form>
            </div>
          </section>

        </div>
      </div>
    </div>

    <!-- Delete account modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          @click.self="closeDeleteModal"
        >
          <div class="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon class="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 class="text-base font-semibold text-dark-900 dark:text-white">Delete account</h2>
            </div>
            <p class="text-sm text-dark-500 mb-5 leading-relaxed">
              This will permanently delete your account, all notebooks, documents, and chat history.
              <strong class="text-dark-700 dark:text-dark-300">This cannot be undone.</strong>
            </p>
            <div class="mb-4">
              <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
                Type <span class="font-mono text-red-600 dark:text-red-400">DELETE</span> to confirm
              </label>
              <input
                v-model="deleteConfirmText"
                type="text"
                placeholder="DELETE"
                :class="['input font-mono tracking-widest', deleteConfirmText && deleteConfirmText !== 'DELETE' ? 'input-error' : '']"
                @paste.prevent
              />
            </div>
            <div class="mb-5">
              <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">Current password</label>
              <input
                v-model="deletePassword"
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
                :class="['input', deleteErrors.password ? 'input-error' : '']"
              />
              <p v-if="deleteErrors.password" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ deleteErrors.password }}</p>
            </div>
            <div class="flex gap-3 justify-end">
              <button @click="closeDeleteModal" class="btn-secondary">Cancel</button>
              <button
                @click="deleteAccount"
                :disabled="deleteConfirmText !== 'DELETE' || !deletePassword || deleteLoading"
                class="btn-danger"
              >
                <span v-if="deleteLoading" class="spinner w-4 h-4 mr-2" />
                {{ deleteLoading ? 'Deleting…' : 'Delete account' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useThemeStore, useToastStore } from '@/stores'
import { userService } from '@/services'
import {
  UserIcon,
  AdjustmentsHorizontalIcon,
  LockClosedIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const toastStore = useToastStore()

// ─── Tabs ───────────────────────────────────────────────────────────────
const activeTab = ref('profile')
const tabs = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'preferences', label: 'Preferences', icon: AdjustmentsHorizontalIcon },
  { id: 'security', label: 'Security', icon: LockClosedIcon }
]

// ─── Profile ────────────────────────────────────────────────────────────
const profile = reactive({ name: '', avatar: '' })
const profileErrors = reactive({ name: '', avatar: '' })
const profileLoading = ref(false)
const profileSaved = ref(false)

onMounted(() => {
  profile.name = authStore.user?.name || ''
  profile.avatar = authStore.user?.avatar || ''
})

function isValidUrl(url) {
  try { return Boolean(new URL(url)) } catch { return false }
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function validateProfileField(field) {
  if (field === 'name') {
    if (!profile.name) profileErrors.name = 'Name is required.'
    else if (profile.name.length < 2) profileErrors.name = 'Name must be at least 2 characters.'
    else profileErrors.name = ''
  }
  if (field === 'avatar') {
    if (profile.avatar && !isValidUrl(profile.avatar)) {
      profileErrors.avatar = 'Must be a valid URL starting with http:// or https://'
    } else {
      profileErrors.avatar = ''
    }
  }
}

async function saveProfile() {
  validateProfileField('name')
  validateProfileField('avatar')
  if (profileErrors.name || profileErrors.avatar) return

  profileLoading.value = true
  profileSaved.value = false
  try {
    await userService.updateProfile({ name: profile.name, avatar: profile.avatar || undefined })
    authStore.updateUser({ name: profile.name, avatar: profile.avatar || undefined })
    profileSaved.value = true
    setTimeout(() => { profileSaved.value = false }, 3000)
  } catch {
    toastStore.error('Failed to save profile. Please try again.')
  } finally {
    profileLoading.value = false
  }
}

// ─── Preferences ────────────────────────────────────────────────────────
const themeOptions = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: ComputerDesktopIcon }
]

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' }
]

const preferences = reactive({ language: 'en' })
const prefLoading = ref(false)

async function savePreferences() {
  prefLoading.value = true
  try {
    await userService.updateProfile({ settings: { language: preferences.language } })
    toastStore.success('Preferences saved')
  } catch {
    toastStore.error('Failed to save preferences.')
  } finally {
    prefLoading.value = false
  }
}

// ─── Security ───────────────────────────────────────────────────────────
const security = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const securityErrors = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const securityError = ref('')
const securityLoading = ref(false)
const passwordSaved = ref(false)
const showCurrentPw = ref(false)
const showNewPw = ref(false)
const showConfirmPw = ref(false)

const newPwStrength = computed(() => {
  const p = security.newPassword
  const score = [p.length >= 8, /[A-Z]/.test(p), /[a-z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length
  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' }
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400' }
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' }
  return { score: 4, label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400' }
})

function validateSecurityField(field) {
  if (field === 'currentPassword') {
    securityErrors.currentPassword = security.currentPassword ? '' : 'Current password is required.'
  }
  if (field === 'newPassword') {
    if (!security.newPassword) securityErrors.newPassword = 'New password is required.'
    else if (security.newPassword.length < 8) securityErrors.newPassword = 'Password must be at least 8 characters.'
    else if (security.newPassword === security.currentPassword) securityErrors.newPassword = 'New password must differ from your current password.'
    else securityErrors.newPassword = ''
    if (security.confirmPassword) validateSecurityField('confirmPassword')
  }
  if (field === 'confirmPassword') {
    if (!security.confirmPassword) securityErrors.confirmPassword = 'Please confirm your new password.'
    else if (security.confirmPassword !== security.newPassword) securityErrors.confirmPassword = 'Passwords do not match.'
    else securityErrors.confirmPassword = ''
  }
}

async function changePassword() {
  securityError.value = ''
  validateSecurityField('currentPassword')
  validateSecurityField('newPassword')
  validateSecurityField('confirmPassword')
  if (securityErrors.currentPassword || securityErrors.newPassword || securityErrors.confirmPassword) return

  securityLoading.value = true
  passwordSaved.value = false
  try {
    await userService.changePassword(security.currentPassword, security.newPassword)
    security.currentPassword = ''
    security.newPassword = ''
    security.confirmPassword = ''
    passwordSaved.value = true
    setTimeout(() => { passwordSaved.value = false }, 3000)
  } catch (err) {
    const msg = err.response?.data?.error || 'Failed to update password. Please try again.'
    securityError.value = msg
    if (msg.toLowerCase().includes('current') || msg.toLowerCase().includes('incorrect')) {
      securityErrors.currentPassword = 'Incorrect current password.'
    }
    security.currentPassword = ''
  } finally {
    securityLoading.value = false
  }
}

// ─── Delete account ─────────────────────────────────────────────────────
const showDeleteModal = ref(false)
const deleteConfirmText = ref('')
const deletePassword = ref('')
const deleteErrors = reactive({ password: '' })
const deleteLoading = ref(false)

function closeDeleteModal() {
  showDeleteModal.value = false
  deleteConfirmText.value = ''
  deletePassword.value = ''
  deleteErrors.password = ''
}

async function deleteAccount() {
  if (deleteConfirmText.value !== 'DELETE' || !deletePassword.value) return
  deleteLoading.value = true
  try {
    await userService.deleteAccount(deletePassword.value, 'DELETE')
    await authStore.logout()
    router.push('/login')
  } catch (err) {
    const msg = err.response?.data?.error || 'Failed to delete account. Please try again.'
    if (msg.toLowerCase().includes('password')) {
      deleteErrors.password = 'Incorrect password.'
      deletePassword.value = ''
    } else {
      toastStore.error(msg)
    }
  } finally {
    deleteLoading.value = false
  }
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
