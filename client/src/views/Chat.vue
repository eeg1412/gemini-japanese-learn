<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import axios from 'axios'
import MarkdownIt from 'markdown-it'
import { useAuthStore } from '../stores/auth'
import { processImageWithMaxDimension } from '../utils/imageUtils'

const auth = useAuthStore()
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const messages = ref([])
const input = ref('')
const imageFile = ref(null)
const imagePreview = ref(null)
const customPrompt = ref('')
const showConfig = ref(false)
const isLoading = ref(false)
const isHistoryLoading = ref(false)
const page = ref(1)
const hasMore = ref(true)
const chatContainer = ref(null)
const imageToken = ref(null)
let refreshTimer = null

const fetchImageToken = async () => {
  try {
    const res = await axios.get('/api/chat/image-token', {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    imageToken.value = res.data.imageToken
  } catch (e) {
    console.error('Failed to fetch image token:', e)
  }
}

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

const getImageUrl = imageData => {
  if (!imageData) return ''
  if (imageData.startsWith('data:')) return imageData
  // Use specialized image token
  return `/api/chat/image/${imageData}?token=${imageToken.value || ''}`
}

const openImage = async imageData => {
  if (!imageData) return
  if (imageData.startsWith('data:')) {
    const newWindow = window.open()
    newWindow.document.write(`<img src="${imageData}" style="max-width:100%">`)
    return
  }

  try {
    // Fetch a fresh token for the new window
    const res = await axios.get('/api/chat/image-token', {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    const newToken = res.data.imageToken
    const url = `/api/chat/image/${imageData}?token=${newToken}`
    window.open(url, '_blank')
  } catch (e) {
    console.error('Failed to open image:', e)
    alert('预览图片失败')
  }
}

const inputEl = ref(null)
const customPromptEl = ref(null)

const getLineHeightPx = el => {
  if (!el) return 0
  const styles = window.getComputedStyle(el)
  const lineHeight = styles.lineHeight
  if (lineHeight && lineHeight !== 'normal') return parseFloat(lineHeight)
  const fontSize = parseFloat(styles.fontSize || '14')
  return fontSize * 1.2
}

const autoResizeTextarea = (el, maxRows = 5) => {
  if (!el) return

  const styles = window.getComputedStyle(el)
  const paddingTop = parseFloat(styles.paddingTop || '0')
  const paddingBottom = parseFloat(styles.paddingBottom || '0')
  const borderTop = parseFloat(styles.borderTopWidth || '0')
  const borderBottom = parseFloat(styles.borderBottomWidth || '0')
  const lineHeight = getLineHeightPx(el)

  const verticalPadding = paddingTop + paddingBottom + borderTop + borderBottom
  const singleLineHeight = lineHeight + verticalPadding
  const maxHeight = lineHeight * maxRows + verticalPadding

  // 先设置极小的高度，这样 scrollHeight 才能准确反映实际内容高度
  el.style.height = '1px'
  const contentHeight = el.scrollHeight

  // 计算实际需要的高度：至少1行，最多maxRows行
  let nextHeight = Math.min(contentHeight, maxHeight)

  el.style.height = `${nextHeight}px`
  el.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden'
}

const loadHistory = async (isInitial = false) => {
  if ((!hasMore.value && !isInitial) || isHistoryLoading.value) return

  isHistoryLoading.value = true
  try {
    const res = await axios.get('/api/chat/history', {
      params: { page: page.value, limit: 20 },
      headers: { Authorization: `Bearer ${auth.token}` }
    })

    // API items are already sorted oldest -> newest for this batch
    const newMessages = res.data.data

    if (res.data.data.length < 20) {
      hasMore.value = false
    }

    if (isInitial) {
      messages.value = newMessages
      scrollToBottom()
    } else {
      // Prepend
      const prevHeight = chatContainer.value.scrollHeight
      messages.value = [...newMessages, ...messages.value]

      nextTick(() => {
        const newHeight = chatContainer.value.scrollHeight
        chatContainer.value.scrollTop = newHeight - prevHeight
      })
    }
  } catch (e) {
    console.error(e)
  } finally {
    isHistoryLoading.value = false
  }
}

const scrollToBottom = (force = true) => {
  nextTick(() => {
    if (chatContainer.value) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer.value
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100
      if (force || isAtBottom) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
      }
    }
  })
}

let scrollTimer = null
const handleScroll = () => {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    if (
      chatContainer.value.scrollTop === 0 &&
      !isHistoryLoading.value &&
      hasMore.value
    ) {
      page.value++
      loadHistory()
    }
    scrollTimer = null
  }, 200)
}

const selectImage = e => {
  const file = e.target.files[0]
  if (file) processFile(file)
}

const processFile = async file => {
  try {
    // 检查并缩放图片
    const { file: processedFile, base64 } = await processImageWithMaxDimension(
      file,
      1600
    )
    imageFile.value = processedFile
    imagePreview.value = base64
  } catch (error) {
    console.error('Failed to process image:', error)
    alert('图片处理失败: ' + error.message)
  }
}

const handlePaste = e => {
  const items = (e.clipboardData || window.clipboardData).items
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile()
      processFile(blob)
    }
  }
}

const sendMessage = async () => {
  if ((!input.value.trim() && !imageFile.value) || isLoading.value) return

  const currentMsg = input.value
  const currentImg = imagePreview.value

  // Optimistic UI
  messages.value.push({
    role: 'user',
    content: currentMsg,
    image_data: currentImg,
    created_at: Date.now()
  })
  messages.value.push({
    role: 'model',
    content: '思考中...',
    created_at: Date.now(),
    loading: true
  })
  scrollToBottom(true) // Always scroll for user message

  // Reset inputs
  input.value = ''
  nextTick(() => autoResizeTextarea(inputEl.value, 1))
  imageFile.value = null
  imagePreview.value = null
  isLoading.value = true

  try {
    const res = await axios.post(
      '/api/chat/send',
      {
        message: currentMsg,
        image: currentImg,
        customPrompt: customPrompt.value
      },
      {
        headers: { Authorization: `Bearer ${auth.token}` },
        timeout: 300000 // 设置超时为 5 分钟
      }
    )

    // Replace loading message
    messages.value.pop()
    messages.value.push({
      role: 'model',
      content: res.data.response,
      created_at: Date.now()
    })

    // Always force scroll to bottom when AI finishes
    scrollToBottom(true)
  } catch (e) {
    messages.value.pop()
    const errorMsg = e.response?.data?.error || e.message
    messages.value.push({
      role: 'model',
      content: '错误: ' + errorMsg,
      error: true
    })
    scrollToBottom(true)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  // 获取图片访问令牌
  await fetchImageToken()
  // 每50分钟刷新一次 (有效期1小时)
  refreshTimer = setInterval(fetchImageToken, 50 * 60 * 1000)

  // 从 localStorage 恢复自定义系统提示词
  const savedPrompt = localStorage.getItem('customPrompt')
  if (savedPrompt) {
    showConfig.value = true
    nextTick(() => {
      customPrompt.value = savedPrompt
    })
  }

  loadHistory(true)
  nextTick(() => {
    autoResizeTextarea(inputEl.value, 1)
  })
})

watch(input, () => nextTick(() => autoResizeTextarea(inputEl.value)))
watch(customPrompt, newVal => {
  // 保存到 localStorage
  if (newVal && newVal.trim()) {
    localStorage.setItem('customPrompt', newVal)
  } else {
    localStorage.removeItem('customPrompt')
  }
  nextTick(() => autoResizeTextarea(customPromptEl.value))
})

watch(
  () => auth.token,
  newToken => {
    if (newToken) {
      fetchImageToken()
    } else {
      imageToken.value = null
    }
  }
)
watch(showConfig, newVal => {
  if (newVal) {
    nextTick(() => {
      autoResizeTextarea(customPromptEl.value, 1)
    })
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
    <!-- Chat Area -->
    <div
      ref="chatContainer"
      @scroll="handleScroll"
      class="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0"
    >
      <div v-if="isHistoryLoading" class="flex justify-center py-2">
        <div
          class="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"
        ></div>
      </div>
      <div
        v-if="!hasMore && !isHistoryLoading"
        class="text-center text-gray-400 text-sm py-2"
      >
        没有更多历史记录
      </div>

      <template v-for="(msg, index) in messages" :key="index">
        <div
          v-if="msg.role === 'user' && index !== 0"
          class="w-full h-px bg-gray-200 dark:bg-gray-700 my-4"
        ></div>
        <div
          :class="[
            'flex',
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          ]"
        >
          <div
            :class="[
              'max-w-[80%] min-w-0 rounded-lg p-3 shadow-md break-words flex flex-col',
              msg.role === 'user'
                ? 'bg-blue-600 text-white whitespace-pre-wrap'
                : 'bg-white dark:bg-gray-800 dark:text-gray-100 border dark:border-gray-700 prose dark:prose-invert prose-sm max-w-none'
            ]"
          >
            <img
              v-if="msg.image_data"
              :src="getImageUrl(msg.image_data)"
              @click="openImage(msg.image_data)"
              class="w-full max-w-[100px] h-[100px] rounded mb-2 object-contain bg-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
            />
            <div v-if="msg.loading" class="animate-pulse">思考中...</div>
            <div v-else-if="msg.role === 'user'">
              {{ msg.content }}
            </div>
            <div v-else v-html="md.render(msg.content)"></div>
            <div
              :class="[
                'text-[10px] mt-1 text-right select-none',
                msg.role === 'user'
                  ? 'text-blue-200'
                  : 'text-gray-400 dark:text-gray-500'
              ]"
            >
              {{
                new Date(msg.created_at || Date.now()).toLocaleString('zh-CN', {
                  hour12: false
                })
              }}
            </div>
          </div>
        </div>
      </template>

      <div
        v-if="messages.length > 0 && !isLoading"
        class="w-full flex items-center justify-center gap-4 my-6 text-xs text-gray-400"
      >
        <div class="h-px bg-gray-300 dark:bg-gray-700 flex-1"></div>
        <span>以下是新的会话</span>
        <div class="h-px bg-gray-300 dark:bg-gray-700 flex-1"></div>
      </div>
    </div>

    <!-- Controls -->
    <div class="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
      <!-- Config Toggle -->
      <button
        @click="showConfig = !showConfig"
        class="flex items-center gap-1 text-xs text-gray-500 mb-2 hover:underline"
      >
        <span class="material-icons text-xs">settings</span>
        {{ showConfig ? '隐藏设置' : '显示设置' }}
      </button>

      <div
        v-if="showConfig"
        class="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded"
      >
        <label class="block text-xs font-bold mb-1">自定义系统提示词：</label>
        <textarea
          ref="customPromptEl"
          v-model="customPrompt"
          @input="e => autoResizeTextarea(e.target)"
          class="w-full text-sm p-1 rounded border dark:bg-gray-600 dark:border-gray-500 resize-none"
        ></textarea>
      </div>

      <!-- Preview Image -->
      <div v-if="imagePreview" class="relative inline-block mb-2">
        <img :src="imagePreview" class="h-20 rounded border" />
        <button
          @click="
            () => {
              imageFile = null
              imagePreview = null
            }
          "
          class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
        >
          <span class="material-icons text-xs">close</span>
        </button>
      </div>

      <!-- Input Bar -->
      <div class="flex gap-2">
        <label
          class="cursor-pointer text-gray-500 hover:text-blue-500 p-2 flex items-center"
        >
          <span class="material-icons">photo_camera</span>
          <input
            type="file"
            @change="selectImage"
            accept="image/*"
            class="hidden"
          />
        </label>
        <textarea
          ref="inputEl"
          v-model="input"
          @paste="handlePaste"
          @keydown.enter.exact.prevent="sendMessage"
          @input="e => autoResizeTextarea(e.target)"
          placeholder="输入内容"
          class="flex-1 p-2 border rounded resize-none focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 min-h-[1.5rem] max-h-[8.5rem] h-[40px]"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="isLoading"
          class="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <span class="material-icons">send</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Move prose margin adjustments here if needed */
:deep(.prose) {
  max-width: none;
}
:deep(.prose p:first-child) {
  margin-top: 0;
}
:deep(.prose p:last-child) {
  margin-bottom: 0;
}
</style>
