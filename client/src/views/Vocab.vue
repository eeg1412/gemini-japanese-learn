<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const vocabList = ref([])
const page = ref(1)
const hasMore = ref(true)
const sortOrder = ref('desc')

const verbDescriptions = {
  一类动词:
    '又称五段动词。这类动词在辞书形时，词尾假名位于「う段」（如：う、く、す、つ、ぬ、ぶ、む、る）。在进行动词活用（如ます形、て形、ない形等）时，词尾假名会在「あ・い・う・え・お」五个假名段之间变化，因此称为五段动词。例子：書く（かく）、話す（はなす）、読む（よむ）、待つ（まつ）。',
  二类动词:
    '又称一段动词。这类动词在辞书形时，词尾通常是「る」，并且「る」前面的假名多为「い段」或「え段」。动词活用时，直接去掉词尾的「る」，再接相应的活用形式，词干本身不发生变化，因此称为一段动词。例子：食べる（たべる）、見る（みる）、起きる（おきる）、教える（おしえる）。',
  三类动词:
    '不规则动词。这类动词数量很少，主要包括「する」和「来る（くる）」，以及由「する」构成的复合动词（如：勉強する、运动する）。它们的活用方式不符合一类或二类动词的规律，需要单独记忆。例子：する、来る、勉強する、旅行する。'
}

const showCategoryDescription = category => {
  if (verbDescriptions[category]) {
    alert(`${category}说明:\n\n${verbDescriptions[category]}`)
  }
}

const expandedConjugations = ref(new Set())
const toggleConjugations = id => {
  if (expandedConjugations.value.has(id)) {
    expandedConjugations.value.delete(id)
  } else {
    expandedConjugations.value.add(id)
  }
}

const container = ref(null)
const filterMode = ref('all') // all | starred | unstarred

const sortLocal = () => {
  const order = sortOrder.value === 'asc' ? 1 : -1
  vocabList.value = [...vocabList.value].sort((a, b) => {
    const aStar = Number(a.starred || 0)
    const bStar = Number(b.starred || 0)
    if (aStar !== bStar) return bStar - aStar // starred first
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
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'ja-JP'
  const voice = getJapaneseVoice()
  if (voice) utter.voice = voice
  window.speechSynthesis.speak(utter)
}

const isLoading = ref(false)

const loadVocab = async (isInitial = false) => {
  if ((!hasMore.value && !isInitial) || isLoading.value) return

  isLoading.value = true
  try {
    const res = await axios.get('/api/vocab', {
      params: {
        page: page.value,
        limit: 20,
        sort: sortOrder.value,
        filter: filterMode.value
      },
      headers: { Authorization: `Bearer ${auth.token}` }
    })

    const newItems = res.data.data

    if (newItems.length < 20) {
      hasMore.value = false
    }

    if (isInitial) {
      vocabList.value = newItems
      sortLocal()
      scrollToTop()
    } else {
      vocabList.value = [...vocabList.value, ...newItems]
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
  vocabList.value = []
  loadVocab(true)
}

const changeFilter = mode => {
  filterMode.value = mode
  page.value = 1
  hasMore.value = true
  vocabList.value = []
  loadVocab(true)
}

const toggleStar = async word => {
  try {
    const nextStarred = !Boolean(word.starred)
    const res = await axios.patch(
      `/api/vocab/${word.id}/star`,
      { starred: nextStarred },
      { headers: { Authorization: `Bearer ${auth.token}` } }
    )
    const updated = res.data?.data
    const idx = vocabList.value.findIndex(v => v.id === word.id)
    if (idx >= 0 && updated) {
      vocabList.value[idx] = updated
      sortLocal()
    }
  } catch (e) {
    console.error('Star error:', e)
    alert('收藏操作失败')
  }
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
      loadVocab()
    }
    scrollTimer = null
  }, 200)
}

onMounted(() => {
  loadVocab(true)
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
          <span class="material-icons text-base sm:text-2xl">menu_book</span>
          <span class="truncate text-sm sm:text-base"
            >生词本 ({{ vocabList.length }})</span
          >
        </h2>
        <!-- Mobile Sort Icon -->
        <button
          @click="toggleSort"
          class="sm:hidden p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600"
          :title="sortOrder === 'desc' ? '最新' : '最旧'"
        >
          <span class="material-icons text-sm">sort</span>
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
            <span class="hidden sm:inline">全部</span>
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
            <span class="hidden sm:inline">已收藏</span>
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
            <span class="hidden sm:inline">未收藏</span>
          </button>
        </div>
        <!-- Desktop Sort Button -->
        <button
          @click="toggleSort"
          class="hidden sm:flex items-center gap-1 text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded hover:bg-blue-200"
        >
          <span class="material-icons text-sm">sort</span>
          {{ sortOrder === 'desc' ? '最新' : '最旧' }}
        </button>
      </div>
    </div>

    <!-- Word List -->
    <div
      ref="container"
      @scroll="handleScroll"
      class="flex-1 overflow-y-auto space-y-2 sm:space-y-3 pr-1 sm:pr-2"
    >
      <div
        v-for="word in vocabList"
        :key="word.id"
        class="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg transition"
      >
        <!-- Top Row: Word & Actions -->
        <div class="flex justify-between items-start gap-2">
          <div class="flex items-baseline gap-1 sm:gap-2 flex-wrap min-w-0">
            <h3
              class="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100"
            >
              {{ word.original }}
            </h3>
            <span class="text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
              [{{ word.reading }}]
            </span>
            <span
              class="px-1.5 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0"
            >
              {{ word.type }}
            </span>
            <!-- Verb Category -->
            <span
              v-if="word.verb_category"
              @click.stop="showCategoryDescription(word.verb_category)"
              class="px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex-shrink-0 cursor-help flex items-center gap-0.5"
            >
              {{ word.verb_category }}
              <span class="material-icons text-xs">info</span>
            </span>
          </div>

          <!-- Right: Action Buttons (Fixed width) -->
          <div class="flex gap-1 flex-shrink-0">
            <button
              @click.stop="speakJapanese(word.original)"
              class="p-1 sm:p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="朗读"
            >
              <span class="material-icons text-base">volume_up</span>
            </button>
            <button
              @click.stop="toggleStar(word)"
              :class="[
                'p-1 sm:p-1.5 transition-colors rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
                word.starred
                  ? 'text-yellow-500 dark:text-yellow-400'
                  : 'text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400'
              ]"
              :title="word.starred ? '取消收藏' : '收藏'"
            >
              <span class="material-icons text-base">{{
                word.starred ? 'star' : 'star_border'
              }}</span>
            </button>
            <button
              @click="deleteVocab(word.id)"
              class="p-1 sm:p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="删除生词"
            >
              <span class="material-icons text-base">delete</span>
            </button>
          </div>
        </div>

        <!-- Details Block -->
        <div class="mt-2 space-y-2">
          <!-- Meaning -->
          <p
            class="text-gray-700 dark:text-gray-300 font-medium text-sm sm:text-base"
          >
            {{ word.meaning }}
          </p>

          <!-- Example (Unified) -->
          <div
            v-if="word.example"
            class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded"
          >
            例句: {{ word.example }}
          </div>

          <!-- Conjugations Toggle -->
          <div v-if="word.conjugations">
            <button
              @click.stop="toggleConjugations(word.id)"
              class="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-1"
            >
              <span class="material-icons text-sm">{{
                expandedConjugations.has(word.id)
                  ? 'keyboard_arrow_up'
                  : 'keyboard_arrow_down'
              }}</span>
              {{ expandedConjugations.has(word.id) ? '收起' : '查看' }}动词活用
            </button>

            <!-- Conjugations Grid (3 columns) -->
            <div
              v-if="expandedConjugations.has(word.id)"
              class="mt-2 grid grid-cols-4 gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700"
            >
              <div
                v-for="(val, key) in word.conjugations"
                :key="key"
                class="flex flex-col border-b border-gray-100 dark:border-gray-800 pb-1"
              >
                <span
                  class="text-[12px] text-gray-400 dark:text-gray-400 uppercase tracking-tight"
                  >{{ key }}</span
                >
                <span
                  class="text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium break-all"
                  >{{ val || '-' }}</span
                >
              </div>
            </div>
          </div>

          <!-- Timestamp -->
          <div
            class="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 pt-1"
          >
            {{
              new Date(word.updated_at).toLocaleString('zh-CN', {
                hour12: false
              })
            }}
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
