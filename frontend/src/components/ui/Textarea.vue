<template>
  <div class="relative">
    <label 
      v-if="label" 
      :for="id" 
      class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <textarea
      :id="id"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :class="[
        'input resize-none',
        error ? 'input-error' : '',
        autoResize ? 'overflow-hidden' : ''
      ]"
      @input="handleInput"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
      ref="textareaRef"
    />
    
    <p v-if="error" class="mt-1 text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>
    <p v-else-if="hint" class="mt-1 text-sm text-dark-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: String,
  label: String,
  placeholder: String,
  error: String,
  hint: String,
  disabled: Boolean,
  required: Boolean,
  rows: {
    type: Number,
    default: 3
  },
  autoResize: Boolean,
  maxRows: {
    type: Number,
    default: 10
  },
  id: String
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const textareaRef = ref(null)

const id = computed(() => props.id || `textarea-${Math.random().toString(36).slice(2, 9)}`)

function handleInput(event) {
  emit('update:modelValue', event.target.value)
  if (props.autoResize) {
    resize()
  }
}

function resize() {
  const textarea = textareaRef.value
  if (!textarea) return
  
  textarea.style.height = 'auto'
  const lineHeight = parseInt(getComputedStyle(textarea).lineHeight)
  const maxHeight = lineHeight * props.maxRows
  const newHeight = Math.min(textarea.scrollHeight, maxHeight)
  textarea.style.height = `${newHeight}px`
}

onMounted(() => {
  if (props.autoResize && props.modelValue) {
    nextTick(resize)
  }
})
</script>
