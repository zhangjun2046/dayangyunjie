<template>
  <view class="page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-wrap">
      <view class="loading-spinner" />
      <text class="loading-text">加载中…</text>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="!order" class="loading-wrap">
      <text class="loading-text">订单加载失败，请返回重试</text>
    </view>

    <!-- 详情内容 -->
    <block v-else>
      <scroll-view class="detail-scroll" scroll-y>
        <!-- ===== 头部蓝色区域 ===== -->
        <view class="header-card">
          <view class="header-top">
            <view class="header-title-row">
              <text class="service-title">{{ serviceName }}</text>
              <view :class="['status-tag', statusTagClass]">
                <text class="status-tag-text">{{ statusTagLabel }}</text>
              </view>
            </view>
            <text class="order-no">订单编号：{{ order.orderNo }}</text>
            <text class="appoint-time">预计完成时间：{{ appointTimeText }}</text>
          </view>
        </view>

        <!-- ===== 客户联系信息条 ===== -->
        <view class="contact-bar">
          <view class="contact-left">
            <view class="contact-avatar">
              <text class="avatar-icon">👤</text>
            </view>
            <text class="contact-phone">{{ order.contactPhone }}</text>
          </view>
          <view class="contact-actions">
            <view class="contact-btn contact-btn--nav" @tap="handleNavigate">
              <text class="contact-btn-icon">🗺️</text>
            </view>
            <view class="contact-btn contact-btn--call" @tap="handleCall">
              <text class="contact-btn-icon">📞</text>
            </view>
          </view>
        </view>

        <!-- ===== 订单信息卡 ===== -->
        <view class="info-card">
          <view class="card-section-title">
            <text class="section-title-text">订单信息</text>
          </view>

          <view class="info-row">
            <text class="info-label">计划服务时间</text>
            <text class="info-value">{{ planServiceTime }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ order.isProxyOrder ? '代下单人' : '联系人' }}</text>
            <text class="info-value">{{ order.contactName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ order.contactPhone }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">服务地址</text>
            <text class="info-value address-value">{{ addressText }}</text>
          </view>

          <!-- 代下单时展示被服务人信息 -->
          <template v-if="order.isProxyOrder && order.serviceContactName">
            <view class="divider" />
            <view class="proxy-row">
              <view class="proxy-badge">
                <text class="proxy-badge-text">代下单</text>
              </view>
              <text class="proxy-desc">以下为实际被服务人</text>
            </view>
            <view class="info-row">
              <text class="info-label">被服务人</text>
              <text class="info-value">{{ order.serviceContactName }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">联系方式</text>
              <text class="info-value">{{ order.serviceContactPhone }}</text>
            </view>
          </template>

          <view v-if="order.remark || order.notes" class="info-row">
            <text class="info-label">备注信息</text>
            <text class="info-value remark-value">{{ order.remark || order.notes }}</text>
          </view>
        </view>

        <!-- ===== 服务进度时间轴 ===== -->
        <view class="info-card">
          <view class="card-section-title">
            <text class="section-title-text">服务进度</text>
          </view>

          <view class="timeline">
            <view
              v-for="(node, index) in timelineNodes"
              :key="node.key"
              :class="['timeline-item', index < timelineNodes.length - 1 && 'timeline-item--has-line']"
            >
              <!-- 节点圆圈 -->
              <view :class="['timeline-dot', node.done ? 'timeline-dot--done' : node.active ? 'timeline-dot--active' : 'timeline-dot--pending']">
                <text v-if="node.done" class="dot-check">✓</text>
                <view v-else-if="node.active" class="dot-active-inner" />
              </view>
              <!-- 连接线 -->
              <view v-if="index < timelineNodes.length - 1" :class="['timeline-line', node.done ? 'timeline-line--done' : 'timeline-line--pending']" />
              <!-- 节点内容 -->
              <view class="timeline-content">
                <text :class="['node-label', node.done ? 'node-label--done' : node.active ? 'node-label--active' : 'node-label--pending']">
                  {{ node.label }}
                </text>
                <text class="node-desc">{{ node.desc }}</text>
                <text v-if="node.time" class="node-time">{{ node.time }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 作业记录区 ===== -->
        <view class="info-card">
          <view class="card-section-title">
            <text class="section-title-text">作业记录</text>
          </view>

          <!-- 上传前照片 -->
          <view class="photo-group">
            <view class="photo-group-header">
              <view class="photo-seq-badge">
                <text class="photo-seq-text">1</text>
              </view>
              <text class="photo-group-label">上传打扫前照片</text>
            </view>
            <view :class="['photo-upload-area', isWorkAreaDisabled && 'photo-upload-area--disabled']">
              <view class="photo-placeholder">
                <text class="photo-camera-icon">📷</text>
              </view>
              <text v-if="isWorkAreaDisabled" class="photo-disabled-tip">开始服务后可上传</text>
            </view>
          </view>

          <!-- 上传后照片 -->
          <view class="photo-group">
            <view class="photo-group-header">
              <view class="photo-seq-badge photo-seq-badge--pending">
                <text class="photo-seq-text">2</text>
              </view>
              <text class="photo-group-label">上传打扫后照片</text>
            </view>
            <view :class="['photo-upload-area', isWorkAreaDisabled && 'photo-upload-area--disabled']">
              <view class="photo-placeholder">
                <text class="photo-camera-icon">📷</text>
              </view>
              <text v-if="isWorkAreaDisabled" class="photo-disabled-tip">开始服务后可上传</text>
            </view>
          </view>
        </view>

        <!-- 底部安全区占位 -->
        <view class="bottom-spacer" />
      </scroll-view>

      <!-- ===== 底部固定按钮 ===== -->

      <!-- ASSIGNED（已派单）：只能接单，尚不可开始服务 -->
      <view v-if="order.status === 'ASSIGNED'" class="bottom-bar">
        <view class="bottom-tip-row">
          <text class="bottom-tip-text">请先接单，接单后方可开始服务</text>
        </view>
        <button
          class="start-btn start-btn--accept"
          :disabled="acceptingOrder"
          @tap="handleAcceptOrder"
        >
          <text class="start-btn-text">{{ acceptingOrder ? '接单中…' : '立即接单' }}</text>
        </button>
      </view>

      <!-- ACCEPTED（已接单）：可以开始服务 -->
      <view v-else-if="order.status === 'ACCEPTED'" class="bottom-bar">
        <button
          class="start-btn"
          :disabled="startingService"
          @tap="handleStartService"
        >
          <text class="start-btn-text">{{ startingService ? '定位中…' : '开始服务' }}</text>
        </button>
      </view>

      <!-- 其他状态（IN_SERVICE/PENDING_REVIEW/REVIEWED）的占位底栏 -->
      <view v-else-if="order.status === 'IN_SERVICE'" class="bottom-bar bottom-bar--info">
        <text class="bottom-info-text">服务进行中，请完成工作后提交照片</text>
      </view>
    </block>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import { fetchOrderDetail, acceptOrder, gpsCheckin } from '@/api/order';
import type { OrderDetailDto } from '@/api/order';

const authStore = useAuthStore();

const orderId = ref<number>(0);
const orderType = ref<'cleaning' | 'recycling'>('cleaning');
const order = ref<OrderDetailDto | null>(null);
const loading = ref(false);
const startingService = ref(false);
const acceptingOrder = ref(false);

// ===== 路由参数加载 =====
onLoad((query) => {
  orderId.value = Number(query?.orderId ?? 0);
  orderType.value = (query?.orderType as 'cleaning' | 'recycling') ?? 'cleaning';
  console.info('[task-detail] onLoad, orderId=', orderId.value, 'orderType=', orderType.value);
  loadDetail();
});

async function loadDetail(): Promise<void> {
  if (!orderId.value) return;
  loading.value = true;
  try {
    order.value = await fetchOrderDetail(orderType.value, orderId.value);
    console.info('[task-detail] loadDetail done, status=', order.value?.status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[task-detail] loadDetail failed, err=', msg);
  } finally {
    loading.value = false;
  }
}

// ===== 计算属性 =====

/** 服务名称 */
const serviceName = computed<string>(() => {
  if (!order.value) return '';
  return order.value.serviceItem ?? order.value.serviceType ?? '服务任务';
});

/** 状态标签文字（工人端展示名） */
const statusTagLabel = computed<string>(() => {
  const s = order.value?.status ?? '';
  const map: Record<string, string> = {
    ASSIGNED: '待服务',
    ACCEPTED: '待服务',
    IN_SERVICE: '服务中',
    PENDING_REVIEW: '待评价',
    REVIEWED: '已评价',
    CANCELLED: '已取消',
  };
  return map[s] ?? s;
});

/** 状态标签样式 */
const statusTagClass = computed<string>(() => {
  const s = order.value?.status ?? '';
  const map: Record<string, string> = {
    ASSIGNED: 'status-tag--pending',
    ACCEPTED: 'status-tag--pending',
    IN_SERVICE: 'status-tag--active',
    PENDING_REVIEW: 'status-tag--review',
    REVIEWED: 'status-tag--done',
    CANCELLED: 'status-tag--cancelled',
  };
  return map[s] ?? '';
});

/** 预计完成时间：从 appointDate + appointTimeSlot 拼装 */
const appointTimeText = computed<string>(() => {
  if (!order.value) return '';
  const date = (order.value.appointDate ?? '').slice(0, 10);
  const slot = order.value.appointTimeSlot ?? '';
  // 取 timeSlot 中的结束时间（如 "14:00-17:00" → "17:00"）
  const endTime = slot.includes('-') ? slot.split('-')[1]?.trim() : slot;
  return endTime ? `${endTime}` : date;
});

/** 计划服务时间（完整展示） */
const planServiceTime = computed<string>(() => {
  if (!order.value) return '';
  const date = (order.value.appointDate ?? '').slice(0, 10).replace(/-/g, '-');
  const slot = order.value.appointTimeSlot ?? '';
  return `${date} ${slot}`;
});

/** 服务地址文字 */
const addressText = computed<string>(() => {
  const snap = order.value?.addressSnapshot;
  if (!snap) return '';
  const parts: string[] = [];
  if (snap.district) parts.push(snap.district);
  if (snap.detail) parts.push(snap.detail);
  if (snap.buildingInfo) parts.push(snap.buildingInfo);
  if (parts.length > 0) return parts.join('');
  return [snap.province, snap.city, snap.district].filter(Boolean).join('');
});

/** 作业记录区是否禁用（ASSIGNED / ACCEPTED 禁用） */
const isWorkAreaDisabled = computed<boolean>(() => {
  const s = order.value?.status ?? '';
  return s === 'ASSIGNED' || s === 'ACCEPTED';
});

// ===== 时间轴节点 =====

/** 格式化时间戳 */
function formatTs(ts: string | undefined | null): string {
  if (!ts) return '';
  return ts.slice(0, 16).replace('T', ' ');
}

/** 根据订单状态生成时间轴节点列表 */
const timelineNodes = computed(() => {
  const o = order.value;
  if (!o) return [];
  const s = o.status;

  // 状态等级映射，等级越高表示流程越靠后
  const levelMap: Record<string, number> = {
    ASSIGNED: 1,
    ACCEPTED: 2,
    IN_SERVICE: 3,
    PENDING_REVIEW: 4,
    REVIEWED: 5,
  };
  const cur = levelMap[s] ?? 0;
  const isPast = (target: string): boolean => cur > (levelMap[target] ?? 0);
  const isAtOrPast = (target: string): boolean => cur >= (levelMap[target] ?? 0);
  const isCurrent = (...targets: string[]): boolean => targets.includes(s);

  const serviceTypeName = orderType.value === 'cleaning' ? '保洁服务' : '废品回收';

  return [
    {
      key: 'created',
      label: '已预约',
      desc: '用户已下单，等待平台派单',
      done: true,
      active: false,
      time: formatTs(o.createdAt),
    },
    {
      key: 'assigned',
      label: '已派单',
      desc: '系统派单给您',
      done: true,
      active: false,
      time: formatTs(o.assignedAt),
    },
    {
      key: 'service',
      // ASSIGNED/ACCEPTED：当前步骤；IN_SERVICE 及之后：已完成（GPS签到时间）
      label: '待服务',
      desc: isCurrent('ASSIGNED', 'ACCEPTED')
        ? `请您在指定时间内开始${serviceTypeName}`
        : 'GPS 签到完成，服务已开始',
      done: isAtOrPast('IN_SERVICE'),
      active: isCurrent('ASSIGNED', 'ACCEPTED'),
      time: isAtOrPast('IN_SERVICE') ? formatTs(o.gpsCheckinAt) : '',
    },
    {
      key: 'inservice',
      // IN_SERVICE：当前步骤；PENDING_REVIEW 及之后：已完成
      label: '服务中',
      desc: '员工已上门，开始服务中',
      done: isAtOrPast('PENDING_REVIEW'),
      active: isCurrent('IN_SERVICE'),
      time: isAtOrPast('PENDING_REVIEW') ? formatTs(o.completedAt) : '',
    },
    {
      key: 'completed',
      // PENDING_REVIEW：当前步骤；REVIEWED 及之后：已完成
      label: '已完成',
      desc: '员工已完成服务工作',
      done: isAtOrPast('REVIEWED'),
      active: isCurrent('PENDING_REVIEW'),
      time: isAtOrPast('REVIEWED') ? formatTs(o.reviewedAt) : '',
    },
    {
      key: 'reviewed',
      label: '已评价',
      desc: '用户已完成评价',
      done: s === 'REVIEWED',
      active: false,
      time: s === 'REVIEWED' ? formatTs(o.reviewedAt) : '',
    },
  ];
});

// ===== 操作函数 =====

/**
 * 立即接单（ASSIGNED → ACCEPTED）
 * 接单成功后刷新详情，底部按钮自动切换为「开始服务」
 */
async function handleAcceptOrder(): Promise<void> {
  if (acceptingOrder.value) return;
  const workerId = authStore.worker?.id;
  if (!workerId) {
    uni.showToast({ title: '登录状态异常，请重新登录', icon: 'none' });
    return;
  }
  acceptingOrder.value = true;
  console.info('[task-detail] handleAcceptOrder, orderId=', orderId.value);
  try {
    await acceptOrder(orderType.value, orderId.value, workerId);
    uni.showToast({ title: '接单成功', icon: 'success' });
    console.info('[task-detail] acceptOrder success');
    await loadDetail();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '接单失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[task-detail] acceptOrder failed, err=', msg);
  } finally {
    acceptingOrder.value = false;
  }
}

/** 一键拨号 */
function handleCall(): void {
  const phone = order.value?.contactPhone;
  if (!phone) return;
  uni.makePhoneCall({ phoneNumber: phone });
}

/**
 * 地图导航：
 * - 将完整服务地址复制到剪贴板，并弹窗提示员工在地图 App 中粘贴搜索导航
 * - WeChat miniapp 中 uni.openLocation 需要目的地经纬度，地址快照暂无坐标，
 *   采用复制地址方案作为通用替代
 */
function handleNavigate(): void {
  const address = addressText.value;
  if (!address) {
    uni.showToast({ title: '暂无服务地址', icon: 'none' });
    return;
  }
  console.info('[task-detail] handleNavigate, address=', address);
  uni.setClipboardData({
    data: address,
    success: () => {
      uni.showModal({
        title: '地址已复制',
        content: `${address}\n\n请打开地图 App 粘贴地址搜索导航`,
        confirmText: '知道了',
        showCancel: false,
      });
    },
  });
}

/**
 * 开始服务：
 * 1. 获取 GPS 位置
 * 2. 若状态为 ASSIGNED，先接单（ASSIGNED→ACCEPTED）
 * 3. GPS 签到（ACCEPTED→IN_SERVICE）
 * 4. 超距时弹警告提示（不阻断）
 */
async function handleStartService(): Promise<void> {
  if (startingService.value) return;
  const workerId = authStore.worker?.id;
  if (!workerId) {
    uni.showToast({ title: '登录状态异常，请重新登录', icon: 'none' });
    return;
  }

  startingService.value = true;
  console.info('[task-detail] handleStartService, orderId=', orderId.value);

  uni.getLocation({
    type: 'gcj02',
    success: async (res) => {
      try {
        // GPS 签到
        const checkinResult = await gpsCheckin(
          orderType.value,
          orderId.value,
          res.latitude,
          res.longitude,
          workerId,
        );

        // 超距提示（后端不阻断，仅前端提示）
        if (checkinResult.gpsRemark) {
          uni.showModal({
            title: 'GPS 距离提醒',
            content: `当前位置距服务地址较远（${checkinResult.gpsDistance ?? ''}m），已记录备注，请确认服务地址后继续。`,
            showCancel: false,
          });
        } else {
          uni.showToast({ title: '已开始服务', icon: 'success' });
        }

        console.info('[task-detail] gpsCheckin success, distance=', checkinResult.gpsDistance);
        await loadDetail();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '操作失败';
        uni.showToast({ title: msg, icon: 'none' });
        console.info('[task-detail] handleStartService failed, err=', msg);
      } finally {
        startingService.value = false;
      }
    },
    fail: (err) => {
      startingService.value = false;
      console.info('[task-detail] getLocation failed, err=', JSON.stringify(err));

      // 开发/模拟环境：提供模拟坐标继续完成签到流程
      // 模拟坐标：北京市朝阳区（与测试订单地址同区）
      const MOCK_LAT = 39.9219;
      const MOCK_LNG = 116.4434;

      uni.showModal({
        title: '无法获取位置',
        content: '请授权位置权限后重试。\n\n如在微信开发者工具模拟器中测试，可点「模拟签到」使用北京朝阳区坐标继续流程。',
        confirmText: '模拟签到',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            console.info('[task-detail] using mock location for dev testing, lat=', MOCK_LAT, 'lng=', MOCK_LNG);
            startingService.value = true;
            const wid = authStore.worker?.id;
            if (!wid) return;

            (async () => {
              try {
                const checkinResult = await gpsCheckin(
                  orderType.value,
                  orderId.value,
                  MOCK_LAT,
                  MOCK_LNG,
                  wid,
                );
                if (checkinResult.gpsRemark) {
                  uni.showModal({
                    title: 'GPS 距离提醒',
                    content: `当前位置距服务地址较远（${checkinResult.gpsDistance ?? ''}m），已记录备注，请确认服务地址后继续。`,
                    showCancel: false,
                  });
                } else {
                  uni.showToast({ title: '已开始服务（模拟）', icon: 'success' });
                }
                console.info('[task-detail] mock gpsCheckin success');
                await loadDetail();
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : '操作失败';
                uni.showToast({ title: msg, icon: 'none' });
                console.info('[task-detail] mock gpsCheckin failed, err=', msg);
              } finally {
                startingService.value = false;
              }
            })();
          }
        },
      });
    },
  });
}
</script>

<style scoped>
/* ===== 整体页面 ===== */
.page {
  min-height: 100vh;
  background: #f0f4f8;
  position: relative;
}

.detail-scroll {
  height: calc(100vh - 0px);
}

/* ===== 加载 ===== */
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 24rpx;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid #e0e8f5;
  border-top-color: #1677ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

/* ===== 头部蓝色卡片 ===== */
.header-card {
  background: linear-gradient(135deg, #1677ff 0%, #2d8cff 100%);
  padding: 40rpx 32rpx 36rpx;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}

.service-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
}

/* 状态标签 */
.status-tag {
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  border: 2rpx solid rgba(255,255,255,0.6);
}

.status-tag-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 500;
}

.status-tag--pending {
  background: rgba(255,255,255,0.2);
}

.status-tag--active {
  background: rgba(82, 196, 26, 0.3);
}

.status-tag--review {
  background: rgba(250, 173, 20, 0.3);
}

.status-tag--done {
  background: rgba(255,255,255,0.15);
}

.status-tag--cancelled {
  background: rgba(255,255,255,0.1);
}

.order-no {
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
  display: block;
  margin-bottom: 8rpx;
}

.appoint-time {
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
  display: block;
}

/* ===== 客户联系条 ===== */
.contact-bar {
  background: #ffffff;
  margin: 0 24rpx;
  margin-top: -20rpx;
  border-radius: 16rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.08);
}

.contact-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.contact-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #e8f0fe;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 36rpx;
}

.contact-phone {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
  letter-spacing: 2rpx;
}

.contact-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.contact-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-btn--nav {
  background: #e3f2fd;
}

.contact-btn--call {
  background: #e8f5e9;
}

.contact-btn-icon {
  font-size: 32rpx;
}

/* ===== 信息卡 ===== */
.info-card {
  background: #ffffff;
  margin: 20rpx 24rpx 0;
  border-radius: 16rpx;
  padding: 0 0 8rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  overflow: hidden;
}

.card-section-title {
  padding: 28rpx 32rpx 20rpx;
  border-bottom: 1rpx solid #f0f4f8;
}

.section-title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a2e;
}

.info-row {
  display: flex;
  padding: 20rpx 32rpx;
  align-items: flex-start;
}

.info-label {
  font-size: 26rpx;
  color: #888;
  width: 200rpx;
  flex-shrink: 0;
  line-height: 1.6;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
  line-height: 1.6;
}

.address-value {
  word-break: break-all;
}

.remark-value {
  word-break: break-all;
}

.divider {
  height: 1rpx;
  background: #f0f4f8;
  margin: 4rpx 32rpx;
}

/* 代下单标签行 */
.proxy-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 32rpx 8rpx;
}

.proxy-desc {
  font-size: 22rpx;
  color: #999;
}

.proxy-badge {
  display: inline-flex;
  padding: 4rpx 16rpx;
  background: #fff3e0;
  border-radius: 8rpx;
}

.proxy-badge-text {
  font-size: 22rpx;
  color: #e65100;
  font-weight: 500;
}

/* ===== 时间轴 ===== */
.timeline {
  padding: 8rpx 32rpx 16rpx;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  position: relative;
  padding-bottom: 0;
}

.timeline-item--has-line {
  margin-bottom: 0;
}

/* 节点圆圈 */
.timeline-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 6rpx;
  position: relative;
  z-index: 1;
}

.timeline-dot--done {
  background: #1677ff;
}

.timeline-dot--active {
  background: #ffffff;
  border: 4rpx solid #1677ff;
}

.dot-active-inner {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #1677ff;
}

.timeline-dot--pending {
  background: #ffffff;
  border: 4rpx solid #d0d9e8;
}

.dot-check {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 700;
}

/* 竖向连接线（绝对定位，挂在 timeline-item 上） */
.timeline-line {
  position: absolute;
  left: 21rpx;
  top: 50rpx;
  width: 4rpx;
  height: calc(100% - 6rpx);
  min-height: 48rpx;
}

.timeline-line--done {
  background: #1677ff;
}

.timeline-line--pending {
  background: #d0d9e8;
}

/* 节点文字内容 */
.timeline-content {
  flex: 1;
  padding: 4rpx 0 40rpx;
}

.node-label {
  font-size: 28rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 6rpx;
}

.node-label--done {
  color: #1677ff;
}

.node-label--active {
  color: #1677ff;
  font-weight: 700;
}

.node-label--pending {
  color: #bbb;
}

.node-desc {
  font-size: 24rpx;
  color: #999;
  display: block;
  line-height: 1.5;
}

.node-time {
  font-size: 22rpx;
  color: #bbb;
  display: block;
  margin-top: 4rpx;
}

/* ===== 作业记录 ===== */
.photo-group {
  padding: 16rpx 32rpx;
}

.photo-group-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.photo-seq-badge {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-seq-badge--pending {
  background: #d0d9e8;
}

.photo-seq-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 600;
}

.photo-group-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.photo-upload-area {
  width: 160rpx;
  height: 160rpx;
  border: 3rpx dashed #c8d6e8;
  border-radius: 12rpx;
  background: #f8faff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.photo-upload-area--disabled {
  background: #f5f5f5;
  border-color: #e0e0e0;
  opacity: 0.7;
  pointer-events: none;
}

.photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-camera-icon {
  font-size: 48rpx;
  filter: grayscale(1);
  opacity: 0.4;
}

.photo-disabled-tip {
  font-size: 20rpx;
  color: #bbb;
  text-align: center;
}

/* ===== 底部安全区 ===== */
.bottom-spacer {
  height: 160rpx;
}

/* ===== 底部固定按钮 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.08);
}

.bottom-tip-row {
  text-align: center;
  margin-bottom: 16rpx;
}

.bottom-tip-text {
  font-size: 24rpx;
  color: #fa8c16;
}

.start-btn {
  width: 100%;
  height: 96rpx;
  background: #1677ff;
  border-radius: 48rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
}

.start-btn::after {
  display: none;
}

.start-btn[disabled] {
  background: #91beff;
}

/* 「立即接单」按钮：绿色，区别于蓝色「开始服务」 */
.start-btn--accept {
  background: #52c41a;
}

.start-btn--accept[disabled] {
  background: #95de64;
}

.start-btn-text {
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
}

.bottom-bar--info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-info-text {
  font-size: 26rpx;
  color: #888;
}
</style>
