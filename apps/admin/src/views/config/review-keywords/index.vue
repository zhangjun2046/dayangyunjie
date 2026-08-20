<template>
  <div class="review-keywords-page">
    <el-card shadow="never">
      <el-tabs v-model="activeBizType" @tab-change="onBizTypeChange">
        <el-tab-pane label="保洁评价关键词" name="CLEANING" />
        <el-tab-pane label="废品回收评价关键词" name="RECYCLING" />
      </el-tabs>

      <div class="toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索评价关键词"
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
          新增关键词
        </el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" stripe row-key="id">
        <el-table-column type="index" label="序号" width="70" align="center" />
        <el-table-column prop="keyword" label="评价关键词" min-width="220" />
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
      :title="editingId === null ? '新增评价关键词' : '编辑评价关键词'"
      width="460px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="所属业务">
          <el-input :model-value="bizTypeLabel(activeBizType)" disabled />
        </el-form-item>
        <el-form-item label="关键词" prop="keyword">
          <el-input
            v-model="form.keyword"
            placeholder="请输入评价关键词"
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
        <el-button type="primary" :loading="submitting" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { ReviewKeywordBizType, ReviewKeywordDto } from '@dayangyunjie/shared';
import { Plus, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import {
  createReviewKeyword,
  deleteReviewKeyword,
  fetchReviewKeywords,
  toggleReviewKeyword,
  updateReviewKeyword,
} from '@/api/review-keyword';
import {
  formatReviewKeywordDate,
  reviewKeywordBizTypeLabel,
  shouldGoToPreviousPage,
} from './review-keywords.utils';

const activeBizType = ref<ReviewKeywordBizType>('CLEANING');
const searchKeyword = ref('');
const enabledFilter = ref<boolean | undefined>();
const loading = ref(false);
const tableData = ref<ReviewKeywordDto[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const bizTypeLabel = reviewKeywordBizTypeLabel;
const formatDate = formatReviewKeywordDate;

async function loadData() {
  loading.value = true;
  try {
    const response = await fetchReviewKeywords({
      bizType: activeBizType.value,
      keyword: searchKeyword.value.trim() || undefined,
      isEnabled: enabledFilter.value,
      page: page.value,
      pageSize: pageSize.value,
    });
    tableData.value = response.data.data.items;
    total.value = response.data.data.total;
    console.info('[ReviewKeywordConfig] Loaded keywords', {
      bizType: activeBizType.value,
      total: total.value,
    });
  } catch (error) {
    console.error('[ReviewKeywordConfig] Failed to load keywords', error);
  } finally {
    loading.value = false;
  }
}

function onBizTypeChange() {
  page.value = 1;
  loadData();
}

function onSearch() {
  page.value = 1;
  loadData();
}

function onReset() {
  searchKeyword.value = '';
  enabledFilter.value = undefined;
  page.value = 1;
  loadData();
}

async function onToggle(row: ReviewKeywordDto) {
  const action = row.isEnabled ? '停用' : '启用';
  try {
    await ElMessageBox.confirm(`确定要${action}关键词“${row.keyword}”吗？`, '操作确认', {
      type: 'warning',
    });
    await toggleReviewKeyword(row.id);
    ElMessage.success(`${action}成功`);
    console.info('[ReviewKeywordConfig] Toggled keyword', { id: row.id, action });
    await loadData();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('[ReviewKeywordConfig] Failed to toggle keyword', error);
    }
  }
}

async function onDelete(row: ReviewKeywordDto) {
  try {
    await ElMessageBox.confirm(`确定删除关键词“${row.keyword}”吗？删除后不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
    });
    await deleteReviewKeyword(row.id);
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
const formRef = ref<FormInstance>();
const form = reactive({ keyword: '', sortOrder: 0 });
const formRules: FormRules = {
  keyword: [
    { required: true, whitespace: true, message: '请输入评价关键词', trigger: 'blur' },
    { max: 32, message: '最多 32 个字符', trigger: 'blur' },
  ],
  sortOrder: [{ type: 'number', min: 0, message: '排序值不能小于 0', trigger: 'change' }],
};

function openCreateDialog() {
  editingId.value = null;
  form.keyword = '';
  form.sortOrder = 0;
  dialogVisible.value = true;
}

function openEditDialog(row: ReviewKeywordDto) {
  editingId.value = row.id;
  form.keyword = row.keyword;
  form.sortOrder = row.sortOrder;
  dialogVisible.value = true;
}

function resetForm() {
  formRef.value?.clearValidate();
  form.keyword = '';
  form.sortOrder = 0;
  editingId.value = null;
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const payload = {
      bizType: activeBizType.value,
      keyword: form.keyword.trim(),
      sortOrder: form.sortOrder,
    };
    if (editingId.value === null) {
      await createReviewKeyword(payload);
      ElMessage.success('新增成功');
    } else {
      await updateReviewKeyword(editingId.value, payload);
      ElMessage.success('编辑成功');
    }
    console.info('[ReviewKeywordConfig] Saved keyword', {
      id: editingId.value,
      bizType: activeBizType.value,
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
