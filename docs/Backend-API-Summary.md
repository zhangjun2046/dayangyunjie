# Backend API Summary（P2 全接口交接文档）

> **生成节点**：P2.11 完成后 → 进入 P3 前  
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
| POST | `/auth/wechat-login` | 微信登录（mock code → openid），签发 JWT |
| POST | `/auth/refresh` | 使用 refreshToken 换取新 accessToken |
| GET | `/auth/profile` | 获取当前登录居民信息（需 Bearer Token） |

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
CRUD 标准五接口

**创建必填**：`openid`, `employeeNo`, `password`（服务端 bcrypt 入库）, `name`, `phone`, `skills`  
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
| GET | `/service-catalogs` | 分页列表（Query：`bizType?`, `isActive?=true`，按 `sortOrder` 升序） |
| GET | `/service-catalogs/:id` | 详情 |

**bizType**：`CLEANING` / `RECYCLING` / `CONSULT`  
**Response**：`ServiceCatalogDto`（含 `serviceItem`, `priceMin`, `priceMax`, `priceUnit`, `bizType`, `sortOrder`）

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

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/recycling-orders` | 创建废品订单 |
| GET | `/recycling-orders` | 分页列表 |
| GET | `/recycling-orders/:id` | 详情 |
| PUT | `/recycling-orders/:id` | 更新基础信息 |
| POST | `/recycling-orders/:id/assign` | 派单 |
| POST | `/recycling-orders/:id/accept` | 接单 |
| POST | `/recycling-orders/:id/gps-checkin` | GPS签到 |
| POST | `/recycling-orders/:id/complete` | 完成 |
| POST | `/recycling-orders/:id/cancel` | 取消 |

---

## 9. ConsultOrder 咨询单

**路径前缀**：`/consult-orders`  
订单号格式：`CNS + yyyyMMdd + 6位序号`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/consult-orders` | 创建咨询单（必填：`serviceType`, `name`, `phone`, `description`；`residentId` 可选） |
| GET | `/consult-orders` | 分页列表（Query：`status?`, `serviceType?`, `keyword?`） |
| GET | `/consult-orders/:id` | 详情 |
| PATCH | `/consult-orders/:id/status` | 更新状态（Body：`status`, `operatorId`, `remark?`） |

**状态链**：`PENDING → FOLLOWING_UP → COMPLETED`（单向不可逆，无取消态）

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
PENDING → FOLLOWING_UP → COMPLETED（终态）
```

### 投诉

```
PENDING → PROCESSING → COMPLETED（终态）
```

---

## P3/P4/P5 对接注意事项

| 端 | 关键说明 |
|----|---------|
| **居民端（P3）** | 微信登录走 `/auth/wechat-login`（mock 阶段任意 code 可用）；创建订单时 `residentId` 从登录响应中取；评价提交后订单自动变 `REVIEWED` |
| **员工端（P4）** | 接单用 `POST /cleaning-orders/:id/accept`；GPS 签到用 `POST /cleaning-orders/:id/gps-checkin`；完成服务先上传图片到 `/upload/image` 获取 URL，再调 `/cleaning-orders/:id/complete` |
| **管理后台（P5）** | 看板接口均在 `/dashboard/`；派单用 `/cleaning-orders/:id/assign`（传 `workerId`）；数据看板图表可直接使用 Dashboard 接口返回数据对接 ECharts |

---

> **文档版本**：v1.0  
> **生成日期**：2026-06-08  
> **覆盖范围**：P2.1 ~ P2.11 全部后端接口（共 13 个模块，50+ 个端点）  
> **下一里程碑**：P3 居民端小程序开发
