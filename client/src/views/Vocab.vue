<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const vocabList = ref([])
const totalCount = ref(0)
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

const CONJUGATION_INFO = {
  辞书形: {
    explanation:
      '动词最基本、最原始的形态，也是词典中出现的形式。可表示一般事实、习惯、将来的动作，也是其他所有变形的基础。例如：食べる（吃）、行く（去）。'
  },
  ます形: {
    explanation:
      '表示礼貌、正式的说法，常用于日常交流、课堂、工作场合。说话对象通常是不太熟的人或需要尊敬的人。例如：食べます、行きます。'
  },
  ない形: {
    explanation:
      '否定形，表示“不做某事”或“没有发生”。常用于否定句、拒绝、打算不做某事等。例如：食べない（不吃）、行かない（不去）。'
  },
  た形: {
    explanation:
      '表示动作已经完成或事情已经发生，也可用于表达经验、回忆、条件等。例如：食べた（吃了）、行った（去了）。'
  },
  て形: {
    explanation:
      '非常重要且用途广泛的形态，用来连接动作、表示请求、原因、状态持续或先后顺序。例如：食べてください（请吃）、行ってから（去了之后）。'
  },
  ば形: {
    explanation:
      '假定条件形，表示“如果……就……”，多用于客观条件、规律性结果。例如：雨が降れば、行きません（如果下雨，就不去）。'
  },
  たら形: {
    explanation:
      '条件表达之一，表示“如果……之后……”，强调某件事情发生完成之后，再发生另一件事，常用于具体情况。例如：食べたら、寝ます（吃完就睡）。'
  },
  意志形: {
    explanation:
      '表示说话人的意愿、决定，或向对方提出建议，相当于“我打算……”“一起……吧”。例如：食べよう（吃吧）、行こう（走吧）。'
  },
  命令形: {
    explanation:
      '表示强烈命令或指示，语气直接甚至生硬，多用于上对下、紧急情况或男性口语中，日常需谨慎使用。例如：食べろ（吃！）、行け（去！）。'
  },
  禁止形: {
    explanation:
      '表示禁止做某事，相当于“不要……”。语气较强，常见于规则、警告或强烈制止的场合。例如：食べるな（别吃）、行くな（别去）。'
  },
  可能形: {
    explanation:
      '表示能力、可能性或许可，相当于“能……”“可以……”。例如：食べられる（能吃）、行ける（能去）。'
  },
  被动形: {
    explanation:
      '表示动作的承受者，常带有被影响、被动或不情愿的感觉。例如：先生に褒められた（被老师表扬了）。'
  },
  使役形: {
    explanation:
      '表示“让某人做某事”或“使某事发生”，常用于命令、许可、责任关系中。例如：子供に野菜を食べさせる（让孩子吃蔬菜）。'
  },
  使役被动形: {
    explanation:
      '表示“被迫去做某事”，通常带有无奈、不情愿的语气。例如：宿題をさせられた（被迫做作业）。'
  },
  推量形: {
    explanation:
      '表示推测、猜测或说话人的判断，相当于“大概……吧”“应该……”。例如：雨が降るだろう（大概会下雨）。'
  },
  未然形: {
    explanation:
      '一种语法上的基础形态，本身不能单独使用，主要用于接否定、推量、被动、使役等形式。例如：行か＋ない。'
  },
  连用形: {
    explanation:
      '用于连接其他助动词或句子的基础形态，是ます形、た形、て形等变化的基础。例如：食べ＋ます。'
  },
  终止形: {
    explanation:
      '用于结束句子的形态，现代日语中基本等同于辞书形，用于陈述事实或判断。例如：私はご飯を食べる。'
  },
  连体形: {
    explanation:
      '用于修饰名词的形态，现代日语中多与终止形相同。例如：食べる人（吃的人）。'
  },
  已然形: {
    explanation:
      '主要用于固定语法中，表示既成事实或因果关系，现代日语中多见于『〜ば』结构。例如：行けば分かる（去了就知道）。'
  }
}

const showConjugationDescription = key => {
  const info = CONJUGATION_INFO[key]
  if (info) {
    alert(`${key} 说明:\n${info.explanation}`)
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
        filter: filterMode.value,
        offset: isInitial ? 0 : vocabList.value.length
      },
      headers: { Authorization: `Bearer ${auth.token}` }
    })

    const newItems = res.data.data
    totalCount.value = res.data.total || 0

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
            >生词本 ({{ totalCount }})</span
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
                :key="word.id + '-' + key"
                class="flex flex-col border-b border-gray-100 dark:border-gray-800 pb-1"
              >
                <span
                  @click.stop="showConjugationDescription(key)"
                  class="text-[12px] text-gray-400 dark:text-gray-400 uppercase tracking-tight cursor-help hover:text-blue-500 transition-colors flex items-center gap-0.5"
                >
                  {{ key }}
                  <span class="material-icons text-[12px]">info</span>
                </span>
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
