import { defineStore } from 'pinia'
import axios from 'axios'
import router from '../router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null
  }),
  actions: {
    async login(username, password) {
      try {
        const res = await axios.post('/api/auth/login', { username, password })
        this.token = res.data.accessToken
        localStorage.setItem('token', this.token)
        router.push('/')
        return true
      } catch (e) {
        console.error(e)
        return false
      }
    },
    logout() {
      this.token = null
      localStorage.removeItem('token')
      router.push('/login')
    }
  }
})
