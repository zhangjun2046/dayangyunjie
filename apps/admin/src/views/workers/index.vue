<template>
  <div class="workers-page">
    <!-- ── 筛选工具栏 ─────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-input
          v-model="queryParams.name"
          placeholder="搜索员工姓名、手机号"
          clearable
          style="width: 220px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select
          v-model="queryParams.status"
          placeholder="全部状态"
          clearable
          style="width: 130px"
          @change="onSearch"
        >
          <el-option label="空闲" value="IDLE" />
          <el-option label="服务中" value="BUSY" />
        </el-select>
        <el-select
          v-model="queryParams.skillType"
          placeholder="全部技能"
          clearable
          style="width: 130px"
          @change="onSearch"
        >
          <el-option label="保洁" value="CLEANING" />
          <el-option label="收废品" value="RECYCLING" />
          <el-option label="保洁和收废品" value="BOTH" />
        </el-select>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button type="primary" class="btn-add" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>新增员工
        </el-button>
      </div>
    </el-card>

    <!-- ── 数据表格 ─────────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="tableLoading" :data="workers" stripe style="width: 100%">
        <el-table-column label="姓名" min-width="130">
          <template #default="{ row }">
            <span class="worker-name">{{ row.name }}</span>
            <div class="worker-empno">{{ row.employeeNo }}</div>
          </template>
        </el-table-column>
        <el-table-column label="手机号" prop="phone" min-width="140" />
        <el-table-column label="状态" min-width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'IDLE' ? 'success' : 'warning'" size="small">
              {{ row.status === 'IDLE' ? '空闲' : '服务中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="评分" min-width="150" align="center">
          <template #default="{ row }">
            <span class="rating-cell">⭐{{ row.rating?.toFixed(1) }}（{{ row.totalOrders }}单）</span>
          </template>
        </el-table-column>
        <el-table-column label="今日订单" min-width="100" align="center">
          <template #default="{ row }">{{ row.todayOrders ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="技能" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ skillLabel(row.skillType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">详情</el-button>
            <el-divider direction="vertical" />
            <el-button type="primary" link @click="openEditDialog(row)">编辑</el-button>
            <el-divider direction="vertical" />
            <el-button type="danger" link @click="openResetPwd(row)">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-bar">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="onSearch"
          @current-change="loadWorkers"
        />
      </div>
    </el-card>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- ── 详情抽屉 ──────────────────────────────────────────────────────── -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <el-drawer
      v-model="detailVisible"
      :title="`服务人员详情 — ${currentWorker?.name ?? ''}`"
      size="520px"
      destroy-on-close
    >
      <template v-if="currentWorker">
        <!-- 基本信息 -->
        <el-descriptions :column="2" border class="detail-desc">
          <el-descriptions-item label="员工编号">{{ currentWorker.employeeNo }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ currentWorker.name }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ currentWorker.nickname || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentWorker.phone }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ genderLabel(currentWorker.gender) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentWorker.status === 'IDLE' ? 'success' : 'warning'" size="small">
              {{ currentWorker.status === 'IDLE' ? '空闲' : '服务中' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="技能">{{ skillLabel(currentWorker.skillType) }}</el-descriptions-item>
          <el-descriptions-item label="岗位">{{ positionLabel(currentWorker.position) }}</el-descriptions-item>
          <el-descriptions-item label="今日订单">{{ currentWorker.todayOrders ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="累计完成">{{ currentWorker.totalOrders }} 单</el-descriptions-item>
          <el-descriptions-item label="评分">⭐ {{ currentWorker.rating?.toFixed(1) }}</el-descriptions-item>
          <el-descriptions-item label="身份证">{{ currentWorker.idCard || '—' }}</el-descriptions-item>
          <el-descriptions-item label="紧急联系人">{{ currentWorker.emergencyContact || '—' }}</el-descriptions-item>
          <el-descriptions-item label="联系人电话">{{ currentWorker.emergencyPhone || '—' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 证书信息区 -->
        <div class="section-title">证书信息</div>
        <div class="cert-grid">
          <div class="cert-item">
            <div class="cert-label">健康证</div>
            <el-image
              v-if="currentWorker.healthCertUrl"
              :src="currentWorker.healthCertUrl"
              :preview-src-list="[currentWorker.healthCertUrl]"
              fit="cover"
              class="cert-img"
            />
            <div v-else class="cert-empty">暂无图片</div>
            <div class="cert-expiry">
              有效期：{{ formatDate(currentWorker.healthCertExpiry) }}
            </div>
          </div>
          <div class="cert-item">
            <div class="cert-label">技能证书</div>
            <div
              v-if="getSkillCertUrls(currentWorker).length > 0"
              class="cert-images"
            >
              <el-image
                v-for="(url, index) in getSkillCertUrls(currentWorker)"
                :key="url"
                :src="url"
                :preview-src-list="getSkillCertUrls(currentWorker)"
                :initial-index="index"
                fit="cover"
                class="cert-img cert-img-multiple"
              />
            </div>
            <div v-else class="cert-empty">暂无图片</div>
            <div class="cert-expiry">
              有效期：{{ formatDate(currentWorker.skillCertExpiry) }}
            </div>
          </div>
        </div>

        <!-- 绩效统计（无创收金额） -->
        <div class="section-title">绩效统计</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="累计完成单数">{{ currentWorker.totalOrders }}</el-descriptions-item>
          <el-descriptions-item label="完成率">
            {{ currentWorker.totalOrders > 0 ? '100%' : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="平均评分">{{ currentWorker.rating?.toFixed(1) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 投诉记录列表 -->
        <div class="section-title">投诉记录</div>
        <div v-if="complaintLoading" class="complaint-loading">
          <el-icon class="is-loading"><Loading /></el-icon> 加载中…
        </div>
        <template v-else-if="complaints.length > 0">
          <div v-for="c in complaints" :key="c.id" class="complaint-card">
            <div class="complaint-header">
              <span class="complaint-no">{{ c.complaintNo }}</span>
              <el-tag :type="complaintStatusType(c.status)" size="small">
                {{ complaintStatusLabel(c.status) }}
              </el-tag>
            </div>
            <div class="complaint-body">
              <span class="complaint-type">{{ orderTypeLabel(c.orderType) }}</span>
              <span class="complaint-reason">{{ c.reason }}</span>
            </div>
            <div class="complaint-time">{{ formatDate(c.createdAt) }}</div>
          </div>
        </template>
        <el-empty v-else description="暂无投诉记录" :image-size="60" />
      </template>
    </el-drawer>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- ── 新增 / 编辑弹窗 ──────────────────────────────────────────────── -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <el-dialog
      v-model="formVisible"
      :title="isEdit ? '编辑员工' : '新增员工'"
      width="700px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="110px"
        class="worker-form"
      >
        <!-- 基础信息 -->
        <div class="form-section-title">基础信息</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="员工姓名" prop="name">
              <el-input v-model="form.name" placeholder="请输入员工姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="员工昵称">
              <el-input v-model="form.nickname" placeholder="请输入员工昵称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="员工编号" prop="employeeNo">
              <el-input v-model="form.employeeNo" placeholder="自动生成或手工录入" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号（登录账号）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-radio-group v-model="form.gender">
                <el-radio value="MALE">男</el-radio>
                <el-radio value="FEMALE">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号">
              <el-input v-model="form.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位">
              <el-input v-model="form.position" placeholder="请输入岗位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="技能" prop="skillType">
              <el-select v-model="form.skillType" placeholder="请选择" style="width: 100%">
                <el-option label="保洁" value="CLEANING" />
                <el-option label="收废品" value="RECYCLING" />
                <el-option label="保洁和收废品" value="BOTH" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="员工状态">
              <el-radio-group v-model="form.status">
                <el-radio value="IDLE">在职</el-radio>
                <el-radio value="BUSY">服务中</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 联系方式 -->
        <div class="form-section-title">联系方式</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入联系电话" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急联系人">
              <el-input v-model="form.emergencyContact" placeholder="请输入紧急联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系人电话">
              <el-input v-model="form.emergencyPhone" placeholder="请输入联系人电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 身份与资质 -->
        <div class="form-section-title">身份与资质</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="身份证正面">
              <div class="upload-box" @click="triggerUpload('idFront')">
                <img v-if="form.idFrontUrl" :src="form.idFrontUrl" class="upload-preview" />
                <div v-else class="upload-placeholder"><el-icon><Plus /></el-icon><span>上传图片</span></div>
              </div>
              <input ref="idFrontInput" type="file" accept="image/*" style="display:none" @change="(e) => onFileChange(e, 'idFront')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证反面">
              <div class="upload-box" @click="triggerUpload('idBack')">
                <img v-if="form.idBackUrl" :src="form.idBackUrl" class="upload-preview" />
                <div v-else class="upload-placeholder"><el-icon><Plus /></el-icon><span>上传图片</span></div>
              </div>
              <input ref="idBackInput" type="file" accept="image/*" style="display:none" @change="(e) => onFileChange(e, 'idBack')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="健康证">
              <div class="upload-box" @click="triggerUpload('health')">
                <img v-if="form.healthCertUrl" :src="form.healthCertUrl" class="upload-preview" />
                <div v-else class="upload-placeholder"><el-icon><Plus /></el-icon><span>上传图片</span></div>
              </div>
              <input ref="healthInput" type="file" accept="image/*" style="display:none" @change="(e) => onFileChange(e, 'health')" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="技能证书" prop="skillCertUrls">
              <div class="skill-cert-uploader">
                <div class="skill-cert-list">
                  <div
                    v-for="(url, index) in form.skillCertUrls"
                    :key="`${url}-${index}`"
                    class="skill-cert-item"
                  >
                    <el-image
                      :src="url"
                      :preview-src-list="form.skillCertUrls"
                      :initial-index="index"
                      fit="cover"
                      class="upload-preview"
                    />
                    <button
                      type="button"
                      class="skill-cert-remove"
                      aria-label="删除技能证书"
                      @click.stop="removeSkillCert(index)"
                    >
                      ×
                    </button>
                  </div>
                  <div
                    v-if="form.skillCertUrls.length < MAX_SKILL_CERTS"
                    class="upload-box"
                    :class="{ 'is-uploading': skillUploading }"
                    @click="triggerUpload('skill')"
                  >
                    <div class="upload-placeholder">
                      <el-icon>
                        <Loading v-if="skillUploading" class="is-loading" />
                        <Plus v-else />
                      </el-icon>
                      <span>{{ skillUploading ? '上传中' : '继续上传' }}</span>
                    </div>
                  </div>
                </div>
                <div class="skill-cert-count">
                  已上传 {{ form.skillCertUrls.length }}/{{ MAX_SKILL_CERTS }} 张
                </div>
              </div>
              <input
                ref="skillCertInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style="display:none"
                @change="(e) => onFileChange(e, 'skill')"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="saveLoading"
          :disabled="skillUploading"
          @click="onSave"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- ── 重置密码确认弹窗 ─────────────────────────────────────────────── -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <el-dialog
      v-model="resetPwdVisible"
      title="重置密码"
      width="400px"
    >
      <div class="reset-pwd-tip">
        <el-icon color="#e6a23c" size="20"><Warning /></el-icon>
        将密码重置为手机号
        <strong>{{ maskPhone(resetTarget?.phone) }}</strong>，员工下次登录需使用完整手机号，确认重置？
      </div>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetLoading" @click="onConfirmReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, Warning, Loading } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import {
  fetchWorkers,
  getWorker,
  createWorker,
  updateWorker,
  resetWorkerPassword,
  type WorkerListItem,
  type CreateWorkerPayload,
} from '@/api/worker';
import { fetchComplaints, type ComplaintItem } from '@/api/complaint';
import request from '@/api/request';

// ─── 状态 ────────────────────────────────────────────────────────────────────

const tableLoading = ref(false);
const workers = ref<WorkerListItem[]>([]);
const total = ref(0);

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  name: '',
  status: '',
  skillType: '',
});

// 统计卡数据（通过三次查询获得）
const statsAll = ref(0);
const statsIdle = ref(0);
const statsBusy = ref(0);

// ─── 列表方法 ────────────────────────────────────────────────────────────────

async function loadWorkers() {
  tableLoading.value = true;
  try {
    const params: Record<string, unknown> = {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    };
    if (queryParams.name) {
      // 纯数字关键词视为手机号，走 phone 参数；否则走 name 参数
      if (/^\d+$/.test(queryParams.name.trim())) {
        params.phone = queryParams.name.trim();
      } else {
        params.name = queryParams.name.trim();
      }
    }
    if (queryParams.status) params.status = queryParams.status;
    if (queryParams.skillType) params.skillType = queryParams.skillType;

    const res = await fetchWorkers(params);
    workers.value = res.data.data.items;
    total.value = res.data.data.total;

    console.info('[Workers] list loaded, total=', total.value);
  } catch {
    // error handled by interceptor
  } finally {
    tableLoading.value = false;
  }
}

async function loadStats() {
  try {
    const [all, idle, busy] = await Promise.all([
      fetchWorkers({ page: 1, pageSize: 1 }),
      fetchWorkers({ page: 1, pageSize: 1, status: 'IDLE' }),
      fetchWorkers({ page: 1, pageSize: 1, status: 'BUSY' }),
    ]);
    statsAll.value = all.data.data.total;
    statsIdle.value = idle.data.data.total;
    statsBusy.value = busy.data.data.total;
  } catch {
    // error handled by interceptor
  }
}

function onSearch() {
  queryParams.page = 1;
  loadWorkers();
}

function onReset() {
  queryParams.name = '';
  queryParams.status = '';
  queryParams.skillType = '';
  queryParams.page = 1;
  loadWorkers();
  loadStats();
}

onMounted(() => {
  loadWorkers();
  loadStats();
});

// ─── 详情抽屉 ─────────────────────────────────────────────────────────────────

const detailVisible = ref(false);
const currentWorker = ref<WorkerListItem | null>(null);
const complaints = ref<ComplaintItem[]>([]);
const complaintLoading = ref(false);

async function openDetail(row: WorkerListItem) {
  const res = await getWorker(row.id);
  currentWorker.value = { ...res.data.data, todayOrders: row.todayOrders };
  detailVisible.value = true;
  loadComplaints(row.id);
}

async function loadComplaints(workerId: number) {
  complaintLoading.value = true;
  complaints.value = [];
  try {
    const res = await fetchComplaints({ workerId, pageSize: 50 });
    complaints.value = res.data.data.items;
    console.info('[Workers] complaints loaded for workerId=', workerId, 'count=', complaints.value.length);
  } catch {
    // error handled by interceptor
  } finally {
    complaintLoading.value = false;
  }
}

// ─── 新增 / 编辑 Dialog ───────────────────────────────────────────────────────

const formVisible = ref(false);
const isEdit = ref(false);
const saveLoading = ref(false);
const formRef = ref<FormInstance>();
const MAX_SKILL_CERTS = 9;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const skillUploadCount = ref(0);
const skillUploading = computed(() => skillUploadCount.value > 0);

const EMPTY_FORM = () => ({
  id: 0,
  employeeNo: '',
  name: '',
  phone: '',
  nickname: '',
  gender: 'MALE',
  idCard: '',
  position: '',
  skillType: '',
  status: 'IDLE' as 'IDLE' | 'BUSY',
  emergencyContact: '',
  emergencyPhone: '',
  idFrontUrl: '',
  idBackUrl: '',
  healthCertUrl: '',
  skillCertUrls: [] as string[],
});

const form = reactive(EMPTY_FORM());

const formRules: FormRules = {
  name: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  employeeNo: [{ required: true, message: '请输入员工编号', trigger: 'blur' }],
  skillType: [{ required: true, message: '请选择技能', trigger: 'change' }],
  skillCertUrls: [{
    validator: (_rule, value: string[], callback) => {
      if (value.length > MAX_SKILL_CERTS) {
        callback(new Error(`技能证书最多上传 ${MAX_SKILL_CERTS} 张`));
        return;
      }
      callback();
    },
    trigger: 'change',
  }],
};

function openCreateDialog() {
  isEdit.value = false;
  Object.assign(form, EMPTY_FORM());
  // 自动生成工号占位符
  form.employeeNo = `WK${Date.now().toString().slice(-6)}`;
  formVisible.value = true;
}

function openEditDialog(row: WorkerListItem) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    employeeNo: row.employeeNo,
    name: row.name,
    phone: row.phone,
    nickname: row.nickname ?? '',
    gender: row.gender ?? 'MALE',
    idCard: row.idCard ?? '',
    position: row.position ?? '',
    skillType: row.skillType,
    status: row.status,
    emergencyContact: row.emergencyContact ?? '',
    emergencyPhone: row.emergencyPhone ?? '',
    idFrontUrl: '',
    idBackUrl: '',
    healthCertUrl: row.healthCertUrl ?? '',
    skillCertUrls: getSkillCertUrls(row),
  });
  formVisible.value = true;
}

async function onSave() {
  if (skillUploading.value) {
    ElMessage.warning('技能证书仍在上传，请稍候');
    return;
  }
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saveLoading.value = true;
  try {
    if (isEdit.value) {
      const payload: Record<string, unknown> = {
        name: form.name,
        nickname: form.nickname || undefined,
        gender: form.gender || undefined,
        idCard: form.idCard || undefined,
        position: form.position || undefined,
        skillType: form.skillType,
        status: form.status,
        emergencyContact: form.emergencyContact || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        healthCertUrl: form.healthCertUrl || undefined,
        skillCertUrls: [...form.skillCertUrls],
      };
      await updateWorker(form.id, payload);
      ElMessage.success('员工信息已更新');
      console.info('[Workers] updated id=', form.id);
    } else {
      const payload: CreateWorkerPayload = {
        employeeNo: form.employeeNo,
        password: form.phone,
        name: form.name,
        phone: form.phone,
        skillType: form.skillType,
        nickname: form.nickname || undefined,
        gender: form.gender || undefined,
        idCard: form.idCard || undefined,
        position: form.position || undefined,
        status: form.status,
        emergencyContact: form.emergencyContact || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        healthCertUrl: form.healthCertUrl || undefined,
        skillCertUrls: [...form.skillCertUrls],
      };
      await createWorker(payload);
      ElMessage.success('员工已新增，初始密码为手机号');
      console.info('[Workers] created name=', form.name);
    }
    formVisible.value = false;
    loadWorkers();
    loadStats();
  } catch {
    // error handled by interceptor
  } finally {
    saveLoading.value = false;
  }
}

// ─── 图片上传 ─────────────────────────────────────────────────────────────────

const idFrontInput = ref<HTMLInputElement>();
const idBackInput = ref<HTMLInputElement>();
const healthInput = ref<HTMLInputElement>();
const skillCertInput = ref<HTMLInputElement>();

type UploadTarget = 'idFront' | 'idBack' | 'health' | 'skill';

function triggerUpload(target: UploadTarget) {
  if (
    target === 'skill'
    && (skillUploading.value || form.skillCertUrls.length >= MAX_SKILL_CERTS)
  ) {
    return;
  }
  const map: Record<UploadTarget, HTMLInputElement | undefined> = {
    idFront: idFrontInput.value,
    idBack: idBackInput.value,
    health: healthInput.value,
    skill: skillCertInput.value,
  };
  map[target]?.click();
}

/** 上传单张图片并返回服务端 URL。 */
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await request.post<{ code: number; data: { url: string } }>(
    '/upload/image',
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data?.url ?? '';
}

/** 校验与后端上传接口一致的格式和 10MB 大小限制。 */
function isValidImage(file: File): boolean {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    ElMessage.warning(`${file.name} 格式不支持，仅允许 JPEG、PNG、WebP`);
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    ElMessage.warning(`${file.name} 超过 10MB，无法上传`);
    return false;
  }
  return true;
}

async function onFileChange(event: Event, target: UploadTarget) {
  const input = event.target as HTMLInputElement;
  const selectedFiles = Array.from(input.files ?? []);
  if (selectedFiles.length === 0) return;

  try {
    if (target === 'skill') {
      const remaining = MAX_SKILL_CERTS - form.skillCertUrls.length;
      const files = selectedFiles.slice(0, remaining).filter(isValidImage);
      if (selectedFiles.length > remaining) {
        ElMessage.warning(`最多上传 ${MAX_SKILL_CERTS} 张，已忽略超出部分`);
      }
      if (files.length === 0) return;

      skillUploadCount.value += files.length;
      const results = await Promise.allSettled(files.map(uploadImage));
      const uploadedUrls = results
        .filter((result): result is PromiseFulfilledResult<string> =>
          result.status === 'fulfilled' && Boolean(result.value))
        .map((result) => result.value);
      form.skillCertUrls.push(...uploadedUrls);
      await formRef.value?.validateField('skillCertUrls');

      const failedCount = files.length - uploadedUrls.length;
      if (failedCount > 0) {
        ElMessage.warning(`成功上传 ${uploadedUrls.length} 张，失败 ${failedCount} 张`);
      } else {
        ElMessage.success(`成功上传 ${uploadedUrls.length} 张技能证书`);
      }
      console.info(
        '[Workers] skill certificates uploaded, success=',
        uploadedUrls.length,
        'failed=',
        failedCount,
      );
      return;
    }

    const file = selectedFiles[0];
    if (!file || !isValidImage(file)) return;
    const url = await uploadImage(file);
    if (target === 'idFront') form.idFrontUrl = url;
    else if (target === 'idBack') form.idBackUrl = url;
    else {
      form.healthCertUrl = url;
      await formRef.value?.validateField('healthCertUrl');
    }
    console.info('[Workers] upload success target=', target, 'url=', url);
  } catch {
    ElMessage.error('图片上传失败');
  } finally {
    if (target === 'skill') {
      skillUploadCount.value = 0;
    }
    input.value = '';
  }
}

/** 删除一张待保存的技能证书。 */
function removeSkillCert(index: number) {
  form.skillCertUrls.splice(index, 1);
  formRef.value?.validateField('skillCertUrls');
  console.info('[Workers] skill certificate removed, index=', index);
}

// ─── 重置密码 ─────────────────────────────────────────────────────────────────

const resetPwdVisible = ref(false);
const resetTarget = ref<WorkerListItem | null>(null);
const resetLoading = ref(false);

function openResetPwd(row: WorkerListItem) {
  resetTarget.value = row;
  resetPwdVisible.value = true;
}

async function onConfirmReset() {
  if (!resetTarget.value) return;
  resetLoading.value = true;
  try {
    await resetWorkerPassword(resetTarget.value.id);
    ElMessage.success(`密码已重置为手机号 ${resetTarget.value.phone}`);
    resetPwdVisible.value = false;
    console.info('[Workers] reset password workerId=', resetTarget.value.id);
  } catch {
    // error handled by interceptor
  } finally {
    resetLoading.value = false;
  }
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

/** 优先读取多图字段，并兼容历史单图数据。 */
function getSkillCertUrls(worker: WorkerListItem): string[] {
  const urls = worker.skillCertUrls?.filter(Boolean) ?? [];
  if (urls.length > 0) {
    return urls;
  }
  return worker.skillCertUrl ? [worker.skillCertUrl] : [];
}

function skillLabel(skillType?: string) {
  if (skillType === 'CLEANING') return '保洁';
  if (skillType === 'RECYCLING') return '收废品';
  if (skillType === 'BOTH') return '保洁和收废品';
  return skillType ?? '—';
}

function genderLabel(gender?: string | null) {
  if (gender === 'MALE') return '男';
  if (gender === 'FEMALE') return '女';
  return '—';
}

function positionLabel(position?: string | null) {
  if (position === 'CLEANER') return '保洁员';
  if (position === 'RECYCLER') return '回收员';
  return position || '—';
}

function formatDate(val?: string | null) {
  if (!val) return '—';
  return val.slice(0, 10);
}

function maskPhone(phone?: string) {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function complaintStatusLabel(status: string) {
  const map: Record<string, string> = { PENDING: '待处理', PROCESSING: '处理中', COMPLETED: '已完成' };
  return map[status] ?? status;
}

function complaintStatusType(status: string) {
  const map: Record<string, string> = { PENDING: 'danger', PROCESSING: 'warning', COMPLETED: 'success' };
  return (map[status] ?? 'info') as 'danger' | 'warning' | 'success' | 'info';
}

function orderTypeLabel(type: string) {
  const map: Record<string, string> = { CLEANING: '保洁', RECYCLING: '废品', CONSULT: '家政' };
  return map[type] ?? type;
}
</script>

<style scoped>
.workers-page {
  padding: 20px;
}

/* ── 筛选栏 ─────────────────────────────────────────────────────────────────── */
.filter-card {
  margin-bottom: 16px;
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

/* ── 表格 ───────────────────────────────────────────────────────────────────── */
.table-card {
  margin-bottom: 16px;
}

.worker-name {
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.worker-empno {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.rating-cell {
  font-size: 13px;
  white-space: nowrap;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* ── 详情抽屉 ───────────────────────────────────────────────────────────────── */
.detail-desc {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 20px 0 12px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.cert-grid {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.cert-item {
  flex: 1;
}

.cert-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.cert-img {
  width: 100%;
  height: 120px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  cursor: pointer;
}

.cert-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.cert-img-multiple {
  width: 100%;
  height: 76px;
}

.cert-empty {
  width: 100%;
  height: 120px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 13px;
}

.cert-expiry {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.complaint-loading {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 13px;
}

.complaint-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 8px;
}

.complaint-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.complaint-no {
  font-size: 12px;
  color: #606266;
}

.complaint-body {
  display: flex;
  gap: 10px;
  font-size: 13px;
  margin-bottom: 4px;
}

.complaint-type {
  color: #409eff;
  font-weight: 500;
}

.complaint-reason {
  color: #303133;
}

.complaint-time {
  font-size: 12px;
  color: #c0c4cc;
}

/* ── 新增/编辑弹窗 ──────────────────────────────────────────────────────────── */
.worker-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 6px;
}

.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
  padding: 0 0 6px;
  border-bottom: 1px solid #ebeef5;
}

.upload-box {
  width: 120px;
  height: 90px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}

.upload-box:hover {
  border-color: #409eff;
}

.upload-box.is-uploading {
  cursor: wait;
  opacity: 0.7;
}

.upload-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.skill-cert-uploader {
  width: 100%;
}

.skill-cert-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.skill-cert-item {
  position: relative;
  width: 120px;
  height: 90px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
}

.skill-cert-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: rgb(0 0 0 / 55%);
  cursor: pointer;
  font-size: 18px;
  line-height: 20px;
}

.skill-cert-remove:hover {
  background: #f56c6c;
}

.skill-cert-count {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #c0c4cc;
  font-size: 12px;
}

/* ── 重置密码弹窗 ────────────────────────────────────────────────────────────── */
.reset-pwd-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}
</style>
