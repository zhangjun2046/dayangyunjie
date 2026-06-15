# OrderModule API Contract（P2.1–P2.13 交接文档）

> **生成节点**：P2.4 完成后 → 进入 P2.5a 前；**P2.13（2026-06-15）** 更新至 v2.1  
> **用途**：供后续订单模块（CleaningOrder 等）开发读取，避免上下文丢失  
> **Base URL**：`http://localhost:3000/api/v1`  
> **统一响应格式**：`{ code: number, message: string, data: T | null }`  
> **Swagger**：`http://localhost:3000/api/docs`
>
> **v2.0 变更摘要（P2.12，2026-06-15）**：
> - `ServiceCatalog`：移除价格字段（`priceMin/priceMax/priceUnit/description/isActive/serviceItem`），新增 `name/subtitle/icon/isEnabled/specialTips`
> - `ConsultOrder`：请求字段 `name→contactName`、`phone→contactPhone`、`description→requirementDesc`；状态枚举 `PENDING→FOLLOW_UP`、`FOLLOWING_UP→FOLLOWING`
> - `OrderSource`：移除 `PROXY`，仅保留 `MINIPROGRAM / PHONE`
> - 新增数据库表：`Banner`、`Operator`、`ConsultFollowUp`（API 接口由 P2.14/P2.15 补充）
>
> **v2.1 变更摘要（P2.13，2026-06-15）**：
> - 新增 `POST /auth/worker-login`：员工手机号+密码登录，签发 `role=worker` JWT
> - 新增 `WorkerJwtStrategy` / `WorkerJwtAuthGuard`：Worker 与 Resident token 完全隔离
> - 新增 `PUT /workers/:id/change-password`：员工自行修改密码（需 Worker JWT + 旧密码验证）
> - 新增 `POST /workers/:id/reset-password`：管理员重置员工密码为手机号（公开接口）
> - `JwtPayload` 接口：`openid` 改为可选，新增可选 `phone` 字段
>
> **v2.2 变更摘要（P2.14，2026-06-15）**：
> - `ServiceCatalog` 扩展为全 CRUD：新增 `POST /service-catalogs`、`PUT /:id`、`DELETE /:id`、`PATCH /:id/toggle`（切换 `isEnabled`）
> - 新增 `BannerModule`：6 个端点（全 CRUD + `GET /banners/active?displayTarget=`）；有效轮播图按 `isEnabled=true` 且当前时间在 `startTime~endTime` 内过滤
> - 新增 `OperatorModule`：6 个端点（全 CRUD + `GET /operators/contact`）；`/contact` 返回 `purpose='接单'` 第一条记录，无记录返回 `null`
> - `packages/shared` 新增 `BannerDto`、`OperatorDto` 两个共享接口类型

---

## 1. 通用约定

| 项 | 说明 |
|---|---|
| 成功码 | `code = 0`，`message = "ok"` |
| 错误码 | HTTP 状态码与 `code` 一致（400/401/404 等） |
| 分页列表 | `data: { items: T[], total: number, page: number, pageSize: number }` |
| 鉴权 | 仅 `/auth/profile` 需 `Authorization: Bearer <accessToken>`；其余 P2.1–P2.4 接口均为**公开** |
| 时间字段 | ISO 8601 字符串（如 `2026-06-02T05:29:49.708Z`） |
| 价格字段 | ~~`ServiceCatalog` 的 `priceMin`/`priceMax` 为字符串~~（v2.0 已移除价格字段，由运营后台配置报价） |

---

## 2. Auth 模块（P2.1）

### 2.1 POST `/auth/wechat-login`

微信登录（mock：`code` → 固定 openid），签发 JWT。

**鉴权**：公开

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | string | ✅ | 微信登录 code（mock 可任意字符串） |
| `nickname` | string | | 首次登录可选 |
| `avatar` | string | | 头像 URL，首次登录可选 |

**Response `data`**

```typescript
{
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // 秒，默认 7200
  };
  resident: {
    id: number;
    openid: string;
    nickname: string | null;
    avatar: string | null;
  };
}
```

---

### 2.2 POST `/auth/refresh`

使用 refresh token 刷新 access token。

**鉴权**：公开

**Request Body**

| 字段 | 类型 | 必填 |
|---|---|---|
| `refreshToken` | string | ✅ |

**Response `data`**

```typescript
{ tokens: { accessToken, refreshToken, expiresIn } }
```

---

### 2.3 GET `/auth/profile`

获取当前登录居民信息。

**鉴权**：Bearer Token（401 未携带或无效）

**Response `data`**

```typescript
{
  resident: {
    id: number;
    openid: string;
    nickname: string | null;
    avatar: string | null;
  };
}
```

### 2.4 POST `/auth/worker-login`（P2.13）

员工手机号+密码登录，签发 Worker JWT（`role=worker`，与居民端完全隔离）。

**鉴权**：公开

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `phone` | string | ✅ | 员工手机号 |
| `password` | string | ✅ | 登录密码（首次由管理员设定，遗忘可 reset-password 重置为手机号） |

**Response `data`**

```typescript
{
  tokens: {
    accessToken: string;   // role=worker，2h 有效
    refreshToken: string;  // 7d 有效
    expiresIn: number;     // 7200
  };
  worker: {
    id: number;
    phone: string;
    name: string;
    employeeNo: string;
  };
}
```

**错误码**：`401 Unauthorized`（手机号不存在或密码错误，统一消息"手机号或密码错误"，不区分以防枚举）

---

### 2.5 PUT `/workers/:id/change-password`（P2.13）

员工自行修改密码（需旧密码验证）。

**鉴权**：`WorkerJwtAuthGuard`（需携带 Worker access token）

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `oldPassword` | string | ✅ | 当前密码 |
| `newPassword` | string | ✅ | 新密码（≥6 位） |

**Response `data`**：`WorkerDto`（不含 `passwordHash`）

**错误码**：`400 BadRequest`（旧密码错误）、`401 Unauthorized`（未携带/无效 token）、`404 NotFound`（员工不存在）

---

### 2.6 POST `/workers/:id/reset-password`（P2.13）

管理员重置员工密码为完整手机号（员工忘记密码时使用）。

**鉴权**：公开（本期暂无 Admin Guard，P5 阶段加固）

**Response `data`**：`WorkerDto`（不含 `passwordHash`）

**错误码**：`404 NotFound`（员工不存在）

> **重置规则**：新密码 = `bcrypt.hash(worker.phone, 10)`，员工用手机号即可重新登录。

---

## 3. 用户 CRUD（P2.2）

三类用户接口结构一致：`POST` 创建 / `GET` 列表 / `GET :id` 详情 / `PUT :id` 更新 / `DELETE :id` 删除。

**鉴权**：公开（管理端鉴权留后续阶段）

### 3.1 Residents `/residents`

**创建 Body（最小必填 `openid`）**

| 字段 | 类型 | 必填 |
|---|---|---|
| `openid` | string | ✅ |
| `nickname` | string | |
| `name` | string | |
| `phone` | string | |
| `avatar` | string | |

**列表 Query**：`page`, `pageSize`, `openid?`, `phone?`, `name?`

**Response 单条 `data`**：`ResidentDto`（含 `id`, `openid`, `nickname`, `name`, `phone`, `avatar`, `createdAt`, `updatedAt`）

---

### 3.2 Workers `/workers`

**创建 Body（必填）**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `openid` | string | ✅ | |
| `employeeNo` | string | ✅ | 工号 |
| `password` | string | ✅ | 明文传输，服务端 bcrypt 存 `passwordHash` |
| `name` | string | ✅ | |
| `phone` | string | ✅ | |
| `avatar` | string | | |
| `status` | enum | | `IDLE` / `BUSY`，默认 `IDLE` |
| `rating` | number | | 0–5，默认 5 |
| `totalOrders` | number | | 默认 0 |
| `skills` | string[] | ✅ | 技能标签 |

**列表 Query**：`page`, `pageSize`, `employeeNo?`, `name?`, `phone?`, `status?`

**Response 单条 `data`**：`WorkerDto`（**不含** `passwordHash`）

---

### 3.3 Admins `/admins`

**创建 Body**

| 字段 | 类型 | 必填 |
|---|---|---|
| `email` | string | ✅ |
| `password` | string | ✅ |
| `name` | string | ✅ |

**列表 Query**：`page`, `pageSize`, `email?`, `name?`

**Response 单条 `data`**：`AdminDto`（**不含** `passwordHash`）

---

## 4. 地址管理（P2.3）

**Base path**：`/addresses`

**鉴权**：公开

### 4.1 POST `/addresses`

**Body**

| 字段 | 类型 | 必填 |
|---|---|---|
| `residentId` | number | ✅ |
| `name` | string | ✅ |
| `phone` | string | ✅ |
| `province` | string | ✅ |
| `city` | string | ✅ |
| `district` | string | ✅ |
| `detail` | string | ✅ |
| `lat` | number | |
| `lng` | number | |
| `isDefault` | boolean | 默认 false；为 true 时同 resident 其他地址自动取消默认 |

**Response `data`**：`AddressDto`

---

### 4.2 GET `/addresses`

**Query**：`page`, `pageSize`, `residentId?`, `isDefault?`

**Response `data`**：分页 `{ items: AddressDto[], total, page, pageSize }`

---

### 4.3 GET `/addresses/:id`

**Response `data`**：`AddressDto`（404 不存在）

---

### 4.4 PUT `/addresses/:id`

**Body**：`UpdateAddressDto`（`CreateAddressDto` 全部字段可选）

**业务规则**：更新 `isDefault=true` 时，同 resident 仅保留一条默认

**Response `data`**：`AddressDto`

---

### 4.5 PUT `/addresses/:id/default`

设为默认地址（同 resident 其他地址 `isDefault` 置 false）。

**Response `data`**：`AddressDto`

---

### 4.6 DELETE `/addresses/:id`

**Response `data`**：`{ id: number }`

---

## 5. 服务目录查询（P2.4）

**Base path**：`/service-catalogs`

**鉴权**：公开（小程序下单前浏览服务项）

**数据来源**：P1.2 种子数据（10 条：CLEANING×3、RECYCLING×2、CONSULT×5）

**图标说明**：Schema 无 `icon` 字段；前端按 `bizType` 静态映射图标

### 5.1 GET `/service-catalogs`

分页查询服务目录列表。

**Query**

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 10 | 每页数量，最大 100 |
| `bizType` | enum | | `CLEANING` / `RECYCLING` / `CONSULT` |
| `isActive` | boolean | `true` | 默认仅返回启用项 |

**排序**：`sortOrder ASC`, `id ASC`

**Response `data`**

```typescript
{
  items: ServiceCatalogDto[];
  total: number;
  page: number;
  pageSize: number;
}
```

**ServiceCatalogDto**（v2.0，P2.12 迁移后生效）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | |
| `bizType` | `CLEANING` \| `RECYCLING` \| `CONSULT` | 业务大类 |
| `name` | string | 服务项名称（原 `serviceItem`） |
| `subtitle` | string \| null | 副标题/简介 |
| `icon` | string \| null | 图标 URL |
| `sortOrder` | number | 排序 |
| `isEnabled` | boolean | 是否启用（原 `isActive`） |
| `specialTips` | string \| null | 特殊提示 |
| `createdAt` | string | |
| `updatedAt` | string | |

> **v1.x 已废弃字段**：`serviceItem`、`priceMin`、`priceMax`、`priceUnit`、`description`、`isActive`（P2.12 迁移后从 schema 移除）

**验收示例（2026-06-07）**

| Query | 期望 total |
|---|---|
| `?bizType=CLEANING&pageSize=100` | 3 |
| `?bizType=RECYCLING&pageSize=100` | 2 |
| `?bizType=CONSULT&pageSize=100` | 5 |
| `?pageSize=100` | 10 |
| `?bizType=FOO` | 400 校验错误 |

---

### 5.2 GET `/service-catalogs/:id`

**Response `data`**：`ServiceCatalogDto`（404 不存在）

---

## 6. 关键文件索引

| 模块 | 路径 |
|---|---|
| Auth | `apps/server/src/modules/auth/` |
| Resident | `apps/server/src/modules/resident/` |
| Worker | `apps/server/src/modules/worker/` |
| Admin | `apps/server/src/modules/admin/` |
| Address | `apps/server/src/modules/address/` |
| ServiceCatalog | `apps/server/src/modules/service-catalog/` |
| 共享类型 | `packages/shared/src/entities/`, `packages/shared/src/constants/` |
| 种子数据 | `apps/server/prisma/seed.ts` |

---

## 7. P2.5a 口径更新（CleaningOrder 创建）

- 读取本文档 + `packages/shared` 订单 DTO
- 创建 `CleaningOrder` CRUD，订单号规则为 `CLN + yyyyMMdd + 6位序号`
- 创建订单时 `referenceAmount = serviceDuration × priceMin`
- 创建接口请求体中显式必填 `residentId`（公开接口联调阶段）

**创建接口关键字段（确认版）**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `residentId` | number | ✅ | 创建请求体显式传入 |
| `serviceItem` | string | ✅ | 保洁服务项名称 |
| `serviceDuration` | number | ✅ | 服务时长（小时） |
| `appointDate` | string | ✅ | 预约日期 |
| `appointTimeSlot` | string | ✅ | 预约时段 |
| `addressId` | number | ✅ | 地址 ID |
| `contactName` | string | ✅ | 联系人 |
| `contactPhone` | string | ✅ | 联系电话 |

---

## 8. P2.5b 状态机契约（CleaningOrder 状态机核心，2026-06-07 确认）

> 本节为 P2.5b 编码的前置契约，AI Agent 实现时须严格遵守。

### 8.1 保洁订单状态枚举

```typescript
enum CleaningOrderStatus {
  PENDING_ASSIGN  = 'PENDING_ASSIGN',   // 待派单
  ASSIGNED        = 'ASSIGNED',          // 已派单
  ACCEPTED        = 'ACCEPTED',          // 已接单
  IN_SERVICE      = 'IN_SERVICE',        // 服务中
  PENDING_REVIEW  = 'PENDING_REVIEW',    // 待评价
  REVIEWED        = 'REVIEWED',          // 已评价（终态）
  CANCELLED       = 'CANCELLED',         // 已取消（终态）
}
```

### 8.2 合法状态转移规则

| 当前状态 | 允许转入 | 触发动作 | 操作方 |
|---|---|---|---|
| `PENDING_ASSIGN` | `ASSIGNED` | 运营分配员工 | Admin |
| `PENDING_ASSIGN` | `CANCELLED` | 居民主动取消 | Resident |
| `ASSIGNED` | `ACCEPTED` | 员工接单 | Worker |
| `ACCEPTED` | `IN_SERVICE` | 员工开始服务（含 GPS） | Worker |
| `IN_SERVICE` | `PENDING_REVIEW` | 员工完成服务 | Worker |
| `PENDING_REVIEW` | `REVIEWED` | 居民提交评价 | Resident |

> **取消规则**：`CANCELLED` 仅允许从 `PENDING_ASSIGN` 转入。其余状态转入 `CANCELLED` 均应抛出异常（HTTP 400，`message: "当前订单状态不允许取消，请联系客服"`）。  
> **非法转移**：上表以外的所有转移均为非法，抛出 HTTP 400 并说明当前状态与目标状态。

### 8.3 三端状态显示名映射

> 前端按此表进行枚举值 → 显示文字的映射，**不在后端处理显示名**。

| 枚举值 | 居民端 | 员工端 | 后台 |
|---|---|---|---|
| `PENDING_ASSIGN` | 待派单 | —（不可见） | 待派单 |
| `ASSIGNED` | 已派单 | **待接单** | 已派单 |
| `ACCEPTED` | 已接单 | 已接单 | 已接单 |
| `IN_SERVICE` | 服务中 | 服务中 | 服务中 |
| `PENDING_REVIEW` | 待评价 | 待评价 | 待评价 |
| `REVIEWED` | 已评价 | 已评价 | 已评价 |
| `CANCELLED` | 已取消 | 已取消 | 已取消 |

### 8.4 废品订单状态（与保洁一致）

废品订单（`RecyclingOrder`）状态枚举与保洁完全一致，直接复用 §8.1 枚举定义，**无额外状态**。

状态转移规则与 §8.2 保洁订单完全相同：`IN_SERVICE` → `PENDING_REVIEW`（员工完成服务并上传照片后直接流转）。

> **调整说明（2026-06-08）**：废品回收预约仅填写预估重量供员工确认搬运工具，不涉及计价；废品流程无验收节点，`PENDING_ACCEPTANCE` 枚举**不实现**。

### 8.5 不实现项（一期排除）

| 项目 | 说明 |
|---|---|
| `paymentStatus` 字段 | 线下收款留痕不做，数据模型中不含此字段 |
| "已收款"按钮 | 员工端不实现 |
| `payment_status_log` | 不实现 |
| 居民取消（非待派单） | 系统层面直接拒绝，不提供接口入口 |
| `PENDING_ACCEPTANCE` 枚举 | 废品无验收节点，不实现 |
| `actual_weight` 字段 | 废品无实际称重，数据模型中不含此字段 |
| `final_amount` 字段 | 废品不核定金额，数据模型中不含此字段 |
| 废品 `reference_amount` | 废品不展示价格，废品创建接口无此字段 |

### 8.6 order_status_log 审计日志

每次状态变更必须写入 `order_status_log` 表，字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `orderId` | number | 关联订单 ID |
| `orderType` | string | `CLEANING` / `RECYCLING` |
| `fromStatus` | string | 变更前状态 |
| `toStatus` | string | 变更后状态 |
| `operatorId` | number | 操作人 ID |
| `operatorType` | string | `RESIDENT` / `WORKER` / `ADMIN` |
| `remark` | string \| null | 备注（如取消原因、GPS 超距说明） |
| `createdAt` | DateTime | 操作时间戳 |

---

## 9. P2.5c 操作接口（CleaningOrder 语义化操作，2026-06-07）

> 基于 P2.5b 状态机，为保洁订单新增 5 个语义化操作端点。各端点内部调用 `OrderStateMachineService.transition()`，状态机校验非法转移并抛出 HTTP 400。

**Base path**：`/cleaning-orders/:id`

**鉴权**：公开（管理端/员工端鉴权留后续阶段）

---

### 9.1 POST `/cleaning-orders/:id/assign` — 派单

管理员分配员工，将订单从 `PENDING_ASSIGN` 变更为 `ASSIGNED`，同时写入 `workerId`。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `workerId` | number | ✅ | 分配的员工 ID（不存在返回 404） |
| `operatorId` | number | ✅ | 操作管理员 ID |

**Response `data`**：`CleaningOrderDto`（`workerId` 和 `status: ASSIGNED` 已更新）

**错误**：

| 状态码 | 场景 |
|---|---|
| 400 | 订单当前状态非 `PENDING_ASSIGN`（状态机拒绝） |
| 404 | 订单不存在 / `workerId` 对应员工不存在 |

---

### 9.2 POST `/cleaning-orders/:id/accept` — 接单

员工确认接受派单，状态 `ASSIGNED → ACCEPTED`。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `operatorId` | number | ✅ | 操作员工 ID |

**Response `data`**：`CleaningOrderDto`（`status: ACCEPTED`）

**错误**：400（当前状态非 `ASSIGNED`）、404（订单不存在）

---

### 9.3 POST `/cleaning-orders/:id/gps-checkin` — GPS 签到

员工到达现场上传位置，系统用 Haversine 公式计算与订单地址坐标的距离。状态 `ACCEPTED → IN_SERVICE`。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `lat` | number | ✅ | 签到纬度（-90 ~ 90） |
| `lng` | number | ✅ | 签到经度（-180 ~ 180） |
| `operatorId` | number | ✅ | 操作员工 ID |

**GPS 超距规则**

| 条件 | 行为 |
|---|---|
| 订单地址含坐标且距离 ≤ 200m | 正常签到，`gpsRemark: null` |
| 订单地址含坐标且距离 > 200m | 签到成功但标记 `gpsRemark: "超距签到，距离Xm"` |
| 订单地址无坐标 | 签到成功，`gpsRemark: "地址无坐标，跳过距离校验"` |

**Response `data`**：`CleaningOrderDto`（含 `gpsLat`、`gpsLng`、`gpsCheckinAt`、`gpsDistance`、`gpsRemark`）

**错误**：400（当前状态非 `ACCEPTED`）、404（订单不存在）

---

### 9.4 POST `/cleaning-orders/:id/complete` — 完成服务

员工上传完工照片，系统写入 `work_photos` 表，状态 `IN_SERVICE → PENDING_REVIEW`。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `photoUrls` | string[] | ✅ | 完工照片 URL 列表（至少 1 张） |
| `operatorId` | number | ✅ | 操作员工 ID |

**写入 `work_photos`**：每个 URL 生成一条记录，`photoType: AFTER`，`orderType: CLEANING`，`uploadedBy: operatorId`。

**Response `data`**：`CleaningOrderDto`（`status: PENDING_REVIEW`）

**错误**：400（当前状态非 `IN_SERVICE` / `photoUrls` 为空）、404（订单不存在）

---

### 9.5 POST `/cleaning-orders/:id/cancel` — 取消订单

仅允许在 `PENDING_ASSIGN` 状态下取消，其余状态返回 HTTP 400（`"当前订单状态不允许取消，请联系客服"`）。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `operatorId` | number | ✅ | 操作人 ID |
| `operatorType` | enum | ✅ | `RESIDENT` / `ADMIN` |
| `remark` | string | | 取消原因（最长 512 字符） |

**Response `data`**：`CleaningOrderDto`（`status: CANCELLED`）

**错误**：400（当前状态非 `PENDING_ASSIGN`）、404（订单不存在）

---

### 9.6 全链路端到端验收流程

```
POST /cleaning-orders          → 创建订单（status: PENDING_ASSIGN）
POST /cleaning-orders/:id/assign   → 派单（status: ASSIGNED，workerId 填充）
POST /cleaning-orders/:id/accept   → 接单（status: ACCEPTED）
POST /cleaning-orders/:id/gps-checkin → GPS签到（status: IN_SERVICE）
POST /cleaning-orders/:id/complete → 完成（status: PENDING_REVIEW）
```

**超距签到验收**：传入距离订单地址 > 200m 的坐标，`gpsRemark` 应包含 `"超距签到"` 字样，订单状态仍正常变更为 `IN_SERVICE`。

---

## 10. P2.6a 口径更新（RecyclingOrder，2026-06-08 确认）

> **调整背景**：废品回收预约仅填写预估重量供员工确认搬运工具，流程与保洁完全一致，无验收节点与价格字段。

### 10.1 废品订单操作接口（与保洁对称）

**Base path**：`/recycling-orders/:id`

操作接口与保洁订单完全对称，无额外接口：

| 接口 | 说明 | 状态转移 |
|---|---|---|
| `POST /recycling-orders/:id/assign` | 派单 | `PENDING_ASSIGN → ASSIGNED` |
| `POST /recycling-orders/:id/accept` | 接单 | `ASSIGNED → ACCEPTED` |
| `POST /recycling-orders/:id/gps-checkin` | GPS 签到 | `ACCEPTED → IN_SERVICE` |
| `POST /recycling-orders/:id/complete` | 完成服务 | `IN_SERVICE → PENDING_REVIEW` |
| `POST /recycling-orders/:id/cancel` | 取消 | `PENDING_ASSIGN → CANCELLED` |

**以下接口不实现**（原计划，现取消）：
- ~~`POST /recycling-orders/:id/record-weight`~~（实际重量录入）
- ~~`POST /recycling-orders/:id/accept-by-resident`~~（居民验收）

---

### 10.2 废品订单创建接口关键字段（确认版）

**`POST /recycling-orders`**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `residentId` | number | ✅ | 创建请求体显式传入 |
| `serviceItem` | string | ✅ | `大件类` / `小件类` |
| `estimatedWeight` | number | ✅ | 预估重量（kg），供员工确认搬运工具 |
| `appointDate` | string | ✅ | 预约日期 |
| `appointTimeSlot` | string | ✅ | 预约时段 |
| `addressId` | number | ✅ | 地址 ID |
| `contactName` | string | ✅ | 联系人 |
| `contactPhone` | string | ✅ | 联系电话 |
| `remark` | string | | 备注 |

**无以下字段**：`referenceAmount`（废品不展示价格）、`actualWeight`（不称重）、`finalAmount`（不核定）。

---

## 11. P2.7 ConsultOrder 咨询单（2026-06-08 确认）

> **业务说明**：家政咨询单，无员工派单/GPS/拍照流程，仅三态流转（管理员操作）。
> `residentId` 可选（支持匿名咨询），`order_status_logs` 记录所有状态变更。

**Base path**：`/consult-orders`

**鉴权**：公开（管理端鉴权留后续阶段）

### 11.1 状态机规则

```
FOLLOW_UP（待跟进）→ FOLLOWING（跟进中）→ COMPLETED（已完成）
```

> **v2.0 变更（P2.12）**：`PENDING` 改名为 `FOLLOW_UP`，`FOLLOWING_UP` 改名为 `FOLLOWING`

- 单向不可逆，无取消态
- 非法转移（包括跳步）返回 HTTP 400
- 每次变更写入 `order_status_logs`（`orderType: 'CONSULT'`, `operatorType: 'ADMIN'`）

### 11.2 POST `/consult-orders` — 创建咨询单

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serviceType` | string | ✅ | 咨询类型（最长 32 字符） |
| `contactName` | string | ✅ | 联系人姓名（原 `name`，最长 32 字符） |
| `contactPhone` | string | ✅ | 联系电话（原 `phone`，最长 20 字符） |
| `requirementDesc` | string | ✅ | 需求描述（原 `description`，最长 1000 字符） |
| `residentId` | number | | 居民 ID（可选，不传表示匿名咨询） |

**Response `data`**：`ConsultOrderDto`（`orderNo` 格式：`CNS + yyyyMMdd + 6位序号`，默认 `status: FOLLOW_UP`）

---

### 11.3 GET `/consult-orders` — 分页列表

**Query**

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 10 | 每页数量 |
| `status` | enum | | `FOLLOW_UP` / `FOLLOWING` / `COMPLETED` |
| `serviceType` | string | | 模糊匹配服务类型 |
| `keyword` | string | | 模糊匹配订单号 / 联系人姓名 / 手机号 |

**Response `data`**：`{ items: ConsultOrderDto[], total, page, pageSize }`

---

### 11.4 GET `/consult-orders/:id` — 详情

**Response `data`**：`ConsultOrderDto`（404 = 不存在）

---

### 11.5 PATCH `/consult-orders/:id/status` — 更新状态

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | enum | ✅ | 目标状态：`FOLLOWING` 或 `COMPLETED` |
| `operatorId` | number | ✅ | 操作管理员 ID |
| `remark` | string | | 跟进备注（最长 512 字符） |

**错误**：

| 状态码 | 场景 |
|--------|------|
| 400 | 非法转移（含跳步、终态再变更） |
| 404 | 咨询单不存在 |

**Response `data`**：`ConsultOrderDto`（`status` 已更新）

---

### 11.6 ConsultOrderDto 字段定义

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 主键 |
| `orderNo` | string | `CNS + yyyyMMdd + 6位序号` |
| `residentId` | number \| undefined | 关联居民（可选） |
| `serviceType` | string | 咨询类型 |
| `contactName` | string | 联系人姓名（原 `name`） |
| `contactPhone` | string | 联系电话（原 `phone`） |
| `requirementDesc` | string | 需求描述（原 `description`） |
| `status` | `FOLLOW_UP` \| `FOLLOWING` \| `COMPLETED` | 当前状态 |
| `createdAt` | string | ISO 8601 |
| `updatedAt` | string | ISO 8601 |

---

### 11.7 全链路验收流程

```
POST /consult-orders                          → 创建（status: FOLLOW_UP，orderNo: CNS...）
PATCH /consult-orders/:id/status {FOLLOWING}  → 跟进中（status: FOLLOWING）
PATCH /consult-orders/:id/status {COMPLETED}  → 已完成（status: COMPLETED）
PATCH /consult-orders/:id/status {FOLLOWING}  → HTTP 400（终态保护）
```

**非法转移验收**：`FOLLOW_UP → COMPLETED`（跳步）应返回 HTTP 400，`message` 含 "非法状态转移"。

---

## 12. P2.8 GeoService GPS 签到校验（2026-06-08 确认）

> **背景**：P2.5c / P2.6a 中保洁和废品两个订单模块各自内嵌了相同的 Haversine 距离计算逻辑。P2.8 将其抽取为独立的 `GeoService`，供所有订单模块复用。

**文件路径**：`apps/server/src/common/geo/geo.service.ts`

### 12.1 GpsCheckinResult 接口

```typescript
export interface GpsCheckinResult {
  distance: number | null;   // 签到点与服务地址距离（米，保留1位小数）；地址无坐标时为 null
  remark: string | null;     // 异常说明（超距或无坐标时有值，正常范围内为 null）
  outOfRange: boolean;       // 是否超出允许距离阈值
}
```

### 12.2 GeoService 方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `haversineMeters` | `(lat1, lng1, lat2, lng2): number` | Haversine 球面距离计算，返回米 |
| `validateCheckin` | `(addressLat, addressLng, workerLat, workerLng, thresholdM=200): GpsCheckinResult` | 综合校验，返回结构化结果 |

### 12.3 三种校验结果

| 情况 | distance | remark | outOfRange |
|------|----------|--------|------------|
| 在阈值内（≤200m） | 实际距离值 | `null` | `false` |
| 超距（>200m） | 实际距离值 | `"超距签到，距离XXXm"` | `true` |
| 地址无坐标 | `null` | `"地址无坐标，跳过距离校验"` | `false` |

> **超距不阻断**：签到仍成功，`gpsRemark` 字段留存记录供管理员查看。

### 12.4 模块依赖关系

```
GeoModule (exports GeoService)
  ├── CleaningOrderModule (imports GeoModule)
  └── RecyclingOrderModule (imports GeoModule)
```

### 12.5 使用方式（订单 Service 内）

```typescript
const { distance: gpsDistance, remark: gpsRemark } = this.geoService.validateCheckin(
  snapshot?.lat,   // 服务地址纬度
  snapshot?.lng,   // 服务地址经度
  dto.lat,         // 员工签到纬度
  dto.lng,         // 员工签到经度
);
```

## 13. P2.9 文件上传 + 水印（2026-06-08 确认）

> **功能说明**：员工拍摄的服务照片上传接口，使用 sharp SVG composite 在图片右下角叠加水印（订单号 + 时间戳）。存储层采用 Strategy 模式，开发期使用本地 `/uploads` 目录，部署前通过 `STORAGE_PROVIDER` 环境变量一键切换至腾讯云 COS。

**文件路径**：`apps/server/src/modules/upload/upload.controller.ts`  
**存储模块**：`apps/server/src/common/storage/`

### 13.1 POST `/upload/image` — 上传图片

**鉴权**：公开（管理端/员工端鉴权留后续阶段）

**Content-Type**：`multipart/form-data`

**请求字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | binary | ✅ | 图片文件（JPEG / PNG / WebP，≤10MB） |
| `orderNo` | string（Query） | | 订单号（可选），写入水印；缺省时水印仅含时间戳，文件名前缀降级为 `IMG` |

**水印规则**

| 场景 | 水印内容 | 文件名前缀 |
|------|----------|-----------|
| 传入 `orderNo` | `{orderNo} YYYY/MM/DD HH:mm:ss` | `{orderNo}_` |
| 未传 `orderNo` | `YYYY/MM/DD HH:mm:ss` | `IMG_` |

**文件命名**：`{prefix}_{timestamp}_{random6位}.jpg`

**Response `data`**

```typescript
{
  url: string;       // 图片访问 URL（本地：http://localhost:3000/uploads/xxx.jpg）
  filename: string;  // 存储文件名
}
```

**错误**

| 状态码 | 场景 |
|--------|------|
| 400 | 未传 `file` 字段 |
| 400 | 文件类型不支持（非 JPEG/PNG/WebP） |

### 13.2 存储策略切换

**配置文件**：`apps/server/.env`

```dotenv
# 切换方式：改为 cos 并填写下方密钥即可，无需修改代码
STORAGE_PROVIDER=local

COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=ap-guangzhou
```

**策略说明**

| `STORAGE_PROVIDER` | 实现类 | 返回 URL 格式 |
|--------------------|--------|--------------|
| `local`（默认） | `LocalStorageStrategy` | `http://localhost:3000/uploads/{filename}` |
| `cos` | `CosStorageStrategy` | COS 临时签名 URL（部署前实现） |

### 13.3 静态资源服务

`main.ts` 已配置 `useStaticAssets`，本地开发时 `/uploads/*` 路由直接映射至 `apps/server/uploads/` 目录，无需额外 Nginx 配置。

### 13.4 全链路验收结果（2026-06-08）

| # | 场景 | 结果 |
|---|------|------|
| 1 | 上传图片 + `orderNo=CLN20260608000001` | ✅ 返回 CLN 前缀 URL，水印含订单号+时间 |
| 2 | 上传图片 + `orderNo=RCY20260608000002` | ✅ 返回 RCY 前缀 URL，水印含订单号+时间 |
| 3 | 上传图片，不传 `orderNo` | ✅ 返回 IMG 前缀 URL，水印仅含时间 |
| 4 | 上传 `.txt` 文本文件 | ✅ 返回 400，"不支持的文件类型" |
| 5 | 请求缺少 `file` 字段 | ✅ 返回 400，"未接收到文件" |

---

## 14. P2.10 Review 评价模块（2026-06-08 确认）

> **功能说明**：居民对已完成服务（`PENDING_REVIEW` 状态）提交星级/标签/文字/图片评价。评价提交成功后，订单状态自动流转至 `REVIEWED`（写入审计日志）。

**Base path**：`/reviews`

**鉴权**：公开（管理端/居民端鉴权留后续阶段）

### 14.1 POST `/reviews` — 提交评价

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `orderType` | `CLEANING` \| `RECYCLING` | ✅ | 订单类型 |
| `orderId` | number | ✅ | 订单 ID |
| `residentId` | number | ✅ | 操作居民 ID（用于审计日志） |
| `rating` | number | ✅ | 星级（1–5） |
| `tags` | string[] | ✅ | 标签数组（如 `["准时","干净"]`） |
| `content` | string | | 文字评语（最长 1000 字符） |
| `images` | string[] | | 评价图片 URL 列表 |

**业务规则**：订单状态必须为 PENDING_REVIEW；同一订单不可重复评价；评价成功后订单流转至 REVIEWED 并写入 order_status_logs。

**Response `data`**：`ReviewDto`（400 = 非 PENDING_REVIEW 或重复评价；404 = 订单不存在）

---

### 14.2 GET `/reviews` — 分页查询评价列表

**Query**：`orderType?` / `orderId?` / `page`（默认 1）/ `pageSize`（默认 10）

**Response `data`**：`{ items: ReviewDto[], total, page, pageSize }`

---

### 14.3 GET `/reviews/:id` — 评价详情

**Response `data`**：`ReviewDto`（404 = 不存在）

---

### 14.4 ReviewDto 字段

| 字段 | 类型 |
|------|------|
| `id` | number |
| `cleaningOrderId` | number \| null |
| `recyclingOrderId` | number \| null |
| `orderType` | `CLEANING` \| `RECYCLING` |
| `rating` | number（1–5） |
| `tags` | string[] |
| `content` | string \| null |
| `images` | string[] \| null |
| `createdAt` | ISO 8601 string |

---

## 15. P2.10 Complaint 投诉模块（2026-06-08 确认）

> **功能说明**：居民对保洁/废品/咨询三类订单提交投诉，管理员处理并添加跟进记录，最终结案。

**Base path**：`/complaints`

**鉴权**：公开（管理端/居民端鉴权留后续阶段）

### 15.1 POST `/complaints` — 提交投诉

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `orderType` | `CLEANING` \| `RECYCLING` \| `CONSULT` | ✅ | 订单类型 |
| `orderId` | number | ✅ | 订单 ID |
| `reason` | ComplaintReason | ✅ | `POOR_ATTITUDE`/`NOT_CLEAN`/`NOT_ON_TIME`/`ITEM_DAMAGED`/`EXTRA_CHARGE`/`OTHER` |
| `description` | string | ✅ | 投诉描述（最长 1000 字符） |
| `evidenceImages` | string[] | | 凭证图片 URL 列表 |

**Response `data`**：`ComplaintDto`（初始 `status: PENDING`；404 = 订单不存在）

---

### 15.2 GET `/complaints` — 分页查询投诉列表

**Query**：`status?`（PENDING/PROCESSING/COMPLETED）/ `orderType?` / `page` / `pageSize`

**Response `data`**：`{ items: ComplaintDto[], total, page, pageSize }`（不含 followUps）

---

### 15.3 GET `/complaints/:id` — 投诉详情（含跟进记录）

**Response `data`**：`ComplaintDto & { followUps: ComplaintFollowUpDto[] }`（404 = 不存在）

---

### 15.4 PATCH `/complaints/:id/status` — 更新投诉状态

**Body**：`status`（PROCESSING/COMPLETED）、`operatorName`、`remark?`

**状态机**：`PENDING → PROCESSING → COMPLETED`（单向不可逆；终态 COMPLETED 不可再变更，返回 400）

---

### 15.5 POST `/complaints/:id/follow-ups` — 添加跟进记录

**Body**：`handlerName`（最长 32 字符）、`content`（最长 2000 字符）

**Response `data`**：`ComplaintFollowUpDto`（404 = 投诉不存在）

---

### 15.6 全链路验收流程

```
POST /complaints                          → 创建（status: PENDING）
PATCH /complaints/:id/status {PROCESSING} → 处理中
POST  /complaints/:id/follow-ups          → 添加跟进记录
PATCH /complaints/:id/status {COMPLETED}  → 已结案
PATCH /complaints/:id/status {PROCESSING} → HTTP 400（终态保护）
GET   /complaints/:id                     → 详情含 followUps 列表
```

### 14.5 全链路验收结果（2026-06-08）

| # | 场景 | 结果 |
|---|------|------|
| 1 | 保洁订单走完全链路至 PENDING_REVIEW，POST /reviews 提交 rating=5 + tags | ✅ reviewId=1，rating=5，tags=[准时,干净,专业] |
| 2 | 评价提交后 GET cleaning-orders/:id | ✅ status = REVIEWED |
| 3 | 重复评价同一订单 | ✅ HTTP 400，消息含「重复」 |
| 4 | 对非 PENDING_REVIEW 状态订单提交评价 | ✅ HTTP 400，消息含订单状态 |

---

### 15.7 全链路验收结果（2026-06-08）

| # | 场景 | 结果 |
|---|------|------|
| 1 | POST /complaints，reason=NOT_CLEAN，含凭证图片 | ✅ status=PENDING，evidenceImages 正确保存 |
| 2 | PATCH status {PROCESSING} | ✅ status=PROCESSING |
| 3 | POST /follow-ups，handlerName + content | ✅ followUpId=1，字段正确 |
| 4 | PATCH status {COMPLETED} | ✅ status=COMPLETED |
| 5 | PATCH status {PROCESSING}（终态保护） | ✅ HTTP 400，"投诉已处于终态（COMPLETED），不可再变更状态" |
| 6 | GET /complaints/:id | ✅ status=COMPLETED，followUps 数组含 1 条记录 |

---

## 16. P2.11 Dashboard 数据看板聚合 API（2026-06-08 确认）

> **功能说明**：为管理后台数据看板提供 6 个聚合统计接口，返回格式直接适配 ECharts 各图表组件入参。支持 `startDate`/`endDate` 时间范围筛选。

**Base path**：`/dashboard`

**鉴权**：公开（管理端鉴权留 P5 阶段实现）

### 16.1 公共查询参数（所有接口适用）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `startDate` | string（ISO 日期） | | 统计起始日期，如 `2026-06-01`，缺省见各接口默认范围 |
| `endDate` | string（ISO 日期） | | 统计结束日期，如 `2026-06-08`，缺省见各接口默认范围 |

---

### 16.2 GET `/dashboard/summary` — 统计卡

**鉴权**：公开（不受 startDate/endDate 控制，始终反映固定时段实时值）

**Response `data`**
```typescript
{
  todayOrders: number;      // 今日三类订单合计
  weekOrders: number;       // 本周三类订单合计
  activeWorkers: number;    // status=IDLE|BUSY 的员工数
  avgRating: number;        // 全量评价平均星级（保留 1 位小数）
}
```

**验收结果（2026-06-08）**：`{ todayOrders: 8, weekOrders: 8, activeWorkers: 3, avgRating: 5 }` ✅

---

### 16.3 GET `/dashboard/order-trend` — 订单趋势（ECharts 折线图）

**默认范围**：近 7 天

**Response `data`**
```typescript
{
  dates: string[];      // ["2026-06-02", ..., "2026-06-08"]（xAxis.data）
  cleaning: number[];   // 每天保洁订单数（series[0].data，与 dates 等长）
  recycling: number[];  // 每天废品订单数（series[1].data，与 dates 等长）
  consult: number[];    // 每天咨询订单数（series[2].data，与 dates 等长）
}
```

**ECharts 对接**：`xAxis.data = dates`，`series[N].data = cleaning/recycling/consult` ✅

---

### 16.4 GET `/dashboard/service-type-distribution` — 服务类型分布（ECharts 环形图）

**默认范围**：近 30 天

**Response `data`**
```typescript
{
  data: [
    { name: "保洁",     value: number },
    { name: "废品回收", value: number },
    { name: "家政咨询", value: number },
  ]  // 直接赋给 series.data，符合 ECharts 饼图标准格式
}
```

**验收结果（2026-06-08）**：`[保洁:8, 废品回收:2, 家政咨询:3]`，合计=13 ✅

---

### 16.5 GET `/dashboard/rating-distribution` — 满意度分布（ECharts 环形图）

**默认范围**：近 30 天

**Response `data`**
```typescript
{
  data: [
    { name: "5星", value: number },
    { name: "4星", value: number },
    { name: "3星", value: number },
    { name: "2星", value: number },
    { name: "1星", value: number },
  ]  // 5→1 倒序；零值项保留（避免 ECharts 空数据报错）
}
```

---

### 16.6 GET `/dashboard/hourly-distribution` — 时段分布（ECharts 柱状图）

**默认范围**：近 30 天

**Response `data`**
```typescript
{
  hours: string[];   // ["00:00", "01:00", ..., "23:00"]（固定 24 项，xAxis.data）
  counts: number[];  // 每小时订单数三类合计（固定 24 项，与 hours 等长，series.data）
}
```

> 保洁/废品按 `appointTimeSlot` 解析首个小时（支持 "09:00-11:00" 数字格式及"上午/下午/晚上"中文格式）；咨询单按 `createdAt` 小时统计。

---

### 16.7 GET `/dashboard/worker-performance` — 员工绩效排名

**默认范围**：近 30 天

**Response `data`**
```typescript
{
  items: Array<{
    workerId: number;
    name: string;
    employeeNo: string;
    totalOrders: number;       // 累计完成单数（Worker.totalOrders 字段）
    completedInRange: number;  // 时间段内 REVIEWED 状态单数（清洁+废品合计）
    rating: number;            // 平均评分（保留 1 位小数）
    status: string;            // IDLE / BUSY
  }>
  // 按 completedInRange 倒序排列，同值再按 totalOrders 倒序
}
```

---

### 16.8 全链路验收结果（2026-06-08）

| # | 接口 | 验收项 | 结果 |
|---|------|--------|------|
| 1 | `/summary` | 今日订单=8，本周=8，员工=3，评分=5.0 | ✅ 数字与测试数据一致 |
| 2 | `/order-trend` | 7个日期，三组数组等长，数据集中在6/7和6/8 | ✅ ECharts折线图格式校验通过 |
| 3 | `/service-type-distribution` | `{name,value}[]` 结构，合计=13 | ✅ ECharts饼图格式校验通过 |
| 4 | `/rating-distribution` | 5项固定（5→1星），含零值占位 | ✅ ECharts饼图格式校验通过 |
| 5 | `/hourly-distribution` | 24项固定，hours/counts等长，09:00和14:00有峰值 | ✅ ECharts柱状图格式校验通过 |
| 6 | `/worker-performance` | 3名员工，按completedInRange倒序排列 | ✅ el-table格式校验通过 |
| 7 | 时间范围筛选 | `?startDate=2026-06-01&endDate=2026-06-05` 返回5天数据 | ✅ 范围计算正确 |
| 8 | Jest 单元测试 | 新增20项（全套回归182项） | ✅ 全部通过 |
| 9 | `npm run build` | 全链路编译 | ✅ 无报错 |
