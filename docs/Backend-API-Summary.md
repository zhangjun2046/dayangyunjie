# Backend API Summary（P2 全接口交接文档）

> **生成节点**：P2.11 完成后首版；P2.14（2026-06-15）更新至 v2.2；P3.6（2026-06-20）更新至 v3.0；P3.7（2026-06-21）更新至 v3.1；P3.6_repair（2026-06-21）更新至 v3.2；P3.8（2026-06-21）更新至 v3.3；P4.1（2026-06-21）更新至 v3.4；P4.2（2026-06-21）更新至 v3.5；P4.3（2026-06-21）更新至 v3.6；P4.4（2026-06-21）更新至 v3.7；P4.5（2026-06-22）更新至 v3.8；P4.6（2026-06-22）更新至 v3.9；P4.7（2026-06-22）更新至 v4.0；P5.1（2026-06-22）更新至 v4.1（管理后台 Admin 登录 + 布局框架对接完成）；**P5.2（2026-06-22）** 更新至 v4.2（Dashboard `getSummary` 重构为时间范围统计 + 管理后台数据看板 ECharts 对接完成）；**P5.5（2026-06-23）** 更新至 v4.5（管理后台家政咨询单管理对接完成）；**P5.6（2026-06-23）** 更新至 v4.6（管理后台服务人员管理对接完成）；**P5.7（2026-06-23）** 更新至 v4.7（管理后台投诉反馈管理对接完成）；**P5.9（2026-06-23）** 更新至 v4.8（管理后台服务配置管理对接完成）；**P5.10（2026-07-06）** 更新至 v4.9（管理后台运营人员配置对接完成）；**P5.11（2026-07-06）** 更新至 v5.0（管理后台轮播图管理对接完成）；**P5.8（2026-07-19）** 更新至 v5.1（系统管理-用户管理：Admin 扩展字段 + `AdminJwtAuthGuard` + toggle-status/reset-password/change-password）；**P5.8b（2026-07-19）** 更新至 v5.2（系统管理-功能授权：`AdminPermission` + 权限树分配 + 侧栏动态渲染 + 路由守卫）；**P5.12（2026-07-19）** 更新至 v5.3（管理后台首页/工作台：欢迎条 + 4 张权限过滤待办卡片，纯前端复用已有列表接口，无新增接口）；**P-UI Icon 替换（2026-07-19）** 更新至 v5.4（居民端/员工端 PNG 图标替换；员工端废品订单 `serviceName` 映射修正为 `serviceItem`）  
> **用途**：供居民端（P3）、员工端（P4）、管理后台（P5）对接后端 API，避免上下文丢失  
> **Base URL**：`http://localhost:3000/api/v1`  
> **统一响应格式**：`{ code: number, message: string, data: T | null }`  
> **Swagger**：`http://localhost:3000/api/docs`  
> **鉴权**：居民端/员工端/管理端 JWT 已分别对接（`/auth/wechat-login`、`/auth/worker-login`、`/auth/admin-login`）；**`/admins/*` 已加 `AdminJwtAuthGuard`（P5.8）**；**`/admins/:id/permissions` 已对接（P5.8b）**；其余业务接口当前仍为公开，后端接口级 RBAC 留后续阶段（本期仅做页面级功能授权）

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
| POST | `/auth/worker-login` | **员工登录**（phone + password → JWT，role=worker，P2.13；✅ P4.1 员工端已对接） |
| POST | `/auth/admin-login` | **管理员登录**（email + password → JWT，role=admin，P5.1；✅ 管理后台已对接） |

### POST `/auth/worker-login`

**Body**：`{ phone: string, password: string }`  
**Response**：
```typescript
{
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  worker: { id: number; phone: string; name: string; employeeNo: string };
}
```

**员工端对接（P4.1）**：`apps/miniapp-worker/src/api/auth.ts` → `workerLogin()`；登录态持久化 key `__worker_auth__`；JWT 中 `role=worker`，与居民端 token 隔离。

---

### POST `/auth/admin-login`

**Body**：`{ email: string, password: string }`  
**Response**：
```typescript
{
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  admin: { id: number; email: string; name: string };
}
```

**管理后台对接（P5.1）**：`apps/admin/src/api/auth.ts` → `adminLogin()`；Pinia `useUserStore.login()` 存储 JWT；localStorage key `dayangyunjie_admin_token`；JWT 中 `role=admin`。开发默认账号 `admin@dayunyunjie.com` / `admin123`（见 `prisma/seed.ts`）。H5 开发 API 基址 `/api/v1`（Vite 代理至 `localhost:3000`）。

---

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

**创建必填**：`employeeNo`, `password`（服务端 bcrypt 入库，默认建议传完整手机号）, `name`, `phone`, `skillType`（`CLEANING` / `RECYCLING` / `BOTH`）  
**v2.0 可选扩展字段**：`nickname`, `gender`, `idCard`, `position`, `emergencyContact`, `emergencyPhone`, `healthCertUrl`, `healthCertExpiry`, `skillCertUrl`, `skillCertExpiry`, `status`, `rating`, `totalOrders`  
**列表 Query**：`page`, `pageSize`, `name?`, `phone?`, `status?`, `skillType?`（P5.6 新增）  
**列表 Response 补充（P5.6）**：每条 worker 额外返回 `todayOrders`（当日保洁+废品预约单合计）  
**Response**：`WorkerDto`（**不含** `passwordHash`，含 `skillType`, `totalOrders`, `rating`, `status`, `healthCertUrl`, `skillCertUrl` 等）

**员工端对接（P4.7）**：`GET /workers/:id` → `apps/miniapp-worker/src/api/worker.ts` → `fetchWorkerDetail()`（我的页个人信息/评分/证书）；`PUT /workers/:id/change-password` → `changePassword()`（设置页修改密码，需 Worker JWT）。

**管理后台对接（P5.6）**：`GET /workers` → `apps/admin/src/api/worker.ts` → `fetchWorkers()`（列表+筛选+今日订单）；`POST /workers` / `PUT /workers/:id` → 新增/编辑员工；`POST /workers/:id/reset-password` → `resetWorkerPassword()`（管理员重置密码为手机号）；`GET /complaints?workerId=` → `apps/admin/src/api/complaint.ts` → 详情抽屉投诉记录列表。

---

## 4. Admin 管理员模块

**路径前缀**：`/admins`（**P5.8 起：全部接口需 `Authorization: Bearer <Admin AccessToken>`，`AdminJwtAuthGuard` 每次请求查库校验 `status=ENABLED`，禁用账号的旧 token 立即 401**；**越权修复补丁（2026-07-19）：除 `change-password` 外全部端点额外挂载 `SuperAdminGuard`，非超级管理员调用 403**）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admins` | 新建用户（默认密码 `Dyyj123..`，同 Worker 模式）（仅超级管理员） |
| GET | `/admins` | 分页列表（Query：`page?`, `pageSize?`, `username?`, `name?`, `email?`, `phone?`, `keyword?` 对 username/name/phone/email 做 OR 模糊匹配）（仅超级管理员） |
| GET | `/admins/:id` | 用户详情（仅超级管理员） |
| PUT | `/admins/:id` | 更新用户（仅 `name`/`email`/`phone`，`username` 创建后不可修改）（仅超级管理员） |
| DELETE | `/admins/:id` | 删除用户（仅超级管理员；超级管理员/自身账号禁止，403） |
| PATCH | `/admins/:id/toggle-status` | 切换启用/禁用（仅超级管理员；超级管理员/自身账号禁止，403） |
| POST | `/admins/:id/reset-password` | 重置为默认密码 `Dyyj123..`（仅超级管理员） |
| PUT | `/admins/:id/change-password` | 当前登录用户自助改密（任意管理员均可，仅本人，`{ oldPassword, newPassword }`，旧密码错误 400；供顶栏「修改密码」使用） |

**创建必填**：`username`（3–32 位字母数字下划线，唯一）, `email`, `name`；`phone` 选填；密码由后端自动生成，不接受前端传入  
**Response**：`AdminDto`（**不含** `passwordHash`），新增字段 `username`/`phone`/`status`（`ENABLED`/`DISABLED`）/`source`（固定 `SYSTEM`）/`isSuperAdmin`

`POST /auth/admin-login` 返回的 `admin` 对象同步补充 `username`、`isSuperAdmin` 字段；账号 `status=DISABLED` 时登录直接 401。

### 4.1 AdminPermission 功能授权（P5.8b）

**路径前缀**：`/admins/:id/permissions`（需 `AdminJwtAuthGuard`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admins/:id/permissions` | 查询用户功能授权清单（本人可查自己；超级管理员可查任何人；目标为超管时直接返回全量 11 `menuKey`，不查表） |
| PUT | `/admins/:id/permissions` | 覆盖保存（仅超级管理员，挂载 `SuperAdminGuard`；目标为超管 → 400；非法 menuKey → 400） |

**PUT Body**：`{ menuKeys: string[] }`（去重后覆盖写入；空数组清空全部业务权限）

**Response**：`{ adminId: number, isSuperAdmin: boolean, menuKeys: string[] }`

**11 个 menuKey**（前后端硬编码）：`orders.cleaning` / `orders.recycling` / `orders.consult` / `orders.complaint` / `data.dashboard` / `staff.workers` / `config.services` / `config.operators` / `config.banners` / `system.users` / `system.permissions`

**硬性边界**：`system.users` / `system.permissions` 始终仅超级管理员可用（权限树展示但对普通管理员目标禁用勾选，不写入分配）。超级管理员不写入 `AdminPermission` 表，鉴权时直接全量放行。本期不做后端业务接口级权限点校验。

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
| GET | `/service-catalogs` | 分页列表（Query：`page?`, `pageSize?`, `bizType?`, `name?`, `isEnabled?`；不传 `isEnabled` 返回全部；按 `sortOrder` 升序） |
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
| GET | `/cleaning-orders` | 分页列表（Query：`residentId?`, `workerId?`, `status?`, `statuses?`逗号多值, `page`, `pageSize`） |
| GET | `/cleaning-orders/:id` | 订单详情（含 `workPhotos[]`） |
| PUT | `/cleaning-orders/:id` | 更新基础信息（仅 `PENDING_ASSIGN` 状态允许） |

### 操作接口（状态机驱动）

| 方法 | 路径 | 状态转移 | 说明 |
|------|------|---------|------|
| POST | `/cleaning-orders/:id/assign` | `PENDING_ASSIGN → ASSIGNED` | 派单（Body：`workerId`, `operatorId`） |
| POST | `/cleaning-orders/:id/accept` | `ASSIGNED → ACCEPTED` | 员工接单（Body：`operatorId`） |
| POST | `/cleaning-orders/:id/gps-checkin` | `ACCEPTED → IN_SERVICE` | GPS签到（Body：`lat`, `lng`, `operatorId`；超200m标记不阻断） |
| POST | `/cleaning-orders/:id/complete` | `IN_SERVICE → PENDING_REVIEW` | 完成服务（Body：`beforePhotoUrls[]`, `afterPhotoUrls[]`, `operatorId`；✅ P4.5 员工端已对接） |
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
| GET | `/recycling-orders` | 分页列表（Query：`residentId?`, `workerId?`, `status?`, `statuses?`逗号多值, `page?`, `pageSize?`） |
| GET | `/recycling-orders/:id` | 详情 |
| PUT | `/recycling-orders/:id` | 更新基础信息 |
| POST | `/recycling-orders/:id/assign` | 派单（管理员，PENDING_ASSIGN→ASSIGNED） |
| POST | `/recycling-orders/:id/accept` | 接单（员工，ASSIGNED→ACCEPTED） |
| POST | `/recycling-orders/:id/gps-checkin` | GPS签到（员工，ACCEPTED→IN_SERVICE） |
| POST | `/recycling-orders/:id/complete` | 完成服务（员工上传照片，IN_SERVICE→PENDING_REVIEW，与保洁对称） |
| POST | `/recycling-orders/:id/cancel` | 取消（仅 PENDING_ASSIGN 状态） |

> **P3.6_repair（2026-06-21）**：`POST /recycling-orders/:id/resident-confirm`（居民验收）已删除。废品 `IN_SERVICE→PENDING_REVIEW` 现在唯一由员工端 `/complete` 触发，与保洁完全对称。

**`GET /recycling-orders` 居民端查询参数**：
- `residentId`（number，可选）：按居民过滤，居民端必传
- `statuses`（string，可选）：逗号分隔多状态，如 `PENDING_ASSIGN,ASSIGNED,ACCEPTED`；与单值 `status` 互斥，`statuses` 优先级更高

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
| POST | `/complaints` | 提交投诉（支持三类订单，初始 `PENDING`；Body 可选 `residentId`） |
| GET | `/complaints` | 分页列表（Query：`status?`, `orderType?`, `orderId?`, `residentId?`, `workerId?`, `keyword?`, `contactPhone?`, `page`, `pageSize`）；列表项含关联订单富字段（`complaintNo`, `orderNo`, `contactName`, `contactPhone`, `serviceType`, `serviceAddress` 等） |
| GET | `/complaints/:id` | 投诉详情（含 `followUps[]`） |
| PATCH | `/complaints/:id/status` | 更新状态（`PENDING→PROCESSING→COMPLETED`，单向不可逆） |
| POST | `/complaints/:id/follow-ups` | 添加跟进记录 |

**创建必填**：`orderType`, `orderId`, `reason`, `description`  
**创建可选**：`evidenceImages`（string[]）, `residentId`（居民 ID，P3.7 用于「我的投诉」归属查询）

**列表 Query 补充（P3.7 / P5.6 / P5.7）**：
- `residentId`（number，可选）：按居民过滤，居民端「我的投诉」必传
- `orderId`（number，可选）：配合 `orderType` 按订单查投诉（订单详情展示投诉卡片）
- `workerId`（number，可选，P5.6）：按员工关联订单过滤投诉（管理端服务人员详情抽屉）
- `keyword`（string，可选，P5.7）：模糊匹配投诉单号前缀 / 投诉描述 / 客户姓名 / 服务地址
- `contactPhone`（string，可选，P5.7）：模糊匹配客户联系方式（关联订单 contactPhone 或居民 phone）

**reason 枚举**：`POOR_ATTITUDE` / `NOT_CLEAN` / `NOT_ON_TIME` / `ITEM_DAMAGED` / `EXTRA_CHARGE` / `OTHER`

**居民端投诉入口规则（前端）**：订单状态 ≥ `ACCEPTED` 才显示投诉按钮（`PENDING_ASSIGN` / `ASSIGNED` 不可投诉）

---

## 13. Dashboard 数据看板

**路径前缀**：`/dashboard`  
**公共 Query 参数**：`startDate?`（ISO 日期）、`endDate?`（ISO 日期），各接口默认时间范围见下表。

| 方法 | 路径 | 默认范围 | 说明 |
|------|------|---------|------|
| GET | `/dashboard/summary` | 本日（缺省） | 统计卡（总数/已完成/进行中/待接单，仅保洁+废品） |
| GET | `/dashboard/order-trend` | 近 7 天 | 订单趋势，适配 ECharts 折线图 |
| GET | `/dashboard/service-type-distribution` | 近 30 天 | 服务类型分布，适配 ECharts 饼图/环形图 |
| GET | `/dashboard/rating-distribution` | 近 30 天 | 满意度分布（5→1星），适配 ECharts 饼图/环形图 |
| GET | `/dashboard/hourly-distribution` | 近 30 天 | 时段分布（24小时），适配 ECharts 柱状图 |
| GET | `/dashboard/worker-performance` | 近 30 天 | 员工绩效排名，按时间段内完成单量倒序 |

### 各接口返回数据结构

**`GET /dashboard/summary`**

支持 `startDate` / `endDate` Query；缺省统计本日。仅统计保洁 + 废品订单（不含家政咨询）。

```typescript
{
  total: number;       // 时间范围内保洁+废品订单合计（createdAt 在范围内）
  completed: number;   // 已完成：PENDING_REVIEW | REVIEWED
  inProgress: number;  // 进行中：ACCEPTED | IN_SERVICE
  pending: number;     // 待接单：PENDING_ASSIGN | ASSIGNED
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
| GET | `/banners` | 分页列表（Query：`displayTarget?`, `isEnabled?`, `title?`（P5.11 标题模糊查询）） |
| GET | `/banners/active` | **有效轮播图**（isEnabled=true 且当前时间在 startTime~endTime 内，Query：`displayTarget?`） |
| GET | `/banners/:id` | 详情 |
| PUT | `/banners/:id` | 编辑 |
| DELETE | `/banners/:id` | 删除 |

**Request Body（POST）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `imageUrl` | string | ✅ | 图片 URL（支持 `http://localhost:3000/uploads/` 等开发环境地址，`require_tld: false`） |
| `title` | string | | 标题 |
| `displayTarget` | string | | `RESIDENT`（默认）/ `WORKER` / `ALL` |
| `linkType` | string | | `NONE`（默认）/ `PAGE` / `URL` |
| `linkTarget` | string | | 跳转路径或 URL |
| `startTime` | string | ✅ | 生效开始时间（ISO8601） |
| `endTime` | string | ✅ | 生效结束时间（ISO8601） |
| `sortOrder` | number | | 排序权重，默认 0 |
| `isEnabled` | boolean | | 是否启用，默认 true（P5.11 新增） |

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

> **管理后台对接**：轮播图管理页 `/config/banners` 调用 Banner CRUD（✅ P5.11 已对接，`apps/admin/src/api/banner.ts`）。

---

## 15. Operator 运营人员

**路径前缀**：`/operators`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/operators` | 新增运营人员 |
| GET | `/operators` | 分页列表（Query：`purpose?` / `name?` / `phone?` / `keyword?`，P5.10 扩展） |
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

> **居民端对接**：首页客服电话调用 `GET /operators/contact`，无需鉴权；若无接单人员则返回 `data: null`。**P3.2 已对接**（`src/api/operator.ts` → `fetchContactOperator()`）。**管理后台对接**：运营人员配置页 `/config/operators` 调用 Operator CRUD（✅ P5.10 已对接，`apps/admin/src/api/operator.ts`）。

---

## P3/P4/P5 对接注意事项

| 端 | 关键说明 |
|----|---------|
| **居民端（P3）** | 微信登录走 `/auth/wechat-login`（mock 阶段任意 code 可用）；创建订单时 `residentId` 从登录响应中取；评价提交后订单自动变 `REVIEWED`（✅ P3.7 已对接）；投诉 `POST /complaints` + 我的投诉 `GET /complaints?residentId=`（✅ P3.7 已对接）；地址管理 CRUD `GET/POST/PUT/DELETE /addresses`（✅ P3.7 已对接）；首页轮播图 `GET /banners/active?displayTarget=RESIDENT`（✅ P3.2 已对接）；客服电话 `GET /operators/contact`（✅ P3.2 已对接）；保洁预约 `POST /cleaning-orders`（✅ P3.3 已对接，含代下单字段）；废品预约 `POST /recycling-orders`（✅ P3.4 已对接，含代下单字段）；家政咨询 `POST /consult-orders`（✅ P3.5 已对接，含代下单字段）；代下单闭环验证（✅ P3.8 已通过，详见 `MiniApp-Architecture.md`）；H5 走 Vite 代理 `/api/v1`，小程序走 `VITE_API_BASE` |
| **员工端（P4）** | 登录走 `POST /auth/worker-login`（✅ P4.1）；首页待接单列表 `GET /cleaning-orders?workerId=&statuses=ASSIGNED` + `GET /recycling-orders?workerId=&statuses=ASSIGNED`（✅ P4.2）；任务列表 `GET /cleaning-orders?workerId=&statuses=` / `GET /recycling-orders?workerId=&statuses=` 分页多状态筛选，排除 PENDING_ASSIGN（✅ P4.3）；任务详情 `GET /cleaning-orders/:id` / `GET /recycling-orders/:id`（✅ P4.4）；接单 `POST /cleaning-orders/:id/accept` 或废品同名接口（✅ P4.2/P4.3/P4.4）；GPS 签到 `POST /cleaning-orders/:id/gps-checkin`（✅ P4.4，仅 ACCEPTED 状态）；IN_SERVICE 态上传作业照片 `POST /upload/image?orderNo=`（含水印，✅ P4.5）；完成服务 `POST /cleaning-orders/:id/complete` / 废品同名接口（Body：`beforePhotoUrls[]`, `afterPhotoUrls[]`, `operatorId`，✅ P4.5）；PENDING_REVIEW/REVIEWED 只读详情 + `GET /reviews?orderType=&orderId=` 展示居民评价（✅ P4.6）；我的页 `GET /workers/:id`（个人信息/评分/证书）+ 今日订单统计（复用订单列表 API）+ `PUT /workers/:id/change-password`（✅ P4.7） |
| **管理后台（P5）** | 登录走 `POST /auth/admin-login`（✅ P5.1）；API 基址 `/api/v1`；二级折叠菜单布局；看板接口在 `/dashboard/`；派单用 `/cleaning-orders/:id/assign`（传 `workerId`）；配置管理走 `/service-catalogs`（✅ P5.9 CRUD + toggle）、`/banners`（✅ P5.11 CRUD + 展示端/标题筛选 + 图片上传）、`/operators`（✅ P5.10 CRUD + keyword 搜索）；家政咨询单管理走 `/consult-orders` + `/consult-orders/:id/follow-ups` + `/consult-orders/:id/status`（✅ P5.5）；服务人员管理走 `/workers` CRUD + `POST /workers/:id/reset-password` + `GET /complaints?workerId=`（✅ P5.6）；投诉反馈管理走 `GET /complaints` + `GET /complaints/:id` + `PATCH /complaints/:id/status` + `POST /complaints/:id/follow-ups`（✅ P5.7） |

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

---

## P3.6 完成说明（2026-06-20）

居民端我的订单列表 + 详情页（P3.6）已完成：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /cleaning-orders?residentId=&statuses=` | 保洁订单列表（三状态筛选胶囊） | ✅ P3.6 已对接 |
| `GET /cleaning-orders/:id` | 保洁订单详情 | ✅ P3.6 已对接 |
| `POST /cleaning-orders/:id/cancel` | 待派单取消 | ✅ P3.6 已对接 |
| `GET /recycling-orders?residentId=&statuses=` | 废品订单列表 | ✅ P3.6 已对接 |
| `GET /recycling-orders/:id` | 废品订单详情 | ✅ P3.6 已对接 |
| ~~`POST /recycling-orders/:id/resident-confirm`~~ | ~~废品「验收服务」（IN_SERVICE→PENDING_REVIEW）~~ | ❌ P3.6_repair 已删除 |
| `GET /consult-orders?residentId=` | 家政咨询订单列表 | ✅ P3.6 已对接 |
| `GET /consult-orders/:id` | 家政咨询订单详情 | ✅ P3.6 已对接 |

**P3.6 关键新增文件**：
- `src/pages/orders/index.vue`（三 Tab 订单列表）
- `src/pages/order-detail/index.vue`（三种模板详情页）
- `src/components/OrderStatusTimeline.vue`（状态时间轴）
- `src/api/review.ts`（评价提交 API）

**P3.6 后端新增端点**：~~`POST /recycling-orders/:id/resident-confirm`~~（已在 P3.6_repair 删除，废品验收改为员工端 `/complete` 触发，与保洁对称）

**P3.6 兼容性修复**：
- 详情页使用 `onLoad`（uni-app）替代 `onMounted`（Vue）获取路由参数，解决 mp-weixin 下参数读取失败问题
- 筛选胶囊改用 `white-space:nowrap` + `display:inline-flex` 内联方案，解决 `scroll-view[scroll-x]` 在 mp-weixin 下 flex 容器不溢出导致末尾选项截断问题

---

## P3.7 完成说明（2026-06-21）

居民端评价页、投诉页与我的页（P3.7）已完成：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `POST /reviews` | 评价页提交星级/标签/文字/图片 | ✅ P3.7 已对接 |
| `GET /reviews?orderId=&orderType=` | 订单详情展示评价卡片 | ✅ P3.7 已对接 |
| `POST /upload/image` | 评价/投诉多图上传（含水印） | ✅ P3.7 已对接 |
| `POST /complaints` | 投诉页提交（6 原因+描述+多图凭证） | ✅ P3.7 已对接 |
| `GET /complaints?residentId=` | 我的投诉列表 | ✅ P3.7 已对接 |
| `GET /complaints?orderType=&orderId=` | 订单详情展示投诉卡片 | ✅ P3.7 已对接 |
| `GET /complaints/:id` | 投诉进度详情（含 followUps） | ✅ P3.7 已对接 |
| `GET /addresses?residentId=` | 我的地址列表 | ✅ P3.7 已对接 |
| `POST /addresses` | 新增地址 | ✅ P3.7 已对接 |
| `PUT /addresses/:id` | 编辑地址 | ✅ P3.7 已对接 |
| `PUT /addresses/:id/default` | 设为默认地址 | ✅ P3.7 已对接 |
| `DELETE /addresses/:id` | 删除地址 | ✅ P3.7 已对接 |

**P3.7 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/review/index` | 评价服务（PENDING_REVIEW 且 7 天内） |
| `pages/complaint/index` | 投诉反馈（ACCEPTED 及之后状态入口） |
| `pages/complaint-list/index` | 我的投诉列表（状态 Tab 筛选） |
| `pages/complaint-detail/index` | 投诉进度详情 |
| `pages/address-manage/index` | 我的地址 CRUD + 设默认 |
| `pages/mine/index` | 我的页（完整手机号 + 入口） |

**P3.7 关键新增/扩展文件**：
- `src/pages/review/index.vue`、`src/pages/complaint/index.vue`
- `src/pages/complaint-list/index.vue`、`src/pages/complaint-detail/index.vue`
- `src/pages/address-manage/index.vue`、`src/pages/mine/index.vue`（重写）
- `src/api/complaint.ts`、`src/api/review.ts`、`src/api/upload.ts`
- `apps/server/.../complaint/dto/query-complaint.dto.ts`（新增 `residentId`）
- `apps/server/.../complaint/dto/create-complaint.dto.ts`（新增可选 `residentId`）

**P3.7 业务规则**：
- 评价：仅 `PENDING_REVIEW` 且 7 天内可提交；成功后订单 → `REVIEWED`
- 投诉：前端仅 `ACCEPTED`/`IN_SERVICE`/`PENDING_REVIEW`/`REVIEWED` 显示入口
- 我的页：展示完整手机号（不展示微信昵称）

---

---

## P3.6_repair 完成说明（2026-06-21）

废品回收「服务中→待评价」触发方回归员工端，与保洁完全对称：

| 变更项 | 说明 |
|--------|------|
| 删除接口 | `POST /recycling-orders/:id/resident-confirm`（居民验收，已移除） |
| 删除前端 | 居民小程序「验收服务」按钮、`onResidentConfirm` 函数、`residentConfirmRecycling` API |
| 保留接口 | `POST /recycling-orders/:id/complete`（员工完成服务，IN_SERVICE→PENDING_REVIEW） |
| 新增测试 | 4 项回归测试，全套 29 项通过 |

**废品最终状态链**：`PENDING_ASSIGN → ASSIGNED → ACCEPTED → IN_SERVICE →（员工 /complete）→ PENDING_REVIEW → REVIEWED`

---

## P3.8 完成说明（2026-06-21）

代下单功能跨 P3.3（保洁）/ P3.4（废品）/ P3.5（家政）分散集成，P3.8 完成三类全流程闭环验证：

| 验证项 | 说明 | 状态 |
|--------|------|------|
| 保洁代下单 | Step 2 勾选「为家人代下单」→ 填被服务人姓名/手机号 → `POST /cleaning-orders`（`isProxyOrder=true`）→ 详情页展示被服务人 | ✅ |
| 废品代下单 | 同上流程 → `POST /recycling-orders` → 详情页展示被服务人 | ✅ |
| 家政代下单 | Step 2 勾选代下单 → `POST /consult-orders` → 列表/详情展示代下单标记与被服务人 | ✅ |
| 字段 trim 一致性 | 保洁/废品提交前 `serviceContactName`/`serviceContactPhone` 执行 `.trim()`（与家政对齐） | ✅ 代码修复 |
| 家政详情模板 | 咨询单详情不再误显示「等待平台为您分配服务人员」（`orderType !== 'consult'`） | ✅ 代码修复 |
| 后端回归 | 全量 Jest 240 项通过 | ✅ |

**代下单 API 字段（三类订单创建接口共用）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `isProxyOrder` | `boolean` | 是否为代家人下单 |
| `serviceContactName` | `string` | 被服务人姓名（`isProxyOrder=true` 时必填） |
| `serviceContactPhone` | `string` | 被服务人手机号（`isProxyOrder=true` 时必填，11 位） |
| `source` | `'MINIPROGRAM' \| 'PHONE'` | 居民端固定传 `MINIPROGRAM` |

**居民端对接文件**：

| 页面 | 路径 | 代下单相关 |
|------|------|----------|
| 保洁预约 | `pages/booking-cleaning/index` | Yes/No 单选 + 服务对象信息区 |
| 废品预约 | `pages/booking-recycling/index` | 同上 |
| 家政咨询 | `pages/booking-consult/index` | Toggle 开关 + 服务对象信息区 |
| 订单详情 | `pages/order-detail/index` | `isProxyOrder` 时展示「被服务人」姓名+手机号（完整不脱敏） |
| 订单列表 | `pages/orders/index` | `isProxyOrder` 时展示「代下单」橙色标签 |

**交接文档**：详见 [`docs/MiniApp-Architecture.md`](MiniApp-Architecture.md) §8 代下单数据流。

---

## P4.1 完成说明（2026-06-21）

员工端登录页 + 身份认证（P4.1）已完成，以下 Auth 接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `POST /auth/worker-login` | 登录页手机号+密码登录，获取 Worker JWT + worker 信息 | ✅ P4.1 已对接 |

**P4.1 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/login/index` | 员工登录页（手机号/密码/协议勾选/「开始服务」按钮） |

**P4.1 关键新增文件**：
- `apps/miniapp-worker/src/api/request.ts`、`src/api/auth.ts`
- `apps/miniapp-worker/src/store/auth.ts`（Pinia，key: `__worker_auth__`）
- `apps/miniapp-worker/src/composables/useRouteGuard.ts`
- `apps/miniapp-worker/src/pages/login/index.vue`
- `apps/miniapp-worker/vite.config.ts`（H5 代理）、`.env.development` / `.env.production`

**P4.1 业务规则**：
- 协议未勾选不可登录
- 登录成功 `switchTab` 至首页 tabBar
- 未登录访问受保护页面 → 重定向登录页
- Worker JWT 与 Resident JWT 隔离（独立 storage key + role=worker）

---

## P4.2 完成说明（2026-06-21）

员工端首页待接单任务列表（P4.2）已完成，以下接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /cleaning-orders?workerId=&statuses=ASSIGNED` | 首页并发拉取当前员工 ASSIGNED 保洁单 | ✅ P4.2 已对接 |
| `GET /recycling-orders?workerId=&statuses=ASSIGNED` | 首页并发拉取当前员工 ASSIGNED 废品单 | ✅ P4.2 已对接 |
| `POST /cleaning-orders/:id/accept` | 保洁单「立即接单」（ASSIGNED→ACCEPTED） | ✅ P4.2 已对接 |
| `POST /recycling-orders/:id/accept` | 废品单「立即接单」（ASSIGNED→ACCEPTED） | ✅ P4.2 已对接 |

**P4.2 后端补充（Query DTO）**：
- `QueryCleaningOrderDto` / `QueryRecyclingOrderDto` 新增可选 `workerId` 字段
- `findAll` 按 `workerId` 过滤，供员工端仅查看分配给自己的订单

**P4.2 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/index/index` | 首页：仅 ASSIGNED 任务卡片列表（无统计卡片） |

**P4.2 关键新增文件**：
- `apps/miniapp-worker/src/api/order.ts`（`fetchAssignedOrders` / `acceptOrder`）
- `apps/miniapp-worker/src/pages/index/index.vue`（任务卡片 + 接单按钮 + 下拉刷新）

**P4.2 业务规则**：
- 列表响应字段为 `items`（非 `list`），前端按 `items` 解析
- 订单地址取自 `addressSnapshot`（区 + 详细地址 + 楼栋信息拼接）
- `appointDate` 为 ISO 字符串，前端截取 `YYYY-MM-DD` 并格式化为点分显示
- 接单成功后前端乐观移除卡片（状态已变 ACCEPTED，不再出现在 ASSIGNED 列表）

**P4.2 测试辅助脚本**（开发期，不提交生产）：`apps/server/assign-orders.js` 可将 PENDING_ASSIGN 订单批量派给指定员工手机号，便于无管理后台时联调。

---

## P4.3 完成说明（2026-06-21）

员工端任务列表（P4.3）已完成，以下接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /cleaning-orders?workerId=&statuses=&page=&pageSize=` | 任务页保洁 Tab 分页列表（精确系统状态筛选） | ✅ P4.3 已对接 |
| `GET /recycling-orders?workerId=&statuses=&page=&pageSize=` | 任务页废品 Tab 分页列表（精确系统状态筛选） | ✅ P4.3 已对接 |
| `POST /cleaning-orders/:id/accept` | ASSIGNED 卡片「立即接单」（保洁） | ✅ P4.3 已对接（复用 P4.2） |
| `POST /recycling-orders/:id/accept` | ASSIGNED 卡片「立即接单」（废品） | ✅ P4.3 已对接（复用 P4.2） |

**P4.3 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/tasks/index` | 任务列表：双 Tab + 状态筛选胶囊 + 分页卡片列表 |

**P4.3 关键新增/扩展文件**：
- `apps/miniapp-worker/src/api/order.ts`（新增 `fetchWorkerOrders` / `WorkerOrderItem`）
- `apps/miniapp-worker/src/pages/tasks/index.vue`（完整任务列表 UI）

**P4.3 业务规则**：
- 状态筛选使用精确系统状态值：全部 / ASSIGNED / ACCEPTED / IN_SERVICE / PENDING_REVIEW / REVIEWED / CANCELLED
- **员工端不可见** `PENDING_ASSIGN`；「全部」筛选时 API 传 6 个可见状态逗号拼接
- 仅 ASSIGNED 状态卡片显示「查看详情」「立即接单」按钮
- 支持下拉刷新（重置第 1 页）与上拉加载更多（追加分页）

---

## P4.4 完成说明（2026-06-21）

员工端任务详情—已派单/已接单态（P4.4）已完成，以下接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /cleaning-orders/:id` | 保洁任务详情页加载 | ✅ P4.4 已对接 |
| `GET /recycling-orders/:id` | 废品任务详情页加载 | ✅ P4.4 已对接 |
| `POST /cleaning-orders/:id/accept` | ASSIGNED 状态详情页「立即接单」 | ✅ P4.4 已对接 |
| `POST /recycling-orders/:id/accept` | 同上（废品） | ✅ P4.4 已对接 |
| `POST /cleaning-orders/:id/gps-checkin` | ACCEPTED 状态「开始服务」GPS 签到 | ✅ P4.4 已对接 |
| `POST /recycling-orders/:id/gps-checkin` | 同上（废品） | ✅ P4.4 已对接 |

**P4.4 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/task-detail/index` | 任务详情：Query `orderId=&orderType=cleaning\|recycling` |

**P4.4 关键新增/扩展文件**：
- `apps/miniapp-worker/src/pages/task-detail/index.vue`（详情页 UI + GPS + 时间轴 + 代下单）
- `apps/miniapp-worker/src/api/order.ts`（`OrderDetailDto` / `fetchOrderDetail` / `gpsCheckin`）
- `apps/miniapp-worker/src/manifest.json`（`requiredPrivateInfos: ["getLocation"]`）
- `apps/server/src/modules/cleaning-order/cleaning-order-p4-4.spec.ts`（18 项单元测试）
- `apps/server/src/modules/recycling-order/recycling-order-p4-4.spec.ts`（18 项单元测试）

**P4.4 业务规则**：
- ASSIGNED：底部「立即接单」+ 提示「请先接单，接单后方可开始服务」；不可直接 GPS 签到
- ACCEPTED：底部「开始服务」→ `uni.getLocation` → `gpsCheckin` → IN_SERVICE
- 作业记录区：ASSIGNED / ACCEPTED 禁用，IN_SERVICE 后解锁（✅ P4.5 已实现上传与完成服务）
- 代下单：`contactName` 为代下单人，`serviceContactName` 为被服务人（完整手机号展示）
- 时间轴：done（蓝勾）/ active（蓝圈实心点）/ pending（灰圈）三态

---

## P4.5 完成说明（2026-06-22）

员工端任务详情—服务中态（P4.5）已完成，以下接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `POST /upload/image?orderNo=` | IN_SERVICE 态选图上传，后端 sharp 叠加水印（订单号+时间戳） | ✅ P4.5 已对接 |
| `POST /cleaning-orders/:id/complete` | 保洁「完成服务」，提交前后照片 URL | ✅ P4.5 已对接 |
| `POST /recycling-orders/:id/complete` | 废品「完成服务」，与保洁对称 | ✅ P4.5 已对接 |

**P4.5 完成服务 Request Body**：

```typescript
{
  beforePhotoUrls: string[];  // 服务前照片 URL（上传接口返回，可为空数组）
  afterPhotoUrls: string[];   // 服务后照片 URL（可为空数组）
  operatorId: number;         // 员工 ID
}
```

> 前端校验：至少 1 张作业照片（服务前或服务后均可）才可提交完成。

**P4.5 照片上传流程**：

1. `uni.chooseImage`（相机/相册，最多 9 张/组）
2. `uploadImage(filePath, order.orderNo)` → `uni.uploadFile` → `POST /upload/image?orderNo=xxx`
3. 后端 `addWatermark` 叠加 `{orderNo} {YYYY/MM/DD HH:mm:ss}` 至右下角 → 存本地 `/uploads/`
4. 返回 `{ url }` 存入 `beforePhotos` / `afterPhotos` ref
5. 点「完成服务」→ 确认弹窗 → `completeOrder(type, id, beforeUrls, afterUrls, workerId)`

**P4.5 关键新增/扩展文件**：
- `apps/miniapp-worker/src/api/upload.ts`（`uploadImage` 封装）
- `apps/miniapp-worker/src/api/request.ts`（`UPLOAD_BASE_URL`，H5 条件编译 `/api/v1`）
- `apps/miniapp-worker/src/api/order.ts`（`completeOrder`）
- `apps/miniapp-worker/src/pages/task-detail/index.vue`（IN_SERVICE 作业区 + 完成服务按钮）
- `apps/server/src/modules/cleaning-order/dto/complete-order.dto.ts`（`beforePhotoUrls` / `afterPhotoUrls`）
- `apps/server/src/modules/recycling-order/dto/complete-order.dto.ts`（同上）
- `packages/shared/src/entities/order.ts`（`workPhotos?: WorkPhotoDto[]`）

**P4.5 业务规则**：
- 进入 IN_SERVICE 无 SOP 弹窗，作业区直接解锁
- 保洁/废品均显示「完成服务」按钮（对称）
- 不展示实际重量、核定金额、已收款字段
- 完成后状态变 PENDING_REVIEW，照片网格切换为只读（从 `order.workPhotos` 按 `photoType` 分 BEFORE/AFTER 展示）

---

## P4.6 完成说明（2026-06-22）

员工端任务详情—待评价/已完成态（P4.6）已完成，以下接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /reviews?orderType=&orderId=&pageSize=1` | REVIEWED 状态懒加载居民评价（星级/标签/文字/图片） | ✅ P4.6 已对接 |

**P4.6 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/task-detail/index` | PENDING_REVIEW/REVIEWED 只读详情；REVIEWED 展示「用户评价」card |

**P4.6 关键新增/扩展文件**：
- `apps/miniapp-worker/src/api/review.ts`（`fetchOrderReview`）
- `apps/miniapp-worker/src/pages/task-detail/index.vue`（评价区模板 + 时间轴 REVIEWED 节点 + 照片只读网格）

**P4.6 业务规则**：
- `PENDING_REVIEW`：无底部操作按钮；时间轴「已完成」节点 active；作业照片只读
- `REVIEWED`：时间轴全部 done；额外调用 `fetchOrderReview` 展示评价 card
- 评价图片支持 `uni.previewImage` 大图预览

---

## P4.7 完成说明（2026-06-22）

员工端我的页（P4.7）已完成，以下接口已在前端完成对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /workers/:id` | 我的页加载姓名、评分、累计单数、健康证/技能证书 URL | ✅ P4.7 已对接 |
| `GET /cleaning-orders?workerId=&statuses=&pageSize=100` | 我的页统计今日订单/今日已完成（与废品订单并发拉取后前端过滤） | ✅ P4.7 已对接 |
| `GET /recycling-orders?workerId=&statuses=&pageSize=100` | 同上（废品 Tab） | ✅ P4.7 已对接 |
| `PUT /workers/:id/change-password` | 设置页修改密码（旧密码验证，成功后退出重新登录） | ✅ P4.7 已对接 |

**P4.7 页面与导航**：

| 路径 | 说明 |
|------|------|
| `pages/mine/index` | 我的页（tabBar）：个人信息+评分、今日订单/今日已完成、健康证/技能证书、设置入口、退出登录 |
| `pages/settings/index` | 设置页：修改密码内联表单 |

**P4.7 关键新增/扩展文件**：
- `apps/miniapp-worker/src/api/worker.ts`（`fetchWorkerDetail` / `changePassword`）
- `apps/miniapp-worker/src/pages/mine/index.vue`（完整重写）
- `apps/miniapp-worker/src/pages/settings/index.vue`（修改密码）
- `apps/miniapp-worker/src/pages.json`（新增 settings 路由）

**P4.7 业务规则**：
- 今日订单：appointDate = 今天（保洁+废品，任意可见状态）
- 今日已完成：appointDate = 今天 且 status = REVIEWED
- 证书命名：「健康证」「技能证书」（非「家政服务员证」）；无 URL 提示「暂未上传」
- 无「服务记录」菜单入口（历史通过任务 Tab 查看）
- 修改密码成功后强制退出并跳转登录页

---

## P5.1 完成说明（2026-06-22）

管理后台登录与布局框架（P5.1）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `POST /auth/admin-login` | 登录页邮箱+密码登录，获取 Admin JWT | ✅ P5.1 已对接 |

**P5.1 页面与路由**：

| 路径 | 说明 |
|------|------|
| `/login` | 登录页（公开） |
| `/dashboard` | 首页 |
| `/orders/cleaning` | 保洁订单（P5.3 已完成） |
| `/orders/recycling` | 废品订单（P5.4 已完成） |
| `/orders/consult` | 家政订单（P5.5 已完成） |
| `/orders/complaint` | 投诉反馈（P5.7 已完成） |
| `/data/dashboard` | 数据看板（P5.2 已完成） |
| `/workers` | 服务人员管理（P5.6 已完成） |
| `/config/services` | 服务配置（P5.9 已完成） |
| `/config/operators` | 运营人员配置（P5.10 已完成） |
| `/config/banners` | 轮播图管理（P5.11 已完成） |
| `/system/users` | 系统管理-用户管理（P5.8 已完成） |
| `/system/permissions` | 系统管理-功能授权（P5.8b 已完成） |

**P5.1 侧栏菜单结构**（二级折叠 `el-sub-menu`；P5.8b 起按功能授权动态渲染）：

- 订单管理 → 保洁/废品/家政/投诉
- 数据管理 → 数据看板
- 员工管理 → 服务人员管理
- 配置管理 → 服务配置 / 运营人员配置 / 轮播图管理
- 系统管理 → 用户管理 / 功能授权（始终仅超级管理员可见）

**P5.1 关键新增/扩展文件**：

- `apps/server/src/modules/auth/dto/admin-login.dto.ts`（AdminLoginDto）
- `apps/server/src/modules/auth/auth.service.ts`（`adminLogin` / `issueAdminTokens`）
- `apps/server/src/modules/auth/auth.controller.ts`（`POST /auth/admin-login`）
- `apps/admin/src/api/auth.ts`（`adminLogin`）
- `apps/admin/src/store/index.ts`（真实 JWT login）
- `apps/admin/src/layout/index.vue`（二级折叠侧栏 + 顶栏 + 底部用户信息）
- `apps/admin/src/router/index.ts`（P5 全部路由 + 守卫）
- `apps/admin/.env.development`（`VITE_API_BASE_URL=/api/v1`）

**P5.1 业务规则**：

- 未登录访问受保护路由 → 跳转 `/login?redirect=...`
- 已登录访问 `/login` → 重定向 `/dashboard`
- Token 存 localStorage `dayangyunjie_admin_token`；管理员 name/email 持久化
- seed 默认管理员：`admin@dayunyunjie.com` / `admin123`

---

---

## P5.2 完成说明（2026-06-22）

管理后台数据看板（P5.2）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /dashboard/summary` | 4 张统计卡（总数/已完成/进行中/待接单） | ✅ P5.2 已对接 |
| `GET /dashboard/order-trend` | 订单趋势折线图 | ✅ P5.2 已对接 |
| `GET /dashboard/service-type-distribution` | 服务类型环形图 | ✅ P5.2 已对接 |
| `GET /dashboard/rating-distribution` | 客户满意度水平柱状图 | ✅ P5.2 已对接 |
| `GET /dashboard/hourly-distribution` | 服务时段柱状图（09:00–19:00） | ✅ P5.2 已对接 |
| `GET /dashboard/worker-performance` | 员工绩效排名表格 | ✅ P5.2 已对接 |

**P5.2 页面**：`/data/dashboard`（数据管理 > 数据看板）

**P5.2 统计卡规则**（仅保洁 + 废品，不含家政咨询）：

| 卡片 | 字段 | 状态映射 |
|------|------|---------|
| 总数 | `total` | 时间范围内 createdAt 的保洁+废品订单合计 |
| 已完成 | `completed` | `PENDING_REVIEW` \| `REVIEWED` |
| 进行中 | `inProgress` | `ACCEPTED` \| `IN_SERVICE` |
| 待接单 | `pending` | `PENDING_ASSIGN` \| `ASSIGNED` |

**P5.2 时间范围**：本日 / 本周 / 本月（`startDate` + `endDate`），统计卡与全部图表联动刷新。

**P5.2 员工绩效表格列**：排名 / 员工 / 完成订单 / 评分 / 完成率（**无「创收金额」列**）

**P5.2 关键新增/扩展文件**：

- `apps/server/src/modules/dashboard/dashboard.service.ts`（`getSummary` 重构为时间范围统计）
- `apps/server/src/modules/dashboard/dashboard.controller.ts`（`summary` 支持 Query）
- `apps/admin/src/api/dashboard.ts`（6 个 dashboard API 封装）
- `apps/admin/src/views/data/dashboard/index.vue`（ECharts 看板页）
- `apps/admin/package.json`（新增 `echarts` 依赖）

**P5.2 验收清单**：

| 验收项 | 结果 |
|--------|------|
| 4 张统计卡显示正确数据 | ✅ |
| 订单趋势/服务类型/满意度/时段图表渲染正常 | ✅ |
| 员工绩效表格无「创收金额」列 | ✅ |
| 本日/本周/本月切换后数据刷新 | ✅ |
| `npm run build` 通过 | ✅ |

---

## P5.3 完成说明（2026-06-23）

管理后台保洁订单管理（P5.3）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /cleaning-orders` | 列表分页 + 关键词/状态/日期/服务人员筛选 | ✅ P5.3 已对接 |
| `GET /cleaning-orders/:id` | 订单详情抽屉 | ✅ P5.3 已对接 |
| `POST /cleaning-orders` | 管理端代下单（电话地址） | ✅ P5.3 已对接 |
| `POST /cleaning-orders/:id/assign` | 分配服务人员弹窗 | ✅ P5.3 已对接 |
| `GET /workers` | 分配弹窗服务人员下拉 | ✅ P5.3 已对接 |
| `GET /service-catalogs?bizType=CLEANING` | 新增订单服务项目下拉 | ✅ P5.3 已对接 |

**P5.3 页面**：`/orders/cleaning`（订单管理 > 保洁订单）

**P5.3 列表列**：订单编号 / 客户信息 / 被服务人 / 被服务人联系方式 / 是否代下单 / 服务类型 / 服务地址 / 服务时间 / 服务人员 / 状态 / 操作（**无金额列**）

**P5.3 新增订单（代下单）规则**：

| 字段 | 说明 |
|------|------|
| `residentId` | 可选（电话代下单无注册居民） |
| `addressId` / `addressSnapshotText` | 二选一；管理端电话地址传 `addressSnapshotText` |
| `appointTimeSlot` | 起始时间（如 `09:00`），8 个可选点与居民端一致 |
| `serviceDuration` | 服务时长 1–8 小时，与居民端步进器一致 |
| `isProxyOrder` + `serviceContactName/Phone` | 代下单开关及被服务人信息 |

**P5.3 后端变更**：

- `CleaningOrder.residentId` 改为可空（Prisma `Int?`）
- `CreateCleaningOrderDto`：`residentId`/`addressId` 可选；新增 `addressSnapshotText`
- `findAll` 列表响应含 `worker: { id, name, phone }` 关联

**P5.3 关键新增/扩展文件**：

- `apps/admin/src/api/cleaning.ts`（保洁订单 API 封装）
- `apps/admin/src/api/worker.ts`（服务人员列表）
- `apps/admin/src/api/service-catalog.ts`（服务目录）
- `apps/admin/src/views/orders/cleaning/index.vue`（完整列表 + 分配 + 代下单 + 详情）
- `apps/server/src/modules/cleaning-order/dto/create-cleaning-order.dto.ts`（代下单 DTO 扩展）
- `apps/server/src/modules/cleaning-order/cleaning-order.service.ts`（文本地址创建 + worker 关联）
- `packages/shared/src/entities/order.ts`（`CleaningOrderDto.residentId` 可空）

**P5.3 验收清单**：

| 验收项 | 结果 |
|--------|------|
| 列表无金额列，有被服务人/代下单/服务时段列 | ✅ |
| 分配弹窗可用，分配后状态变 ASSIGNED | ✅ |
| 代下单新增成功（文本地址，无 residentId） | ✅ |
| 服务时段 UI 与居民端一致（8 时间点 + 时长步进） | ✅ |
| 列表服务人员列正常显示 | ✅ |
| 查询条件（关键词/状态/日期）可用 | ✅ |
| `npm run build` 通过 | ✅ |

---

## P5.4 完成说明（2026-06-23）

管理后台废品订单管理（P5.4）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /recycling-orders` | 列表分页 + 关键词/状态/服务人员筛选 | ✅ P5.4 已对接 |
| `GET /recycling-orders/:id` | 订单详情抽屉（含 worker 关联） | ✅ P5.4 已对接 |
| `POST /recycling-orders` | 管理端代下单（电话地址） | ✅ P5.4 已对接 |
| `POST /recycling-orders/:id/assign` | 分配服务人员弹窗 | ✅ P5.4 已对接 |
| `GET /workers` | 分配弹窗服务人员下拉 | ✅ P5.4 已对接 |
| `GET /service-catalogs?bizType=RECYCLING` | 新增订单服务类型下拉 | ✅ P5.4 已对接 |

**P5.4 页面**：`/orders/recycling`（订单管理 > 废品订单）

**P5.4 列表列**：订单编号 / 客户信息 / 被服务人 / 被服务人联系方式 / 是否代下单 / 服务类型 / **预估重量** / 服务地址 / 服务时间 / 服务人员 / 状态 / 操作（**无金额列**）

**P5.4 查询条件**（与保洁一致）：关键词 / 客户联系方式 / 服务地址 + 状态 Tab（无预约日期范围）

**P5.4 新增订单（代下单）规则**：

| 字段 | 说明 |
|------|------|
| `residentId` | 可选（电话代下单无注册居民） |
| `addressId` / `addressSnapshotText` | 二选一；管理端电话地址传 `addressSnapshotText` |
| `estimatedWeight` | 预估重量（kg），5–200 步进，默认 5，与居民端一致 |
| `appointTimeSlot` | 起始时间（如 `09:00`），8 个可选点与居民端一致 |
| `isProxyOrder` + `serviceContactName/Phone` | 代下单开关及被服务人信息 |

**P5.4 详情页**：展示预估重量、服务人员、时间轴、作业照片、用户评价；**不展示** actualWeight / 核定金额 / 收款状态

**P5.4 后端变更**：

- `RecyclingOrder.residentId` 改为可空（Prisma `Int?`）
- `CreateRecyclingOrderDto`：`residentId`/`addressId` 可选；新增 `addressSnapshotText`
- `findAll` / `findOne` 含 `worker: { id, name, phone }` 关联

**P5.4 关键新增/扩展文件**：

- `apps/admin/src/api/recycling.ts`（废品订单 API 封装）
- `apps/admin/src/views/orders/recycling/index.vue`（完整列表 + 分配 + 代下单 + 详情）
- `apps/server/src/modules/recycling-order/dto/create-recycling-order.dto.ts`（代下单 DTO 扩展）
- `apps/server/src/modules/recycling-order/recycling-order.service.ts`（文本地址创建 + worker 关联）
- `packages/shared/src/entities/order.ts`（`RecyclingOrderDto.residentId: number | null` + worker 字段）

**P5.4 验收清单**：

| 验收项 | 结果 |
|--------|------|
| 列表有预估重量列，无金额列，有被服务人/代下单列 | ✅ |
| 分配弹窗可用，分配后状态变 ASSIGNED | ✅ |
| 代下单新增成功（addressSnapshotText，无 residentId） | ✅ |
| 服务时段 UI 与居民端一致（8 时间点 + 重量步进） | ✅ |
| 列表/详情服务人员列正常显示 | ✅ |
| 查询条件（关键词/电话/服务地址）与保洁一致 | ✅ |
| 详情页无实际重量/金额/收款字段 | ✅ |
| `npm run build` 通过 | ✅ |

---

## P5.5 完成说明（2026-06-23）

管理后台家政咨询单管理（P5.5）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /consult-orders` | 列表分页 + 关键词/状态/客户联系方式筛选 | ✅ P5.5 已对接 |
| `GET /consult-orders/:id` | 订单详情抽屉 | ✅ P5.5 已对接 |
| `POST /consult-orders` | 管理端代创建咨询单（电话预约） | ✅ P5.5 已对接 |
| `GET /consult-orders/:id/follow-ups` | 详情抽屉 ConsultFollowUp 跟进时间轴 | ✅ P5.5 已对接 |
| `POST /consult-orders/:id/follow-ups` | 「提交」保存跟进记录 | ✅ P5.5 已对接 |
| `PATCH /consult-orders/:id/status` | 状态变更（FOLLOW_UP→FOLLOWING→COMPLETED） | ✅ P5.5 已对接 |
| `GET /service-catalogs?bizType=CONSULT` | 新增咨询单服务类型下拉 | ✅ P5.5 已对接 |

**P5.5 页面**：`/orders/consult`（订单管理 > 家政订单）

**P5.5 列表列**：订单编号 / 客户姓名 / 客户联系方式 / 是否代下单 / 被服务人 / 被服务人联系方式 / 服务类型 / 服务地址 / 提交时间 / 跟进状态 / 操作（**无派单/金额列**）

**P5.5 查询条件**：关键词（订单号/客户姓名）/ 客户联系方式 + 状态 Tab（全部/待跟进/跟进中/已完成）

**P5.5 新增咨询单规则**：

| 字段 | 说明 |
|------|------|
| `serviceType` | 服务类型（CONSULT 目录） |
| `requirementDesc` | 核心诉求（必填） |
| `contactName` / `contactPhone` | 客户信息（必填） |
| `isProxyOrder` + `serviceContactName/Phone` | 代下单开关及被服务人信息 |
| `serviceAddress` | 服务地址（可选，运营电话回访后录入） |
| `source` | 管理端固定 `PHONE` |

**P5.5 详情页**：订单信息 + ConsultFollowUp 跟进时间轴（初始「已预约」节点 + 跟进记录）+ 跟进录入区；「提交」保存跟进并自动 FOLLOW_UP→FOLLOWING；「完成」结案为 COMPLETED

**P5.5 关键新增/扩展文件**：

- `apps/admin/src/api/consult.ts`（咨询单 API 封装）
- `apps/admin/src/views/orders/consult/index.vue`（完整列表 + 新增 + 详情抽屉 + 跟进时间轴）

**P5.5 验收清单**：

| 验收项 | 结果 |
|--------|------|
| 列表有被服务人/代下单列，状态使用 FOLLOW_UP/FOLLOWING/COMPLETED | ✅ |
| 列表「客户联系方式」查询条件可用 | ✅ |
| 跟进时间轴可见；「提交」保存跟进记录 | ✅ |
| 「完成」结案为 COMPLETED | ✅ |
| 新增咨询单成功（含代下单，无预约时间字段） | ✅ |
| `npm run build` 通过 | ✅ |

---

## P5.6 完成说明（2026-06-23）

管理后台服务人员管理（P5.6）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /workers` | 列表分页 + 姓名/手机号/状态/技能筛选 + `todayOrders` 今日订单列 | ✅ P5.6 已对接 |
| `GET /workers/:id` | 详情抽屉基本信息 | ✅ P5.6 已对接 |
| `POST /workers` | 新增员工（初始密码=手机号） | ✅ P5.6 已对接 |
| `PUT /workers/:id` | 编辑员工 | ✅ P5.6 已对接 |
| `POST /workers/:id/reset-password` | 列表「重置密码」操作 | ✅ P5.6 已对接 |
| `POST /upload/image` | 新增/编辑弹窗证书图片上传 | ✅ P5.6 已对接 |
| `GET /complaints?workerId=` | 详情抽屉投诉记录列表 | ✅ P5.6 已对接 |

**P5.6 页面**：`/workers`（员工管理 > 服务人员管理）

**P5.6 列表列**：姓名/工号 / 手机号 / 状态 / 评分（含累计单数）/ **今日订单** / 技能 / 操作（详情/编辑/重置密码）（**无投诉率列、无证书标签列、无顶部统计卡**）

**P5.6 查询条件**：关键词（姓名或手机号，纯数字走 `phone` 参数）/ 状态 / 技能（保洁/收废品/保洁和收废品）

**P5.6 详情抽屉**：基本信息 + 证书信息区 + 绩效统计（**无创收金额**）+ 投诉记录列表

**P5.6 关键新增/扩展文件**：

- `apps/admin/src/api/worker.ts`（Worker CRUD + reset-password）
- `apps/admin/src/api/complaint.ts`（投诉列表 workerId 筛选）
- `apps/admin/src/views/workers/index.vue`（完整列表 + 弹窗 + 详情抽屉）
- `apps/server/src/modules/worker/`（skillType 筛选 + todayOrders 聚合 + CreateWorkerDto 扩展）
- `apps/server/src/modules/complaint/`（workerId 关联过滤）

**P5.6 验收清单**：

| 验收项 | 结果 |
|--------|------|
| 列表有「今日订单」列；无投诉率/证书标签列/顶部统计卡 | ✅ |
| 「重置密码」后员工可用手机号登录 | ✅ |
| 技能为下拉单选（含保洁/收废品/保洁和收废品） | ✅ |
| 详情页证书区展示正常 | ✅ |
| 详情页投诉记录列表可用 | ✅ |
| 绩效统计无创收金额 | ✅ |
| 手机号搜索可用 | ✅ |
| 健康证/技能证书非必填 | ✅ |
| `npm run build` 通过 | ✅ |

---

## P5.7 完成说明（2026-06-23）

管理后台投诉反馈管理（P5.7）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /complaints` | 投诉列表分页 + 状态 Tab + 关键词/客户联系方式筛选 + 关联订单富字段 | ✅ P5.7 已对接 |
| `GET /complaints/:id` | 详情抽屉（关联原始订单 + 投诉内容/凭证图 + followUps） | ✅ P5.7 已对接 |
| `PATCH /complaints/:id/status` | 提交跟进后 PENDING→PROCESSING；「结束」结案 COMPLETED | ✅ P5.7 已对接 |
| `POST /complaints/:id/follow-ups` | 详情抽屉录入跟进记录 | ✅ P5.7 已对接 |

**P5.7 页面**：`/orders/complaint`（订单管理 > 投诉反馈）

**P5.7 列表列**：投诉单编号 / 关联订单 / 客户姓名 / 客户联系方式 / 服务类型 / 服务地址 / 投诉内容 / 状态 / 操作（**无服务时间/服务人员/摘要列**）

**P5.7 查询条件**：关键词（投诉单号前缀/客户姓名/地址/描述）/ 客户联系方式 / 状态 Tab

**P5.7 详情抽屉**：关联原始订单 + 投诉内容（原因标签+描述+凭证图预览）+ 服务进度时间轴 + 处理跟进录入（提交/结束）

**P5.7 关键新增/扩展文件**：

- `apps/admin/src/api/complaint.ts`（fetchComplaintDetail / updateComplaintStatus / addComplaintFollowUp）
- `apps/admin/src/views/orders/complaint/index.vue`（完整列表 + 详情抽屉）
- `apps/server/src/modules/complaint/complaint.service.ts`（关联订单 include + toRichDto + keyword/contactPhone 筛选）
- `apps/server/src/modules/complaint/dto/query-complaint.dto.ts`（新增 keyword / contactPhone）

**P5.7 验收清单**：

| 验收项 | 结果 |
|--------|------|
| 列表含关联订单列和投诉内容列 | ✅ |
| 无服务时间/服务人员/摘要列 | ✅ |
| 跟进时间轴 + 提交/结束结案流程正常 | ✅ |
| 关键词与客户联系方式查询可用 | ✅ |
| `npm run build` 通过 | ✅ |

---

## P5.8 完成说明（2026-07-19）

管理后台系统管理-用户管理（P5.8）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /admins` | 用户列表分页 + 用户名/姓名/手机号/邮箱关键词筛选 | ✅ P5.8 已对接 |
| `POST /admins` | 新增用户（默认密码 `Dyyj123..`） | ✅ P5.8 已对接 |
| `PUT /admins/:id` | 编辑用户（name/email/phone，username 不可改） | ✅ P5.8 已对接 |
| `DELETE /admins/:id` | 删除用户（超级管理员/自身账号禁止） | ✅ P5.8 已对接 |
| `PATCH /admins/:id/toggle-status` | 启用/禁用切换（超级管理员/自身账号禁止） | ✅ P5.8 已对接 |
| `POST /admins/:id/reset-password` | 重置为默认密码 `Dyyj123..` | ✅ P5.8 已对接 |
| `PUT /admins/:id/change-password` | 顶栏「修改密码」自助改密（仅本人） | ✅ P5.8 已对接 |

**P5.8 页面**：`/system/users`（系统管理 > 用户管理），侧栏原扁平「系统设置」改为 `el-sub-menu`「系统管理」（为 P5.8b「功能授权」预留同级子项位置）；顶栏用户区域改为下拉菜单（修改密码/退出登录）

**P5.8 核心规则**：

- 新建用户默认密码固定为 `Dyyj123..`，不接受前端传入密码
- `AdminJwtAuthGuard`（`strategies/admin-jwt.strategy.ts`）每次请求查库校验 `status === 'ENABLED'`，禁用账号的旧 token 立即 401（不仅验签名）
- 超级管理员账号（`isSuperAdmin=true`）与当前登录账号自身，均不可被禁用或删除（前端隐藏对应操作按钮，后端 `ForbiddenException` 双重拦截）
- 顶栏改密仅允许操作自己账号（`id !== currentAdminId` 时 403），旧密码校验失败 400；成功后前端强制 `logout()` 并跳转登录页

**P5.8 关键新增/扩展文件**：

- `apps/server/prisma/schema.prisma`（`AdminStatus` 枚举 + `Admin` 扩展字段）
- `apps/server/src/modules/auth/strategies/admin-jwt.strategy.ts` / `guards/admin-jwt-auth.guard.ts` / `decorators/current-admin.decorator.ts`
- `apps/server/src/modules/admin/admin.service.ts`（`resetPassword` / `toggleStatus` / `changePassword` / `remove` 保护规则）
- `apps/admin/src/api/admin.ts`（新建）+ `apps/admin/src/views/system/users/index.vue`（新建，替换 `views/settings` 占位）
- `apps/admin/src/layout/index.vue`（侧栏子菜单 + 顶栏修改密码弹窗）

**P5.8 验收清单**：

| 验收项 | 结果 |
|--------|------|
| 新建用户 → 默认密码 `Dyyj123..` 登录成功 | ✅ |
| 禁用账号 → 旧 token 下一次请求立即 401 | ✅ |
| 禁用账号 → 重新登录返回 401 | ✅ |
| 超级管理员/自身账号禁用删除均 403 | ✅ |
| 跨用户改密 403、旧密码错误 400 | ✅ |
| 重复用户名创建返回 409 | ✅ |
| `npm run build`（server + admin）通过 | ✅ |

---

## P5.8b 完成说明（2026-07-19）

管理后台系统管理-功能授权（P5.8b）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /admins/:id/permissions` | 登录后拉取当前用户权限；功能授权页回填权限树 | ✅ P5.8b 已对接 |
| `PUT /admins/:id/permissions` | 功能授权页「保存」覆盖写入 | ✅ P5.8b 已对接 |

**P5.8b 页面**：`/system/permissions`（系统管理 > 功能授权：左侧用户列表 + 右侧 `el-tree` 权限树 + 全选/取消全选/保存）

**P5.8b 核心规则**：

- 页面级 11 个 `menuKey`，前后端各自硬编码维护（`menu-keys.constant.ts` / `menu-permissions.ts`）
- 超级管理员权限树默认全选且禁止编辑，不写入 `AdminPermission` 表，鉴权时直接全量放行
- `system.users` / `system.permissions` 始终仅超级管理员可用（沿用 P5.8 越权修复硬性边界）
- 登录后拉取权限存入 Pinia + localStorage；侧栏按 `hasMenu` 动态渲染；路由 `meta.menuKey` + `beforeEach` 拦截未授权 URL
- 本期不做后端业务接口级权限点校验、不做操作日志

**P5.8b 关键新增/扩展文件**：

- `apps/server/prisma/schema.prisma`（`AdminPermission` 模型）
- `apps/server/src/modules/admin-permission/`（Module/Service/Controller/DTO/constants）
- `apps/admin/src/api/admin-permission.ts` + `constants/menu-permissions.ts`
- `apps/admin/src/views/system/permissions/index.vue`
- `apps/admin/src/store/index.ts`（`permissions` / `hasMenu` / `fetchMyPermissions`）
- `apps/admin/src/router/index.ts`（`menuKey` meta + 权限拦截）+ `layout/index.vue`（侧栏动态渲染）

**P5.8b 验收清单**：

| 验收项 | 结果 |
|--------|------|
| 超管权限树全选禁用；非超管按已授权回填 | ✅ |
| 全选/取消全选/保存生效 | ✅ |
| 仅授权 `orders.cleaning` 账号登录后侧栏仅保洁+首页 | ✅ |
| 直接输入未授权/超管专属 URL 均拦截跳转首页 | ✅ |
| 跨用户查询 403、非超管分配 403、对超管分配 400、非法 menuKey 400 | ✅ |
| `npm run build`（含 shared/两端小程序/admin/server 全量）通过 | ✅ |

---

## P5.12 完成说明（2026-07-19）

管理后台首页/工作台（P5.12）已完成，**无新增后端接口**，纯前端复用已有列表接口的分页 `total` 字段：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /cleaning-orders?status=PENDING_ASSIGN&page=1&pageSize=1` | 待办卡片「待派单保洁订单」数字徽章 | ✅ P5.12 已对接（复用 P5.3） |
| `GET /recycling-orders?status=PENDING_ASSIGN&page=1&pageSize=1` | 待办卡片「待派单废品订单」数字徽章 | ✅ P5.12 已对接（复用 P5.4） |
| `GET /consult-orders?status=FOLLOW_UP&page=1&pageSize=1` | 待办卡片「待跟进家政咨询单」数字徽章 | ✅ P5.12 已对接（复用 P5.5） |
| `GET /complaints?status=PENDING&page=1&pageSize=1` | 待办卡片「待处理投诉」数字徽章 | ✅ P5.12 已对接（复用 P5.7） |

**P5.12 页面**：`/dashboard`（登录后默认落地页，非侧栏菜单项，不受功能授权权限树限制，所有登录用户默认可见）

**P5.12 页面内容**：欢迎条（当前用户姓名 + 角色「超级管理员/普通管理员」+ 按时段问候语）+ 4 张待办事项卡片（待派单保洁/待派单废品/待跟进家政/待处理投诉，各展示数字徽章，点击跳转对应列表页并通过 URL Query `status=` 预置状态筛选）

**P5.12 权限过滤规则**：卡片按 `useUserStore().hasMenu(menuKey)` 判断显示/隐藏（`orders.cleaning`/`orders.recycling`/`orders.consult`/`orders.complaint`），逻辑与侧栏菜单动态渲染一致；超级管理员始终展示全部四张；四个请求仅对可见卡片并发触发，单个请求失败不影响其余卡片

**P5.12 跳转预置筛选实现**：4 个订单列表页（`views/orders/{cleaning,recycling,consult,complaint}/index.vue`）`onMounted` 新增读取 `route.query.status` 回填 `queryParams.status` 逻辑，命中后自动高亮对应状态 Tab 并按该状态请求列表

**P5.12 关键新增/扩展文件**：

- `apps/admin/src/views/dashboard/index.vue`（完整重写，替换 P1.5 占位内容）
- `apps/admin/src/views/orders/cleaning/index.vue` / `recycling/index.vue` / `consult/index.vue` / `complaint/index.vue`（`onMounted` 增加 `route.query.status` 预置筛选）

**P5.12 验收清单**：

| 验收项 | 结果 |
|--------|------|
| 首页不再显示 P1.5 占位文案 | ✅ |
| 超级管理员登录：4 张待办卡片全部展示，数字与对应列表页条数一致 | ✅ |
| 仅授权 `orders.cleaning` 账号登录：首页仅展示「待派单保洁」卡片 | ✅ |
| 点击任意卡片跳转并预置状态筛选（对应 Tab 高亮 + 列表已按状态过滤） | ✅ |
| `npm run build`（shared + admin）通过 | ✅ |

---

## P5.9 完成说明（2026-06-23）

管理后台服务配置管理（P5.9）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /service-catalogs` | 列表分页 + 所属业务筛选 + 服务名称模糊搜索（管理页不传 `isEnabled` 返回全部） | ✅ P5.9 已对接 |
| `POST /service-catalogs` | 新增服务弹窗 | ✅ P5.9 已对接 |
| `PUT /service-catalogs/:id` | 编辑服务弹窗 | ✅ P5.9 已对接 |
| `DELETE /service-catalogs/:id` | 删除确认 | ✅ P5.9 已对接 |
| `PATCH /service-catalogs/:id/toggle` | 状态 Tag 点击切换启用/停用 | ✅ P5.9 已对接 |

**P5.9 页面**：`/config/services`（配置管理 > 服务配置）

**P5.9 列表列**：序号 / 所属业务 / 服务名称 / 副标题 / 图标 / 排序 / 状态 / 创建时间 / 操作（**无价格相关列**）

**P5.9 查询条件**：所属业务（CLEANING/RECYCLING/CONSULT）/ 服务名称（`name` 模糊匹配）

**P5.9 新增/编辑弹窗**：所属业务 / 服务名称 / 副标题 / 图标 URL / 排序（**无计价方式/单价/参考价字段**）

**P5.9 关键新增/扩展文件**：

- `apps/admin/src/api/service-catalog.ts`（create/update/delete/toggle + QueryServiceCatalogParams.name）
- `apps/admin/src/views/config/services/index.vue`（完整列表 + 新增/编辑 Dialog）
- `apps/server/src/modules/service-catalog/dto/query-service-catalog.dto.ts`（`isEnabled` 去掉默认值 + 新增 `name`）
- `apps/server/src/modules/service-catalog/service-catalog.service.ts`（条件过滤 + name contains）

**P5.9 验收清单**：

| 验收项 | 结果 |
|--------|------|
| ServiceCatalog CRUD 全功能可用 | ✅ |
| 启用/停用 toggle 正常 | ✅ |
| 列表无价格相关列 | ✅ |
| 服务名称搜索可用 | ✅ |
| `npm run build` 通过 | ✅ |

---

## P5.10 完成说明（2026-07-06）

管理后台运营人员信息配置（P5.10）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /operators` | 列表分页 + 姓名/手机号 keyword 模糊搜索 | ✅ P5.10 已对接 |
| `POST /operators` | 新增运营弹窗 | ✅ P5.10 已对接 |
| `PUT /operators/:id` | 编辑运营弹窗 | ✅ P5.10 已对接 |
| `DELETE /operators/:id` | 删除确认 | ✅ P5.10 已对接 |
| `GET /operators/contact` | 居民端首页客服电话（管理端删除后联动更新） | ✅ P3.2 已对接 |

**P5.10 页面**：`/config/operators`（配置管理 > 运营人员配置）

**P5.10 列表列**：序号 / 姓名 / 手机号（完整展示）/ 用途 / 创建时间 / 操作（**无启用/停用列**）

**P5.10 查询条件**：姓名或手机号统一搜索（`keyword` OR 匹配 `name`/`phone`）

**P5.10 新增/编辑弹窗**：姓名 / 联系电话（11 位校验）/ 作用（目前仅「接单」）

**P5.10 关键新增/扩展文件**：

- `apps/admin/src/api/operator.ts`（fetch/create/update/delete）
- `apps/admin/src/views/config/operators/index.vue`（完整列表 + 新增/编辑 Dialog）
- `apps/server/src/modules/operator/dto/query-operator.dto.ts`（`name` / `phone` / `keyword` 查询参数）
- `apps/server/src/modules/operator/operator.service.ts`（findAll 条件过滤 + keyword OR 查询）

**P5.10 验收清单**：

| 验收项 | 结果 |
|--------|------|
| Operator CRUD 全功能可用 | ✅ |
| 手机号完整展示（无脱敏） | ✅ |
| 姓名/手机号搜索可用 | ✅ |
| `npm run build` 通过 | ✅ |

---

---

## P5.11 完成说明（2026-07-06）

管理后台轮播图管理（P5.11）已完成，以下接口与前端已对接：

| 接口 | 前端用途 | 对接状态 |
|------|---------|---------|
| `GET /banners` | 列表分页 + 展示端/状态/标题筛选 | ✅ P5.11 已对接 |
| `POST /banners` | 新增轮播弹窗 | ✅ P5.11 已对接 |
| `PUT /banners/:id` | 编辑轮播弹窗 | ✅ P5.11 已对接 |
| `DELETE /banners/:id` | 删除确认 | ✅ P5.11 已对接 |
| `POST /upload/image` | Banner 图上传（≤2M，jpg/png/webp） | ✅ P5.11 已对接 |
| `GET /banners/active?displayTarget=RESIDENT` | 居民端首页轮播联动 | ✅ P3.2 已对接 |

**P5.11 页面**：`/config/banners`（配置管理 > 轮播图管理）

**P5.11 列表列**：序号 / 标题 / 展示端 / 跳转类型 / 排序值 / 状态 / 生效时间 / 创建时间 / 最后修改时间 / 操作

**P5.11 筛选条件**：状态（启用/禁用）/ 展示端（居民端/员工端/全部）/ 标题关键字（`title` 模糊查询）

**P5.11 新增/编辑弹窗**：
- 基础信息：标题 / 展示端 / 排序值 / 是否启用 / 生效时间范围
- 展示配置：Banner 图上传（建议 750×320px，≤2M）
- 跳转配置：跳转类型（不跳转/页面/H5）+ 跳转路径

**P5.11 关键新增/扩展文件**：

- `apps/admin/src/api/banner.ts`（fetch/create/update/delete）
- `apps/admin/src/views/config/banners/index.vue`（完整列表 + 新增/编辑 Dialog）
- `apps/server/src/modules/banner/dto/query-banner.dto.ts`（`title` 模糊查询）
- `apps/server/src/modules/banner/dto/create-banner.dto.ts`（`isEnabled` + `imageUrl` 校验兼容 localhost）
- `apps/server/src/modules/banner/dto/update-banner.dto.ts`（`imageUrl` 校验兼容 localhost）
- `apps/server/src/modules/banner/banner.service.ts`（title 筛选 + isEnabled 写入）
- `apps/admin/src/api/request.ts`（400 错误优先展示后端 message）

**P5.11 验收清单**：

| 验收项 | 结果 |
|--------|------|
| Banner CRUD 全功能可用 | ✅ |
| 展示端/状态/标题筛选可用 | ✅ |
| 新增轮播后居民端首页展示更新 | ✅ |
| 本地开发环境图片 URL 可正常保存 | ✅ |
| `banner.spec` 13 项通过 | ✅ |
| `npm run build` 通过 | ✅ |

---

> **文档版本**：v5.3（P5.12 管理后台首页/工作台对接完成）
> **生成日期**：2026-06-21
> **修订日期**：2026-07-19（v5.3：P5.12 首页改写为工作台——欢迎条 + 4 张按功能授权过滤的待办事项卡片，复用 P5.3/P5.4/P5.5/P5.7 列表接口 total 字段，无新增后端接口；4 个订单列表页 onMounted 新增 route.query.status 预置筛选；v5.2：P5.8b AdminPermission 表 + GET/PUT /admins/:id/permissions + 11 menuKey 权限树 + 侧栏动态渲染 + 路由守卫；v5.1：P5.8 Admin 扩展字段（username/phone/status/source/isSuperAdmin）+ AdminJwtAuthGuard 查库校验状态 + toggle-status/reset-password/change-password 新端点 + 默认密码 Dyyj123.. + 超级管理员/自身账号保护规则；v5.0：P5.11 轮播图列表/新增编辑/删除 + QueryBannerDto title 模糊查询 + CreateBannerDto isEnabled + imageUrl localhost 兼容 + 居民端 active 联动；v4.9：P5.10 运营人员列表/新增编辑/删除 + QueryOperatorDto keyword 模糊查询 + 手机号完整展示；v4.8：P5.9 服务配置列表/新增编辑/启用停用 toggle + QueryServiceCatalogDto name 模糊查询 + isEnabled 默认过滤放开；v4.7：P5.7 投诉反馈列表/详情抽屉/跟进结案 + complaints 关联订单富 DTO + keyword/contactPhone 筛选；v4.6：P5.6 服务人员列表/新增编辑/详情抽屉/重置密码 + todayOrders 聚合 + complaints workerId 筛选 + CreateWorkerDto 扩展；v4.5：P5.5 家政咨询单列表/新增/详情抽屉/ConsultFollowUp 跟进时间轴 + operatorId 修复；v4.4：P5.4 废品订单列表/分配/代下单 + CreateRecyclingOrderDto 扩展 + findOne worker 关联；v4.3：P5.3 保洁订单列表/分配/代下单 + CreateCleaningOrderDto 扩展；v4.2：P5.2 数据看板 ECharts 对接 + summary 时间范围统计；v4.1：P5.1 Admin 登录+二级折叠菜单+配置管理路由占位；v4.0：P4.7 我的页员工详情+证书预览+修改密码；v3.9：P4.6 PENDING_REVIEW/REVIEWED 只读模板+用户评价展示；v3.8：P4.5 IN_SERVICE 照片上传+水印+完成服务）
> **覆盖范围**：P2.1 ~ P2.15 全部后端接口（共 15 个模块，60+ 个端点）+ P3.1–P3.8 居民端 + P4.1–P4.7 员工端 + P5.1–P5.12 管理后台对接说明（含 P5.8/P5.8b 系统管理、P5.12 首页工作台）
> **P2.15 新增**：`POST/GET /consult-orders/:id/follow-ups`（家政跟进记录）、ConsultOrder v2.0 字段适配  
> **P2.15 修正**：废品 IN_SERVICE→PENDING_REVIEW 由员工 `/complete` 触发（与保洁对称），`/resident-accept` 已撤销
> **P3.6_repair 修正**：彻底删除居民验收接口及前端按钮，废品与保洁完全对称
> **P3.8 新增**：三类代下单全流程闭环验证；保洁/废品 trim 一致性；家政详情模板修复；`MiniApp-Architecture.md` 交接文档
> **P4.1 新增**：员工端登录页 + Pinia auth store + 路由守卫；`POST /auth/worker-login` 前端对接完成
> **P4.2 新增**：员工端首页 ASSIGNED 待接单列表；列表 Query 新增 `workerId`；`fetchAssignedOrders` / `acceptOrder` 前端对接完成
> **P4.3 新增**：员工端任务列表双 Tab + 精确状态筛选；`fetchWorkerOrders` 分页查询；排除 PENDING_ASSIGN
> **P4.4 新增**：员工端任务详情页；`fetchOrderDetail` / `gpsCheckin`；ASSIGNED 接单 + ACCEPTED GPS 签到；P4.4 单元测试 36 项
> **P4.5 新增**：IN_SERVICE 作业照片上传（`/upload/image` 含水印）；`completeOrder` 完成服务；`beforePhotoUrls`/`afterPhotoUrls` DTO 适配；修复 H5 `UPLOAD_BASE_URL` 代理路径
> **P4.6 新增**：员工端任务详情 PENDING_REVIEW/REVIEWED 只读模板；新增 `apps/miniapp-worker/src/api/review.ts`（`fetchOrderReview`）；REVIEWED 状态条件渲染用户评价 card（星级/标签/文字/图片/时间）；调 `GET /reviews?orderType=&orderId=` 懒加载
> **P4.7 新增**：员工端我的页完整实现；新增 `apps/miniapp-worker/src/api/worker.ts`（`fetchWorkerDetail` / `changePassword`）；`pages/mine/index` 重写（今日订单/今日已完成统计、健康证/技能证书预览、无服务记录入口）；`pages/settings/index` 修改密码页；对接 `GET /workers/:id` + `PUT /workers/:id/change-password`
> **P5.1 新增**：后端 `POST /auth/admin-login`（Admin JWT，role=admin）；管理后台真实登录+二级折叠菜单布局；P5.3–P5.11 路由占位（含配置管理）；`apps/admin/src/api/auth.ts` + Pinia store + layout/router；API 基址 `/api/v1`；seed 默认管理员 `admin@dayunyunjie.com` / `admin123`
> **P5.2 新增**：管理后台数据看板 `/data/dashboard`；`GET /dashboard/summary` 重构为时间范围统计（total/completed/inProgress/pending，仅保洁+废品）；ECharts 折线/环形/柱状图 + 员工绩效表格（无创收金额列）；本日/本周/本月切换联动刷新；`apps/admin/src/api/dashboard.ts`
> **P5.3 新增**：管理后台保洁订单 `/orders/cleaning`；列表（被服务人/服务时段/无金额列）+ 分配弹窗 + 代下单；`CreateCleaningOrderDto` 扩展（`addressSnapshotText`、可选 `residentId`/`addressId`）；`findAll` 含 worker 关联；服务时段与居民端 8 时间点 + 时长步进一致；`apps/admin/src/api/cleaning.ts`
> **P5.4 新增**：管理后台废品订单 `/orders/recycling`；复用 P5.3 框架（被服务人/代下单/分配/无金额列）+ 预估重量列；`CreateRecyclingOrderDto` 扩展；`findAll`/`findOne` 含 worker 关联；查询条件与保洁一致（关键词/电话/服务地址）；详情无 actualWeight/金额/收款；`apps/admin/src/api/recycling.ts`
> **P5.5 新增**：管理后台家政咨询单 `/orders/consult`；列表（被服务人/代下单/客户联系方式筛选）+ 新增咨询单弹窗 + 详情抽屉（ConsultFollowUp 跟进时间轴 + 提交/完成按钮）；状态 FOLLOW_UP/FOLLOWING/COMPLETED；修复 `updateConsultStatus` 缺少必填 `operatorId` 导致 400；`apps/admin/src/api/consult.ts`

> **P5.6 新增**：管理后台服务人员管理 `/workers`；列表（今日订单列 + 重置密码 + 技能单选筛选，无顶部统计卡/投诉率/证书标签列）+ 新增/编辑弹窗（v2.0 扩展字段 + 证书上传非必填）+ 详情抽屉（证书区 + 绩效统计无创收金额 + 投诉记录列表）；后端 `todayOrders` 聚合 + `GET /complaints?workerId=` + `CreateWorkerDto` 扩展；`apps/admin/src/api/worker.ts` + `apps/admin/src/api/complaint.ts`

> **P5.7 新增**：管理后台投诉反馈管理 `/orders/complaint`；列表（关联订单列 + 投诉内容列 + 客户联系方式筛选；无服务时间/服务人员/摘要列）+ 详情抽屉（关联原始订单 + 投诉内容/凭证图 + 跟进时间轴 + 提交/结束结案）；后端 `findAll`/`findOne` 关联订单富 DTO + `keyword`/`contactPhone` 查询；`apps/admin/src/api/complaint.ts` + `apps/admin/src/views/orders/complaint/index.vue`

> **P5.9 新增**：管理后台服务配置 `/config/services`；列表（所属业务/服务名称/副标题/图标/排序/状态/创建时间 + 无价格列）+ 新增/编辑弹窗 + 启用停用 toggle + 删除确认；后端 `QueryServiceCatalogDto` 新增 `name` 模糊查询 + `isEnabled` 默认过滤放开；`apps/admin/src/api/service-catalog.ts` 扩展 CRUD + toggle

> **P5.10 新增**：管理后台运营人员配置 `/config/operators`；列表（姓名/手机号完整展示/用途/创建时间 + 无启用停用列）+ 新增/编辑弹窗 + 删除确认；后端 `QueryOperatorDto` 扩展 `name`/`phone`/`keyword` 模糊查询；`apps/admin/src/api/operator.ts` 新建 CRUD

> **P5.11 新增**：管理后台轮播图管理 `/config/banners`；列表（标题/展示端/跳转类型/排序值/状态/生效时间/创建与修改时间）+ 状态/展示端/标题筛选 + 新增/编辑弹窗（三块表单 + 图片上传）+ 删除确认 + 状态 Tag 切换；后端 `QueryBannerDto.title` 模糊查询 + `CreateBannerDto.isEnabled` + `imageUrl` localhost 兼容；`apps/admin/src/api/banner.ts` 新建 CRUD；居民端 `GET /banners/active` 联动

> **P5.8 新增**：管理后台系统管理-用户管理 `/system/users`；Admin 扩展字段（username/phone/status/source/isSuperAdmin）+ `AdminJwtAuthGuard` 查库校验状态 + `SuperAdminGuard` 越权修复 + toggle-status/reset-password/change-password；默认密码 `Dyyj123..`；顶栏修改密码；`apps/admin/src/api/admin.ts`

> **P5.8b 新增**：管理后台系统管理-功能授权 `/system/permissions`；`AdminPermission` 表 + `GET`/`PUT /admins/:id/permissions`；11 个 menuKey 权限树分配；侧栏按 `hasMenu` 动态渲染；路由 `meta.menuKey` 守卫拦截；`system.users`/`system.permissions` 始终仅超管；`apps/admin/src/api/admin-permission.ts` + `constants/menu-permissions.ts`

> **P5.12 新增**：管理后台首页 `/dashboard` 改写为「工作台」（欢迎条 + 4 张待办事项卡片：待派单保洁/待派单废品/待跟进家政/待处理投诉）；卡片数字复用 P5.3/P5.4/P5.5/P5.7 列表接口 `pageSize=1` 的 `total` 字段，**无新增后端接口**；按 `hasMenu` 权限过滤卡片显示，超级管理员始终展示全部四张；点击卡片跳转对应列表页并通过 `route.query.status` 预置状态筛选（4 个订单列表页 `onMounted` 相应扩展）

> **P-UI Icon 替换（2026-07-19）**：居民端/员工端静态图标全面替换为 PNG（tabBar + 业务图标），删除旧 SVG；校准自带底色徽标 PNG 与外层容器尺寸。**前端契约修正**：员工端 `apps/miniapp-worker/src/api/order.ts` 废品订单 `serviceName` 由误读 `serviceType` 改为读 `serviceItem`（与 `RecyclingOrderDto` / 居民端一致；后端无新增接口）。同步清理居民端调试 `fetch(127.0.0.1)` 埋点。详见 `MiniApp-Architecture.md` §18.16。
