<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useRouteGuard } from '@/composables/useRouteGuard';

const { install: installRouteGuard } = useRouteGuard();

onLaunch(() => {
  console.info('[miniapp-admin] App Launch');
  installRouteGuard();
});

onShow(() => {
  console.info('[miniapp-admin] App Show');
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
