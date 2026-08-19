/**
 * 路由守卫
 * 使用 uni.addInterceptor 拦截 navigateTo / switchTab
 * 未登录时访问受保护页面 → 弹提示并跳回首页
 */

import { useAuthStore } from '@/store/auth';

/** 不需要登录即可访问的页面路径前缀（浏览服务内容无需登录，下单时再鉴权） */
const PUBLIC_PAGES = [
  'pages/index/index',
  'pages/service-detail/index',
  'pages/agreement/index',
];

function isProtected(url: string): boolean {
  // 去掉查询参数后匹配
  const path = url.split('?')[0].replace(/^\//, '');
  return !PUBLIC_PAGES.some((p) => path.startsWith(p));
}

function handleBlock() {
  uni.showToast({
    title: '请先登录',
    icon: 'none',
    duration: 1500,
  });
  // 跳回首页 Tab
  setTimeout(() => {
    uni.switchTab({ url: '/pages/index/index' });
  }, 300);
}

export function useRouteGuard() {
  function install() {
    const interceptorConfig = {
      invoke(args: { url: string }) {
        const authStore = useAuthStore();
        if (!authStore.isLoggedIn && isProtected(args.url)) {
          console.info('[route-guard] blocked:', args.url);
          handleBlock();
          // 返回 false 阻止跳转（uni-app interceptor 协议）
          return false;
        }
        return true;
      },
    };

    uni.addInterceptor('navigateTo', interceptorConfig);
    uni.addInterceptor('redirectTo', interceptorConfig);
    uni.addInterceptor('switchTab', {
      invoke(args: { url: string }) {
        const authStore = useAuthStore();
        if (!authStore.isLoggedIn && isProtected(args.url)) {
          console.info('[route-guard] switchTab blocked:', args.url);
          handleBlock();
          return false;
        }
        return true;
      },
    });

    console.info('[route-guard] installed');
  }

  return { install };
}
