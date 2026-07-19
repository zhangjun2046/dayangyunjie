<template>
  <div class="complaint-page">
    <!-- ── 筛选工具栏 ─────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="filter-card">
      <!-- 状态 Tab -->
      <div class="status-tabs">
        <span
          v-for="tab in STATUS_TABS"
          :key="tab.value"
          class="status-tab"
          :class="{ 'status-tab--active': queryParams.status === tab.value }"
          @click="onStatusTabClick(tab.value)"
        >{{ tab.label }}</span>
      </div>

      <!-- 搜索行 -->
      <div class="search-row">
        <el-input
          v-model="keyword"
          placeholder="搜索投诉单号、客户姓名、地址"
          clearable
          style="width: 240px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-input
          v-model="queryParams.contactPhone"
          placeholder="客户联系方式"
          clearable
          style="width: 160px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </div>
    </el-card>

    <!-- ── 数据表格 ─────────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="tableLoading"
        :data="complaints"
        stripe
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="投诉单编号" prop="complaintNo" width="180" />

        <el-table-column label="关联订单" width="185">
          <template #default="{ row }">
            <el-button
              v-if="row.orderNo"
              link
              type="primary"
              size="small"
              @click="openDetail(row)"
            >{{ row.orderNo }}</el-button>
            <span v-else class="text-gray">—</span>
          </template>
        </el-table-column>

        <el-table-column label="客户姓名" width="100">
          <template #default="{ row }">
            {{ row.contactName || '—' }}
          </template>
        </el-table-column>

        <el-table-column label="客户联系方式" width="130">
          <template #default="{ row }">
            {{ row.contactPhone || '—' }}
          </template>
        </el-table-column>

        <el-table-column label="服务类型" width="130">
          <template #default="{ row }">
            {{ row.serviceType || '—' }}
          </template>
        </el-table-column>

        <el-table-column label="服务地址" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.serviceAddress || '—' }}
          </template>
        </el-table-column>

        <el-table-column label="投诉内容" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="row.contactPhone"
              link
              type="primary"
              size="small"
              @click="copyPhone(row.contactPhone)"
            >联系客户</el-button>
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
          layout="total, sizes, prev, pager, next"
          background
          @size-change="loadComplaints"
          @current-change="loadComplaints"
        />
      </div>
    </el-card>

    <!-- ── 投诉详情抽屉 ──────────────────────────────────────────────────────── -->
    <el-drawer
      v-model="detailDrawer.visible"
      title="投诉详情"
      size="640px"
      direction="rtl"
      destroy-on-close
    >
      <div v-if="detailDrawer.loading" class="drawer-loading">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      </div>

      <template v-else-if="detailDrawer.complaint">
        <!-- 投诉单号 + 状态 -->
        <div class="detail-status-bar">
          <span class="detail-order-no">投诉单号：{{ detailDrawer.complaint.complaintNo }}</span>
          <el-tag :type="statusTagType(detailDrawer.complaint.status)">
            {{ statusLabel(detailDrawer.complaint.status) }}
          </el-tag>
        </div>

        <!-- 关联原始订单 -->
        <el-card shadow="never" class="detail-section">
          <template #header><span class="section-title">关联原始订单</span></template>
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="服务类型">
              {{ detailDrawer.complaint.serviceType || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="订单来源">
              {{ formatOrderSource(detailDrawer.complaint.orderSource) }}
            </el-descriptions-item>
            <el-descriptions-item label="订单编号" :span="2">
              {{ detailDrawer.complaint.orderNo || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="是否代下单">
              <el-tag v-if="detailDrawer.complaint.isProxyOrder" type="warning" size="small">是</el-tag>
              <span v-else>否</span>
            </el-descriptions-item>
            <el-descriptions-item label="客户姓名">
              {{ detailDrawer.complaint.contactName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="客户联系电话">
              {{ detailDrawer.complaint.contactPhone || '—' }}
            </el-descriptions-item>
            <template v-if="detailDrawer.complaint.isProxyOrder">
              <el-descriptions-item label="被服务人姓名">
                {{ detailDrawer.complaint.serviceContactName || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="被服务人联系方式">
                {{ detailDrawer.complaint.serviceContactPhone || '—' }}
              </el-descriptions-item>
            </template>
            <el-descriptions-item v-if="detailDrawer.complaint.serviceAddress" label="服务地址" :span="2">
              {{ detailDrawer.complaint.serviceAddress }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detailDrawer.complaint.remark" label="备注信息" :span="2">
              {{ detailDrawer.complaint.remark }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 投诉内容 -->
        <el-card shadow="never" class="detail-section">
          <template #header><span class="section-title">投诉内容</span></template>
          <div class="complaint-reason">
            <span class="reason-label">投诉原因：</span>
            <el-tag type="danger" size="small">{{ reasonLabel(detailDrawer.complaint.reason) }}</el-tag>
          </div>
          <p class="complaint-description">{{ detailDrawer.complaint.description }}</p>
          <div v-if="detailDrawer.complaint.evidenceImages?.length" class="evidence-grid">
            <el-image
              v-for="(img, idx) in detailDrawer.complaint.evidenceImages"
              :key="idx"
              :src="img"
              :preview-src-list="detailDrawer.complaint.evidenceImages"
              :initial-index="idx"
              class="evidence-img"
              fit="cover"
              preview-teleported
            />
          </div>
        </el-card>

        <!-- 服务进度时间轴 -->
        <el-card shadow="never" class="detail-section">
          <template #header><span class="section-title">服务进度</span></template>
          <el-timeline>
            <!-- 已投诉节点 -->
            <el-timeline-item type="success" size="large">
              <div class="timeline-label timeline-done">已投诉</div>
              <div class="timeline-meta">{{ formatDateTime(detailDrawer.complaint.createdAt) }}</div>
              <div class="timeline-content">用户已投诉，详情见投诉内容</div>
            </el-timeline-item>

            <!-- 跟进记录节点 -->
            <el-timeline-item
              v-for="(fu, idx) in detailDrawer.complaint.followUps"
              :key="fu.id"
              :type="idx === detailDrawer.complaint.followUps.length - 1 && detailDrawer.complaint.status !== 'COMPLETED' ? 'primary' : 'success'"
              size="large"
            >
              <div
                class="timeline-label"
                :class="{
                  'timeline-active': idx === detailDrawer.complaint.followUps.length - 1 && detailDrawer.complaint.status !== 'COMPLETED',
                  'timeline-done': detailDrawer.complaint.status === 'COMPLETED' || idx < detailDrawer.complaint.followUps.length - 1,
                }"
              >
                跟进中
              </div>
              <div class="timeline-meta">{{ fu.handlerName }} · {{ formatDateTime(fu.createdAt) }}</div>
              <div class="timeline-content">{{ fu.content }}</div>
            </el-timeline-item>

            <!-- 已完成节点 -->
            <el-timeline-item
              v-if="detailDrawer.complaint.status === 'COMPLETED'"
              type="success"
              size="large"
            >
              <div class="timeline-label timeline-done">已完成</div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- 处理跟进录入区（非 COMPLETED 时显示） -->
        <el-card
          v-if="detailDrawer.complaint.status !== 'COMPLETED'"
          shadow="never"
          class="detail-section followup-input-card"
        >
          <template #header><span class="section-title">处理跟进</span></template>
          <el-form
            ref="followUpFormRef"
            :model="followUpForm"
            :rules="followUpRules"
            label-position="top"
          >
            <el-form-item label="处理人" prop="handlerName">
              <el-input
                v-model="followUpForm.handlerName"
                placeholder="请输入处理人姓名"
              />
            </el-form-item>
            <el-form-item label="跟进内容" prop="content">
              <el-input
                v-model="followUpForm.content"
                type="textarea"
                :rows="4"
                placeholder="在此录入与客户的沟通结果、方案或备注……"
              />
            </el-form-item>
          </el-form>

          <div class="followup-actions">
            <el-button
              type="primary"
              :loading="detailDrawer.submittingFollowUp"
              @click="submitFollowUp"
            >提交</el-button>
            <el-button
              type="success"
              :loading="detailDrawer.completing"
              @click="completeComplaint"
            >结束</el-button>
          </div>
        </el-card>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { Search, Loading } from '@element-plus/icons-vue';

import {
  fetchComplaints,
  fetchComplaintDetail,
  updateComplaintStatus,
  addComplaintFollowUp,
  type ComplaintStatus,
  type ComplaintItem,
  type ComplaintDetail,
} from '@/api/complaint';

// ─── 状态 Tab ─────────────────────────────────────────────────────────────────

type TabValue = ComplaintStatus | '';

const STATUS_TABS: { label: string; value: TabValue }[] = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'PENDING' },
  { label: '跟进中', value: 'PROCESSING' },
  { label: '已完成', value: 'COMPLETED' },
];

// ─── 列表数据 ─────────────────────────────────────────────────────────────────

const tableLoading = ref(false);
const complaints = ref<ComplaintItem[]>([]);
const total = ref(0);
const keyword = ref('');

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  status: '' as TabValue,
  contactPhone: '',
});

const loadComplaints = async () => {
  tableLoading.value = true;
  try {
    const params: Record<string, unknown> = {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    };
    if (queryParams.status) params.status = queryParams.status;
    if (keyword.value.trim()) params.keyword = keyword.value.trim();
    if (queryParams.contactPhone.trim()) params.contactPhone = queryParams.contactPhone.trim();

    const res = await fetchComplaints(params as Parameters<typeof fetchComplaints>[0]);
    complaints.value = res.data.data?.items ?? [];
    total.value = res.data.data?.total ?? 0;
    console.info('[Complaints] loaded', complaints.value.length, 'items, total=', total.value);
  } catch (e) {
    console.error('[Complaints] load failed', e);
  } finally {
    tableLoading.value = false;
  }
};

const onStatusTabClick = (val: TabValue) => {
  queryParams.status = val;
  queryParams.page = 1;
  loadComplaints();
};

const onSearch = () => {
  queryParams.page = 1;
  loadComplaints();
};

const onReset = () => {
  keyword.value = '';
  queryParams.status = '';
  queryParams.page = 1;
  queryParams.contactPhone = '';
  loadComplaints();
};

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

const STATUS_LABEL_MAP: Record<ComplaintStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '跟进中',
  COMPLETED: '已完成',
};

const statusLabel = (s: ComplaintStatus): string => STATUS_LABEL_MAP[s] ?? s;

const statusTagType = (s: ComplaintStatus): '' | 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<ComplaintStatus, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    PENDING: 'warning',
    PROCESSING: '',
    COMPLETED: 'success',
  };
  return map[s] ?? '';
};

const REASON_LABEL_MAP: Record<string, string> = {
  POOR_ATTITUDE: '服务态度差',
  NOT_CLEAN: '清洁不达标',
  NOT_ON_TIME: '未按时到达',
  ITEM_DAMAGED: '物品损坏',
  EXTRA_CHARGE: '乱收费',
  OTHER: '其他',
};

const reasonLabel = (r: string): string => REASON_LABEL_MAP[r] ?? r;

const formatOrderSource = (source: string | null | undefined): string => {
  if (!source) return '—';
  if (source === 'PHONE') return '电话预约';
  if (source === 'MINIAPP') return '小程序';
  return source;
};

const formatDateTime = (iso: string | undefined): string => {
  if (!iso) return '—';
  return iso.replace('T', ' ').slice(0, 16);
};

const copyPhone = async (phone: string) => {
  try {
    await navigator.clipboard.writeText(phone);
    ElMessage.success(`已复制电话：${phone}`);
  } catch {
    ElMessage.info(`联系电话：${phone}`);
  }
};

// ─── 投诉详情抽屉 ─────────────────────────────────────────────────────────────

const detailDrawer = reactive<{
  visible: boolean;
  loading: boolean;
  complaint: ComplaintDetail | null;
  submittingFollowUp: boolean;
  completing: boolean;
}>({
  visible: false,
  loading: false,
  complaint: null,
  submittingFollowUp: false,
  completing: false,
});

const followUpFormRef = ref<FormInstance>();

const followUpForm = reactive({
  handlerName: '',
  content: '',
});

const followUpRules = {
  handlerName: [{ required: true, message: '请输入处理人姓名', trigger: 'blur' }],
  content: [{ required: true, message: '请填写跟进内容', trigger: 'blur' }],
};

const openDetail = async (row: ComplaintItem) => {
  detailDrawer.visible = true;
  detailDrawer.loading = true;
  detailDrawer.complaint = null;
  followUpForm.handlerName = '';
  followUpForm.content = '';

  try {
    const res = await fetchComplaintDetail(row.id);
    detailDrawer.complaint = res.data.data;
    console.info('[Complaints] detail loaded for', row.complaintNo);
  } catch (e) {
    console.error('[Complaints] detail load failed', e);
    detailDrawer.visible = false;
  } finally {
    detailDrawer.loading = false;
  }
};

const reloadDetail = async () => {
  if (!detailDrawer.complaint) return;
  try {
    const res = await fetchComplaintDetail(detailDrawer.complaint.id);
    detailDrawer.complaint = res.data.data;
  } catch (e) {
    console.warn('[Complaints] reload detail failed', e);
  }
};

const submitFollowUp = async () => {
  const valid = await followUpFormRef.value?.validate().catch(() => false);
  if (!valid || !detailDrawer.complaint) return;

  detailDrawer.submittingFollowUp = true;
  try {
    await addComplaintFollowUp(detailDrawer.complaint.id, {
      handlerName: followUpForm.handlerName.trim(),
      content: followUpForm.content.trim(),
    });

    // PENDING → PROCESSING 自动推进
    if (detailDrawer.complaint.status === 'PENDING') {
      await updateComplaintStatus(detailDrawer.complaint.id, {
        status: 'PROCESSING',
        operatorName: followUpForm.handlerName.trim(),
      });
    }

    ElMessage.success('跟进记录已提交');
    followUpForm.handlerName = '';
    followUpForm.content = '';
    await reloadDetail();
    loadComplaints();
  } catch (e) {
    console.error('[Complaints] submit follow-up failed', e);
  } finally {
    detailDrawer.submittingFollowUp = false;
  }
};

const completeComplaint = async () => {
  if (!detailDrawer.complaint) return;

  try {
    await ElMessageBox.confirm('确认将此投诉标记为已完成？', '完成确认', {
      confirmButtonText: '确认完成',
      cancelButtonText: '取消',
      type: 'info',
    });
  } catch {
    return;
  }

  detailDrawer.completing = true;
  try {
    await updateComplaintStatus(detailDrawer.complaint.id, {
      status: 'COMPLETED',
      operatorName: '管理员',
    });
    ElMessage.success('投诉已完成');
    await reloadDetail();
    loadComplaints();
  } catch (e) {
    console.error('[Complaints] complete failed', e);
  } finally {
    detailDrawer.completing = false;
  }
};

// ─── 初始化 ───────────────────────────────────────────────────────────────────

const route = useRoute();

onMounted(() => {
  // P5.12 首页待办卡片跳转预置状态筛选（如 /orders/complaint?status=PENDING）
  const statusFromQuery = route.query.status as string | undefined;
  if (statusFromQuery) {
    queryParams.status = statusFromQuery as TabValue;
  }
  loadComplaints();
});
</script>

<style scoped lang="scss">
.complaint-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// ── 筛选卡 ────────────────────────────────────────────────────────────────────

.filter-card {
  .status-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    border-bottom: 1px solid #e4e7ed;
    margin-bottom: 16px;
  }

  .status-tab {
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #606266;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;

    &:hover {
      color: #409eff;
    }

    &--active {
      color: #409eff;
      border-bottom-color: #409eff;
      font-weight: 500;
    }
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}

// ── 表格卡 ────────────────────────────────────────────────────────────────────

.table-card {
  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}

.text-gray {
  color: #c0c4cc;
}

// ── 详情抽屉 ──────────────────────────────────────────────────────────────────

.drawer-loading {
  display: flex;
  justify-content: center;
  padding: 40px;
  color: #909399;
}

.detail-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .detail-order-no {
    font-size: 13px;
    color: #606266;
  }
}

.detail-section {
  margin-bottom: 12px;

  .section-title {
    font-weight: 600;
    font-size: 14px;
    color: #303133;
  }
}

// ── 投诉内容 ──────────────────────────────────────────────────────────────────

.complaint-reason {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;

  .reason-label {
    font-size: 13px;
    color: #606266;
  }
}

.complaint-description {
  font-size: 13px;
  color: #303133;
  line-height: 1.7;
  white-space: pre-wrap;
  margin: 0 0 12px;
}

.evidence-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .evidence-img {
    width: 80px;
    height: 80px;
    border-radius: 4px;
    border: 1px solid #e4e7ed;
    cursor: pointer;
  }
}

// ── 时间轴 ────────────────────────────────────────────────────────────────────

.timeline-label {
  font-size: 13px;
  font-weight: 500;
  color: #909399;

  &.timeline-active {
    color: #409eff;
    font-weight: 600;
  }

  &.timeline-done {
    color: #67c23a;
    font-weight: 600;
  }
}

.timeline-meta {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 2px;
}

.timeline-content {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}

// ── 跟进录入区 ────────────────────────────────────────────────────────────────

.followup-input-card {
  background: #fafafa;
}

.followup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
