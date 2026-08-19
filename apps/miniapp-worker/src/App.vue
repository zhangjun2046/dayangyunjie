<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useRouteGuard } from '@/composables/useRouteGuard';
import { useAuthStore } from '@/store/auth';

const { install: installRouteGuard } = useRouteGuard();

onLaunch(async () => {
  console.info('[miniapp-worker] App Launch');

  // 路由守卫必须在所有页面跳转前生效
  installRouteGuard();

  const authStore = useAuthStore();
  const ok = await authStore.ensureSession();
  if (ok) {
    console.info('[miniapp-worker] session valid, enter tabs');
    uni.switchTab({ url: '/pages/index/index' });
    return;
  }

  // 未登录：pages.json 首页即登录页，无需再 redirect
  console.info('[miniapp-worker] session invalid, stay on login');
});

onShow(() => {
  console.info('[miniapp-worker] App Show');
});

onHide(() => {
  console.info('[miniapp-worker] App Hide');
});
</script>

<style>
page {
  background-color: #f5f5f5;
  font-size: 28rpx;
  color: #333;
}
</style>
