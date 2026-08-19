/**
 * 员工端路由守卫
 * 使用 uni.addInterceptor 拦截 navigateTo / redirectTo / switchTab
 * 未登录时访问受保护页面 → 重定向至登录页
 */

import { useAuthStore } from '@/store/auth';

/** 不需要登录即可访问的页面路径（登录页与协议页公开） */
const PUBLIC_PAGES = ['pages/login/index', 'pages/agreement/index'];

function isProtected(url: string): boolean {
  const path = url.split('?')[0].replace(/^\//, '');
  return !PUBLIC_PAGES.some((p) => path.startsWith(p));
}

function handleBlock() {
  uni.redirectTo({ url: '/pages/login/index' });
}

export function useRouteGuard() {
  function install() {
    const interceptorConfig = {
      invoke(args: { url: string }) {
        const authStore = useAuthStore();
        if (!authStore.isLoggedIn && isProtected(args.url)) {
          console.info('[worker-route-guard] blocked:', args.url);
          handleBlock();
          return false;
        }
        return true;
      },
    };

    uni.addInterceptor('navigateTo', interceptorConfig);
    uni.addInterceptor('redirectTo', {
      invoke(args: { url: string }) {
        // 登录页本身不拦截（防止死循环）
        const path = args.url.split('?')[0].replace(/^\//, '');
        if (path.startsWith('pages/login/index')) return true;
        const authStore = useAuthStore();
        if (!authStore.isLoggedIn && isProtected(args.url)) {
          console.info('[worker-route-guard] redirectTo blocked:', args.url);
          return false;
        }
        return true;
      },
    });
    uni.addInterceptor('switchTab', {
      invoke(args: { url: string }) {
        const authStore = useAuthStore();
        if (!authStore.isLoggedIn && isProtected(args.url)) {
          console.info('[worker-route-guard] switchTab blocked:', args.url);
          handleBlock();
          return false;
        }
        return true;
      },
    });

    console.info('[worker-route-guard] installed');
  }

  return { install };
}
