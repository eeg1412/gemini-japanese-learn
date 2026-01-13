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
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403) {
      const auth = useAuthStore()
      alert('登录信息过期，请重新登录')
      auth.logout()
    }
    return Promise.reject(error)
  }
)

app.mount('#app')
