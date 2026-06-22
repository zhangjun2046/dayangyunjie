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
      // 订单管理
      {
        path: 'orders/cleaning',
        name: 'CleaningOrders',
        component: () => import('@/views/orders/cleaning/index.vue'),
        meta: { title: '保洁订单' },
      },
      {
        path: 'orders/recycling',
        name: 'RecyclingOrders',
        component: () => import('@/views/orders/recycling/index.vue'),
        meta: { title: '废品订单' },
      },
      {
        path: 'orders/consult',
        name: 'ConsultOrders',
        component: () => import('@/views/orders/consult/index.vue'),
        meta: { title: '家政订单' },
      },
      {
        path: 'orders/complaint',
        name: 'Complaints',
        component: () => import('@/views/orders/complaint/index.vue'),
        meta: { title: '投诉反馈' },
      },
      // 数据管理
      {
        path: 'data/dashboard',
        name: 'DataDashboard',
        component: () => import('@/views/data/dashboard/index.vue'),
        meta: { title: '数据看板' },
      },
      // 员工管理
      {
        path: 'workers',
        name: 'Workers',
        component: () => import('@/views/workers/index.vue'),
        meta: { title: '服务人员管理' },
      },
      // 配置管理（P5.9–P5.11）
      {
        path: 'config/services',
        name: 'ConfigServices',
        component: () => import('@/views/config/services/index.vue'),
        meta: { title: '服务配置' },
      },
      {
        path: 'config/operators',
        name: 'ConfigOperators',
        component: () => import('@/views/config/operators/index.vue'),
        meta: { title: '运营人员配置' },
      },
      {
        path: 'config/banners',
        name: 'ConfigBanners',
        component: () => import('@/views/config/banners/index.vue'),
        meta: { title: '轮播图管理' },
      },
      // 系统设置（P5.8 占位）
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '系统设置' },
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
