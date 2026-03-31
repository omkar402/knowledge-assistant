<template>
  <div v-if="loading" class="p-6">
    <div class="skeleton h-8 w-64 mb-6" />
    <div class="skeleton h-96 rounded-xl" />
  </div>

  <div v-else-if="!document" class="p-6 text-center">
    <p class="text-dark-500">Document not found</p>
  </div>

  <div v-else class="p-6">
    <!-- Header -->
    <div class="flex items-start justify-between mb-6">
      <div class="flex items-center gap-4">
        <router-link to="/documents" class="btn-ghost p-2">
          <ArrowLeftIcon class="w-5 h-5" />
        </router-link>
        <div :class="['w-12 h-12 rounded-lg flex items-center justify-center', getTypeColor(document.type)]">
          <DocumentIcon class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-dark-900 dark:text-white">
            {{ document.title }}
          </h1>
          <p class="text-dark-500">
            {{ document.type.toUpperCase() }} · Added {{ formatDate(document.createdAt) }}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="reprocess" class="btn-secondary gap-2" :disabled="reprocessing">
          <ArrowPathIcon :class="['w-4 h-4', reprocessing ? 'animate-spin' : '']" />
          Reprocess
        </button>
        <button @click="confirmDelete" class="btn-danger gap-2">
          <TrashIcon class="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Summary -->
        <div class="card">
          <div class="p-4 border-b border-dark-200 dark:border-dark-700">
            <h2 class="font-semibold text-dark-900 dark:text-white">Summary</h2>
          </div>
          <div class="p-4">
            <p v-if="document.content?.summary" class="text-dark-600 dark:text-dark-300">
              {{ document.content.summary }}
            </p>
            <div v-else class="flex items-center gap-3">
              <button @click="generateSummary" class="btn-secondary" :disabled="summarizing">
                {{ summarizing ? 'Generating...' : 'Generate Summary' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Processing status -->
        <div class="card">
          <div class="p-4 border-b border-dark-200 dark:border-dark-700">
            <h2 class="font-semibold text-dark-900 dark:text-white">Processing Status</h2>
          </div>
          <div class="p-4">
            <div class="flex items-center gap-4 mb-4">
              <span :class="['badge', getStatusBadge(document.embeddings?.status)]">
                {{ document.embeddings?.status || 'pending' }}
              </span>
              <span v-if="document.embeddings?.processedAt" class="text-sm text-dark-500">
                Processed {{ formatDate(document.embeddings.processedAt) }}
              </span>
            </div>
            
            <div v-if="document.embeddings?.error" class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {{ document.embeddings.error }}
            </div>
            
            <div class="grid grid-cols-3 gap-4 mt-4">
              <div class="text-center">
                <p class="text-2xl font-bold text-dark-900 dark:text-white">
                  {{ document.embeddings?.chunksCount || 0 }}
                </p>
                <p class="text-sm text-dark-500">Chunks</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-dark-900 dark:text-white">
                  {{ document.content?.wordCount || 0 }}
                </p>
                <p class="text-sm text-dark-500">Words</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-dark-900 dark:text-white">
                  {{ document.content?.pageCount || 0 }}
                </p>
                <p class="text-sm text-dark-500">Pages</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Details -->
        <div class="card p-4">
          <h3 class="font-semibold text-dark-900 dark:text-white mb-4">Details</h3>
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between">
              <dt class="text-dark-500">Type</dt>
              <dd class="text-dark-900 dark:text-white">{{ document.type }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-dark-500">Source</dt>
              <dd class="text-dark-900 dark:text-white">{{ document.source }}</dd>
            </div>
            <div v-if="document.file?.size" class="flex justify-between">
              <dt class="text-dark-500">Size</dt>
              <dd class="text-dark-900 dark:text-white">{{ formatSize(document.file.size) }}</dd>
            </div>
            <div v-if="document.sourceUrl" class="flex justify-between">
              <dt class="text-dark-500">URL</dt>
              <dd class="text-primary-600 truncate max-w-[200px]">
                <a :href="document.sourceUrl" target="_blank">{{ document.sourceUrl }}</a>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Knowledge Base -->
        <div class="card p-4">
          <h3 class="font-semibold text-dark-900 dark:text-white mb-4">Knowledge Base</h3>
          <select v-model="document.knowledgeBase" class="input" @change="updateKnowledgeBase">
            <option :value="null">None</option>
            <option v-for="kb in knowledgeBases" :key="kb._id" :value="kb._id">
              {{ kb.icon }} {{ kb.name }}
            </option>
          </select>
        </div>

        <!-- Tags -->
        <div class="card p-4">
          <h3 class="font-semibold text-dark-900 dark:text-white mb-4">Tags</h3>
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="tag in document.tags"
              :key="tag"
              class="badge badge-primary flex items-center gap-1"
            >
              {{ tag }}
              <button @click="removeTag(tag)" class="hover:text-red-500">×</button>
            </span>
          </div>
          <form @submit.prevent="addTag" class="flex gap-2">
            <input
              v-model="newTag"
              type="text"
              placeholder="Add tag..."
              class="input flex-1"
            />
            <button type="submit" class="btn-secondary">Add</button>
          </form>
        </div>

        <!-- Stats -->
        <div class="card p-4">
          <h3 class="font-semibold text-dark-900 dark:text-white mb-4">Statistics</h3>
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between">
              <dt class="text-dark-500">Views</dt>
              <dd class="text-dark-900 dark:text-white">{{ document.stats?.views || 0 }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-dark-500">Queries</dt>
              <dd class="text-dark-900 dark:text-white">{{ document.stats?.queries || 0 }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-dark-500">Citations</dt>
              <dd class="text-dark-900 dark:text-white">{{ document.stats?.citations || 0 }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores'
import { documentService, knowledgeBaseService, chatService } from '@/services'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  TrashIcon,
  DocumentIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()

const loading = ref(true)
const document = ref(null)
const knowledgeBases = ref([])
const reprocessing = ref(false)
const summarizing = ref(false)
const newTag = ref('')

onMounted(async () => {
  await Promise.all([
    loadDocument(),
    loadKnowledgeBases()
  ])
})

async function loadDocument() {
  try {
    const response = await documentService.getDocument(route.params.id)
    document.value = response.document
  } catch (error) {
    toastStore.error('Failed to load document')
    router.push('/documents')
  } finally {
    loading.value = false
  }
}

async function loadKnowledgeBases() {
  try {
    const response = await knowledgeBaseService.getKnowledgeBases()
    knowledgeBases.value = response.knowledgeBases
  } catch (error) {
    console.error('Failed to load knowledge bases:', error)
  }
}

async function reprocess() {
  reprocessing.value = true
  try {
    await documentService.reprocessDocument(route.params.id)
    toastStore.success('Document reprocessing started')
    await loadDocument()
  } catch (error) {
    toastStore.error('Failed to reprocess document')
  } finally {
    reprocessing.value = false
  }
}

async function confirmDelete() {
  if (!confirm('Are you sure you want to delete this document?')) return
  
  try {
    await documentService.deleteDocument(route.params.id)
    toastStore.success('Document deleted')
    router.push('/documents')
  } catch (error) {
    toastStore.error('Failed to delete document')
  }
}

async function generateSummary() {
  summarizing.value = true
  try {
    const response = await chatService.summarize({ documentId: route.params.id })
    document.value.content.summary = response.summary
    toastStore.success('Summary generated')
  } catch (error) {
    toastStore.error('Failed to generate summary')
  } finally {
    summarizing.value = false
  }
}

async function updateKnowledgeBase() {
  try {
    await documentService.updateDocument(route.params.id, {
      knowledgeBaseId: document.value.knowledgeBase
    })
    toastStore.success('Knowledge base updated')
  } catch (error) {
    toastStore.error('Failed to update')
  }
}

async function addTag() {
  if (!newTag.value.trim()) return
  
  const tag = newTag.value.trim().toLowerCase()
  if (document.value.tags?.includes(tag)) {
    newTag.value = ''
    return
  }
  
  const tags = [...(document.value.tags || []), tag]
  
  try {
    await documentService.updateDocument(route.params.id, {
      tags: tags.join(',')
    })
    document.value.tags = tags
    newTag.value = ''
  } catch (error) {
    toastStore.error('Failed to add tag')
  }
}

async function removeTag(tag) {
  const tags = document.value.tags.filter(t => t !== tag)
  
  try {
    await documentService.updateDocument(route.params.id, {
      tags: tags.join(',')
    })
    document.value.tags = tags
  } catch (error) {
    toastStore.error('Failed to remove tag')
  }
}

function formatDate(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
