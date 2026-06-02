<template>
  <el-container class="layout-root">
    <el-aside width="220px" class="layout-aside">
      <div class="logo">大洋云洁</div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/dashboard" disabled>
          <el-icon><Document /></el-icon>
          <span>订单管理（P5）</span>
        </el-menu-item>
        <el-menu-item index="/dashboard" disabled>
          <el-icon><User /></el-icon>
          <span>用户管理（P5）</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <span class="header-title">{{ currentTitle }}</span>
        <div class="header-right">
          <span class="username">{{ userStore.username || '管理员' }}</span>
          <el-button type="danger" link @click="handleLogout">退出</el-button>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { Document, HomeFilled, User } from '@element-plus/icons-vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@/store';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const activeMenu = computed(() => route.path);
const currentTitle = computed(() => (route.meta.title as string) || '管理后台');

function handleLogout() {
  userStore.logout();
  router.push('/login');
}
</script>

<style scoped lang="scss">
.layout-root {
  height: 100vh;
}

.layout-aside {
  background-color: #304156;

  .logo {
    height: 56px;
    line-height: 56px;
    text-align: center;
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 1px;
  }
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
  background: #fff;

  .header-title {
    font-size: 16px;
    font-weight: 500;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .username {
      color: #606266;
      font-size: 14px;
    }
  }
}

.layout-main {
  background: #f5f7fa;
}
</style>
