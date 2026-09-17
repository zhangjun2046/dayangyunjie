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
</style>
