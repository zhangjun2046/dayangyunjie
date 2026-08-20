# 订单状态文案 / 筛选收敛计划

> 存放位置：仓库根目录 [`plan/`](./)  
> 创建背景：居民端 / 员工端多处写死订单状态码与中文文案，同一端内也不一致；与 shared 规范名脱节  
> 日期：2026-08-13  
> 范围：列表角标、Tab 筛选、端内状态辅助常量；**不含**详情服务进度时间轴（见 [`order-service-progress.md`](./order-service-progress.md)）  
> 本计划只定方案与改动清单，**按本文执行时再改代码**。

与进度计划的边界：

| 主题 | 负责文档 |
|------|----------|
| 详情时间轴节点文案 / 时间 / 角色模板 | [`order-service-progress.md`](./order-service-progress.md)（后端 `progress`） |
| 列表角标、筛选 Tab、端内 badge class、可见状态集合 | **本文** |

进度计划落地后，两端本地 `timelineNodes` / `OrderStatusTimeline` 节点表应删除或改为消费 `progress`；本文不重复设计进度句。

---

## 问题基线

两端几乎未使用 `@dayangyunjie/shared` 的 `ORDER_STATUS_LABELS` / `CONSULT_STATUS_LABELS`（仅 `utils/shared-smoke.ts` 引用），状态字符串与中文在页面内各自写死。

### 规范名（shared，已有）

[`packages/shared/src/labels/index.ts`](../packages/shared/src/labels/index.ts)：

| 状态 | 规范名 |
|------|--------|
| PENDING_ASSIGN | 待派单 |
| ASSIGNED | 已派单 |
| ACCEPTED | 已接单 |
| IN_SERVICE | 服务中 |
| PENDING_REVIEW | 待评价 |
| REVIEWED | 已评价 |
| CANCELLED | 已取消 |

咨询：`FOLLOW_UP` / `FOLLOWING` / `COMPLETED` → 待跟进 / 跟进中 / 已完成。

### 现状文案对照（易踩坑）

| 状态码 | shared | 居民列表/详情角标 | 居民时间轴 | 员工列表 | 员工详情头图 |
|--------|--------|-------------------|------------|----------|--------------|
| PENDING_ASSIGN | 待派单 | 待服务 | 已下单 | — | — |
| ASSIGNED | 已派单 | 待服务 | 待服务 | 已派单 | **待服务**（与列表不一致） |
| ACCEPTED | 已接单 | 待服务 | 已接单 | 已接单 | **待服务**（与列表不一致） |
| IN_SERVICE | 服务中 | 进行中 | 服务中 | 服务中 | 服务中 |
| PENDING_REVIEW | 待评价 | 待反馈 | 待评价 | 待评价 | 待评价 |
| REVIEWED | 已评价 | 已评价（筛选 Tab 叫「已完成」） | 已评价 | 已评价 | 已评价 |

### 硬编码文件清单

**居民端 `miniapp-customer`**

| 文件 | 写死内容 |
|------|----------|
| [`pages/orders/index.vue`](../apps/miniapp-customer/src/pages/orders/index.vue) | `FILTERS_MAIN` / `FILTERS_CONSULT`；`getStatusLabel`；`getStatusClass` |
| [`pages/order-detail/index.vue`](../apps/miniapp-customer/src/pages/order-detail/index.vue) | `getStatusLabel` / `getStatusTip` / `getStatusClass`；取消/评价/投诉状态判断 |
| [`components/OrderStatusTimeline.vue`](../apps/miniapp-customer/src/components/OrderStatusTimeline.vue) | 节点 status+label、顺序 map（进度计划落地后删除） |
| [`pages/review/index.vue`](../apps/miniapp-customer/src/pages/review/index.vue) | 标题「服务已完成」 |

**员工端 `miniapp-worker`**

| 文件 | 写死内容 |
|------|----------|
| [`pages/tasks/index.vue`](../apps/miniapp-worker/src/pages/tasks/index.vue) | `statusPills`；`statusLabel`；`ASSIGNED` 接单按钮 |
| [`pages/task-detail/index.vue`](../apps/miniapp-worker/src/pages/task-detail/index.vue) | 头图 `statusTagLabel` / class；`timelineNodes`（进度计划落地后删除）；底部栏 / 作业区状态分支 |
| [`api/order.ts`](../apps/miniapp-worker/src/api/order.ts) | `WORKER_VISIBLE_STATUSES`；首页待接单 `statuses: 'ASSIGNED'` |
| [`pages/index/index.vue`](../apps/miniapp-worker/src/pages/index/index.vue) | 「待接单」文案；今日已完成 = `REVIEWED` |
| [`pages/mine/index.vue`](../apps/miniapp-worker/src/pages/mine/index.vue) | 今日已完成 = `REVIEWED` |

投诉状态（`PENDING` / `PROCESSING` / `COMPLETED`）不在本计划范围。

---

## 设计结论（已拍板）

### 1. 状态码统一，展示文案按场景分层

| 层 | 用途 | 是否跨端一致 | 放置位置 |
|----|------|--------------|----------|
| **规范名** | 管理端、日志、对内沟通、默认 fallback | 全站唯一 | `packages/shared` 现有 `ORDER_STATUS_LABELS` / `CONSULT_STATUS_LABELS` |
| **列表角标 / 筛选 Tab** | 用户一眼看懂阶段 | **按端可不同**（有意设计） | 各端 `src/constants/order-status.ts` |
| **详情进度节点句** | 时间轴说明 | **按角色必须不同** | 后端 `progress`（见进度计划） |

原则：

- **同一端、同一场景只保留一份 map**；跨端允许 intentional 差异，在常量文件注释写明。
- **禁止**把居民折叠文案（如「待服务」）写进唯一的 `ORDER_STATUS_LABELS`，以免污染管理端。
- 居民可把 `PENDING_ASSIGN + ASSIGNED + ACCEPTED` 都显示为「待服务」；员工必须拆开（对应接单 / 开始服务等操作）。

### 2. 「全部」与筛选分组不属于状态枚举

状态枚举只含真实 `OrderStatus` / `ConsultStatus`。筛选是另一套 UI 配置：

```ts
interface StatusFilterOption {
  /** 'all' | 业务 key（如 waiting）| 单状态码 */
  key: string;
  /** Tab 展示文案 */
  label: string;
  /**
   * 请求用状态列表。
   * [] 且 key==='all' →「全部」：不传 statuses，或传该端默认可见全集。
   * 多项 → 分组筛选（如居民「待服务」）。
   */
  statuses: string[];
}
```

约定：

- 「全部」**永不**进入 `ORDER_STATUS_LABELS`。
- 多状态合成 Tab 只存在于 Filter 配置，不存在于枚举。
- 请求：`statuses.length === 0`（全部）→ 不带参或带端内默认全集；否则 `statuses.join(',')`。

### 3. 各端拍板的目标文案（执行时按此统一端内）

#### 居民端 — 角标与筛选统一用这一套

保洁 / 废品：

| 用途 | 文案 | 对应状态 |
|------|------|----------|
| 筛选 / 角标 | 待服务 | `PENDING_ASSIGN` + `ASSIGNED` + `ACCEPTED` |
| 筛选 / 角标 | 进行中 | `IN_SERVICE` |
| 筛选 / 角标 | 待反馈 | `PENDING_REVIEW` |
| 角标 | 已评价 | `REVIEWED` |
| 筛选 Tab | 已评价 | `REVIEWED`（**改为与角标一致**，不再用「已完成」指 REVIEWED，避免与咨询「已完成」语义混淆；若产品坚持筛选叫「已完成」须在常量注释标明例外） |
| 筛选 / 角标 | 已取消 | `CANCELLED` |

家政咨询：与 shared 一致 — 待跟进 / 跟进中 / 已完成。

筛选 Tab 结构：

```
全部 | 待服务 | 进行中 | 待反馈 | 已评价 | 已取消   （保洁/废品）
全部 | 待跟进 | 跟进中 | 已完成                     （家政）
```

详情头图角标与列表角标**同一 map**。  
`getStatusTip`（等待上门等提示句）可同文件维护 `CUSTOMER_ORDER_STATUS_TIPS`，与角标分离。

时间轴节点名：进度计划落地前可临时对齐角标/规范名；落地后删除本地节点表。

#### 员工端 — 对齐 shared 规范名

| 状态 | 列表角标 / 详情头图 / 筛选（统一） |
|------|-----------------------------------|
| ASSIGNED | 已派单 |
| ACCEPTED | 已接单 |
| IN_SERVICE | 服务中 |
| PENDING_REVIEW | 待评价 |
| REVIEWED | 已评价 |
| CANCELLED | 已取消 |

**优先修**：详情头图当前把 `ASSIGNED`/`ACCEPTED` 写成「待服务」，执行时改为与列表一致。

筛选：`全部 | 已派单 | 已接单 | 服务中 | 待评价 | 已评价 | 已取消`（无 `PENDING_ASSIGN`）。

「今日已完成」统计继续用 `REVIEWED`，常量命名为 `WORKER_DONE_STATUSES = ['REVIEWED']`。  
首页「待接单」分区对应查询 `ASSIGNED`，常量 `WORKER_PENDING_ACCEPT_STATUSES = ['ASSIGNED']`。

---

## 目标结构

```
packages/shared/src/
  enums/          # OrderStatus / ConsultStatus（不动语义）
  labels/         # 规范名 ONLY（可微调措辞，不作居民折叠源）

apps/miniapp-customer/src/constants/order-status.ts   # 新建
apps/miniapp-worker/src/constants/order-status.ts     # 新建
```

### 居民端常量文件建议导出

- `CUSTOMER_ORDER_BADGE_LABELS` / `CUSTOMER_CONSULT_BADGE_LABELS`
- `CUSTOMER_ORDER_STATUS_TIPS`（详情提示句）
- `FILTERS_MAIN` / `FILTERS_CONSULT`（含 `all`）
- `getOrderBadgeLabel(status, orderKind)` / `getOrderBadgeClass(status)`
- 可选：`canCancelOrder` / `canReviewOrder` / `canComplaintOrder`（从详情页抽出的状态判断）

### 员工端常量文件建议导出

- `WORKER_ORDER_BADGE_LABELS`（与 shared 规范名一致即可，甚至直接 re-export + 注释）
- `STATUS_PILLS`（含 `all`）
- `WORKER_VISIBLE_STATUSES`
- `WORKER_PENDING_ACCEPT_STATUSES` / `WORKER_DONE_STATUSES`
- `getOrderBadgeLabel` / `getOrderBadgeClass`
- 可选：`workAreaState(status)` / `hasBottomBar(status)`（从详情页抽出）

页面与 API **只引用常量**，禁止再内联 `Record<string, string>` 状态 map。

---

## 前端改动要点（按文件）

### 居民端

1. **新建** `apps/miniapp-customer/src/constants/order-status.ts`（文案与筛选以本文「目标文案」为准）。
2. **`pages/orders/index.vue`**：删除本地 `FILTERS_*`、`getStatusLabel`、`getStatusClass`，改为 import。
3. **`pages/order-detail/index.vue`**：角标 / tip / class / 取消·评价·投诉条件改为 import；勿再复制 map。
4. **`components/OrderStatusTimeline.vue`**：
   - 短期：节点 label 与顺序可从常量引用，避免第三套方言；
   - 中期（进度计划）：改为消费详情 `progress`，删除本地节点表。
5. **`pages/review/index.vue`**：标题可留页面内，或引用 tip 常量；非必须。

### 员工端

1. **新建** `apps/miniapp-worker/src/constants/order-status.ts`。
2. **`pages/tasks/index.vue`**：`statusPills` + `statusLabel` + badge class 映射改为 import。
3. **`pages/task-detail/index.vue`**：头图 label/class 用同一 map（**先修 ASSIGNED/ACCEPTED 文案**）；底部栏 / 作业区判断可抽函数；`timelineNodes` 等进度计划删除。
4. **`api/order.ts`**：`WORKER_VISIBLE_STATUSES`、待接单 `ASSIGNED` 查询改为引用 constants。
5. **`pages/index/index.vue` / `pages/mine/index.vue`**：`REVIEWED` 过滤改为 `WORKER_DONE_STATUSES`。

### shared

- **默认不改**枚举与规范名。
- 仅当产品明确要求改规范名措辞时再改 `ORDER_STATUS_LABELS`；改后管理端会一并变化，需同步验收。
- 可选：导出 `ORDER_STATUS_ORDER` 数组供临时时间轴算序（进度计划落地后可删）。

### 明确不做

- 不改状态机、不改后端枚举值。
- 不把「全部」写入 shared labels。
- 不在本计划实现详情 `progress`（另文）。
- 不统一投诉状态文案。
- 不强行让居民列表角标与 shared 规范名逐字相同。

---

## 实现待办（建议顺序）

1. **端内文案拍板落地到常量文件**（先建文件、不改页面行为以外的产品决策）  
   - 居民：角标与筛选统一；`REVIEWED` 筛选与角标用词对齐。  
   - 员工：详情头图改为与列表一致（已派单 / 已接单）。
2. **居民端**：`orders` + `order-detail` 改为引用 `constants/order-status.ts`。
3. **员工端**：`tasks` + `task-detail` 角标/筛选引用常量；修头图不一致。
4. **员工端**：`api/order.ts` + 首页/我的统计常量引用。
5. **时间轴**：短期可选对齐；正式删除等 [`order-service-progress.md`](./order-service-progress.md) 执行。
6. 冒烟：两列表筛选、角标、详情头图、员工接单按钮、居民取消/评价入口仍正确。

---

## 验收

- 居民端：列表角标文案 === 详情头图文案 === 对应筛选 Tab 语义；无「筛选已完成 / 角标已评价」类混用（除非常量注释标明产品例外）。
- 员工端：列表与详情头图对同一 `status` 文案一致；筛选 pill 与角标一致。
- 「全部」Tab 能拉全量（或端内可见全集）；不出现名为「全部」的伪状态码。
- 页面内无第二份 `PENDING_ASSIGN: '...'` 类 map（时间轴在进度迁移前可暂留一处，迁移后清零）。
- shared `ORDER_STATUS_LABELS` 仍为规范名；居民折叠文案只存在于 customer constants。
- 与进度计划衔接：详情进度节点不依赖本文 badge map；本文不阻进度计划并行。

---

## 附录：建议常量骨架（实现时复制微调）

### 居民 `order-status.ts`（示意）

```ts
export const FILTERS_MAIN = [
  { key: 'all', label: '全部', statuses: [] as string[] },
  { key: 'waiting', label: '待服务', statuses: ['PENDING_ASSIGN', 'ASSIGNED', 'ACCEPTED'] },
  { key: 'IN_SERVICE', label: '进行中', statuses: ['IN_SERVICE'] },
  { key: 'PENDING_REVIEW', label: '待反馈', statuses: ['PENDING_REVIEW'] },
  { key: 'REVIEWED', label: '已评价', statuses: ['REVIEWED'] },
  { key: 'CANCELLED', label: '已取消', statuses: ['CANCELLED'] },
];

export const FILTERS_CONSULT = [
  { key: 'all', label: '全部', statuses: [] as string[] },
  { key: 'FOLLOW_UP', label: '待跟进', statuses: ['FOLLOW_UP'] },
  { key: 'FOLLOWING', label: '跟进中', statuses: ['FOLLOWING'] },
  { key: 'COMPLETED', label: '已完成', statuses: ['COMPLETED'] },
];

/** 居民视角角标（有意折叠前三态为「待服务」） */
export const CUSTOMER_ORDER_BADGE_LABELS: Record<string, string> = {
  PENDING_ASSIGN: '待服务',
  ASSIGNED: '待服务',
  ACCEPTED: '待服务',
  IN_SERVICE: '进行中',
  PENDING_REVIEW: '待反馈',
  REVIEWED: '已评价',
  CANCELLED: '已取消',
};
```

请求时：`key === 'all'` → 不传 `status`/`statuses`；否则传 `statuses.join(',')`（保持现有 API 字段名）。

### 员工 `order-status.ts`（示意）

```ts
export const WORKER_VISIBLE_STATUSES = [
  'ASSIGNED', 'ACCEPTED', 'IN_SERVICE', 'PENDING_REVIEW', 'REVIEWED', 'CANCELLED',
] as const;

export const WORKER_PENDING_ACCEPT_STATUSES = ['ASSIGNED'] as const;
export const WORKER_DONE_STATUSES = ['REVIEWED'] as const;

export const STATUS_PILLS = [
  { key: 'all', label: '全部', statuses: [] as string[] },
  { key: 'ASSIGNED', label: '已派单', statuses: ['ASSIGNED'] },
  { key: 'ACCEPTED', label: '已接单', statuses: ['ACCEPTED'] },
  { key: 'IN_SERVICE', label: '服务中', statuses: ['IN_SERVICE'] },
  { key: 'PENDING_REVIEW', label: '待评价', statuses: ['PENDING_REVIEW'] },
  { key: 'REVIEWED', label: '已评价', statuses: ['REVIEWED'] },
  { key: 'CANCELLED', label: '已取消', statuses: ['CANCELLED'] },
];

/** 与 shared 规范名对齐；详情头图必须与此一致 */
export const WORKER_ORDER_BADGE_LABELS: Record<string, string> = {
  ASSIGNED: '已派单',
  ACCEPTED: '已接单',
  IN_SERVICE: '服务中',
  PENDING_REVIEW: '待评价',
  REVIEWED: '已评价',
  CANCELLED: '已取消',
};
```
