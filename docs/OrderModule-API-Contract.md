# OrderModule API Contract（P2.1–P2.4 交接文档）

> **生成节点**：P2.4 完成后 → 进入 P2.5a 前  
> **用途**：供后续订单模块（CleaningOrder 等）开发读取，避免上下文丢失  
> **Base URL**：`http://localhost:3000/api/v1`  
> **统一响应格式**：`{ code: number, message: string, data: T | null }`  
> **Swagger**：`http://localhost:3000/api/docs`

---

## 1. 通用约定

| 项 | 说明 |
|---|---|
| 成功码 | `code = 0`，`message = "ok"` |
| 错误码 | HTTP 状态码与 `code` 一致（400/401/404 等） |
| 分页列表 | `data: { items: T[], total: number, page: number, pageSize: number }` |
| 鉴权 | 仅 `/auth/profile` 需 `Authorization: Bearer <accessToken>`；其余 P2.1–P2.4 接口均为**公开** |
| 时间字段 | ISO 8601 字符串（如 `2026-06-02T05:29:49.708Z`） |
| 价格字段 | `ServiceCatalog` 的 `priceMin`/`priceMax` 为字符串（Decimal 序列化） |

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

**ServiceCatalogDto**

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | |
| `bizType` | `CLEANING` \| `RECYCLING` \| `CONSULT` | 业务大类 |
| `serviceItem` | string | 服务项名称 |
| `priceMin` | string | 最低参考价 |
| `priceMax` | string | 最高参考价 |
| `priceUnit` | string | 计价单位（如 `元/小时`） |
| `description` | string \| null | 描述 |
| `sortOrder` | number | 排序 |
| `isActive` | boolean | 是否启用 |
| `createdAt` | string | |
| `updatedAt` | string | |

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

## 7. 下一单元（P2.5a）提示

- 读取本文档 + `packages/shared` 订单 DTO
- 创建 `CleaningOrder` CRUD，订单号前缀 `CLN`
- 创建订单时需引用 `ServiceCatalog` 参考价计算 `referenceAmount`
- P2.5a 起建议切换**强模型**
