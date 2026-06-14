<template>
  <div class="h-screen flex flex-col overflow-hidden bg-white dark:bg-dark-900">

    <!-- Top bar -->
    <div class="h-12 flex items-center px-3 gap-3 bg-white dark:bg-dark-800 border-b border-dark-200 dark:border-dark-700 flex-shrink-0">
      <!-- Back -->
      <router-link
        to="/knowledge-bases"
        class="btn-icon text-dark-500 hover:text-dark-900 dark:hover:text-white"
      >
        <ArrowLeftIcon class="w-4 h-4" />
      </router-link>

      <!-- KB icon + name -->
      <div
        v-if="knowledgeBase"
        class="w-6 h-6 rounded flex items-center justify-center text-sm flex-shrink-0"
        :style="{ backgroundColor: (knowledgeBase.color || '#3b82f6') + '22' }"
      >
        {{ knowledgeBase.icon }}
      </div>
      <h1 class="text-sm font-semibold text-dark-900 dark:text-white truncate flex-1">
        {{ knowledgeBase?.name || 'Loading...' }}
      </h1>

      <!-- Source count badge -->
      <span
        v-if="documents.length"
        class="text-xs text-dark-400 flex-shrink-0"
      >
        {{ documents.length }} {{ documents.length === 1 ? 'source' : 'sources' }}
      </span>

      <!-- Theme toggle -->
      <button @click="themeStore.toggleTheme()" class="btn-icon text-dark-400 hover:text-dark-600 dark:hover:text-dark-200">
        <SunIcon v-if="themeStore.isDark" class="w-4 h-4" />
        <MoonIcon v-else class="w-4 h-4" />
      </button>

      <!-- Share -->
      <button
        @click="showShareModal = true"
        class="btn-icon text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
        title="Share"
      >
        <ShareIcon class="w-4 h-4" />
      </button>

      <!-- Settings -->
      <button
        @click="showSettingsModal = true"
        class="btn-icon text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
        title="Notebook settings"
      >
        <Cog6ToothIcon class="w-4 h-4" />
      </button>
    </div>

    <!-- Three-panel body -->
    <div class="flex flex-1 overflow-hidden">

      <!-- LEFT: Sources panel -->
      <SourcePanel
        :kb-id="kbId"
        :documents="documents"
        :loading="loading"
        @refresh="loadDocuments"
      />

      <!-- Resize divider (visual only) -->
      <div class="w-px bg-dark-200 dark:bg-dark-700 flex-shrink-0" />

      <!-- CENTER: Chat panel -->
      <ChatPanel :kb-id="kbId" :kb="knowledgeBase" />

      <!-- Resize divider (visual only) -->
      <div class="w-px bg-dark-200 dark:bg-dark-700 flex-shrink-0" />

      <!-- RIGHT: Studio panel -->
      <StudioPanel :kb-id="kbId" :documents="documents" />

    </div>

    <!-- Share Modal -->
    <Teleport to="body">
      <div
        v-if="showShareModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showShareModal = false"
      >
        <div class="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-sm p-6">
          <h2 class="text-base font-semibold text-dark-900 dark:text-white mb-4">Share notebook</h2>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Email address
              </label>
              <input
                v-model="shareForm.email"
                type="email"
                placeholder="colleague@example.com"
                class="input"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Permission
              </label>
              <select v-model="shareForm.permission" class="input">
                <option value="view">View only</option>
                <option value="edit">Can edit</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div class="flex gap-3 justify-end mt-6">
            <button @click="showShareModal = false" class="btn-secondary">Cancel</button>
            <button
              @click="shareKnowledgeBase"
              :disabled="!shareForm.email"
              class="btn-primary"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div
        v-if="showSettingsModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showSettingsModal = false"
      >
        <div class="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-sm p-6">
          <h2 class="text-base font-semibold text-dark-900 dark:text-white mb-4">Notebook settings</h2>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Name</label>
              <input v-model="editForm.name" type="text" class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Description</label>
              <textarea v-model="editForm.description" class="input resize-none" rows="2" />
            </div>
          </div>
          <div class="flex gap-3 justify-end mt-6">
            <button @click="confirmDelete" class="btn-danger mr-auto text-sm">Delete</button>
            <button @click="showSettingsModal = false" class="btn-secondary">Cancel</button>
            <button @click="saveSettings" class="btn-primary">Save</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore, useThemeStore } from '@/stores'
import { knowledgeBaseService } from '@/services'
import {
  ArrowLeftIcon,
  ShareIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/vue/24/outline'
import SourcePanel from '@/components/SourcePanel.vue'
import ChatPanel from '@/components/ChatPanel.vue'
import StudioPanel from '@/components/StudioPanel.vue'

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()
const themeStore = useThemeStore()

const kbId = computed(() => route.params.id)
const loading = ref(true)
const knowledgeBase = ref(null)
const documents = ref([])

const showShareModal = ref(false)
const showSettingsModal = ref(false)

const shareForm = reactive({ email: '', permission: 'view' })
const editForm = reactive({ name: '', description: '' })

onMounted(() => loadAll())
watch(() => route.params.id, () => loadAll())

async function loadAll() {
  await Promise.all([loadKnowledgeBase(), loadDocuments()])
}

async function loadKnowledgeBase() {
  try {
    const response = await knowledgeBaseService.getKnowledgeBase(route.params.id)
    knowledgeBase.value = response.knowledgeBase
    editForm.name = knowledgeBase.value.name
    editForm.description = knowledgeBase.value.description || ''
  } catch {
    toastStore.error('Failed to load notebook')
    router.push('/knowledge-bases')
  }
}

async function loadDocuments() {
  loading.value = true
  try {
    // KB response includes populated documents array
    const response = await knowledgeBaseService.getKnowledgeBase(route.params.id)
    documents.value = response.knowledgeBase.documents || []
  } catch {
    documents.value = []
  } finally {
    loading.value = false
  }
}

async function shareKnowledgeBase() {
  if (!shareForm.email) return
  try {
    await knowledgeBaseService.shareKnowledgeBase(route.params.id, shareForm.email, shareForm.permission)
    toastStore.success(`Shared with ${shareForm.email}`)
    showShareModal.value = false
    shareForm.email = ''
  } catch (error) {
    toastStore.error(error.response?.data?.error || 'Failed to share')
  }
}

async function saveSettings() {
  try {
    await knowledgeBaseService.updateKnowledgeBase(route.params.id, {
      name: editForm.name,
      description: editForm.description
    })
    toastStore.success('Saved')
    showSettingsModal.value = false
    await loadKnowledgeBase()
  } catch {
    toastStore.error('Failed to save')
  }
}

async function confirmDelete() {
  if (!confirm('Delete this notebook? This cannot be undone.')) return
  try {
    await knowledgeBaseService.deleteKnowledgeBase(route.params.id)
    toastStore.success('Notebook deleted')
    router.push('/knowledge-bases')
  } catch {
    toastStore.error('Failed to delete')
  }
}
</script>
