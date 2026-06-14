<template>
  <div class="min-h-full bg-dark-50 dark:bg-dark-900">

    <!-- Page header -->
    <div class="max-w-6xl mx-auto px-6 pt-10 pb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-dark-900 dark:text-white">Notebooks</h1>
          <p class="text-dark-500 mt-1.5">Your AI-powered research workspaces</p>
        </div>
        <button @click="showCreateModal = true" class="btn-primary gap-2 px-5">
          <PlusIcon class="w-4 h-4" />
          New notebook
        </button>
      </div>
    </div>

    <!-- Toolbar: search + sort + view toggle -->
    <div class="max-w-6xl mx-auto px-6 pb-4">
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search notebooks…"
            class="input pl-9 py-2 text-sm"
          />
        </div>

        <!-- Sort -->
        <select
          v-model="sortBy"
          class="text-sm bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg px-3 py-2 text-dark-700 dark:text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="recent">Most recent</option>
          <option value="az">Title A–Z</option>
          <option value="za">Title Z–A</option>
        </select>

        <!-- View toggle -->
        <div class="flex items-center bg-dark-100 dark:bg-dark-800 rounded-lg p-1 gap-0.5">
          <button
            @click="viewMode = 'grid'"
            :class="['p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-white dark:bg-dark-700 shadow-sm text-dark-900 dark:text-white' : 'text-dark-400 hover:text-dark-600 dark:hover:text-dark-300']"
            title="Grid view"
          >
            <Squares2X2Icon class="w-4 h-4" />
          </button>
          <button
            @click="viewMode = 'list'"
            :class="['p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-white dark:bg-dark-700 shadow-sm text-dark-900 dark:text-white' : 'text-dark-400 hover:text-dark-600 dark:hover:text-dark-300']"
            title="List view"
          >
            <ListBulletIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-6xl mx-auto px-6 pb-10">

      <!-- Loading -->
      <div v-if="loading" :class="viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'">
        <div v-for="i in 8" :key="i" :class="viewMode === 'grid' ? 'skeleton h-48 rounded-2xl' : 'skeleton h-16 rounded-xl'" />
      </div>

      <!-- Empty: no notebooks at all -->
      <div v-else-if="knowledgeBases.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
        <div class="w-20 h-20 rounded-3xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-6">
          <BookOpenIcon class="w-10 h-10 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="text-xl font-semibold text-dark-900 dark:text-white mb-2">Create your first notebook</h2>
        <p class="text-dark-500 max-w-sm mb-8">
          A notebook brings your sources, chat, and notes together in one workspace.
        </p>
        <button @click="showCreateModal = true" class="btn-primary gap-2 px-6">
          <PlusIcon class="w-4 h-4" />
          New notebook
        </button>
      </div>

      <!-- Empty: no search results -->
      <div v-else-if="filteredAndSorted.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <MagnifyingGlassIcon class="w-10 h-10 text-dark-300 dark:text-dark-600 mb-3" />
        <p class="text-dark-500 font-medium">No notebooks match "<span class="text-dark-700 dark:text-dark-300">{{ searchQuery }}</span>"</p>
        <button @click="searchQuery = ''" class="mt-3 text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400">Clear search</button>
      </div>

      <!-- LIST view -->
      <div v-else-if="viewMode === 'list'" class="space-y-1.5">
        <!-- Create new row -->
        <button
          @click="showCreateModal = true"
          class="w-full flex items-center gap-4 px-4 py-3 rounded-xl border-2 border-dashed border-dark-300 dark:border-dark-600 hover:border-primary-400 dark:hover:border-primary-600 transition-all text-dark-400 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <div class="w-9 h-9 rounded-lg border-2 border-current flex items-center justify-center flex-shrink-0">
            <PlusIcon class="w-4 h-4" />
          </div>
          <span class="text-sm font-medium">New notebook</span>
        </button>

        <div
          v-for="kb in filteredAndSorted"
          :key="kb._id"
          @click="$router.push(`/knowledge-bases/${kb._id}`)"
          class="group flex items-center gap-4 px-4 py-3 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 hover:border-dark-300 dark:hover:border-dark-600 hover:shadow-sm transition-all cursor-pointer"
        >
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
            :style="{ backgroundColor: (kb.color || '#3b82f6') + '18' }"
          >{{ kb.icon || '📚' }}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-dark-900 dark:text-white truncate">{{ kb.name }}</p>
            <p v-if="kb.description" class="text-xs text-dark-400 truncate">{{ kb.description }}</p>
          </div>
          <div class="flex items-center gap-4 text-xs text-dark-400 flex-shrink-0">
            <span class="flex items-center gap-1">
              <DocumentTextIcon class="w-3.5 h-3.5" />
              {{ kb.stats?.documentsCount || 0 }}
            </span>
            <span>{{ formatDate(kb.updatedAt) }}</span>
          </div>
          <!-- Context menu -->
          <div class="relative opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
            <button @click="openMenu(kb._id)" class="btn-icon p-1.5 text-dark-400">
              <EllipsisHorizontalIcon class="w-4 h-4" />
            </button>
            <div
              v-if="openMenuId === kb._id"
              class="absolute right-0 top-8 w-40 bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-dark-200 dark:border-dark-700 z-20 py-1"
            >
              <button @click="editKb(kb); openMenuId = null" class="dropdown-item w-full text-left text-sm">
                <PencilIcon class="w-4 h-4" /> Rename
              </button>
              <button
                @click="deleteKb(kb._id); openMenuId = null"
                class="dropdown-item w-full text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <TrashIcon class="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- GRID view -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        <!-- Create new card -->
        <button
          @click="showCreateModal = true"
          class="group h-48 rounded-2xl border-2 border-dashed border-dark-300 dark:border-dark-600 hover:border-primary-400 dark:hover:border-primary-600 transition-all flex flex-col items-center justify-center gap-3 text-dark-400 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <div class="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center">
            <PlusIcon class="w-5 h-5" />
          </div>
          <span class="text-sm font-medium">New notebook</span>
        </button>

        <!-- Notebook cards -->
        <div
          v-for="kb in filteredAndSorted"
          :key="kb._id"
          @click="$router.push(`/knowledge-bases/${kb._id}`)"
          class="group relative h-48 rounded-2xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 hover:border-dark-300 dark:hover:border-dark-600 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
        >
          <!-- Color accent top bar -->
          <div class="h-1.5 w-full flex-shrink-0" :style="{ backgroundColor: kb.color || '#3b82f6' }" />

          <!-- Body -->
          <div class="flex-1 p-4 flex flex-col min-h-0">
            <div class="flex items-start justify-between mb-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                :style="{ backgroundColor: (kb.color || '#3b82f6') + '18' }"
              >
                {{ kb.icon || '📚' }}
              </div>

              <!-- Context menu -->
              <div class="relative opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                <button @click="openMenu(kb._id)" class="btn-icon p-1.5 text-dark-400">
                  <EllipsisHorizontalIcon class="w-4 h-4" />
                </button>
                <div
                  v-if="openMenuId === kb._id"
                  class="absolute right-0 top-8 w-40 bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-dark-200 dark:border-dark-700 z-20 py-1"
                >
                  <button @click="editKb(kb); openMenuId = null" class="dropdown-item w-full text-left text-sm">
                    <PencilIcon class="w-4 h-4" /> Rename
                  </button>
                  <button
                    @click="deleteKb(kb._id); openMenuId = null"
                    class="dropdown-item w-full text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <TrashIcon class="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            </div>

            <h3 class="font-semibold text-dark-900 dark:text-white leading-snug line-clamp-2 mb-auto">
              {{ kb.name }}
            </h3>
            <p v-if="kb.description" class="text-xs text-dark-400 line-clamp-1 mt-1.5">
              {{ kb.description }}
            </p>
          </div>

          <!-- Footer -->
          <div class="px-4 py-2.5 border-t border-dark-100 dark:border-dark-700 flex items-center justify-between flex-shrink-0">
            <div class="flex items-center gap-1 text-xs text-dark-400">
              <DocumentTextIcon class="w-3.5 h-3.5" />
              {{ kb.stats?.documentsCount || 0 }} sources
            </div>
            <span class="text-xs text-dark-400">{{ formatDate(kb.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showCreateModal = false"
      >
        <div class="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <h2 class="text-lg font-semibold text-dark-900 dark:text-white mb-5">Create notebook</h2>
          <div class="space-y-4">
            <div class="flex items-center gap-4">
              <!-- Emoji picker trigger -->
              <div class="relative">
                <button
                  type="button"
                  @click="showEmojiPicker = !showEmojiPicker"
                  class="w-14 h-14 rounded-xl border-2 border-dark-200 dark:border-dark-700 text-3xl flex items-center justify-center hover:border-primary-400 transition-colors"
                >
                  {{ createForm.icon }}
                </button>
                <div
                  v-if="showEmojiPicker"
                  class="absolute top-16 left-0 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl shadow-xl p-3 z-10 grid grid-cols-5 gap-1 w-44"
                  @click.stop
                >
                  <button
                    v-for="emoji in EMOJIS"
                    :key="emoji"
                    @click="createForm.icon = emoji; showEmojiPicker = false"
                    class="text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
                  >{{ emoji }}</button>
                </div>
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">Name</label>
                <input
                  v-model="createForm.name"
                  ref="nameInputRef"
                  type="text"
                  placeholder="e.g. Research Project, Book Notes…"
                  class="input"
                  @keydown.enter.prevent="createKnowledgeBase"
                />
              </div>
            </div>

            <!-- Color swatches -->
            <div>
              <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">Color</label>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="color in COLORS"
                  :key="color"
                  type="button"
                  @click="createForm.color = color"
                  class="w-7 h-7 rounded-full transition-transform hover:scale-110 ring-offset-2 dark:ring-offset-dark-800"
                  :style="{ backgroundColor: color }"
                  :class="createForm.color === color ? 'ring-2 ring-dark-400 scale-110' : ''"
                />
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
                Description <span class="font-normal text-dark-400">(optional)</span>
              </label>
              <textarea
                v-model="createForm.description"
                placeholder="What is this notebook about?"
                class="input resize-none"
                rows="2"
              />
            </div>
          </div>
          <div class="flex gap-3 justify-end mt-6">
            <button @click="showCreateModal = false" class="btn-secondary">Cancel</button>
            <button
              @click="createKnowledgeBase"
              :disabled="!createForm.name.trim() || creating"
              class="btn-primary"
            >
              {{ creating ? 'Creating…' : 'Create notebook' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit modal -->
    <Teleport to="body">
      <div
        v-if="showEditModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showEditModal = false"
      >
        <div class="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h2 class="text-lg font-semibold text-dark-900 dark:text-white mb-4">Rename notebook</h2>
          <input v-model="editForm.name" type="text" class="input mb-3" @keydown.enter.prevent="saveEdit" />
          <textarea v-model="editForm.description" class="input resize-none mb-4" rows="2" placeholder="Description (optional)" />
          <div class="flex gap-3 justify-end">
            <button @click="showEditModal = false" class="btn-secondary">Cancel</button>
            <button @click="saveEdit" :disabled="!editForm.name.trim()" class="btn-primary">Save</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores'
import { knowledgeBaseService } from '@/services'
import { formatDistanceToNow } from 'date-fns'
import {
  PlusIcon,
  BookOpenIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const toastStore = useToastStore()

const loading = ref(true)
const creating = ref(false)
const knowledgeBases = ref([])
const searchQuery = ref('')
const sortBy = ref('recent')
const viewMode = ref('grid')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showEmojiPicker = ref(false)
const openMenuId = ref(null)
const nameInputRef = ref(null)
const editingId = ref(null)

const EMOJIS = ['📚', '🧠', '💡', '🔬', '📝', '🌍', '💼', '🎓', '🏗️', '🎨', '🔭', '📊', '🧬', '⚡', '🚀', '🎯', '📖', '🗂️', '🌱', '🔥']
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

const createForm = reactive({ name: '', description: '', icon: '📚', color: '#3b82f6' })
const editForm = reactive({ name: '', description: '' })

const filteredAndSorted = computed(() => {
  let list = knowledgeBases.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(kb => kb.name.toLowerCase().includes(q) || kb.description?.toLowerCase().includes(q))
  if (sortBy.value === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  else if (sortBy.value === 'za') list = [...list].sort((a, b) => b.name.localeCompare(a.name))
  else list = [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  return list
})

onMounted(async () => {
  await loadKnowledgeBases()
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => document.removeEventListener('click', closeMenu))

function closeMenu() { openMenuId.value = null }
function openMenu(id) { openMenuId.value = openMenuId.value === id ? null : id }

async function loadKnowledgeBases() {
  loading.value = true
  try {
    const response = await knowledgeBaseService.getKnowledgeBases()
    knowledgeBases.value = response.knowledgeBases || []
  } catch {
    toastStore.error('Failed to load notebooks')
  } finally {
    loading.value = false
  }
}

async function createKnowledgeBase() {
  if (!createForm.name.trim() || creating.value) return
  creating.value = true
  try {
    const response = await knowledgeBaseService.createKnowledgeBase({
      name: createForm.name.trim(),
      description: createForm.description.trim(),
      icon: createForm.icon,
      color: createForm.color
    })
    showCreateModal.value = false
    Object.assign(createForm, { name: '', description: '', icon: '📚', color: '#3b82f6' })
    toastStore.success('Notebook created')
    router.push(`/knowledge-bases/${response.knowledgeBase._id}`)
  } catch {
    toastStore.error('Failed to create notebook')
  } finally {
    creating.value = false
  }
}

function editKb(kb) {
  editingId.value = kb._id
  editForm.name = kb.name
  editForm.description = kb.description || ''
  showEditModal.value = true
}

async function saveEdit() {
  if (!editForm.name.trim() || !editingId.value) return
  try {
    await knowledgeBaseService.updateKnowledgeBase(editingId.value, {
      name: editForm.name.trim(),
      description: editForm.description.trim()
    })
    toastStore.success('Saved')
    showEditModal.value = false
    editingId.value = null
    await loadKnowledgeBases()
  } catch {
    toastStore.error('Failed to save')
  }
}

async function deleteKb(id) {
  if (!confirm('Delete this notebook? This cannot be undone.')) return
  try {
    await knowledgeBaseService.deleteKnowledgeBase(id)
    knowledgeBases.value = knowledgeBases.value.filter(k => k._id !== id)
    toastStore.success('Notebook deleted')
  } catch {
    toastStore.error('Failed to delete')
  }
}

function formatDate(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
</script>
