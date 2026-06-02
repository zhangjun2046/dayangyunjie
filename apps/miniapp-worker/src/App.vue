<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';

onLaunch(() => {
  console.info('[miniapp-worker] App Launch');
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
