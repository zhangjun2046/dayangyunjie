<template>
  <div class="appoint-time-slots-page">
    <el-card shadow="never">
      <el-alert
        class="hint"
        type="info"
        show-icon
        :closable="false"
        title="建议至少保留一个启用时段，否则对应业务下单页将没有可选时间。"
      />

      <el-form class="lead-form" label-width="140px" @submit.prevent>
        <el-form-item label="保洁最短提前">
          <el-input-number v-model="leadForm.cleaningLeadMinutes" :min="0" :max="1440" />
          <span class="form-tip">分钟</span>
        </el-form-item>
        <el-form-item label="废品最短提前">
          <el-input-number v-model="leadForm.recyclingLeadMinutes" :min="0" :max="1440" />
          <span class="form-tip">分钟</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="leadSaving" @click="onSaveLeads">保存缓冲</el-button>
        </el-form-item>
      </el-form>

      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="保洁时段" name="CLEANING" />
        <el-tab-pane label="废品回收时段" name="RECYCLING" />
      </el-tabs>

      <div class="toolbar">
        <el-input
          v-model="searchLabel"
          placeholder="搜索时段，如 08:00"
          clearable
          style="width: 220px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select
          v-model="enabledFilter"
          placeholder="全部状态"
          clearable
          style="width: 130px"
          @change="onSearch"
        >
          <el-option label="启用" :value="true" />
          <el-option label="停用" :value="false" />
        </el-select>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button type="primary" class="add-button" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新增时段
        </el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" stripe row-key="id">
        <el-table-column type="index" label="序号" width="70" align="center" />
        <el-table-column prop="label" label="时段" min-width="160" />
        <el-table-column prop="sortOrder" label="排序" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.isEnabled ? 'success' : 'info'"
              class="status-tag"
              @click="onToggle(row)"
            >
              {{ row.isEnabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEditDialog(row)">编辑</el-button>
            <el-divider direction="vertical" />
            <el-button type="danger" link @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId === null ? '新增时段' : '编辑时段'"
      width="460px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="所属业务">
          <el-input :model-value="activeTab === 'CLEANING' ? '保洁服务' : '废品回收'" disabled />
        </el-form-item>
        <el-form-item label="时段" prop="label">
          <el-input v-model="form.label" placeholder="例如 08:00 或 08:30" maxlength="8" show-word-limit />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
          <span class="form-tip">数值越小越靠前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">
          {{ editingId === null ? '新增' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { AppointTimeSlotBizType, AppointTimeSlotConfigDto } from '@dayangyunjie/shared';
import {
  APPOINT_TIME_SLOT_FORMAT_MESSAGE,
  APPOINT_TIME_SLOT_LABEL_PATTERN,
  DEFAULT_APPOINT_LEAD_MINUTES,
  MAX_APPOINT_LEAD_MINUTES,
} from '@dayangyunjie/shared';
import { Plus, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import {
  createAppointTimeSlot,
  deleteAppointTimeSlot,
  fetchAppointTimeLeads,
  fetchAppointTimeSlots,
  toggleAppointTimeSlot,
  updateAppointTimeLeads,
  updateAppointTimeSlot,
} from '@/api/appoint-time-slot';

const activeTab = ref<AppointTimeSlotBizType>('CLEANING');
const searchLabel = ref('');
const enabledFilter = ref<boolean | undefined>();
const loading = ref(false);
const tableData = ref<AppointTimeSlotConfigDto[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const leadSaving = ref(false);
const leadForm = reactive({
  cleaningLeadMinutes: DEFAULT_APPOINT_LEAD_MINUTES,
  recyclingLeadMinutes: DEFAULT_APPOINT_LEAD_MINUTES,
});

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 19);
}

async function loadLeads() {
  try {
    const response = await fetchAppointTimeLeads();
    leadForm.cleaningLeadMinutes = response.data.data.cleaningLeadMinutes;
    leadForm.recyclingLeadMinutes = response.data.data.recyclingLeadMinutes;
  } catch (error) {
    console.error('[AppointTimeSlot] Failed to load leads', error);
  }
}

function isLeadMinutesValid(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_APPOINT_LEAD_MINUTES;
}

async function onSaveLeads() {
  if (!isLeadMinutesValid(leadForm.cleaningLeadMinutes) || !isLeadMinutesValid(leadForm.recyclingLeadMinutes)) {
    ElMessage.error(`缓冲须为 0-${MAX_APPOINT_LEAD_MINUTES} 的整数分钟`);
    return;
  }
  leadSaving.value = true;
  try {
    const response = await updateAppointTimeLeads({
      cleaningLeadMinutes: leadForm.cleaningLeadMinutes,
      recyclingLeadMinutes: leadForm.recyclingLeadMinutes,
    });
    leadForm.cleaningLeadMinutes = response.data.data.cleaningLeadMinutes;
    leadForm.recyclingLeadMinutes = response.data.data.recyclingLeadMinutes;
    ElMessage.success('缓冲已保存');
  } catch (error) {
    console.error('[AppointTimeSlot] Failed to save leads', error);
  } finally {
    leadSaving.value = false;
  }
}

async function loadData() {
  loading.value = true;
  try {
    const response = await fetchAppointTimeSlots({
      bizType: activeTab.value,
      label: searchLabel.value.trim() || undefined,
      isEnabled: enabledFilter.value,
      page: page.value,
      pageSize: pageSize.value,
    });
    tableData.value = response.data.data.items;
    total.value = response.data.data.total;
  } catch (error) {
    console.error('[AppointTimeSlot] Failed to load', error);
  } finally {
    loading.value = false;
  }
}

function onTabChange() {
  searchLabel.value = '';
  enabledFilter.value = undefined;
  page.value = 1;
  void loadData();
}

function onSearch() {
  page.value = 1;
  void loadData();
}

function onReset() {
  searchLabel.value = '';
  enabledFilter.value = undefined;
  page.value = 1;
  void loadData();
}

async function onToggle(row: AppointTimeSlotConfigDto) {
  const action = row.isEnabled ? '停用' : '启用';
  try {
    await ElMessageBox.confirm(`确定要${action}时段“${row.label}”吗？`, '操作确认', {
      type: 'warning',
    });
    await toggleAppointTimeSlot(row.id);
    ElMessage.success(`${action}成功`);
    await loadData();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('[AppointTimeSlot] Failed to toggle', error);
    }
  }
}

async function onDelete(row: AppointTimeSlotConfigDto) {
  try {
    await ElMessageBox.confirm(`确定删除时段“${row.label}”吗？删除后不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
    });
    await deleteAppointTimeSlot(row.id);
    ElMessage.success('删除成功');
    if (tableData.value.length === 1 && page.value > 1) page.value -= 1;
    await loadData();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('[AppointTimeSlot] Failed to delete', error);
    }
  }
}

const dialogVisible = ref(false);
const submitting = ref(false);
const editingId = ref<number | null>(null);
const dialogBizType = ref<AppointTimeSlotBizType>('CLEANING');
const formRef = ref<FormInstance>();
const form = reactive({ label: '', sortOrder: 0 });
const formRules: FormRules = {
  label: [
    { required: true, whitespace: true, message: '请输入时段', trigger: 'blur' },
    {
      pattern: APPOINT_TIME_SLOT_LABEL_PATTERN,
      message: APPOINT_TIME_SLOT_FORMAT_MESSAGE,
      trigger: 'blur',
    },
  ],
  sortOrder: [{ type: 'number', min: 0, message: '排序值不能小于 0', trigger: 'change' }],
};

function openCreateDialog() {
  editingId.value = null;
  dialogBizType.value = activeTab.value;
  form.label = '';
  form.sortOrder = 0;
  dialogVisible.value = true;
}

function openEditDialog(row: AppointTimeSlotConfigDto) {
  editingId.value = row.id;
  dialogBizType.value = row.bizType;
  form.label = row.label;
  form.sortOrder = row.sortOrder;
  dialogVisible.value = true;
}

function resetForm() {
  formRef.value?.clearValidate();
  form.label = '';
  form.sortOrder = 0;
  editingId.value = null;
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const payload = { label: form.label.trim(), sortOrder: form.sortOrder };
    if (editingId.value === null) {
      await createAppointTimeSlot({
        bizType: dialogBizType.value,
        ...payload,
      });
      ElMessage.success('新增成功');
    } else {
      await updateAppointTimeSlot(editingId.value, payload);
      ElMessage.success('保存成功');
    }
    dialogVisible.value = false;
    await loadData();
  } catch (error) {
    console.error('[AppointTimeSlot] Failed to save', error);
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void loadLeads();
  void loadData();
});
</script>

<style scoped lang="scss">
.appoint-time-slots-page {
  .hint {
    margin-bottom: 16px;
  }

  .lead-form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px 24px;
    margin-bottom: 8px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .add-button {
    margin-left: auto;
  }

  .status-tag {
    cursor: pointer;
    user-select: none;
  }

  .pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .form-tip {
    margin-left: 10px;
    color: #909399;
    font-size: 12px;
  }
}
</style>
