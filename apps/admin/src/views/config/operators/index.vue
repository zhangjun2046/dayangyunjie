<template>
  <div class="operators-page">
    <!-- ── 筛选工具栏 ───────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索运营人员姓名、手机号"
          clearable
          style="width: 260px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button type="primary" class="btn-add" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>新增运营
        </el-button>
      </div>
    </el-card>

    <!-- ── 数据表格 ──────────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="tableLoading"
        :data="tableData"
        stripe
        style="width: 100%"
        row-key="id"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="序号" type="index" width="65" align="center" />
        <el-table-column label="姓名" prop="name" min-width="120" />
        <el-table-column label="手机号" prop="phone" min-width="150">
          <template #default="{ row }">
            <span class="phone-text">{{ row.phone }}</span>
          </template>
        </el-table-column>
        <el-table-column label="用途" prop="purpose" width="110" align="center">
          <template #default="{ row }">
            <el-tag type="primary" size="small">{{ row.purpose }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEditDialog(row)">编辑</el-button>
            <el-divider direction="vertical" />
            <el-button type="danger" link @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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
      :title="isEdit ? '编辑运营' : '新增运营'"
      width="520px"
      destroy-on-close
      @close="resetForm"
    >
      <div class="form-section-title">基础信息</div>
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
        label-position="right"
        class="operator-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input
                v-model="form.name"
                placeholder="请输入姓名"
                maxlength="32"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input
                v-model="form.phone"
                placeholder="请输入联系电话"
                maxlength="11"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="作用" prop="purpose">
              <el-select v-model="form.purpose" style="width: 100%">
                <el-option
                  v-for="opt in PURPOSE_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import {
  createOperator,
  deleteOperator,
  fetchOperators,
  updateOperator,
  type CreateOperatorPayload,
  type OperatorItem,
} from '@/api/operator';

// ─── 用途选项 ─────────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS = [{ label: '接单', value: '接单' }] as const;

// ─── 列表状态 ─────────────────────────────────────────────────────────────────

const tableLoading = ref(false);
const tableData = ref<OperatorItem[]>([]);
const total = ref(0);
const searchKeyword = ref('');

const queryParams = reactive({
  page: 1,
  pageSize: 10,
});

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── 数据加载 ─────────────────────────────────────────────────────────────────

const loadData = async () => {
  tableLoading.value = true;
  try {
    const res = await fetchOperators({
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      keyword: searchKeyword.value.trim() || undefined,
    });
    tableData.value = res.data.data.items;
    total.value = res.data.data.total;
    console.info('[OperatorConfig] loadData success, total=%d', res.data.data.total);
  } catch (err) {
    console.error('[OperatorConfig] loadData error', err);
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

// ─── 删除 ────────────────────────────────────────────────────────────────────

const onDelete = async (row: OperatorItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除运营人员【${row.name}】吗？删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    );
    await deleteOperator(row.id);
    ElMessage.success('删除成功');
    console.info('[OperatorConfig] delete id=%d', row.id);
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

const FORM_DEFAULT: CreateOperatorPayload = {
  name: '',
  phone: '',
  purpose: '接单',
};

const form = reactive<CreateOperatorPayload>({ ...FORM_DEFAULT });

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { max: 32, message: '最多 32 个字符', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  purpose: [{ required: true, message: '请选择用途', trigger: 'change' }],
};

const openCreateDialog = () => {
  isEdit.value = false;
  editingId.value = null;
  Object.assign(form, FORM_DEFAULT);
  dialogVisible.value = true;
};

const openEditDialog = (row: OperatorItem) => {
  isEdit.value = true;
  editingId.value = row.id;
  form.name = row.name;
  form.phone = row.phone;
  form.purpose = row.purpose;
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
    const payload: CreateOperatorPayload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      purpose: form.purpose,
    };

    if (isEdit.value && editingId.value !== null) {
      await updateOperator(editingId.value, payload);
      ElMessage.success('编辑成功');
      console.info('[OperatorConfig] update id=%d', editingId.value);
    } else {
      await createOperator(payload);
      ElMessage.success('新增成功');
      console.info('[OperatorConfig] create name=%s', payload.name);
    }

    dialogVisible.value = false;
    loadData();
  } catch (err) {
    console.error('[OperatorConfig] submit error', err);
  } finally {
    submitLoading.value = false;
  }
};

// ─── 初始化 ───────────────────────────────────────────────────────────────────

onMounted(loadData);
</script>

<style scoped lang="scss">
.operators-page {
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

.phone-text {
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 0.5px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  padding: 0 0 16px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 20px;
}

.operator-form {
  padding-top: 4px;
}
</style>
