# Backend API Summary（P2 全接口交接文档）

> **生成节点**：P2.11 完成后首版；P2.14（2026-06-15）更新至 v2.2；**P3.5（2026-06-20）** 更新至 v2.9  
> **用途**：供居民端（P3）、员工端（P4）、管理后台（P5）对接后端 API，避免上下文丢失  
> **Base URL**：`http://localhost:3000/api/v1`  
> **统一响应格式**：`{ code: number, message: string, data: T | null }`  
> **Swagger**：`http://localhost:3000/api/docs`  
> **鉴权**：当前所有接口均为公开（管理端/员工端 JWT 鉴权留 P3/P4/P5 阶段实现）

---

## 目录

1. [Auth 认证模块](#1-auth-认证模块)
2. [Resident 居民模块](#2-resident-居民模块)
3. [Worker 员工模块](#3-worker-员工模块)
4. [Admin 管理员模块](#4-admin-管理员模块)
5. [Address 地址管理](#5-address-地址管理)
6. [ServiceCatalog 服务目录](#6-servicecatalog-服务目录)
7. [CleaningOrder 保洁订单](#7-cleaningorder-保洁订单)
8. [RecyclingOrder 废品回收订单](#8-recyclingorder-废品回收订单)
9. [ConsultOrder 咨询单](#9-consultorder-咨询单)
10. [Upload 文件上传](#10-upload-文件上传)
11. [Review 评价](#11-review-评价)
12. [Complaint 投诉](#12-complaint-投诉)
13. [Dashboard 数据看板](#13-dashboard-数据看板)
14. [Banner 轮播图](#14-banner-轮播图)
15. [Operator 运营人员](#15-operator-运营人员)

---

## 通用约定

| 项 | 说明 |
|---|---|
| 成功码 | `code = 0`，`message = "ok"` |
| 错误码 | HTTP 状态码与 `code` 一致（400/401/404/500） |
| 分页列表 | `data: { items: T[], total, page, pageSize }` |
| 时间字段 | ISO 8601 字符串（如 `2026-06-08T10:00:00.000Z`） |
| 价格字段 | `priceMin`/`priceMax` 为字符串（Prisma Decimal 序列化） |

---

## 1. Auth 认证模块

**路径前缀**：`/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/wechat-login` | 微信登录（mock code → openid），签发居民 JWT |
| POST | `/auth/refresh` | 使用 refreshToken 换取新 accessToken |
| GET | `/auth/profile` | 获取当前登录居民信息（需 Bearer Token） |
| POST | `/auth/worker-login` | **员工登录**（phone + password → JWT，role=worker，P2.13） |

### POST `/auth/wechat-login`

**Body**：`{ code: string, nickname?: string, avatar?: string }`  
**Response**：
```typescript
{
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  resident: { id: number; openid: string; nickname: string|null; avatar: string|null };
}
```

---

## 2. Resident 居民模块

**路径前缀**：`/residents`  
CRUD 标准五接口：`POST` / `GET` 列表 / `GET :id` / `PUT :id` / `DELETE :id`

**创建必填**：`openid`  
**列表 Query**：`page`, `pageSize`, `openid?`, `phone?`, `name?`  
**Response**：`ResidentDto`（含 `id`, `openid`, `nickname`, `name`, `phone`, `avatar`, `createdAt`, `updatedAt`）

---

## 3. Worker 员工模块

**路径前缀**：`/workers`  
CRUD 标准五接口，另有 P2.13 新增的密码管理接口。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/workers` | 新增员工 |
| GET | `/workers` | 分页列表 |
| GET | `/workers/:id` | 员工详情 |
| PUT | `/workers/:id` | 更新员工信息 |
| DELETE | `/workers/:id` | 删除员工 |
| PUT | `/workers/:id/change-password` | **员工自行改密**（需旧密码验证，需 Worker JWT，P2.13） |
| POST | `/workers/:id/reset-password` | **管理员重置密码**（新密码=手机号，公开接口，P2.13） |

**创建必填**：`openid`, `employeeNo`, `password`（服务端 bcrypt 入库）, `name`, `phone`, `skills`  
**v2.0 可选扩展字段**：`nickname`, `gender`, `idCard`, `position`, `emergency`, `emergencyPhone`  
**Response**：`WorkerDto`（**不含** `passwordHash`，含 `totalOrders`, `rating`, `status`, `skills`）

---

## 4. Admin 管理员模块

**路径前缀**：`/admins`  
CRUD 标准五接口

**创建必填**：`email`, `password`, `name`  
**Response**：`AdminDto`（**不含** `passwordHash`）

---

## 5. Address 地址管理

**路径前缀**：`/addresses`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/addresses` | 新增地址（`isDefault=true` 时同 resident 其余自动取消） |
| GET | `/addresses` | 分页列表（Query：`residentId?`, `isDefault?`） |
| GET | `/addresses/:id` | 地址详情 |
| PUT | `/addresses/:id` | 更新地址 |
| PUT | `/addresses/:id/default` | 设为默认地址 |
| DELETE | `/addresses/:id` | 删除地址 |

**创建必填**：`residentId`, `name`, `phone`, `province`, `city`, `district`, `detail`

---

## 6. ServiceCatalog 服务目录

**路径前缀**：`/service-catalogs`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/service-catalogs` | 新增服务目录 |
| GET | `/service-catalogs` | 分页列表（Query：`bizType?`, `isEnabled?=true`，按 `sortOrder` 升序） |
| GET | `/service-catalogs/:id` | 详情 |
| PUT | `/service-catalogs/:id` | 编辑（name/subtitle/icon/sortOrder） |
| DELETE | `/service-catalogs/:id` | 删除 |
| PATCH | `/service-catalogs/:id/toggle` | 切换启用/停用（反转 `isEnabled`） |

**bizType**：`CLEANING` / `RECYCLING` / `CONSULT`

**Request Body（POST/PUT）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bizType` | string | ✅（POST） | `CLEANING` / `RECYCLING` / `CONSULT` |
| `name` | string | ✅（POST） | 服务名称，最长 64 字符 |
| `subtitle` | string | | 副标题，最长 128 字符 |
| `icon` | string | | 图标 URL，最长 512 字符 |
| `sortOrder` | number | | 排序权重，越小越靠前，默认 0 |

**Response（ServiceCatalogDto）**

```typescript
{
  id: number;
  bizType: 'CLEANING' | 'RECYCLING' | 'CONSULT';
  name: string;
  subtitle?: string | null;
  icon?: string | null;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. CleaningOrder 保洁订单

**路径前缀**：`/cleaning-orders`  
订单号格式：`CLN + yyyyMMdd + 6位序号`（如 `CLN20260608000001`）

### 基础 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/cleaning-orders` | 创建订单（必填：`residentId`, `serviceItem`, `serviceDuration`, `appointDate`, `appointTimeSlot`, `addressId`, `contactName`, `contactPhone`） |
| GET | `/cleaning-orders` | 分页列表（Query：`residentId?`, `workerId?`, `status?`, `page`, `pageSize`） |
| GET | `/cleaning-orders/:id` | 订单详情（含 `workPhotos[]`） |
| PUT | `/cleaning-orders/:id` | 更新基础信息（仅 `PENDING_ASSIGN` 状态允许） |

### 操作接口（状态机驱动）

| 方法 | 路径 | 状态转移 | 说明 |
|------|------|---------|------|
| POST | `/cleaning-orders/:id/assign` | `PENDING_ASSIGN → ASSIGNED` | 派单（Body：`workerId`, `operatorId`） |
| POST | `/cleaning-orders/:id/accept` | `ASSIGNED → ACCEPTED` | 员工接单（Body：`operatorId`） |
| POST | `/cleaning-orders/:id/gps-checkin` | `ACCEPTED → IN_SERVICE` | GPS签到（Body：`lat`, `lng`, `operatorId`；超200m标记不阻断） |
| POST | `/cleaning-orders/:id/complete` | `IN_SERVICE → PENDING_REVIEW` | 完成服务（Body：`photoUrls[]`, `operatorId`） |
| POST | `/cleaning-orders/:id/cancel` | `PENDING_ASSIGN → CANCELLED` | 取消订单（仅待派单可取消） |

### 订单状态枚举

```
PENDING_ASSIGN → ASSIGNED → ACCEPTED → IN_SERVICE → PENDING_REVIEW → REVIEWED（终态）
     ↓（仅此处）
  CANCELLED（终态）
```

---

## 8. RecyclingOrder 废品回收订单

**路径前缀**：`/recycling-orders`  
订单号格式：`RCY + yyyyMMdd + 6位序号`  
状态链与保洁完全一致（见第7节），操作接口对称。

**创建必填**：`residentId`, `serviceItem`, `estimatedWeight`（预估重量 kg）, `appointDate`, `appointTimeSlot`, `addressId`, `contactName`, `contactPhone`  
**无** `referenceAmount`、`actualWeight`、`finalAmount` 字段。  
**v2.0 可选字段**：`isProxyOrder`, `serviceContactName`, `serviceContactPhone`, `source`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/recycling-orders` | 创建废品订单 |
| GET | `/recycling-orders` | 分页列表 |
| GET | `/recycling-orders/:id` | 详情 |
| PUT | `/recycling-orders/:id` | 更新基础信息 |
| POST | `/recycling-orders/:id/assign` | 派单（管理员，PENDING_ASSIGN→ASSIGNED） |
| POST | `/recycling-orders/:id/accept` | 接单（员工，ASSIGNED→ACCEPTED） |
| POST | `/recycling-orders/:id/gps-checkin` | GPS签到（员工，ACCEPTED→IN_SERVICE） |
| POST | `/recycling-orders/:id/complete` | 完成服务（员工上传照片，IN_SERVICE→PENDING_REVIEW） |
| POST | `/recycling-orders/:id/cancel` | 取消（仅 PENDING_ASSIGN 状态） |

---

## 9. ConsultOrder 咨询单

**路径前缀**：`/consult-orders`  
订单号格式：`CNS + yyyyMMdd + 6位序号`

**创建必填**：`serviceType`, `contactName`, `contactPhone`, `requirementDesc`；`residentId` 可选  
**v2.0 可选字段**：`isProxyOrder`, `serviceContactName`, `serviceContactPhone`, `serviceAddress`, `source`, `remark`  
代下单规则：`isProxyOrder=true` 时 `serviceContactName` 与 `serviceContactPhone` 必填

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/consult-orders` | 创建咨询单（v2.0：支持代下单字段） |
| GET | `/consult-orders` | 分页列表（Query：`status?`, `serviceType?`, `keyword?`） |
| GET | `/consult-orders/:id` | 详情 |
| PATCH | `/consult-orders/:id/status` | 更新状态（Body：`status`, `operatorId`, `remark?`） |
| POST | `/consult-orders/:id/follow-ups` | **新增跟进记录 v2.0**（Body：`handlerName`, `content`） |
| GET | `/consult-orders/:id/follow-ups` | **查询跟进记录列表 v2.0**（Query：`page?`, `pageSize?`；按时间升序） |

**状态链**：`FOLLOW_UP → FOLLOWING → COMPLETED`（单向不可逆，无取消态）

**ConsultFollowUp 结构**：`{ id, consultId, handlerName, content, createdAt }`

---

## 10. Upload 文件上传

**路径前缀**：`/upload`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/upload/image` | 上传图片（multipart/form-data，含 sharp 水印） |

**请求**：`file`（binary，JPEG/PNG/WebP，≤10MB） + `orderNo?`（Query，用于水印前缀）  
**Response**：`{ url: string; filename: string }`  
**本地存储**：`/uploads/` 目录；切换 COS 只需修改 `.env` 中 `STORAGE_PROVIDER=cos`

---

## 11. Review 评价

**路径前缀**：`/reviews`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/reviews` | 提交评价（订单需处于 `PENDING_REVIEW`，成功后订单流转至 `REVIEWED`） |
| GET | `/reviews` | 分页列表（Query：`orderType?`, `orderId?`） |
| GET | `/reviews/:id` | 评价详情 |

**创建必填**：`orderType`（CLEANING/RECYCLING）, `orderId`, `residentId`, `rating`（1-5）, `tags`（string[]）  
**Response**：`ReviewDto`（含 `rating`, `tags`, `content`, `images`, `createdAt`）

---

## 12. Complaint 投诉

**路径前缀**：`/complaints`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/complaints` | 提交投诉（支持三类订单，初始 `PENDING`） |
| GET | `/complaints` | 分页列表（Query：`status?`, `orderType?`） |
| GET | `/complaints/:id` | 投诉详情（含 `followUps[]`） |
| PATCH | `/complaints/:id/status` | 更新状态（`PENDING→PROCESSING→COMPLETED`，单向不可逆） |
| POST | `/complaints/:id/follow-ups` | 添加跟进记录 |

**reason 枚举**：`POOR_ATTITUDE` / `NOT_CLEAN` / `NOT_ON_TIME` / `ITEM_DAMAGED` / `EXTRA_CHARGE` / `OTHER`

---

## 13. Dashboard 数据看板

**路径前缀**：`/dashboard`  
**公共 Query 参数**：`startDate?`（ISO 日期）、`endDate?`（ISO 日期），各接口默认时间范围见下表。

| 方法 | 路径 | 默认范围 | 说明 |
|------|------|---------|------|
| GET | `/dashboard/summary` | — | 统计卡（今日/本周订单、在岗员工、平均评分） |
| GET | `/dashboard/order-trend` | 近 7 天 | 订单趋势，适配 ECharts 折线图 |
| GET | `/dashboard/service-type-distribution` | 近 30 天 | 服务类型分布，适配 ECharts 饼图/环形图 |
| GET | `/dashboard/rating-distribution` | 近 30 天 | 满意度分布（5→1星），适配 ECharts 饼图/环形图 |
| GET | `/dashboard/hourly-distribution` | 近 30 天 | 时段分布（24小时），适配 ECharts 柱状图 |
| GET | `/dashboard/worker-performance` | 近 30 天 | 员工绩效排名，按时间段内完成单量倒序 |

### 各接口返回数据结构

**`GET /dashboard/summary`**
```typescript
{
  todayOrders: number;      // 今日三类订单合计
  weekOrders: number;       // 本周三类订单合计
  activeWorkers: number;    // status=IDLE|BUSY 的员工数
  avgRating: number;        // 全量评价平均星级（保留 1 位小数）
}
```

**`GET /dashboard/order-trend`**
```typescript
{
  dates: string[];          // ["2026-06-02", ..., "2026-06-08"]
  cleaning: number[];       // 每天保洁订单数
  recycling: number[];      // 每天废品订单数
  consult: number[];        // 每天咨询订单数
}
```

**`GET /dashboard/service-type-distribution`**
```typescript
{
  data: [{ name: "保洁", value: number }, { name: "废品回收", value: number }, { name: "家政咨询", value: number }]
}
```

**`GET /dashboard/rating-distribution`**
```typescript
{
  data: [{ name: "5星", value: number }, ..., { name: "1星", value: number }]  // 5→1 倒序
}
```

**`GET /dashboard/hourly-distribution`**
```typescript
{
  hours: string[];   // ["00:00", "01:00", ..., "23:00"]
  counts: number[];  // 每小时订单数（三类合计）
}
```

**`GET /dashboard/worker-performance`**
```typescript
{
  items: Array<{
    workerId: number;
    name: string;
    employeeNo: string;
    totalOrders: number;       // 累计完成单数（Worker.totalOrders）
    completedInRange: number;  // 时间段内 REVIEWED 单数
    rating: number;            // 平均评分（保留 1 位小数）
    status: string;            // IDLE / BUSY
  }>
}
```

---

## 关键文件索引

| 模块 | 路径 |
|------|------|
| Auth | `apps/server/src/modules/auth/` |
| Resident | `apps/server/src/modules/resident/` |
| Worker | `apps/server/src/modules/worker/` |
| Admin | `apps/server/src/modules/admin/` |
| Address | `apps/server/src/modules/address/` |
| ServiceCatalog | `apps/server/src/modules/service-catalog/` |
| CleaningOrder | `apps/server/src/modules/cleaning-order/` |
| RecyclingOrder | `apps/server/src/modules/recycling-order/` |
| ConsultOrder | `apps/server/src/modules/consult-order/` |
| Upload | `apps/server/src/modules/upload/` |
| Review | `apps/server/src/modules/review/` |
| Complaint | `apps/server/src/modules/complaint/` |
| Dashboard | `apps/server/src/modules/dashboard/` |
| 状态机 | `apps/server/src/common/order-state-machine/` |
| GPS 校验 | `apps/server/src/common/geo/` |
| 存储策略 | `apps/server/src/common/storage/` |
| Prisma Schema | `apps/server/prisma/schema.prisma` |
| 共享类型 | `packages/shared/src/` |
| 种子数据 | `apps/server/prisma/seed.ts` |

---

## 状态机速查

### 保洁 / 废品订单（共用）

```
PENDING_ASSIGN → ASSIGNED → ACCEPTED → IN_SERVICE → PENDING_REVIEW → REVIEWED（终态）
     ↓（仅此处）
  CANCELLED（终态）
```

### 咨询单

```
FOLLOW_UP → FOLLOWING → COMPLETED（终态）
```

### 投诉

```
PENDING → PROCESSING → COMPLETED（终态）
```

---

## 14. Banner 轮播图

**路径前缀**：`/banners`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/banners` | 新增轮播图 |
| GET | `/banners` | 分页列表（Query：`displayTarget?`, `isEnabled?`） |
| GET | `/banners/active` | **有效轮播图**（isEnabled=true 且当前时间在 startTime~endTime 内，Query：`displayTarget?`） |
| GET | `/banners/:id` | 详情 |
| PUT | `/banners/:id` | 编辑 |
| DELETE | `/banners/:id` | 删除 |

**Request Body（POST）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `imageUrl` | string | ✅ | 图片 URL |
| `title` | string | | 标题 |
| `displayTarget` | string | | `RESIDENT`（默认）/ `WORKER` / `ALL` |
| `linkType` | string | | `NONE`（默认）/ `PAGE` / `URL` |
| `linkTarget` | string | | 跳转路径或 URL |
| `startTime` | string | ✅ | 生效开始时间（ISO8601） |
| `endTime` | string | ✅ | 生效结束时间（ISO8601） |
| `sortOrder` | number | | 排序权重，默认 0 |

**Response（BannerDto）**

```typescript
{
  id: number;
  imageUrl: string;
  title?: string | null;
  displayTarget: 'RESIDENT' | 'WORKER' | 'ALL';
  linkType: 'NONE' | 'PAGE' | 'URL';
  linkTarget?: string | null;
  startTime: string;
  endTime: string;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

> **居民端对接**：小程序首页轮播图调用 `GET /banners/active?displayTarget=RESIDENT`，无需鉴权。**P3.2 已对接**（`src/api/banner.ts` → `fetchActiveBanners()`）。

---

## 15. Operator 运营人员

**路径前缀**：`/operators`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/operators` | 新增运营人员 |
| GET | `/operators` | 分页列表（Query：`purpose?`） |
| GET | `/operators/contact` | **接单联系人**（purpose='接单' 第一条，供居民端首页客服电话使用） |
| GET | `/operators/:id` | 详情 |
| PUT | `/operators/:id` | 编辑 |
| DELETE | `/operators/:id` | 删除 |

**Request Body（POST）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 姓名 |
| `phone` | string | ✅ | 手机号（1[3-9]xxxxxxxx） |
| `purpose` | string | | 用途，默认「接单」 |

**Response（OperatorDto）**

```typescript
{
  id: number;
  name: string;
  phone: string;
  purpose: string;
  createdAt: string;
  updatedAt: string;
}
```

> **居民端对接**：首页客服电话调用 `GET /operators/contact`，无需鉴权；若无接单人员则返回 `data: null`。**P3.2 已对接**（`src/api/operator.ts` → `fetchContactOperator()`）。

---

## P3/P4/P5 对接注意事项

| 端 | 关键说明 |
|----|---------|
| **居民端（P3）** | 微信登录走 `/auth/wechat-login`（mock 阶段任意 code 可用）；创建订单时 `residentId` 从登录响应中取；评价提交后订单自动变 `REVIEWED`；首页轮播图 `GET /banners/active?displayTarget=RESIDENT`（✅ P3.2 已对接）；客服电话 `GET /operators/contact`（✅ P3.2 已对接）；保洁预约 `POST /cleaning-orders`（✅ P3.3 已对接）；废品预约 `POST /recycling-orders`（✅ P3.4 已对接）；家政咨询 `POST /consult-orders`（✅ P3.5 已对接）；地址选择 `GET/POST /addresses`（✅ P3.3 已对接）；H5 走 Vite 代理 `/api/v1`，小程序走 `VITE_API_BASE` |
| **员工端（P4）** | 接单用 `POST /cleaning-orders/:id/accept`；GPS 签到用 `POST /cleaning-orders/:id/gps-checkin`；完成服务先上传图片到 `/upload/image` 获取 URL，再调 `/cleaning-orders/:id/complete` |
| **管理后台（P5）** | 看板接口均在 `/dashboard/`；派单用 `/cleaning-orders/:id/assign`（传 `workerId`）；配置管理走 `/service-catalogs`、`/banners`、`/operators` |

---

## P3.1 完成说明（2026-06-17）

居民端应用骨架（P3.1）已完成，以下 Auth 接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `POST /auth/wechat-login` | App.vue 启动时静默登录，获取 JWT + residentId | ✅ P3.1 已对接 |
| `POST /auth/refresh` | request.ts 拦截器 401 自动刷新 token | ✅ P3.1 已对接 |
| `GET /auth/profile` | 登录后获取居民信息（name/phone 判断是否需补全） | ✅ P3.1 已对接 |
| `PUT /residents/:id` | ProfileCompleteModal 手动输入后更新姓名/手机号 | ✅ P3.1 已对接 |

**P3.1 关键新增文件**：`src/store/auth.ts`（Pinia）、`src/api/auth.ts`、`src/api/request.ts`、`src/components/PrivacyModal.vue`、`src/components/ProfileCompleteModal.vue`、`src/composables/useRouteGuard.ts`

---

## P3.2 完成说明（2026-06-20）

居民端首页（P3.2）已完成，以下接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /banners/active?displayTarget=RESIDENT` | 首页 swiper 轮播图动态加载 | ✅ P3.2 已对接 |
| `GET /operators/contact` | 首页底部客服条姓名+电话，一键拨打 | ✅ P3.2 已对接 |

**P3.2 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/index/index` | 首页：动态 Banner + 三大服务卡片 + 客服条 |
| `pages/service-detail/index?type=` | 服务详情：说明 + §1.6 边界声明 +「立即预约」 |

**P3.2 关键新增文件**：`src/api/banner.ts`、`src/api/operator.ts`、`src/pages/index/index.vue`（重写）、`src/pages/service-detail/index.vue`、`vite.config.ts`（H5 代理）、`.env.development` / `.env.production`

**双端 API 配置**：
- H5：`request.ts` 使用 `/api/v1`，Vite proxy 转发至 `http://127.0.0.1:3000`
- 小程序：`VITE_API_BASE=http://127.0.0.1:3000/api/v1`（开发）/ 生产域名（部署时替换）

---

## P3.3 完成说明（2026-06-20）

居民端保洁预约三步向导（P3.3）已完成，以下接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /service-catalogs?bizType=CLEANING&isEnabled=true` | 步骤 1 动态服务类型卡片 | ✅ P3.3 已对接 |
| `GET /addresses?residentId=X` | 步骤 2 默认地址加载 + 地址选择页列表 | ✅ P3.3 已对接 |
| `POST /addresses` | 地址选择页空地址引导新增 | ✅ P3.3 已对接 |
| `POST /cleaning-orders` | 步骤 3 提交预约，返回 CLN 前缀订单号 | ✅ P3.3 已对接 |

**P3.3 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/booking-cleaning/index` | 保洁预约三步向导（选服务 → 预约时间 → 确认订单） |
| `pages/address-select/index?from=cleaning` | 服务地址选择页（列表选择 + 底部新增入口） |

**P3.3 关键新增文件**：`src/pages/booking-cleaning/index.vue`、`src/pages/address-select/index.vue`、`src/store/booking-cleaning.ts`、`src/api/cleaning-order.ts`、`src/api/address.ts`、`src/api/service-catalog.ts`、`src/utils/lunar.ts`

**代下单字段**：`isProxyOrder` / `serviceContactName` / `serviceContactPhone` / `source=MINIPROGRAM`

---

## P3.4 完成说明（2026-06-20）

居民端废品回收预约三步向导（P3.4）已完成，复用 P3.3 框架：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /service-catalogs?bizType=RECYCLING&isEnabled=true` | 步骤 1 动态回收类型卡片 | ✅ P3.4 已对接 |
| `POST /recycling-orders` | 步骤 3 提交预约，返回 RCY 前缀订单号 | ✅ P3.4 已对接 |

**P3.4 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/booking-recycling/index` | 废品回收预约三步向导（选类型+重量 → 预约时间 → 确认订单） |
| `pages/address-select/index?from=recycling` | 服务地址选择页（与保洁共用） |

**P3.4 关键新增文件**：`src/pages/booking-recycling/index.vue`、`src/store/booking-recycling.ts`、`src/api/recycling-order.ts`

---

## P3.5 完成说明（2026-06-20）

居民端家政咨询提交流程（P3.5）已完成：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /service-catalogs?bizType=CONSULT&isEnabled=true` | Step 1 动态家政类型卡片 | ✅ P3.5 已对接 |
| `POST /consult-orders` | Step 2 提交咨询单，返回 CNS 前缀订单号 | ✅ P3.5 已对接 |

**P3.5 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/booking-consult/index` | 家政咨询两步向导（选类型 → 填写需求） |
| `pages/service-detail/index?type=consult` | 服务详情「立即预约」跳转家政咨询向导 |

**P3.5 关键新增文件**：`src/pages/booking-consult/index.vue`、`src/store/booking-consult.ts`、`src/api/consult-order.ts`、`src/api/service-catalog.ts`（新增 `fetchConsultCatalogs()`）

**代下单字段**：`isProxyOrder` / `serviceContactName` / `serviceContactPhone` / `source=MINIPROGRAM`；**无服务地址字段**

---

> **文档版本**：v2.9（P3.5 家政咨询提交流程已完成，咨询单/服务目录接口对接状态更新）
> **生成日期**：2026-06-20
> **覆盖范围**：P2.1 ~ P2.15 全部后端接口（共 15 个模块，60+ 个端点）+ P3.1–P3.5 前端对接说明
> **P2.15 新增**：`POST/GET /consult-orders/:id/follow-ups`（家政跟进记录）、ConsultOrder v2.0 字段适配  
> **P2.15 修正**：废品 IN_SERVICE→PENDING_REVIEW 由员工 `/complete` 触发（与保洁对称），`/resident-accept` 已撤销
