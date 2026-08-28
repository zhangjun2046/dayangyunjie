<template>
  <view class="page" :class="{ 'page--locked': assignVisible }">
    <view class="page-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-row">
        <view v-if="visibleTabs.length > 0" class="header-tabs">
          <view
            v-for="tab in visibleTabs"
            :key="tab.value"
            :class="['tab-item', activeTab === tab.value && 'tab-item--active']"
            @tap="onTabChange(tab.value)"
          >
            <text class="tab-label">{{ tab.label }}</text>
            <view v-if="activeTab === tab.value" class="tab-indicator" />
          </view>
        </view>
        <view v-else class="header-tabs header-tabs--empty" />
        <text class="nav-logout" @tap.stop="onLogout">退出登录</text>
      </view>
    </view>

    <view class="page-header-placeholder" :style="{ height: headerTotalHeight + 'px' }" />

    <view class="page-body">
    <template v-if="visibleTabs.length === 0">
      <view class="status-wrap empty-wrap">
        <image class="empty-icon-img" src="/static/icons/icon_empty.png" mode="aspectFit" />
        <text class="empty-text">暂无订单查看权限，请联系超级管理员分配功能授权</text>
      </view>
    </template>

    <template v-else>
      <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
        <view class="filter-row">
          <view
            v-for="pill in STATUS_PILLS"
            :key="pill.key"
            :class="['filter-pill', currentState.pillKey === pill.key && 'filter-pill--active']"
            @tap="onPillChange(pill.key)"
          >
            <text class="filter-pill-text">{{ pill.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 查询暂隐藏，后续再开 -->
      <!--
      <view class="search-wrap">
        <input
          class="search-input"
          :value="currentState.keyword"
          placeholder="搜索订单号、姓名、电话"
          placeholder-class="search-placeholder"
          confirm-type="search"
          @input="onKeywordInput"
          @confirm="onSearch"
        />
        <text class="search-btn" @tap="onSearch">查询</text>
      </view>
      -->

      <view v-if="loading && currentState.items.length === 0" class="status-wrap">
        <view class="loading-spinner" />
        <text class="loading-text">加载中…</text>
      </view>

      <view v-else-if="!loading && currentState.items.length === 0" class="status-wrap empty-wrap">
        <image class="empty-icon-img" src="/static/icons/icon_empty.png" mode="aspectFit" />
        <text class="empty-text">暂无相关订单</text>
        <text class="empty-sub">下拉刷新可更新列表</text>
      </view>

      <view v-else class="order-list">
        <view
          v-for="item in currentState.items"
          :key="item.orderNo"
          class="order-card"
          @tap="onOpenDetail(item)"
        >
          <view :class="['status-badge', getOrderBadgeClass(item.status)]">
            <text class="status-badge-text">{{ getOrderBadgeLabel(item.status) }}</text>
          </view>

          <view class="card-main">
            <view :class="['service-icon', item.orderType === 'cleaning' ? 'icon-cleaning' : 'icon-recycling']">
              <image class="icon-img" :src="serviceIcon(item.orderType)" mode="aspectFit" />
            </view>
            <view class="card-info">
              <text class="service-name">{{ item.serviceName }}</text>
              <view class="time-row">
                <image class="meta-icon" src="/static/icons/icon_shijian_n.png" mode="aspectFit" />
                <text class="time-text">{{ item.appointDate }}&nbsp;&nbsp;{{ item.appointTimeSlot }}</text>
              </view>
              <view class="addr-row">
                <image class="meta-icon" src="/static/icons/icon_weizhi_n.png" mode="aspectFit" />
                <text class="addr-text">{{ item.address || '—' }}</text>
              </view>
              <view class="worker-row">
                <text class="worker-text">服务人员：{{ item.workerName || '待分配' }}</text>
              </view>
            </view>
          </view>

          <view
            v-if="item.status === 'PENDING_ASSIGN' || item.status === 'ASSIGNED'"
            class="card-actions"
          >
            <button class="btn btn-primary" @tap.stop="onAssignTap(item)">
              {{ item.status === 'ASSIGNED' ? '改派' : '分配' }}
            </button>
          </view>
        </view>

        <view v-if="currentState.items.length > 0" class="load-more-tip">
          <text v-if="loadingMore" class="load-more-text">加载中…</text>
          <text v-else-if="noMore" class="load-more-text">已加载全部</text>
        </view>
      </view>
    </template>
    </view>

    <AssignWorkerPopup
      v-model:visible="assignVisible"
      :order-id="assignTarget?.id ?? 0"
      :order-type="assignTarget?.orderType ?? 'cleaning'"
      :mode="assignMode"
      :current-worker-id="assignTarget?.workerId ?? null"
      @success="onAssignSuccess"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onUnmounted, onMounted } from 'vue';
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import { ensureAuthed } from '@/composables/useRouteGuard';
import {
  useOrderTabs,
  notifyPermissionChange,
  type OrderTab,
} from '@/composables/useOrderTabs';
import { fetchCleaningOrders } from '@/api/cleaning';
import { fetchRecyclingOrders } from '@/api/recycling';
import type { AddressSnapshot } from '@/api/cleaning';
import {
  STATUS_PILLS,
  getOrderBadgeClass,
  getOrderBadgeLabel,
} from '@/constants/order-status';
import AssignWorkerPopup from '@/components/AssignWorkerPopup.vue';

interface AdminOrderCard {
  id: number;
  orderNo: string;
  orderType: OrderTab;
  status: string;
  serviceName: string;
  appointDate: string;
  appointTimeSlot: string;
  address: string;
  workerName: string;
  workerId: number | null;
}

interface TabListState {
  keyword: string;
  pillKey: string;
  page: number;
  total: number;
  items: AdminOrderCard[];
  loaded: boolean;
}

const PAGE_SIZE = 20;

const authStore = useAuthStore();
const { visibleTabs, activeTab, syncFromPermissions, selectTab, snapshotVisibleKeys } =
  useOrderTabs();

const HEADER_ROW_PX = uni.upx2px(88);
const statusBarHeight = ref(0);
const headerTotalHeight = computed(() => statusBarHeight.value + HEADER_ROW_PX);

onMounted(() => {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight ?? 0;
});

const tabState = reactive<Record<OrderTab, TabListState>>({
  cleaning: emptyTabState(),
  recycling: emptyTabState(),
});

const loading = ref(false);
const loadingMore = ref(false);
const syncingPermissions = ref(false);
const assignVisible = ref(false);
const assignTarget = ref<AdminOrderCard | null>(null);

const ALL_TABS: OrderTab[] = ['cleaning', 'recycling'];

const assignMode = computed<'assign' | 'reassign'>(() =>
  assignTarget.value?.status === 'ASSIGNED' ? 'reassign' : 'assign',
);

const currentState = computed(() => {
  const tab = activeTab.value ?? 'cleaning';
  return tabState[tab];
});

const noMore = computed(
  () => currentState.value.items.length >= currentState.value.total && currentState.value.items.length > 0,
);

function emptyTabState(): TabListState {
  return {
    keyword: '',
    pillKey: 'all',
    page: 1,
    total: 0,
    items: [],
    loaded: false,
  };
}

function formatAppointDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  return dateStr.slice(0, 10).replace(/-/g, '.');
}

function formatAddress(snapshot?: AddressSnapshot | null): string {
  if (!snapshot) return '';
  return [snapshot.province, snapshot.city, snapshot.district, snapshot.detail, snapshot.buildingInfo]
    .filter(Boolean)
    .join('');
}

function serviceIcon(type: OrderTab): string {
  return type === 'cleaning' ? '/static/icons/cleaning.png' : '/static/icons/recycling.png';
}

function currentStatus(): string | undefined {
  const pill = STATUS_PILLS.find((item) => item.key === currentState.value.pillKey);
  return pill?.status;
}

async function loadOrders(page: number, replace: boolean): Promise<void> {
  const tab = activeTab.value;
  if (!tab) return;
  const state = tabState[tab];

  if (replace) {
    loading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const params = {
      page,
      pageSize: PAGE_SIZE,
      status: currentStatus(),
      keyword: state.keyword,
    };
    const result =
      tab === 'cleaning' ? await fetchCleaningOrders(params) : await fetchRecyclingOrders(params);
    const items: AdminOrderCard[] = (result.items ?? []).map((row) => ({
      id: row.id,
      orderNo: row.orderNo,
      orderType: tab,
      status: row.status,
      serviceName: row.serviceItem,
      appointDate: formatAppointDate(row.appointDate),
      appointTimeSlot: row.appointTimeSlot,
      address: formatAddress(row.addressSnapshot),
      workerName: row.worker?.name ?? '',
      workerId: row.worker?.id ?? null,
    }));
    state.total = result.total ?? 0;
    state.page = page;
    state.loaded = true;
    state.items = replace ? items : [...state.items, ...items];
    console.info('[orders] loadOrders done', tab, 'page=', page, 'total=', state.total);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[orders] loadOrders failed', msg);
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function clearRevokedCaches(nextVisible: OrderTab[]): void {
  for (const tab of ALL_TABS) {
    if (!nextVisible.includes(tab)) {
      Object.assign(tabState[tab], emptyTabState());
    }
  }
}

/**
 * 先确保会话（过期则 refresh），再重拉权限，最后决定是否拉订单。
 * 上拉加载更多不要走这里。
 */
async function syncPermissionsThenList(opts: {
  forceReload: boolean;
  intendedTab?: OrderTab;
}): Promise<void> {
  if (syncingPermissions.value) return;
  syncingPermissions.value = true;
  try {
    const ok = await ensureAuthed();
    if (!ok) return;

    const prevVisible = snapshotVisibleKeys();
    const prevActive = activeTab.value;
    const refreshed = await authStore.refreshPermissions();

    // 权限请求若最终仍失败且会话已清，不要继续用无 token 请求订单（避免 304 脏数据）
    if (!authStore.isLoggedIn || !authStore.accessToken) return;

    if (refreshed) {
      const nextVisible = snapshotVisibleKeys();
      clearRevokedCaches(nextVisible);
      notifyPermissionChange(prevVisible, prevActive, nextVisible);

      if (opts.intendedTab && nextVisible.includes(opts.intendedTab)) {
        selectTab(opts.intendedTab);
      } else {
        syncFromPermissions();
      }
    } else if (opts.intendedTab) {
      selectTab(opts.intendedTab);
    } else {
      syncFromPermissions();
    }

    if (!activeTab.value) return;
    if (opts.forceReload || !tabState[activeTab.value].loaded) {
      await loadOrders(1, true);
    }
  } finally {
    syncingPermissions.value = false;
  }
}

onShow(async () => {
  await syncPermissionsThenList({ forceReload: true });
});

onPullDownRefresh(async () => {
  try {
    await syncPermissionsThenList({ forceReload: true });
  } finally {
    uni.stopPullDownRefresh();
  }
});

onReachBottom(() => {
  if (!activeTab.value || loadingMore.value || noMore.value || loading.value) return;
  void loadOrders(currentState.value.page + 1, false);
});

function onTabChange(tab: OrderTab) {
  if (activeTab.value === tab) return;
  void syncPermissionsThenList({ forceReload: false, intendedTab: tab });
}

function onPillChange(key: string) {
  const tab = activeTab.value;
  if (!tab || tabState[tab].pillKey === key) return;
  tabState[tab].pillKey = key;
  void loadOrders(1, true);
}

function onKeywordInput(e: { detail: { value: string } }) {
  const tab = activeTab.value;
  if (!tab) return;
  tabState[tab].keyword = e.detail.value;
}

/** 根据订单号前缀推断业务类型：CLN→保洁，RCY→废品 */
function detectTabFromKeyword(keyword: string): OrderTab | null {
  const upper = keyword.trim().toUpperCase();
  if (upper.startsWith('CLN')) return 'cleaning';
  if (upper.startsWith('RCY')) return 'recycling';
  return null;
}

async function onSearch() {
  const tab = activeTab.value;
  if (!tab) return;

  const keyword = tabState[tab].keyword.trim();
  tabState[tab].keyword = keyword;

  // 有关键词时重置状态为「全部」，避免状态胶囊把目标订单滤掉
  if (keyword) {
    tabState.cleaning.keyword = keyword;
    tabState.recycling.keyword = keyword;
    tabState.cleaning.pillKey = 'all';
    tabState.recycling.pillKey = 'all';

    const hinted = detectTabFromKeyword(keyword);
    if (hinted && hinted !== tab) {
      const visible = snapshotVisibleKeys();
      if (visible.includes(hinted)) {
        selectTab(hinted);
      }
    }
  }

  await loadOrders(1, true);
}

function onOpenDetail(item: AdminOrderCard) {
  uni.navigateTo({
    url: `/pages/order-detail/index?id=${item.id}&type=${item.orderType}`,
  });
}

function onAssignTap(item: AdminOrderCard) {
  assignTarget.value = item;
  assignVisible.value = true;
}

/** 弹窗打开时锁定 H5 页面滚动，关闭后恢复，避免背景订单列表跟着滑 */
let savedPageScrollTop = 0;

function lockPageScroll(): void {
  savedPageScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = `-${savedPageScrollTop}px`;
}

function unlockPageScroll(): void {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
  window.scrollTo(0, savedPageScrollTop);
}

watch(assignVisible, (open) => {
  if (open) {
    lockPageScroll();
  } else {
    unlockPageScroll();
  }
});

onUnmounted(() => {
  if (assignVisible.value) {
    unlockPageScroll();
  }
});

async function onAssignSuccess() {
  if (activeTab.value) {
    await loadOrders(1, true);
  }
}

function onLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    confirmText: '退出登录',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return;
      authStore.logout();
      uni.reLaunch({ url: '/pages/login/index' });
    },
  });
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f8faff;
}

.page--locked {
  overflow: hidden;
  height: 100vh;
}

.page-body {
  min-height: 0;
}

.page-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;
  background: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.page-header-placeholder {
  flex-shrink: 0;
}

.header-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  padding: 0 32rpx;
}

.header-tabs {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 48rpx;
  flex: 1;
  min-width: 0;
}

.header-tabs--empty {
  flex: 1;
}

.nav-logout {
  font-size: 32rpx;
  color: #236eff;
  flex-shrink: 0;
  padding: 24rpx 0 24rpx 24rpx;
}

.tab-item {
  position: relative;
  flex-shrink: 0;
  padding: 24rpx 0 20rpx;
}

.tab-label {
  font-size: 36rpx;
  color: #666;
  font-weight: 400;
  white-space: nowrap;
}

.tab-item--active .tab-label {
  color: #333333;
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: #236eff;
  border-radius: 2rpx;
}

.filter-scroll {
  padding: 18rpx 0;
  white-space: nowrap;
  /* H5：隐藏横向滚动条，仍可左右滑动 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.filter-scroll::-webkit-scrollbar,
.filter-scroll :deep(*)::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  background: transparent;
}

.filter-scroll :deep(*) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.filter-row {
  white-space: nowrap;
  padding: 0 24rpx;
  font-size: 0;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  padding: 14rpx 28rpx;
  margin-right: 16rpx;
  background: #fff;
  border-radius: 40rpx;
  vertical-align: middle;
}

.filter-pill:last-child {
  margin-right: 48rpx;
}

.filter-pill--active {
  background: #236eff;
}

.filter-pill-text {
  font-size: 28rpx;
  color: #666;
  white-space: nowrap;
}

.filter-pill--active .filter-pill-text {
  color: #fff;
}

.search-wrap {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0 24rpx 16rpx;
  padding: 0 24rpx;
  height: 72rpx;
  background: #fff;
  border-radius: 36rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
  color: #333;
}

.search-placeholder {
  color: #b0b8c4;
  font-size: 26rpx;
}

.search-btn {
  font-size: 26rpx;
  color: #236eff;
  padding-left: 16rpx;
  flex-shrink: 0;
}

.status-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid #e8ecf0;
  border-top-color: #236eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 20rpx;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text,
.empty-text {
  font-size: 28rpx;
  color: #999;
  text-align: center;
  line-height: 1.6;
}

.empty-wrap {
  gap: 16rpx;
}

.empty-icon-img {
  width: 320rpx;
  height: 320rpx;
  margin-bottom: 8rpx;
}

.empty-sub {
  font-size: 24rpx;
  color: #bbb;
}

.order-list {
  padding: 4rpx 26rpx 14rpx;
}

.order-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 38rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  position: relative;
}

.status-badge {
  position: absolute;
  top: 38rpx;
  right: 28rpx;
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  font-size: 0;
}

.status-badge-text {
  font-size: 26rpx;
}

.badge-pending {
  background: #fff7e6;
}
.badge-pending .status-badge-text {
  color: #d48806;
}

.badge-blue {
  background: #e6f0ff;
}
.badge-blue .status-badge-text {
  color: #236eff;
}

.badge-orange {
  background: #fff3e0;
}
.badge-orange .status-badge-text {
  color: #fa8c16;
}

.badge-green {
  background: #f0fff0;
}
.badge-green .status-badge-text {
  color: #52c41a;
}

.badge-grey {
  background: #f5f5f5;
}
.badge-grey .status-badge-text {
  color: #999;
}

.card-main {
  display: flex;
  align-items: center;
  padding-right: 120rpx;
}

.service-icon {
  width: 100rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 30rpx;
}

.icon-img {
  width: 100rpx;
  height: 100rpx;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.service-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 12rpx;
}

.time-row,
.addr-row,
.worker-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8rpx;
}

.meta-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-right: 8rpx;
}

.time-text,
.addr-text,
.worker-text {
  font-size: 26rpx;
  color: #636d73;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 28rpx;
}

.btn {
  flex: none;
  width: 180rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  text-align: center;
  margin: 0;
  padding: 0;
}

.btn::after {
  display: none;
}

.btn-primary {
  background: linear-gradient(135deg, #246bff 0%, #1aa1ff 100%);
  color: #ffffff;
  border: none;
}

.load-more-tip {
  display: flex;
  justify-content: center;
  padding: 24rpx 0 40rpx;
}

.load-more-text {
  font-size: 26rpx;
  color: #999;
}
</style>
