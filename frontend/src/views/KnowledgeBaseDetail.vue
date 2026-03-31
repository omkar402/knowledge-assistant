<template>
  <div v-if="loading" class="p-6">
    <div class="skeleton h-10 w-64 mb-4" />
    <div class="skeleton h-6 w-48 mb-8" />
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 skeleton h-96 rounded-xl" />
      <div class="skeleton h-96 rounded-xl" />
    </div>
  </div>

  <div v-else-if="!knowledgeBase" class="p-6 text-center">
    <p class="text-dark-500">Knowledge base not found</p>
  </div>

  <div v-else class="p-6">
    <!-- Header -->
    <div class="flex items-start justify-between mb-6">
      <div class="flex items-center gap-4">
        <router-link to="/knowledge-bases" class="btn-ghost p-2">
          <ArrowLeftIcon class="w-5 h-5" />
        </router-link>
        <div 
          class="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
          :style="{ backgroundColor: knowledgeBase.color + '20' }"
        >
          {{ knowledgeBase.icon }}
        </div>
        <div>
          <h1 class="text-2xl font-bold text-dark-900 dark:text-white">
            {{ knowledgeBase.name }}
          </h1>
          <p class="text-dark-500">{{ knowledgeBase.description || 'No description' }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="showShareModal = true" class="btn-secondary gap-2">
          <ShareIcon class="w-4 h-4" />
          Share
        </button>
        <button @click="showEditModal = true" class="btn-secondary gap-2">
          <PencilIcon class="w-4 h-4" />
          Edit
        </button>
        <router-link :to="`/chat?kb=${knowledgeBase._id}`" class="btn-primary gap-2">
          <ChatBubbleLeftRightIcon class="w-4 h-4" />
          Chat
        </router-link>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-dark-900 dark:text-white">
          {{ stats?.totalDocuments || 0 }}
        </p>
        <p class="text-sm text-dark-500">Documents</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-dark-900 dark:text-white">
          {{ stats?.totalChunks || 0 }}
        </p>
        <p class="text-sm text-dark-500">Chunks</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-dark-900 dark:text-white">
          {{ stats?.totalQueries || 0 }}
        </p>
        <p class="text-sm text-dark-500">Queries</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-dark-900 dark:text-white">
          {{ formatNumber(stats?.totalWords || 0) }}
        </p>
        <p class="text-sm text-dark-500">Words</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Documents -->
      <div class="lg:col-span-2">
        <div class="card">
          <div class="p-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
            <h2 class="font-semibold text-dark-900 dark:text-white">Documents</h2>
            <button @click="$refs.fileInput.click()" class="btn-primary btn-sm gap-1">
              <PlusIcon class="w-4 h-4" />
              Add
            </button>
            <input 
              ref="fileInput"
              type="file" 
              class="hidden" 
              multiple
              @change="handleFileUpload"
            />
          </div>

          <div v-if="documents.length === 0" class="p-8 text-center text-dark-500">
            <DocumentTextIcon class="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No documents yet</p>
          </div>

          <div v-else class="divide-y divide-dark-200 dark:divide-dark-700">
            <div
              v-for="doc in documents"
              :key="doc._id"
              class="p-4 hover:bg-dark-50 dark:hover:bg-dark-750 transition-colors cursor-pointer flex items-center gap-3"
              @click="$router.push(`/documents/${doc._id}`)"
            >
              <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', getTypeColor(doc.type)]">
                <DocumentIcon class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-dark-900 dark:text-white truncate">
                  {{ doc.title }}
                </p>
                <p class="text-sm text-dark-500">
                  {{ doc.type.toUpperCase() }} · {{ formatDate(doc.createdAt) }}
                </p>
              </div>
              <span :class="['badge', getStatusBadge(doc.embeddings?.status)]">
                {{ doc.embeddings?.status || 'pending' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Search -->
        <div class="card p-4">
          <h3 class="font-semibold text-dark-900 dark:text-white mb-3">Quick Search</h3>
          <form @submit.prevent="performSearch">
            <div class="flex gap-2">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search in knowledge base..."
                class="input flex-1"
              />
              <button type="submit" class="btn-primary">
                <MagnifyingGlassIcon class="w-5 h-5" />
              </button>
            </div>
          </form>

          <div v-if="searchResults.length" class="mt-4 space-y-2">
            <div
              v-for="result in searchResults"
              :key="result.metadata.documentId"
              class="p-3 bg-dark-50 dark:bg-dark-750 rounded-lg"
            >
              <p class="text-sm text-dark-900 dark:text-white line-clamp-3">
                {{ result.content }}
              </p>
              <p class="text-xs text-dark-500 mt-2">
                Score: {{ (result.score * 100).toFixed(0) }}%
              </p>
            </div>
          </div>
        </div>

        <!-- Settings -->
        <div class="card p-4">
          <h3 class="font-semibold text-dark-900 dark:text-white mb-3">AI Settings</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-dark-500">Model</span>
              <span class="text-dark-900 dark:text-white">{{ knowledgeBase.settings?.model || 'gpt-4o-mini' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-dark-500">Temperature</span>
              <span class="text-dark-900 dark:text-white">{{ knowledgeBase.settings?.temperature || 0.7 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-dark-500">Citations</span>
              <span class="text-dark-900 dark:text-white">{{ knowledgeBase.settings?.citationStyle || 'inline' }}</span>
            </div>
          </div>
        </div>

        <!-- Shared with -->
        <div v-if="knowledgeBase.sharedWith?.length" class="card p-4">
          <h3 class="font-semibold text-dark-900 dark:text-white mb-3">Shared with</h3>
          <div class="space-y-2">
            <div
              v-for="share in knowledgeBase.sharedWith"
              :key="share.user._id || share.user"
              class="flex items-center gap-2"
            >
              <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span class="text-sm text-primary-600">{{ share.user.name?.[0] || '?' }}</span>
              </div>
              <span class="text-sm text-dark-900 dark:text-white flex-1">
                {{ share.user.email || share.user }}
              </span>
              <span class="badge badge-primary text-xs">{{ share.permission }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <Modal v-model="showShareModal" title="Share Knowledge Base">
      <form @submit.prevent="shareKnowledgeBase" class="space-y-4">
        <Input
          v-model="shareForm.email"
          type="email"
          label="Email Address"
          placeholder="colleague@example.com"
          required
        />
        <div>
          <label class="block text-sm font-medium mb-1.5">Permission</label>
          <select v-model="shareForm.permission" class="input">
            <option value="view">View only</option>
            <option value="edit">Can edit</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </form>
      <template #footer>
        <button @click="showShareModal = false" class="btn-secondary">Cancel</button>
        <button @click="shareKnowledgeBase" class="btn-primary" :disabled="!shareForm.email">
          Share
        </button>
      </template>
    </Modal>

    <!-- Edit Modal -->
    <Modal v-model="showEditModal" title="Edit Knowledge Base">
      <form @submit.prevent="updateKnowledgeBase" class="space-y-4">
        <Input
          v-model="editForm.name"
          label="Name"
          required
        />
        <Textarea
          v-model="editForm.description"
          label="Description"
          :rows="3"
        />
      </form>
      <template #footer>
        <button @click="confirmDelete" class="btn-danger mr-auto">Delete</button>
        <button @click="showEditModal = false" class="btn-secondary">Cancel</button>
        <button @click="updateKnowledgeBase" class="btn-primary">Save</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores'
import { knowledgeBaseService, documentService } from '@/services'
import { formatDistanceToNow } from 'date-fns'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import {
  ArrowLeftIcon,
  PlusIcon,
  ShareIcon,
  PencilIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  DocumentIcon,
  MagnifyingGlassIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()

const loading = ref(true)
const knowledgeBase = ref(null)
const documents = ref([])
const stats = ref({})
const searchQuery = ref('')
const searchResults = ref([])

const showShareModal = ref(false)
const showEditModal = ref(false)

const shareForm = reactive({
  email: '',
  permission: 'view'
})

const editForm = reactive({
  name: '',
  description: ''
})

onMounted(async () => {
  await loadKnowledgeBase()
})

watch(() => route.params.id, async () => {
  await loadKnowledgeBase()
})

async function loadKnowledgeBase() {
  loading.value = true
  try {
    const [kbResponse, statsResponse] = await Promise.all([
      knowledgeBaseService.getKnowledgeBase(route.params.id),
      knowledgeBaseService.getStats(route.params.id)
    ])
    
    knowledgeBase.value = kbResponse.knowledgeBase
    documents.value = kbResponse.knowledgeBase.documents || []
    stats.value = statsResponse.stats
    
    // Initialize edit form
    editForm.name = knowledgeBase.value.name
    editForm.description = knowledgeBase.value.description || ''
  } catch (error) {
    toastStore.error('Failed to load knowledge base')
    router.push('/knowledge-bases')
  } finally {
    loading.value = false
  }
}

async function handleFileUpload(event) {
  const files = Array.from(event.target.files)
  
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('knowledgeBaseId', route.params.id)
    
    try {
      await documentService.uploadDocument(formData)
      toastStore.success(`${file.name} uploaded`)
    } catch (error) {
      toastStore.error(`Failed to upload ${file.name}`)
    }
  }
  
  event.target.value = ''
  await loadKnowledgeBase()
}

async function performSearch() {
  if (!searchQuery.value.trim()) return
  
  try {
    const response = await knowledgeBaseService.searchKnowledgeBase(
      route.params.id,
      searchQuery.value,
      5
    )
    searchResults.value = response.results
  } catch (error) {
    toastStore.error('Search failed')
  }
}

async function shareKnowledgeBase() {
  if (!shareForm.email) return
  
  try {
    await knowledgeBaseService.shareKnowledgeBase(
      route.params.id,
      shareForm.email,
      shareForm.permission
    )
    toastStore.success(`Shared with ${shareForm.email}`)
    showShareModal.value = false
    shareForm.email = ''
    await loadKnowledgeBase()
  } catch (error) {
    toastStore.error(error.response?.data?.error || 'Failed to share')
  }
}

async function updateKnowledgeBase() {
  try {
    await knowledgeBaseService.updateKnowledgeBase(route.params.id, {
      name: editForm.name,
      description: editForm.description
    })
    toastStore.success('Knowledge base updated')
    showEditModal.value = false
    await loadKnowledgeBase()
  } catch (error) {
    toastStore.error('Failed to update')
  }
}

async function confirmDelete() {
  if (!confirm('Are you sure you want to delete this knowledge base? This cannot be undone.')) {
    return
  }
  
  try {
    await knowledgeBaseService.deleteKnowledgeBase(route.params.id)
    toastStore.success('Knowledge base deleted')
    router.push('/knowledge-bases')
  } catch (error) {
    toastStore.error('Failed to delete')
  }
}

function formatDate(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function getTypeColor(type) {
  const colors = {
    pdf: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    webpage: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
  }
  return colors[type] || 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-400'
}

function getStatusBadge(status) {
  const badges = {
    completed: 'badge-success',
    processing: 'badge-warning',
    pending: 'badge-primary',
    failed: 'badge-danger'
  }
  return badges[status] || 'badge-primary'
}
</script>
