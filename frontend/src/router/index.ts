import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { resolveUserRole } from '../types/auth'
import { applyPageMeta } from '../utils/applyPageMeta'
import {
  AUCTIONS_META,
  HOME_META,
  NOT_FOUND_META,
  SOMMELIER_META,
  WHISKIES_META,
  privatePageMeta,
  type PageMeta,
} from '../utils/pageMeta'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
    /** Detail pages leave this out and set their own meta once the data is known. */
    seo?: PageMeta
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { seo: HOME_META },
    },
    {
      path: '/whiskies',
      name: 'whiskies',
      component: () => import('../views/WhiskyView.vue'),
      meta: { seo: WHISKIES_META },
    },
    {
      path: '/whiskies/:id',
      name: 'whisky-detail',
      component: () => import('../views/WhiskyDetailView.vue'),
    },
    {
      path: '/auctions',
      name: 'auctions',
      component: () => import('../views/AuctionListView.vue'),
      meta: { seo: AUCTIONS_META },
    },
    {
      path: '/auctions/:id',
      name: 'auction-detail',
      component: () => import('../views/AuctionDetailView.vue'),
    },
    {
      path: '/sommelier',
      name: 'sommelier',
      component: () => import('../views/SommelierView.vue'),
      meta: { seo: SOMMELIER_META },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { seo: privatePageMeta('登入') },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { seo: privatePageMeta('註冊') },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { seo: privatePageMeta('忘記密碼') },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true, seo: privatePageMeta('會員中心') },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, seo: privatePageMeta('管理後台') },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('../views/AdminUsersView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, seo: privatePageMeta('會員管理') },
    },
    {
      path: '/admin/reviews',
      name: 'admin-reviews',
      component: () => import('../views/AdminReviewsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, seo: privatePageMeta('評論管理') },
    },
    {
      path: '/admin/auctions',
      name: 'admin-auctions',
      component: () => import('../views/AdminAuctionsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, seo: privatePageMeta('競標管理') },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
      meta: { seo: NOT_FOUND_META },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    await authStore.restoreSession()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.requiresAdmin) {
    if (!authStore.isAuthenticated) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }

    if (resolveUserRole(authStore.user?.role) !== 'admin') {
      return { name: 'home' }
    }
  }

  return true
})

router.afterEach((to) => {
  if (to.meta.seo) {
    applyPageMeta(to.meta.seo, to.path)
  }
})

export default router
