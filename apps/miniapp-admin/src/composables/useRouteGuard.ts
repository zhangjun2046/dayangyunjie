/**
 * 管理端路由守卫
 * 未登录访问受保护页面 → 保存订单深链后重定向至登录页
 */

import { useAuthStore } from '@/store/auth';
import { captureAdminOrderDeepLinkFromUrl } from '@/utils/admin-deeplink';

const PUBLIC_PAGES = ['pages/login/index', 'pages/agreement/index'];

function isProtected(url: string): boolean {
  const path = url.split('?')[0].replace(/^\//, '');
  return !PUBLIC_PAGES.some((p) => path.startsWith(p));
}

function handleBlock(url: string) {
  captureAdminOrderDeepLinkFromUrl(url);
  uni.reLaunch({ url: '/pages/login/index' });
}

export async function ensureAuthed(): Promise<boolean> {
  const authStore = useAuthStore();
  const ok = await authStore.ensureSession();
  if (ok) return true;
  console.info('[admin-route-guard] not logged in, reLaunch login after paint');
  captureAdminOrderDeepLinkFromUrl(
    (() => {
      try {
        const pages = getCurrentPages() as Array<{ route?: string; options?: Record<string, unknown> }>;
        const current = pages[pages.length - 1];
        const query = current?.options ?? {};
        const qs = Object.entries(query)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value ?? ''))}`)
          .join('&');
        return `/${current?.route ?? ''}${qs ? `?${qs}` : ''}`;
      } catch {
        return '';
      }
    })(),
  );
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/login/index' });
  }, 50);
  return false;
}

export function useRouteGuard() {
  function install() {
    const interceptorConfig = {
      invoke(args: { url: string }) {
        const authStore = useAuthStore();
        if (!authStore.isLoggedIn && isProtected(args.url)) {
          console.info('[admin-route-guard] blocked:', args.url);
          handleBlock(args.url);
          return false;
        }
        return true;
      },
    };

    uni.addInterceptor('navigateTo', interceptorConfig);
    uni.addInterceptor('redirectTo', {
      invoke(args: { url: string }) {
        const path = args.url.split('?')[0].replace(/^\//, '');
        if (path.startsWith('pages/login/index')) return true;
        const authStore = useAuthStore();
        if (!authStore.isLoggedIn && isProtected(args.url)) {
          console.info('[admin-route-guard] redirectTo blocked:', args.url);
          handleBlock(args.url);
          return false;
        }
        return true;
      },
    });
    uni.addInterceptor('reLaunch', interceptorConfig);
    uni.addInterceptor('switchTab', interceptorConfig);

    console.info('[admin-route-guard] installed');
  }

  return { install };
}
