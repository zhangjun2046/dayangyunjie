<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useRouteGuard } from '@/composables/useRouteGuard';

const { install: installRouteGuard } = useRouteGuard();

onLaunch(() => {
  console.info('[App] Launch');

  // 路由守卫必须在所有页面跳转前生效
  installRouteGuard();

  // 隐私协议检查 & 微信登录流程交由首页处理（App.vue template 在小程序端不渲染组件）
});

onShow(() => {
  console.info('[App] Show');
});

onHide(() => {
  console.info('[App] Hide');
});
</script>

<style>
page {
  background-color: #f5f5f5;
  font-size: 28rpx;
  color: #333;
}
</style>
