<template>
  <div class="cleaning-page">
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
        <el-input
          v-model="queryParams.address"
          placeholder="服务地址"
          clearable
          style="width: 200px"
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
        <el-table-column label="订单编号" prop="orderNo" width="180" />
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
        <el-table-column label="被服务人姓名" width="110">
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
        <el-table-column label="服务类型" prop="serviceItem" width="120" />
        <el-table-column label="是否代下单" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isProxyOrder" type="warning" size="small">代下单</el-tag>
            <span v-else class="text-gray">否</span>
          </template>
        </el-table-column>
        <el-table-column label="服务地址" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatAddress(row.addressSnapshot) }}
          </template>
        </el-table-column>
        <el-table-column label="服务时间" width="180">
          <template #default="{ row }">
            {{ formatAppointTime(row.appointDate, row.appointTimeSlot) }}
          </template>
        </el-table-column>
        <el-table-column label="服务人员" width="100">
          <template #default="{ row }">
            {{ row.worker?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="row.contactPhone"
              link
              type="primary"
              size="small"
              @click="copyPhone(row.contactPhone)"
            >联系客户</el-button>
            <el-button
              v-if="row.status === 'PENDING_ASSIGN'"
              link
              type="success"
              size="small"
              @click="openAssign(row)"
            >分配</el-button>
            <el-button
              v-if="row.status === 'ASSIGNED'"
              link
              type="warning"
              size="small"
              @click="openAssign(row)"
            >改派</el-button>
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

    <!-- ── 分配弹窗 ─────────────────────────────────────────────────────────── -->
    <el-dialog
      v-model="assignDialog.visible"
      :title="assignDialog.mode === 'reassign' ? '改派服务人员' : '分配服务人员'"
      width="760px"
      :close-on-click-modal="false"
    >
      <el-table
        v-loading="assignDialog.loading"
        :data="idleWorkers"
        stripe
        style="width: 100%"
        highlight-current-row
        @current-change="onWorkerSelect"
      >
        <el-table-column label="选择" width="60" align="center">
          <template #default="{ row }">
            <el-radio
              v-model="assignDialog.selectedWorkerId"
              :label="row.id"
              @change="assignDialog.selectedWorkerId = row.id"
            />
          </template>
        </el-table-column>
        <el-table-column label="员工" prop="name" width="100" />
        <el-table-column label="技能" width="120">
          <template #default="{ row }">
            <el-tag
              v-for="skill in (row.skills || []).slice(0, 2)"
              :key="skill"
              size="small"
              style="margin-right: 4px"
            >{{ skill }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'IDLE' ? 'success' : 'warning'" size="small">
              {{ row.status === 'IDLE' ? '空闲' : '服务中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="今日完成" width="90" align="center">
          <template #default="{ row }">{{ row.todayOrders ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="评分" width="120">
          <template #default="{ row }">
            <el-rate
              :model-value="row.rating"
              disabled
              show-score
              text-color="#ff9900"
              style="display: inline-flex"
            />
          </template>
        </el-table-column>
        <el-table-column label="最近接单时间" width="130">
          <template #default>—</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="assignDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="assignDialog.submitting"
          :disabled="!assignDialog.selectedWorkerId"
          @click="submitAssign"
        >确定</el-button>
      </template>
    </el-dialog>

    <!-- ── 新增订单弹窗 ────────────────────────────────────────────────────── -->
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
            <el-form-item label="服务类型" prop="serviceItem" required>
              <el-select
                v-model="createForm.serviceItem"
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
              <el-input v-model="createForm.serviceContactPhone" placeholder="请选择服务类型" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="地址" prop="addressSnapshotText" required>
          <el-input v-model="createForm.addressSnapshotText" placeholder="请输入详细地址" />
        </el-form-item>

        <el-form-item label="服务时间" prop="appointDate" required>
          <el-date-picker
            v-model="createForm.appointDate"
            type="date"
            placeholder="请选择服务时间"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="服务时长" prop="serviceDuration" required>
          <div class="duration-stepper">
            <el-button
              :disabled="createForm.serviceDuration <= 1"
              circle
              size="small"
              @click="createForm.serviceDuration = Math.max(1, createForm.serviceDuration - 1)"
            >-</el-button>
            <span class="duration-value">{{ createForm.serviceDuration }} 小时</span>
            <el-button
              :disabled="createForm.serviceDuration >= 8"
              circle
              size="small"
              @click="createForm.serviceDuration = Math.min(8, createForm.serviceDuration + 1)"
            >+</el-button>
          </div>
        </el-form-item>

        <el-form-item label="服务时段" prop="appointTimeSlot" required>
          <div class="time-slot-grid">
            <span
              v-for="t in TIME_SLOTS"
              :key="t"
              class="time-slot-btn"
              :class="{ 'time-slot-btn--active': createForm.appointTimeSlot === t }"
              @click="createForm.appointTimeSlot = t"
            >{{ t }}</span>
          </div>
        </el-form-item>

        <el-form-item label="订单来源">
          <el-input model-value="电话预约" disabled />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="createForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请填写特殊要求"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="createDialog.submitting"
          @click="submitCreate"
        >提交</el-button>
      </template>
    </el-dialog>

    <!-- ── 订单详情抽屉 ──────────────────────────────────────────────────────── -->
    <el-drawer
      v-model="detailDrawer.visible"
      :title="`订单详情`"
      size="520px"
      direction="rtl"
    >
      <div v-if="detailDrawer.loading" class="drawer-loading">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      </div>

      <template v-else-if="detailDrawer.order">
        <!-- 状态标签 -->
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
            <el-descriptions-item label="服务类型">{{ detailDrawer.order.serviceItem }}</el-descriptions-item>
            <el-descriptions-item label="订单来源">{{ detailDrawer.order.source === 'PHONE' ? '电话预约' : '小程序' }}</el-descriptions-item>
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
              <el-descriptions-item label="被服务人姓名">{{ detailDrawer.order.serviceContactName || '—' }}</el-descriptions-item>
              <el-descriptions-item label="被服务人电话">{{ detailDrawer.order.serviceContactPhone || '—' }}</el-descriptions-item>
            </template>
            <el-descriptions-item label="服务时间" :span="2">
              {{ formatAppointTime(detailDrawer.order.appointDate, detailDrawer.order.appointTimeSlot) }}
            </el-descriptions-item>
            <el-descriptions-item label="服务地址" :span="2">
              {{ formatAddress(detailDrawer.order.addressSnapshot) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detailDrawer.order.remark" label="备注信息" :span="2">
              {{ detailDrawer.order.remark }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 服务人员 -->
        <el-card shadow="never" class="detail-section">
          <template #header><span class="section-title">服务人员</span></template>
          <div v-if="detailDrawer.order.worker" class="worker-info">
            <span>服务人员：{{ detailDrawer.order.worker.name }}</span>
            <span style="margin-left: 24px">服务人员联系电话：{{ detailDrawer.order.worker.phone }}</span>
          </div>
          <div v-else class="text-gray pending-assign-tip">等待平台为客户分配服务人员</div>
        </el-card>

        <!-- 服务进度时间轴 -->
        <el-card shadow="never" class="detail-section">
          <template #header><span class="section-title">服务进度</span></template>
          <el-timeline>
            <el-timeline-item
              v-for="node in detailDrawer.order.progress"
              :key="node.eventKey ?? node.status"
              :type="node.state === 'done' ? 'success' : node.state === 'current' ? 'primary' : 'info'"
              :hollow="node.state === 'current'"
              :timestamp="node.operatedAt ? formatProgressTime(node.operatedAt) : undefined"
              size="large"
            >
              <div class="timeline-label" :class="{ 'timeline-active': node.state === 'current' }">
                {{ node.label }}
              </div>
              <div v-if="node.message" class="text-gray">{{ node.message }}</div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- 作业记录 -->
        <el-card
          v-if="(detailDrawer.order.workPhotos?.length ?? 0) > 0"
          shadow="never"
          class="detail-section"
        >
          <template #header><span class="section-title">作业记录</span></template>
          <div
            v-for="group in photoGroups"
            :key="group.type"
            class="photo-group"
          >
            <div class="photo-group-title">{{ group.label }}</div>
            <div class="photo-grid">
              <el-image
                v-for="(photo, idx) in group.photos"
                :key="photo.id"
                :src="photo.url"
                :preview-src-list="group.photos.map(p => p.url)"
                :initial-index="idx"
                fit="cover"
                class="photo-thumb"
              />
            </div>
          </div>
        </el-card>

        <!-- 用户评价（REVIEWED 状态） -->
        <el-card
          v-if="detailDrawer.order.status === 'REVIEWED' && detailDrawer.review"
          shadow="never"
          class="detail-section"
        >
          <template #header><span class="section-title">用户评价</span></template>
          <div class="review-content">
            <el-rate :model-value="detailDrawer.review.rating" disabled show-score text-color="#ff9900" />
            <div v-if="detailDrawer.review.tags?.length" class="review-tags">
              <el-tag
                v-for="tag in detailDrawer.review.tags"
                :key="tag"
                size="small"
                style="margin: 2px 4px 2px 0"
              >{{ tag }}</el-tag>
            </div>
            <div v-if="detailDrawer.review.content" class="review-text">
              {{ detailDrawer.review.content }}
            </div>
            <div
              v-if="detailDrawer.review.images?.length"
              class="photo-grid"
              style="margin-top: 8px"
            >
              <el-image
                v-for="(img, idx) in detailDrawer.review.images"
                :key="img"
                :src="img"
                :preview-src-list="detailDrawer.review.images"
                :initial-index="idx"
                fit="cover"
                class="photo-thumb"
              />
            </div>
          </div>
        </el-card>

        <!-- 详情抽屉操作按钮 -->
        <div v-if="['PENDING_ASSIGN', 'ASSIGNED'].includes(detailDrawer.order.status)" class="drawer-footer">
          <el-button type="primary" @click="openAssignFromDetail">
            {{ detailDrawer.order.status === 'ASSIGNED' ? '改派服务人员' : '分配服务人员' }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { Search, Plus, Loading } from '@element-plus/icons-vue';

import {
  fetchCleaningOrders,
  fetchCleaningOrderDetail,
  createCleaningOrder,
  assignCleaningOrder,
  reassignCleaningOrder,
  fetchOrderReview,
  type AddressSnapshot,
  type CleaningOrderItem,
  type CleaningOrderDetail,
  type ReviewDto,
  type CleaningOrderStatus,
  type CreateCleaningOrderDto,
} from '@/api/cleaning';
import { fetchWorkers, type WorkerListItem } from '@/api/worker';
import { fetchServiceCatalogs, type ServiceCatalogItem } from '@/api/service-catalog';
import { useUserStore } from '@/store';

// ─── 状态 Tab ─────────────────────────────────────────────────────────────────

type TabValue = CleaningOrderStatus | '';

const STATUS_TABS: { label: string; value: TabValue }[] = [
  { label: '全部', value: '' },
  { label: '待派单', value: 'PENDING_ASSIGN' },
  { label: '已派单', value: 'ASSIGNED' },
  { label: '已接单', value: 'ACCEPTED' },
  { label: '服务中', value: 'IN_SERVICE' },
  { label: '待评价', value: 'PENDING_REVIEW' },
  { label: '已评价', value: 'REVIEWED' },
  { label: '已取消', value: 'CANCELLED' },
];

// ─── 新增订单：可选开始时间（与小程序 TIME_SLOTS 完全一致） ─────────────────────
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

// ─── 列表数据 ─────────────────────────────────────────────────────────────────

const tableLoading = ref(false);
const userStore = useUserStore();
const orders = ref<CleaningOrderItem[]>([]);
const total = ref(0);
const keyword = ref('');

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  status: '' as TabValue,
  contactPhone: '',
  address: '',
});

/** 前端多条件过滤（状态过滤走 API，其余条件在当前页本地过滤兜底） */
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

  const addr = queryParams.address.trim().toLowerCase();
  if (addr) {
    result = result.filter((o) => {
      const snap = o.addressSnapshot;
      if (!snap) return false;
      const addrStr =
        typeof snap === 'string'
          ? snap
          : [snap.province, snap.city, snap.district, snap.detail, snap.buildingInfo]
              .filter(Boolean)
              .join('');
      return addrStr.toLowerCase().includes(addr);
    });
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
    if (queryParams.address.trim()) params.address = queryParams.address.trim();

    const res = await fetchCleaningOrders(params as Parameters<typeof fetchCleaningOrders>[0]);
    orders.value = res.data.data?.items ?? [];
    total.value = res.data.data?.total ?? 0;
    console.info('[CleaningOrders] loaded', orders.value.length, 'orders, total=', total.value, 'params=', params);
  } catch (e) {
    console.error('[CleaningOrders] load failed', e);
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
  queryParams.address = '';
  loadOrders();
};

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

const statusLabelMap: Record<CleaningOrderStatus, string> = {
  PENDING_ASSIGN: '待派单',
  ASSIGNED: '已派单',
  ACCEPTED: '已接单',
  IN_SERVICE: '服务中',
  PENDING_REVIEW: '待评价',
  REVIEWED: '已评价',
  CANCELLED: '已取消',
};

const statusLabel = (status: CleaningOrderStatus) => statusLabelMap[status] ?? status;

const statusTagType = (
  status: CleaningOrderStatus,
): '' | 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<CleaningOrderStatus, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    PENDING_ASSIGN: 'warning',
    ASSIGNED: '',
    ACCEPTED: '',
    IN_SERVICE: 'success',
    PENDING_REVIEW: '',
    REVIEWED: 'success',
    CANCELLED: 'info',
  };
  return map[status] ?? '';
};

const formatAddress = (snapshot: AddressSnapshot | string | null | undefined): string => {
  if (!snapshot) return '—';
  const obj: AddressSnapshot = typeof snapshot === 'string' ? (() => { try { return JSON.parse(snapshot); } catch { return {}; } })() : snapshot;
  return [obj.province, obj.city, obj.district, obj.detail, obj.buildingInfo]
    .filter(Boolean)
    .join('') || '—';
};

const formatAppointTime = (
  appointDate: string | undefined,
  appointTimeSlot: string | undefined,
): string => {
  if (!appointDate) return '—';
  const date = appointDate.slice(0, 10);
  return appointTimeSlot ? `${date} ${appointTimeSlot}` : date;
};

const copyPhone = async (phone: string) => {
  try {
    await navigator.clipboard.writeText(phone);
    ElMessage.success(`已复制电话：${phone}`);
  } catch {
    ElMessage.info(`联系电话：${phone}`);
  }
};

const formatProgressTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${beijing.getUTCFullYear()}-${pad(beijing.getUTCMonth() + 1)}-${pad(beijing.getUTCDate())} ${pad(beijing.getUTCHours())}:${pad(beijing.getUTCMinutes())}:${pad(beijing.getUTCSeconds())}`;
};

// ─── 照片分组 ─────────────────────────────────────────────────────────────────

const photoGroups = computed(() => {
  const photos = detailDrawer.order?.workPhotos ?? [];
  return [
    { type: 'BEFORE', label: '上传打扫前照片', photos: photos.filter((p) => p.photoType === 'BEFORE') },
    { type: 'AFTER', label: '上传打扫后照片', photos: photos.filter((p) => p.photoType === 'AFTER') },
  ].filter((g) => g.photos.length > 0);
});

// ─── 分配弹窗 ─────────────────────────────────────────────────────────────────

const allWorkers = ref<WorkerListItem[]>([]);
const idleWorkers = computed(() =>
  allWorkers.value.filter(
    (w) => w.status === 'IDLE' && w.id !== assignDialog.currentWorkerId,
  ),
);

const assignDialog = reactive({
  visible: false,
  loading: false,
  submitting: false,
  orderId: 0,
  mode: 'assign' as 'assign' | 'reassign',
  currentWorkerId: null as number | null,
  selectedWorkerId: null as number | null,
});

const openAssign = async (row: CleaningOrderItem) => {
  assignDialog.orderId = row.id;
  assignDialog.mode = row.status === 'ASSIGNED' ? 'reassign' : 'assign';
  assignDialog.currentWorkerId = row.worker?.id ?? null;
  assignDialog.selectedWorkerId = null;
  assignDialog.visible = true;
  if (allWorkers.value.length === 0) {
    assignDialog.loading = true;
    try {
      const res = await fetchWorkers({ pageSize: 100 });
      allWorkers.value = res.data.data?.items ?? [];
      console.info('[CleaningOrders] loaded workers', allWorkers.value.length);
    } catch (e) {
      console.error('[CleaningOrders] load workers failed', e);
    } finally {
      assignDialog.loading = false;
    }
  }
};

const onWorkerSelect = (row: WorkerListItem | null) => {
  if (row) assignDialog.selectedWorkerId = row.id;
};

const submitAssign = async () => {
  if (!assignDialog.selectedWorkerId) {
    ElMessage.warning('请先选择服务人员');
    return;
  }
  assignDialog.submitting = true;
  try {
    if (assignDialog.mode === 'reassign') {
      await reassignCleaningOrder(
        assignDialog.orderId,
        assignDialog.selectedWorkerId,
        userStore.adminId,
      );
      ElMessage.success('改派成功');
    } else {
      await assignCleaningOrder(
        assignDialog.orderId,
        assignDialog.selectedWorkerId,
        userStore.adminId,
      );
      ElMessage.success('派单成功');
    }
    assignDialog.visible = false;
    loadOrders();
  } catch (e) {
    console.error('[CleaningOrders] assign failed', e);
  } finally {
    assignDialog.submitting = false;
  }
};

// ─── 新增订单弹窗 ─────────────────────────────────────────────────────────────

const catalogItems = ref<ServiceCatalogItem[]>([]);

const createDialog = reactive({
  visible: false,
  submitting: false,
});

const createFormRef = ref<FormInstance>();

const createForm = reactive<CreateCleaningOrderDto & { isProxyOrder: boolean }>({
  serviceItem: '',
  serviceDuration: 2,
  appointDate: '',
  appointTimeSlot: '',
  contactName: '',
  contactPhone: '',
  addressSnapshotText: '',
  isProxyOrder: false,
  serviceContactName: '',
  serviceContactPhone: '',
  source: 'PHONE',
  remark: '',
});

const createRules = computed(() => ({
  serviceItem: [{ required: true, message: '请选择服务类型', trigger: 'change' }],
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
      addressSnapshotText: [{ required: true, message: '请输入地址', trigger: 'blur' }],
  appointDate: [{ required: true, message: '请选择服务日期', trigger: 'change' }],
  appointTimeSlot: [{ required: true, message: '请选择服务时段', trigger: 'change' }],
}));

const openCreateDialog = async () => {
  createDialog.visible = true;
  if (catalogItems.value.length === 0) {
    try {
      const res = await fetchServiceCatalogs({ bizType: 'CLEANING', isEnabled: true, pageSize: 50 });
      catalogItems.value = res.data.data?.items ?? [];
    } catch (e) {
      console.error('[CleaningOrders] load catalogs failed', e);
    }
  }
};

const resetCreateForm = () => {
  createFormRef.value?.resetFields();
  Object.assign(createForm, {
    serviceItem: '',
    serviceDuration: 2,
    appointDate: '',
    appointTimeSlot: '',
    contactName: '',
    contactPhone: '',
      addressSnapshotText: '',
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
    const payload: CreateCleaningOrderDto = {
      serviceItem: createForm.serviceItem,
      serviceDuration: createForm.serviceDuration,
      appointDate: createForm.appointDate,
      appointTimeSlot: createForm.appointTimeSlot,
      contactName: createForm.contactName.trim(),
      contactPhone: createForm.contactPhone.trim(),
      addressSnapshotText: createForm.addressSnapshotText?.trim(),
      isProxyOrder: createForm.isProxyOrder,
      source: 'PHONE',
      remark: createForm.remark || undefined,
    };
    if (createForm.isProxyOrder) {
      payload.serviceContactName = createForm.serviceContactName?.trim();
      payload.serviceContactPhone = createForm.serviceContactPhone?.trim();
    }

    await createCleaningOrder(payload);
    ElMessage.success('订单创建成功');
    createDialog.visible = false;
    loadOrders();
  } catch (e) {
    console.error('[CleaningOrders] create failed', e);
  } finally {
    createDialog.submitting = false;
  }
};

// ─── 订单详情抽屉 ─────────────────────────────────────────────────────────────

const detailDrawer = reactive<{
  visible: boolean;
  loading: boolean;
  order: CleaningOrderDetail | null;
  review: ReviewDto | null;
}>({
  visible: false,
  loading: false,
  order: null,
  review: null,
});

const openDetail = async (row: CleaningOrderItem) => {
  detailDrawer.visible = true;
  detailDrawer.loading = true;
  detailDrawer.order = null;
  detailDrawer.review = null;
  try {
    const res = await fetchCleaningOrderDetail(row.id);
    detailDrawer.order = res.data.data;
    console.info('[CleaningOrders] detail loaded for', row.orderNo);

    // REVIEWED 状态懒加载评价
    if (detailDrawer.order?.status === 'REVIEWED') {
      try {
        const rvRes = await fetchOrderReview(row.id);
        detailDrawer.review = rvRes.data.data?.items?.[0] ?? null;
      } catch (e) {
        console.warn('[CleaningOrders] review load failed', e);
      }
    }
  } catch (e) {
    console.error('[CleaningOrders] detail load failed', e);
    detailDrawer.visible = false;
  } finally {
    detailDrawer.loading = false;
  }
};

const openAssignFromDetail = () => {
  if (!detailDrawer.order) return;
  detailDrawer.visible = false;
  openAssign(detailDrawer.order);
};

// ─── 初始化 ───────────────────────────────────────────────────────────────────

const route = useRoute();

onMounted(() => {
  // P5.12 首页待办卡片跳转预置状态筛选（如 /orders/cleaning?status=PENDING_ASSIGN）
  const statusFromQuery = route.query.status as string | undefined;
  if (statusFromQuery) {
    queryParams.status = statusFromQuery as TabValue;
  }
  loadOrders();
});
</script>

<style scoped lang="scss">
.cleaning-page {
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

.worker-info {
  font-size: 14px;
  color: #303133;
  line-height: 1.8;
}

.pending-assign-tip {
  font-size: 13px;
  padding: 4px 0;
}

// ── 时间轴 ────────────────────────────────────────────────────────────────────

.timeline-label {
  font-size: 13px;
  color: #909399;

  &.timeline-active {
    color: #409eff;
    font-weight: 600;
  }
}

// ── 作业照片 ──────────────────────────────────────────────────────────────────

.photo-group {
  margin-bottom: 12px;
}

.photo-group-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photo-thumb {
  width: 72px;
  height: 72px;
  border-radius: 4px;
  cursor: pointer;
  object-fit: cover;
}

// ── 用户评价 ──────────────────────────────────────────────────────────────────

.review-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-tags {
  display: flex;
  flex-wrap: wrap;
}

.review-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

// ── 抽屉底部操作 ──────────────────────────────────────────────────────────────

.drawer-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

// ── 新增订单：服务时长步进器 ───────────────────────────────────────────────────

.duration-stepper {
  display: flex;
  align-items: center;
  gap: 12px;

  .duration-value {
    min-width: 56px;
    text-align: center;
    font-size: 15px;
    font-weight: 500;
    color: #303133;
  }
}

// ── 新增订单：时段格子按钮 ─────────────────────────────────────────────────────

.time-slot-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;

  .time-slot-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 13px;
    color: #606266;
    cursor: pointer;
    transition: all 0.15s;
    user-select: none;

    &:hover {
      border-color: #409eff;
      color: #409eff;
    }

    &--active {
      border-color: #409eff;
      background-color: #ecf5ff;
      color: #409eff;
      font-weight: 500;
    }
  }
}
</style>
