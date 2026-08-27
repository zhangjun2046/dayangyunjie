# 管理端业务字典

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-14  
> 性质：新功能计划（本步只建字典能力 + 管理端配置页；**不改**预约/评价/投诉的现有读写路径）  
> 本计划只定方案与改动清单，**按本文执行时再改代码**。

后续怎么用、哪些功能建议进字典：见 **第 7 节**。本次执行仍只建字典能力，不接调用方。

---

## 给执行本文件的 AI（硬规则）

1. **只做本文「本次落地」**：表、种子、后端 CRUD、公开查询、管理端页面与菜单权限。  
2. **禁止**把预约页、评价页、投诉提交、下单 DTO 改成读字典。接入是后续计划。  
3. **禁止**把 `OrderStatus` / `WorkerStatus` / `ComplaintStatus` 做成字典类型。  
4. 字典 **type 由代码定义**，管理端不能新增类型；只能增删改某类型下的**项**。  
5. 业务表将来只存 `value` 快照，**不要**外键到字典行。本步种子即可按此约定写。

---

## 1. 问题基线

项目没有系统配置表 / 字典表。可配内容目前是专用表：

- [`ServiceCatalog`](../apps/server/prisma/schema.prisma)（服务项目，管理端「服务配置」）
- `Banner`、`Operator`

选项类数据仍散落在前端常量或 Prisma 枚举里，改一处要发版，且会漏拷：

| 选项 | 写死位置 |
|------|----------|
| 预约时段 | 居民 [`booking-cleaning`](../apps/miniapp-customer/src/pages/booking-cleaning/index.vue) / [`booking-recycling`](../apps/miniapp-customer/src/pages/booking-recycling/index.vue)；管理端保洁 / 废品代下单各一份。值：`08:00`…`11:00`、`14:00`…`17:00` |
| 评价标签 | [`review/index.vue`](../apps/miniapp-customer/src/pages/review/index.vue) `REVIEW_TAGS` |
| 投诉原因 | Prisma `ComplaintReason`；DTO `IsEnum`；shared `COMPLAINT_REASON_LABELS`；居民 [`api/complaint.ts`](../apps/miniapp-customer/src/api/complaint.ts)；管理端 [`complaint/index.vue`](../apps/admin/src/views/orders/complaint/index.vue) `REASON_LABEL_MAP`（文案与 shared 不完全一致） |

本次先把「可配选项」收成一张薄表 + 管理端，后续接入时预约/评价/投诉改为拉接口。

---

## 2. 设计结论

### 2.1 一张项表，类型写在代码里

不要 `dict_type` + `dict_item` 两张表。类型只有有限几个，且每个 type 将来都要有调用方；运营在后台新建「订单状态」这类 type 是事故。

`packages/shared` 增加常量（名称可微调，语义不变）：

```ts
export const DictType = {
  APPOINT_TIME_SLOT: 'APPOINT_TIME_SLOT',
  REVIEW_TAG: 'REVIEW_TAG',
  COMPLAINT_REASON: 'COMPLAINT_REASON',
} as const;

export const DICT_TYPE_LABELS: Record<DictType, string> = {
  APPOINT_TIME_SLOT: '预约时段',
  REVIEW_TAG: '评价快捷标签',
  COMPLAINT_REASON: '投诉原因',
};
```

以后要加第 4 类选项：先改这个常量，再种子 + 管理端 Tab 自动出现。

### 2.2 模型（`biz_dict_items`）

对标 `ServiceCatalog` 的启用 / 排序，字段保持薄：

| 字段 | 说明 |
|------|------|
| `id` | 主键 |
| `type` | 上表 `DictType`，`VARCHAR(32)` |
| `value` | 写入业务表的码或文案。时段用 `14:00`；评价标签可用中文（与现网 `tags` 一致）；投诉原因用现有枚举码 `POOR_ATTITUDE` |
| `label` | 展示文案。时段可与 value 相同；投诉原因如「服务态度差」 |
| `bizType` | 可空。空 = 该 type 下全业务共用。预留给时段日后按 `CLEANING` / `RECYCLING` 拆开；本步种子全部留空 |
| `sortOrder` | 越小越靠前 |
| `isEnabled` | 停用后公开接口不再返回；**已落库的订单/评价/投诉不受影响** |
| `isSystem` | 系统项：不可删除；`value` 不可改（可改 label / 排序 / 启用）。种子里投诉原因全部 `true`，其中 `OTHER` 建议也不可停用 |
| `createdAt` / `updatedAt` | 审计 |

约束：

- 唯一：`(type, value, bizType)`。`bizType` 为空时用空字符串 `''` 参与唯一（MySQL 多 NULL 不互斥），避免同一 type 下插入两条相同 value。
- 索引：`(type, isEnabled, sortOrder)`，公开查询走这条。

**禁止**：JSON 扩展袋、树形字典、i18n、外键到订单/评价/投诉。配额、图标等以后若需要，另开专用表（与服务目录同一思路）。

### 2.3 快照约定（给后续接入用，本步不改业务表）

| 业务字段 | 存什么 |
|----------|--------|
| `appointTimeSlot` | 字典 `value`（`14:00`），不是 `id` |
| `reviews.tags` | 提交时的中文/value 数组快照 |
| `complaints.reasons` | 字典 `value` **数组**快照（现为枚举码，如 `POOR_ATTITUDE`） |

展示历史数据：先按当时存的 `value` 查当前字典拿 `label`；查不到则**原样显示 value**（停用或改过 label 的旧单仍可读）。

公开接口失败时，调用方用本步种子的默认列表做兜底（后续接入时再写；本步管理端不必兜底）。

### 2.4 谁可以改

- 管理端写接口：管理员 JWT（`AdminJwtAuthGuard`）。有页面菜单即可，不单拆「增删改」权限点（与改派、服务配置同一粒度）。
- 公开读：`GET` 启用项，供后续小程序 / 管理端代下单使用。本步管理端列表用管理查询（含停用项）；公开接口先实现，暂无调用方也可以。

服务目录现状未挂 Guard，本功能不要跟着裸奔，写操作必须管理员鉴权。

---

## 3. 种子数据（与线上硬编码对齐）

写在 [`apps/server/prisma/seed.ts`](../apps/server/prisma/seed.ts)，幂等：按 `(type, value, bizType)` upsert，不覆盖管理员已改的 `label` / `sortOrder` / `isEnabled`（或：仅当该 type 下 0 条时插入；二选一，推荐 **首次为空才插入**，避免每次 seed 把运营改过的项改回去）。

### `APPOINT_TIME_SLOT`（`isSystem = false`）

value = label：

`08:00` `09:00` `10:00` `11:00` `14:00` `15:00` `16:00` `17:00`

### `REVIEW_TAG`（`isSystem = false`）

value = label（与评价页一致）：

`准时到达` `打扫干净` `态度好` `专业细致` `工具齐全` `着装整齐`

### `COMPLAINT_REASON`（`isSystem = true`）

与 Prisma / shared 对齐（管理端投诉页有另一套略缩文案，**种子以 shared 为准**）：

| value | label |
|-------|--------|
| `POOR_ATTITUDE` | 服务态度差 |
| `NOT_CLEAN` | 打扫不干净 |
| `NOT_ON_TIME` | 未按约定时间到达 |
| `ITEM_DAMAGED` | 物品损坏/丢失 |
| `EXTRA_CHARGE` | 额外收费 |
| `OTHER` | 其他原因 |

`OTHER`：不可删除、不可停用、不可改 `value`。未迁出 Prisma enum 前，**不要在管理端改这些 value**；改 label 可以，后续展示层吃字典后才会生效。

---

## 4. 后端

### 4.1 Prisma

在 [`schema.prisma`](../apps/server/prisma/schema.prisma) 增加 `BizDictItem`（表名 `biz_dict_items`），字段见 2.2。`type` / `value` / `bizType` 用 `String`，不要再为字典项建 Prisma enum（否则又加不了项）。

### 4.2 模块

新建 `apps/server/src/modules/biz-dict/`，挂到 [`app.module.ts`](../apps/server/src/app.module.ts)。对标 [`service-catalog`](../apps/server/src/modules/service-catalog/)。

**管理端（需 `AdminJwtAuthGuard`）**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/biz-dict-items` | 分页；query：`type`（必填或强烈建议）、`isEnabled`、keyword（搜 value/label） |
| GET | `/biz-dict-items/:id` | 详情 |
| POST | `/biz-dict-items` | 新增。`type` 必须是 `DictType`；同 type+value+bizType 重复 → 400 |
| PUT | `/biz-dict-items/:id` | 编辑。系统项禁止改 `value` / `type` |
| PATCH | `/biz-dict-items/:id/toggle` | 启用停用。`OTHER` 停用 → 400 |
| DELETE | `/biz-dict-items/:id` | 系统项 → 400 |

**公开（后续小程序用，本步实现）**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/biz-dict-items/enabled` | query：`type` 必填，`bizType` 可选。返回该 type 下启用项，按 `sortOrder`。`bizType` 有值时：返回「该 bizType + bizType 为空」的并集，同 value 以 bizType 非空为准 |

注意路由顺序：`/enabled` 写在 `/:id` 前面。

校验：

- `type`：`IsIn(Object.values(DictType))`
- `value`：非空，最长 64；时段建议额外校验 `^\d{2}:\d{2}$`（仅当 `type === APPOINT_TIME_SLOT`）
- `label`：非空，最长 64
- `bizType`：空或 `CLEANING` / `RECYCLING` / `CONSULT`

shared 增加 `BizDictItemDto`（id、type、value、label、bizType、sortOrder、isEnabled、isSystem、时间戳）。

### 4.3 单测

- 创建重复 value → 400
- 删除 / 改 value 系统项 → 400
- 停用 `OTHER` → 400
- `enabled` 不返回停用项
- 非法 `type` → 400

---

## 5. 管理端

对标 [`config/services`](../apps/admin/src/views/config/services/index.vue)：筛选 + 表 + 新增/编辑弹窗 + 行内启用停用。

### 5.1 入口与权限

放在「配置管理」下，与服务配置并列：

| 项 | 值 |
|----|-----|
| 路由 | `/config/dicts`，`name: ConfigDicts` |
| `menuKey` | `config.dicts` |
| 菜单文案 | 业务字典 |

必须同步改（漏一处则超级管理员外的账号看不到或 URL 能进）：

- [`apps/admin/src/router/index.ts`](../apps/admin/src/router/index.ts)
- [`apps/admin/src/layout/index.vue`](../apps/admin/src/layout/index.vue) 菜单项 + `showConfigMenu` 数组加上 `config.dicts`
- [`apps/admin/src/constants/menu-permissions.ts`](../apps/admin/src/constants/menu-permissions.ts) `MENU_TREE` 配置管理分组
- [`apps/server/src/modules/admin-permission/constants/menu-keys.constant.ts`](../apps/server/src/modules/admin-permission/constants/menu-keys.constant.ts) `ALL_MENU_KEYS`

已有管理员的 `AdminPermission` 不会自动带上新 key；超级管理员始终放行。普通管理员要进此页，需在「功能授权」里补勾。计划里写一句即可，不必做数据迁移。

### 5.2 页面

文件：`apps/admin/src/views/config/dicts/index.vue`  
API：`apps/admin/src/api/biz-dict.ts`

布局建议：

1. 顶部分段 / Select：字典类型（来自 `DICT_TYPE_LABELS`，不是用户自建）
2. 表格列：排序、value、label、业务线（空显示「全部」）、状态、系统项标记、操作
3. 新增 / 编辑：type 只读（当前 Tab）；系统项锁定 value
4. 停用用 tag 点击 toggle，与服务配置一致
5. 删除：系统项按钮禁用或隐藏；二次确认

本步**不要**做字典类型的新增页。页面上可加一句说明：修改后需待对应业务接入字典后才会在小程序生效。

---

## 6. 明确不做（本次）

- 预约、评价、投诉、代下单改为读字典；下单 `IsIn` 校验改吃字典
- 投诉 `reason` 列从 Prisma enum 改为 VARCHAR
- 订单 / 员工 / 投诉处理状态进字典
- 通用 `dict_type` 表、树、多语言、按字典项统计报表
- 时段产能 / 每小时可接单数
- 评价星级可配
- 自动给已有普通管理员授权 `config.dicts`

---

## 7. 后续如何使用（本文不执行）

本步上线后，管理端改字典**不会**立刻改变小程序选项。必须另开接入：调用方改拉 `GET /biz-dict-items/enabled`，提交时后端按启用项校验。下面是用法约定和建议清单。

### 7.1 判断标准

- **用字典**：用户点选一个文案/码，业务表当字符串存下来；代码几乎不 `if (这个值 === …)` 走不同流程。运营加/停一条不该要求发版。
- **不用字典**：值参与状态机、权限、统计口径、派单筛选。运营加一个值，代码接不住。
- **继续用专用表**：选项本身还带图标、有效期、联系电话等自己的字段（服务目录、轮播图、运营人员）。

### 7.2 建议用字典

种子三个 type 就是首批建议接入对象，按成本从低到高：

| 功能 | type | 谁用 | 怎么用 | 成本 |
|------|------|------|--------|------|
| **评价快捷标签** | `REVIEW_TAG` | 居民评价页 | 拉启用项展示 chips；提交 `tags` 仍为字符串数组快照 | **最低**。`reviews.tags` 已是 JSON，后端未校验固定列表 |
| **预约时段** | `APPOINT_TIME_SLOT` | 居民预约保洁/废品；管理端代下单 | 四处改拉启用项；创建订单 `appointTimeSlot` 必须是当前启用 `value`（如 `14:00`） | **中**。四处常量改为接口；DTO 从自由字符串改为按字典校验。看板已按字符串解析小时，不必改 |
| **投诉原因** | `COMPLAINT_REASON` | 居民投诉页；管理端投诉详情 label | 选项拉字典；提交存 `value` 数组快照；展示用 `label`，查不到则显示原码 | **中**。Prisma `Complaint.reasons` 已是 `Json`；接字典时 DTO 去掉死枚举、改为按启用集校验。运营新增原因只需插 `biz_dict_items`，**不必再 ALTER `complaints`** |

接入时每处都要：

1. 页面/下拉：`GET /biz-dict-items/enabled?type=…`（时段可带 `bizType`）
2. 接口失败：用第 3 节种子列表做前端兜底，避免预约/评价页空白
3. 提交：后端校验 value 在**当前启用**集合内；落库只存 value（或标签中文），**不存字典 id**
4. 停用：只影响新单可选；历史订单/评价/投诉不回写、不级联删
5. 展示历史：用当时存的 value 换当前 label；没有该项则原样显示 value

### 7.3 建议接入顺序

1. 评价标签（零业务表变更，立刻免发小程序加标签）
2. 预约时段（四处 + 下单校验，免发版加减时段）
3. 投诉原因（列已是 Json 数组；接字典后运营可自己加原因，不必再改表）

每一项另开执行，不要和「建字典能力」捆在同一次。

### 7.4 明确不要用字典

| 功能 | 原因 |
|------|------|
| 保洁/废品订单状态 | 状态机、改派窗口、进度轴、今日完成/待办口径都绑死枚举 |
| 家政单状态 | 同上 |
| 员工状态 `IDLE` / `BUSY` | 派单筛空闲、列表筛选、复合索引 |
| 投诉处理状态 | 后台处理流程，不是用户点选标签 |
| 评价星级 1–5 | 看板饼图、员工评分算术平均按数字算 |
| 作业照片类型 | 上传槽位/校验按 `BEFORE`/`AFTER` 分支 |
| 订单来源、轮播跳转类型 `NONE/PAGE/URL` | 代码按值分支；运营加一种跳转类型不会自动有实现 |

这些若文案不统一，改 `packages/shared` labels，不要做成字典项。

### 7.5 不要塞进字典（已有专用表）

| 功能 | 现有位置 |
|------|----------|
| 服务项目（日常清扫、大件类等） | `ServiceCatalog` + 管理端「服务配置」 |
| 轮播图 | `Banner` |
| 运营人员联系方式 | `Operator` |

字典没有图标、有效期、电话这些字段。硬塞会把薄表做胖，或再加 JSON 袋——禁止。

### 7.6 以后再说（本步不种子）

| 功能 | 说明 |
|------|------|
| 员工技能 `CLEANING` / `RECYCLING` / `BOTH` | 管理端写死三选。改派以后可能按技能校验，那时值会进入代码分支，更像枚举。未出现「经常加技能」前不必进字典 |
| 取消原因 | 现在只是备注自由文本，没有选项列表。若以后做成居民点选，可新增 `CANCEL_REASON` type，先改 `DictType` 常量再种子 |

加第 4 类：改 shared `DictType` → 种子 → 管理端 Tab 自动出现 → 对应页面改拉 `enabled`。禁止运营在后台自建新 type。

### 7.7 新功能接入模板（给后续执行用）

```
1. 确认：只是选项列表，没有按值的业务分支
2. 在 DictType 增加 type（若尚无）
3. 种子默认项；决定哪些 isSystem
4. 选择页改为 GET enabled；失败用种子兜底
5. 创建/提交 API 校验启用 value
6. 业务表存 value 快照；详情展示 label，缺失则显示 value
```

---

## 8. 实现待办

1. Prisma 模型 + migrate；`DictType` / DTO 进 shared  
2. `BizDictModule`：管理 CRUD + `enabled`；系统项 / `OTHER` 保护；seed 三个 type  
3. 管理端页面 + `config.dicts` 路由 / 侧栏 / 双端 menuKey  
4. 单测：重复、系统项、停用 OTHER、enabled 过滤  

---

## 9. 验收

- 超级管理员能打开「配置管理 → 业务字典」，三个类型有种子数据，与上表一致  
- 可新增一条评价标签并停用；`GET /biz-dict-items/enabled?type=REVIEW_TAG` 不含停用项  
- 不能删除 `POOR_ATTITUDE`，不能停用 `OTHER`  
- 无 `config.dicts` 的普通管理员：菜单无入口，直接打 `/config/dicts` 被拦  
- 居民预约 / 评价 / 投诉行为与改前一致（本步未接调用方）  
- 再跑 seed 不会把已改过的 label/启用状态覆盖回去（若采用「仅空表插入」）
