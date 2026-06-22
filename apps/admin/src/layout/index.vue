<template>
  <el-container class="layout-root">
    <!-- 侧栏 -->
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="layout-aside">
      <!-- Logo -->
      <div class="logo" :class="{ collapsed: isCollapsed }">
        <span v-if="!isCollapsed" class="logo-text">大洋云洁·智享社区</span>
        <span v-else class="logo-icon">洁</span>
      </div>

      <!-- 二级折叠菜单 -->
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :collapse-transition="false"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        class="sidebar-menu"
      >
        <!-- 订单管理 -->
        <el-sub-menu index="orders">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>订单管理</span>
          </template>
          <el-menu-item index="/orders/cleaning">
            <el-icon><List /></el-icon>
            <span>保洁订单</span>
          </el-menu-item>
          <el-menu-item index="/orders/recycling">
            <el-icon><Box /></el-icon>
            <span>废品订单</span>
          </el-menu-item>
          <el-menu-item index="/orders/consult">
            <el-icon><Service /></el-icon>
            <span>家政订单</span>
          </el-menu-item>
          <el-menu-item index="/orders/complaint">
            <el-icon><Warning /></el-icon>
            <span>投诉反馈</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 数据管理 -->
        <el-sub-menu index="data">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>数据管理</span>
          </template>
          <el-menu-item index="/data/dashboard">
            <el-icon><TrendCharts /></el-icon>
            <span>数据看板</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 员工管理 -->
        <el-sub-menu index="staff">
          <template #title>
            <el-icon><User /></el-icon>
            <span>员工管理</span>
          </template>
          <el-menu-item index="/workers">
            <el-icon><Avatar /></el-icon>
            <span>服务人员管理</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 配置管理 -->
        <el-sub-menu index="config">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>配置管理</span>
          </template>
          <el-menu-item index="/config/services">
            <el-icon><Grid /></el-icon>
            <span>服务配置</span>
          </el-menu-item>
          <el-menu-item index="/config/operators">
            <el-icon><Phone /></el-icon>
            <span>运营人员配置</span>
          </el-menu-item>
          <el-menu-item index="/config/banners">
            <el-icon><Picture /></el-icon>
            <span>轮播图管理</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 系统设置 -->
        <el-menu-item index="/settings">
          <el-icon><Tools /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>

      <!-- 底部用户信息 -->
      <div class="sidebar-user" :class="{ collapsed: isCollapsed }">
        <el-avatar :size="32" class="user-avatar">
          {{ userInitial }}
        </el-avatar>
        <div v-if="!isCollapsed" class="user-info">
          <div class="user-name">{{ userStore.username || '管理员' }}</div>
          <div class="user-email">{{ userStore.email }}</div>
        </div>
      </div>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-button
            text
            class="collapse-btn"
            @click="isCollapsed = !isCollapsed"
          >
            <el-icon :size="20">
              <Fold v-if="!isCollapsed" />
              <Expand v-else />
            </el-icon>
          </el-button>
          <!-- 面包屑 -->
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentTitle !== '首页'">
              {{ currentTitle }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span class="username">{{ userStore.username || '管理员' }}</span>
          <el-divider direction="vertical" />
          <el-button type="danger" link @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
            退出
          </el-button>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import {
  Avatar,
  Box,
  DataAnalysis,
  Document,
  Expand,
  Fold,
  Grid,
  List,
  Phone,
  Picture,
  Service,
  Setting,
  SwitchButton,
  Tools,
  TrendCharts,
  User,
  Warning,
} from '@element-plus/icons-vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@/store';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const isCollapsed = ref(false);

const activeMenu = computed(() => route.path);
const currentTitle = computed(() => (route.meta.title as string) || '管理后台');

const userInitial = computed(() => {
  const name = userStore.username || userStore.email || 'A';
  return name.charAt(0).toUpperCase();
});

function handleLogout() {
  userStore.logout();
  router.push('/login');
}
</script>

<style scoped lang="scss">
.layout-root {
  height: 100vh;
  overflow: hidden;
}

.layout-aside {
  background-color: #304156;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.3s;

  .logo {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;
    flex-shrink: 0;

    .logo-text {
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 1px;
      white-space: nowrap;
    }

    .logo-icon {
      color: #409eff;
      font-size: 22px;
      font-weight: 700;
    }
  }
}

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: none;

  /* 子菜单背景稍暗 */
  :deep(.el-sub-menu__title):hover {
    background-color: #263445 !important;
  }

  :deep(.el-menu-item):hover {
    background-color: #263445 !important;
  }

  :deep(.el-menu--inline) {
    background-color: #1f2d3d !important;
  }
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  min-height: 60px;

  &.collapsed {
    justify-content: center;
    padding: 12px 0;
  }

  .user-avatar {
    background-color: #409eff;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
    cursor: default;
  }

  .user-info {
    overflow: hidden;
    flex: 1;
    min-width: 0;

    .user-name {
      color: #e0e6ed;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      color: #8492a6;
      font-size: 11px;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
  background: #fff;
  padding: 0 16px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .collapse-btn {
      padding: 6px;
      color: #606266;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;

    .username {
      color: #606266;
      font-size: 14px;
    }
  }
}

.layout-main {
  background: #f5f7fa;
  overflow-y: auto;
}
</style>
