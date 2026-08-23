<template>
  <div class="review-keywords-page">
    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="保洁评价关键词" name="CLEANING" />
        <el-tab-pane label="废品回收评价关键词" name="RECYCLING" />
        <el-tab-pane label="投诉原因关键词" name="COMPLAINT" />
      </el-tabs>

      <div class="toolbar">
        <el-input
          v-model="searchKeyword"
          :placeholder="isComplaintTab ? '搜索投诉原因文案' : '搜索评价关键词'"
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
        <el-button
          v-if="tabCapabilities.canCreate"
          type="primary"
          class="add-button"
          @click="openCreateDialog"
        >
          <el-icon><Plus /></el-icon>
          {{ isComplaintTab ? '新增投诉原因' : '新增关键词' }}
        </el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" stripe :row-key="rowKey">
        <el-table-column type="index" label="序号" width="70" align="center" />
        <el-table-column
          prop="label"
          :label="isComplaintTab ? '投诉原因文案' : '评价关键词'"
          min-width="220"
        />
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
            <template v-if="tabCapabilities.canDelete">
              <el-divider direction="vertical" />
              <el-button type="danger" link @click="onDelete(row)">删除</el-button>
            </template>
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
      :title="dialogTitle"
      width="460px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item v-if="!isComplaintDialog" label="所属业务">
          <el-input :model-value="dialogContextLabel" disabled />
        </el-form-item>
        <el-form-item :label="isComplaintDialog ? '投诉原因' : '关键词'" prop="label">
          <el-input
            v-model="form.label"
            :placeholder="isComplaintDialog ? '请输入投诉原因' : '请输入评价关键词'"
            maxlength="32"
            show-word-limit
          />
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
import type { ReviewKeywordBizType } from '@dayangyunjie/shared';
import { Plus, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import {
  createComplaintReasonConfig,
  deleteComplaintReasonConfig,
  fetchComplaintReasonConfigs,
  toggleComplaintReasonConfig,
  updateComplaintReasonConfig,
} from '@/api/complaint-reason-config';
import {
  createReviewKeyword,
  deleteReviewKeyword,
  fetchReviewKeywords,
  toggleReviewKeyword,
  updateReviewKeyword,
} from '@/api/review-keyword';
import {
  buildComplaintReasonQuery,
  createConfigLoadCoordinator,
  formatReviewKeywordDate,
  getConfigTabCapabilities,
  prepareConfigSearch,
  resetConfigListFilters,
  reviewKeywordBizTypeLabel,
  shouldGoToPreviousPage,
  type ConfigTab,
} from './review-keywords.utils';

type ConfigRow = {
  id: number;
  label: string;
  sortOrder: number;
  isEnabled: boolean;
  updatedAt: string;
  tab: ConfigTab;
};

const activeTab = ref<ConfigTab>('CLEANING');
const searchKeyword = ref('');
const enabledFilter = ref<boolean | undefined>();
const loading = ref(false);
const tableData = ref<ConfigRow[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const bizTypeLabel = reviewKeywordBizTypeLabel;
const formatDate = formatReviewKeywordDate;
const isComplaintTab = computed(() => activeTab.value === 'COMPLAINT');
const tabCapabilities = computed(() => getConfigTabCapabilities(activeTab.value));
const rowKey = (row: ConfigRow) => row.id;

const listFilterState = {
  get keyword() {
    return searchKeyword.value;
  },
  set keyword(value: string) {
    searchKeyword.value = value;
  },
  get isEnabled() {
    return enabledFilter.value;
  },
  set isEnabled(value: boolean | undefined) {
    enabledFilter.value = value;
  },
  get page() {
    return page.value;
  },
  set page(value: number) {
    page.value = value;
  },
};

const loadCoordinator = createConfigLoadCoordinator<ConfigRow>({
  getActiveTab: () => activeTab.value,
  setLoading: (value) => {
    loading.value = value;
  },
  fetchData: async (requestedTab) => {
    if (requestedTab === 'COMPLAINT') {
      const response = await fetchComplaintReasonConfigs(buildComplaintReasonQuery({
        keyword: searchKeyword.value,
        isEnabled: enabledFilter.value,
        page: page.value,
        pageSize: pageSize.value,
      }));
      return {
        items: response.data.data.items.map((item) => ({ ...item, tab: requestedTab })),
        total: response.data.data.total,
      };
    }
    const response = await fetchReviewKeywords({
      bizType: requestedTab,
      keyword: searchKeyword.value.trim() || undefined,
      isEnabled: enabledFilter.value,
      page: page.value,
      pageSize: pageSize.value,
    });
    return {
      items: response.data.data.items.map((item) => ({
        ...item,
        label: item.keyword,
        tab: requestedTab,
      })),
      total: response.data.data.total,
    };
  },
  applyResult: (result, requestedTab) => {
    tableData.value = result.items;
    total.value = result.total;
    console.info('[KeywordConfig] Loaded configuration', {
      tab: requestedTab,
      total: result.total,
    });
  },
  onError: (error, requestedTab) => {
    console.error('[ReviewKeywordConfig] Failed to load keywords', error);
    console.info('[KeywordConfig] Load failed', { tab: requestedTab });
  },
});

function loadData(): Promise<void> {
  return loadCoordinator.load();
}

function onTabChange() {
  resetConfigListFilters(listFilterState);
  void loadData();
}

function onSearch() {
  prepareConfigSearch(listFilterState);
  void loadData();
}

function onReset() {
  resetConfigListFilters(listFilterState);
  void loadData();
}

async function onToggle(row: ConfigRow) {
  const action = row.isEnabled ? '停用' : '启用';
  const itemName = row.tab === 'COMPLAINT' ? '投诉原因' : '关键词';
  try {
    await ElMessageBox.confirm(`确定要${action}${itemName}“${row.label}”吗？`, '操作确认', {
      type: 'warning',
    });
    if (row.tab === 'COMPLAINT') {
      await toggleComplaintReasonConfig(row.id);
    } else {
      await toggleReviewKeyword(row.id);
    }
    ElMessage.success(`${action}成功`);
    console.info('[KeywordConfig] Toggled keyword', { id: row.id, action });
    await loadData();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('[ReviewKeywordConfig] Failed to toggle keyword', error);
    }
  }
}

async function onDelete(row: ConfigRow) {
  try {
    const itemName = row.tab === 'COMPLAINT' ? '投诉原因' : '关键词';
    await ElMessageBox.confirm(`确定删除${itemName}“${row.label}”吗？删除后不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
    });
    if (row.tab === 'COMPLAINT') {
      await deleteComplaintReasonConfig(row.id);
    } else {
      await deleteReviewKeyword(row.id);
    }
    ElMessage.success('删除成功');
    if (shouldGoToPreviousPage(tableData.value.length, page.value)) page.value -= 1;
    console.info('[ReviewKeywordConfig] Deleted keyword', { id: row.id });
    await loadData();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('[ReviewKeywordConfig] Failed to delete keyword', error);
    }
  }
}

const dialogVisible = ref(false);
const submitting = ref(false);
const editingId = ref<number | null>(null);
const editingTab = ref<ConfigTab>('CLEANING');
const formRef = ref<FormInstance>();
const form = reactive({ label: '', sortOrder: 0 });
const formRules: FormRules = {
  label: [
    { required: true, whitespace: true, message: '请输入关键词文案', trigger: 'blur' },
    { max: 32, message: '最多 32 个字符', trigger: 'blur' },
  ],
  sortOrder: [{ type: 'number', min: 0, message: '排序值不能小于 0', trigger: 'change' }],
};
const dialogTitle = computed(() => {
  if (isComplaintDialog.value) {
    return editingId.value === null ? '新增投诉原因' : '编辑投诉原因';
  }
  return editingId.value === null ? '新增评价关键词' : '编辑评价关键词';
});
const isComplaintDialog = computed(() => editingTab.value === 'COMPLAINT');
const dialogContextLabel = computed(() =>
  bizTypeLabel(editingTab.value as ReviewKeywordBizType),
);

function openCreateDialog() {
  editingId.value = null;
  editingTab.value = activeTab.value;
  form.label = '';
  form.sortOrder = 0;
  dialogVisible.value = true;
}

function openEditDialog(row: ConfigRow) {
  editingId.value = row.id;
  editingTab.value = row.tab;
  form.label = row.label;
  form.sortOrder = row.sortOrder;
  dialogVisible.value = true;
}

function resetForm() {
  formRef.value?.clearValidate();
  form.label = '';
  form.sortOrder = 0;
  editingId.value = null;
  editingTab.value = activeTab.value;
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    if (isComplaintDialog.value) {
      const complaintPayload = {
        label: form.label.trim(),
        sortOrder: form.sortOrder,
      };
      if (editingId.value === null) {
        await createComplaintReasonConfig(complaintPayload);
        ElMessage.success('新增成功');
      } else {
        await updateComplaintReasonConfig(editingId.value, complaintPayload);
        ElMessage.success('保存成功');
      }
    } else if (editingId.value === null) {
      await createReviewKeyword({
        bizType: editingTab.value as ReviewKeywordBizType,
        keyword: form.label.trim(),
        sortOrder: form.sortOrder,
      });
      ElMessage.success('新增成功');
    } else {
      await updateReviewKeyword(editingId.value, {
        bizType: editingTab.value as ReviewKeywordBizType,
        keyword: form.label.trim(),
        sortOrder: form.sortOrder,
      });
      ElMessage.success('保存成功');
    }
    console.info('[ReviewKeywordConfig] Saved keyword', {
      id: editingId.value,
      tab: editingTab.value,
    });
    dialogVisible.value = false;
    await loadData();
  } catch (error) {
    console.error('[ReviewKeywordConfig] Failed to save keyword', error);
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.review-keywords-page {
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
