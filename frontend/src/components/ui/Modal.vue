<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div 
          class="modal-backdrop" 
          @click="closeOnBackdrop && emit('update:modelValue', false)"
        />
        
        <!-- Modal content -->
        <div 
          :class="[
            'modal-content w-full',
            sizeClasses[size]
          ]"
          @click.stop
        >
          <!-- Header -->
          <div 
            v-if="title || $slots.header" 
            class="flex items-center justify-between px-6 py-4 border-b border-dark-200 dark:border-dark-700"
          >
            <slot name="header">
              <h3 class="text-lg font-semibold text-dark-900 dark:text-white">
                {{ title }}
              </h3>
            </slot>
            <button 
              v-if="showClose"
              @click="emit('update:modelValue', false)"
              class="btn-icon -mr-2"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div :class="['px-6 py-4', bodyClass]">
            <slot />
          </div>

          <!-- Footer -->
          <div 
            v-if="$slots.footer" 
            class="flex items-center justify-end gap-3 px-6 py-4 border-t border-dark-200 dark:border-dark-700"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  modelValue: Boolean,
  title: String,
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value)
  },
  showClose: {
    type: Boolean,
    default: true
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  },
  bodyClass: String
})

const emit = defineEmits(['update:modelValue'])

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl'
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}
</style>
