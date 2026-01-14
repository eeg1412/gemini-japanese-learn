<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const auth = useAuthStore()
const isDark = ref(true)

const applyTheme = dark => {
  isDark.value = dark
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

const toggleTheme = () => {
  applyTheme(!isDark.value)
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    applyTheme(savedTheme === 'dark')
  } else {
    // Check system preference
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
    applyTheme(prefersDark)
  }
})
</script>

<template>
  <div
    class="h-[100dvh] flex flex-col transition-colors duration-300 overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
  >
    <!-- Header -->
    <header
      class="p-3 sm:p-4 bg-white dark:bg-gray-800 shadow flex justify-between items-center z-50 flex-shrink-0"
    >
      <h1
        class="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500"
      >
        Gemini日语学习
      </h1>

      <div v-if="auth.token" class="flex items-center gap-1 sm:gap-4">
        <!-- Desktop Nav -->
        <nav class="hidden md:flex items-center gap-6 mr-4">
          <router-link
            to="/"
            class="hover:text-blue-500 flex items-center gap-1 transition-colors"
            exact-active-class="text-blue-500 font-bold"
          >
            <span class="material-icons text-sm">chat</span> 聊天
          </router-link>
          <router-link
            to="/vocab"
            class="hover:text-blue-500 flex items-center gap-1 transition-colors"
            exact-active-class="text-blue-500 font-bold"
          >
            <span class="material-icons text-sm">book</span> 生词本
          </router-link>
        </nav>

        <!-- Theme Toggle (Always visible in header right) -->
        <button
          @click="toggleTheme"
          class="flex items-center p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="切换主题"
        >
          <span class="material-icons text-xl sm:text-2xl">{{
            isDark ? 'dark_mode' : 'light_mode'
          }}</span>
        </button>

        <!-- Logout button (Always in header right) -->
        <button
          @click="auth.logout()"
          class="text-red-500 hover:text-red-700 flex items-center gap-1 p-2"
          title="退出登录"
        >
          <span class="material-icons text-xl sm:text-2xl">logout</span>
          <span class="hidden sm:inline text-sm">退出</span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden flex flex-col min-h-0">
      <router-view></router-view>
    </main>

    <!-- Bottom Nav (Mobile Only) -->
    <nav
      v-if="auth.token"
      class="md:hidden flex justify-around items-center bg-white dark:bg-gray-800 border-t dark:border-gray-700 z-50 flex-shrink-0 pb-safe"
    >
      <router-link
        to="/"
        class="flex flex-col items-center gap-0.5 p-1 flex-1 hover:text-blue-500 transition-colors"
        exact-active-class="text-blue-500 font-bold border-t-2 border-blue-500"
      >
        <span class="material-icons text-lg">chat</span>
        <span class="text-[9px]">聊天</span>
      </router-link>
      <router-link
        to="/vocab"
        class="flex flex-col items-center gap-0.5 p-1 flex-1 hover:text-blue-500 transition-colors"
        exact-active-class="text-blue-500 font-bold border-t-2 border-blue-500"
      >
        <span class="material-icons text-lg">book</span>
        <span class="text-[9px]">生词本</span>
      </router-link>
    </nav>
  </div>
</template>

<style>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
