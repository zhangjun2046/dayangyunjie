<template>
  <div class="banners-page">
    <!-- ── 筛选工具栏 ───────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-select
          v-model="statusFilter"
          placeholder="状态"
          clearable
          style="width: 120px"
          @change="onSearch"
        >
          <el-option label="启用" :value="true" />
          <el-option label="禁用" :value="false" />
        </el-select>
        <el-select
          v-model="queryParams.displayTarget"
          placeholder="展示端"
          clearable
          style="width: 130px"
          @change="onSearch"
        >
          <el-option
            v-for="opt in DISPLAY_TARGET_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="请输入标题"
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
          <el-icon><Plus /></el-icon>新增轮播
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
        <el-table-column label="标题" prop="title" min-width="120">
          <template #default="{ row }">
            {{ row.title || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="展示端" width="100" align="center">
          <template #default="{ row }">
            {{ displayTargetLabel(row.displayTarget) }}
          </template>
        </el-table-column>
        <el-table-column label="跳转类型" width="100" align="center">
          <template #default="{ row }">
            {{ linkTypeLabel(row.linkType) }}
          </template>
        </el-table-column>
        <el-table-column label="排序值" prop="sortOrder" width="85" align="center" />
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
        <el-table-column label="生效时间" min-width="200">
          <template #default="{ row }">
            {{ formatDateRange(row.startTime, row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="最后修改时间" width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
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

    <!-- ── 新增 / 编辑 Dialog ──────────────────────────────────────────────── -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑轮播' : '新增轮播'"
      width="640px"
      destroy-on-close
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
        label-position="right"
      >
        <!-- 基础信息 -->
        <div class="form-section">
          <div class="form-section-title">基础信息</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="轮播图标题" prop="title">
                <el-input
                  v-model="form.title"
                  placeholder="请输入轮播图标题"
                  maxlength="128"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="展示端" prop="displayTarget">
                <el-select v-model="form.displayTarget" placeholder="请选择展示端" style="width: 100%">
                  <el-option
                    v-for="opt in DISPLAY_TARGET_OPTIONS"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="排序值" prop="sortOrder">
                <el-input-number
                  v-model="form.sortOrder"
                  :min="0"
                  :max="9999"
                  controls-position="right"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="是否启用" prop="isEnabled">
                <el-select v-model="form.isEnabled" placeholder="请选择是否启用" style="width: 100%">
                  <el-option label="启用" :value="true" />
                  <el-option label="禁用" :value="false" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="生效时间" prop="effectiveRange">
                <el-date-picker
                  v-model="form.effectiveRange"
                  type="datetimerange"
                  range-separator="至"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 展示配置 -->
        <div class="form-section">
          <div class="form-section-title">展示配置</div>
          <el-form-item label="Banner图" prop="imageUrl" label-width="100px">
            <div class="upload-row">
              <div class="upload-box" @click="triggerUpload">
                <img v-if="form.imageUrl" :src="form.imageUrl" class="upload-preview" alt="banner" />
                <template v-else>
                  <el-icon :size="28" color="#c0c4cc"><Plus /></el-icon>
                  <span class="upload-text">上传图片</span>
                </template>
              </div>
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden-input"
                @change="onFileChange"
              />
              <ul class="upload-tips">
                <li>建议尺寸：750×320px</li>
                <li>支持格式：jpg / png / webp</li>
                <li>文件大小：不超过 2M</li>
              </ul>
            </div>
          </el-form-item>
        </div>

        <!-- 跳转配置 -->
        <div class="form-section">
          <div class="form-section-title">跳转配置</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="跳转类型" prop="linkType">
                <el-select v-model="form.linkType" placeholder="请选择跳转类型" style="width: 100%">
                  <el-option
                    v-for="opt in LINK_TYPE_OPTIONS"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="跳转路径" prop="linkTarget">
                <el-input
                  v-model="form.linkTarget"
                  placeholder="请输入跳转路径"
                  maxlength="512"
                  :disabled="form.linkType === 'NONE'"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import request from '@/api/request';
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  updateBanner,
  type CreateBannerBody,
} from '@/api/banner';
import type { BannerDisplayTarget, BannerDto, BannerLinkType } from '@dayangyunjie/shared';

// ─── 枚举映射 ─────────────────────────────────────────────────────────────────

const DISPLAY_TARGET_OPTIONS: { label: string; value: BannerDisplayTarget }[] = [
  { label: '居民端', value: 'RESIDENT' },
  { label: '员工端', value: 'WORKER' },
  { label: '全部', value: 'ALL' },
];

const LINK_TYPE_OPTIONS: { label: string; value: BannerLinkType }[] = [
  { label: '不跳转', value: 'NONE' },
  { label: '页面', value: 'PAGE' },
  { label: 'H5', value: 'URL' },
];

const displayTargetLabel = (val: BannerDisplayTarget) =>
  DISPLAY_TARGET_OPTIONS.find((o) => o.value === val)?.label ?? val;

const linkTypeLabel = (val: BannerLinkType) =>
  LINK_TYPE_OPTIONS.find((o) => o.value === val)?.label ?? val;

// ─── 列表状态 ─────────────────────────────────────────────────────────────────

const tableLoading = ref(false);
const tableData = ref<BannerDto[]>([]);
const total = ref(0);
const keyword = ref('');
const statusFilter = ref<boolean | undefined>(undefined);

const queryParams = reactive({
  displayTarget: undefined as BannerDisplayTarget | undefined,
  page: 1,
  pageSize: 10,
});

const pad = (n: number) => String(n).padStart(2, '0');

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateRange = (start: string, end: string) => {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
};

// ─── 数据加载 ─────────────────────────────────────────────────────────────────

const loadData = async () => {
  tableLoading.value = true;
  try {
    const res = await fetchBanners({
      displayTarget: queryParams.displayTarget,
      isEnabled: statusFilter.value,
      title: keyword.value || undefined,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    });
    tableData.value = res.data.data.items;
    total.value = res.data.data.total;
    console.info('[BannerConfig] loadData success, total=%d', res.data.data.total);
  } catch (err) {
    console.error('[BannerConfig] loadData error', err);
  } finally {
    tableLoading.value = false;
  }
};

const onSearch = () => {
  queryParams.page = 1;
  loadData();
};

const onReset = () => {
  statusFilter.value = undefined;
  queryParams.displayTarget = undefined;
  keyword.value = '';
  queryParams.page = 1;
  loadData();
};

// ─── 切换启用 / 禁用 ──────────────────────────────────────────────────────────

const onToggle = async (row: BannerDto) => {
  const action = row.isEnabled ? '禁用' : '启用';
  try {
    await ElMessageBox.confirm(
      `确定要${action}轮播【${row.title || '未命名'}】吗？`,
      '操作确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
    await updateBanner(row.id, { isEnabled: !row.isEnabled });
    ElMessage.success(`${action}成功`);
    console.info('[BannerConfig] toggle id=%d action=%s', row.id, action);
    loadData();
  } catch {
    // 用户取消
  }
};

// ─── 删除 ────────────────────────────────────────────────────────────────────

const onDelete = async (row: BannerDto) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除轮播【${row.title || '未命名'}】吗？删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    );
    await deleteBanner(row.id);
    ElMessage.success('删除成功');
    console.info('[BannerConfig] delete id=%d', row.id);
    if (tableData.value.length === 1 && queryParams.page > 1) {
      queryParams.page -= 1;
    }
    loadData();
  } catch {
    // 用户取消
  }
};

// ─── 新增 / 编辑 Dialog ───────────────────────────────────────────────────────

const dialogVisible = ref(false);
const isEdit = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const fileInput = ref<HTMLInputElement>();

interface BannerFormState {
  title: string;
  displayTarget: BannerDisplayTarget;
  sortOrder: number;
  isEnabled: boolean;
  effectiveRange: [string, string] | null;
  imageUrl: string;
  linkType: BannerLinkType;
  linkTarget: string;
}

const FORM_DEFAULT: BannerFormState = {
  title: '',
  displayTarget: 'RESIDENT',
  sortOrder: 0,
  isEnabled: true,
  effectiveRange: null,
  imageUrl: '',
  linkType: 'NONE',
  linkTarget: '',
};

const form = reactive<BannerFormState>({ ...FORM_DEFAULT });

const validateLinkTarget = (_rule: unknown, _value: string, callback: (err?: Error) => void) => {
  if (form.linkType !== 'NONE' && !form.linkTarget.trim()) {
    callback(new Error('请输入跳转路径'));
    return;
  }
  callback();
};

const formRules: FormRules = {
  displayTarget: [{ required: true, message: '请选择展示端', trigger: 'change' }],
  sortOrder: [{ required: true, type: 'number', message: '请输入排序值', trigger: 'change' }],
  isEnabled: [{ required: true, message: '请选择是否启用', trigger: 'change' }],
  effectiveRange: [{ required: true, message: '请选择生效时间', trigger: 'change' }],
  imageUrl: [{ required: true, message: '请上传 Banner 图', trigger: 'change' }],
  linkType: [{ required: true, message: '请选择跳转类型', trigger: 'change' }],
  linkTarget: [{ validator: validateLinkTarget, trigger: 'blur' }],
};

watch(
  () => form.linkType,
  (val) => {
    if (val === 'NONE') {
      form.linkTarget = '';
    }
  },
);

const openCreateDialog = () => {
  isEdit.value = false;
  editingId.value = null;
  Object.assign(form, FORM_DEFAULT);
  dialogVisible.value = true;
};

const openEditDialog = (row: BannerDto) => {
  isEdit.value = true;
  editingId.value = row.id;
  form.title = row.title ?? '';
  form.displayTarget = row.displayTarget;
  form.sortOrder = row.sortOrder;
  form.isEnabled = row.isEnabled;
  form.effectiveRange = [row.startTime, row.endTime];
  form.imageUrl = row.imageUrl;
  form.linkType = row.linkType;
  form.linkTarget = row.linkTarget ?? '';
  dialogVisible.value = true;
};

const resetForm = () => {
  formRef.value?.clearValidate();
  Object.assign(form, FORM_DEFAULT);
};

// ─── 图片上传 ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const triggerUpload = () => {
  fileInput.value?.click();
};

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error('图片大小不能超过 2M');
    input.value = '';
    return;
  }

  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await request.post<{ code: number; data: { url: string } }>('/upload/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    form.imageUrl = res.data.data?.url ?? '';
    await formRef.value?.validateField('imageUrl');
    console.info('[BannerConfig] upload success url=%s', form.imageUrl);
  } catch {
    ElMessage.error('图片上传失败');
  } finally {
    input.value = '';
  }
};

// ─── 提交 ─────────────────────────────────────────────────────────────────────

const toIsoString = (val: string) => new Date(val).toISOString();

const onSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  if (!form.effectiveRange || form.effectiveRange.length !== 2) {
    ElMessage.warning('请选择生效时间');
    return;
  }

  submitLoading.value = true;
  try {
    const payload: CreateBannerBody = {
      imageUrl: form.imageUrl,
      title: form.title.trim() || undefined,
      displayTarget: form.displayTarget,
      linkType: form.linkType,
      linkTarget: form.linkType === 'NONE' ? undefined : form.linkTarget.trim(),
      startTime: toIsoString(form.effectiveRange[0]),
      endTime: toIsoString(form.effectiveRange[1]),
      sortOrder: form.sortOrder,
      isEnabled: form.isEnabled,
    };

    if (isEdit.value && editingId.value !== null) {
      await updateBanner(editingId.value, payload);
      ElMessage.success('编辑成功');
      console.info('[BannerConfig] update id=%d', editingId.value);
    } else {
      await createBanner(payload);
      ElMessage.success('新增成功');
      console.info('[BannerConfig] create title=%s', payload.title);
    }

    dialogVisible.value = false;
    loadData();
  } catch (err) {
    console.error('[BannerConfig] submit error', err);
  } finally {
    submitLoading.value = false;
  }
};

// ─── 初始化 ───────────────────────────────────────────────────────────────────

onMounted(loadData);
</script>

<style scoped lang="scss">
.banners-page {
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

.form-section {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 14px;
}

.upload-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.upload-box {
  width: 120px;
  height: 120px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  background: #fff;
  flex-shrink: 0;

  &:hover {
    border-color: #409eff;
  }
}

.upload-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-text {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.upload-tips {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #909399;
  line-height: 1.8;
}

.hidden-input {
  display: none;
}
</style>
