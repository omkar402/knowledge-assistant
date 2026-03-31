<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-dark-900 dark:text-white mb-8">Settings</h1>

    <!-- Profile Section -->
    <div class="card mb-6">
      <div class="p-4 border-b border-dark-200 dark:border-dark-700">
        <h2 class="font-semibold text-dark-900 dark:text-white">Profile</h2>
      </div>
      <div class="p-6">
        <div class="flex items-center gap-6 mb-6">
          <div class="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl font-bold text-primary-600">
            {{ userInitials }}
          </div>
          <div>
            <h3 class="text-lg font-medium text-dark-900 dark:text-white">{{ user?.name }}</h3>
            <p class="text-dark-500">{{ user?.email }}</p>
            <span class="badge badge-primary mt-2">{{ user?.plan || 'Free' }} Plan</span>
          </div>
        </div>
        
        <form @submit.prevent="updateProfile" class="space-y-4 max-w-md">
          <Input
            v-model="profileForm.name"
            label="Name"
            required
          />
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Appearance -->
    <div class="card mb-6">
      <div class="p-4 border-b border-dark-200 dark:border-dark-700">
        <h2 class="font-semibold text-dark-900 dark:text-white">Appearance</h2>
      </div>
      <div class="p-6">
        <div class="flex gap-4">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            @click="setTheme(option.value)"
            :class="[
              'flex-1 p-4 rounded-lg border-2 transition-all',
              theme === option.value 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
            ]"
          >
            <component :is="option.icon" class="w-6 h-6 mx-auto mb-2" />
            <p class="text-sm font-medium text-center">{{ option.label }}</p>
          </button>
        </div>
      </div>
    </div>

    <!-- Change Password (for local accounts) -->
    <div v-if="user?.provider === 'local'" class="card mb-6">
      <div class="p-4 border-b border-dark-200 dark:border-dark-700">
        <h2 class="font-semibold text-dark-900 dark:text-white">Change Password</h2>
      </div>
      <div class="p-6">
        <form @submit.prevent="changePassword" class="space-y-4 max-w-md">
          <Input
            v-model="passwordForm.current"
            type="password"
            label="Current Password"
            required
          />
          <Input
            v-model="passwordForm.new"
            type="password"
            label="New Password"
            hint="At least 6 characters"
            required
          />
          <Input
            v-model="passwordForm.confirm"
            type="password"
            label="Confirm New Password"
            required
          />
          <button type="submit" class="btn-primary" :disabled="changingPassword">
            {{ changingPassword ? 'Changing...' : 'Change Password' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Usage -->
    <div class="card mb-6">
      <div class="p-4 border-b border-dark-200 dark:border-dark-700">
        <h2 class="font-semibold text-dark-900 dark:text-white">Usage</h2>
      </div>
      <div class="p-6">
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-dark-500">Documents</span>
              <span class="text-dark-900 dark:text-white">
                {{ usage?.documentsCount || 0 }} / {{ limits?.documents || 50 }}
              </span>
            </div>
            <div class="w-full bg-dark-200 dark:bg-dark-700 rounded-full h-2">
              <div 
                class="bg-primary-600 h-2 rounded-full"
                :style="{ width: `${Math.min((usage?.documentsCount || 0) / (limits?.documents || 50) * 100, 100)}%` }"
              />
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-dark-500">Queries this month</span>
              <span class="text-dark-900 dark:text-white">
                {{ usage?.queriesCount || 0 }} / {{ limits?.queries || 100 }}
              </span>
            </div>
            <div class="w-full bg-dark-200 dark:bg-dark-700 rounded-full h-2">
              <div 
                class="bg-green-600 h-2 rounded-full"
                :style="{ width: `${Math.min((usage?.queriesCount || 0) / (limits?.queries || 100) * 100, 100)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="card border-red-200 dark:border-red-900">
      <div class="p-4 border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
        <h2 class="font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
      </div>
      <div class="p-6">
        <p class="text-dark-500 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button @click="showDeleteModal = true" class="btn-danger">
          Delete Account
        </button>
      </div>
    </div>

    <!-- Delete Account Modal -->
    <Modal v-model="showDeleteModal" title="Delete Account">
      <p class="text-dark-500 mb-4">
        This action cannot be undone. All your data will be permanently deleted.
      </p>
      <Input
        v-if="user?.provider === 'local'"
        v-model="deletePassword"
        type="password"
        label="Enter your password to confirm"
      />
      <Input
        v-model="deleteConfirmation"
        label="Type DELETE to confirm"
        placeholder="DELETE"
      />
      <template #footer>
        <button @click="showDeleteModal = false" class="btn-secondary">Cancel</button>
        <button 
          @click="deleteAccount" 
          class="btn-danger"
          :disabled="deleteConfirmation !== 'DELETE'"
        >
          Delete Account
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useThemeStore, useToastStore } from '@/stores'
import { userService } from '@/services'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const toastStore = useToastStore()

const user = computed(() => authStore.user)
const theme = computed(() => themeStore.theme)

const userInitials = computed(() => {
  if (!user.value?.name) return '?'
  return user.value.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

const saving = ref(false)
const changingPassword = ref(false)
const usage = ref({})
const limits = ref({})
const showDeleteModal = ref(false)
const deletePassword = ref('')
const deleteConfirmation = ref('')

const profileForm = reactive({
  name: ''
})

const passwordForm = reactive({
  current: '',
  new: '',
  confirm: ''
})

const themeOptions = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: ComputerDesktopIcon }
]

onMounted(async () => {
  profileForm.name = user.value?.name || ''
  await loadUsage()
})

async function loadUsage() {
  try {
    const response = await userService.getUsage()
    usage.value = response.usage
    limits.value = response.limits
  } catch (error) {
    console.error('Failed to load usage:', error)
  }
}

async function updateProfile() {
  saving.value = true
  try {
    const response = await userService.updateProfile({
      name: profileForm.name
    })
    authStore.updateUser(response.user)
    toastStore.success('Profile updated')
  } catch (error) {
    toastStore.error('Failed to update profile')
  } finally {
    saving.value = false
  }
}

function setTheme(value) {
  themeStore.setTheme(value)
}

async function changePassword() {
  if (passwordForm.new !== passwordForm.confirm) {
    toastStore.error('Passwords do not match')
    return
  }
  
  if (passwordForm.new.length < 6) {
    toastStore.error('Password must be at least 6 characters')
    return
  }

  changingPassword.value = true
  try {
    await userService.changePassword(passwordForm.current, passwordForm.new)
    toastStore.success('Password changed')
    passwordForm.current = ''
    passwordForm.new = ''
    passwordForm.confirm = ''
  } catch (error) {
    toastStore.error(error.response?.data?.error || 'Failed to change password')
  } finally {
    changingPassword.value = false
  }
}

async function deleteAccount() {
  if (deleteConfirmation.value !== 'DELETE') return

  try {
    await userService.deleteAccount(deletePassword.value, 'DELETE')
    toastStore.success('Account deleted')
    authStore.logout()
    router.push('/login')
  } catch (error) {
    toastStore.error(error.response?.data?.error || 'Failed to delete account')
  }
}
</script>
