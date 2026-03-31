<template>
  <div class="p-6">
    <!-- Stats overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div v-for="stat in stats" :key="stat.name" class="card p-6">
        <div class="flex items-center gap-4">
          <div :class="['p-3 rounded-lg', stat.bgColor]">
            <component :is="stat.icon" :class="['w-6 h-6', stat.iconColor]" />
          </div>
          <div>
            <p class="text-2xl font-bold text-dark-900 dark:text-white">
              {{ stat.value }}
            </p>
            <p class="text-sm text-dark-500">{{ stat.name }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Recent chats -->
      <div class="lg:col-span-2 card">
        <div class="p-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-dark-900 dark:text-white">Recent Chats</h2>
          <router-link to="/chat" class="text-sm text-primary-600 hover:text-primary-500">
            View all
          </router-link>
        </div>
        <div class="divide-y divide-dark-200 dark:divide-dark-700">
          <router-link
            v-for="chat in recentChats"
            :key="chat.id"
            :to="`/chat/${chat.id}`"
            class="block p-4 hover:bg-dark-50 dark:hover:bg-dark-750 transition-colors"
          >
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <ChatBubbleLeftRightIcon class="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-dark-900 dark:text-white truncate">
                  {{ chat.title }}
                </p>
                <p class="text-xs text-dark-500 mt-1">
                  {{ chat.knowledgeBase?.name || 'All documents' }} · {{ formatDate(chat.updatedAt) }}
                </p>
              </div>
            </div>
          </router-link>
          <div v-if="recentChats.length === 0" class="p-8 text-center text-dark-500">
            <ChatBubbleLeftRightIcon class="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No chats yet. Start a new conversation!</p>
          </div>
        </div>
      </div>

      <!-- Quick upload -->
      <div class="card">
        <div class="p-4 border-b border-dark-200 dark:border-dark-700">
          <h2 class="text-lg font-semibold text-dark-900 dark:text-white">Quick Upload</h2>
        </div>
        <div class="p-4">
          <div 
            class="border-2 border-dashed border-dark-300 dark:border-dark-600 rounded-lg p-6 text-center hover:border-primary-500 transition-colors cursor-pointer"
            @click="$refs.fileInput.click()"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <CloudArrowUpIcon class="w-10 h-10 mx-auto text-dark-400 mb-3" />
            <p class="text-sm text-dark-600 dark:text-dark-400 mb-1">
              Drop files here or click to upload
            </p>
            <p class="text-xs text-dark-500">
              PDF, DOCX, TXT, MD, and more
            </p>
            <input 
              ref="fileInput"
              type="file" 
              class="hidden" 
              multiple
              accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.xls,.csv"
              @change="handleFileSelect"
            />
          </div>
          
          <div class="mt-4 space-y-2">
            <router-link to="/documents" class="btn-secondary w-full justify-center gap-2">
              <DocumentTextIcon class="w-4 h-4" />
              View All Documents
            </router-link>
            <router-link to="/knowledge-bases" class="btn-secondary w-full justify-center gap-2">
              <BookOpenIcon class="w-4 h-4" />
              Manage Knowledge Bases
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent documents -->
    <div class="card">
      <div class="p-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-dark-900 dark:text-white">Recent Documents</h2>
        <router-link to="/documents" class="text-sm text-primary-600 hover:text-primary-500">
          View all
        </router-link>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-dark-50 dark:bg-dark-800">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">
                Name
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">
                Type
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">
                Added
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dark-200 dark:divide-dark-700">
            <tr 
              v-for="doc in recentDocuments"
              :key="doc.id"
              class="hover:bg-dark-50 dark:hover:bg-dark-750 cursor-pointer"
              @click="$router.push(`/documents/${doc.id}`)"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div :class="['w-8 h-8 rounded flex items-center justify-center', getTypeColor(doc.type)]">
                    <component :is="getTypeIcon(doc.type)" class="w-4 h-4" />
                  </div>
                  <span class="text-sm font-medium text-dark-900 dark:text-white truncate max-w-xs">
                    {{ doc.title }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-dark-500 uppercase">
                {{ doc.type }}
              </td>
              <td class="px-4 py-3">
                <span :class="['badge', getStatusBadge(doc.embeddings?.status)]">
                  {{ doc.embeddings?.status || 'pending' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-dark-500">
                {{ formatDate(doc.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="recentDocuments.length === 0" class="p-8 text-center text-dark-500">
          <DocumentTextIcon class="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No documents yet. Upload your first document!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores'
import { documentService, chatService, userService } from '@/services'
import { formatDistanceToNow } from 'date-fns'
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  GlobeAltIcon,
  CodeBracketIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const toastStore = useToastStore()

const recentDocuments = ref([])
const recentChats = ref([])
const usage = ref({})

const stats = computed(() => [
  {
    name: 'Documents',
    value: usage.value?.documentsCount || 0,
    icon: DocumentTextIcon,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    name: 'Chats',
    value: usage.value?.chatsCount || 0,
    icon: ChatBubbleLeftRightIcon,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  {
    name: 'Knowledge Bases',
    value: usage.value?.knowledgeBasesCount || 0,
    icon: BookOpenIcon,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  {
    name: 'Queries',
    value: usage.value?.queriesCount || 0,
    icon: ChatBubbleLeftRightIcon,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400'
  }
])

onMounted(async () => {
  await Promise.all([
    loadDocuments(),
    loadChats(),
    loadUsage()
  ])
})

async function loadDocuments() {
  try {
    const response = await documentService.getDocuments({ limit: 5 })
    recentDocuments.value = response.documents
  } catch (error) {
    console.error('Failed to load documents:', error)
  }
}

async function loadChats() {
  try {
    const response = await chatService.getChats({ limit: 5 })
    recentChats.value = response.chats
  } catch (error) {
    console.error('Failed to load chats:', error)
  }
}

async function loadUsage() {
  try {
    const response = await userService.getUsage()
    usage.value = response.usage
  } catch (error) {
    console.error('Failed to load usage:', error)
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

function getStatusBadge(status) {
  const badges = {
    completed: 'badge-success',
    processing: 'badge-warning',
    pending: 'badge-primary',
    failed: 'badge-danger'
  }
  return badges[status] || 'badge-primary'
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  uploadFiles(files)
}

function handleDrop(event) {
  const files = Array.from(event.dataTransfer.files)
  uploadFiles(files)
}

async function uploadFiles(files) {
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      await documentService.uploadDocument(formData)
      toastStore.success(`${file.name} uploaded successfully`)
    } catch (error) {
      toastStore.error(`Failed to upload ${file.name}`)
    }
  }
  
  // Refresh documents list
  await loadDocuments()
  await loadUsage()
}
</script>
