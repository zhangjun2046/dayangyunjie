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
        <!-- 订单管理（P5.8b：按功能授权动态显示，一级菜单下全部子项无权限则整体隐藏） -->
        <el-sub-menu v-if="showOrdersMenu" index="orders">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>订单管理</span>
          </template>
          <el-menu-item v-if="userStore.hasMenu('orders.cleaning')" index="/orders/cleaning">
            <el-icon><List /></el-icon>
            <span>保洁订单</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasMenu('orders.recycling')" index="/orders/recycling">
            <el-icon><Box /></el-icon>
            <span>废品订单</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasMenu('orders.consult')" index="/orders/consult">
            <el-icon><Service /></el-icon>
            <span>家政订单</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasMenu('orders.complaint')" index="/orders/complaint">
            <el-icon><Warning /></el-icon>
            <span>投诉反馈</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 数据管理 -->
        <el-sub-menu v-if="showDataMenu" index="data">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>数据管理</span>
          </template>
          <el-menu-item v-if="userStore.hasMenu('data.dashboard')" index="/data/dashboard">
            <el-icon><TrendCharts /></el-icon>
            <span>数据看板</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 员工管理 -->
        <el-sub-menu v-if="showStaffMenu" index="staff">
          <template #title>
            <el-icon><User /></el-icon>
            <span>员工管理</span>
          </template>
          <el-menu-item v-if="userStore.hasMenu('staff.workers')" index="/workers">
            <el-icon><Avatar /></el-icon>
            <span>服务人员管理</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 配置管理 -->
        <el-sub-menu v-if="showConfigMenu" index="config">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>配置管理</span>
          </template>
          <el-menu-item v-if="userStore.hasMenu('config.services')" index="/config/services">
            <el-icon><Grid /></el-icon>
            <span>服务配置</span>
          </el-menu-item>
          <el-menu-item
            v-if="userStore.hasMenu('config.review-keywords')"
            index="/config/review-keywords"
          >
            <el-icon><ChatDotRound /></el-icon>
            <span>关键词配置</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasMenu('config.operators')" index="/config/operators">
            <el-icon><Phone /></el-icon>
            <span>运营人员配置</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasMenu('config.banners')" index="/config/banners">
            <el-icon><Picture /></el-icon>
            <span>轮播图管理</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 系统管理（始终仅超级管理员可见，用户管理/功能授权均涉及账号安全操作，不受功能授权树影响） -->
        <el-sub-menu v-if="userStore.isSuperAdmin" index="system">
          <template #title>
            <el-icon><Tools /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/system/users">
            <el-icon><UserFilled /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/system/permissions">
            <el-icon><Key /></el-icon>
            <span>功能授权</span>
          </el-menu-item>
        </el-sub-menu>
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
          <el-dropdown trigger="click" @command="handleUserCommand">
            <span class="username-dropdown">
              {{ userStore.username || '管理员' }}
              <el-icon class="dropdown-caret"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">
                  <el-icon><Lock /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>

    <!-- ── 修改密码弹窗 ─────────────────────────────────────────────────── -->
    <el-dialog
      v-model="pwdDialogVisible"
      title="修改密码"
      width="420px"
      destroy-on-close
      @close="resetPwdForm"
    >
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdFormRules" label-width="90px">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdSubmitLoading" @click="onSubmitChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  Avatar,
  Box,
  ChatDotRound,
  DataAnalysis,
  Document,
  Expand,
  Fold,
  Grid,
  Key,
  List,
  Lock,
  Phone,
  Picture,
  Service,
  Setting,
  SwitchButton,
  Tools,
  TrendCharts,
  User,
  UserFilled,
  Warning,
} from '@element-plus/icons-vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { changeAdminPassword } from '@/api/admin';
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

// ─── P5.8b 功能授权：一级菜单下全部子项均无权限时，一级菜单整体隐藏 ─────────────
const showOrdersMenu = computed(() =>
  ['orders.cleaning', 'orders.recycling', 'orders.consult', 'orders.complaint'].some((key) =>
    userStore.hasMenu(key),
  ),
);
const showDataMenu = computed(() => userStore.hasMenu('data.dashboard'));
const showStaffMenu = computed(() => userStore.hasMenu('staff.workers'));
const showConfigMenu = computed(() =>
  ['config.services', 'config.review-keywords', 'config.operators', 'config.banners'].some((key) =>
    userStore.hasMenu(key),
  ),
);

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

function handleUserCommand(command: string) {
  if (command === 'changePassword') {
    pwdDialogVisible.value = true;
  } else if (command === 'logout') {
    handleLogout();
  }
}

// ─── 顶栏「修改密码」 ─────────────────────────────────────────────────────────

const pwdDialogVisible = ref(false);
const pwdSubmitLoading = ref(false);
const pwdFormRef = ref<FormInstance>();

const PWD_FORM_DEFAULT = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const pwdForm = reactive({ ...PWD_FORM_DEFAULT });

const pwdFormRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== pwdForm.newPassword) {
          callback(new Error('两次输入的新密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

function resetPwdForm() {
  pwdFormRef.value?.clearValidate();
  Object.assign(pwdForm, PWD_FORM_DEFAULT);
}

async function onSubmitChangePassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  pwdSubmitLoading.value = true;
  try {
    await changeAdminPassword(userStore.adminId, {
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    });
    console.info('[Layout] change password success, adminId=', userStore.adminId);
    ElMessage.success('密码修改成功，请重新登录');
    pwdDialogVisible.value = false;
    handleLogout();
  } catch (err) {
    console.error('[Layout] change password error', err);
  } finally {
    pwdSubmitLoading.value = false;
  }
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

    .username-dropdown {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #606266;
      font-size: 14px;
      cursor: pointer;

      .dropdown-caret {
        font-size: 12px;
      }
    }
  }
}

.layout-main {
  background: #f5f7fa;
  overflow-y: auto;
}
</style>
