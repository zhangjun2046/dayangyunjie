<template>
  <div class="services-page">
    <!-- ── 筛选工具栏 ───────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-select
          v-model="queryParams.bizType"
          placeholder="所属业务"
          clearable
          style="width: 150px"
          @change="onSearch"
        >
          <el-option
            v-for="opt in BIZ_TYPE_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="搜索服务名称"
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
          <el-icon><Plus /></el-icon>新增服务
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
        <el-table-column label="所属业务" width="120" align="center">
          <template #default="{ row }">
            {{ bizTypeLabel(row.bizType) }}
          </template>
        </el-table-column>
        <el-table-column label="服务名称" prop="name" min-width="120" />
        <el-table-column label="副标题" prop="subtitle" min-width="120">
          <template #default="{ row }">
            {{ row.subtitle || '—' }}
          </template>
        </el-table-column>
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
        <el-table-column label="价格海报" width="90" align="center">
          <template #default="{ row }">
            <img
              v-if="row.priceImageUrl"
              :src="row.priceImageUrl"
              class="poster-thumb"
              alt="价格海报"
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
      :title="isEdit ? '编辑服务' : '新增服务'"
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
      >
        <el-form-item label="所属业务" prop="bizType">
          <el-select v-model="form.bizType" placeholder="请选择业务类型" style="width: 100%">
            <el-option
              v-for="opt in BIZ_TYPE_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="服务名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入服务名称"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="副标题" prop="subtitle">
          <el-input
            v-model="form.subtitle"
            placeholder="请输入副标题（选填）"
            maxlength="128"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="服务图标" prop="icon">
          <div class="icon-upload-row">
            <button
              type="button"
              class="icon-upload-box"
              :class="{ 'is-uploading': iconUploading }"
              :disabled="iconUploading"
              @click="triggerIconUpload"
            >
              <img
                v-if="form.icon"
                :src="form.icon"
                class="icon-upload-preview"
                alt="服务图标"
              />
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
        <el-form-item v-if="showPricePosterUpload" label="价格海报">
          <div class="icon-upload-row">
            <button
              type="button"
              class="poster-upload-box"
              :class="{ 'is-uploading': posterUploading }"
              :disabled="posterUploading"
              @click="triggerPosterUpload"
            >
              <img
                v-if="form.priceImageUrl"
                :src="form.priceImageUrl"
                class="poster-upload-preview"
                alt="价格海报"
              />
              <template v-else>
                <el-icon :size="24" color="#c0c4cc"><Plus /></el-icon>
                <span>{{ posterUploading ? '上传中' : '选择图片' }}</span>
              </template>
            </button>
            <input
              ref="posterFileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden-input"
              @change="onPosterFileChange"
            />
            <div class="icon-upload-info">
              <span>大件价格表整图，支持 jpg、png、webp，不超过 10MB</span>
              <div v-if="form.priceImageUrl" class="icon-upload-actions">
                <el-button type="primary" link :disabled="posterUploading" @click="triggerPosterUpload">
                  重新上传
                </el-button>
                <el-button type="danger" link :disabled="posterUploading" @click="clearPoster">
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
          :disabled="iconUploading || posterUploading"
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
  createServiceCatalog,
  deleteServiceCatalog,
  fetchServiceCatalogs,
  toggleServiceCatalog,
  updateServiceCatalog,
  type CreateServiceCatalogBody,
  type ServiceCatalogItem,
} from '@/api/service-catalog';
import {
  buildCreateIconPayload,
  buildUpdateIconPayload,
  extractUploadedIconUrl,
  validateServiceIconFile,
} from './service-icon.utils';
import {
  isLargeRecyclingCatalog,
  validatePricePosterFile,
} from './service-price-poster.utils';

// ─── 业务类型映射 ─────────────────────────────────────────────────────────────

const BIZ_TYPE_OPTIONS = [
  { label: '保洁服务', value: 'CLEANING' },
  { label: '废品回收', value: 'RECYCLING' },
  { label: '家政服务', value: 'CONSULT' },
] as const;

const bizTypeLabel = (biz: string) =>
  BIZ_TYPE_OPTIONS.find((o) => o.value === biz)?.label ?? biz;

// ─── 列表状态 ─────────────────────────────────────────────────────────────────

const tableLoading = ref(false);
const tableData = ref<ServiceCatalogItem[]>([]);
const total = ref(0);
const keyword = ref('');

const queryParams = reactive({
  bizType: undefined as 'CLEANING' | 'RECYCLING' | 'CONSULT' | undefined,
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

// ─── 数据加载 ─────────────────────────────────────────────────────────────────

const loadData = async () => {
  tableLoading.value = true;
  try {
    const res = await fetchServiceCatalogs({
      bizType: queryParams.bizType,
      name: keyword.value || undefined,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      // 管理视角不传 isEnabled，后端返回全部（含禁用）
    });
    tableData.value = res.data.data.items;
    total.value = res.data.data.total;
    console.info('[ServiceConfig] loadData success, total=%d', res.data.data.total);
  } catch (err) {
    console.error('[ServiceConfig] loadData error', err);
  } finally {
    tableLoading.value = false;
  }
};

const onSearch = () => {
  queryParams.page = 1;
  loadData();
};

const onReset = () => {
  queryParams.bizType = undefined;
  keyword.value = '';
  queryParams.page = 1;
  loadData();
};

// ─── 切换启用 / 停用 ──────────────────────────────────────────────────────────

const onToggle = async (row: ServiceCatalogItem) => {
  const action = row.isEnabled ? '停用' : '启用';
  try {
    await ElMessageBox.confirm(`确定要${action}服务【${row.name}】吗？`, '操作确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await toggleServiceCatalog(row.id);
    ElMessage.success(`${action}成功`);
    console.info('[ServiceConfig] toggle id=%d action=%s', row.id, action);
    loadData();
  } catch {
    // 用户取消，忽略
  }
};

// ─── 删除 ────────────────────────────────────────────────────────────────────

const onDelete = async (row: ServiceCatalogItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除服务【${row.name}】吗？删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    );
    await deleteServiceCatalog(row.id);
    ElMessage.success('删除成功');
    console.info('[ServiceConfig] delete id=%d', row.id);
    // 删最后一条时回退到上一页
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
const iconUploading = ref(false);
const posterUploading = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const iconFileInput = ref<HTMLInputElement>();
const posterFileInput = ref<HTMLInputElement>();

const FORM_DEFAULT: CreateServiceCatalogBody & { subtitle: string; icon: string; priceImageUrl: string } = {
  bizType: 'CLEANING',
  name: '',
  subtitle: '',
  icon: '',
  priceImageUrl: '',
  sortOrder: 0,
};

const form = reactive({ ...FORM_DEFAULT });
const showPricePosterUpload = computed(() => isLargeRecyclingCatalog(form.bizType, form.name));

const formRules: FormRules = {
  bizType: [{ required: true, message: '请选择所属业务', trigger: 'change' }],
  name: [
    { required: true, message: '请输入服务名称', trigger: 'blur' },
    { max: 64, message: '最多 64 个字符', trigger: 'blur' },
  ],
  subtitle: [{ max: 128, message: '最多 128 个字符', trigger: 'blur' }],
  icon: [{ max: 512, message: '最多 512 个字符', trigger: 'blur' }],
  sortOrder: [{ type: 'number', min: 0, message: '排序值不能小于 0', trigger: 'change' }],
};

const openCreateDialog = () => {
  isEdit.value = false;
  editingId.value = null;
  Object.assign(form, FORM_DEFAULT);
  dialogVisible.value = true;
};

const openEditDialog = (row: ServiceCatalogItem) => {
  isEdit.value = true;
  editingId.value = row.id;
  form.bizType = row.bizType;
  form.name = row.name;
  form.subtitle = row.subtitle ?? '';
  form.icon = row.icon ?? '';
  form.priceImageUrl = row.priceImageUrl ?? '';
  form.sortOrder = row.sortOrder;
  dialogVisible.value = true;
};

const resetForm = () => {
  formRef.value?.clearValidate();
  Object.assign(form, FORM_DEFAULT);
  if (iconFileInput.value) iconFileInput.value.value = '';
  if (posterFileInput.value) posterFileInput.value.value = '';
};

// ─── 服务图标上传 ─────────────────────────────────────────────────────────────

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
    console.info('[ServiceConfig] icon upload success url=%s', uploadedUrl);
  } catch (error) {
    console.error('[ServiceConfig] icon upload error', error);
  } finally {
    iconUploading.value = false;
    input.value = '';
  }
};

const triggerPosterUpload = () => {
  if (!posterUploading.value) posterFileInput.value?.click();
};

const clearPoster = () => {
  form.priceImageUrl = '';
  if (posterFileInput.value) posterFileInput.value.value = '';
};

const onPosterFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const validation = validatePricePosterFile(file);
  if (!validation.ok) {
    ElMessage.error(validation.message);
    input.value = '';
    return;
  }
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  posterUploading.value = true;
  try {
    const res = await request.post<{ code: number; data: { url: string } }>(
      '/upload/poster',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const uploadedUrl = extractUploadedIconUrl(res.data);
    if (!uploadedUrl) {
      ElMessage.error('上传接口未返回海报地址');
      throw new Error('上传接口未返回海报地址');
    }

    form.priceImageUrl = uploadedUrl;
    ElMessage.success('价格海报上传成功');
    console.info('[ServiceConfig] poster upload success url=%s', uploadedUrl);
  } catch (error) {
    console.error('[ServiceConfig] poster upload error', error);
  } finally {
    posterUploading.value = false;
    input.value = '';
  }
};

const onSubmit = async () => {
  if (iconUploading.value || posterUploading.value) {
    ElMessage.warning('请等待图片上传完成');
    return;
  }
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitLoading.value = true;
  try {
    const payload: CreateServiceCatalogBody = {
      bizType: form.bizType,
      name: form.name,
      subtitle: form.subtitle || undefined,
      icon: buildCreateIconPayload(form.icon),
      priceImageUrl: showPricePosterUpload.value
        ? buildCreateIconPayload(form.priceImageUrl)
        : undefined,
      sortOrder: form.sortOrder,
    };

    if (isEdit.value && editingId.value !== null) {
      await updateServiceCatalog(editingId.value, {
        ...payload,
        icon: buildUpdateIconPayload(form.icon),
        priceImageUrl: showPricePosterUpload.value
          ? buildUpdateIconPayload(form.priceImageUrl)
          : null,
      });
      ElMessage.success('编辑成功');
      console.info('[ServiceConfig] update id=%d', editingId.value);
    } else {
      await createServiceCatalog(payload);
      ElMessage.success('新增成功');
      console.info('[ServiceConfig] create name=%s', payload.name);
    }

    dialogVisible.value = false;
    loadData();
  } catch (err) {
    console.error('[ServiceConfig] submit error', err);
  } finally {
    submitLoading.value = false;
  }
};

// ─── 初始化 ───────────────────────────────────────────────────────────────────

onMounted(loadData);
</script>

<style scoped lang="scss">
.services-page {
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

.poster-thumb {
  width: 36px;
  height: 48px;
  object-fit: cover;
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

.poster-upload-box {
  width: 96px;
  height: 136px;
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

.poster-upload-preview {
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
