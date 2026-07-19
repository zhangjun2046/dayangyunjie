<template>
  <div class="permissions-page">
    <!-- ── 左侧用户列表 ─────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="user-list-card">
      <template #header>
        <div class="card-header">用户列表</div>
      </template>
      <el-scrollbar height="calc(100vh - 220px)" v-loading="userListLoading">
        <div
          v-for="admin in adminList"
          :key="admin.id"
          class="user-item"
          :class="{ active: selectedAdmin?.id === admin.id }"
          @click="onSelectAdmin(admin)"
        >
          <div class="user-item-main">
            <span class="user-name">{{ admin.name }}</span>
            <span class="user-username">{{ admin.username }}</span>
          </div>
          <el-tag v-if="admin.isSuperAdmin" type="warning" size="small">超管</el-tag>
        </div>
        <el-empty v-if="!userListLoading && adminList.length === 0" description="暂无用户" />
      </el-scrollbar>
    </el-card>

    <!-- ── 右侧权限树 ───────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="tree-card">
      <template #header>
        <div class="card-header tree-header">
          <span v-if="selectedAdmin">
            {{ selectedAdmin.name }}（{{ selectedAdmin.username }}）的功能授权
          </span>
          <span v-else>请先选择左侧用户</span>
          <div v-if="selectedAdmin && !selectedAdmin.isSuperAdmin" class="tree-actions">
            <el-button size="small" @click="onCheckAll">全选</el-button>
            <el-button size="small" @click="onUncheckAll">取消全选</el-button>
            <el-button size="small" type="primary" :loading="saveLoading" @click="onSave">保存</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="!selectedAdmin" description="请先在左侧选择一个用户" />

      <template v-else>
        <el-alert
          v-if="selectedAdmin.isSuperAdmin"
          title="超级管理员默认拥有全部功能权限，且不可编辑"
          type="info"
          :closable="false"
          show-icon
          class="super-admin-tip"
        />
        <el-alert
          v-else
          title="「用户管理」「功能授权」两项固定仅超级管理员可用，不可分配给普通管理员"
          type="info"
          :closable="false"
          show-icon
          class="super-admin-tip"
        />

        <el-tree
          ref="treeRef"
          v-loading="treeLoading"
          :data="treeData"
          :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
          node-key="key"
          show-checkbox
          default-expand-all
        />
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { ElMessage, type ElTree } from 'element-plus';

import { fetchAdmins, type AdminListItem } from '@/api/admin';
import { getAdminPermissions, saveAdminPermissions } from '@/api/admin-permission';
import { ALL_MENU_KEYS, MENU_TREE, SUPER_ADMIN_ONLY_MENU_KEYS } from '@/constants/menu-permissions';

interface TreeNode {
  key: string;
  label: string;
  disabled?: boolean;
  children?: TreeNode[];
}

// ─── 左侧用户列表 ─────────────────────────────────────────────────────────────

const userListLoading = ref(false);
const adminList = ref<AdminListItem[]>([]);

const loadAdminList = async () => {
  userListLoading.value = true;
  try {
    const res = await fetchAdmins({ page: 1, pageSize: 100 });
    adminList.value = res.data.data.items;
    console.info('[SystemPermissions] loadAdminList success, total=%d', res.data.data.total);
  } catch (err) {
    console.error('[SystemPermissions] loadAdminList error', err);
  } finally {
    userListLoading.value = false;
  }
};

// ─── 右侧权限树 ───────────────────────────────────────────────────────────────

const selectedAdmin = ref<AdminListItem | null>(null);
const treeLoading = ref(false);
const saveLoading = ref(false);
const treeRef = ref<InstanceType<typeof ElTree>>();

/** 目标为超级管理员时，整棵树全选且禁用；否则「用户管理/功能授权」两个叶子节点始终禁用 */
const treeData = computed<TreeNode[]>(() => {
  const isSuperAdminTarget = selectedAdmin.value?.isSuperAdmin ?? false;
  return MENU_TREE.map((group) => ({
    key: group.key,
    label: group.label,
    disabled: isSuperAdminTarget,
    children: group.children.map((leaf) => ({
      key: leaf.key,
      label: leaf.label,
      disabled: isSuperAdminTarget || SUPER_ADMIN_ONLY_MENU_KEYS.includes(leaf.key),
    })),
  }));
});

const onSelectAdmin = async (admin: AdminListItem) => {
  selectedAdmin.value = admin;
  treeRef.value?.setCheckedKeys([]);

  if (admin.isSuperAdmin) {
    await nextTick();
    treeRef.value?.setCheckedKeys([...ALL_MENU_KEYS]);
    return;
  }

  treeLoading.value = true;
  try {
    const res = await getAdminPermissions(admin.id);
    await nextTick();
    treeRef.value?.setCheckedKeys(res.data.data.menuKeys);
    console.info('[SystemPermissions] loaded permissions for adminId=%d', admin.id);
  } catch (err) {
    console.error('[SystemPermissions] loadPermissions error', err);
  } finally {
    treeLoading.value = false;
  }
};

/** 可分配的叶子节点（排除 system.users / system.permissions） */
const assignableMenuKeys = ALL_MENU_KEYS.filter((key) => !SUPER_ADMIN_ONLY_MENU_KEYS.includes(key));

const onCheckAll = () => {
  treeRef.value?.setCheckedKeys([...assignableMenuKeys]);
};

const onUncheckAll = () => {
  treeRef.value?.setCheckedKeys([]);
};

const onSave = async () => {
  if (!selectedAdmin.value) return;
  const checkedLeafKeys = (treeRef.value?.getCheckedKeys(true) ?? []) as string[];
  // 防御性过滤：system.users / system.permissions 始终不下发保存
  const menuKeys = checkedLeafKeys.filter((key) => !SUPER_ADMIN_ONLY_MENU_KEYS.includes(key));

  saveLoading.value = true;
  try {
    await saveAdminPermissions(selectedAdmin.value.id, menuKeys);
    ElMessage.success('保存成功，该用户下次登录/刷新后生效');
    console.info('[SystemPermissions] save adminId=%d menuKeys=%o', selectedAdmin.value.id, menuKeys);
  } catch (err) {
    console.error('[SystemPermissions] save error', err);
  } finally {
    saveLoading.value = false;
  }
};

// ─── 初始化 ───────────────────────────────────────────────────────────────────

loadAdminList();
</script>

<style scoped lang="scss">
.permissions-page {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.user-list-card {
  width: 300px;
  flex-shrink: 0;

  :deep(.el-card__body) {
    padding: 0;
  }
}

.tree-card {
  flex: 1;
  min-width: 0;
}

.card-header {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tree-actions {
  display: flex;
  gap: 8px;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f2f5;

  &:hover {
    background-color: #f5f7fa;
  }

  &.active {
    background-color: #ecf5ff;
  }
}

.user-item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  .user-name {
    font-size: 14px;
    color: #303133;
  }

  .user-username {
    font-size: 12px;
    color: #909399;
  }
}

.super-admin-tip {
  margin-bottom: 12px;
}
</style>
