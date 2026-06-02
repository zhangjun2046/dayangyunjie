import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { getToken } from '@/utils/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, _from, next) => {
  const title = (to.meta.title as string) || '管理后台';
  document.title = `${title} · 大洋云洁`;

  if (to.meta.public) {
    if (to.path === '/login' && getToken()) {
      next({ path: '/dashboard' });
      return;
    }
    next();
    return;
  }

  if (!getToken()) {
    next({ path: '/login', query: { redirect: to.fullPath } });
    return;
  }

  next();
});

export default router;
