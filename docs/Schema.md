# 大洋云洁智享平台 — 数据库 Schema 设计

> **文档版本**：v1.2
> **编制日期**：2026-06-01
> **修订说明**：v1.2 新增 P2.1 认证范围确认：P2.1 仅实现 Resident 微信登录 + JWT（纯 mock，`code -> 固定 openid`，预留真实微信接口）；Worker/Admin 登录方案保持后续阶段实现。v1.1 Worker 统计字段精简 + 员工号密码登录、ServiceCatalog 扩展 CONSULT 类、移除 WorkerCertificate（留二期）、Address 加经纬度
> **输入文档**：`requirement.md` v1.3、`docs/tech.md` v1.4
> **输出文件**：本文档设计结论将转化为 `apps/server/prisma/schema.prisma`

> **前端工程确认（P1.4）**：居民端与员工端为两个独立 uni-app 工程（两个 workspace），共享类型通过 `@dayangyunjie/shared`；该决策不影响数据库表结构，但会影响后续 API/DTO 在两端的复用方式（以 shared 包为唯一来源）。

---

## 0. 设计决策总览

> **P2.1 需求确认（认证范围）**：本节为“数据库长期设计”；其中 `Worker.openid`、`Admin` 登录相关字段依然保留。  
> 但在实现节奏上，**P2.1 仅落地 Resident 登录链路**，并采用 **mock openid**（`code -> 固定 openid`）进行联调，后续阶段再接入真实微信并扩展 Worker/Admin 登录。

| #   | 决策项    | 方案                                                                                      |
| --- | --------- | ----------------------------------------------------------------------------------------- |
| A   | 用户模型  | **三表分离**：Resident（居民）/ Worker（员工）/ Admin（管理员）                           |
| B   | 订单模型  | **三表分离**：CleaningOrder（保洁）/ RecyclingOrder（废品）/ ConsultOrder（家政咨询）     |
| C   | 订单状态  | 保洁 & 废品共用 `OrderStatus`（8 值）；家政独立 `ConsultStatus`（3 值）                   |
| D   | 地址存储  | 独立 `Address` 表（关联 Resident）+ 订单中冗余 `address_snapshot` JSON                    |
| E   | 服务目录  | 建 `ServiceCatalog` 表，种子数据灌入参考价                                                |
| F   | 命名与 ID | 模型名 PascalCase 单数；表名 snake_case 复数（@@map）；主键自增 int；订单编号业务前缀区分 |
| P1  | 多态关联  | 鉴别器 + nullable FK（WorkPhoto / Review / Complaint 跨 CleaningOrder / RecyclingOrder）  |
| P2  | 编号前缀  | CLN（保洁）/ RCY（废品）/ CNS（家政咨询）                                                 |
| P3  | 状态枚举  | 保洁废品统一；家政独立                                                                    |

---

## 1. 实体关系概览

```
┌───────────┐     ┌────────────────┐     ┌─────────────────┐
│  Resident │────→│ CleaningOrder  │←────│    Worker       │
│           │     └───────┬────────┘     │                 │
│           │             │ nullable FK  │                 │
│           │     ┌───────▼────────┐     │                 │
│           │────→│ RecyclingOrder │←────│                 │
│           │     └───────┬────────┘     └─────────────────┘
│           │     ┌───────▼────────┐
│           │────→│  ConsultOrder  │
│           │             │
│           │     ┌───────▼────────┐
│           │     │    Complaint   │────→ ComplaintFollowUp
│           │     └───────┬────────┘
│           │             │
└─────┬─────┘     ┌───────▼────────┐
      │           │   WorkPhoto    │
      │           └────────────────┘
      │           ┌────────────────┐
      │           │    Review      │
┌─────▼─────┐     └────────────────┘
│  Address  │
└───────────┘

┌──────────────────┐     ┌───────────────┐
│ ServiceCatalog   │     │    Admin      │
└──────────────────┘     └───────────────┘
```

> 多态关联（WorkPhoto / Review / Complaint）通过鉴别器 `order_type` + nullable FK 实现，详见各表定义。

---

## 2. 枚举定义

### 2.1 OrderStatus — 保洁 / 废品订单状态

```
PENDING_ASSIGN ──→ ASSIGNED ──→ ACCEPTED ──→ IN_SERVICE ──→ PENDING_REVIEW ──→ REVIEWED
                                        │                      ↑
                                        │  [仅 RecyclingOrder] │
                                        └──→ PENDING_ACCEPTANCE┘

任意非终态 ──→ CANCELLED
```

| 枚举值               | 中文   | 保洁 | 废品 |
| -------------------- | ------ | ---- | ---- |
| `PENDING_ASSIGN`     | 待派单 | ✅   | ✅   |
| `ASSIGNED`           | 已派单 | ✅   | ✅   |
| `ACCEPTED`           | 已接单 | ✅   | ✅   |
| `IN_SERVICE`         | 服务中 | ✅   | ✅   |
| `PENDING_ACCEPTANCE` | 待验收 | —    | ✅   |
| `PENDING_REVIEW`     | 待评价 | ✅   | ✅   |
| `REVIEWED`           | 已评价 | ✅   | ✅   |
| `CANCELLED`          | 已取消 | ✅   | ✅   |

### 2.2 ConsultStatus — 家政咨询单状态

```
PENDING ──→ FOLLOWING_UP ──→ COMPLETED
```

| 枚举值         | 中文   |
| -------------- | ------ |
| `PENDING`      | 待跟进 |
| `FOLLOWING_UP` | 跟进中 |
| `COMPLETED`    | 已完成 |

### 2.3 通用枚举

**PaymentStatus**

| 值       | 中文   |
| -------- | ------ |
| `UNPAID` | 未收款 |
| `PAID`   | 已收款 |

**OrderSource**

| 值            | 中文     |
| ------------- | -------- |
| `MINIPROGRAM` | 小程序   |
| `PHONE`       | 电话预约 |
| `PROXY`       | 代下单   |

**WorkerStatus**

| 值     | 中文   |
| ------ | ------ |
| `IDLE` | 空闲   |
| `BUSY` | 服务中 |

**PhotoType**

| 值               | 中文     |
| ---------------- | -------- |
| `BEFORE`         | 打扫前   |
| `AFTER`          | 打扫后   |
| `RECYCLING_SITE` | 回收现场 |

**ComplaintReason**

| 值              | 中文             |
| --------------- | ---------------- |
| `POOR_ATTITUDE` | 服务态度差       |
| `NOT_CLEAN`     | 打扫不干净       |
| `NOT_ON_TIME`   | 未按约定时间到达 |
| `ITEM_DAMAGED`  | 物品损坏/丢失    |
| `EXTRA_CHARGE`  | 额外收费         |
| `OTHER`         | 其他原因         |

**ComplaintStatus**

| 值           | 中文   |
| ------------ | ------ |
| `PENDING`    | 待处理 |
| `PROCESSING` | 处理中 |
| `COMPLETED`  | 已完成 |

---

## 3. 用户模型

### 3.1 Resident — 居民

> 微信 openid 登录；首次下单时补全姓名和手机号。
>  
> **P2.2 接口口径确认**：`Resident` 新增接口最小必填仅 `openid`，其余字段（`nickname`/`name`/`phone`/`avatar`）可选。

| 字段        | 类型     | 必填 | 说明                     |
| ----------- | -------- | ---- | ------------------------ |
| `id`        | Int (PK) | ✅   | 自增主键                 |
| `openid`    | String   | ✅   | 微信 openid，UNIQUE      |
| `nickname`  | String   |      | 微信昵称                 |
| `name`      | String   |      | 真实姓名（首次下单补全） |
| `phone`     | String   |      | 手机号（首次下单补全）   |
| `avatar`    | String   |      | 微信头像 URL             |
| `createdAt` | DateTime | ✅   |                          |
| `updatedAt` | DateTime | ✅   |                          |

**关系**：hasMany Address, hasMany CleaningOrder, hasMany RecyclingOrder, hasMany ConsultOrder

### 3.2 Worker — 员工

> 微信 openid 登录（员工端小程序，免密），也可用工号 / 手机号 + 密码登录（备用，减少验证码依赖）；后台创建并绑定员工账号。
>  
> **P2.2 密码口径确认**：创建/更新时接口接收明文 `password`，仅允许服务端 `bcrypt` 后写入 `passwordHash`；查询接口不得返回 `passwordHash`。

| 字段           | 类型         | 必填 | 说明                                                                        |
| -------------- | ------------ | ---- | --------------------------------------------------------------------------- |
| `id`           | Int (PK)     | ✅   | 自增主键                                                                    |
| `openid`       | String       | ✅   | 微信 openid，UNIQUE                                                         |
| `employeeNo`   | String       | ✅   | 员工工号，UNIQUE                                                            |
| `passwordHash` | String       | ✅   | bcrypt 哈希（工号/手机号+密码登录）                                         |
| `name`         | String       | ✅   | 姓名                                                                        |
| `phone`        | String       | ✅   | 手机号                                                                      |
| `avatar`       | String       |      | 头像 URL                                                                    |
| `status`       | WorkerStatus | ✅   | IDLE / BUSY，默认 IDLE                                                      |
| `rating`       | Float        |      | 综合评分（评价提交时更新，实时查询时可 AVG(reviews.rating) 校验），默认 5.0 |
| `totalOrders`  | Int          |      | 累计服务单数（订单完成时 +1），默认 0                                       |
| `skills`       | Json         | ✅   | 技能标签，如 `["CLEANING","RECYCLING"]`                                     |
| `createdAt`    | DateTime     | ✅   |                                                                             |
| `updatedAt`    | DateTime     | ✅   |                                                                             |

**关系**：hasMany CleaningOrder, hasMany RecyclingOrder

> `rating` 和 `totalOrders` 是冗余缓存字段——在员工列表/派单页高频展示，避免每次跨表 JOIN。`currentMonthOrders` 和 `complaintRate` 在 v1.1 移除，由查询层按需实时计算。

### 3.3 Admin — 管理员

> 邮箱 + 密码登录管理后台。
>  
> **P2.2 密码口径确认**：与 Worker 一致，接口入参使用明文 `password`，服务端加密后落库 `passwordHash`，查询不返回哈希值。

| 字段           | 类型     | 必填 | 说明         |
| -------------- | -------- | ---- | ------------ |
| `id`           | Int (PK) | ✅   | 自增主键     |
| `email`        | String   | ✅   | 邮箱，UNIQUE |
| `passwordHash` | String   | ✅   | bcrypt 哈希  |
| `name`         | String   | ✅   | 姓名         |
| `createdAt`    | DateTime | ✅   |              |
| `updatedAt`    | DateTime | ✅   |              |

---

## 4. 地址模型

### 4.1 Address — 地址簿

| 字段         | 类型     | 必填 | 说明                                          |
| ------------ | -------- | ---- | --------------------------------------------- |
| `id`         | Int (PK) | ✅   | 自增主键                                      |
| `residentId` | Int (FK) | ✅   | 关联 Resident                                 |
| `name`       | String   | ✅   | 地址标签（如"家"、"公司"）                    |
| `phone`      | String   | ✅   | 收货/联系人电话                               |
| `province`   | String   | ✅   | 省                                            |
| `city`       | String   | ✅   | 市                                            |
| `district`   | String   | ✅   | 区/县                                         |
| `detail`     | String   | ✅   | 详细地址                                      |
| `lat`        | Float    |      | 纬度（可选，为二期路线规划/GPS 距离校验预留） |
| `lng`        | Float    |      | 经度（可选）                                  |
| `isDefault`  | Boolean  | ✅   | 默认地址，默认 false                          |
| `createdAt`  | DateTime | ✅   |                                               |
| `updatedAt`  | DateTime | ✅   |                                               |

---

## 5. 订单模型

> 三表共享的通用字段注释如下，不再逐表重复说明：
>
> - `orderNo`：前缀 CLN / RCY / CNS + yyyyMMdd + 4 位序号，UNIQUE
> - `source`：订单来源（小程序/电话/代下单），代下单时 `isProxyOrder = true`
> - `addressSnapshot`：下单时冗余完整地址 JSON，确保历史订单不受地址变更影响
> - `referenceAmount`：参考价（预约时展示）；`finalAmount`：核定金额（上门后填写）

### 5.1 CleaningOrder — 保洁订单

| 字段              | 类型          | 必填 | 说明                           |
| ----------------- | ------------- | ---- | ------------------------------ |
| `id`              | Int (PK)      | ✅   | 自增主键                       |
| `orderNo`         | String        | ✅   | `CLN{yyyyMMdd}{序号}`，UNIQUE  |
| `residentId`      | Int (FK)      | ✅   | 下单居民                       |
| `workerId`        | Int (FK)      |      | 被分配员工（派单后填充）       |
| `serviceItem`     | String        | ✅   | 日常清扫 / 深度清扫 / 专项清洁 |
| `serviceDuration` | Int           | ✅   | 服务时长（小时），默认 2       |
| `appointDate`     | DateTime      | ✅   | 预约日期                       |
| `appointTimeSlot` | String        | ✅   | 时段，如 `"14:00-16:00"`       |
| `addressSnapshot` | Json          | ✅   | 下单时地址快照                 |
| `contactName`     | String        | ✅   | 联系人                         |
| `contactPhone`    | String        | ✅   | 联系电话                       |
| `remark`          | String        |      | 备注                           |
| `source`          | OrderSource   | ✅   | 订单来源                       |
| `isProxyOrder`    | Boolean       | ✅   | 是否代下单，默认 false         |
| `proxyName`       | String        |      | 服务对象姓名（代下单）         |
| `proxyPhone`      | String        |      | 服务对象手机号（代下单）       |
| `status`          | OrderStatus   | ✅   | 订单状态，默认 PENDING_ASSIGN  |
| `referenceAmount` | Decimal       |      | 参考价                         |
| `finalAmount`     | Decimal       |      | 核定金额（员工填写）           |
| `paymentStatus`   | PaymentStatus | ✅   | UNPAID / PAID，默认 UNPAID     |
| `paidAt`          | DateTime      |      | 收款确认时间                   |
| `gpsLat`          | Float         |      | GPS 纬度                       |
| `gpsLng`          | Float         |      | GPS 经度                       |
| `gpsCheckinAt`    | DateTime      |      | GPS 签到时间                   |
| `gpsDistance`     | Float         |      | 超距距离（米）                 |
| `gpsRemark`       | String        |      | 超距说明                       |
| `createdAt`       | DateTime      | ✅   |                                |
| `updatedAt`       | DateTime      | ✅   |                                |

**关系**：belongsTo Resident, belongsTo Worker?, hasMany WorkPhoto, hasOne Review?, hasMany Complaint

### 5.2 RecyclingOrder — 废品订单

| 字段              | 类型          | 必填 | 说明                                 |
| ----------------- | ------------- | ---- | ------------------------------------ |
| `id`              | Int (PK)      | ✅   | 自增主键                             |
| `orderNo`         | String        | ✅   | `RCY{yyyyMMdd}{序号}`，UNIQUE        |
| `residentId`      | Int (FK)      | ✅   | 下单居民                             |
| `workerId`        | Int (FK)      |      | 被分配员工                           |
| `itemType`        | String        | ✅   | `LARGE`（大件类）/ `SMALL`（小件类） |
| `estimatedWeight` | Float         | ✅   | 预估重量（kg），默认 5               |
| `actualWeight`    | Float         |      | 实际上门重量（kg）                   |
| `appointDate`     | DateTime      | ✅   |                                      |
| `appointTimeSlot` | String        | ✅   |                                      |
| `addressSnapshot` | Json          | ✅   |                                      |
| `contactName`     | String        | ✅   |                                      |
| `contactPhone`    | String        | ✅   |                                      |
| `remark`          | String        |      |                                      |
| `source`          | OrderSource   | ✅   |                                      |
| `isProxyOrder`    | Boolean       | ✅   | 默认 false                           |
| `proxyName`       | String        |      |                                      |
| `proxyPhone`      | String        |      |                                      |
| `status`          | OrderStatus   | ✅   | 默认 PENDING_ASSIGN                  |
| `referenceAmount` | Decimal       |      |                                      |
| `finalAmount`     | Decimal       |      |                                      |
| `paymentStatus`   | PaymentStatus | ✅   | 默认 UNPAID                          |
| `paidAt`          | DateTime      |      |                                      |
| `gpsLat`          | Float         |      |                                      |
| `gpsLng`          | Float         |      |                                      |
| `gpsCheckinAt`    | DateTime      |      |                                      |
| `gpsDistance`     | Float         |      |                                      |
| `gpsRemark`       | String        |      |                                      |
| `createdAt`       | DateTime      | ✅   |                                      |
| `updatedAt`       | DateTime      | ✅   |                                      |

**关系**：同 CleaningOrder

### 5.3 ConsultOrder — 家政咨询单

> 不走派单/员工端/GPS/拍照/收款流程，独立状态机。

| 字段          | 类型          | 必填 | 说明                                     |
| ------------- | ------------- | ---- | ---------------------------------------- |
| `id`          | Int (PK)      | ✅   | 自增主键                                 |
| `orderNo`     | String        | ✅   | `CNS{yyyyMMdd}{序号}`，UNIQUE            |
| `residentId`  | Int (FK)      |      | 提交居民（可空，联系信息以下方字段为准） |
| `serviceType` | String        | ✅   | 保姆 / 月嫂 / 育儿嫂 / 陪诊 / 代买菜     |
| `name`        | String        | ✅   | 联系人姓名                               |
| `phone`       | String        | ✅   | 联系电话                                 |
| `description` | String        | ✅   | 核心诉求（多行文本）                     |
| `status`      | ConsultStatus | ✅   | 默认 PENDING                             |
| `createdAt`   | DateTime      | ✅   |                                          |
| `updatedAt`   | DateTime      | ✅   |                                          |

**关系**：belongsTo Resident?, hasMany Complaint

---

## 6. 业务关联模型

### 6.1 WorkPhoto — 作业照片

> 鉴别器模式：`orderType` 区分关联 CleaningOrder 还是 RecyclingOrder。

| 字段               | 类型      | 必填 | 说明                                     |
| ------------------ | --------- | ---- | ---------------------------------------- |
| `id`               | Int (PK)  | ✅   | 自增主键                                 |
| `cleaningOrderId`  | Int (FK)  |      | 关联保洁订单（与 recyclingOrderId 互斥） |
| `recyclingOrderId` | Int (FK)  |      | 关联废品订单（与 cleaningOrderId 互斥）  |
| `orderType`        | String    | ✅   | `"CLEANING"` / `"RECYCLING"`             |
| `photoType`        | PhotoType | ✅   | BEFORE / AFTER / RECYCLING_SITE          |
| `url`              | String    | ✅   | 图片 URL（COS 存储）                     |
| `uploadedBy`       | Int       | ✅   | 上传人 Worker.id                         |
| `createdAt`        | DateTime  | ✅   |                                          |

> **约束**：业务层确保 `(cleaningOrderId IS NOT NULL AND recyclingOrderId IS NULL)` XOR `(recyclingOrderId IS NOT NULL AND cleaningOrderId IS NULL)`。

### 6.2 Review — 评价

| 字段               | 类型     | 必填 | 说明                                   |
| ------------------ | -------- | ---- | -------------------------------------- |
| `id`               | Int (PK) | ✅   | 自增主键                               |
| `cleaningOrderId`  | Int (FK) |      | 关联保洁订单                           |
| `recyclingOrderId` | Int (FK) |      | 关联废品订单                           |
| `orderType`        | String   | ✅   | `"CLEANING"` / `"RECYCLING"`           |
| `rating`           | Int      | ✅   | 1–5 星                                 |
| `tags`             | Json     | ✅   | 快捷标签，如 `["打扫干净","准时到达"]` |
| `content`          | String   |      | 文字评价                               |
| `images`           | Json     |      | 评价附图 URL 数组                      |
| `createdAt`        | DateTime | ✅   |                                        |

### 6.3 Complaint — 投诉

| 字段               | 类型            | 必填 | 说明                                       |
| ------------------ | --------------- | ---- | ------------------------------------------ |
| `id`               | Int (PK)        | ✅   | 自增主键                                   |
| `cleaningOrderId`  | Int (FK)        |      | 关联保洁订单                               |
| `recyclingOrderId` | Int (FK)        |      | 关联废品订单                               |
| `consultOrderId`   | Int (FK)        |      | 关联家政咨询单                             |
| `orderType`        | String          | ✅   | `"CLEANING"` / `"RECYCLING"` / `"CONSULT"` |
| `reason`           | ComplaintReason | ✅   | 投诉原因枚举                               |
| `description`      | String          | ✅   | 问题描述                                   |
| `evidenceImages`   | Json            |      | 证据图片 URL 数组                          |
| `status`           | ComplaintStatus | ✅   | 默认 PENDING                               |
| `createdAt`        | DateTime        | ✅   |                                            |
| `updatedAt`        | DateTime        | ✅   |                                            |

**关系**：hasMany ComplaintFollowUp

### 6.4 ComplaintFollowUp — 投诉跟进记录

| 字段          | 类型     | 必填 | 说明                   |
| ------------- | -------- | ---- | ---------------------- |
| `id`          | Int (PK) | ✅   | 自增主键               |
| `complaintId` | Int (FK) | ✅   | 关联投诉               |
| `handlerName` | String   | ✅   | 处理人（如"客服小王"） |
| `content`     | String   | ✅   | 沟通摘要/处理记录      |
| `createdAt`   | DateTime | ✅   |                        |

---

## 7. 管理与配置模型

> WorkerCertificate（员工证书）留二期，一期不涉及。

### 7.1 ServiceCatalog — 服务目录

| 字段          | 类型     | 必填 | 说明                                       |
| ------------- | -------- | ---- | ------------------------------------------ |
| `id`          | Int (PK) | ✅   | 自增主键                                   |
| `bizType`     | String   | ✅   | `"CLEANING"` / `"RECYCLING"` / `"CONSULT"` |
| `serviceItem` | String   | ✅   | 服务项（日常清扫、大件类、保姆等）         |
| `priceMin`    | Decimal  | ✅   | 最低参考价                                 |
| `priceMax`    | Decimal  | ✅   | 最高参考价                                 |
| `priceUnit`   | String   | ✅   | 计价单位（如"元/小时"、"元/kg"、"元/月"）  |
| `description` | String   |      | 服务说明                                   |
| `sortOrder`   | Int      | ✅   | 排序，默认 0                               |
| `isActive`    | Boolean  | ✅   | 是否启用，默认 true                        |
| `createdAt`   | DateTime | ✅   |                                            |
| `updatedAt`   | DateTime | ✅   |                                            |

---

## 8. 订单状态流转规则

### 8.1 CleaningOrder 状态流转

```
居民下单 ──→ PENDING_ASSIGN
                │
     [后台分配员工]
                ↓
             ASSIGNED
                │
     [员工点击"立即接单"]
                ↓
             ACCEPTED
                │
     [员工点击"开始服务" + GPS签到]
                ↓
            IN_SERVICE
                │
     [员工上传作业照片，服务完成]
                ↓
          PENDING_REVIEW
                │
     [居民提交评价]
                ↓
             REVIEWED

任意非终态 ──→ CANCELLED（后台操作 / 居民取消）

[员工线下收款后点击"已收款"] → paymentStatus: PAID
```

### 8.2 RecyclingOrder 状态流转

```
与 CleaningOrder 一致，仅在 IN_SERVICE 之后插入 PENDING_ACCEPTANCE：

IN_SERVICE
    │
    [员工上传回收照片 + 录入实际重量]
    ↓
PENDING_ACCEPTANCE
    │
    [居民点击"验收服务"]
    ↓
PENDING_REVIEW → REVIEWED

[验收不通过] → 运营线下处理，状态不回退
```

### 8.3 ConsultOrder 状态流转

```
提交需求 ──→ PENDING
                │
     [运营接单，15分钟内电话回访]
                ↓
           FOLLOWING_UP
                │
     [匹配到合适服务人员，完成服务对接]
                ↓
            COMPLETED
```

---

## 9. 索引建议

| 表             | 索引                    | 类型     | 说明             |
| -------------- | ----------------------- | -------- | ---------------- |
| Resident       | `openid`                | UNIQUE   | 微信登录查询     |
| Worker         | `openid`                | UNIQUE   | 微信登录查询     |
| Worker         | `employeeNo`            | UNIQUE   | 工号登录查询     |
| Worker         | `status, skills`        | COMPOUND | 派单时查空闲员工 |
| Admin          | `email`                 | UNIQUE   | 登录             |
| Address        | `residentId, isDefault` | COMPOUND | 查居民默认地址   |
| CleaningOrder  | `orderNo`               | UNIQUE   | 业务编号查询     |
| CleaningOrder  | `residentId, status`    | COMPOUND | 居民端订单列表   |
| CleaningOrder  | `workerId, status`      | COMPOUND | 员工端任务列表   |
| CleaningOrder  | `status, appointDate`   | COMPOUND | 管理后台筛选     |
| CleaningOrder  | `appointDate`           | INDEX    | 看板按日聚合     |
| RecyclingOrder | 同上（按对应字段）      | —        | 同上             |
| ConsultOrder   | `status`                | INDEX    | 管理后台筛选     |
| WorkPhoto      | `cleaningOrderId`       | INDEX    | 查订单照片       |
| WorkPhoto      | `recyclingOrderId`      | INDEX    | 查订单照片       |
| Review         | `cleaningOrderId`       | UNIQUE   | 一单一评         |
| Review         | `recyclingOrderId`      | UNIQUE   | 一单一评         |
| Complaint      | `status`                | INDEX    | 管理后台筛选     |
| ServiceCatalog | `bizType, isActive`     | COMPOUND | 小程序展示服务项 |

---

## 10. 种子数据

### 10.1 Admin

```sql
INSERT INTO admins (email, password_hash, name) VALUES
('admin@dayunyunjie.com', '<bcrypt>', '管理员');
```

### 10.2 ServiceCatalog

```sql
INSERT INTO service_catalogs (biz_type, service_item, price_min, price_max, price_unit, description, sort_order) VALUES
-- 保洁
('CLEANING', '日常清扫', 35, 45, '元/小时', '地面、桌面、卫生间基础清洁', 1),
('CLEANING', '深度清扫', 50, 80, '元/小时', '厨房油烟、卫生间水垢深度去除（上门核定）', 2),
('CLEANING', '专项清洁', 0, 0, '按项目报价', '搬家清洁、开荒保洁（上门核定）', 3),
-- 废品
('RECYCLING', '大件类', 0, 0, '上门核定', '大家电、家具回收，需搬运工上门', 1),
('RECYCLING', '小件类', 0, 0, '上门核定', '书籍纸箱、塑料瓶、废金属、小家电', 2),
-- 家政咨询
('CONSULT', '保姆', 5000, 8000, '元/月', '住家保姆服务（具体价格上门核定）', 1),
('CONSULT', '月嫂', 8000, 15000, '元/月', '产后母婴护理（具体价格上门核定）', 2),
('CONSULT', '育儿嫂', 5000, 8000, '元/月', '婴幼儿照护（具体价格上门核定）', 3),
('CONSULT', '陪诊', 200, 500, '元/次', '陪同就医服务', 4),
('CONSULT', '代买菜', 20, 50, '元/次', '代购食材上门', 5);
```

---

## 11. addressSnapshot JSON 结构

订单中 `addressSnapshot` 字段的结构，下单时从 Address 表冗余写入：

```json
{
  "name": "弘善家园3号楼1单元101",
  "phone": "138****8888",
  "province": "北京市",
  "city": "北京市",
  "district": "朝阳区",
  "detail": "弘善家园3号楼1单元101"
}
```

---

_本文档 v1.2，新增 P2.1 认证范围确认（仅 Resident 微信登录 + JWT，纯 mock openid，Worker/Admin 后续实现）；v1.1 精简 Worker 统计字段 + 新增员工号密码登录、ServiceCatalog 扩展 CONSULT 类、移除 WorkerCertificate（留二期）、Address 加经纬度；v1.0 基于需求文档 v1.3 和已确认的设计决策生成。将作为 `prisma/schema.prisma` 的直接输入。_
