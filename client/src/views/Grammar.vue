<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { formatDate } from '../utils/dateUtils'

const auth = useAuthStore()
const grammarList = ref([])
const totalCount = ref(0)
const page = ref(1)
const hasMore = ref(true)
const sortOrder = ref('desc')
const container = ref(null)
const filterMode = ref('all') // all | starred | unstarred | learned

const sortLocal = () => {
  const order = sortOrder.value === 'asc' ? 1 : -1
  grammarList.value = [...grammarList.value].sort((a, b) => {
    const aStar = Number(a.starred || 0)
    const bStar = Number(b.starred || 0)
    if (aStar !== bStar) return bStar - aStar // starred first

    const aLearned = Number(a.learned || 0)
    const bLearned = Number(b.learned || 0)
    if (aLearned !== bLearned) return aLearned - bLearned // unlearned first

    return (Number(a.updated_at) - Number(b.updated_at)) * order
  })
}

const getJapaneseVoice = () => {
  const voices = window.speechSynthesis?.getVoices?.() || []
  return (
    voices.find(v =>
      String(v.lang || '')
        .toLowerCase()
        .startsWith('ja')
    ) ||
    voices.find(v =>
      String(v.lang || '')
        .toLowerCase()
        .includes('ja')
    ) ||
    null
  )
}

const speakJapanese = text => {
  if (!text) return
  if (!('speechSynthesis' in window)) {
    alert('当前浏览器不支持语音朗读 (SpeechSynthesis)。')
    return
  }
  window.speechSynthesis.cancel()

  // 处理带注音的文本，过滤掉括号中的假名 (如：彼(かれ) -> 彼)
  const cleanText = text.replace(/\([^)]*\)|（[^）]*）/g, '')

  const utter = new SpeechSynthesisUtterance(cleanText)
  utter.lang = 'ja-JP'
  const voice = getJapaneseVoice()
  if (voice) utter.voice = voice
  window.speechSynthesis.speak(utter)
}

// Speech removed as requested -> Re-added for examples as per current user request

const isLoading = ref(false)

const loadGrammar = async (isInitial = false) => {
  if ((!hasMore.value && !isInitial) || isLoading.value) return

  isLoading.value = true
  try {
    const res = await axios.get('/api/grammar', {
      params: {
        page: page.value,
        limit: 20,
        sort: sortOrder.value,
        filter: filterMode.value,
        offset: isInitial ? 0 : grammarList.value.length
      },
      headers: { Authorization: `Bearer ${auth.token}` }
    })

    const newItems = res.data.data
    totalCount.value = res.data.total || 0

    if (newItems.length < 20) {
      hasMore.value = false
    }

    if (isInitial) {
      grammarList.value = newItems
      sortLocal()
      scrollToTop()
    } else {
      grammarList.value = [...grammarList.value, ...newItems]
      sortLocal()
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  page.value = 1
  hasMore.value = true
  grammarList.value = []
  loadGrammar(true)
}

const changeFilter = mode => {
  filterMode.value = mode
  page.value = 1
  hasMore.value = true
  grammarList.value = []
  loadGrammar(true)
}

const toggleStar = async item => {
  try {
    // const nextStarred = !Boolean(item.starred)
    const res = await axios.patch(
      `/api/grammar/${item.id}/star`,
      {}, // toggle doesn't strictly need body if backend just toggles
      { headers: { Authorization: `Bearer ${auth.token}` } }
    )
    const updated = res.data?.data
    const idx = grammarList.value.findIndex(v => v.id === item.id)
    if (idx >= 0) {
      // 判断 filterMode 是否需要移除该项
      if (
        (filterMode.value === 'starred' && !updated.starred) ||
        (filterMode.value === 'unstarred' && updated.starred)
      ) {
        grammarList.value.splice(idx, 1)
        totalCount.value--
      } else if (updated) {
        grammarList.value[idx] = updated
        sortLocal()
      }
    }
  } catch (e) {
    console.error('Star error:', e)
    alert('收藏操作失败')
  }
}

const toggleLearned = async item => {
  try {
    const res = await axios.patch(
      `/api/grammar/${item.id}/learned`,
      {},
      { headers: { Authorization: `Bearer ${auth.token}` } }
    )
    const updated = res.data?.data
    const idx = grammarList.value.findIndex(v => v.id === item.id)
    if (idx >= 0) {
      grammarList.value.splice(idx, 1)
      totalCount.value--
      // sortLocal()
    }
  } catch (e) {
    console.error('Learned toggle error:', e)
    alert('操作失败')
  }
}

const deleteGrammar = async id => {
  if (!confirm('确定要从语法本中删除该语法吗？')) return

  try {
    await axios.delete(`/api/grammar/${id}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    grammarList.value = grammarList.value.filter(item => item.id !== id)
    totalCount.value--
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

let scrollTimer = null
const handleScroll = () => {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    const { scrollTop, scrollHeight, clientHeight } = container.value
    // If we scroll to the bottom, load more
    if (
      scrollTop + clientHeight >= scrollHeight - 5 &&
      hasMore.value &&
      !isLoading.value
    ) {
      page.value++
      loadGrammar()
    }
    scrollTimer = null
  }, 200)
}

onMounted(() => {
  loadGrammar(true)
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-100 dark:bg-gray-900 p-2 sm:p-4">
    <!-- Header -->
    <div class="mb-3 sm:mb-4 bg-white dark:bg-gray-800 rounded shadow">
      <!-- Title Row -->
      <div
        class="p-2 sm:p-3 border-b dark:border-gray-700 flex items-center justify-between"
      >
        <h2
          class="text-lg sm:text-xl font-bold flex items-center gap-1 sm:gap-2"
        >
          <span class="material-icons text-base sm:text-2xl">auto_stories</span>
          <span class="truncate text-sm sm:text-base"
            >语法本 ({{ totalCount }})</span
          >
        </h2>
        <!-- Sort Button (Mobile & Desktop) -->
        <button
          @click="toggleSort"
          class="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-100 dark:border-blue-800/50"
          :title="sortOrder === 'desc' ? '按时间降序' : '按时间升序'"
        >
          <span class="material-icons text-sm sm:text-base">
            {{ sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward' }}
          </span>
          <span class="font-medium">{{
            sortOrder === 'desc' ? '最新' : '最旧'
          }}</span>
        </button>
      </div>

      <!-- Controls Row - Responsive -->
      <div
        class="p-2 sm:p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
      >
        <!-- Filter Buttons -->
        <div class="flex gap-1 flex-wrap">
          <button
            @click="changeFilter('all')"
            :class="[
              'p-1 sm:p-1.5 rounded border font-medium flex items-center gap-1 text-xs sm:text-sm',
              filterMode === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            ]"
          >
            <span class="material-icons text-sm">list</span>
            <span class="hidden sm:inline">语法</span>
          </button>
          <button
            @click="changeFilter('starred')"
            :class="[
              'p-1 sm:p-1.5 rounded border font-medium flex items-center gap-1 text-xs sm:text-sm',
              filterMode === 'starred'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            ]"
          >
            <span class="material-icons text-sm text-yellow-400">star</span>
            <span class="hidden sm:inline">已收藏语法</span>
          </button>
          <button
            @click="changeFilter('unstarred')"
            :class="[
              'p-1 sm:p-1.5 rounded border font-medium flex items-center gap-1 text-xs sm:text-sm',
              filterMode === 'unstarred'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            ]"
          >
            <span class="material-icons text-sm">star_border</span>
            <span class="hidden sm:inline">未收藏语法</span>
          </button>
          <button
            @click="changeFilter('learned')"
            :class="[
              'p-1 sm:p-1.5 rounded border font-medium flex items-center gap-1 text-xs sm:text-sm',
              filterMode === 'learned'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            ]"
          >
            <span class="material-icons text-sm text-green-500"
              >check_circle</span
            >
            <span class="hidden sm:inline">已学会</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Grammar List -->
    <div
      ref="container"
      @scroll="handleScroll"
      class="flex-1 overflow-y-auto space-y-2 sm:space-y-3 pr-1 sm:pr-2"
    >
      <div
        v-for="item in grammarList"
        :key="item.id"
        class="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg transition"
      >
        <!-- Top Row: Grammar & Actions -->
        <div class="flex justify-between items-start gap-2">
          <div class="flex items-baseline gap-1 sm:gap-2 flex-wrap min-w-0">
            <h3
              class="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100"
            >
              {{ item.grammar }}
            </h3>
          </div>

          <!-- Right: Action Buttons (Fixed width) -->
          <div class="flex gap-1 flex-shrink-0">
            <button
              @click.stop="toggleLearned(item)"
              :class="[
                'p-1 sm:p-1.5 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20',
                item.learned
                  ? 'text-green-500 dark:text-green-400'
                  : 'text-gray-400 hover:text-green-500 dark:text-gray-500 dark:hover:text-green-400'
              ]"
              :title="item.learned ? '设为未学会' : '设为已学会'"
            >
              <span class="material-icons text-base">check_circle</span>
            </button>
            <button
              @click.stop="toggleStar(item)"
              :class="[
                'p-1 sm:p-1.5 transition-colors rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
                item.starred
                  ? 'text-yellow-500 dark:text-yellow-400'
                  : 'text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400'
              ]"
              :title="item.starred ? '取消收藏' : '收藏'"
            >
              <span class="material-icons text-base">{{
                item.starred ? 'star' : 'star_border'
              }}</span>
            </button>
            <button
              @click="deleteGrammar(item.id)"
              class="p-1 sm:p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="删除语法"
            >
              <span class="material-icons text-base">delete</span>
            </button>
          </div>
        </div>

        <!-- Details Block -->
        <div class="mt-2 space-y-2">
          <!-- Meaning -->
          <div
            class="text-gray-700 dark:text-gray-300 font-medium text-sm sm:text-base"
          >
            {{ item.explanation }}
          </div>

          <!-- Structure -->
          <div
            v-if="item.structure"
            class="text-xs sm:text-sm text-gray-600 dark:text-gray-400"
          >
            <span class="font-bold">接续:</span> {{ item.structure }}
          </div>

          <!-- Example (Unified) -->
          <div
            v-if="item.example"
            class="group text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded flex items-center gap-1"
          >
            <span>例句: {{ item.example }}</span>
            <button
              @click.stop="speakJapanese(item.example)"
              class="text-gray-400 hover:text-blue-500 transition-colors flex items-center"
              title="朗读例句"
            >
              <span class="material-icons text-sm px-0.5">volume_up</span>
            </button>
          </div>

          <!-- Timestamp -->
          <div
            class="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 pt-1"
          >
            {{ formatDate(item.updated_at) }}
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="flex justify-center py-2">
        <div
          class="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"
        ></div>
      </div>
      <div
        v-if="!hasMore && !isLoading"
        class="text-center text-gray-400 text-sm py-2"
      >
        -- 已全部加载 --
      </div>
    </div>
  </div>
</template>
