<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useRouteGuard } from '@/composables/useRouteGuard';
import { useAuthStore } from '@/store/auth';

const { install: installRouteGuard } = useRouteGuard();

onLaunch(() => {
  console.info('[miniapp-worker] App Launch');

  // 路由守卫必须在所有页面跳转前生效
  installRouteGuard();

  // 检查登录态：未登录时跳转至登录页
  const authStore = useAuthStore();
  if (!authStore.isLoggedIn) {
    console.info('[miniapp-worker] not logged in, redirecting to login');
    uni.redirectTo({ url: '/pages/login/index' });
  }
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
