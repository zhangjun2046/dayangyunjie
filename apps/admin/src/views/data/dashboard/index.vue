<template>
  <div class="dashboard-page">
    <!-- 顶部工具栏 -->
    <div class="dashboard-header">
      <h2 class="dashboard-title">数据看板</h2>
      <el-select v-model="timeRange" size="small" style="width: 88px" @change="loadAll">
        <el-option label="本日" value="day" />
        <el-option label="本周" value="week" />
        <el-option label="本月" value="month" />
      </el-select>
    </div>

    <!-- 统计卡 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6" v-for="card in statCards" :key="card.key">
        <div class="stat-card" :class="card.colorClass">
          <div class="stat-icon">
            <el-icon :size="28"><component :is="card.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ summary[card.key] ?? '—' }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表行 1：订单趋势 + 服务类型 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="15">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="card-title">订单趋势</span></template>
          <div ref="trendChartRef" class="chart-container" />
        </el-card>
      </el-col>
      <el-col :span="9">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="card-title">服务类型分布</span></template>
          <div ref="serviceChartRef" class="chart-container" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表行 2：客户满意度 + 服务时段分布 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="10">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="card-title">客户满意度</span></template>
          <div ref="ratingChartRef" class="chart-container chart-container--short" />
        </el-card>
      </el-col>
      <el-col :span="14">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="card-title">服务时段分布</span></template>
          <div ref="hourlyChartRef" class="chart-container chart-container--short" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 员工绩效排名 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-header">
          <span class="card-title">员工绩效排名</span>
          <span class="table-subtitle">{{ timeRangeLabel }}服务数据统计</span>
        </div>
      </template>
      <el-table :data="workerList" stripe style="width: 100%">
        <el-table-column label="排名" width="72" align="center">
          <template #default="{ $index }">
            <span v-if="$index < 3" class="rank-badge" :class="`rank-badge--${$index + 1}`">
              {{ $index + 1 }}
            </span>
            <span v-else class="rank-normal">{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="员工" min-width="140">
          <template #default="{ row }">
            <div class="worker-cell">
              <div class="worker-avatar">{{ row.name.charAt(0) }}</div>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="完成订单" prop="completedInRange" width="110" align="center" />
        <el-table-column label="评分" width="120" align="center">
          <template #default="{ row }">
            <span class="rating-cell">
              <el-icon color="#f5a623"><StarFilled /></el-icon>
              {{ row.rating.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="完成率" width="120" align="center">
          <template #default="{ row }">
            <el-tag
              :type="calcRate(row) >= 95 ? 'success' : calcRate(row) >= 80 ? '' : 'warning'"
              size="small"
            >
              {{ calcRate(row) }}%
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent, TooltipComponent, LegendComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ECharts } from 'echarts/core';
import { StarFilled, DataAnalysis, Clock, CircleCheck, Tickets } from '@element-plus/icons-vue';
import {
  getSummary, getOrderTrend, getServiceTypeDistribution,
  getRatingDistribution, getHourlyDistribution, getWorkerPerformance,
} from '@/api/dashboard';
import type { SummaryData, WorkerPerformanceItem } from '@/api/dashboard';

// 只注册需要的模块，减小包体
echarts.use([
  LineChart, BarChart, PieChart,
  TitleComponent, TooltipComponent, LegendComponent, GridComponent,
  CanvasRenderer,
]);

// ─── 时间范围 ─────────────────────────────────────────────────────────────────

const timeRange = ref<'day' | 'week' | 'month'>('month');

const timeRangeLabel = computed(() => ({ day: '本日', week: '本周', month: '本月' }[timeRange.value]));

/** 根据所选时间范围构建 startDate/endDate */
const buildQuery = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const endDate = fmt(now);
  let startDate: string;
  if (timeRange.value === 'day') {
    startDate = endDate;
  } else if (timeRange.value === 'week') {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(now.getDate() + diff);
    startDate = fmt(start);
  } else {
    startDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  }
  return { startDate, endDate };
};

// ─── 统计卡 ───────────────────────────────────────────────────────────────────

const summary = ref<Partial<SummaryData>>({});

const statCards = [
  { key: 'total'      as keyof SummaryData, label: '总数',   icon: DataAnalysis, colorClass: 'stat-card--blue' },
  { key: 'completed'  as keyof SummaryData, label: '已完成', icon: CircleCheck,  colorClass: 'stat-card--green' },
  { key: 'inProgress' as keyof SummaryData, label: '进行中', icon: Clock,        colorClass: 'stat-card--orange' },
  { key: 'pending'    as keyof SummaryData, label: '待接单', icon: Tickets,      colorClass: 'stat-card--purple' },
];

async function loadSummary() {
  try {
    const res = await getSummary(buildQuery());
    summary.value = res.data.data;
  } catch (e) {
    console.info('[Dashboard] loadSummary error', e);
  }
}

// ─── ECharts 实例 ─────────────────────────────────────────────────────────────

const trendChartRef   = ref<HTMLDivElement>();
const serviceChartRef = ref<HTMLDivElement>();
const ratingChartRef  = ref<HTMLDivElement>();
const hourlyChartRef  = ref<HTMLDivElement>();

let trendChart:   ECharts | null = null;
let serviceChart: ECharts | null = null;
let ratingChart:  ECharts | null = null;
let hourlyChart:  ECharts | null = null;

function initCharts() {
  if (trendChartRef.value)   trendChart   = echarts.init(trendChartRef.value);
  if (serviceChartRef.value) serviceChart = echarts.init(serviceChartRef.value);
  if (ratingChartRef.value)  ratingChart  = echarts.init(ratingChartRef.value);
  if (hourlyChartRef.value)  hourlyChart  = echarts.init(hourlyChartRef.value);
}

// ─── 订单趋势折线图 ───────────────────────────────────────────────────────────

async function loadTrendChart() {
  if (!trendChart) return;
  try {
    const res = await getOrderTrend(buildQuery());
    const { dates, cleaning, recycling, consult } = res.data.data;
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['保洁', '废品回收', '家政咨询'], bottom: 0 },
      grid: { left: 40, right: 20, top: 16, bottom: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: '保洁',    type: 'line', smooth: true, data: cleaning,  areaStyle: { opacity: 0.12 } },
        { name: '废品回收',type: 'line', smooth: true, data: recycling, areaStyle: { opacity: 0.12 } },
        { name: '家政咨询',type: 'line', smooth: true, data: consult,   areaStyle: { opacity: 0.12 } },
      ],
    }, true);
  } catch (e) {
    console.info('[Dashboard] loadTrendChart error', e);
  }
}

// ─── 服务类型环形图 ───────────────────────────────────────────────────────────

async function loadServiceChart() {
  if (!serviceChart) return;
  try {
    const res = await getServiceTypeDistribution(buildQuery());
    const items = res.data.data.data;
    serviceChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 10, top: 'center', itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
        label: { show: false },
        data: items,
      }],
    }, true);
  } catch (e) {
    console.info('[Dashboard] loadServiceChart error', e);
  }
}

// ─── 满意度水平柱状图 ─────────────────────────────────────────────────────────

async function loadRatingChart() {
  if (!ratingChart) return;
  try {
    const res = await getRatingDistribution(buildQuery());
    const items = res.data.data.data; // [{name:'5星',value:N},...]
    const names  = items.map((i) => i.name);
    const values = items.map((i) => i.value);
    const total  = values.reduce((a, b) => a + b, 0) || 1;
    ratingChart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = params[0];
          return `${p.name}：${p.value} 条（${((p.value / total) * 100).toFixed(1)}%）`;
        },
      },
      grid: { left: 60, right: 60, top: 10, bottom: 10, containLabel: true },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', data: names, axisLine: { show: false }, axisTick: { show: false } },
      series: [{
        type: 'bar',
        data: values,
        barMaxWidth: 18,
        label: {
          show: true, position: 'right',
          formatter: (p: any) => `${((p.value / total) * 100).toFixed(0)}%`,
          fontSize: 11,
        },
        itemStyle: { borderRadius: 4 },
      }],
    }, true);
  } catch (e) {
    console.info('[Dashboard] loadRatingChart error', e);
  }
}

// ─── 时段柱状图（09:00–19:00 切片） ──────────────────────────────────────────

async function loadHourlyChart() {
  if (!hourlyChart) return;
  try {
    const res = await getHourlyDistribution(buildQuery());
    const { hours, counts } = res.data.data;
    // 仅展示 09:00–19:00 共 11 个时段
    const sliceStart = 9;
    const sliceEnd   = 20;
    const sliceHours  = hours.slice(sliceStart, sliceEnd);
    const sliceCounts = counts.slice(sliceStart, sliceEnd);
    hourlyChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 40, right: 20, top: 16, bottom: 36 },
      xAxis: { type: 'category', data: sliceHours, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar',
        data: sliceCounts,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: '#1a1a2e' },
      }],
    }, true);
  } catch (e) {
    console.info('[Dashboard] loadHourlyChart error', e);
  }
}

// ─── 员工绩效表格 ─────────────────────────────────────────────────────────────

const workerList = ref<WorkerPerformanceItem[]>([]);

async function loadWorkerPerformance() {
  try {
    const res = await getWorkerPerformance(buildQuery());
    workerList.value = res.data.data.items;
  } catch (e) {
    console.info('[Dashboard] loadWorkerPerformance error', e);
  }
}

/** 完成率 = completedInRange / totalOrders * 100，最高 100 */
function calcRate(row: WorkerPerformanceItem): number {
  if (!row.totalOrders) return 0;
  return Math.min(100, Math.round((row.completedInRange / row.totalOrders) * 100));
}

// ─── 批量加载所有数据（统计卡 + 图表，响应时间切换） ──────────────────────────

async function loadAll() {
  await Promise.allSettled([
    loadSummary(),
    loadTrendChart(),
    loadServiceChart(),
    loadRatingChart(),
    loadHourlyChart(),
    loadWorkerPerformance(),
  ]);
}

// ─── 窗口自适应 ───────────────────────────────────────────────────────────────

function resizeCharts() {
  [trendChart, serviceChart, ratingChart, hourlyChart].forEach((c) => c?.resize());
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await nextTick();
  initCharts();
  console.info('[Dashboard] P5.2 mounted, loading data...');
  await loadAll();
  window.addEventListener('resize', resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  [trendChart, serviceChart, ratingChart, hourlyChart].forEach((c) => c?.dispose());
});
</script>

<style scoped lang="scss">
.dashboard-page {
  padding: 20px;
  background: #f5f6fa;
  min-height: 100%;
  box-sizing: border-box;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.dashboard-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
}

// ─── 统计卡 ──────────────────────────────────────────────────────────────────

.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

  &--blue   { border-left: 4px solid #409eff; .stat-icon { color: #409eff; background: #ecf5ff; } }
  &--orange { border-left: 4px solid #e6a23c; .stat-icon { color: #e6a23c; background: #fdf6ec; } }
  &--purple { border-left: 4px solid #9c27b0; .stat-icon { color: #9c27b0; background: #f3e5f5; } }
  &--green  { border-left: 4px solid #67c23a; .stat-icon { color: #67c23a; background: #f0f9eb; } }
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

// ─── 图表卡 ──────────────────────────────────────────────────────────────────

.chart-row {
  margin-bottom: 16px;
}

.chart-card {
  :deep(.el-card__body) {
    padding: 12px 16px 16px;
  }
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.chart-container {
  height: 260px;

  &--short {
    height: 220px;
  }
}

// ─── 员工绩效表格 ─────────────────────────────────────────────────────────────

.table-card {
  margin-bottom: 8px;
}

.table-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-subtitle {
  font-size: 12px;
  color: #909399;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #fff;

  &--1 { background: #f5a623; }
  &--2 { background: #a0a0a0; }
  &--3 { background: #cd7f32; }
}

.rank-normal {
  font-size: 13px;
  color: #606266;
}

.worker-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.worker-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #e8f4fd;
  color: #409eff;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.rating-cell {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 600;
}
</style>
