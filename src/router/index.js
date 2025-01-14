import { createRouter, createWebHistory } from 'vue-router'
import CesiumMain from '@/views/CesiumMain.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: CesiumMain
    },
    {
      path: '/video-clamp',
      component: () => import('@/views/VideoClamp.vue')
    },
    {
      path: '/viewshed',
      component: () => import('@/views/Viewshed.vue')
    },
    {
      path: '/frustum',
      component: () => import('@/views/Frustum.vue')
    },
    {
      path: '/viewshed-shadowmap',
      component: () => import('@/views/ViewShedShadowMap.vue')
    },
    {
      path: '/video-shadowmap',
      component: () => import('@/views/VideoShadowMap.vue')
    }
  ]
})

export default router