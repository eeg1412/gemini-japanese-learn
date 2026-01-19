import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Chat from '../views/Chat.vue'
import Vocab from '../views/Vocab.vue'
import Grammar from '../views/Grammar.vue'
import Login from '../views/Login.vue'
import Admin from '../views/Admin.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Chat, meta: { requiresAuth: true } },
    { path: '/vocab', component: Vocab, meta: { requiresAuth: true } },
    { path: '/grammar', component: Grammar, meta: { requiresAuth: true } },
    { path: '/admin', component: Admin, meta: { requiresAuth: true } },
    { path: '/login', component: Login }
  ]
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.token) {
    next('/login')
  } else {
    next()
  }
})

export default router
