<template>
  <div class="w-72 flex-shrink-0 flex flex-col bg-white dark:bg-dark-800 overflow-hidden">

    <!-- Header -->
    <div class="px-4 py-3 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between flex-shrink-0">
      <h2 class="text-sm font-semibold text-dark-900 dark:text-white">Sources</h2>
      <button
        @click="showAddMenu = !showAddMenu"
        class="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
      >
        <PlusIcon class="w-3.5 h-3.5" />
        Add source
      </button>
    </div>

    <!-- Add source panel -->
    <Transition name="slide-down">
      <div v-if="showAddMenu" class="border-b border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-700/50 flex-shrink-0">
        <div class="p-3 space-y-0.5">
          <p class="text-xs font-medium text-dark-400 px-2 pb-1.5">Choose source type</p>

          <!-- File upload -->
          <label class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-dark-700 cursor-pointer transition-colors group">
            <input type="file" multiple accept=".pdf,.docx,.xlsx,.csv,.txt,.md" class="hidden" ref="fileInputRef" @change="handleFileUpload" />
            <div class="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <DocumentArrowUpIcon class="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p class="text-sm font-medium text-dark-900 dark:text-white">Upload file</p>
              <p class="text-xs text-dark-400">PDF, DOCX, XLSX, TXT, MD</p>
            </div>
          </label>

          <!-- URL -->
          <button
            @click="showUrlInput = true; showAddMenu = false"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-dark-700 transition-colors"
          >
            <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <GlobeAltIcon class="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="text-left">
              <p class="text-sm font-medium text-dark-900 dark:text-white">Website URL</p>
              <p class="text-xs text-dark-400">Scrape any webpage</p>
            </div>
          </button>
        </div>
      </div>
    </Transition>

    <!-- URL input bar -->
    <Transition name="slide-down">
      <div v-if="showUrlInput" class="p-3 border-b border-dark-200 dark:border-dark-700 flex-shrink-0">
        <p class="text-xs font-medium text-dark-500 mb-2">Add website URL</p>
        <div class="flex gap-2">
          <input
            v-model="urlInput"
            ref="urlInputRef"
            type="url"
            placeholder="https://..."
            class="input text-sm py-2 flex-1"
            @keydown.enter.prevent="addUrl"
            @keydown.esc="showUrlInput = false; urlInput = ''"
          />
          <button
            @click="addUrl"
            :disabled="!urlInput.trim() || addingUrl"
            class="btn-primary px-3 py-2 text-xs disabled:opacity-50"
          >
            <ArrowRightIcon v-if="!addingUrl" class="w-3.5 h-3.5" />
            <div v-else class="spinner w-3.5 h-3.5" />
          </button>
          <button
            @click="showUrlInput = false; urlInput = ''"
            class="btn-icon text-dark-400"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </Transition>

    <!-- Upload progress -->
    <div v-if="uploadingFiles.length" class="px-3 py-2 border-b border-dark-200 dark:border-dark-700 flex-shrink-0">
      <div
        v-for="f in uploadingFiles"
        :key="f.name"
        class="flex items-center gap-2 py-1"
      >
        <div class="spinner w-3.5 h-3.5 flex-shrink-0" />
        <p class="text-xs text-dark-500 truncate flex-1">{{ f.name }}</p>
      </div>
    </div>

    <!-- Source list -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading skeleton -->
      <div v-if="loading" class="p-3 space-y-2">
        <div v-for="i in 4" :key="i" class="skeleton h-14 rounded-lg" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="documents.length === 0"
        class="flex flex-col items-center justify-center h-full px-6 text-center"
      >
        <div class="w-12 h-12 rounded-full bg-dark-100 dark:bg-dark-700 flex items-center justify-center mb-3">
          <DocumentPlusIcon class="w-6 h-6 text-dark-400" />
        </div>
        <p class="text-sm font-medium text-dark-700 dark:text-dark-300">No sources yet</p>
        <p class="text-xs text-dark-400 mt-1 leading-relaxed">
          Add documents or websites to ground AI responses in your content
        </p>
        <button
          @click="showAddMenu = true"
          class="mt-4 text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
        >
          + Add your first source
        </button>
      </div>

      <!-- Source items -->
      <div v-else class="p-2 space-y-0.5">
        <button
          v-for="doc in documents"
          :key="doc._id"
          @click="previewDoc = doc"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
            previewDoc?._id === doc._id
              ? 'bg-primary-50 dark:bg-primary-900/20'
              : 'hover:bg-dark-50 dark:hover:bg-dark-700/60'
          ]"
        >
          <!-- Type emoji icon -->
          <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base', typeIconBg(doc.type)]">
            {{ typeEmoji(doc.type) }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-dark-900 dark:text-white truncate leading-tight">
              {{ doc.title || 'Untitled' }}
            </p>
            <p class="text-xs text-dark-400 mt-0.5 truncate">
              {{ typeLabel(doc.type) }} · {{ formatDate(doc.createdAt) }}
            </p>
          </div>

          <!-- Status dot -->
          <span
            :class="['w-2 h-2 rounded-full flex-shrink-0', statusDotClass(doc.embeddings?.status)]"
            :title="doc.embeddings?.status || 'pending'"
          />
        </button>
      </div>
    </div>

    <!-- Source count footer -->
    <div
      v-if="documents.length > 0"
      class="px-4 py-2.5 border-t border-dark-200 dark:border-dark-700 flex-shrink-0"
    >
      <p class="text-xs text-dark-400 text-center">
        {{ readySources }} of {{ documents.length }} sources ready
      </p>
    </div>

    <!-- Source preview drawer (Teleport to body) -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="previewDoc"
          class="fixed inset-0 z-50 flex justify-end"
          @click.self="previewDoc = null"
        >
          <div class="bg-black/30 absolute inset-0" @click="previewDoc = null" />
          <div class="relative w-full max-w-lg bg-white dark:bg-dark-800 shadow-2xl flex flex-col h-full z-10">

            <!-- Preview header -->
            <div class="px-4 py-3 border-b border-dark-200 dark:border-dark-700 flex items-center gap-3 flex-shrink-0">
              <div :class="['w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0', typeIconBg(previewDoc.type)]">
                {{ typeEmoji(previewDoc.type) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-dark-900 dark:text-white truncate">{{ previewDoc.title }}</p>
                <p class="text-xs text-dark-400">{{ typeLabel(previewDoc.type) }}</p>
              </div>
              <button @click="previewDoc = null" class="btn-icon text-dark-400">
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <!-- Preview body -->
            <div class="flex-1 overflow-y-auto p-4">

              <!-- Status / stats -->
              <div class="grid grid-cols-3 gap-3 mb-5">
                <div class="bg-dark-50 dark:bg-dark-700 rounded-lg p-3 text-center">
                  <p class="text-xs text-dark-400 mb-0.5">Status</p>
                  <span :class="['badge', statusBadgeClass(previewDoc.embeddings?.status)]">
                    {{ previewDoc.embeddings?.status || 'pending' }}
                  </span>
                </div>
                <div class="bg-dark-50 dark:bg-dark-700 rounded-lg p-3 text-center">
                  <p class="text-xs text-dark-400 mb-0.5">Chunks</p>
                  <p class="text-sm font-semibold text-dark-900 dark:text-white">
                    {{ previewDoc.embeddings?.chunksCount || 0 }}
                  </p>
                </div>
                <div class="bg-dark-50 dark:bg-dark-700 rounded-lg p-3 text-center">
                  <p class="text-xs text-dark-400 mb-0.5">Words</p>
                  <p class="text-sm font-semibold text-dark-900 dark:text-white">
                    {{ formatNumber(previewDoc.content?.wordCount || 0) }}
                  </p>
                </div>
              </div>

              <!-- Summary -->
              <div v-if="previewDoc.content?.summary" class="mb-5">
                <h3 class="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Summary</h3>
                <p class="text-sm text-dark-700 dark:text-dark-300 leading-relaxed">
                  {{ previewDoc.content.summary }}
                </p>
              </div>

              <!-- Source URL -->
              <div v-if="previewDoc.sourceUrl" class="mb-5">
                <h3 class="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Source URL</h3>
                <a
                  :href="previewDoc.sourceUrl"
                  target="_blank"
                  rel="noopener"
                  class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 break-all"
                >
                  {{ previewDoc.sourceUrl }}
                </a>
              </div>

              <!-- Processing state -->
              <div v-if="previewDoc.embeddings?.status === 'processing'" class="flex items-center gap-2 text-sm text-dark-500 py-4">
                <div class="spinner w-4 h-4" />
                Processing document — this may take a moment
              </div>
              <div v-else-if="previewDoc.embeddings?.status === 'failed'" class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">
                Processing failed: {{ previewDoc.embeddings?.error || 'Unknown error' }}
                <button @click="reprocessDoc(previewDoc._id)" class="block mt-2 text-xs font-medium underline">
                  Retry processing
                </button>
              </div>
            </div>

            <!-- Preview footer -->
            <div class="px-4 py-3 border-t border-dark-200 dark:border-dark-700 flex items-center justify-between flex-shrink-0">
              <button
                @click="deleteDoc(previewDoc._id)"
                class="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
              >
                <TrashIcon class="w-3.5 h-3.5" />
                Remove source
              </button>
              <span class="text-xs text-dark-400">Added {{ formatDate(previewDoc.createdAt) }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useToastStore } from '@/stores'
import { documentService } from '@/services'
import { formatDistanceToNow } from 'date-fns'
import {
  PlusIcon,
  DocumentArrowUpIcon,
  DocumentPlusIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  kbId: { type: String, required: true },
  documents: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['refresh'])

const toastStore = useToastStore()

const showAddMenu = ref(false)
const showUrlInput = ref(false)
const urlInput = ref('')
const urlInputRef = ref(null)
const fileInputRef = ref(null)
const addingUrl = ref(false)
const uploadingFiles = ref([])
const previewDoc = ref(null)

const readySources = computed(() =>
  props.documents.filter(d => d.embeddings?.status === 'completed').length
)

watch(showUrlInput, async (val) => {
  if (val) await nextTick(() => urlInputRef.value?.focus())
})

function typeEmoji(type) {
  const map = { pdf: '📄', webpage: '🌐', docx: '📝', xlsx: '📊', pptx: '📊', markdown: '📋', text: '📃', code: '💻', other: '📎' }
  return map[type] || '📎'
}

function typeLabel(type) {
  const map = { pdf: 'PDF', webpage: 'Website', docx: 'Word doc', xlsx: 'Spreadsheet', pptx: 'Presentation', markdown: 'Markdown', text: 'Text file', code: 'Code', other: 'Document' }
  return map[type] || 'Document'
}

function typeIconBg(type) {
  const map = {
    pdf: 'bg-red-100 dark:bg-red-900/30',
    webpage: 'bg-blue-100 dark:bg-blue-900/30',
    docx: 'bg-indigo-100 dark:bg-indigo-900/30',
    xlsx: 'bg-green-100 dark:bg-green-900/30',
    pptx: 'bg-orange-100 dark:bg-orange-900/30',
    markdown: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'bg-dark-100 dark:bg-dark-700',
    code: 'bg-yellow-100 dark:bg-yellow-900/30'
  }
  return map[type] || 'bg-dark-100 dark:bg-dark-700'
}

function statusDotClass(status) {
  if (status === 'completed') return 'bg-green-400'
  if (status === 'processing') return 'bg-yellow-400 animate-pulse'
  if (status === 'failed') return 'bg-red-400'
  return 'bg-dark-300 dark:bg-dark-600'
}

function statusBadgeClass(status) {
  if (status === 'completed') return 'badge-success'
  if (status === 'processing') return 'badge-warning'
  if (status === 'failed') return 'badge-danger'
  return 'badge-primary'
}

function formatDate(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

async function handleFileUpload(event) {
  const files = Array.from(event.target.files)
  if (!files.length) return
  showAddMenu.value = false
  uploadingFiles.value = files.map(f => ({ name: f.name }))

  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('knowledgeBaseId', props.kbId)
    try {
      await documentService.uploadDocument(formData)
      toastStore.success(`"${file.name}" added`)
    } catch {
      toastStore.error(`Failed to add "${file.name}"`)
    }
    uploadingFiles.value = uploadingFiles.value.filter(f => f.name !== file.name)
  }
  event.target.value = ''
  emit('refresh')
}

async function addUrl() {
  const url = urlInput.value.trim()
  if (!url || addingUrl.value) return
  addingUrl.value = true
  try {
    await documentService.ingestUrl(url, props.kbId)
    toastStore.success('Website added as source')
    urlInput.value = ''
    showUrlInput.value = false
    emit('refresh')
  } catch {
    toastStore.error('Failed to add URL')
  } finally {
    addingUrl.value = false
  }
}

async function deleteDoc(id) {
  if (!confirm('Remove this source from the notebook?')) return
  try {
    await documentService.deleteDocument(id)
    previewDoc.value = null
    toastStore.success('Source removed')
    emit('refresh')
  } catch {
    toastStore.error('Failed to remove source')
  }
}

async function reprocessDoc(id) {
  try {
    await documentService.reprocessDocument(id)
    toastStore.success('Reprocessing started')
    emit('refresh')
  } catch {
    toastStore.error('Failed to reprocess')
  }
}
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 200px;
  opacity: 1;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
.drawer-fade-enter-active .relative,
.drawer-fade-leave-active .relative {
  transition: transform 0.25s ease;
}
.drawer-fade-enter-from .relative,
.drawer-fade-leave-to .relative {
  transform: translateX(100%);
}
</style>
