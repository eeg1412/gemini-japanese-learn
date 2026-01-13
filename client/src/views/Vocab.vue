<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const vocabList = ref([])
const page = ref(1)
const hasMore = ref(true)
const sortOrder = ref('desc') // 'desc' means Newest is effectively at 'Index 0' of API result.
// But if we use Chat style, we display data.reverse().
// So Newest is at the Bottom.
// Oldest is at the Top.

const container = ref(null)

const loadVocab = async (isInitial = false) => {
  if (!hasMore.value && !isInitial) return

  try {
    const res = await axios.get('/api/vocab', {
      params: { page: page.value, limit: 20, sort: sortOrder.value },
      headers: { Authorization: `Bearer ${auth.token}` }
    })

    const newItems = res.data.data

    if (newItems.length < 20) {
      hasMore.value = false
    }

    if (isInitial) {
      vocabList.value = newItems
      scrollToTop()
    } else {
      vocabList.value = [...vocabList.value, ...newItems]
    }
  } catch (e) {
    console.error(e)
  }
}

const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  page.value = 1
  hasMore.value = true
  vocabList.value = []
  loadVocab(true)
}

const deleteVocab = async id => {
  if (!confirm('确定要从生词本中删除该单词吗？')) return

  try {
    await axios.delete(`/api/vocab/${id}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    vocabList.value = vocabList.value.filter(item => item.id !== id)
  } catch (e) {
    console.error('Delete error:', e)
    alert('删除失败')
  }
}

const scrollToTop = () => {
  nextTick(() => {
    if (container.value) {
      container.value.scrollTop = 0
    }
  })
}

const handleScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = container.value
  // If we scroll to the bottom, load more
  if (scrollTop + clientHeight >= scrollHeight - 5 && hasMore.value) {
    page.value++
    loadVocab()
  }
}

onMounted(() => {
  loadVocab(true)
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
    <div
      class="flex justify-between items-center mb-4 bg-white dark:bg-gray-800 p-3 rounded shadow"
    >
      <h2 class="text-xl font-bold flex items-center gap-2">
        <span class="material-icons">menu_book</span>
        生词本 (已加载 {{ vocabList.length }} 条)
      </h2>
      <button
        @click="toggleSort"
        class="flex items-center gap-1 text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded hover:bg-blue-200"
      >
        <span class="material-icons text-sm">sort</span>
        排序: {{ sortOrder === 'desc' ? '最新' : '最旧' }}
      </button>
    </div>

    <div
      ref="container"
      @scroll="handleScroll"
      class="flex-1 overflow-y-auto space-y-4 pr-2"
    >
      <div
        v-for="word in vocabList"
        :key="word.id"
        class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg transition"
      >
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-baseline gap-2">
              <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {{ word.original }}
              </h3>
              <span class="text-blue-600 dark:text-blue-400 text-sm"
                >[{{ word.reading }}]</span
              >
              <span
                class="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >{{ word.type }}</span
              >
            </div>
            <p class="text-gray-700 dark:text-gray-300 mt-1 font-medium">
              {{ word.meaning }}
            </p>
            <div
              class="mt-2 text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded"
            >
              例句: {{ word.example }}
            </div>
          </div>
          <div class="flex flex-col items-end gap-4">
            <button
              @click="deleteVocab(word.id)"
              class="text-gray-400 hover:text-red-500 transition-colors"
              title="删除生词"
            >
              <span class="material-icons">delete</span>
            </button>
            <div class="text-xs text-gray-400">
              {{
                new Date(word.updated_at).toLocaleString('zh-CN', {
                  hour12: false
                })
              }}
            </div>
          </div>
        </div>
      </div>
      <div v-if="!hasMore" class="text-center text-gray-400 text-sm py-2">
        -- 已全部加载 --
      </div>
    </div>
  </div>
</template>
