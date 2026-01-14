import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'
import 'material-icons/iconfont/material-icons.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Global axios interceptor for 403 errors
let isShowingAlert = false
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403) {
      const auth = useAuthStore()
      if (!isShowingAlert) {
        isShowingAlert = true
        alert('登录信息过期，请重新登录')
        auth.logout()
        // Reset flag after a short delay
        setTimeout(() => {
          isShowingAlert = false
        }, 1000)
      }
    }
    return Promise.reject(error)
  }
)

app.mount('#app')
