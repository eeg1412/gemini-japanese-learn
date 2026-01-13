<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const auth = useAuthStore()
const error = ref('')

const handleLogin = async () => {
  const success = await auth.login(
    username.value,
    password.value,
    rememberMe.value
  )
  if (!success) error.value = '登录失败，请检查用户名和密码'
}
</script>

<template>
  <div class="flex items-center justify-center h-full">
    <div class="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-96">
      <h2 class="text-2xl mb-4 font-bold">登录</h2>
      <input
        v-model="username"
        type="text"
        placeholder="用户名"
        class="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        v-model="password"
        type="password"
        placeholder="密码"
        class="w-full p-2 mb-2 border rounded dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
        @keyup.enter="handleLogin"
      />
      <div class="flex items-center mb-4">
        <input
          id="remember-me"
          v-model="rememberMe"
          type="checkbox"
          class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label
          for="remember-me"
          class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
          >持久保持登录状态</label
        >
      </div>
      <p v-if="error" class="text-red-500 mb-4">{{ error }}</p>
      <button
        @click="handleLogin"
        class="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
      >
        <span class="material-icons">login</span>
        登录
      </button>
    </div>
  </div>
</template>
