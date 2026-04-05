<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-dark-900 dark:text-white">Documents</h1>
        <p class="text-dark-500 mt-1">Manage your uploaded documents and web pages</p>
      </div>
      <div class="flex gap-3">
        <button @click="showUrlModal = true" class="btn-secondary gap-2">
          <GlobeAltIcon class="w-5 h-5" />
          Add URL
        </button>
        <button @click="$refs.fileInput.click()" class="btn-primary gap-2">
          <CloudArrowUpIcon class="w-5 h-5" />
          Upload
        </button>
        <input 
          ref="fileInput"
          type="file" 
          class="hidden" 
          multiple
          accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.xls,.csv"
          @change="handleFileSelect"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <input
            v-model="search"
            type="text"
            placeholder="Search documents..."
            class="input"
            @input="debouncedSearch"
          >
        </div>
        <select v-model="filterType" class="input w-40" @change="loadDocuments">
          <option value="">All types</option>
          <option value="pdf">PDF</option>
          <option value="docx">Word</option>
          <option value="xlsx">Excel</option>
          <option value="webpage">Web Page</option>
          <option value="markdown">Markdown</option>
          <option value="text">Text</option>
        </select>
        <select v-model="filterKnowledgeBase" class="input w-48" @change="loadDocuments">
          <option value="">All Knowledge Bases</option>
          <option v-for="kb in knowledgeBases" :key="kb._id" :value="kb._id">
            {{ kb.icon }} {{ kb.name }}
          </option>
        </select>
        <select v-model="sortBy" class="input w-40" @change="loadDocuments">
          <option value="createdAt">Newest</option>
          <option value="title">Name</option>
          <option value="type">Type</option>
        </select>
      </div>
    </div>

    <!-- Document grid -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="skeleton h-40 rounded-xl" />
    </div>

    <div v-else-if="documents.length === 0" class="card p-12 text-center">
      <DocumentTextIcon class="w-16 h-16 mx-auto text-dark-300 mb-4" />
      <h3 class="text-lg font-medium text-dark-900 dark:text-white mb-2">
        No documents found
      </h3>
      <p class="text-dark-500 mb-6">
        Upload your first document to get started
      </p>
      <button @click="$refs.fileInput.click()" class="btn-primary">
        Upload Document
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="doc in documents"
        :key="doc._id"
        class="card-hover p-4 group"
        @click="$router.push(`/documents/${doc._id}`)"
      >
        <div class="flex items-start gap-3">
          <div :class="['w-12 h-12 rounded-lg flex items-center justify-center', getTypeColor(doc.type)]">
            <component :is="getTypeIcon(doc.type)" class="w-6 h-6" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-dark-900 dark:text-white truncate">
              {{ doc.title }}
            </h3>
            <p class="text-sm text-dark-500 truncate mt-1">
              {{ doc.description || getTypeLabel(doc.type) }}
            </p>
          </div>
          <div class="transition-opacity">
            <button 
              @click.stop="openMenu(doc, $event)" 
              class="btn-icon"
            >
              <EllipsisVerticalIcon class="w-5 h-5 text-dark-400" />
            </button>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span :class="['badge', getStatusBadge(doc.embeddings?.status)]">
              {{ doc.embeddings?.status || 'pending' }}
            </span>
            <span v-if="doc.knowledgeBase" class="badge badge-primary">
              {{ doc.knowledgeBase.name }}
            </span>
          </div>
          <span class="text-xs text-dark-400">
            {{ formatDate(doc.createdAt) }}
          </span>
        </div>

        <!-- Tags -->
        <div v-if="doc.tags?.length" class="mt-3 flex flex-wrap gap-1">
          <span 
            v-for="tag in doc.tags.slice(0, 3)" 
            :key="tag"
            class="text-xs px-2 py-0.5 bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 rounded"
          >
            {{ tag }}
          </span>
          <span v-if="doc.tags.length > 3" class="text-xs text-dark-400">
            +{{ doc.tags.length - 3 }}
          </span>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="mt-6 flex justify-center gap-2">
      <button
        :disabled="pagination.page === 1"
        class="btn-secondary"
        @click="goToPage(pagination.page - 1)"
      >
        Previous
      </button>
      <span class="flex items-center px-4 text-sm text-dark-500">
        Page {{ pagination.page }} of {{ pagination.pages }}
      </span>
      <button
        :disabled="pagination.page === pagination.pages"
        class="btn-secondary"
        @click="goToPage(pagination.page + 1)"
      >
        Next
      </button>
    </div>

    <!-- Dropdown Menu -->
    <Teleport to="body">
      <div
        v-if="activeMenu"
        class="fixed inset-0 z-40"
        @click="closeMenu"
      />
      <div
        v-if="activeMenu"
        class="fixed z-50 w-48 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-dark-200 dark:border-dark-700 py-1"
        :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }"
      >
        <button
          @click="viewDocument(activeMenu)"
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
        >
          <EyeIcon class="w-4 h-4" />
          View
        </button>
        <button
          @click="reprocessDoc(activeMenu)"
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
        >
          <ArrowPathIcon class="w-4 h-4" />
          Reprocess
        </button>
        <button
          @click="openMoveModal(activeMenu)"
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors"
        >
          <FolderOpenIcon class="w-4 h-4" />
          Move to KB
        </button>
        <hr class="my-1 border-dark-200 dark:border-dark-700" />
        <button
          @click="openDeleteModal(activeMenu)"
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <TrashIcon class="w-4 h-4" />
          Delete
        </button>
      </div>
    </Teleport>

    <!-- Upload Progress Modal -->
    <Modal v-model="showUploadProgress" title="Uploading Documents" :show-close="false">
      <div class="space-y-4">
        <div v-for="upload in uploads" :key="upload.name" class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium truncate">{{ upload.name }}</span>
            <span class="text-sm text-dark-500">{{ upload.progress }}%</span>
          </div>
          <div class="w-full bg-dark-200 dark:bg-dark-700 rounded-full h-2">
            <div 
              class="bg-primary-600 h-2 rounded-full transition-all"
              :style="{ width: upload.progress + '%' }"
            />
          </div>
        </div>
      </div>
    </Modal>

    <!-- Add URL Modal -->
    <Modal v-model="showUrlModal" title="Add Web Page">
      <form @submit.prevent="submitUrl" class="space-y-4">
        <Input
          v-model="urlForm.url"
          type="url"
          label="URL"
          placeholder="https://example.com/article"
          required
        />
        <Input
          v-model="urlForm.title"
          label="Title (optional)"
          placeholder="Custom title for the page"
        />
        <div>
          <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
            Knowledge Base
          </label>
          <select v-model="urlForm.knowledgeBaseId" class="input">
            <option value="">None</option>
            <option v-for="kb in knowledgeBases" :key="kb._id" :value="kb._id">
              {{ kb.icon }} {{ kb.name }}
            </option>
          </select>
        </div>
        <Input
          v-model="urlForm.tags"
          label="Tags (comma separated)"
          placeholder="research, article, ai"
        />
      </form>
      <template #footer>
        <button @click="showUrlModal = false" class="btn-secondary">Cancel</button>
        <button @click="submitUrl" class="btn-primary" :disabled="!urlForm.url">
          Add URL
        </button>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteModal" title="Delete Document">
      <p class="text-dark-600 dark:text-dark-400">
        Are you sure you want to delete
        <strong class="text-dark-900 dark:text-white">{{ docToDelete?.title }}</strong>?
        This action cannot be undone.
      </p>
      <template #footer>
        <button @click="showDeleteModal = false" class="btn-secondary">Cancel</button>
        <button @click="deleteDocument" class="btn-danger" :disabled="deleting">
          {{ deleting ? 'Deleting...' : 'Delete' }}
        </button>
      </template>
    </Modal>

    <!-- Move to Knowledge Base Modal -->
    <Modal v-model="showMoveModal" title="Move to Knowledge Base">
      <div class="space-y-3">
        <p class="text-sm text-dark-600 dark:text-dark-400">
          Select a knowledge base for
          <strong class="text-dark-900 dark:text-white">{{ docToMove?.title }}</strong>
        </p>
        <select v-model="moveKbId" class="input">
          <option value="">None</option>
          <option v-for="kb in knowledgeBases" :key="kb._id" :value="kb._id">
            {{ kb.icon }} {{ kb.name }}
          </option>
        </select>
      </div>
      <template #footer>
        <button @click="showMoveModal = false" class="btn-secondary">Cancel</button>
        <button @click="moveDocument" class="btn-primary" :disabled="moving || !moveKbId">
          {{ moving ? 'Moving...' : 'Move' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores'
import { documentService, knowledgeBaseService } from '@/services'
import { formatDistanceToNow } from 'date-fns'
import { useDebounceFn } from '@vueuse/core'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  GlobeAltIcon,
  EllipsisVerticalIcon,
  DocumentIcon,
  CodeBracketIcon,
  EyeIcon,
  ArrowPathIcon,
  FolderOpenIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const toastStore = useToastStore()

const loading = ref(true)
const documents = ref([])
const knowledgeBases = ref([])
const pagination = ref({ page: 1, pages: 1, total: 0 })

// Filters
const search = ref('')
const filterType = ref('')
const filterKnowledgeBase = ref('')
const sortBy = ref('createdAt')

// Modals
const showUploadProgress = ref(false)
const showUrlModal = ref(false)
const uploads = ref([])

// Dropdown menu
const activeMenu = ref(null)
const menuPosition = reactive({ x: 0, y: 0 })

// Delete modal
const showDeleteModal = ref(false)
const docToDelete = ref(null)
const deleting = ref(false)

// Move modal
const showMoveModal = ref(false)
const docToMove = ref(null)
const moveKbId = ref('')
const moving = ref(false)

const urlForm = reactive({
  url: '',
  title: '',
  knowledgeBaseId: '',
  tags: ''
})

onMounted(async () => {
  await Promise.all([
    loadDocuments(),
    loadKnowledgeBases()
  ])
})

async function loadDocuments(page = 1) {
  loading.value = true
  try {
    const response = await documentService.getDocuments({
      page,
      limit: 12,
      type: filterType.value || undefined,
      knowledgeBaseId: filterKnowledgeBase.value || undefined,
      search: search.value || undefined,
      sortBy: sortBy.value,
      sortOrder: 'desc'
    })
    documents.value = response.documents
    pagination.value = response.pagination
  } catch (error) {
    toastStore.error('Failed to load documents')
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

const debouncedSearch = useDebounceFn(() => {
  loadDocuments()
}, 300)

function goToPage(page) {
  loadDocuments(page)
}

async function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  uploads.value = files.map(f => ({ name: f.name, progress: 0 }))
  showUploadProgress.value = true

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const formData = new FormData()
    formData.append('file', file)
    
    if (filterKnowledgeBase.value) {
      formData.append('knowledgeBaseId', filterKnowledgeBase.value)
    }

    try {
      await documentService.uploadDocument(formData, (progress) => {
        uploads.value[i].progress = progress
      })
      toastStore.success(`${file.name} uploaded`)
    } catch (error) {
      toastStore.error(`Failed to upload ${file.name}`)
    }
  }

  showUploadProgress.value = false
  event.target.value = ''
  await loadDocuments()
}

async function submitUrl() {
  if (!urlForm.url) return

  try {
    await documentService.ingestUrl(
      urlForm.url,
      urlForm.knowledgeBaseId || undefined,
      urlForm.title || undefined,
      urlForm.tags || undefined
    )
    toastStore.success('URL added successfully')
    showUrlModal.value = false
    
    // Reset form
    urlForm.url = ''
    urlForm.title = ''
    urlForm.knowledgeBaseId = ''
    urlForm.tags = ''
    
    await loadDocuments()
  } catch (error) {
    toastStore.error(error.response?.data?.error || 'Failed to add URL')
  }
}

function formatDate(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function getTypeIcon(type) {
  const icons = {
    pdf: DocumentIcon,
    webpage: GlobeAltIcon,
    code: CodeBracketIcon,
    docx: DocumentTextIcon,
    xlsx: DocumentTextIcon,
    markdown: DocumentTextIcon,
    text: DocumentTextIcon
  }
  return icons[type] || DocumentIcon
}

function getTypeColor(type) {
  const colors = {
    pdf: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    webpage: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    code: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    docx: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    xlsx: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
  }
  return colors[type] || 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-400'
}

function getTypeLabel(type) {
  const labels = {
    pdf: 'PDF Document',
    webpage: 'Web Page',
    code: 'Code File',
    docx: 'Word Document',
    xlsx: 'Excel Spreadsheet',
    markdown: 'Markdown File',
    text: 'Text File'
  }
  return labels[type] || 'Document'
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

function openMenu(doc, event) {
  const rect = event.currentTarget.getBoundingClientRect()
  let x = rect.left
  let y = rect.bottom + 4
  if (x + 192 > window.innerWidth) {
    x = rect.right - 192
  }
  menuPosition.x = x
  menuPosition.y = y
  activeMenu.value = doc
}

function closeMenu() {
  activeMenu.value = null
}

function viewDocument(doc) {
  closeMenu()
  router.push(`/documents/${doc._id}`)
}

async function reprocessDoc(doc) {
  closeMenu()
  try {
    await documentService.reprocessDocument(doc._id)
    toastStore.success('Document queued for reprocessing')
    await loadDocuments()
  } catch (error) {
    toastStore.error('Failed to reprocess document')
  }
}

function openDeleteModal(doc) {
  closeMenu()
  docToDelete.value = doc
  showDeleteModal.value = true
}

async function deleteDocument() {
  if (!docToDelete.value) return
  deleting.value = true
  try {
    await documentService.deleteDocument(docToDelete.value._id)
    toastStore.success('Document deleted')
    showDeleteModal.value = false
    docToDelete.value = null
    await loadDocuments()
  } catch (error) {
    toastStore.error('Failed to delete document')
  } finally {
    deleting.value = false
  }
}

function openMoveModal(doc) {
  closeMenu()
  docToMove.value = doc
  moveKbId.value = doc.knowledgeBase?._id || ''
  showMoveModal.value = true
}

async function moveDocument() {
  if (!docToMove.value) return
  moving.value = true
  try {
    await documentService.updateDocument(docToMove.value._id, {
      knowledgeBaseId: moveKbId.value || null
    })
    toastStore.success('Document moved successfully')
    showMoveModal.value = false
    docToMove.value = null
    await loadDocuments()
  } catch (error) {
    toastStore.error('Failed to move document')
  } finally {
    moving.value = false
  }
}
</script>
