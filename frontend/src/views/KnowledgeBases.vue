<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-dark-900 dark:text-white">Knowledge Bases</h1>
        <p class="text-dark-500 mt-1">Organize your documents into collections</p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary gap-2">
        <PlusIcon class="w-5 h-5" />
        Create Knowledge Base
      </button>
    </div>

    <!-- Knowledge Bases Grid -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="skeleton h-48 rounded-xl" />
    </div>

    <div v-else-if="knowledgeBases.length === 0" class="card p-12 text-center">
      <BookOpenIcon class="w-16 h-16 mx-auto text-dark-300 mb-4" />
      <h3 class="text-lg font-medium text-dark-900 dark:text-white mb-2">
        No knowledge bases yet
      </h3>
      <p class="text-dark-500 mb-6">
        Create your first knowledge base to organize your documents
      </p>
      <button @click="showCreateModal = true" class="btn-primary">
        Create Knowledge Base
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="kb in knowledgeBases"
        :key="kb._id"
        class="card-hover overflow-hidden"
        @click="$router.push(`/knowledge-bases/${kb._id}`)"
      >
        <div 
          class="h-2"
          :style="{ backgroundColor: kb.color }"
        />
        <div class="p-5">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div 
                class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                :style="{ backgroundColor: kb.color + '20' }"
              >
                {{ kb.icon }}
              </div>
              <div>
                <h3 class="font-semibold text-dark-900 dark:text-white">
                  {{ kb.name }}
                </h3>
                <p class="text-sm text-dark-500 mt-0.5">
                  {{ kb.stats?.documentsCount || 0 }} documents
                </p>
              </div>
            </div>
            <span v-if="kb.permission !== 'owner'" class="badge badge-primary text-xs">
              {{ kb.permission }}
            </span>
          </div>

          <p v-if="kb.description" class="text-sm text-dark-500 mt-4 line-clamp-2">
            {{ kb.description }}
          </p>

          <div class="mt-4 pt-4 border-t border-dark-200 dark:border-dark-700 flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs text-dark-500">
              <QueryIcon class="w-4 h-4" />
              {{ kb.stats?.totalQueries || 0 }} queries
            </div>
            <span class="text-xs text-dark-400">
              Updated {{ formatDate(kb.updatedAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Modal v-model="showCreateModal" title="Create Knowledge Base">
      <form @submit.prevent="createKnowledgeBase" class="space-y-4">
        <div class="flex gap-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">Icon</label>
            <button
              type="button"
              @click="showEmojiPicker = !showEmojiPicker"
              class="w-16 h-16 border border-dark-200 dark:border-dark-700 rounded-xl text-3xl flex items-center justify-center hover:bg-dark-50 dark:hover:bg-dark-750"
            >
              {{ createForm.icon }}
            </button>
          </div>
          <div class="flex-1">
            <Input
              v-model="createForm.name"
              label="Name"
              placeholder="My Knowledge Base"
              required
            />
          </div>
        </div>
        
        <Textarea
          v-model="createForm.description"
          label="Description"
          placeholder="Describe what this knowledge base is for..."
          :rows="3"
        />

        <div>
          <label class="block text-sm font-medium mb-1.5">Color</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="color in colors"
              :key="color"
              type="button"
              @click="createForm.color = color"
              :class="[
                'w-8 h-8 rounded-full transition-transform',
                createForm.color === color ? 'ring-2 ring-offset-2 ring-dark-400 scale-110' : ''
              ]"
              :style="{ backgroundColor: color }"
            />
          </div>
        </div>
      </form>
      <template #footer>
        <button @click="showCreateModal = false" class="btn-secondary">Cancel</button>
        <button @click="createKnowledgeBase" class="btn-primary" :disabled="!createForm.name || creating">
          {{ creating ? 'Creating...' : 'Create' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useToastStore } from '@/stores'
import { knowledgeBaseService } from '@/services'
import { formatDistanceToNow } from 'date-fns'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import {
  PlusIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon as QueryIcon
} from '@heroicons/vue/24/outline'

const toastStore = useToastStore()

const loading = ref(true)
const creating = ref(false)
const knowledgeBases = ref([])
const showCreateModal = ref(false)
const showEmojiPicker = ref(false)

const colors = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', 
  '#F97316', '#EAB308', '#22C55E', '#06B6D4'
]

const icons = ['📚', '🔬', '💼', '🎯', '🚀', '💡', '📊', '🎓', '🔍', '📝']

const createForm = reactive({
  name: '',
  description: '',
  icon: '📚',
  color: '#3B82F6'
})

onMounted(async () => {
  await loadKnowledgeBases()
})

async function loadKnowledgeBases() {
  try {
    const response = await knowledgeBaseService.getKnowledgeBases()
    knowledgeBases.value = response.knowledgeBases
  } catch (error) {
    toastStore.error('Failed to load knowledge bases')
  } finally {
    loading.value = false
  }
}

async function createKnowledgeBase() {
  if (!createForm.name) return

  creating.value = true
  try {
    await knowledgeBaseService.createKnowledgeBase({
      name: createForm.name,
      description: createForm.description,
      icon: createForm.icon,
      color: createForm.color
    })
    
    toastStore.success('Knowledge base created')
    showCreateModal.value = false
    
    // Reset form
    createForm.name = ''
    createForm.description = ''
    createForm.icon = '📚'
    createForm.color = '#3B82F6'
    
    await loadKnowledgeBases()
  } catch (error) {
    toastStore.error('Failed to create knowledge base')
  } finally {
    creating.value = false
  }
}

function formatDate(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
</script>
