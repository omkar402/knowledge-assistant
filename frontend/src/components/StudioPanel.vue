<template>
  <div class="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-dark-800 overflow-hidden">

    <!-- Header tabs -->
    <div class="flex border-b border-dark-200 dark:border-dark-700 flex-shrink-0">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'flex-1 py-3 text-xs font-medium transition-colors',
          activeTab === tab.id
            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
            : 'text-dark-500 hover:text-dark-700 dark:hover:text-dark-300'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Studio tab -->
    <div v-show="activeTab === 'studio'" class="flex-1 overflow-y-auto">

      <!-- AI Overview section -->
      <div class="p-4 border-b border-dark-200 dark:border-dark-700">
        <div class="flex items-center gap-2 mb-3">
          <SparklesIcon class="w-4 h-4 text-primary-500" />
          <h3 class="text-sm font-semibold text-dark-900 dark:text-white">AI Overview</h3>
        </div>

        <div
          v-if="overview"
          class="text-sm text-dark-700 dark:text-dark-300 leading-relaxed prose-chat"
          v-html="renderMarkdown(overview)"
        />
        <p v-else-if="!documents.length" class="text-xs text-dark-400">
          Add sources to generate an AI overview.
        </p>
        <p v-else class="text-xs text-dark-400">
          Generate a summary of all your sources.
        </p>

        <button
          @click="generateOverview"
          :disabled="generatingOverview || !documents.length"
          class="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg border border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <div v-if="generatingOverview" class="spinner w-3.5 h-3.5" />
          <ArrowPathIcon v-else class="w-3.5 h-3.5" />
          {{ overview ? 'Regenerate overview' : 'Generate overview' }}
        </button>
      </div>

      <!-- AI Content generators -->
      <div class="p-4 space-y-2">
        <p class="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Generate content</p>

        <button
          v-for="gen in generators"
          :key="gen.id"
          @click="runGenerator(gen)"
          :disabled="gen.loading || !documents.length"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
        >
          <div :class="['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', gen.iconBg]">
            <component :is="gen.icon" :class="['w-4 h-4', gen.iconColor]" />
          </div>
          <div class="flex-1 text-left">
            <p class="text-sm font-medium text-dark-900 dark:text-white">{{ gen.label }}</p>
            <p class="text-xs text-dark-400">{{ gen.description }}</p>
          </div>
          <div v-if="gen.loading" class="spinner w-4 h-4 flex-shrink-0" />
          <ChevronRightIcon v-else class="w-4 h-4 text-dark-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
        </button>
      </div>

      <!-- Generated result panel -->
      <Transition name="slide-up">
        <div
          v-if="generatedResult"
          class="mx-4 mb-4 bg-dark-50 dark:bg-dark-700 rounded-xl overflow-hidden"
        >
          <div class="flex items-center justify-between px-3 py-2.5 border-b border-dark-200 dark:border-dark-600">
            <span class="text-xs font-semibold text-dark-700 dark:text-dark-300">{{ generatedResult.title }}</span>
            <div class="flex items-center gap-1">
              <button @click="copyResult" class="btn-icon p-1 text-dark-400 hover:text-dark-700 dark:hover:text-dark-200" title="Copy">
                <ClipboardDocumentIcon class="w-4 h-4" />
              </button>
              <button @click="pinResultToNotes" class="btn-icon p-1 text-dark-400 hover:text-primary-600 dark:hover:text-primary-400" title="Save to Notes">
                <BookmarkIcon class="w-4 h-4" />
              </button>
              <button @click="generatedResult = null" class="btn-icon p-1 text-dark-400 hover:text-dark-600">
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div class="p-3 max-h-72 overflow-y-auto">
            <div class="prose-chat text-xs" v-html="renderMarkdown(generatedResult.content)" />
          </div>
        </div>
      </Transition>
    </div>

    <!-- Notes tab -->
    <div v-show="activeTab === 'notes'" class="flex-1 flex flex-col overflow-hidden">

      <!-- Pinned items -->
      <div v-if="pinnedNotes.length" class="border-b border-dark-200 dark:border-dark-700 flex-shrink-0">
        <div class="p-3">
          <p class="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Saved items</p>
          <div class="space-y-2">
            <div
              v-for="(note, idx) in pinnedNotes"
              :key="idx"
              class="flex gap-2 p-2.5 bg-dark-50 dark:bg-dark-700 rounded-lg"
            >
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-dark-700 dark:text-dark-300 mb-0.5">{{ note.title }}</p>
                <p class="text-xs text-dark-500 line-clamp-2">{{ note.content }}</p>
              </div>
              <button @click="removePinnedNote(idx)" class="btn-icon p-1 text-dark-400 flex-shrink-0">
                <XMarkIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes editor -->
      <div class="flex-1 flex flex-col overflow-hidden p-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-semibold text-dark-500">Notes</p>
          <button
            @click="saveNotes"
            :disabled="!notesDirty"
            class="text-xs font-medium text-primary-600 dark:text-primary-400 disabled:opacity-40 transition-opacity"
          >
            {{ notesSaved ? 'Saved ✓' : 'Save' }}
          </button>
        </div>
        <textarea
          v-model="notesContent"
          placeholder="Take notes, paste highlights, jot down ideas…"
          class="flex-1 w-full resize-none bg-transparent text-sm text-dark-700 dark:text-dark-300 placeholder-dark-400 focus:outline-none leading-relaxed"
          @input="notesDirty = true; notesSaved = false"
        />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useToastStore } from '@/stores'
import { chatService } from '@/services'
import { marked } from 'marked'
import {
  SparklesIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  BookmarkIcon,
  XMarkIcon,
  DocumentTextIcon,
  ListBulletIcon,
  QuestionMarkCircleIcon,
  CalendarIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  kbId: { type: String, required: true },
  documents: { type: Array, default: () => [] }
})

const toastStore = useToastStore()

const activeTab = ref('studio')
const tabs = [
  { id: 'studio', label: 'Studio' },
  { id: 'notes', label: 'Notes' }
]

const overview = ref('')
const generatingOverview = ref(false)
const generatedResult = ref(null)
const notesContent = ref('')
const notesDirty = ref(false)
const notesSaved = ref(false)
const pinnedNotes = ref([])

const generators = reactive([
  {
    id: 'study-guide',
    label: 'Study guide',
    description: 'Key concepts and summaries',
    icon: DocumentTextIcon,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    prompt: 'Create a comprehensive study guide from all the sources. Include key concepts, definitions, and important points organized by topic.',
    loading: false
  },
  {
    id: 'faq',
    label: 'FAQ',
    description: 'Common questions & answers',
    icon: QuestionMarkCircleIcon,
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    prompt: 'Generate a FAQ (Frequently Asked Questions) from the sources. Create 8-10 thoughtful questions with detailed answers.',
    loading: false
  },
  {
    id: 'briefing',
    label: 'Briefing doc',
    description: 'Executive summary',
    icon: ListBulletIcon,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    prompt: 'Write a concise executive briefing document covering the most important insights and takeaways from all sources.',
    loading: false
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Chronological events',
    icon: CalendarIcon,
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    prompt: 'Extract and organize all dates, events, and time references from the sources into a chronological timeline.',
    loading: false
  }
])

async function generateOverview() {
  if (!props.documents.length) return
  generatingOverview.value = true
  try {
    const response = await chatService.summarize({ knowledgeBaseId: props.kbId })
    overview.value = response.summary || ''
  } catch {
    toastStore.error('Failed to generate overview')
  } finally {
    generatingOverview.value = false
  }
}

async function runGenerator(gen) {
  if (!props.documents.length) return
  gen.loading = true
  generatedResult.value = null
  try {
    const response = await chatService.query({
      query: gen.prompt,
      knowledgeBaseId: props.kbId,
      settings: { model: 'meta-llama/Llama-3.1-8B-Instruct' }
    })
    generatedResult.value = {
      title: gen.label,
      content: response.answer
    }
    activeTab.value = 'studio'
  } catch {
    toastStore.error(`Failed to generate ${gen.label}`)
  } finally {
    gen.loading = false
  }
}

function copyResult() {
  if (!generatedResult.value) return
  navigator.clipboard.writeText(generatedResult.value.content)
    .then(() => toastStore.success('Copied to clipboard'))
    .catch(() => toastStore.error('Failed to copy'))
}

function pinResultToNotes() {
  if (!generatedResult.value) return
  pinnedNotes.value.push({ ...generatedResult.value })
  generatedResult.value = null
  activeTab.value = 'notes'
  toastStore.success('Saved to notes')
}

function removePinnedNote(idx) {
  pinnedNotes.value.splice(idx, 1)
}

async function saveNotes() {
  notesDirty.value = false
  notesSaved.value = true
  // Notes are local only for now — backend notes API is Phase 1
}

function renderMarkdown(content) {
  return marked(content, { breaks: true })
}

const readySourceCount = computed(() =>
  props.documents.filter(d => d.embeddings?.status === 'completed').length
)
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
