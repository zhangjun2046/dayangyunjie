<template>
  <div class="consult-page">
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
          placeholder="搜索订单号、客户姓名"
          clearable
          style="width: 220px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-input
          v-model="queryParams.contactPhone"
          placeholder="客户联系方式"
          clearable
          style="width: 180px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button type="primary" class="btn-add" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>新增订单
        </el-button>
      </div>
    </el-card>

    <!-- ── 数据表格 ─────────────────────────────────────────────────────────── -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="tableLoading"
        :data="filteredOrders"
        stripe
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="订单编号" prop="orderNo" width="200" />
        <el-table-column label="客户姓名" width="100">
          <template #default="{ row }">
            {{ row.contactName || row.resident?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="客户联系方式" width="130">
          <template #default="{ row }">
            {{ row.contactPhone || row.resident?.phone || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="是否代下单" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isProxyOrder" type="warning" size="small">代下单</el-tag>
            <span v-else class="text-gray">否</span>
          </template>
        </el-table-column>
        <el-table-column label="被服务人" width="100">
          <template #default="{ row }">
            <span v-if="row.isProxyOrder">{{ row.serviceContactName || '—' }}</span>
            <span v-else class="text-gray">—</span>
          </template>
        </el-table-column>
        <el-table-column label="被服务人联系方式" width="140">
          <template #default="{ row }">
            <span v-if="row.isProxyOrder">{{ row.serviceContactPhone || '—' }}</span>
            <span v-else class="text-gray">—</span>
          </template>
        </el-table-column>
        <el-table-column label="服务类型" prop="serviceType" width="120" />
        <el-table-column label="服务地址" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.serviceAddress || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="跟进状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
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
          @size-change="loadOrders"
          @current-change="loadOrders"
        />
      </div>
    </el-card>

    <!-- ── 新增咨询单弹窗 ────────────────────────────────────────────────────── -->
    <el-dialog
      v-model="createDialog.visible"
      title="新增订单"
      width="700px"
      :close-on-click-modal="false"
      @close="resetCreateForm"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="130px"
        label-position="right"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="服务类型" prop="serviceType" required>
              <el-select
                v-model="createForm.serviceType"
                placeholder="请选择服务类型"
                style="width: 100%"
              >
                <el-option
                  v-for="item in catalogItems"
                  :key="item.id"
                  :label="item.name"
                  :value="item.name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户信息" prop="contactName" required>
              <el-input v-model="createForm.contactName" placeholder="请输入客户姓名" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户联系方式" prop="contactPhone" required>
              <el-input v-model="createForm.contactPhone" placeholder="请输入客户联系方式" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否代下单" prop="isProxyOrder" required>
              <el-select
                v-model="createForm.isProxyOrder"
                placeholder="请选择是否代下单"
                style="width: 100%"
              >
                <el-option label="否" :value="false" />
                <el-option label="是" :value="true" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row v-if="createForm.isProxyOrder" :gutter="16">
          <el-col :span="12">
            <el-form-item label="被服务人姓名" prop="serviceContactName" required>
              <el-input v-model="createForm.serviceContactName" placeholder="请输入被服务人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="被服务人电话" prop="serviceContactPhone" required>
              <el-input v-model="createForm.serviceContactPhone" placeholder="请输入被服务人电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="服务地址">
          <el-input v-model="createForm.serviceAddress" placeholder="请输入服务地址（可选）" />
        </el-form-item>

        <el-form-item label="订单来源">
          <el-input model-value="电话预约" disabled />
        </el-form-item>

        <el-form-item label="核心诉求" prop="requirementDesc" required>
          <el-input
            v-model="createForm.requirementDesc"
            type="textarea"
            :rows="4"
            placeholder="请填写客户的核心诉求"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="createForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请填写备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="createDialog.submitting"
          @click="submitCreate"
        >完成</el-button>
      </template>
    </el-dialog>

    <!-- ── 订单详情抽屉 ──────────────────────────────────────────────────────── -->
    <el-drawer
      v-model="detailDrawer.visible"
      title="订单详情"
      size="620px"
      direction="rtl"
    >
      <div v-if="detailDrawer.loading" class="drawer-loading">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      </div>

      <template v-else-if="detailDrawer.order">
        <!-- 状态标签 + 订单编号 -->
        <div class="detail-status-bar">
          <span class="detail-order-no">订单编号：{{ detailDrawer.order.orderNo }}</span>
          <el-tag :type="statusTagType(detailDrawer.order.status)">
            {{ statusLabel(detailDrawer.order.status) }}
          </el-tag>
        </div>

        <!-- 订单信息 -->
        <el-card shadow="never" class="detail-section">
          <template #header><span class="section-title">订单信息</span></template>
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="服务类型">{{ detailDrawer.order.serviceType }}</el-descriptions-item>
            <el-descriptions-item label="订单来源">
              {{ detailDrawer.order.source === 'PHONE' ? '电话预约' : '小程序' }}
            </el-descriptions-item>
            <el-descriptions-item label="是否代下单">
              <el-tag v-if="detailDrawer.order.isProxyOrder" type="warning" size="small">是</el-tag>
              <span v-else>否</span>
            </el-descriptions-item>
            <el-descriptions-item label="客户姓名">
              {{ detailDrawer.order.contactName || detailDrawer.order.resident?.name || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="客户电话">
              {{ detailDrawer.order.contactPhone || detailDrawer.order.resident?.phone || '—' }}
            </el-descriptions-item>
            <template v-if="detailDrawer.order.isProxyOrder">
              <el-descriptions-item label="被服务人姓名">
                {{ detailDrawer.order.serviceContactName || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="被服务人电话">
                {{ detailDrawer.order.serviceContactPhone || '—' }}
              </el-descriptions-item>
            </template>
            <el-descriptions-item v-if="detailDrawer.order.serviceAddress" label="服务地址" :span="2">
              {{ detailDrawer.order.serviceAddress }}
            </el-descriptions-item>
            <el-descriptions-item label="核心诉求" :span="2">
              {{ detailDrawer.order.requirementDesc || '—' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detailDrawer.order.remark" label="备注信息" :span="2">
              {{ detailDrawer.order.remark }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 服务进度时间轴 -->
        <el-card shadow="never" class="detail-section">
          <template #header><span class="section-title">服务进度</span></template>
          <el-timeline>
            <!-- 初始节点：已预约 -->
            <el-timeline-item type="success" size="large">
              <div class="timeline-label timeline-done">已预约</div>
              <div class="timeline-meta">{{ formatDateTime(detailDrawer.order.createdAt) }}</div>
              <div class="timeline-content">{{ detailDrawer.order.requirementDesc }}</div>
            </el-timeline-item>

            <!-- 跟进记录节点 -->
            <el-timeline-item
              v-for="(fu, idx) in detailFollowUps"
              :key="fu.id"
              :type="idx === detailFollowUps.length - 1 && detailDrawer.order.status !== 'COMPLETED' ? 'primary' : 'success'"
              size="large"
            >
              <div
                class="timeline-label"
                :class="{
                  'timeline-active': idx === detailFollowUps.length - 1 && detailDrawer.order.status !== 'COMPLETED',
                  'timeline-done': detailDrawer.order.status === 'COMPLETED' || idx < detailFollowUps.length - 1,
                }"
              >
                跟进中
              </div>
              <div class="timeline-meta">{{ fu.handlerName }} · {{ formatDateTime(fu.createdAt) }}</div>
              <div class="timeline-content">{{ fu.content }}</div>
            </el-timeline-item>

            <!-- 已完成节点 -->
            <el-timeline-item
              v-if="detailDrawer.order.status === 'COMPLETED'"
              type="success"
              size="large"
            >
              <div class="timeline-label timeline-done">已完成</div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- 跟进录入区（非 COMPLETED 时显示） -->
        <el-card
          v-if="detailDrawer.order.status !== 'COMPLETED'"
          shadow="never"
          class="detail-section followup-input-card"
        >
          <template #header><span class="section-title">跟进内容</span></template>
          <el-form ref="followUpFormRef" :model="followUpForm" :rules="followUpRules" label-position="top">
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
                placeholder="请填写跟进内容，如联系情况、客户要求、派工安排等"
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
              @click="completeOrder"
            >完成</el-button>
          </div>
        </el-card>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { Search, Plus, Loading } from '@element-plus/icons-vue';

import {
  fetchConsultOrders,
  fetchConsultOrderDetail,
  createConsultOrder,
  updateConsultStatus,
  fetchConsultFollowUps,
  createConsultFollowUp,
  type ConsultOrderStatus,
  type ConsultOrderItem,
  type ConsultOrderDetail,
  type ConsultFollowUp,
  type CreateConsultOrderDto,
} from '@/api/consult';
import { fetchServiceCatalogs, type ServiceCatalogItem } from '@/api/service-catalog';

// ─── 状态 Tab ─────────────────────────────────────────────────────────────────

type TabValue = ConsultOrderStatus | '';

const STATUS_TABS: { label: string; value: TabValue }[] = [
  { label: '全部', value: '' },
  { label: '待跟进', value: 'FOLLOW_UP' },
  { label: '跟进中', value: 'FOLLOWING' },
  { label: '已完成', value: 'COMPLETED' },
];

// ─── 列表数据 ─────────────────────────────────────────────────────────────────

const tableLoading = ref(false);
const orders = ref<ConsultOrderItem[]>([]);
const total = ref(0);
const keyword = ref('');

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  status: '' as TabValue,
  contactPhone: '',
});

const filteredOrders = computed(() => {
  let result = orders.value;
  const kw = keyword.value.trim().toLowerCase();
  if (kw) {
    result = result.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(kw) ||
        (o.contactName || '').toLowerCase().includes(kw) ||
        (o.resident?.name || '').toLowerCase().includes(kw),
    );
  }
  const phone = queryParams.contactPhone.trim();
  if (phone) {
    result = result.filter(
      (o) =>
        (o.contactPhone || '').includes(phone) ||
        (o.resident?.phone || '').includes(phone),
    );
  }
  return result;
});

const loadOrders = async () => {
  tableLoading.value = true;
  try {
    const params: Record<string, unknown> = {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    };
    if (queryParams.status) params.status = queryParams.status;
    if (keyword.value.trim()) params.keyword = keyword.value.trim();
    if (queryParams.contactPhone.trim()) params.contactPhone = queryParams.contactPhone.trim();

    const res = await fetchConsultOrders(params as Parameters<typeof fetchConsultOrders>[0]);
    orders.value = res.data.data?.items ?? [];
    total.value = res.data.data?.total ?? 0;
    console.info('[ConsultOrders] loaded', orders.value.length, 'orders, total=', total.value, 'params=', params);
  } catch (e) {
    console.error('[ConsultOrders] load failed', e);
  } finally {
    tableLoading.value = false;
  }
};

const onStatusTabClick = (val: TabValue) => {
  queryParams.status = val;
  queryParams.page = 1;
  loadOrders();
};

const onSearch = () => {
  queryParams.page = 1;
  loadOrders();
};

const onReset = () => {
  keyword.value = '';
  queryParams.status = '';
  queryParams.page = 1;
  queryParams.contactPhone = '';
  loadOrders();
};

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

const statusLabelMap: Record<ConsultOrderStatus, string> = {
  FOLLOW_UP: '待跟进',
  FOLLOWING: '跟进中',
  COMPLETED: '已完成',
};

const statusLabel = (status: ConsultOrderStatus) => statusLabelMap[status] ?? status;

const statusTagType = (
  status: ConsultOrderStatus,
): '' | 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<ConsultOrderStatus, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    FOLLOW_UP: 'warning',
    FOLLOWING: '',
    COMPLETED: 'success',
  };
  return map[status] ?? '';
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

// ─── 新增咨询单弹窗 ───────────────────────────────────────────────────────────

const catalogItems = ref<ServiceCatalogItem[]>([]);

const createDialog = reactive({
  visible: false,
  submitting: false,
});

const createFormRef = ref<FormInstance>();

const createForm = reactive<CreateConsultOrderDto & { isProxyOrder: boolean }>({
  serviceType: '',
  requirementDesc: '',
  contactName: '',
  contactPhone: '',
  serviceAddress: '',
  isProxyOrder: false,
  serviceContactName: '',
  serviceContactPhone: '',
  source: 'PHONE',
  remark: '',
});

const createRules = computed(() => ({
  serviceType: [{ required: true, message: '请选择服务类型', trigger: 'change' }],
  contactName: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  contactPhone: [
    { required: true, message: '请输入联系方式', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  isProxyOrder: [{ required: true, message: '请选择是否代下单', trigger: 'change' }],
  serviceContactName: createForm.isProxyOrder
    ? [{ required: true, message: '请输入被服务人姓名', trigger: 'blur' }]
    : [],
  serviceContactPhone: createForm.isProxyOrder
    ? [
        { required: true, message: '请输入被服务人电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
      ]
    : [],
  requirementDesc: [{ required: true, message: '请填写核心诉求', trigger: 'blur' }],
}));

const openCreateDialog = async () => {
  createDialog.visible = true;
  if (catalogItems.value.length === 0) {
    try {
      const res = await fetchServiceCatalogs({ bizType: 'CONSULT', isEnabled: true, pageSize: 50 });
      catalogItems.value = res.data.data?.items ?? [];
    } catch (e) {
      console.error('[ConsultOrders] load catalogs failed', e);
    }
  }
};

const resetCreateForm = () => {
  createFormRef.value?.resetFields();
  Object.assign(createForm, {
    serviceType: '',
    requirementDesc: '',
    contactName: '',
    contactPhone: '',
    serviceAddress: '',
    isProxyOrder: false,
    serviceContactName: '',
    serviceContactPhone: '',
    source: 'PHONE',
    remark: '',
  });
};

const submitCreate = async () => {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  createDialog.submitting = true;
  try {
    const payload: CreateConsultOrderDto = {
      serviceType: createForm.serviceType,
      requirementDesc: createForm.requirementDesc.trim(),
      contactName: createForm.contactName.trim(),
      contactPhone: createForm.contactPhone.trim(),
      source: 'PHONE',
      isProxyOrder: createForm.isProxyOrder,
    };
    if (createForm.serviceAddress?.trim()) {
      payload.serviceAddress = createForm.serviceAddress.trim();
    }
    if (createForm.remark?.trim()) {
      payload.remark = createForm.remark.trim();
    }
    if (createForm.isProxyOrder) {
      payload.serviceContactName = createForm.serviceContactName?.trim();
      payload.serviceContactPhone = createForm.serviceContactPhone?.trim();
    }

    await createConsultOrder(payload);
    ElMessage.success('咨询单创建成功');
    createDialog.visible = false;
    loadOrders();
  } catch (e) {
    console.error('[ConsultOrders] create failed', e);
  } finally {
    createDialog.submitting = false;
  }
};

// ─── 订单详情抽屉 ─────────────────────────────────────────────────────────────

const detailFollowUps = ref<ConsultFollowUp[]>([]);

const detailDrawer = reactive<{
  visible: boolean;
  loading: boolean;
  order: ConsultOrderDetail | null;
  submittingFollowUp: boolean;
  completing: boolean;
}>({
  visible: false,
  loading: false,
  order: null,
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

const loadFollowUps = async (orderId: number) => {
  try {
    const res = await fetchConsultFollowUps(orderId, { pageSize: 100 });
    detailFollowUps.value = res.data.data?.items ?? [];
    console.info('[ConsultOrders] follow-ups loaded', detailFollowUps.value.length, 'records');
  } catch (e) {
    console.warn('[ConsultOrders] follow-ups load failed', e);
    detailFollowUps.value = [];
  }
};

const openDetail = async (row: ConsultOrderItem) => {
  detailDrawer.visible = true;
  detailDrawer.loading = true;
  detailDrawer.order = null;
  detailFollowUps.value = [];
  followUpForm.handlerName = '';
  followUpForm.content = '';

  try {
    const res = await fetchConsultOrderDetail(row.id);
    detailDrawer.order = res.data.data;
    console.info('[ConsultOrders] detail loaded for', row.orderNo);
    await loadFollowUps(row.id);
  } catch (e) {
    console.error('[ConsultOrders] detail load failed', e);
    detailDrawer.visible = false;
  } finally {
    detailDrawer.loading = false;
  }
};

const submitFollowUp = async () => {
  const valid = await followUpFormRef.value?.validate().catch(() => false);
  if (!valid || !detailDrawer.order) return;

  detailDrawer.submittingFollowUp = true;
  try {
    await createConsultFollowUp(detailDrawer.order.id, {
      handlerName: followUpForm.handlerName.trim(),
      content: followUpForm.content.trim(),
    });

    // 若当前状态为 FOLLOW_UP，自动推进到 FOLLOWING
    if (detailDrawer.order.status === 'FOLLOW_UP') {
      await updateConsultStatus(detailDrawer.order.id, { status: 'FOLLOWING', operatorId: 1 });
    }

    ElMessage.success('跟进记录已提交');
    followUpForm.handlerName = '';
    followUpForm.content = '';

    // 重新加载详情和跟进记录
    const res = await fetchConsultOrderDetail(detailDrawer.order.id);
    detailDrawer.order = res.data.data;
    await loadFollowUps(detailDrawer.order.id);
    loadOrders();
  } catch (e) {
    console.error('[ConsultOrders] submit follow-up failed', e);
  } finally {
    detailDrawer.submittingFollowUp = false;
  }
};

const completeOrder = async () => {
  if (!detailDrawer.order) return;

  try {
    await ElMessageBox.confirm('确认将此咨询单标记为已完成？', '完成确认', {
      confirmButtonText: '确认完成',
      cancelButtonText: '取消',
      type: 'info',
    });
  } catch {
    return;
  }

  detailDrawer.completing = true;
  try {
    await updateConsultStatus(detailDrawer.order.id, { status: 'COMPLETED', operatorId: 1 });
    ElMessage.success('咨询单已完成');

    const res = await fetchConsultOrderDetail(detailDrawer.order.id);
    detailDrawer.order = res.data.data;
    await loadFollowUps(detailDrawer.order.id);
    loadOrders();
  } catch (e) {
    console.error('[ConsultOrders] complete order failed', e);
  } finally {
    detailDrawer.completing = false;
  }
};

// ─── 初始化 ───────────────────────────────────────────────────────────────────

onMounted(() => {
  loadOrders();
});
</script>

<style scoped lang="scss">
.consult-page {
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

    .btn-add {
      margin-left: auto;
    }
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
