# 订单相关计划：执行顺序、门禁与第 3 步（员工统计 / 改派）

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-13  
> 性质：编排 / 门禁 + **第 3 步实现计划**（员工状态文案、评分/单量、今日完成、改派）  
> 关联：
> 1. [`order-status-labels-consolidate.md`](./order-status-labels-consolidate.md)（文案 / 筛选）
> 2. [`order-service-progress.md`](./order-service-progress.md)（详情服务进度）
> 3. **本文第 3 步**（须等 1、2 完成后再执行）

---

## 给执行本文件的 AI（硬规则）

**被 `@plan/order-plans-execution-order.md` 要求「执行」时，先检查顺序，再决定能不能改代码。**

1. 按下文「完成判定」检查第 1 步、第 2 步是否已落地。
2. **按顺序拦截（未完成则禁止实现第 3 步，也不要去实现第 1 / 第 2 步的代码）：**
   - 第 1 步未完成 → **停，不改代码**。回复：请先 `@plan/order-status-labels-consolidate.md` 并按该文执行；执行时跳过时间轴（见「第 1 步注意」）。
   - 第 1 步已完成、第 2 步未完成 → **停，不改代码**。回复：请先 `@plan/order-service-progress.md` 并按该文执行。
   - 第 1、2 步都已完成、第 3 步未完成 → **才允许改代码**，且只实现本文「第 3 步」。不要回头改文案计划的时间轴、也不要重做进度计划。
   - 三步都已完成 → **停**。回复：三步均已落地，本文件没有更多可执行项。
3. 即使用户说「顺便把文案/进度也做了」，只要当前任务是执行**本文件**且第 1 或第 2 步未完成，仍只提示去 `@` 对应文档，不写那些功能的代码。

---

## 执行顺序（必须）

```
第 1 步  order-status-labels-consolidate.md
         （列表角标 / Tab / 端内常量；跳过时间轴）
            ↓
第 2 步  order-service-progress.md
         （创建写首条 log、详情 progress、三端时间轴改吃接口）
            ↓
第 3 步  本文「第 3 步」
         （员工统计口径、管理端今日完成、改派、评分/总单数回写）
```

**第 1、2 步没有接口级硬依赖，但有文件交叉。** 一人执行时按此顺序。  
第 3 步依赖第 2 步的 `order_status_logs`（完成服务时间、改派写入 log、管理端进度展示）。

---

## 为什么先文案、后进度、再统计/改派

- 文案计划几乎只动前端常量、列表角标、筛选 Tab，不碰接口和状态机。
- 进度计划要改下单写 log、详情按 JWT 组装 `progress`、三端时间轴。
- 时间轴最终由进度计划删除本地节点、改为消费 `progress`。文案计划若先改时间轴，进度一上来会清掉。
- 统计「今日已完成」按完成服务的服务器日期，完成时间来自 `order_status_logs`（`IN_SERVICE → PENDING_REVIEW`）。改派要写 log、管理端进度要能看出由谁改给谁，都建立在第 2 步的 progress 组装器上。

两份前置计划的产品分层不冲突：

| 层 | 负责文档 | 例子（待评价） |
|----|----------|----------------|
| 列表角标 / Tab | 文案计划 | 居民「待反馈」，员工「待评价」 |
| 详情进度节点句 | 进度计划 | 「服务已完成，待您评价」 |

居民列表把前三态折成「待服务」，进度轴仍是 6 步，这是有意分层。

---

## 第 1 步注意（文案计划）

按 [`order-status-labels-consolidate.md`](./order-status-labels-consolidate.md) 执行，并叠加：

**跳过时间轴（该步不要改）：**

- [`apps/miniapp-customer/src/components/OrderStatusTimeline.vue`](../apps/miniapp-customer/src/components/OrderStatusTimeline.vue)
- 员工 [`task-detail/index.vue`](../apps/miniapp-worker/src/pages/task-detail/index.vue) 里的 `timelineNodes`

只改列表、筛选、详情**头图角标**。员工详情头图「待服务」→「已派单 / 已接单」属于第 1 步。

**统计常量不要锁死成最终语义：**  
该文附录 `WORKER_DONE_STATUSES = ['REVIEWED']` 与第 3 步「今日已完成 = 完成服务（待评价+已评价）」不一致。第 1 步若抽取常量，仅作收口，**不要把首页/我的统计改成最终口径**（留给第 3 步）。

---

## 第 2 步注意（进度计划）

按 [`order-service-progress.md`](./order-service-progress.md) 执行，并叠加：

进度计划「明确不做」里「员工端继续折叠已派单+已接单」视为**笔误**。  
以该文**设计结论第 1 条**为准：员工进度轴 **6 步全量**，不再把已派单+已接单折成一步。不改状态机枚举。

第 2 步仍**不做改派**。第 3 步仅允许未接单的 `ASSIGNED` 订单换人，状态保持 `ASSIGNED`；改派后管理端「已派单」要能看出由谁改派给谁，属于第 3 步对组装器的增量。

---

## 交叉文件（第 1、2 步禁止同时改）

| 文件 | 第 1 步 | 第 2 步 |
|------|---------|---------|
| 居民 `OrderStatusTimeline.vue` | **不改** | 删除本地节点，改吃 `progress` |
| 居民 `order-detail/index.vue` | 头图角标 / tip / 取消评价条件 | 把 `progress` 传给时间轴 |
| 员工 `task-detail/index.vue` | 头图角标（已派单/已接单） | 删 `timelineNodes`，改吃 `progress` |
| 员工 `tasks` / 居民 `orders` 列表 | 角标 + Tab | 不改（列表不返回 `progress`） |

---

## 完成判定（检查用，不靠口头）

### 第 1 步完成（须同时满足）

- 存在 [`apps/miniapp-customer/src/constants/order-status.ts`](../apps/miniapp-customer/src/constants/order-status.ts)
- 存在 [`apps/miniapp-worker/src/constants/order-status.ts`](../apps/miniapp-worker/src/constants/order-status.ts)
- 居民 [`pages/orders/index.vue`](../apps/miniapp-customer/src/pages/orders/index.vue) 的筛选/角标从该常量 import，页面内无第二套 `PENDING_ASSIGN: '...'` 类 map
- 员工 [`pages/tasks/index.vue`](../apps/miniapp-worker/src/pages/tasks/index.vue) 的 pill/角标从该常量 import
- 员工详情头图：`ASSIGNED` → 已派单，`ACCEPTED` → 已接单（不再写成「待服务」）

时间轴仍用本地节点 **不算** 第 1 步失败。

### 第 2 步完成（须同时满足）

- 保洁/废品/家政 **创建订单** 与插单同一事务写入首条 `order_status_logs`（`from_status = NONE`）
- `GET /cleaning-orders/:id`、`GET /recycling-orders/:id`、`GET /consult-orders/:id` **详情**返回 `progress`；对应**列表**接口不返回 `progress`
- 居民保洁/废品/家政详情时间轴消费 `progress`（家政居民端固定 3 步）
- 员工保洁/废品详情已删除本地 `timelineNodes`，改用 `progress`（6 步）
- 管理端保洁/废品详情改用 `progress`；管理端家政跟进流水未改成三步轴

### 第 3 步完成（须同时满足）

- 管理端员工列表列名为「今日完成」；数字 = 该员工今天完成服务的保洁+废品单数
- 员工首页双卡为「待办 / 今日已完成」；「我的」为「今日已完成 / 累计已完成」；两边「今日已完成」同数
- 完成服务后 `Worker.totalOrders` +1；评价后重算 `Worker.rating`；无评价保持 5.0
- 管理端详情完成率为百分比；分母 0 显示 —
- 管理端仅可对员工尚未接单的 `ASSIGNED` 保洁、废品单改派；`ACCEPTED` 及之后不能改派；新员工状态仍为 `ASSIGNED`
- 居民端、员工端进度轴不出现改派节点；管理端能看出由谁改派给谁
- 改派后旧员工列表/详情看不到该单；新员工出现在待接单

---

## 检查后对用户说什么（模板）

**第 1 步未完成：**

> 请先执行 [`plan/order-status-labels-consolidate.md`](./order-status-labels-consolidate.md)。  
> 执行时跳过时间轴（`OrderStatusTimeline.vue`、员工 `timelineNodes`），只改列表/筛选/头图角标。  
> 第 3 步（统计/改派）现在不能做。

**第 1 步完成、第 2 步未完成：**

> 文案计划已落地。请接着执行 [`plan/order-service-progress.md`](./order-service-progress.md)。  
> 员工进度轴按 6 步全量，不要折叠已派单+已接单。  
> 第 3 步（统计/改派）现在不能做。

**第 1、2 步完成、第 3 步未完成：**

> 前两步已落地。开始按本文「第 3 步」实现员工统计口径、今日完成、评分/总单数回写与改派。

**三步都完成：**

> 顺序内的三步都已落地。本文件没有更多可执行项。员工空闲/服务中自动切换仍不做。

---

# 第 3 步：员工统计口径、今日完成、改派

> 只统计保洁 + 废品。家政不计入任何员工指标。  
> 未单独约定时区时，一律用**服务器日期时间**。  
> 项目未上线，**不回填历史单**。  
> 建议能现查订单表 / `order_status_logs` 的指标不要靠易漂移的计数器；改派换 `workerId` 后数字自然正确。评分仍在评价时回写。

---

## 3.1 问题基线

- [`workers/index.vue`](../apps/admin/src/views/workers/index.vue) 列表：状态 / 评分（总单数）/ 今日订单。状态可手改，但接单/服务**不会**自动改 `Worker.status`。
- `Worker.rating` 默认 5.0、`totalOrders` 默认 0：**完成服务、提交评价都不回写**。
- 管理端「今日订单」、员工首页/「我的」今日统计目前都按 **`appointDate` = 今天**，且已完成只算 `REVIEWED`。
- 编辑弹窗把 `IDLE` 标成「在职」，列表标成「空闲」。
- 派单只能在 `PENDING_ASSIGN`；已派单/已接单不能换人。取消也只允许待派单。
- 详情完成率写死：`totalOrders > 0 ? '100%' : '—'`。

---

## 3.2 设计结论（已拍板）

### 状态文案（做）与自动切换（不做）

- 列表、新增、编辑统一：**空闲** = `IDLE`，**服务中** = `BUSY`。编辑弹窗去掉「在职」。
- **不**在签到/完成时自动改 `Worker.status`。记下来，后续另议。

### 评分

- 居民提交评价时重算该员工全部保洁+废品评价的**算术平均**，保留 1 位小数，写回 `Worker.rating`。
- 尚无评价：保持 **5.0**。
- 评价不改变「今日已完成」（今日已完成只看完成服务动作）。

### 总单数 / 累计已完成

- 员工点 **完成服务**（`IN_SERVICE → PENDING_REVIEW`）时计入。
- **待评价 + 已评价**都算已完成。居民评价不再 +1。
- 管理端评分括号里的「N 单」、详情「累计完成」、员工「我的」累计已完成，是同一个数。

### 完成率（仅管理端详情）

- 公式：总单数 / 总接单数，展示百分比（整数即可）。
- 总接单数 = 该员工当前名下、曾经进入过 `ACCEPTED` 且仍挂在该员工上的保洁+废品：`ACCEPTED` + `IN_SERVICE` + `PENDING_REVIEW` + `REVIEWED`。
- **已派未接（`ASSIGNED`）不算**。改派走的单随 `workerId` 离开，旧员工分母立刻少这单。
- 分母为 0：显示 **—**。不要再写死 100%。

### 员工端卡片与命名

| 位置 | 左卡 | 右卡 |
|------|------|------|
| 首页 | **待办** | **今日已完成** |
| 「我的」 | **今日已完成**（与首页同名同数） | **累计已完成** |
| 管理端员工列表 | 评分（总单数） | **今日完成**（与员工端今日已完成同一口径） |

不要再用「今日订单」这个名字。

### 待办

- 已接单且未完成服务：`ACCEPTED` + `IN_SERVICE`。
- **过期算**（`appointDate` 早于今天仍未完成）。
- 已取消不算；改派走的不算（`workerId` 已换）。
- 已派未接是首页「待接单」分区，**不计入待办**。

### 今日已完成 / 管理端今日完成

- 不管预约哪天，只要员工**今天**点了完成服务就 +1（看 `order_status_logs`：`toStatus = PENDING_REVIEW` 且 `createdAt` 为服务器今天）。
- 过期单今天补做完 → **算**今日完成。
- 昨天完成、今天才评价 → **不算**今日完成。
- 改派、接单 **都不改** 今日完成（改派发生在完成服务之前）。

### 统计卡片交互

- 首页和「我的」中的统计卡片仅展示数字，不设置点击事件，不跳转任务列表。

### 改派（方案 A）

- **谁**：仅管理端保洁/废品订单页；有该页菜单权限即可。不单独做「改派」权限点。
- **何时**：仅当前为 `ASSIGNED`（员工尚未接单）时允许。`ACCEPTED` 及之后全部禁止。不能改派给当前同一人。
- **技能**：这期不校验。
- **结果**：订单状态保持 **已派单**（`ASSIGNED`），新员工必须自己接单。旧员工立刻看不到该单；新员工出现在待接单/任务列表。
- **统计时点**：`ASSIGNED` 尚未计入待办、今日完成、累计/总单数或总接单数，因此改派本身不改变任何员工统计；新员工总接单数在他自己接单后才计入。
- **进度**：居民、员工进度轴 **不加**改派节点（改派后当前停在「已派单」）。管理端 6 步轴不变，在「已派单」操作信息写清「服务人员由{旧员工}变更为{新员工}（管理员改派）」，或详情另附改派记录。不新增状态枚举。

改派与各指标：

| 事件 | 待办 | 今日完成 | 累计 / 总单数 | 总接单数 |
|------|------|----------|---------------|----------|
| 已派单改派 | 不变 | 不变 | 不变 | 不变 |
| 新员工接单 | +1 | 不变 | 不变 | +1 |
| 完成服务 | −1 | 若是今天则 +1 | +1 | 不变 |
| 居民评价 | 不变 | 不变 | 不变 | 不变 |

从已派单改派：旧员工今日完成/待办/总接单数本来就没这单，不要做成无条件 −1。

---

## 3.3 后端

### 状态记录

改派不新增状态机转移：仅在 `ASSIGNED` 状态换人，订单状态保持不变；更新 `workerId` 的同时仍写一条 `ASSIGNED → ASSIGNED` log（便于管理端展示），备注标明改派。

与员工接单竞态：谁先成功谁算；事务内再次校验当前状态和旧 `workerId`。若员工已接单变成 `ACCEPTED`，改派必须失败。

### 改派 API

保洁、废品各一条，例如 `POST /cleaning-orders/:id/reassign`、`POST /recycling-orders/:id/reassign`。

Body：`workerId`（新员工）、`operatorId`（当前管理员）。  
事务内：校验当前状态严格等于 `ASSIGNED`、旧员工 ≠ 新员工、新员工存在 → 更新 `workerId`（状态不变）→ 写 `order_status_logs`（`ASSIGNED → ASSIGNED`，remark 含旧/新员工 id 或姓名）。

旧员工再请求该单详情：按 `workerId` 校验，返回 404 或无权限，避免残留页还能接单/签到。

### 评分 / 总单数

- [`review.service.ts`](../apps/server/src/modules/review/review.service.ts) `create`：评价写入同一事务内，按该员工全部 `reviews` 重算平均分，更新 `Worker.rating`。
- 保洁/废品 `completeOrder`：同一事务内 `totalOrders += 1`（或完成率/累计一律现查 `PENDING_REVIEW+REVIEWED`，二选一，推荐完成率与列表统计现查，`totalOrders` 仍 +1 以保持字段可用）。

### 员工列表 `todayOrders` → 今日完成

[`worker.service.ts`](../apps/server/src/modules/worker/worker.service.ts) `findAll` 不再按 `appointDate` 计今日订单。改为：当前页员工、保洁+废品、`order_status_logs.toStatus = PENDING_REVIEW` 且时间为服务器今天。字段可保留 `todayOrders` 以免大改 DTO，但语义是今日完成；前端列名用「今日完成」。

详情 `GET /workers/:id` 一并返回今日完成（不要再靠列表行拼回去）。完成率可详情现算，或列表不带、仅详情带。

### 员工端统计（可复用列表或加轻量接口）

首页/「我的」不要再拉 pageSize=100 再在前端按预约日过滤。

| 指标 | 查询 |
|------|------|
| 待办 | `workerId` + `status in (ACCEPTED, IN_SERVICE)`，不限日期 |
| 今日已完成 | 该员工今天 `PENDING_REVIEW` 转移 log 对应的订单 |
| 累计已完成 | `workerId` + `status in (PENDING_REVIEW, REVIEWED)` |

可继续用现有订单列表 API 加筛选；若 log 不好从列表表达，允许加员工统计聚合接口。不要把 `progress` 塞进列表。

### 进度组装器（第 2 步已有，本步增量）

- 居民 / 员工：忽略改派 log，节点集合仍 6 步；改派后当前为 `ASSIGNED`。
- 管理端：节点仍 6 步；`ASSIGNED` 的 `message` 若存在改派 log，用「服务人员由{旧}变更为{新}（管理员改派）」（可取最后一次）。不要给管理端多插第七个节点。

---

## 3.4 前端

### 管理端员工 [`workers/index.vue`](../apps/admin/src/views/workers/index.vue)

- 列名「今日订单」→「今日完成」；详情字段同步改名。
- 编辑「在职」→「空闲」。
- 完成率按接口百分比；0 分母显示 —。
- 投诉列表等其它区块不在本步范围。

### 管理端保洁 / 废品订单

- 仅 `ASSIGNED` 提供「改派」（可复用现有选人弹窗）。
- `PENDING_ASSIGN` 仍用「派单」；`ACCEPTED` 及之后无改派。
- 详情 progress 能看到改派信息（后端已组装则只渲染）。

### 员工首页 [`index/index.vue`](../apps/miniapp-worker/src/pages/index/index.vue)

- 双卡文案：待办 / 今日已完成。
- 待接单分区逻辑不变（`ASSIGNED`）。
- 两张统计卡片均不可点击。

### 员工「我的」[`mine/index.vue`](../apps/miniapp-worker/src/pages/mine/index.vue)

- 双卡：今日已完成 / 累计已完成。
- 评分旁单数用累计已完成（`totalOrders`）。

### 员工任务列表

- 保留任务页原有状态筛选，不再从首页/「我的」统计卡片带入筛选。

---

## 3.5 明确不做（第 3 步）

- 员工 `IDLE` / `BUSY` 随接单、签到、完成自动切换。
- 改派校验技能、单独权限点、居民/员工进度加改派节点。
- 家政计入员工统计。
- 历史订单回填评分/总单数。
- 改第 1 步时间轴、重做第 2 步 progress 主流程。
- 管理端再做一个「今天排期已接几单」指标（若以后要，另开）。

---

## 3.6 实现待办（仅第 1、2 步已完成后执行）

1. `ASSIGNED` 同状态改派 API（保洁/废品）+ 旧员工详情鉴权
2. `completeOrder` 回写 `totalOrders`；`review.create` 回写 `rating`
3. 员工列表/详情：今日完成现查 log；完成率现算；列名与编辑文案
4. 进度组装器：管理端 `ASSIGNED` 展示改派；居民/员工过滤
5. 管理端保洁/废品改派入口
6. 员工首页 / 「我的」卡片文案与统计口径（卡片不设置点击事件）
7. 单测：仅 `ASSIGNED` 可改派、`ACCEPTED` 及之后改派失败、评价更新评分、完成服务 +1、今日完成按完成日不按预约日

---

## 3.7 验收

- 新员工无评价：评分 5.0（0 单）；完成一单未评价：总单数 1、完成率分母含该单；评价 3 星后评分按平均更新。
- 过期已接单出现在待办；今天完成它后待办 −1、今日完成 +1、累计 +1。
- 已派未接改派：旧员工立刻看不到订单，新员工待接单可见；双方统计均不因改派变化。
- 已接单及服务中订单改派均失败。
- 居民/员工详情进度无「改派」节点；管理端能看出由谁改给谁。
- 列表/新增/编辑状态文案为空闲/服务中；员工状态不随订单自动变。
