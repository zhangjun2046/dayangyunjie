<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useRouteGuard } from '@/composables/useRouteGuard';

const { install: installRouteGuard } = useRouteGuard();

onLaunch(() => {
  console.info('[miniapp-worker] App Launch');
  // 只装路由守卫。不要在 onLaunch 里 reLaunch/switchTab，微信模拟器会留下空白 tab 页。
  installRouteGuard();
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
