<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-dark-50 dark:bg-dark-900 min-w-0">

    <!-- Chat header: session list + model selector -->
    <div class="h-12 flex items-center px-4 gap-3 bg-white dark:bg-dark-800 border-b border-dark-200 dark:border-dark-700 flex-shrink-0">
      <!-- Chat session selector -->
      <div class="relative" ref="chatMenuRef">
        <button
          @click="showChatMenu = !showChatMenu"
          class="flex items-center gap-2 text-sm font-medium text-dark-700 dark:text-dark-200 hover:text-dark-900 dark:hover:text-white transition-colors max-w-[200px]"
        >
          <ChatBubbleLeftRightIcon class="w-4 h-4 flex-shrink-0 text-dark-400" />
          <span class="truncate">{{ currentChat?.title || 'New chat' }}</span>
          <ChevronDownIcon class="w-3.5 h-3.5 flex-shrink-0 text-dark-400" />
        </button>

        <!-- Chat dropdown -->
        <Transition name="dropdown-fade">
          <div
            v-if="showChatMenu"
            class="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-dark-200 dark:border-dark-700 z-20 overflow-hidden"
          >
            <div class="p-2 border-b border-dark-200 dark:border-dark-700">
              <button
                @click="startNewChat"
                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-sm font-medium transition-colors"
              >
                <PlusIcon class="w-4 h-4" />
                New chat
              </button>
            </div>
            <div class="max-h-64 overflow-y-auto p-2">
              <div
                v-for="chat in chats"
                :key="chat._id"
                :class="[
                  'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group',
                  currentChat?._id === chat._id
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : 'hover:bg-dark-50 dark:hover:bg-dark-700'
                ]"
                @click="selectChat(chat)"
              >
                <ChatBubbleLeftRightIcon class="w-4 h-4 text-dark-400 flex-shrink-0" />
                <span class="text-sm text-dark-700 dark:text-dark-200 truncate flex-1">{{ chat.title }}</span>
                <button
                  @click.stop="deleteChat(chat._id)"
                  class="opacity-0 group-hover:opacity-100 btn-icon p-1 text-dark-400 hover:text-red-500"
                >
                  <TrashIcon class="w-3.5 h-3.5" />
                </button>
              </div>
              <p v-if="chats.length === 0" class="text-xs text-dark-400 text-center py-4">No chats yet</p>
            </div>
          </div>
        </Transition>
      </div>

      <div class="flex-1" />

      <!-- Configure chat -->
      <div class="relative" ref="configMenuRef">
        <button
          @click="showConfigMenu = !showConfigMenu"
          :class="['btn-icon p-1.5 transition-colors', showConfigMenu ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-dark-400 hover:text-dark-700 dark:hover:text-dark-200']"
          title="Configure chat"
        >
          <Cog6ToothIcon class="w-4 h-4" />
        </button>

        <Transition name="dropdown-fade">
          <div
            v-if="showConfigMenu"
            class="absolute top-full right-0 mt-1 w-80 bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-dark-200 dark:border-dark-700 z-20 p-4 space-y-4"
          >
            <!-- Response length -->
            <div>
              <p class="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Response length</p>
              <div class="flex gap-2">
                <button
                  v-for="opt in RESPONSE_LENGTHS"
                  :key="opt.value"
                  @click="chatConfig.responseLength = opt.value"
                  :class="[
                    'flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                    chatConfig.responseLength === opt.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-dark-200 dark:border-dark-700 text-dark-600 dark:text-dark-300 hover:border-primary-300 dark:hover:border-primary-700'
                  ]"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- Custom instructions -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-dark-500 uppercase tracking-wider">Custom instructions</p>
                <span class="text-xs text-dark-400">{{ chatConfig.systemPrompt.length }}/500</span>
              </div>
              <textarea
                v-model="chatConfig.systemPrompt"
                maxlength="500"
                rows="4"
                placeholder="e.g. Always respond in bullet points. Focus on actionable insights."
                class="w-full px-3 py-2 text-xs bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-dark-400"
              />
              <p class="text-xs text-dark-400 mt-1">Applied to all responses in this notebook.</p>
            </div>

            <button
              @click="showConfigMenu = false"
              class="w-full py-1.5 text-xs font-medium text-dark-600 dark:text-dark-300 bg-dark-50 dark:bg-dark-700 hover:bg-dark-100 dark:hover:bg-dark-600 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Messages area -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto">

      <!-- Welcome / empty state -->
      <div v-if="messages.length === 0 && !loading" class="flex flex-col items-center justify-center h-full px-6 text-center">
        <div class="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-5">
          <SparklesIcon class="w-7 h-7 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="text-lg font-semibold text-dark-900 dark:text-white mb-2">
          Chat with your sources
        </h2>
        <p class="text-sm text-dark-500 mb-8 max-w-xs">
          Ask anything about the documents in this notebook — every answer is grounded in your sources.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
          <button
            v-for="s in suggestions"
            :key="s"
            @click="sendMessage(s)"
            class="p-3 text-left text-xs text-dark-600 dark:text-dark-300 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- Message list -->
      <div v-else class="p-4 space-y-5 max-w-3xl mx-auto w-full">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :class="['flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start']"
        >
          <!-- Assistant avatar -->
          <div
            v-if="msg.role === 'assistant'"
            class="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 mt-0.5"
          >
            <SparklesIcon class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          </div>

          <div :class="['max-w-[80%]', msg.role === 'user' ? 'order-first' : '']">
            <!-- User bubble -->
            <div v-if="msg.role === 'user'" class="chat-message-user text-sm">
              {{ msg.content }}
            </div>

            <!-- Assistant bubble -->
            <div v-else class="space-y-2">
              <div class="bg-white dark:bg-dark-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-dark-100 dark:border-dark-700">
                <div class="prose-chat text-sm" v-html="renderMarkdown(msg.content)" />
              </div>

              <!-- Citations -->
              <div v-if="msg.citations?.length" class="px-1">
                <p class="text-xs font-medium text-dark-400 mb-1.5">Sources used:</p>
                <div class="flex flex-wrap gap-1.5">
                  <a
                    v-for="(cite, ci) in msg.citations"
                    :key="ci"
                    :href="`/documents/${cite.documentId}`"
                    class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                  >
                    <span class="font-semibold text-primary-600 dark:text-primary-400">[{{ ci + 1 }}]</span>
                    {{ cite.documentTitle }}
                  </a>
                </div>
              </div>

              <!-- Feedback row -->
              <div class="flex items-center gap-3 px-1">
                <button
                  @click="submitFeedback(idx, 1)"
                  :class="['p-1 rounded transition-colors', msg.feedback?.helpful === true ? 'text-green-500' : 'text-dark-400 hover:text-green-500']"
                  title="Helpful"
                >
                  <HandThumbUpIcon class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="submitFeedback(idx, -1)"
                  :class="['p-1 rounded transition-colors', msg.feedback?.helpful === false ? 'text-red-500' : 'text-dark-400 hover:text-red-500']"
                  title="Not helpful"
                >
                  <HandThumbDownIcon class="w-3.5 h-3.5" />
                </button>
                <span v-if="msg.metadata?.processingTimeMs" class="text-xs text-dark-400 ml-auto">
                  {{ msg.metadata.processingTimeMs }}ms
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="sending" class="flex gap-3 justify-start">
          <div class="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <SparklesIcon class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          </div>
          <div class="bg-white dark:bg-dark-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-dark-100 dark:border-dark-700">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay:0ms" />
              <span class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay:150ms" />
              <span class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay:300ms" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="p-4 bg-white dark:bg-dark-800 border-t border-dark-200 dark:border-dark-700 flex-shrink-0">
      <form @submit.prevent="handleSubmit" class="relative">
        <textarea
          v-model="inputMessage"
          ref="inputRef"
          rows="1"
          placeholder="Ask anything about your sources…"
          class="w-full pl-4 pr-12 py-3 text-sm bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          :disabled="sending"
          @keydown.enter.exact.prevent="handleSubmit"
          @input="autoResize"
        />
        <button
          type="submit"
          :disabled="!inputMessage.trim() || sending"
          class="absolute right-2.5 bottom-2.5 w-8 h-8 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-dark-200 dark:disabled:bg-dark-700 text-white disabled:text-dark-400 flex items-center justify-center transition-colors"
        >
          <PaperAirplaneIcon class="w-4 h-4" />
        </button>
      </form>
      <p class="text-xs text-dark-400 text-center mt-2">
        Responses are grounded in your notebook sources · Always verify important information
      </p>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onUnmounted } from 'vue'
import { useToastStore } from '@/stores'
import { chatService } from '@/services'
import { marked } from 'marked'
import {
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  Cog6ToothIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  kbId: { type: String, required: true },
  kb: { type: Object, default: null }
})

const toastStore = useToastStore()

const chats = ref([])
const currentChat = ref(null)
const messages = ref([])
const inputMessage = ref('')
const sending = ref(false)
const loading = ref(false)
const showChatMenu = ref(false)
const showConfigMenu = ref(false)
const messagesContainer = ref(null)
const inputRef = ref(null)
const chatMenuRef = ref(null)
const configMenuRef = ref(null)

const chatConfig = reactive({
  responseLength: 'default',
  systemPrompt: ''
})

const RESPONSE_LENGTHS = [
  { value: 'shorter', label: 'Shorter' },
  { value: 'default', label: 'Default' },
  { value: 'longer', label: 'Longer' }
]

const suggestions = [
  'Summarize the main points',
  'What are the key findings?',
  'What questions does this raise?',
  'Create a brief overview'
]

onMounted(async () => {
  await loadChats()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function handleClickOutside(e) {
  if (showChatMenu.value && chatMenuRef.value && !chatMenuRef.value.contains(e.target)) {
    showChatMenu.value = false
  }
  if (showConfigMenu.value && configMenuRef.value && !configMenuRef.value.contains(e.target)) {
    showConfigMenu.value = false
  }
}

async function loadChats() {
  try {
    const response = await chatService.getChats({ knowledgeBaseId: props.kbId, limit: 30 })
    chats.value = response.chats || []
    if (chats.value.length > 0 && !currentChat.value) {
      await selectChat(chats.value[0])
    }
  } catch {
    chats.value = []
  }
}

async function selectChat(chat) {
  showChatMenu.value = false
  if (currentChat.value?._id === chat._id) return
  loading.value = true
  try {
    const response = await chatService.getChat(chat._id)
    currentChat.value = response.chat
    messages.value = response.chat.messages || []
    await nextTick(scrollToBottom)
  } catch {
    toastStore.error('Failed to load chat')
  } finally {
    loading.value = false
  }
}

function startNewChat() {
  currentChat.value = null
  messages.value = []
  showChatMenu.value = false
  nextTick(() => inputRef.value?.focus())
}

async function deleteChat(chatId) {
  try {
    await chatService.deleteChat(chatId)
    chats.value = chats.value.filter(c => c._id !== chatId)
    if (currentChat.value?._id === chatId) startNewChat()
    toastStore.success('Chat deleted')
  } catch {
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

  messages.value.push({ role: 'user', content: query, timestamp: new Date() })
  await nextTick(scrollToBottom)

  // Reset textarea height
  if (inputRef.value) inputRef.value.style.height = 'auto'

  try {
    const response = await chatService.query({
      query,
      chatId: currentChat.value?._id,
      knowledgeBaseId: props.kbId,
      settings: {
        responseLength: chatConfig.responseLength,
        systemPrompt: chatConfig.systemPrompt || undefined
      }
    })

    messages.value.push({
      role: 'assistant',
      content: response.answer,
      citations: response.citations,
      metadata: response.metadata,
      timestamp: new Date()
    })

    if (!currentChat.value && response.chatId) {
      const newChat = { _id: response.chatId, title: query.slice(0, 50) }
      currentChat.value = { ...newChat }
      chats.value.unshift(newChat)
    }

    await nextTick(scrollToBottom)
  } catch {
    toastStore.error('Failed to get response')
    messages.value.pop()
  } finally {
    sending.value = false
    inputRef.value?.focus()
  }
}

async function submitFeedback(msgIndex, rating) {
  if (!currentChat.value?._id) return
  try {
    await chatService.addFeedback(currentChat.value._id, msgIndex, { helpful: rating > 0, rating })
    messages.value[msgIndex] = {
      ...messages.value[msgIndex],
      feedback: { helpful: rating > 0 }
    }
  } catch {
    // silent — feedback is best-effort
  }
}

function renderMarkdown(content) {
  return marked(content, { breaks: true })
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function autoResize(event) {
  const el = event.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}
</script>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.15s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
