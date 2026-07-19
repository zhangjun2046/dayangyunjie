<template>
  <div class="users-page">
    <!-- ── 筛选工具栏 ───────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户名、姓名、手机号、邮箱"
          clearable
          style="width: 280px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button type="primary" class="btn-add" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>新增用户
        </el-button>
      </div>
    </el-card>

    <!-- ── 数据表格 ──────────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="tableLoading" :data="tableData" stripe style="width: 100%" row-key="id">
        <el-table-column label="用户名" prop="username" min-width="130" />
        <el-table-column label="姓名" prop="name" min-width="110" />
        <el-table-column label="邮箱" prop="email" min-width="200" />
        <el-table-column label="手机号" min-width="130">
          <template #default="{ row }">{{ row.phone || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'ENABLED'"
              :disabled="row.isSuperAdmin || row.id === userStore.adminId"
              @change="onToggleStatus(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="用户来源" width="110" align="center">
          <template #default>
            <el-tag type="info" size="small">系统用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEditDialog(row)">编辑</el-button>
            <el-divider direction="vertical" />
            <el-button type="warning" link @click="openResetPwd(row)">重置密码</el-button>
            <template v-if="!row.isSuperAdmin && row.id !== userStore.adminId">
              <el-divider direction="vertical" />
              <el-button type="danger" link @click="onDelete(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- ── 新增 / 编辑 Dialog ──────────────────────────────────────────────── -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="520px"
      destroy-on-close
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
        label-position="right"
        class="user-form"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="登录用户名，创建后不可修改" :disabled="isEdit" maxlength="32" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" maxlength="32" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱（登录账号）" maxlength="128" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号（选填）" maxlength="20" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="初始密码">
          <el-input model-value="默认密码：Dyyj123.." disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- ── 重置密码确认弹窗 ─────────────────────────────────────────────── -->
    <el-dialog v-model="resetPwdVisible" title="重置密码" width="400px">
      <div class="reset-pwd-tip">
        <el-icon color="#e6a23c" size="20"><Warning /></el-icon>
        将密码重置为默认密码 <strong>Dyyj123..</strong>，用户下次登录需使用新密码，确认重置？
      </div>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetLoading" @click="onConfirmReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Search, Warning } from '@element-plus/icons-vue';
import {
  createAdmin,
  deleteAdmin,
  fetchAdmins,
  resetAdminPassword,
  toggleAdminStatus,
  updateAdmin,
  type AdminListItem,
  type CreateAdminPayload,
} from '@/api/admin';
import { useUserStore } from '@/store';

const userStore = useUserStore();

// ─── 列表状态 ─────────────────────────────────────────────────────────────────

const tableLoading = ref(false);
const tableData = ref<AdminListItem[]>([]);
const total = ref(0);
const searchKeyword = ref('');

const queryParams = reactive({
  page: 1,
  pageSize: 10,
});

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── 数据加载 ─────────────────────────────────────────────────────────────────

const loadData = async () => {
  tableLoading.value = true;
  try {
    const res = await fetchAdmins({
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      keyword: searchKeyword.value.trim() || undefined,
    });
    tableData.value = res.data.data.items;
    total.value = res.data.data.total;
    console.info('[SystemUsers] loadData success, total=%d', res.data.data.total);
  } catch (err) {
    console.error('[SystemUsers] loadData error', err);
  } finally {
    tableLoading.value = false;
  }
};

const onSearch = () => {
  queryParams.page = 1;
  loadData();
};

const onReset = () => {
  searchKeyword.value = '';
  queryParams.page = 1;
  loadData();
};

// ─── 启用 / 禁用 ──────────────────────────────────────────────────────────────

const onToggleStatus = async (row: AdminListItem) => {
  const action = row.status === 'ENABLED' ? '禁用' : '启用';
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户【${row.username}】吗？${action === '禁用' ? '禁用后该用户当前登录会话将立即失效。' : ''}`,
      `${action}确认`,
      { confirmButtonText: action, cancelButtonText: '取消', type: 'warning' },
    );
    await toggleAdminStatus(row.id);
    ElMessage.success(`${action}成功`);
    console.info('[SystemUsers] toggle id=%d action=%s', row.id, action);
    loadData();
  } catch {
    // 用户取消，忽略
  }
};

// ─── 删除 ────────────────────────────────────────────────────────────────────

const onDelete = async (row: AdminListItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户【${row.username}】吗？删除后不可恢复。`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    });
    await deleteAdmin(row.id);
    ElMessage.success('删除成功');
    console.info('[SystemUsers] delete id=%d', row.id);
    if (tableData.value.length === 1 && queryParams.page > 1) {
      queryParams.page -= 1;
    }
    loadData();
  } catch {
    // 用户取消，忽略
  }
};

// ─── 新增 / 编辑 Dialog ───────────────────────────────────────────────────────

const dialogVisible = ref(false);
const isEdit = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);

const FORM_DEFAULT: CreateAdminPayload = {
  username: '',
  name: '',
  email: '',
  phone: '',
};

const form = reactive<CreateAdminPayload>({ ...FORM_DEFAULT });

const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{3,32}$/, message: '3-32 位字母、数字、下划线', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
};

const openCreateDialog = () => {
  isEdit.value = false;
  editingId.value = null;
  Object.assign(form, FORM_DEFAULT);
  dialogVisible.value = true;
};

const openEditDialog = (row: AdminListItem) => {
  isEdit.value = true;
  editingId.value = row.id;
  form.username = row.username;
  form.name = row.name;
  form.email = row.email;
  form.phone = row.phone ?? '';
  dialogVisible.value = true;
};

const resetForm = () => {
  formRef.value?.clearValidate();
  Object.assign(form, FORM_DEFAULT);
};

const onSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitLoading.value = true;
  try {
    if (isEdit.value && editingId.value !== null) {
      await updateAdmin(editingId.value, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
      });
      ElMessage.success('编辑成功');
      console.info('[SystemUsers] update id=%d', editingId.value);
    } else {
      await createAdmin({
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
      });
      ElMessage.success('新增成功，默认密码为 Dyyj123..');
      console.info('[SystemUsers] create username=%s', form.username);
    }

    dialogVisible.value = false;
    loadData();
  } catch (err) {
    console.error('[SystemUsers] submit error', err);
  } finally {
    submitLoading.value = false;
  }
};

// ─── 重置密码 ─────────────────────────────────────────────────────────────────

const resetPwdVisible = ref(false);
const resetTarget = ref<AdminListItem | null>(null);
const resetLoading = ref(false);

const openResetPwd = (row: AdminListItem) => {
  resetTarget.value = row;
  resetPwdVisible.value = true;
};

const onConfirmReset = async () => {
  if (!resetTarget.value) return;
  resetLoading.value = true;
  try {
    await resetAdminPassword(resetTarget.value.id);
    ElMessage.success('密码已重置为 Dyyj123..');
    console.info('[SystemUsers] reset password id=%d', resetTarget.value.id);
    resetPwdVisible.value = false;
  } catch (err) {
    console.error('[SystemUsers] reset password error', err);
  } finally {
    resetLoading.value = false;
  }
};

// ─── 初始化 ───────────────────────────────────────────────────────────────────

onMounted(loadData);
</script>

<style scoped lang="scss">
.users-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  :deep(.el-card__body) {
    padding: 16px 20px;
  }
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-add {
  margin-left: auto;
}

.table-card {
  :deep(.el-card__body) {
    padding: 16px 20px;
  }
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.user-form {
  padding-top: 4px;
}

.reset-pwd-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}
</style>
