<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed inset-y-0 left-0 z-30 flex flex-col bg-white dark:bg-dark-800 border-r border-dark-200 dark:border-dark-700 transition-transform duration-300 lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
      style="width: 280px;"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 h-16 border-b border-dark-200 dark:border-dark-700">
        <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-lg">K</span>
        </div>
        <span class="font-semibold text-lg text-dark-900 dark:text-white">Knowledge AI</span>
      </div>

      <!-- New Chat Button -->
      <div class="p-4">
        <router-link 
          to="/chat" 
          class="btn-primary w-full justify-center gap-2"
          @click="closeSidebarOnMobile"
        >
          <PlusIcon class="w-5 h-5" />
          New Chat
        </router-link>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.to"
          :class="[
            isActiveRoute(item.to) ? 'sidebar-link-active' : 'sidebar-link'
          ]"
          @click="closeSidebarOnMobile"
        >
          <component :is="item.icon" class="w-5 h-5" />
          {{ item.name }}
        </router-link>
      </nav>

      <!-- User section -->
      <div ref="userSectionRef" class="p-4 border-t border-dark-200 dark:border-dark-700">
        <div class="flex items-center gap-3">
          <img 
            v-if="user?.avatar"
            :src="user.avatar" 
            :alt="user.name"
            class="w-10 h-10 rounded-full"
          />
          <div 
            v-else 
            class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center"
          >
            <span class="text-primary-700 dark:text-primary-300 font-medium">
              {{ userInitials }}
            </span>
          </div>
          
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-dark-900 dark:text-white truncate">
              {{ user?.name }}
            </p>
            <p class="text-xs text-dark-500 truncate">{{ user?.email }}</p>
          </div>

          <button @click="toggleUserMenu" class="btn-icon">
            <EllipsisVerticalIcon class="w-5 h-5 text-dark-500" />
          </button>
        </div>

        <!-- User profile card -->
        <div
          v-if="userMenuOpen"
          class="absolute bottom-20 left-4 right-4 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-dark-200 dark:border-dark-700 overflow-hidden z-50"
          @click.stop
        >
          <!-- Profile header -->
          <div class="p-4 bg-primary-50 dark:bg-primary-900/20 flex items-center gap-3">
            <img
              v-if="user?.avatar"
              :src="user.avatar"
              :alt="user.name"
              class="w-12 h-12 rounded-full ring-2 ring-primary-400"
            />
            <div
              v-else
              class="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center ring-2 ring-primary-400 flex-shrink-0"
            >
              <span class="text-white font-bold text-lg">{{ userInitials }}</span>
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-dark-900 dark:text-white truncate">{{ user?.name }}</p>
              <p class="text-xs text-dark-500 truncate">{{ user?.email }}</p>
              <span class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium">
                {{ user?.plan || 'Free' }} Plan
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="p-2">
            <router-link
              to="/settings"
              class="dropdown-item"
              @click="userMenuOpen = false"
            >
              <Cog6ToothIcon class="w-4 h-4" />
              Settings
            </router-link>
            <button
              @click="handleLogout"
              class="dropdown-item w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <ArrowRightOnRectangleIcon class="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile sidebar overlay -->
    <div 
      v-if="sidebarOpen" 
      class="fixed inset-0 bg-black/50 z-20 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top header -->
      <header class="h-16 flex items-center justify-between px-4 bg-white dark:bg-dark-800 border-b border-dark-200 dark:border-dark-700">
        <button 
          @click="sidebarOpen = !sidebarOpen" 
          class="btn-icon lg:hidden"
        >
          <Bars3Icon class="w-6 h-6" />
        </button>

        <div class="flex-1 px-4 lg:px-0">
          <h1 class="text-lg font-semibold text-dark-900 dark:text-white">
            {{ pageTitle }}
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <!-- Theme toggle -->
          <button @click="themeStore.toggleTheme()" class="btn-icon">
            <SunIcon v-if="themeStore.isDark" class="w-5 h-5 text-dark-400" />
            <MoonIcon v-else class="w-5 h-5 text-dark-500" />
          </button>

          <!-- Notifications -->
          <button class="btn-icon">
            <BellIcon class="w-5 h-5 text-dark-500" />
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto bg-dark-50 dark:bg-dark-900">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, useThemeStore } from '@/stores'
import {
  Bars3Icon,
  PlusIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  BookOpenIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  EllipsisVerticalIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const sidebarOpen = ref(false)
const userMenuOpen = ref(false)
const userSectionRef = ref(null)

const user = computed(() => authStore.user)

const userInitials = computed(() => {
  if (!user.value?.name) return '?'
  return user.value.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

const navigation = [
  { name: 'Dashboard', to: '/', icon: HomeIcon },
  { name: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Documents', to: '/documents', icon: DocumentTextIcon },
  { name: 'Knowledge Bases', to: '/knowledge-bases', icon: BookOpenIcon },
  { name: 'Teams', to: '/teams', icon: UserGroupIcon }
]

const pageTitle = computed(() => {
  const currentNav = navigation.find(item => isActiveRoute(item.to))
  return currentNav?.name || 'Knowledge Assistant'
})

function isActiveRoute(to) {
  if (to === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(to)
}

function closeSidebarOnMobile() {
  if (window.innerWidth < 1024) {
    sidebarOpen.value = false
  }
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// Close user menu on click outside
function handleClickOutside(event) {
  if (userMenuOpen.value && userSectionRef.value && !userSectionRef.value.contains(event.target)) {
    userMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Close sidebar on route change (mobile)
watch(route, () => {
  closeSidebarOnMobile()
})
</script>
