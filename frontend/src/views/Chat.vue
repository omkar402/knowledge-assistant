<template>
  <div class="h-full flex">
    <!-- Chat list sidebar -->
    <div class="w-80 border-r border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 flex-shrink-0 hidden md:flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b border-dark-200 dark:border-dark-700">
        <button 
          @click="startNewChat"
          class="btn-primary w-full justify-center gap-2"
        >
          <PlusIcon class="w-5 h-5" />
          New Chat
        </button>
      </div>

      <!-- Knowledge base filter -->
      <div class="p-3 border-b border-dark-200 dark:border-dark-700">
        <select 
          v-model="selectedKnowledgeBase"
          class="input text-sm"
          @change="filterChats"
        >
          <option value="">All Knowledge Bases</option>
          <option v-for="kb in knowledgeBases" :key="kb._id" :value="kb._id">
            {{ kb.icon }} {{ kb.name }}
          </option>
        </select>
      </div>

      <!-- Chat list -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="loading" class="p-4 space-y-3">
          <div v-for="i in 5" :key="i" class="skeleton h-16 rounded-lg" />
        </div>
        
        <div v-else-if="chats.length === 0" class="p-8 text-center text-dark-500">
          <ChatBubbleLeftRightIcon class="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No chats yet</p>
          <p class="text-sm mt-2">Start a new conversation</p>
        </div>

        <div v-else class="divide-y divide-dark-200 dark:divide-dark-700">
          <div
            v-for="chat in chats"
            :key="chat._id"
            :class="[
              'p-3 cursor-pointer transition-colors',
              currentChatId === chat._id 
                ? 'bg-primary-50 dark:bg-primary-900/20' 
                : 'hover:bg-dark-50 dark:hover:bg-dark-750'
            ]"
            @click="selectChat(chat._id)"
          >
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <span v-if="chat.knowledgeBase?.icon">{{ chat.knowledgeBase.icon }}</span>
                <ChatBubbleLeftRightIcon v-else class="w-4 h-4 text-primary-600" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-dark-900 dark:text-white truncate">
                  {{ chat.title }}
                </p>
                <p class="text-xs text-dark-500 mt-1">
                  {{ formatDate(chat.updatedAt) }}
                </p>
              </div>
              <button 
                @click.stop="deleteChat(chat._id)"
                class="opacity-0 group-hover:opacity-100 btn-icon"
              >
                <TrashIcon class="w-4 h-4 text-dark-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main chat area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Chat header -->
      <div class="h-14 px-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button 
            @click="showChatList = !showChatList"
            class="md:hidden btn-icon"
          >
            <Bars3Icon class="w-5 h-5" />
          </button>
          <h2 class="font-medium text-dark-900 dark:text-white truncate">
            {{ currentChat?.title || 'New Chat' }}
          </h2>
        </div>
        
        <div class="flex items-center gap-2">
          <select 
            v-model="chatKnowledgeBase"
            class="input text-sm w-48"
            :disabled="messages.length > 0"
          >
            <option value="">All documents</option>
            <option v-for="kb in knowledgeBases" :key="kb._id" :value="kb._id">
              {{ kb.icon }} {{ kb.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Welcome message -->
        <div v-if="messages.length === 0" class="max-w-2xl mx-auto text-center py-12">
          <div class="w-16 h-16 mx-auto mb-6 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
            <SparklesIcon class="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-2">
            How can I help you?
          </h2>
          <p class="text-dark-500 mb-8">
            Ask questions about your documents and get AI-powered answers with citations.
          </p>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              class="card-hover p-3 text-left text-sm text-dark-600 dark:text-dark-300"
              @click="sendMessage(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>

        <!-- Message list -->
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="[
            'flex',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          ]"
        >
          <div
            :class="[
              message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'
            ]"
          >
            <!-- Message content -->
            <div v-if="message.role === 'user'" class="whitespace-pre-wrap">
              {{ message.content }}
            </div>
            <div v-else class="prose-chat" v-html="renderMarkdown(message.content)" />

            <!-- Citations -->
            <div v-if="message.citations?.length" class="mt-3 pt-3 border-t border-dark-200 dark:border-dark-700">
              <p class="text-xs font-medium text-dark-500 mb-2">Sources:</p>
              <div class="space-y-1">
                <a
                  v-for="(citation, i) in message.citations"
                  :key="i"
                  :href="`/documents/${citation.documentId}`"
                  class="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-500"
                >
                  <span class="font-medium">[{{ i + 1 }}]</span>
                  <span class="truncate">{{ citation.documentTitle }}</span>
                </a>
              </div>
            </div>

            <!-- Metadata -->
            <div v-if="message.metadata" class="mt-2 text-xs text-dark-400">
              {{ message.metadata.processingTimeMs }}ms
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="sending" class="flex justify-start">
          <div class="chat-message-assistant flex items-center gap-2">
            <div class="spinner w-4 h-4" />
            <span class="text-sm text-dark-500">Thinking...</span>
          </div>
        </div>
      </div>

      <!-- Input area -->
      <div class="p-4 border-t border-dark-200 dark:border-dark-700">
        <form @submit.prevent="handleSubmit" class="flex gap-3">
          <div class="flex-1 relative">
            <textarea
              v-model="inputMessage"
              ref="inputRef"
              rows="1"
              placeholder="Ask a question about your documents..."
              class="input pr-12 resize-none"
              :disabled="sending"
              @keydown.enter.exact.prevent="handleSubmit"
              @input="autoResize"
            />
            <button
              type="submit"
              :disabled="!inputMessage.trim() || sending"
              class="absolute right-2 bottom-2 btn-primary p-2"
            >
              <PaperAirplaneIcon class="w-4 h-4" />
            </button>
          </div>
        </form>
        <p class="text-xs text-dark-400 mt-2 text-center">
          AI responses may contain inaccuracies. Always verify important information.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores'
import { chatService, knowledgeBaseService } from '@/services'
import { marked } from 'marked'
import { formatDistanceToNow } from 'date-fns'
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
  Bars3Icon,
  SparklesIcon,
  PaperAirplaneIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()

const loading = ref(true)
const sending = ref(false)
const showChatList = ref(false)
const chats = ref([])
const knowledgeBases = ref([])
const currentChat = ref(null)
const messages = ref([])
const inputMessage = ref('')
const selectedKnowledgeBase = ref('')
const chatKnowledgeBase = ref('')
const messagesContainer = ref(null)
const inputRef = ref(null)

const currentChatId = computed(() => route.params.id)

const suggestions = [
  'Summarize the main points',
  'What are the key findings?',
  'Find related information about...',
  'Compare and contrast...'
]

onMounted(async () => {
  await Promise.all([
    loadChats(),
    loadKnowledgeBases()
  ])
  
  if (currentChatId.value) {
    await loadChat(currentChatId.value)
  }
})

watch(() => route.params.id, async (newId) => {
  if (newId) {
    await loadChat(newId)
  } else {
    startNewChat()
  }
})

async function loadChats() {
  try {
    const response = await chatService.getChats({ limit: 50 })
    chats.value = response.chats
  } catch (error) {
    console.error('Failed to load chats:', error)
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

async function loadChat(chatId) {
  try {
    const response = await chatService.getChat(chatId)
    currentChat.value = response.chat
    messages.value = response.chat.messages || []
    chatKnowledgeBase.value = response.chat.knowledgeBase?._id || ''
    
    nextTick(scrollToBottom)
  } catch (error) {
    toastStore.error('Failed to load chat')
    router.push('/chat')
  }
}

function startNewChat() {
  currentChat.value = null
  messages.value = []
  chatKnowledgeBase.value = selectedKnowledgeBase.value
  router.push('/chat')
}

function selectChat(chatId) {
  router.push(`/chat/${chatId}`)
}

async function deleteChat(chatId) {
  if (!confirm('Are you sure you want to delete this chat?')) return
  
  try {
    await chatService.deleteChat(chatId)
    chats.value = chats.value.filter(c => c._id !== chatId)
    
    if (currentChatId.value === chatId) {
      startNewChat()
    }
    
    toastStore.success('Chat deleted')
  } catch (error) {
    toastStore.error('Failed to delete chat')
  }
}

async function handleSubmit() {
  const query = inputMessage.value.trim()
  if (!query || sending.value) return
  
  await sendMessage(query)
}

async function sendMessage(query) {
  inputMessage.value = ''
  sending.value = true

  // Add user message immediately
  messages.value.push({
    role: 'user',
    content: query,
    timestamp: new Date()
  })
  
  nextTick(scrollToBottom)

  try {
    const response = await chatService.query({
      query,
      chatId: currentChatId.value || undefined,
      knowledgeBaseId: chatKnowledgeBase.value || undefined
    })

    // Add assistant response
    messages.value.push({
      role: 'assistant',
      content: response.answer,
      citations: response.citations,
      metadata: response.metadata,
      timestamp: new Date()
    })

    // Update chat ID if new chat
    if (!currentChatId.value && response.chatId) {
      router.push(`/chat/${response.chatId}`)
      await loadChats() // Refresh chat list
    }

    nextTick(scrollToBottom)
  } catch (error) {
    toastStore.error('Failed to get response')
    messages.value.pop() // Remove user message on error
  } finally {
    sending.value = false
    inputRef.value?.focus()
  }
}

function renderMarkdown(content) {
  return marked(content, { breaks: true })
}

function formatDate(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function autoResize(event) {
  const textarea = event.target
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
}

function filterChats() {
  // Filter will be applied on server side in future
  loadChats()
}
</script>
