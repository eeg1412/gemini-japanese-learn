<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { formatDate } from '../utils/dateUtils'

const auth = useAuthStore()
const router = useRouter()

// Refs
const stats = ref({
  totalTokens: 0,
  promptTokens: 0,
  candidatesTokens: 0,
  thoughtsTokens: 0,
  cachedTokens: 0,
  toolPromptTokens: 0,
  promptDetails: [],
  candidatesDetails: [],
  cacheDetails: [],
  toolUseDetails: [],
  count: 0
})
const logs = ref([])
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})
const dateRangeType = ref('today')
const customStart = ref('')
const customEnd = ref('')
const loadingStats = ref(false)
const loadingLogs = ref(false)

// Config
const rangeLabels = {
  today: '当日',
  week: '本周',
  month: '当月',
  all: '全部'
}

const api = axios.create({
  baseURL: '/api/admin',
  headers: {
    Authorization: `Bearer ${auth.token}`
  }
})

const formatDateInput = date => {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Time Helpers
const setRange = type => {
  dateRangeType.value = type

  if (type === 'all') {
    customStart.value = ''
    customEnd.value = ''
    fetchStats(0, Date.now() + 86400000) // 传0和未来时间表示全部
    return
  }

  const now = new Date()
  let start = new Date()
  let end = new Date()

  if (type === 'today') {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (type === 'week') {
    const day = now.getDay() || 7
    start.setDate(now.getDate() - (day - 1))
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (type === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(now.getMonth() + 1)
    end.setDate(0)
    end.setHours(23, 59, 59, 999)
  }

  // Update inputs
  customStart.value = formatDateInput(start)
  customEnd.value = formatDateInput(end)
  fetchStats(start.getTime(), end.getTime())
}

const triggerQuery = () => {
  // 如果输入框为空，则视为查询全部
  const start = customStart.value
    ? new Date(customStart.value).setHours(0, 0, 0, 0)
    : 0
  const end = customEnd.value
    ? new Date(customEnd.value).setHours(23, 59, 59, 999)
    : Date.now() + 86400000
  fetchStats(start, end)
}

// API Calls
const fetchStats = async (start, end) => {
  loadingStats.value = true
  try {
    const res = await api.get('/stats/token', {
      params: { startDate: start, endDate: end }
    })
    // Ensure all required fields exist to prevent template errors
    stats.value = {
      totalTokens: res.data.totalTokens || 0,
      promptTokens: res.data.promptTokens || 0,
      candidatesTokens: res.data.candidatesTokens || 0,
      thoughtsTokens: res.data.thoughtsTokens || 0,
      cachedTokens: res.data.cachedTokens || 0,
      toolPromptTokens: res.data.toolPromptTokens || 0,
      promptDetails: res.data.promptDetails || [],
      candidatesDetails: res.data.candidatesDetails || [],
      cacheDetails: res.data.cacheDetails || [],
      toolUseDetails: res.data.toolUseDetails || [],
      count: res.data.count || 0
    }
  } catch (e) {
    console.error(e)
    if (e.response && e.response.status === 401) router.push('/login')
  } finally {
    loadingStats.value = false
  }
}

const fetchLogs = async (page = 1) => {
  loadingLogs.value = true
  try {
    const res = await api.get('/stats/login', {
      params: { page, limit: pagination.value.limit }
    })
    logs.value = res.data.data || []
    pagination.value = {
      page: res.data.page || 1,
      limit: res.data.limit || 20,
      total: res.data.total || 0,
      totalPages: res.data.totalPages || 0
    }
  } catch (e) {
    console.error(e)
    logs.value = [] // Reset to empty array on error
  } finally {
    loadingLogs.value = false
  }
}

const changePage = newPage => {
  if (newPage >= 1 && newPage <= pagination.value.totalPages) {
    fetchLogs(newPage)
  }
}

onMounted(() => {
  setRange('today')
  fetchLogs()
})
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="container mx-auto p-2 sm:p-4 max-w-5xl">
      <!-- Stats Card -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4"
      >
        <div
          class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3"
        >
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Token 统计
          </h2>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex bg-gray-100 dark:bg-gray-700 rounded p-1">
              <button
                v-for="(label, type) in rangeLabels"
                :key="type"
                @click="setRange(type)"
                :class="[
                  'px-3 py-1 rounded text-xs sm:text-sm transition-all',
                  dateRangeType === type
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                ]"
              >
                {{ label }}
              </button>
            </div>
          </div>
        </div>

        <div
          class="flex flex-col sm:flex-row items-center gap-2 mb-4 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <!-- Compact Date Range Inputs -->
          <div class="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              type="date"
              v-model="customStart"
              @input="dateRangeType = 'custom'"
              class="flex-1 sm:w-32 h-8 border border-gray-300 dark:border-gray-600 rounded px-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
            />
            <span class="text-gray-400 text-[10px] whitespace-nowrap">至</span>
            <input
              type="date"
              v-model="customEnd"
              @input="dateRangeType = 'custom'"
              class="flex-1 sm:w-32 h-8 border border-gray-300 dark:border-gray-600 rounded px-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
            />
          </div>

          <!-- Compact Action Button -->
          <button
            @click="triggerQuery"
            class="w-full sm:w-auto px-4 h-8 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all rounded shadow-sm flex items-center justify-center gap-1"
          >
            <span class="material-icons text-sm">analytics</span>
            执行统计
          </button>
        </div>

        <div class="relative">
          <Transition
            enter-active-class="transition-opacity duration-500 delay-1000"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="loadingStats"
              class="absolute inset-0 z-10 bg-white/60 dark:bg-gray-800/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl"
            >
              <span
                class="material-icons animate-spin text-3xl mb-3 text-blue-600 dark:text-blue-400"
                >refresh</span
              >
              <span class="text-sm font-medium text-gray-600 dark:text-gray-300"
                >正在汇总统计数据...</span
              >
            </div>
          </Transition>

          <div
            :class="[
              'grid grid-cols-1 gap-6 transition-opacity duration-500',
              loadingStats ? 'opacity-40 delay-1000' : 'opacity-100'
            ]"
          >
            <!-- 主指标：总消耗 -->
            <div
              class="lg:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900/30 flex flex-col justify-center text-center"
            >
              <div
                class="text-sm text-blue-600/70 dark:text-blue-400/70 mb-1 font-bold"
              >
                总计 (Total):
              </div>
              <div
                class="text-4xl sm:text-5xl font-black text-blue-700 dark:text-blue-300 tracking-tighter mb-4"
              >
                {{ stats.totalTokens?.toLocaleString() }}
              </div>
              <div
                class="flex items-center justify-center gap-4 text-xs font-medium text-blue-600/60 dark:text-blue-400/60"
              >
                <span class="flex items-center gap-1">
                  <span class="material-icons text-[14px]">bolt</span>
                  {{ stats.count }} 次请求
                </span>
              </div>
            </div>

            <!-- 次要指标：详细分类 (对齐 Chat.vue 逻辑) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                class="space-y-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700"
              >
                <!-- 输入 -->
                <div class="flex flex-col">
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm text-gray-600 dark:text-gray-400"
                      >输入 (Prompt):</span
                    >
                    <span
                      class="font-mono font-bold text-blue-600 dark:text-blue-400"
                      >{{ stats.promptTokens?.toLocaleString() }}</span
                    >
                  </div>
                  <div
                    v-for="det in stats.promptDetails"
                    :key="det.modality"
                    class="flex justify-between text-[11px] text-gray-400 pl-3"
                  >
                    <span>└ {{ det.modality }}:</span>
                    <span class="font-mono">{{
                      det.tokenCount?.toLocaleString()
                    }}</span>
                  </div>
                </div>

                <!-- 输出 -->
                <div
                  class="flex flex-col pt-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm text-gray-600 dark:text-gray-400"
                      >输出 (Response):</span
                    >
                    <span
                      class="font-mono font-bold text-green-600 dark:text-green-400"
                      >{{ stats.candidatesTokens?.toLocaleString() }}</span
                    >
                  </div>
                  <div
                    v-for="det in stats.candidatesDetails"
                    :key="det.modality"
                    class="flex justify-between text-[11px] text-gray-400 pl-3"
                  >
                    <span>└ {{ det.modality }}:</span>
                    <span class="font-mono">{{
                      det.tokenCount?.toLocaleString()
                    }}</span>
                  </div>
                </div>
              </div>

              <div
                class="space-y-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700"
              >
                <!-- 思考 -->
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600 dark:text-gray-400"
                    >思考 (Thinking):</span
                  >
                  <span
                    class="font-mono font-bold text-amber-600 dark:text-amber-400"
                    >{{ stats.thoughtsTokens?.toLocaleString() }}</span
                  >
                </div>

                <!-- 缓存 -->
                <div
                  class="flex flex-col pt-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm text-gray-600 dark:text-gray-400"
                      >缓存 (Cached):</span
                    >
                    <span
                      class="font-mono font-bold text-cyan-600 dark:text-cyan-400"
                      >{{ stats.cachedTokens?.toLocaleString() }}</span
                    >
                  </div>
                  <div
                    v-for="det in stats.cacheDetails"
                    :key="det.modality"
                    class="flex justify-between text-[11px] text-gray-400 pl-3"
                  >
                    <span>└ {{ det.modality }}:</span>
                    <span class="font-mono">{{
                      det.tokenCount?.toLocaleString()
                    }}</span>
                  </div>
                </div>

                <!-- 工具 -->
                <div
                  class="flex flex-col pt-2 border-t border-gray-200 dark:border-gray-700"
                  v-if="stats.toolPromptTokens"
                >
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm text-gray-600 dark:text-gray-400"
                      >工具提示 (Tool Prompt):</span
                    >
                    <span
                      class="font-mono font-bold text-purple-600 dark:text-purple-400"
                      >{{ stats.toolPromptTokens?.toLocaleString() }}</span
                    >
                  </div>
                  <div
                    v-for="det in stats.toolUseDetails"
                    :key="det.modality"
                    class="flex justify-between text-[11px] text-gray-400 pl-3"
                  >
                    <span>└ {{ det.modality }}:</span>
                    <span class="font-mono">{{
                      det.tokenCount?.toLocaleString()
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Login Logs Card -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4"
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
            账号登录情况
          </h2>
          <div class="text-xs text-gray-400">
            共 {{ pagination.total }} 条记录
          </div>
        </div>

        <div
          class="relative overflow-x-auto rounded border border-gray-200 dark:border-gray-700 mb-4"
        >
          <!-- Loading Overlay -->
          <Transition
            enter-active-class="transition-opacity duration-500 delay-1000"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="loadingLogs"
              class="absolute inset-0 z-10 bg-white/60 dark:bg-gray-800/60 backdrop-blur-[1px] flex flex-col items-center justify-center"
            >
              <span
                class="material-icons animate-spin text-3xl mb-3 text-blue-600 dark:text-blue-400"
                >refresh</span
              >
              <span class="text-sm font-medium text-gray-600 dark:text-gray-300"
                >正在获取日志...</span
              >
            </div>
          </Transition>

          <div
            :class="[
              'transition-opacity duration-500',
              loadingLogs ? 'opacity-40 delay-1000' : 'opacity-100'
            ]"
          >
            <table
              class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
            >
              <thead class="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    状态
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    账号
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    时间
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    IP
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
              >
                <tr
                  v-for="log in logs"
                  :key="log.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td class="px-4 py-2 whitespace-nowrap text-xs sm:text-sm">
                    <span
                      :class="[
                        'px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border',
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                          : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                      ]"
                    >
                      {{ log.status === 'success' ? '成功' : '失败' }}
                    </span>
                  </td>
                  <td
                    class="px-4 py-2 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    {{ log.username || '---' }}
                  </td>
                  <td
                    class="px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-200"
                  >
                    {{ formatDate(log.created_at) }}
                  </td>
                  <td
                    class="px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono"
                  >
                    {{ log.ip }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- 空状态提示 -->
            <div
              v-if="(!logs || logs.length === 0) && !loadingLogs"
              class="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500"
            >
              <span class="material-icons text-4xl mb-2">inbox</span>
              <span class="text-sm">暂无登录记录</span>
            </div>
          </div>
        </div>

        <!-- Pagination UI -->
        <div
          v-if="pagination.totalPages > 1"
          class="flex justify-between items-center px-1"
        >
          <button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page === 1 || loadingLogs"
            class="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <span class="material-icons text-sm">chevron_left</span> 上一页
          </button>

          <span class="text-xs text-gray-500 dark:text-gray-400">
            第 {{ pagination.page }} / {{ pagination.totalPages }} 页
          </span>

          <button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page === pagination.totalPages || loadingLogs"
            class="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            下一页 <span class="material-icons text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
