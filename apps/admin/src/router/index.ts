import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { ElMessage } from 'element-plus';

import { getToken } from '@/utils/auth';
import { useUserStore } from '@/store';

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
        meta: { title: '保洁订单', menuKey: 'orders.cleaning' },
      },
      {
        path: 'orders/recycling',
        name: 'RecyclingOrders',
        component: () => import('@/views/orders/recycling/index.vue'),
        meta: { title: '废品订单', menuKey: 'orders.recycling' },
      },
      {
        path: 'orders/consult',
        name: 'ConsultOrders',
        component: () => import('@/views/orders/consult/index.vue'),
        meta: { title: '家政订单', menuKey: 'orders.consult' },
      },
      {
        path: 'orders/complaint',
        name: 'Complaints',
        component: () => import('@/views/orders/complaint/index.vue'),
        meta: { title: '投诉反馈', menuKey: 'orders.complaint' },
      },
      // 数据管理
      {
        path: 'data/dashboard',
        name: 'DataDashboard',
        component: () => import('@/views/data/dashboard/index.vue'),
        meta: { title: '数据看板', menuKey: 'data.dashboard' },
      },
      // 员工管理
      {
        path: 'workers',
        name: 'Workers',
        component: () => import('@/views/workers/index.vue'),
        meta: { title: '服务人员管理', menuKey: 'staff.workers' },
      },
      // 配置管理（P5.9–P5.11）
      {
        path: 'config/services',
        name: 'ConfigServices',
        component: () => import('@/views/config/services/index.vue'),
        meta: { title: '服务配置', menuKey: 'config.services' },
      },
      {
        path: 'config/review-keywords',
        name: 'ConfigReviewKeywords',
        component: () => import('@/views/config/review-keywords/index.vue'),
        meta: { title: '评价关键词配置', menuKey: 'config.review-keywords' },
      },
      {
        path: 'config/operators',
        name: 'ConfigOperators',
        component: () => import('@/views/config/operators/index.vue'),
        meta: { title: '运营人员配置', menuKey: 'config.operators' },
      },
      {
        path: 'config/banners',
        name: 'ConfigBanners',
        component: () => import('@/views/config/banners/index.vue'),
        meta: { title: '轮播图管理', menuKey: 'config.banners' },
      },
      // 系统管理（始终仅超级管理员可见可用，不受功能授权树影响，见 P5.8 补丁）
      {
        path: 'system/users',
        name: 'SystemUsers',
        component: () => import('@/views/system/users/index.vue'),
        meta: { title: '用户管理', requiresSuperAdmin: true, menuKey: 'system.users' },
      },
      {
        path: 'system/permissions',
        name: 'SystemPermissions',
        component: () => import('@/views/system/permissions/index.vue'),
        meta: { title: '功能授权', requiresSuperAdmin: true, menuKey: 'system.permissions' },
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

  const userStore = useUserStore();

  if (to.meta.requiresSuperAdmin && !userStore.isSuperAdmin) {
    ElMessage.warning('仅超级管理员可访问该功能');
    next({ path: '/dashboard' });
    return;
  }

  // P5.8b 功能授权：按 menuKey 拦截未授权页面直接输入 URL 访问（超级管理员始终放行）
  const menuKey = to.meta.menuKey as string | undefined;
  if (menuKey && !userStore.hasMenu(menuKey)) {
    ElMessage.warning('您没有权限访问该功能');
    next({ path: '/dashboard' });
    return;
  }

  next();
});

export default router;
