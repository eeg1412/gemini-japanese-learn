<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const auth = useAuthStore()
const isDark = ref(true)
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}
</script>

<template>
  <div
    class="h-screen flex flex-col transition-colors duration-300 overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
  >
    <header
      class="p-4 bg-white dark:bg-gray-800 shadow flex justify-between items-center z-50"
    >
      <h1
        class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500"
      >
        Gemini Japanese
      </h1>
      <div v-if="auth.token" class="flex items-center gap-2">
        <button
          @click="toggleTheme"
          class="flex items-center p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden"
        >
          <span class="material-icons">{{
            isDark ? 'dark_mode' : 'light_mode'
          }}</span>
        </button>
        <button
          @click="toggleMenu"
          class="md:hidden flex items-center p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span class="material-icons">{{
            isMenuOpen ? 'close' : 'menu'
          }}</span>
        </button>
      </div>

      <nav
        v-if="auth.token"
        :class="[
          'md:flex md:flex-row md:gap-4 md:items-center md:static md:bg-transparent md:p-0 md:shadow-none md:border-none',
          isMenuOpen
            ? 'flex flex-col absolute top-16 left-0 right-0 bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700 shadow-lg z-[60]'
            : 'hidden'
        ]"
      >
        <router-link
          to="/"
          class="hover:text-blue-500 flex items-center gap-1 w-full md:w-auto p-2 md:p-0"
          @click="isMenuOpen = false"
        >
          <span class="material-icons text-sm">chat</span> 聊天
        </router-link>
        <router-link
          to="/vocab"
          class="hover:text-blue-500 flex items-center gap-1 w-full md:w-auto p-2 md:p-0"
          @click="isMenuOpen = false"
        >
          <span class="material-icons text-sm">book</span> 生词本
        </router-link>
        <button
          @click="toggleTheme"
          class="hidden md:flex items-center p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span class="material-icons">{{
            isDark ? 'dark_mode' : 'light_mode'
          }}</span>
        </button>
        <button
          @click="
            () => {
              auth.logout()
              isMenuOpen = false
            }
          "
          class="text-red-500 hover:text-red-700 flex items-center gap-1 w-full md:w-auto p-2 md:p-0"
        >
          <span class="material-icons">logout</span> 退出
        </button>
      </nav>
    </header>

    <main class="flex-1 overflow-hidden flex flex-col min-h-0">
      <router-view></router-view>
    </main>
  </div>
</template>
