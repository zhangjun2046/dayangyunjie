# 管理端 uni-app H5：保洁 / 废品订单查看与派单

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-26  
> 修订：同日将选人改为弹窗、列表/详情对齐员工端、补「会话中 PC 改权限后再拉列表」口径；三页均关闭原生导航栏；**改为分步执行手册**  
> 性质：**结论文档 + 分步实现计划**（产品口径已拍板；按「第 N 步」改代码，一次只做一步）  
> 范围：新建 uni-app（优先打 H5）；登录账号 = 系统管理「用户管理」中的 `Admin`；主页面仅订单列表（页内两个业务 Tab：保洁、废品回收）；查看订单 + 分配 / 改派弹窗  
> 不含：TabBar；独立选人页；家政 / 投诉等第三种及以上订单类型；新增订单；PC 管理后台改版；本期不改后端接口

关联：

| 主题 | 路径 |
|------|------|
| 列表 UI 参照 | [`apps/miniapp-worker/src/pages/tasks/index.vue`](../apps/miniapp-worker/src/pages/tasks/index.vue) |
| 详情 UI 参照 | [`apps/miniapp-worker/src/pages/task-detail/index.vue`](../apps/miniapp-worker/src/pages/task-detail/index.vue) |
| 登录页参照 | [`apps/miniapp-worker/src/pages/login/index.vue`](../apps/miniapp-worker/src/pages/login/index.vue) |
| PC 分配弹窗字段 | [`apps/admin/src/views/orders/cleaning/index.vue`](../apps/admin/src/views/orders/cleaning/index.vue) 分配 Dialog |
| 脚手架参照 | [`apps/miniapp-worker/`](../apps/miniapp-worker/) |
| 登录 | [`POST /auth/admin-login`](../apps/server/src/modules/auth/auth.controller.ts) |
| 功能授权 | [`GET /admins/:id/permissions`](../apps/server/src/modules/admin-permission/admin-permission.controller.ts) |
| 菜单 key | [`menu-keys.constant.ts`](../apps/server/src/modules/admin-permission/constants/menu-keys.constant.ts) |

---

## 给执行本文的 AI（硬规则）

被要求「按本文实现 / 做下一步 / 做第 N 步」时：

1. **先读「已拍板口径」**，全文始终有效，后面步骤不得违反。
2. **一次只做一步。** 用户说「实现」但没指定步号 → 从第 1 步起，做完当前未完成的**最小一步**就停，汇报验收，等下一轮再做下一步。
3. **禁止跨步。** 做第 4 步时不要提前写详情、弹窗、打包。做第 2 步时不要写订单列表。
4. **本期不改 `apps/server`、不改 `apps/admin`。** 只新增 `apps/miniapp-admin` 及根目录为接入该包所必需的脚本（`package.json` workspace 脚本、`link-uni-local-deps.mjs` 名单）。
5. 某步已验收通过 → 不要重做；从下一步开始。
6. 八步都完成后停，回复：本文步骤均已落地，没有更多可执行项。

```
第 1 步  脚手架
   ↓
第 2 步  登录与会话
   ↓
第 3 步  订单页骨架 + 权限 Tab + 自定义导航 / 退出
   ↓
第 4 步  保洁 / 废品订单列表
   ↓
第 5 步  会话中重拉权限
   ↓
第 6 步  订单详情
   ↓
第 7 步  分配 / 改派弹窗
   ↓
第 8 步  H5 打包接入（根脚本 / 构建可跑通；部署说明留给运维）
```

---

## 已拍板口径

1. **新建独立 uni-app 工作区**（`apps/miniapp-admin`），不要把 PC 后台 `apps/admin` 改成移动端，也不要复用居民端 / 员工端小程序当本端。
2. **无 TabBar**。登录后的主页面只有一个订单页；保洁与废品回收是该页顶部的两个业务 Tab，不是两个 tabBar 页。
3. **登录用户 = 用户管理中的管理员**（`Admin` 表），走 `POST /auth/admin-login`（邮箱 + 密码）。不是居民微信登录，不是员工手机号登录，也不是「运营人员配置」里的客服 `Operator`。
4. **业务 Tab 必须按功能授权显隐**。本端只认两个 menuKey：`orders.cleaning`、`orders.recycling`。有的账号只有其中一个，有的两个都有。超级管理员视为两个都有。
5. **先不考虑第三种及以上订单权限**（家政 `orders.consult`、投诉 `orders.complaint` 等）。即使该账号在 PC 后台有这些菜单，本 H5 也不展示、不请求。
6. **列表、详情视觉与交互对齐员工端** 任务列表 / 任务详情，只改管理员该看的字段和底部操作（分配 / 改派，而不是接单 / 开始服务）。
7. **分配 / 改派用弹窗选员工**，不新建 `pages/assign/index`。列表和详情共用同一个弹窗组件。
8. **会话中权限以「再拉列表」为同步点**。H5 已登录、Tab 已画出来之后，超管在 PC 改了功能授权：用户下拉刷新 / `onShow` 再进订单页 / 切换业务 Tab 时，先重拉权限再拉订单。按新权限改 Tab 和列表，不强制重新登录。本期不改后端，不做推送、不做权限轮询。
9. **三页都关掉原生导航栏**（`navigationStyle: custom`）。登录、订单列表、订单详情一律自己画顶栏，不要 `pages.json` 默认那条系统导航。
10. **本期不改后端**。列表、详情、派单、改派、员工列表、权限查询均复用现有 API。

---

## 产品形态（各步对照）

### 路由（无 tabBar）

| 路径 | 是否登录 | 说明 | 引入步骤 |
|------|----------|------|----------|
| `pages/login/index` | 公开 | 邮箱 + 密码；已登录则直接进订单页 | 第 2 步 |
| `pages/orders/index` | 是 | **唯一主页面**：页内 Tab + 订单列表；选人弹窗挂在本页 | 第 3 步起，列表第 4 步，弹窗第 7 步 |
| `pages/order-detail/index` | 是 | query：`id` + `type=cleaning\|recycling`；选人弹窗挂在本页 | 第 6 步，弹窗第 7 步 |

没有「我的」独立页，也没有选人页。

登录成功：`uni.reLaunch` 到 `pages/orders/index`。未登录访问受保护页：`uni.reLaunch` 到登录页。

### 导航栏：不保留原生 navbar

员工端任务列表能留原生栏，是因为它是 **tabBar 页**，顶栏只需要居中标题「任务」，右侧没有按钮。本端没有 tabBar，订单页右侧要放姓名 / 退出，详情要对齐员工端沉浸式头图。三页都设 `navigationStyle: "custom"`，用已有的 `uni-nav-bar`（员工端详情同款）。

| 页面 | 原生导航栏 | 自己画什么 |
|------|------------|------------|
| 登录 | 关 | 无顶栏，全屏登录卡（对齐员工端登录页） |
| 订单列表 | 关 | 固定顶栏：标题「订单」+ 右侧姓名 / 退出；下面才是业务 Tab |
| 订单详情 | 关 | 透明导航浮在头图上，左侧返回；滚动后加深（对齐员工端 `task-detail`） |

不要两套叠在一起。员工端 `tasks/index.vue` 的原生标题栏 **不要抄过来**。`uni-nav-bar` 打开 `status-bar`。下拉刷新仍由 `pages.json` 的 `enablePullDownRefresh` 负责。

### 订单列表（对齐员工端任务列表）

结构、样式以 [`tasks/index.vue`](../apps/miniapp-worker/src/pages/tasks/index.vue) 为底：顶栏双 Tab、横向状态胶囊、卡片（右上角状态徽标 + 服务图标 + 名称 + 时间 + 地址）、空态、下拉刷新、上拉分页。管理员视角做这些加减：

**加：**

- 订单页顶部自定义导航（标题「订单」+ 用户名 / 退出）。
- 胶囊下增加搜索框（订单号 / 姓名 / 电话），走后端 `keyword`。
- 卡片操作区：`PENDING_ASSIGN` 出「分配」，`ASSIGNED` 出「改派」（位置对齐员工端 `ASSIGNED` 时的「立即接单」）。点卡片仍进详情。
- 卡片可补一行服务人员姓名（未派显示「待分配」）。

**减 / 改：**

- 业务 Tab 文案用「保洁」「废品回收」；**有两个权限才渲染 Tab 条**。
- 状态胶囊用管理端全量（含「待派单」`PENDING_ASSIGN`）。
- 不要员工端的「立即接单」。

```
┌─────────────────────────────────┐
│  订单              张三 ▾ 退出   │
├─────────────────────────────────┤
│  [保洁]  [废品回收]             │  ← 仅双权限时出现，样式抄员工端 top-tabs
├─────────────────────────────────┤
│  全部 | 待派单 | 已派单 | …     │  ← 抄员工端 filter-pill，多一个待派单
│  搜索框                         │
├─────────────────────────────────┤
│  ┌ 卡片（抄 order-card）─────┐  │
│  │ 保洁·日常保洁      待派单 │  │
│  │ 时间 / 地址 / 服务人员    │  │
│  │          [分配]           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

第 4 步列表上的「分配 / 改派」可以先出按钮；**点下去的弹窗等到第 7 步再接**（第 4 步可 toast「请先打开详情」或暂时 `navigateTo` 详情，不要先做弹窗组件）。

### 订单详情（对齐员工端任务详情）

以 [`task-detail/index.vue`](../apps/miniapp-worker/src/pages/task-detail/index.vue) 为底：沉浸式头图 + 服务名 / 订单号 / 服务时间 / 状态徽标、联系人拨号条、订单信息卡、服务进度时间轴、作业记录。管理员视角做这些加减：

**加：**

- 「服务人员」信息卡（姓名 / 电话，可拨号）；未派时文案「等待平台为客户分配服务人员」。
- `REVIEWED` 时展示评价卡（星级 / 标签 / 文字 / 图），与 PC 详情一致。
- 底部主按钮：`PENDING_ASSIGN` →「分配服务人员」；`ASSIGNED` →「改派服务人员」。第 7 步才接到选人弹窗。

**减 / 改：**

- 不要接单 / 开始服务 / 完成服务，不要上传作业照片。作业记录只展示已有照片。
- 进度轴直接渲染详情接口的 `progress`。
- 进入详情时按 `type` 再判一次菜单权限；无权限则 toast 并返回订单页。

### 选人弹窗（分配 / 改派）

不用独立页面。列表、详情各挂一份同一组件（例如 `AssignWorkerPopup.vue`），用 `uni-popup` 或自绘底部弹层。

- 标题：分配时「分配服务人员」，改派时「改派服务人员」。
- 列表字段对齐 PC 分配 Dialog：单选、姓名、技能、空闲/服务中、今日完成、评分。
- 数据：`GET /workers?pageSize=100`，前端按 [`worker-skill.ts`](../apps/admin/src/utils/worker-skill.ts) 过滤（空闲 + 技能匹配；改派排除当前员工）。
- 底部：取消 / 确定。确定后 `operatorId` 传当前登录 `admin.id`。
- 成功：关弹窗、toast、刷新当前列表或详情。
- 打开弹窗前、点确定前都再走一遍当前业务类型的 `hasMenu`；已无权限则关弹窗并 toast「没有权限」。

---

## 权限：两个业务 Tab 怎么显隐

权限来源与 PC 后台相同：`GET /admins/:id/permissions`，得到 `{ isSuperAdmin, menuKeys }`。

```text
hasMenu(key) = isSuperAdmin || menuKeys.includes(key)
```

| 开关 | menuKey | 对应 Tab |
|------|---------|----------|
| `canCleaning` | `orders.cleaning` | 保洁 |
| `canRecycling` | `orders.recycling` | 废品回收 |

### 四种账号形态（稳态）

| 情况 | Tab 区 | 列表 | 默认选中 |
|------|--------|------|----------|
| 两个都有（含超级管理员） | 渲染「保洁」「废品回收」两个 Tab | 跟当前 Tab 拉对应接口 | 见下方默认规则 |
| 仅保洁 | **不渲染 Tab 条**，列表直接当保洁 | 只请求保洁接口 | 保洁 |
| 仅废品 | **不渲染 Tab 条**，列表直接当废品 | 只请求废品接口 | 废品 |
| 一个都没有 | 不渲染 Tab、不请求订单 | 空态：「暂无订单查看权限，请联系超级管理员分配功能授权」+ 退出 | — |

只渲染一个 Tab 时不要留一个孤立按钮。有两个权限才出现 Tab 条。

### 默认选中与记忆

1. 进入订单页时，若本地记过上次业务 Tab，且当前账号仍有该权限 → 用上次的。
2. 否则固定优先级：**保洁优先于废品**。
3. 两个 Tab 的列表状态（状态胶囊、关键字、页码）**各自独立**。被撤掉权限的那一侧缓存立刻清空。

### 会话中 PC 改了权限，H5 再拉列表怎么显示

本期不做推送 / 轮询。**同步时机**（先重拉权限，再决定要不要、拉哪类订单）：

| 动作 | 是否重拉权限 | 接入步骤 |
|------|----------------|----------|
| 登录成功 | 是 | 第 2 步拉一次即可 |
| 订单页 `onShow`（含从详情返回） | 是 | 第 5 步 |
| 下拉刷新列表 | 是 | 第 5 步 |
| 切换业务 Tab | 是 | 第 5 步 |
| 上拉加载更多 | **否** | 第 4 步就保持这样 |
| 打开选人弹窗 / 点确定 | 是（只校验当前 `type`） | 第 7 步 |
| 详情页 `onShow` | 是（当前 `type` 已无权限 → toast 并返回） | 第 6 步先按登录态权限拦；**重拉**并入第 6 步细节页 `onShow` |

权限接口失败：保留本地旧权限并照常拉列表，不要因为一次网络失败把已画出的 Tab 抹掉。

重拉成功后（只 toast **当前可见结构真的变了** 的情况）：

| 变化 | Tab 怎么显示 | 列表怎么显示 | 提示 |
|------|--------------|--------------|------|
| 没变 | 不动 | 按当前 Tab 正常刷新订单 | 无 |
| 两个 → 只剩当前这个 | Tab 条收掉，页面变成单类型列表 | 刷新当前类型订单 | 无 |
| 两个 → 只剩**另一个** | Tab 条收掉；`activeTab` 切到剩下那个 | 清空被撤类型的缓存，拉剩下那个的第一页 | toast「您的{保洁/废品}订单权限已取消」 |
| 任意 → 一个都没有 | 去掉 Tab 条 | 清空两边缓存，展示无权限空态，不请求订单 | 空态文案；可再 toast「订单查看权限已取消」 |
| 一个 → 两个 | 出现 Tab 条；`activeTab` 仍是原来那个 | 刷新当前类型；另一侧等用户点过去再拉 | 无 |
| 保洁 ↔ 废品对调 | 仍不画 Tab 条，内容换成新类型 | 清空旧缓存，拉新类型第一页 | toast「订单权限已变更」 |
| 一个都没有 → 有了 | 按稳态四种形态画出 Tab / 单列表 | 按默认规则拉第一页 | 无 |

其它连带处理：

- 选人弹窗开着时，当前类型权限没了 → 关弹窗 + toast「没有权限」。
- 用户还在详情页时，该 `type` 被撤 → 返回订单页，由订单页 `onShow` 按上表重画。
- **不要因为菜单变更而退出登录。** 账号被禁用走 401 清会话。
- 超级管理员重拉后仍是全量 key。
- 新权限写回本地存储。记忆中的 Tab 若已无权限，丢弃记忆，改走「保洁优先于废品」。
- H5 以重拉到的 menuKeys 为准，**无权限就不请求、不展示**。

### 明确不做

- 不根据 `orders.consult` / `orders.complaint` 再加第三、第四个 Tab。
- 不在本端做功能授权配置。
- 不把 `staff.workers` 当成派单前提。
- 不做 WebSocket / 定时轮询权限。

---

## 登录与会话

```http
POST /api/v1/auth/admin-login
{ "email": string, "password": string }
```

返回 `tokens` + `admin { id, email, name, username, isSuperAdmin }`。

- 登录字段是 **邮箱**，不是用户名。
- 账号禁用返回 401，停留在登录页展示错误。
- Token 用 `POST /auth/refresh`。
- 持久化 key：`__admin_auth__`。
- 请求头 `Authorization: Bearer <accessToken>`。登录 / 刷新接口不带旧 Token。
- 非登录接口 401 → 清会话，回登录页。

---

## 接口（全部复用，不新增）

Base：`/api/v1`。H5 开发走 Vite 代理。

| 能力 | 方法 | 路径 | 引入步骤 |
|------|------|------|----------|
| 登录 | POST | `/auth/admin-login` | 第 2 步 |
| 刷新 | POST | `/auth/refresh` | 第 2 步 |
| 权限 | GET | `/admins/:id/permissions` | 第 2 步写入；第 5 步重拉 |
| 保洁列表 | GET | `/cleaning-orders?page&pageSize&status&keyword` | 第 4 步 |
| 废品列表 | GET | `/recycling-orders?page&pageSize&status&keyword` | 第 4 步 |
| 保洁详情 | GET | `/cleaning-orders/:id` | 第 6 步 |
| 废品详情 | GET | `/recycling-orders/:id` | 第 6 步 |
| 评价 | GET | `/reviews?orderType=CLEANING\|RECYCLING&orderId&pageSize=1` | 第 6 步 |
| 选人 | GET | `/workers?pageSize=100` | 第 7 步 |
| 保洁分配 / 改派 | POST | `/cleaning-orders/:id/assign` `/reassign` | 第 7 步 |
| 废品分配 / 改派 | POST | `/recycling-orders/:id/assign` `/reassign` | 第 7 步 |

查询只传 `page` / `pageSize` / `status` / `keyword`。不要传 `contactPhone`、`address`。

**`operatorId` 必须传当前登录 Admin 的 `id`。** 不要写死 `1`。

选人筛选：`IDLE`；保洁 `CLEANING|BOTH`；废品 `RECYCLING|BOTH`；改派排除当前 `workerId`。改派仅 `ASSIGNED`。

状态文案用 `@dayangyunjie/shared` 的 `ORDER_STATUS_LABELS`。

---

## 目标目录（各步往这里填，不要提前建空壳业务页以外的废文件）

```
apps/miniapp-admin/src/
  api/request.ts auth.ts permission.ts cleaning.ts recycling.ts worker.ts
  store/auth.ts
  composables/useRouteGuard.ts
  composables/useOrderTabs.ts
  components/AssignWorkerPopup.vue
  utils/jwt.ts
  utils/worker-skill.ts
  pages/login | orders | order-detail
```

`useOrderTabs` 输出：

```ts
visibleTabs: Array<'cleaning' | 'recycling'>  // 0 / 1 / 2 项，保洁在前
showTabBar: boolean                            // visibleTabs.length === 2
activeTab: 'cleaning' | 'recycling' | null
```

---

## 第 1 步：脚手架

**目标：** monorepo 里能 `dev:h5` 跑起来一个空白 uni-app（H5），还没有业务。

**做：**

- 新建 `apps/miniapp-admin`，对齐 [`apps/miniapp-worker`](../apps/miniapp-worker/)：`package.json`（name：`@dayangyunjie/miniapp-admin`）、`vite.config.ts`、`tsconfig.json`、`index.html`、`manifest.json`、`src/main.ts`、`src/App.vue`、`src/env.d.ts`、依赖 `@dayangyunjie/shared` 与同版本 `@dcloudio/*`。
- `pages.json`：先只留一个占位页（例如 `pages/login/index` 空页即可）。**不配置 tabBar。** 占位页也 `navigationStyle: custom`。
- Vite 端口 **5176**，代理 `/api/v1 → http://127.0.0.1:3000`。`manifest.json` H5 路由 **hash**。
- 根目录 `package.json` 增加 `"dev:miniapp-admin"`。`scripts/link-uni-local-deps.mjs` 默认列表加上 `miniapp-admin`。
- 根目录执行安装 / link，保证能启动。

**本步不做：** 登录接口、订单页、权限、详情、弹窗。

**验收：** `npm run dev:miniapp-admin`（或 workspace `dev:h5`）H5 能打开空白页，无 tabBar、无系统导航栏。

---

## 第 2 步：登录与会话

**目标：** 用用户管理里的邮箱 + 密码登录，拿到 Admin JWT，进得了受保护页、出得去登录页。

**做：**

- `api/request.ts`：`uni.request`，H5 用 `/api/v1`，注入 Bearer；解包 `{ code, message, data }`。
- `api/auth.ts`：`POST /auth/admin-login`、`POST /auth/refresh`。
- `api/permission.ts`：`GET /admins/:id/permissions`。
- `store/auth.ts`：持久化 `__admin_auth__`（token + admin + permissions）；`login` / `logout` / `ensureSession` / `hasMenu` / `refreshPermissions`（本步登录成功后拉一次权限并写入即可，**不要**在订单列表每次刷新时调用——那是第 5 步）。
- `utils/jwt.ts`：可从员工端拷。
- `composables/useRouteGuard.ts`：未登录访问非登录页 → `reLaunch` 登录页。
- `pages/login/index`：对齐员工端登录页视觉；字段是 **邮箱 + 密码**，不要手机号。失败展示接口 message。成功 `reLaunch` 订单页（本步若订单页还不存在，可临时 `reLaunch` 到一个仅显示「已登录 + 退出」的占位，第 3 步换成正式订单页）。
- `pages.json` 登录页 `navigationStyle: custom`，无顶栏。

**本步不做：** 业务 Tab、订单接口、自定义订单顶栏上的完整列表。

**验收：**

- 正确邮箱密码登录成功，storage 里有 access / refresh / admin。
- 错误密码停在登录页，不跳走。
- 禁用账号展示「账号已被禁用」类文案。
- 刷新页面后 `ensureSession` 仍保持登录（access 过期能 refresh）。
- 退出后必须重新登录。

---

## 第 3 步：订单页骨架 + 权限 Tab + 自定义导航 / 退出

**目标：** 登录后落地订单页。按稳态四种形态画出 0/1/2 个业务 Tab 和顶栏退出；**还不拉订单。**

**做：**

- `pages/orders/index`：`uni-nav-bar` 标题「订单」，右侧姓名 + 退出。
- `composables/useOrderTabs.ts`：用 store 里已有的 permissions 算 `visibleTabs` / `showTabBar` / `activeTab`（默认规则见上文）。
- 双权限：渲染「保洁」「废品回收」Tab（样式抄员工端 `top-tabs`）。
- 单权限：不渲染 Tab 条。
- 零权限：空态文案「暂无订单查看权限，请联系超级管理员分配功能授权」，仍可退出。
- `pages.json`：订单页为登录后首页；`navigationStyle: custom`；可先开 `enablePullDownRefresh`（本步下拉可只 `stopPullDownRefresh`）。
- 登录成功一律 `reLaunch` 到 `pages/orders/index`。

**本步不做：** `GET /cleaning-orders`、搜索、卡片、详情、重拉权限。

**验收：** 用超管 / 仅保洁 / 仅废品 / 两菜单都无 四种账号各登一次，Tab 显隐符合「四种账号形态」表。退出回到登录页。无原生导航栏、无 tabBar。

---

## 第 4 步：保洁 / 废品订单列表

**目标：** 当前 `activeTab` 能刷出订单卡片，交互对齐员工端任务列表。

**做：**

- `api/cleaning.ts`、`api/recycling.ts`：列表接口。
- 状态胶囊抄员工端 `filter-pill`，补「待派单」。文案用 `ORDER_STATUS_LABELS`。
- 搜索框走 `keyword`。
- 卡片抄 `order-card`：状态徽标、服务名、时间、地址、服务人员；`PENDING_ASSIGN` / `ASSIGNED` 出「分配」「改派」按钮（本步点击可进详情占位或 toast，**不要做弹窗**）。点卡片 `navigateTo` 详情——若第 6 步尚未做，可先不跳或跳一个「详情开发中」页，**推荐本步把详情路由留空、只做列表**，点卡片暂不跳（避免半成品详情）。
- 下拉刷新、上拉分页。两个 Tab 的胶囊 / 关键字 / 页码状态独立。
- 无权限空态仍走第 3 步，不请求接口。
- 本步下拉刷新 **只重新拉订单，不重拉权限**（第 5 步再接）。

**本步不做：** `refreshPermissions` 变更表、详情页、选人弹窗、派单 API。

**验收：** 双权限可切 Tab 看到两类订单；单权限只看到对应一类；搜索 / 状态胶囊 / 分页可用；卡片样式接近员工端任务列表。

---

## 第 5 步：会话中重拉权限

**目标：** 已登录且 Tab 已画出后，PC 改功能授权，用户再拉列表时按「会话中 PC 改了权限」表改界面。

**做：**

- 订单页 `onShow`、下拉刷新、切换业务 Tab：先 `refreshPermissions()`，再按变更表调整 Tab / `activeTab` / 缓存，最后决定是否 `GET` 订单。
- 上拉加载更多仍不重拉权限。
- 权限接口失败：保留旧权限，照常刷订单。
- 结构真变了才 toast；没变静默刷列表。
- 新 menuKeys 写回 storage。被撤权限的 Tab 缓存清空。不因菜单变更 logout。

**本步不做：** 详情、弹窗。

**验收：** 双权限账号停在 H5 订单页，PC 去掉废品菜单后下拉：若当前在保洁 → Tab 条消失、仍刷保洁；若当前在废品 → 切到保洁并 toast。两个都去掉 → 无权限空态且仍登录。再加回菜单 → Tab / 列表按表恢复。

---

## 第 6 步：订单详情

**目标：** 从列表进详情，对齐员工端任务详情（管理员字段）。

**做：**

- `pages/order-detail/index`：`navigationStyle: custom`，沉浸式头图 + 透明 `uni-nav-bar` 返回。
- 详情 API + `progress` 时间轴 + 作业照片只读 + 联系人拨号 + 服务人员卡 + `REVIEWED` 评价。
- 底部：`PENDING_ASSIGN` / `ASSIGNED` 出分配 / 改派按钮，本步点击可先 toast「请使用弹窗派单（下一步）」或空操作，**不要做弹窗**。
- `onShow`：重拉权限；当前 `type` 无权限 → toast 返回订单页。
- 列表点卡片、点「查看」进详情（`id` + `type`）。

**本步不做：** `GET /workers`、assign / reassign 请求、`AssignWorkerPopup`。

**验收：** 保洁 / 废品详情字段正确；无上传、无接单；无权限 `type` 进不去；无原生导航栏。

---

## 第 7 步：分配 / 改派弹窗

**目标：** 列表与详情都能弹层选人并派单 / 改派。

**做：**

- `components/AssignWorkerPopup.vue` + `api/worker.ts` + `utils/worker-skill.ts`。
- 列表、详情挂同一组件。打开前、确定前 `hasMenu`（可再 `refreshPermissions` 只校验当前 type）。
- `operatorId = admin.id`。成功关弹窗、toast、刷新列表或详情。
- 弹窗开着时权限没了 → 关闭 + toast。
- 无独立 `pages/assign`。

**本步不做：** 改后端、加家政 Tab、改 PC 后台。

**验收：** 待派单能分配，已派未接能改派，已接单没有改派；选人仅空闲且技能匹配；改派后详情进度能看到管理员改派文案（后端已有则只展示）。

---

## 第 8 步：H5 打包接入

**目标：** 生产构建命令可跑；根脚本齐全。

**做：**

- `package.json` 补 `build:h5`；根目录需要的话补 `build` 链路或单独脚本说明。
- 确认 `uni build` 产物在 `apps/miniapp-admin/dist/build/h5`。
- 文档化（可只写在本包 README 两三行，**不要新建无关 markdown**）：开发 `npm run dev` + `dev:miniapp-admin`；生产同域 Nginx 静态 + `/api/v1` 反代，或不同域配 `VITE_API_BASE` + `CORS_ORIGIN`。

**本步不做：** 上线机操作、改 Nest CORS 代码（除非本地 `.env` 说明已有变量怎么配）。

**验收：** `npm run build:h5 --workspace=@dayangyunjie/miniapp-admin` 成功；本地 `preview` 或静态打开 hash 路由刷新不 404。

---

## 已知缺口（任何一步都不要顺手去修后端）

- 订单列表 / 详情 / 派单 / 改派 / `GET /workers` 目前未挂 `AdminJwtAuthGuard`。撤菜单后直打 API 仍可能成功，H5 靠 menuKeys 自己不请求。
- PC 保洁页的联系方式、地址筛选是前端过滤；本 H5 只用 `keyword`。
- 派单后端不校验员工技能与空闲，筛选只在前端。
- 权限变更没有推送。用户一直停在列表上、既不离开也不下拉，会继续看到旧 Tab，直到第 5 步的同步时机。
