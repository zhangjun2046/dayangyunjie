<template>
  <div class="recycling-items-page">
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-select
          v-model="queryParams.catalogId"
          placeholder="服务名称"
          clearable
          style="width: 180px"
          @change="onSearch"
        >
          <el-option
            v-for="catalog in recyclingCatalogs"
            :key="catalog.id"
            :label="catalog.name"
            :value="catalog.id"
          />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="搜索品项名称"
          clearable
          style="width: 220px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button type="primary" class="btn-add" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>新增品项
        </el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table v-loading="tableLoading" :data="tableData" stripe style="width: 100%" row-key="id">
        <el-table-column label="序号" type="index" width="65" align="center" />
        <el-table-column label="所属业务" width="120" align="center">
          <template #default>{{ BIZ_TYPE_FIXED_LABEL }}</template>
        </el-table-column>
        <el-table-column label="服务名称" prop="catalogName" min-width="120" />
        <el-table-column label="名称" prop="name" min-width="120" />
        <el-table-column label="金额" prop="priceText" min-width="120" />
        <el-table-column label="图标" width="80" align="center">
          <template #default="{ row }">
            <img
              v-if="row.icon"
              :src="row.icon"
              class="icon-thumb"
              alt="图标"
              @error="onIconError"
            />
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column label="排序" prop="sortOrder" width="75" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.isEnabled ? 'success' : 'danger'"
              size="small"
              class="status-tag"
              @click="onToggle(row)"
            >
              {{ row.isEnabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
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

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑回收品项' : '新增回收品项'"
      width="480px"
      destroy-on-close
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
        label-position="right"
      >
        <el-form-item label="所属业务">
          <el-input :model-value="BIZ_TYPE_FIXED_LABEL" disabled />
        </el-form-item>
        <el-form-item label="服务名称" prop="catalogId">
          <el-select
            v-model="form.catalogId"
            placeholder="请选择废品回收分类"
            style="width: 100%"
            @change="onCatalogChange"
          >
            <el-option
              v-for="catalog in recyclingCatalogs"
              :key="catalog.id"
              :label="catalog.name"
              :value="catalog.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入品项名称" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item v-if="showPriceAndIcon" label="金额" prop="priceText">
          <el-input
            v-model="form.priceText"
            placeholder="例如 0.6元/kg 或 面议"
            maxlength="32"
            show-word-limit
          />
          <span class="form-tip form-tip-block">{{ PRICE_TEXT_HINT }}</span>
        </el-form-item>
        <el-form-item v-if="showPriceAndIcon" label="图标" prop="icon">
          <div class="icon-upload-row">
            <button
              type="button"
              class="icon-upload-box"
              :class="{ 'is-uploading': iconUploading }"
              :disabled="iconUploading"
              @click="triggerIconUpload"
            >
              <img v-if="form.icon" :src="form.icon" class="icon-upload-preview" alt="品项图标" />
              <template v-else>
                <el-icon :size="24" color="#c0c4cc"><Plus /></el-icon>
                <span>{{ iconUploading ? '上传中' : '选择图片' }}</span>
              </template>
            </button>
            <input
              ref="iconFileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden-input"
              @change="onIconFileChange"
            />
            <div class="icon-upload-info">
              <span>支持 jpg、png、webp，建议正方形，不超过 1MB</span>
              <div v-if="form.icon" class="icon-upload-actions">
                <el-button type="primary" link :disabled="iconUploading" @click="triggerIconUpload">
                  重新上传
                </el-button>
                <el-button type="danger" link :disabled="iconUploading" @click="clearIcon">
                  清除
                </el-button>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
            :max="9999"
            controls-position="right"
            style="width: 160px"
          />
          <span class="form-tip">数值越小越靠前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          :disabled="iconUploading"
          @click="onSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import request from '@/api/request';
import {
  createRecyclingItem,
  deleteRecyclingItem,
  fetchRecyclingItems,
  toggleRecyclingItem,
  updateRecyclingItem,
  type RecyclingItemItem,
} from '@/api/recycling-item';
import { fetchServiceCatalogs, type ServiceCatalogItem } from '@/api/service-catalog';
import {
  extractUploadedIconUrl,
  validateServiceIconFile,
} from '../services/service-icon.utils';
import {
  BIZ_TYPE_FIXED_LABEL,
  PRICE_TEXT_HINT,
  buildCreateRecyclingItemBody,
  buildUpdateRecyclingItemBody,
  getNoRecyclingCatalogMessage,
  isSmallRecyclingCatalogName,
  type RecyclingItemFormState,
} from './recycling-items.utils';

const tableLoading = ref(false);
const tableData = ref<RecyclingItemItem[]>([]);
const total = ref(0);
const keyword = ref('');
const recyclingCatalogs = ref<ServiceCatalogItem[]>([]);

const queryParams = reactive({
  catalogId: undefined as number | undefined,
  page: 1,
  pageSize: 10,
});

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const onIconError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none';
};

const loadRecyclingCatalogs = async () => {
  try {
    const res = await fetchServiceCatalogs({
      bizType: 'RECYCLING',
      page: 1,
      pageSize: 100,
    });
    recyclingCatalogs.value = res.data.data.items;
  } catch (err) {
    console.error('[RecyclingItemConfig] load catalogs error', err);
  }
};

const loadData = async () => {
  tableLoading.value = true;
  try {
    const res = await fetchRecyclingItems({
      catalogId: queryParams.catalogId,
      name: keyword.value || undefined,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    });
    tableData.value = res.data.data.items;
    total.value = res.data.data.total;
  } catch (err) {
    console.error('[RecyclingItemConfig] loadData error', err);
  } finally {
    tableLoading.value = false;
  }
};

const onSearch = () => {
  queryParams.page = 1;
  loadData();
};

const onReset = () => {
  queryParams.catalogId = undefined;
  keyword.value = '';
  queryParams.page = 1;
  loadData();
};

const onToggle = async (row: RecyclingItemItem) => {
  const action = row.isEnabled ? '停用' : '启用';
  try {
    await ElMessageBox.confirm(`确定要${action}品项【${row.name}】吗？`, '操作确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await toggleRecyclingItem(row.id);
    ElMessage.success(`${action}成功`);
    loadData();
  } catch {
    // 用户取消，忽略
  }
};

const onDelete = async (row: RecyclingItemItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除品项【${row.name}】吗？删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    );
    await deleteRecyclingItem(row.id);
    ElMessage.success('删除成功');
    if (tableData.value.length === 1 && queryParams.page > 1) {
      queryParams.page -= 1;
    }
    loadData();
  } catch {
    // 用户取消，忽略
  }
};

const dialogVisible = ref(false);
const isEdit = ref(false);
const submitLoading = ref(false);
const iconUploading = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const iconFileInput = ref<HTMLInputElement>();

const FORM_DEFAULT: RecyclingItemFormState = {
  catalogId: undefined,
  name: '',
  priceText: '',
  icon: '',
  sortOrder: 0,
};

const form = reactive({ ...FORM_DEFAULT });

const selectedCatalogName = computed(() => {
  const catalog = recyclingCatalogs.value.find((item) => item.id === form.catalogId);
  return catalog?.name ?? null;
});

const showPriceAndIcon = computed(() => isSmallRecyclingCatalogName(selectedCatalogName.value));

const formRules = computed<FormRules>(() => ({
  catalogId: [{ required: true, message: '请选择服务名称', trigger: 'change' }],
  name: [
    { required: true, message: '请输入品项名称', trigger: 'blur' },
    { max: 64, message: '最多 64 个字符', trigger: 'blur' },
  ],
  priceText: showPriceAndIcon.value
    ? [
        { required: true, message: '请输入金额展示文案', trigger: 'blur' },
        { max: 32, message: '最多 32 个字符', trigger: 'blur' },
      ]
    : [],
  icon: showPriceAndIcon.value
    ? [
        { required: true, message: '请上传图标', trigger: 'change' },
        { max: 512, message: '最多 512 个字符', trigger: 'change' },
      ]
    : [],
  sortOrder: [{ type: 'number', min: 0, message: '排序值不能小于 0', trigger: 'change' }],
}));

const onCatalogChange = () => {
  formRef.value?.clearValidate(['priceText', 'icon']);
};

const toastIfNoRecyclingCatalog = () => {
  const message = getNoRecyclingCatalogMessage(recyclingCatalogs.value.length);
  if (!message) return false;
  ElMessage.warning(message);
  return true;
};

const openCreateDialog = () => {
  if (toastIfNoRecyclingCatalog()) return;
  isEdit.value = false;
  editingId.value = null;
  Object.assign(form, FORM_DEFAULT);
  dialogVisible.value = true;
};

const openEditDialog = (row: RecyclingItemItem) => {
  isEdit.value = true;
  editingId.value = row.id;
  form.catalogId = row.catalogId;
  form.name = row.name;
  form.priceText = row.priceText;
  form.icon = row.icon ?? '';
  form.sortOrder = row.sortOrder;
  dialogVisible.value = true;
};

const resetForm = () => {
  formRef.value?.clearValidate();
  Object.assign(form, FORM_DEFAULT);
  if (iconFileInput.value) iconFileInput.value.value = '';
};

const triggerIconUpload = () => {
  if (!iconUploading.value) iconFileInput.value?.click();
};

const clearIcon = () => {
  form.icon = '';
  formRef.value?.clearValidate('icon');
  if (iconFileInput.value) iconFileInput.value.value = '';
};

const onIconFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const validation = validateServiceIconFile(file);
  if (!validation.ok) {
    ElMessage.error(validation.message);
    input.value = '';
    return;
  }
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  iconUploading.value = true;
  try {
    const res = await request.post<{ code: number; data: { url: string } }>(
      '/upload/icon',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const uploadedUrl = extractUploadedIconUrl(res.data);
    if (!uploadedUrl) {
      ElMessage.error('上传接口未返回图标地址');
      throw new Error('上传接口未返回图标地址');
    }
    form.icon = uploadedUrl;
    await formRef.value?.validateField('icon');
    ElMessage.success('图标上传成功');
  } catch (error) {
    console.error('[RecyclingItemConfig] icon upload error', error);
  } finally {
    iconUploading.value = false;
    input.value = '';
  }
};

const onSubmit = async () => {
  if (toastIfNoRecyclingCatalog()) return;
  if (iconUploading.value) {
    ElMessage.warning('请等待图标上传完成');
    return;
  }
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitLoading.value = true;
  try {
    if (isEdit.value && editingId.value !== null) {
      await updateRecyclingItem(
        editingId.value,
        buildUpdateRecyclingItemBody(form, selectedCatalogName.value),
      );
      ElMessage.success('编辑成功');
    } else {
      await createRecyclingItem(buildCreateRecyclingItemBody(form, selectedCatalogName.value));
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    loadData();
  } catch (err) {
    console.error('[RecyclingItemConfig] submit error', err);
  } finally {
    submitLoading.value = false;
  }
};

onMounted(async () => {
  await loadRecyclingCatalogs();
  await loadData();
});
</script>

<style scoped lang="scss">
.recycling-items-page {
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

.icon-thumb {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 4px;
  vertical-align: middle;
}

.text-placeholder {
  color: #c0c4cc;
}

.status-tag {
  cursor: pointer;
  user-select: none;

  &:hover {
    opacity: 0.8;
  }
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.form-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}

.form-tip-block {
  display: block;
  margin-left: 0;
  margin-top: 6px;
}

.icon-upload-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-upload-box {
  width: 76px;
  height: 76px;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #909399;
  font-size: 12px;
  background: #fafafa;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    color: #409eff;
    border-color: #409eff;
  }

  &.is-uploading {
    cursor: wait;
    opacity: 0.65;
  }
}

.icon-upload-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.hidden-input {
  display: none;
}

.icon-upload-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}

.icon-upload-actions {
  display: flex;
  margin-top: 4px;

  :deep(.el-button) {
    margin-left: 0;
    margin-right: 12px;
  }
}
</style>
