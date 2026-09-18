<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useRouteGuard } from '@/composables/useRouteGuard';
import { captureAdminOrderDeepLink } from '@/utils/admin-deeplink';

const { install: installRouteGuard } = useRouteGuard();

onLaunch((options) => {
  console.info('[miniapp-admin] App Launch');
  installRouteGuard();
  captureAdminOrderDeepLink({
    path: options?.path,
    query: options?.query as Record<string, unknown> | undefined,
  });
});

onShow((options) => {
  console.info('[miniapp-admin] App Show');
  captureAdminOrderDeepLink({
    path: options?.path,
    query: options?.query as Record<string, unknown> | undefined,
  });
});

onHide(() => {
  console.info('[miniapp-admin] App Hide');
});
</script>

<style>
page {
  background-color: #f5f5f5;
  font-size: 28rpx;
  color: #333;
}

/* 对齐微信原生导航标题：约 17px、中粗 */
.uni-nav-bar-text {
  font-size: 32rpx !important;
  font-weight: 500;
}
</style>
