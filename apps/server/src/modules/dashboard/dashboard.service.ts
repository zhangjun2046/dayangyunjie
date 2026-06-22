import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

// ─── 返回类型 ────────────────────────────────────────────────────────────────

export interface SummaryResult {
  /** 时间范围内保洁+废品订单合计（不含家政咨询） */
  total: number;
  /** 时间范围内已完成（COMPLETED / REVIEWED） */
  completed: number;
  /** 时间范围内进行中（ACCEPTED / IN_PROGRESS） */
  inProgress: number;
  /** 时间范围内待接单（PENDING） */
  pending: number;
}

export interface OrderTrendResult {
  dates: string[];
  cleaning: number[];
  recycling: number[];
  consult: number[];
}

export interface PieItem {
  name: string;
  value: number;
}

export interface ServiceTypeDistributionResult {
  data: PieItem[];
}

export interface RatingDistributionResult {
  data: PieItem[];
}

export interface HourlyDistributionResult {
  hours: string[];
  counts: number[];
}

export interface WorkerPerformanceItem {
  workerId: number;
  name: string;
  employeeNo: string;
  totalOrders: number;
  completedInRange: number;
  rating: number;
  status: string;
}

export interface WorkerPerformanceResult {
  items: WorkerPerformanceItem[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 公开方法 ────────────────────────────────────────────────────────────────

  /**
   * 统计卡：时间范围内保洁+废品订单的总数、已完成、进行中、待接单。
   * 缺省时间范围默认统计本日（当天）数据。
   * 不含家政咨询单。
   */
  async getSummary(query: DashboardQueryDto): Promise<SummaryResult> {
    // 默认范围：本日
    const { start, end } = this.resolveRange(query, 1);
    const endNext = this.nextDay(end);

    const COMPLETED_STATUSES   = ['PENDING_REVIEW', 'REVIEWED'] as any[];
    const IN_PROGRESS_STATUSES = ['ACCEPTED', 'IN_SERVICE'] as any[];
    const PENDING_STATUSES     = ['PENDING_ASSIGN', 'ASSIGNED'] as any[];

    const [
      cleaningTotal,    recyclingTotal,
      cleaningCompleted, recyclingCompleted,
      cleaningInProgress, recyclingInProgress,
      cleaningPending,  recyclingPending,
    ] = await Promise.all([
      this.prisma.cleaningOrder.count({ where: { createdAt: { gte: start, lt: endNext } } }),
      this.prisma.recyclingOrder.count({ where: { createdAt: { gte: start, lt: endNext } } }),
      this.prisma.cleaningOrder.count({ where: { createdAt: { gte: start, lt: endNext }, status: { in: COMPLETED_STATUSES } } }),
      this.prisma.recyclingOrder.count({ where: { createdAt: { gte: start, lt: endNext }, status: { in: COMPLETED_STATUSES } } }),
      this.prisma.cleaningOrder.count({ where: { createdAt: { gte: start, lt: endNext }, status: { in: IN_PROGRESS_STATUSES } } }),
      this.prisma.recyclingOrder.count({ where: { createdAt: { gte: start, lt: endNext }, status: { in: IN_PROGRESS_STATUSES } } }),
      this.prisma.cleaningOrder.count({ where: { createdAt: { gte: start, lt: endNext }, status: { in: PENDING_STATUSES } } }),
      this.prisma.recyclingOrder.count({ where: { createdAt: { gte: start, lt: endNext }, status: { in: PENDING_STATUSES } } }),
    ]);

    const total      = cleaningTotal + recyclingTotal;
    const completed  = cleaningCompleted + recyclingCompleted;
    const inProgress = cleaningInProgress + recyclingInProgress;
    const pending    = cleaningPending + recyclingPending;

    console.info(`[Dashboard] getSummary range=${this.fmtDate(start)}~${this.fmtDate(end)} total=${total}`);
    return { total, completed, inProgress, pending };
  }

  /**
   * 订单趋势：按天返回近 N 日各类订单数量，适配 ECharts 折线图。
   * N 由 startDate/endDate 决定，缺省近 7 天。
   */
  async getOrderTrend(query: DashboardQueryDto): Promise<OrderTrendResult> {
    const { start, end } = this.resolveRange(query, 7);
    const dates = this.buildDateRange(start, end);

    const [cleaningRows, recyclingRows, consultRows] = await Promise.all([
      this.prisma.cleaningOrder.findMany({
        where: { createdAt: { gte: start, lt: this.nextDay(end) } },
        select: { createdAt: true },
      }),
      this.prisma.recyclingOrder.findMany({
        where: { createdAt: { gte: start, lt: this.nextDay(end) } },
        select: { createdAt: true },
      }),
      this.prisma.consultOrder.findMany({
        where: { createdAt: { gte: start, lt: this.nextDay(end) } },
        select: { createdAt: true },
      }),
    ]);

    const cleaningMap = this.groupByDate(cleaningRows.map((r) => r.createdAt));
    const recyclingMap = this.groupByDate(recyclingRows.map((r) => r.createdAt));
    const consultMap = this.groupByDate(consultRows.map((r) => r.createdAt));

    console.info(`[Dashboard] getOrderTrend range=${this.fmtDate(start)}~${this.fmtDate(end)}`);
    return {
      dates,
      cleaning: dates.map((d) => cleaningMap[d] ?? 0),
      recycling: dates.map((d) => recyclingMap[d] ?? 0),
      consult: dates.map((d) => consultMap[d] ?? 0),
    };
  }

  /**
   * 服务类型分布：统计时间范围内三类订单的数量占比，适配 ECharts 饼图。
   */
  async getServiceTypeDistribution(query: DashboardQueryDto): Promise<ServiceTypeDistributionResult> {
    const { start, end } = this.resolveRange(query, 30);
    const endNext = this.nextDay(end);

    const [cleaning, recycling, consult] = await Promise.all([
      this.prisma.cleaningOrder.count({ where: { createdAt: { gte: start, lt: endNext } } }),
      this.prisma.recyclingOrder.count({ where: { createdAt: { gte: start, lt: endNext } } }),
      this.prisma.consultOrder.count({ where: { createdAt: { gte: start, lt: endNext } } }),
    ]);

    console.info(`[Dashboard] getServiceTypeDistribution cleaning=${cleaning} recycling=${recycling} consult=${consult}`);
    return {
      data: [
        { name: '保洁', value: cleaning },
        { name: '废品回收', value: recycling },
        { name: '家政咨询', value: consult },
      ],
    };
  }

  /**
   * 满意度分布：统计各星级评价数量，适配 ECharts 饼图。
   * 统计范围由 startDate/endDate 控制（缺省近 30 天）。
   */
  async getRatingDistribution(query: DashboardQueryDto): Promise<RatingDistributionResult> {
    const { start, end } = this.resolveRange(query, 30);
    const endNext = this.nextDay(end);

    const rows = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { createdAt: { gte: start, lt: endNext } },
      _count: { rating: true },
    });

    // 5→1 星倒序
    const ratingMap: Record<number, number> = {};
    for (const r of rows) {
      ratingMap[r.rating] = r._count.rating;
    }

    const STARS = [5, 4, 3, 2, 1];
    console.info(`[Dashboard] getRatingDistribution rows=${rows.length}`);
    return {
      data: STARS.map((s) => ({ name: `${s}星`, value: ratingMap[s] ?? 0 })),
    };
  }

  /**
   * 时段分布：统计一天 24 小时内各时段的订单量，适配 ECharts 柱状图。
   * 保洁/废品按 appointTimeSlot 前两位小时解析；咨询单按 createdAt 小时统计。
   */
  async getHourlyDistribution(query: DashboardQueryDto): Promise<HourlyDistributionResult> {
    const { start, end } = this.resolveRange(query, 30);
    const endNext = this.nextDay(end);

    const [cleaningRows, recyclingRows, consultRows] = await Promise.all([
      this.prisma.cleaningOrder.findMany({
        where: { createdAt: { gte: start, lt: endNext } },
        select: { appointTimeSlot: true },
      }),
      this.prisma.recyclingOrder.findMany({
        where: { createdAt: { gte: start, lt: endNext } },
        select: { appointTimeSlot: true },
      }),
      this.prisma.consultOrder.findMany({
        where: { createdAt: { gte: start, lt: endNext } },
        select: { createdAt: true },
      }),
    ]);

    // 24 小时计数桶
    const counts = Array<number>(24).fill(0);

    // 保洁/废品：从 appointTimeSlot（如 "09:00-11:00" 或 "上午" 等自由格式）解析首个小时
    const extractHourFromSlot = (slot: string): number | null => {
      const match = slot.match(/^(\d{1,2})/);
      if (match) {
        const h = parseInt(match[1], 10);
        return h >= 0 && h < 24 ? h : null;
      }
      // 中文时段映射
      if (slot.includes('上午')) return 9;
      if (slot.includes('下午')) return 14;
      if (slot.includes('晚上') || slot.includes('夜间')) return 19;
      return null;
    };

    for (const row of cleaningRows) {
      const h = extractHourFromSlot(row.appointTimeSlot);
      if (h !== null) counts[h]++;
    }
    for (const row of recyclingRows) {
      const h = extractHourFromSlot(row.appointTimeSlot);
      if (h !== null) counts[h]++;
    }
    for (const row of consultRows) {
      const h = row.createdAt.getHours();
      counts[h]++;
    }

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    console.info(`[Dashboard] getHourlyDistribution total=${counts.reduce((a, b) => a + b, 0)}`);
    return { hours, counts };
  }

  /**
   * 员工绩效排名：按时间段内完成单量倒序返回所有员工绩效数据。
   */
  async getWorkerPerformance(query: DashboardQueryDto): Promise<WorkerPerformanceResult> {
    const { start, end } = this.resolveRange(query, 30);
    const endNext = this.nextDay(end);

    const workers = await this.prisma.worker.findMany({
      select: {
        id: true,
        name: true,
        employeeNo: true,
        totalOrders: true,
        rating: true,
        status: true,
      },
      orderBy: [{ totalOrders: 'desc' }, { rating: 'desc' }],
    });

    // 按员工批量查询时间段内 REVIEWED 单量（保洁+废品合计）
    const workerIds = workers.map((w) => w.id);

    const [cleaningCompleted, recyclingCompleted] = await Promise.all([
      this.prisma.cleaningOrder.groupBy({
        by: ['workerId'],
        where: {
          workerId: { in: workerIds },
          status: 'REVIEWED',
          createdAt: { gte: start, lt: endNext },
        },
        _count: { id: true },
      }),
      this.prisma.recyclingOrder.groupBy({
        by: ['workerId'],
        where: {
          workerId: { in: workerIds },
          status: 'REVIEWED',
          createdAt: { gte: start, lt: endNext },
        },
        _count: { id: true },
      }),
    ]);

    // 合并计数映射
    const completedMap: Record<number, number> = {};
    for (const r of cleaningCompleted) {
      if (r.workerId !== null) {
        completedMap[r.workerId] = (completedMap[r.workerId] ?? 0) + r._count.id;
      }
    }
    for (const r of recyclingCompleted) {
      if (r.workerId !== null) {
        completedMap[r.workerId] = (completedMap[r.workerId] ?? 0) + r._count.id;
      }
    }

    const items: WorkerPerformanceItem[] = workers.map((w) => ({
      workerId: w.id,
      name: w.name,
      employeeNo: w.employeeNo,
      totalOrders: w.totalOrders,
      completedInRange: completedMap[w.id] ?? 0,
      rating: Number((Number(w.rating) || 0).toFixed(1)),
      status: w.status,
    }));

    // 按时间段内完成单量倒序排列
    items.sort((a, b) => b.completedInRange - a.completedInRange || b.totalOrders - a.totalOrders);

    console.info(`[Dashboard] getWorkerPerformance workers=${items.length}`);
    return { items };
  }

  // ── 私有工具方法 ─────────────────────────────────────────────────────────────

  /**
   * 解析时间范围：从 DTO 中读取 startDate / endDate，
   * 若缺省则以今天为 end，end 往前 defaultDays 天为 start。
   */
  private resolveRange(
    query: DashboardQueryDto,
    defaultDays: number,
  ): { start: Date; end: Date } {
    const now = new Date();
    const end = query.endDate ? this.startOfDay(new Date(query.endDate)) : this.startOfDay(now);
    const start = query.startDate
      ? this.startOfDay(new Date(query.startDate))
      : (() => {
          const d = new Date(end);
          d.setDate(d.getDate() - (defaultDays - 1));
          return d;
        })();
    return { start, end };
  }

  /** 获取某天 00:00:00.000 UTC+8 对应的 Date */
  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** 获取本周一 00:00:00 */
  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    // 周日=0 → 上周一；其余 → 本周一
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  /** 获取下一天的 00:00:00（用于 lt 边界） */
  private nextDay(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d;
  }

  /** 格式化日期为 "YYYY-MM-DD" */
  private fmtDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** 构建从 start 到 end（含）的日期字符串数组 */
  private buildDateRange(start: Date, end: Date): string[] {
    const dates: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(this.fmtDate(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  /** 将 Date 数组按日期分组计数，返回 { "YYYY-MM-DD": count } */
  private groupByDate(dates: Date[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const d of dates) {
      const key = this.fmtDate(d);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }
}
