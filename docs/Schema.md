# 大洋云洁智享平台 — 数据库 Schema 设计

> **文档版本**：v2.0
> **编制日期**：2026-06-14
> **修订说明**：v2.0 基于需求文档 v2.0（`requirement_v2.0.md`）全面更新：枚举重构（删除 PENDING_ACCEPTANCE / PROXY，ConsultStatus 重命名）；Worker 大幅扩展（删除 openid、新增 10+ 字段、技能改单选）；Address 字段重构（新增 contactName/buildingInfo/addressTag）；订单 proxy 字段重命名为 serviceContact；ConsultOrder 补全代下单/地址/来源字段；Complaint 补全投诉单编号/冗余字段；ServiceCatalog 去价格字段、新增副标题/图标；新增 Banner / Operator / ConsultFollowUp 三张表。v1.2 新增 P2.1 认证范围确认；v1.1 Worker 统计字段精简 + 员工号密码登录、ServiceCatalog 扩展 CONSULT 类、移除 WorkerCertificate（留二期）、Address 加经纬度
> **输入文档**：`requirement_v2.0.md` v2.0、`docs/tech.md` v1.4
> **输出文件**：本文档设计结论将转化为 `apps/server/prisma/schema.prisma`

> **前端工程确认（P1.4）**：居民端与员工端为两个独立 uni-app 工程（两个 workspace），共享类型通过 `@dayangyunjie/shared`；该决策不影响数据库表结构，但会影响后续 API/DTO 在两端的复用方式（以 shared 包为唯一来源）。

---

## 0. 设计决策总览

> **v2.0 认证方案**：Resident 端微信 openid 登录 + JWT；Worker 端改为**手机号+密码登录**（不使用微信授权，默认密码为完整手机号），删除 `Worker.openid`；Admin 邮箱+密码登录管理后台；Operator（运营人员）不登录系统，仅配置联系信息。

| #   | 决策项          | 方案                                                                                              |
| --- | --------------- | ------------------------------------------------------------------------------------------------- |
| A   | 用户模型        | **三表分离**：Resident（居民）/ Worker（服务人员）/ Admin（管理员）+ Operator（运营人员联系信息） |
| B   | 订单模型        | **三表分离**：CleaningOrder（保洁）/ RecyclingOrder（废品）/ ConsultOrder（家政咨询）             |
| C   | 订单状态        | 保洁 & 废品共用 `OrderStatus`（7 值，v2.0 删除 PENDING_ACCEPTANCE）；家政独立 `ConsultStatus` |
| D   | 地址存储        | 独立 `Address` 表（关联 Resident）+ 订单中冗余 `address_snapshot` JSON                        |
| E   | 服务配置        | `ServiceCatalog` 表（v2.0 去价格字段，新增 subtitle/icon，isActive→isEnabled）                  |
| F   | 命名与 ID       | 模型名 PascalCase 单数；表名 snake_case 复数（@@map）；主键自增 int；订单编号业务前缀区分         |
| G   | 配置扩展（v2.0）| 新增 `Banner`（轮播图配置）、`Operator`（运营人员联系信息）                                   |
| P1  | 多态关联        | 鉴别器 + nullable FK（WorkPhoto / Review / Complaint 跨 CleaningOrder / RecyclingOrder）          |
| P2  | 编号前缀        | CLN（保洁）/ RCY（废品）/ CNS（家政咨询）/ CPL（投诉）                                           |
| P3  | 状态枚举        | 保洁废品统一；家政独立；封存字段仅数据库保留，API 层不暴露                                       |
| P4  | 跟进记录        | ComplaintFollowUp 和 ConsultFollowUp 均用独立子表，便于分页查询和时序展示                         |

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

┌───────────────┐     ┌─────────┐
│    Banner     │     │Operator │
└───────────────┘     └─────────┘
```

> 多态关联（WorkPhoto / Review / Complaint）通过鉴别器 `order_type` + nullable FK 实现，详见各表定义。
>
> **v2.0 新增关联**：
> - `ConsultOrder → ConsultFollowUp`（一对多，见 §7.4）
> - `Resident → Complaint`（直接关联，`residentId` FK，见 §6.5）
> - 独立配置表：`Banner`（轮播图，见 §7.2）、`Operator`（运营商，见 §7.3）

---

## 2. 枚举定义

### 2.1 OrderStatus — 保洁 / 废品订单状态

> **v2.0 变更**：删除 `PENDING_ACCEPTANCE`（待验收）。废品验收在「服务中」阶段完成（员工上传照片 → 居民点击「验收服务」），直接触发 `PENDING_REVIEW`，保洁与废品共用同一状态枚举。取消规则收紧：**仅 `PENDING_ASSIGN` 状态可取消**。

```
PENDING_ASSIGN ──→ ASSIGNED ──→ ACCEPTED ──→ IN_SERVICE ──→ PENDING_REVIEW ──→ REVIEWED
     │
     └──→ CANCELLED（仅待派单阶段允许）
```

| 枚举值           | 中文   | 保洁 | 废品 |
| ---------------- | ------ | ---- | ---- |
| `PENDING_ASSIGN` | 待派单 | ✅   | ✅   |
| `ASSIGNED`       | 已派单 | ✅   | ✅   |
| `ACCEPTED`       | 已接单 | ✅   | ✅   |
| `IN_SERVICE`     | 服务中 | ✅   | ✅   |
| `PENDING_REVIEW` | 待评价 | ✅   | ✅   |
| `REVIEWED`       | 已评价 | ✅   | ✅   |
| `CANCELLED`      | 已取消 | ✅   | ✅   |

### 2.2 ConsultStatus — 家政咨询单状态

> **v2.0 变更**：重命名枚举值：`PENDING` → `FOLLOW_UP`，`FOLLOWING_UP` → `FOLLOWING`，与需求文档 §5.1.3 / §10.2 #39 对齐。

```
FOLLOW_UP ──→ FOLLOWING ──→ COMPLETED
```

| 枚举值      | 中文   |
| ----------- | ------ |
| `FOLLOW_UP` | 待跟进 |
| `FOLLOWING` | 跟进中 |
| `COMPLETED` | 已完成 |

### 2.3 通用枚举

**PaymentStatus**

| 值       | 中文   |
| -------- | ------ |
| `UNPAID` | 未收款 |
| `PAID`   | 已收款 |

**OrderSource**

> **v2.0 变更**：删除 `PROXY`（代下单）。代下单标记完全由 `isProxyOrder` 字段独立承担，`source` 仅反映下单渠道（§6.1 / #87）。

| 值            | 中文     |
| ------------- | -------- |
| `MINIPROGRAM` | 小程序   |
| `PHONE`       | 电话预约 |

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

**关系**：hasMany Address, hasMany CleaningOrder, hasMany RecyclingOrder, hasMany ConsultOrder, hasMany Complaint

### 3.2 Worker — 服务人员

> **v2.0 变更（§5.3.1 / §6.7）**：员工端改为手机号+密码登录，**删除 `openid`**（不再使用微信授权）；技能由多选 JSON 改为**单选字符串**（保洁与废品回收为两组独立人员，不重叠）；新增昵称、性别、身份证号、岗位、紧急联系人、证书等字段；`employeeNo` 对应 v2.0 `staffNo`（员工编号）。  
> 默认密码为完整手机号（bcrypt 哈希），员工可在员工端修改；忘记密码时后台「重置密码」恢复为手机号。
>
> **密码口径确认**：创建/更新时接口接收明文 `password`，仅允许服务端 `bcrypt` 后写入 `passwordHash`；查询接口不得返回 `passwordHash`。

| 字段                | 类型         | 必填 | 说明                                                       |
| ------------------- | ------------ | ---- | ---------------------------------------------------------- |
| `id`                | Int (PK)     | ✅   | 自增主键                                                   |
| `employeeNo`        | String       | ✅   | 员工编号（系统自动生成或手工录入），UNIQUE                 |
| `passwordHash`      | String       | ✅   | bcrypt 哈希（默认密码为完整手机号）                        |
| `name`              | String       | ✅   | 姓名                                                       |
| `phone`             | String       | ✅   | 手机号（登录账号），UNIQUE                                 |
| `nickname`          | String       |      | 昵称                                                       |
| `gender`            | String       |      | 性别（`MALE` / `FEMALE`）                                  |
| `idCard`            | String       |      | 身份证号                                                   |
| `position`          | String       |      | 岗位（`CLEANER` 保洁员 / `RECYCLER` 回收员）               |
| `skillType`         | String       | ✅   | 技能单选（`CLEANING` 保洁 / `RECYCLING` 收废品）           |
| `emergencyContact`  | String       |      | 紧急联系人姓名                                             |
| `emergencyPhone`    | String       |      | 紧急联系人电话                                             |
| `avatar`            | String       |      | 头像 URL                                                   |
| `status`            | WorkerStatus | ✅   | IDLE / BUSY，默认 IDLE                                     |
| `rating`            | Float        |      | 综合评分（评价提交时更新），默认 5.0                       |
| `totalOrders`       | Int          |      | 累计服务单数（订单完成时 +1），默认 0                      |
| `healthCertUrl`     | String       |      | 健康证图片 URL                                             |
| `healthCertExpiry`  | DateTime     |      | 健康证有效期                                               |
| `skillCertUrl`      | String       |      | 技能证书图片 URL                                           |
| `skillCertExpiry`   | DateTime     |      | 技能证书有效期                                             |
| `createdAt`         | DateTime     | ✅   |                                                            |
| `updatedAt`         | DateTime     | ✅   |                                                            |

**关系**：hasMany CleaningOrder, hasMany RecyclingOrder

> `rating` 和 `totalOrders` 是冗余缓存字段——在员工列表/派单页高频展示，避免每次跨表 JOIN。

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

### 4.1 Address — 服务地址簿

> **v2.0 变更（§3.0.3 / §6.6）**：「收货地址」统一改为「服务地址」；原 `name`（地址标签）和 `phone`（联系电话）字段重命名，新增 `contactName`（联系人姓名）和 `buildingInfo`（门牌号）。

| 字段           | 类型     | 必填 | 说明                                          |
| -------------- | -------- | ---- | --------------------------------------------- |
| `id`           | Int (PK) | ✅   | 自增主键                                      |
| `residentId`   | Int (FK) | ✅   | 关联 Resident                                 |
| `contactName`  | String   | ✅   | 联系人姓名（v2.0 新增）                       |
| `contactPhone` | String   | ✅   | 联系人手机号                                  |
| `province`     | String   | ✅   | 省（默认「北京市」，灰色禁用）                |
| `city`         | String   | ✅   | 市（默认「北京市」，灰色禁用）                |
| `district`     | String   | ✅   | 区/县（默认「朝阳区」，灰色禁用）             |
| `detail`       | String   | ✅   | 详细地址                                      |
| `buildingInfo` | String   |      | 门牌号（v2.0 新增）                           |
| `addressTag`   | String   |      | 地址标签（如「家」「父母家」）                |
| `lat`          | Float    |      | 纬度（可选，为路线规划/GPS 距离校验预留）     |
| `lng`          | Float    |      | 经度（可选）                                  |
| `isDefault`    | Boolean  | ✅   | 默认地址，默认 false                          |
| `createdAt`    | DateTime | ✅   |                                               |
| `updatedAt`    | DateTime | ✅   |                                               |

---

## 5. 订单模型

> 三表共享的通用字段注释如下，不再逐表重复说明：
>
> - `orderNo`：前缀 CLN / RCY / CNS + yyyyMMdd + 4 位序号，UNIQUE
> - `source`：订单来源（小程序/电话预约），代下单时 `isProxyOrder = true`（v2.0 删除 PROXY 枚举值）
> - `addressSnapshot`：下单时冗余完整地址 JSON，确保历史订单不受地址变更影响
> - `referenceAmount`：参考价（**v2.0 封存**，前后台均不展示）；`finalAmount`：核定金额（**v2.0 封存**）
> - `serviceContactName` / `serviceContactPhone`：被服务人信息（代下单时填写，v2.0 由 `proxyName/proxyPhone` 重命名）

### 5.1 CleaningOrder — 保洁订单

> **v2.0 变更（§6.1）**：`proxyName/proxyPhone` 重命名为 `serviceContactName/serviceContactPhone`；`referenceAmount`、`finalAmount`、`paymentStatus`、`paidAt` 标注封存（数据库保留，API 层不暴露）。

| 字段                   | 类型          | 必填 | 说明                                             |
| ---------------------- | ------------- | ---- | ------------------------------------------------ |
| `id`                   | Int (PK)      | ✅   | 自增主键                                         |
| `orderNo`              | String        | ✅   | `CLN{yyyyMMdd}{序号}`，UNIQUE                    |
| `residentId`           | Int (FK)      | ✅   | 下单居民                                         |
| `workerId`             | Int (FK)      |      | 被分配服务人员（派单后填充）                     |
| `serviceItem`          | String        | ✅   | 服务项（关联 ServiceCatalog，动态拉取）          |
| `serviceDuration`      | Int           | ✅   | 服务时长（小时），默认 2                         |
| `appointDate`          | DateTime      | ✅   | 预约日期                                         |
| `appointTimeSlot`      | String        | ✅   | 时段，如 `"14:00-16:00"`                         |
| `addressSnapshot`      | Json          | ✅   | 下单时地址快照                                   |
| `contactName`          | String        | ✅   | 联系人（下单人）                                 |
| `contactPhone`         | String        | ✅   | 联系电话（下单人）                               |
| `remark`               | String        |      | 备注                                             |
| `source`               | OrderSource   | ✅   | 订单来源（MINIPROGRAM / PHONE）                  |
| `isProxyOrder`         | Boolean       | ✅   | 是否代下单，默认 false                           |
| `serviceContactName`   | String        |      | 被服务人姓名（代下单，v2.0 重命名自 proxyName）  |
| `serviceContactPhone`  | String        |      | 被服务人手机号（代下单，v2.0 重命名自 proxyPhone）|
| `status`               | OrderStatus   | ✅   | 订单状态，默认 PENDING_ASSIGN                    |
| `referenceAmount`      | Decimal       |      | 参考价（⚠️ v2.0 封存，不对外展示）               |
| `finalAmount`          | Decimal       |      | 核定金额（⚠️ v2.0 封存，不对外展示）             |
| `paymentStatus`        | PaymentStatus | ✅   | UNPAID / PAID（⚠️ v2.0 封存，收款线下完成）      |
| `paidAt`               | DateTime      |      | 收款确认时间（⚠️ v2.0 封存）                     |
| `paidBy`               | String        |      | 收款确认操作人（⚠️ v2.0 封存）                   |
| `gpsLat`               | Float         |      | GPS 纬度                                         |
| `gpsLng`               | Float         |      | GPS 经度                                         |
| `gpsCheckinAt`         | DateTime      |      | GPS 签到时间                                     |
| `gpsDistance`          | Float         |      | 超距距离（米）                                   |
| `gpsRemark`            | String        |      | 超距说明                                         |
| `createdAt`            | DateTime      | ✅   |                                                  |
| `updatedAt`            | DateTime      | ✅   |                                                  |

**关系**：belongsTo Resident, belongsTo Worker?, hasMany WorkPhoto, hasOne Review?, hasMany Complaint

### 5.2 RecyclingOrder — 废品订单

> **v2.0 变更（§6.1）**：同 CleaningOrder，`proxyName/proxyPhone` → `serviceContactName/serviceContactPhone`；`actualWeight`、`referenceAmount`、`finalAmount`、`paymentStatus`、`paidAt` 标注封存（三端均不展示，仅数据库保留，#53/#62/#76）。

| 字段                  | 类型          | 必填 | 说明                                              |
| --------------------- | ------------- | ---- | ------------------------------------------------- |
| `id`                  | Int (PK)      | ✅   | 自增主键                                          |
| `orderNo`             | String        | ✅   | `RCY{yyyyMMdd}{序号}`，UNIQUE                     |
| `residentId`          | Int (FK)      | ✅   | 下单居民                                          |
| `workerId`            | Int (FK)      |      | 被分配服务人员                                    |
| `itemType`            | String        | ✅   | `LARGE`（大件类）/ `SMALL`（小件类）              |
| `estimatedWeight`     | Float         | ✅   | 预估重量（kg），默认 5                            |
| `actualWeight`        | Float         |      | 实际上门重量（⚠️ v2.0 封存，称重字段不展示）      |
| `appointDate`         | DateTime      | ✅   |                                                   |
| `appointTimeSlot`     | String        | ✅   |                                                   |
| `addressSnapshot`     | Json          | ✅   |                                                   |
| `contactName`         | String        | ✅   |                                                   |
| `contactPhone`        | String        | ✅   |                                                   |
| `remark`              | String        |      |                                                   |
| `source`              | OrderSource   | ✅   |                                                   |
| `isProxyOrder`        | Boolean       | ✅   | 默认 false                                        |
| `serviceContactName`  | String        |      | 被服务人姓名（代下单，v2.0 重命名自 proxyName）   |
| `serviceContactPhone` | String        |      | 被服务人手机号（代下单，v2.0 重命名自 proxyPhone）|
| `status`              | OrderStatus   | ✅   | 默认 PENDING_ASSIGN                               |
| `referenceAmount`     | Decimal       |      | ⚠️ v2.0 封存                                      |
| `finalAmount`         | Decimal       |      | ⚠️ v2.0 封存                                      |
| `paymentStatus`       | PaymentStatus | ✅   | ⚠️ v2.0 封存，默认 UNPAID                         |
| `paidAt`              | DateTime      |      | ⚠️ v2.0 封存                                      |
| `paidBy`              | String        |      | 收款确认操作人（⚠️ v2.0 封存）                    |
| `gpsLat`              | Float         |      |                                                   |
| `gpsLng`              | Float         |      |                                                   |
| `gpsCheckinAt`        | DateTime      |      |                                                   |
| `gpsDistance`         | Float         |      |                                                   |
| `gpsRemark`           | String        |      |                                                   |
| `createdAt`           | DateTime      | ✅   |                                                   |
| `updatedAt`           | DateTime      | ✅   |                                                   |

**关系**：同 CleaningOrder

### 5.3 ConsultOrder — 家政咨询单

> 不走派单/员工端/GPS/拍照/收款流程，独立状态机。  
> **v2.0 变更（§5.1.3 / §6.9）**：新增代下单字段、服务地址、订单来源、备注；状态默认值改为 `FOLLOW_UP`；跟进记录改用独立 `ConsultFollowUp` 子表（见 §7.4）。

| 字段                  | 类型          | 必填 | 说明                                         |
| --------------------- | ------------- | ---- | -------------------------------------------- |
| `id`                  | Int (PK)      | ✅   | 自增主键                                     |
| `orderNo`             | String        | ✅   | `CNS{yyyyMMdd}{序号}`，UNIQUE                |
| `residentId`          | Int (FK)      |      | 提交居民（可空，联系信息以下方字段为准）     |
| `serviceType`         | String        | ✅   | 保姆 / 月嫂 / 育儿嫂 / 陪诊 / 代买菜        |
| `contactName`         | String        | ✅   | 联系人姓名（下单人）                         |
| `contactPhone`        | String        | ✅   | 联系电话（下单人）                           |
| `requirementDesc`     | String        | ✅   | 核心诉求（多行文本）                         |
| `isProxyOrder`        | Boolean       | ✅   | 是否代下单，默认 false（v2.0 新增，#32）     |
| `serviceContactName`  | String        |      | 被服务人姓名（代下单时填写）                 |
| `serviceContactPhone` | String        |      | 被服务人手机号（代下单时填写）               |
| `serviceAddress`      | String        |      | 服务地址（运营电话回访后录入）               |
| `source`              | OrderSource   |      | 订单来源（MINIPROGRAM / PHONE）              |
| `remark`              | String        |      | 备注                                         |
| `status`              | ConsultStatus | ✅   | 默认 FOLLOW_UP（v2.0 重命名）                |
| `createdAt`           | DateTime      | ✅   |                                              |
| `updatedAt`           | DateTime      | ✅   |                                              |

**关系**：belongsTo Resident?, hasMany ConsultFollowUp, hasMany Complaint

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

> **v2.0 变更（§5.1.4 / §6.8）**：新增投诉单编号、投诉用户关联、冗余的关联订单编号/服务类型/服务地址（便于管理后台「关联订单」列展示，避免跨表 JOIN）。投诉触发条件：订单状态为 `ACCEPTED` 及之后（#65）。

| 字段               | 类型            | 必填 | 说明                                        |
| ------------------ | --------------- | ---- | ------------------------------------------- |
| `id`               | Int (PK)        | ✅   | 自增主键                                    |
| `complaintNo`      | String          | ✅   | 投诉单编号（如 CPL20260409001），UNIQUE      |
| `cleaningOrderId`  | Int (FK)        |      | 关联保洁订单                                |
| `recyclingOrderId` | Int (FK)        |      | 关联废品订单                                |
| `consultOrderId`   | Int (FK)        |      | 关联家政咨询单                              |
| `orderType`        | String          | ✅   | `"CLEANING"` / `"RECYCLING"` / `"CONSULT"` |
| `orderNo`          | String          |      | 被投诉原服务单编号（冗余，便于列表展示）    |
| `residentId`       | Int (FK)        |      | 投诉用户（关联 Resident）                   |
| `serviceType`      | String          |      | 服务类型（冗余，便于列表展示）              |
| `serviceAddress`   | String          |      | 服务地址（冗余，便于列表展示）              |
| `reason`           | ComplaintReason | ✅   | 投诉原因枚举                                |
| `description`      | String          | ✅   | 问题描述                                    |
| `evidenceImages`   | Json            |      | 证据图片 URL 数组（支持多张）               |
| `status`           | ComplaintStatus | ✅   | 默认 PENDING                                |
| `createdAt`        | DateTime        | ✅   |                                             |
| `updatedAt`        | DateTime        | ✅   |                                             |

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

> 证书字段已内聚至 Worker 模型（§3.2），不再独立建表。v2.0 新增 Banner（轮播图）和 Operator（运营人员）配置表。

### 7.1 ServiceCatalog — 服务配置

> **v2.0 变更（§5.4.1 / §6.3）**：删除价格字段（`priceMin/priceMax/priceUnit`，价格线下处理，不在系统内体现）；删除 `description`（说明文案，#42）；新增 `subtitle`（副标题）、`icon`（卡片图标）；`isActive` 重命名为 `isEnabled`（与需求文档统一，且保留，支持管理后台启用/停用操作，#86）；`specialTips`（特殊提示文案）**封存保留**：数据库字段不删除，管理后台不展示（§6.3）。

| 字段           | 类型     | 必填 | 说明                                       |
| -------------- | -------- | ---- | ------------------------------------------ |
| `id`           | Int (PK) | ✅   | 自增主键                                   |
| `bizType`      | String   | ✅   | `"CLEANING"` / `"RECYCLING"` / `"CONSULT"` |
| `name`         | String   | ✅   | 服务名称（日常清扫、大件类、保姆等）       |
| `subtitle`     | String   |      | 副标题文案（v2.0 新增）                    |
| `icon`         | String   |      | 卡片图标 URL（v2.0 新增）                  |
| `sortOrder`    | Int      | ✅   | 排序，默认 0，越小越靠前                   |
| `isEnabled`    | Boolean  | ✅   | 是否启用，默认 true（v2.0 重命名 isActive）|
| `specialTips`  | String   |      | 特殊提示文案（⚠️ v2.0 封存，数据库保留，管理后台不显示）|
| `createdAt`    | DateTime | ✅   |                                            |
| `updatedAt`    | DateTime | ✅   |                                            |

### 7.2 Banner — 轮播图（v2.0 新增，§5.4.5 / §6.4）

| 字段            | 类型     | 必填 | 说明                                         |
| --------------- | -------- | ---- | -------------------------------------------- |
| `id`            | Int (PK) | ✅   | 自增主键                                     |
| `imageUrl`      | String   | ✅   | 轮播图 URL（建议尺寸 750×350）               |
| `title`         | String   |      | 标题/ALT 文案（图片加载失败时展示）          |
| `displayTarget` | String   | ✅   | 展示端：`RESIDENT`（居民端）/ `WORKER`（员工端）/ `ALL`（全部）|
| `linkType`      | String   | ✅   | 跳转类型：`NONE` / `SERVICE` / `CUSTOM`      |
| `linkTarget`    | String   |      | 跳转路径（服务 id 或自定义 URL）             |
| `startTime`     | DateTime | ✅   | 生效起始时间                                 |
| `endTime`       | DateTime | ✅   | 生效结束时间                                 |
| `sortOrder`     | Int      | ✅   | 排序，默认 0，越小越靠前                     |
| `isEnabled`     | Boolean  | ✅   | 是否启用，默认 true                          |
| `createdAt`     | DateTime | ✅   |                                              |
| `updatedAt`     | DateTime | ✅   | 同时作为「最后修改时间」展示在列表           |

### 7.3 Operator — 运营人员（v2.0 新增，§5.4.3 / §6.5）

> 运营人员**不使用管理后台登录**，仅作为联系信息配置，展示在居民端首页客服区及家政咨询单卡片（取用途为「接单」的第一条记录）。停用即删除，无需状态字段。

| 字段        | 类型     | 必填 | 说明                           |
| ----------- | -------- | ---- | ------------------------------ |
| `id`        | Int (PK) | ✅   | 自增主键                       |
| `name`      | String   | ✅   | 运营人员姓名                   |
| `phone`     | String   | ✅   | 手机号（展示在居民端，不脱敏） |
| `purpose`   | String   | ✅   | 用途，目前仅「接单」           |
| `createdAt` | DateTime | ✅   |                                |
| `updatedAt` | DateTime | ✅   |                                |

### 7.4 ConsultFollowUp — 家政咨询跟进记录（v2.0 新增）

> 与 `ComplaintFollowUp` 设计一致，独立子表便于分页查询和时序展示。

| 字段           | 类型     | 必填 | 说明                     |
| -------------- | -------- | ---- | ------------------------ |
| `id`           | Int (PK) | ✅   | 自增主键                 |
| `consultId`    | Int (FK) | ✅   | 关联 ConsultOrder        |
| `handlerName`  | String   | ✅   | 处理人（运营人员姓名）   |
| `content`      | String   | ✅   | 沟通摘要/处理记录        |
| `createdAt`    | DateTime | ✅   |                          |

---

## 8. 订单状态流转规则

### 8.1 CleaningOrder 状态流转

```
居民下单 ──→ PENDING_ASSIGN
                │
     [后台分配服务人员]
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
     [员工上传作业照片，点击"完成服务"（v2.0确认，#92）]
                ↓
          PENDING_REVIEW
                │
     [居民提交评价（7天内有效，超时保持待评价，#66）]
                ↓
             REVIEWED

仅 PENDING_ASSIGN ──→ CANCELLED（居民取消，v2.0收紧，#69）

收款：线下完成，paymentStatus 字段封存不对外暴露（v2.0 #75）
```

### 8.2 RecyclingOrder 状态流转

> **v2.0 变更**：删除 `PENDING_ACCEPTANCE`（待验收）状态，废品验收在「服务中」阶段完成。

```
居民下单 ──→ PENDING_ASSIGN ──→ ASSIGNED ──→ ACCEPTED
                │
          仅此处可取消
                ↓ CANCELLED

ACCEPTED ──→ IN_SERVICE（员工开始服务 + GPS签到）
                │
     [员工上传现场/回收照片]
     [居民点击"验收服务"，验收不通过运营线下处理]
                ↓
          PENDING_REVIEW ──→ REVIEWED
```

### 8.3 ConsultOrder 状态流转

```
提交需求 ──→ FOLLOW_UP（待跟进）
                │
     [运营接单，15分钟内电话回访]
                ↓
           FOLLOWING（跟进中）
                │
     [匹配到合适服务人员，完成服务对接]
                ↓
            COMPLETED（终态）
```

---

## 9. 索引建议

| 表               | 索引                       | 类型     | 说明                           |
| ---------------- | -------------------------- | -------- | ------------------------------ |
| Resident         | `openid`                   | UNIQUE   | 微信登录查询                   |
| Worker           | `employeeNo`               | UNIQUE   | 员工编号唯一                   |
| Worker           | `phone`                    | UNIQUE   | 手机号登录查询                 |
| Worker           | `status, skillType`        | COMPOUND | 派单时查空闲员工（按技能筛选） |
| Admin            | `email`                    | UNIQUE   | 登录                           |
| Address          | `residentId, isDefault`    | COMPOUND | 查居民默认地址                 |
| CleaningOrder    | `orderNo`                  | UNIQUE   | 业务编号查询                   |
| CleaningOrder    | `residentId, status`       | COMPOUND | 居民端订单列表                 |
| CleaningOrder    | `workerId, status`         | COMPOUND | 员工端任务列表                 |
| CleaningOrder    | `status, appointDate`      | COMPOUND | 管理后台筛选                   |
| CleaningOrder    | `appointDate`              | INDEX    | 看板按日聚合                   |
| RecyclingOrder   | 同上（按对应字段）         | —        | 同上                           |
| ConsultOrder     | `status`                   | INDEX    | 管理后台筛选                   |
| WorkPhoto        | `cleaningOrderId`          | INDEX    | 查订单照片                     |
| WorkPhoto        | `recyclingOrderId`         | INDEX    | 查订单照片                     |
| Review           | `cleaningOrderId`          | UNIQUE   | 一单一评                       |
| Review           | `recyclingOrderId`         | UNIQUE   | 一单一评                       |
| Complaint        | `complaintNo`              | UNIQUE   | 投诉单编号查询                 |
| Complaint        | `status`                   | INDEX    | 管理后台筛选                   |
| ConsultFollowUp  | `consultId`                | INDEX    | 查咨询单跟进记录               |
| ServiceCatalog   | `bizType, isEnabled`       | COMPOUND | 小程序展示服务项               |
| Banner           | `isEnabled, startTime`     | COMPOUND | 查有效轮播图                   |
| Operator         | `purpose`                  | INDEX    | 按用途查运营人员               |

---

## 10. 种子数据

### 10.1 Admin

```sql
INSERT INTO admins (email, password_hash, name) VALUES
('admin@dayunyunjie.com', '<bcrypt>', '管理员');
```

### 10.2 ServiceCatalog

> **v2.0 变更**：移除价格字段，种子数据仅包含服务名称、副标题和排序。价格由运营线下管理，不在系统内体现。

```sql
INSERT INTO service_catalogs (biz_type, name, subtitle, sort_order, is_enabled) VALUES
-- 保洁
('CLEANING', '日常清扫', '地面、桌面、卫生间基础清洁', 1, true),
('CLEANING', '深度清扫', '厨房油烟、卫生间水垢深度去除', 2, true),
('CLEANING', '专项清洁', '搬家清洁、开荒保洁', 3, true),
-- 废品回收
('RECYCLING', '大件类', '大家电、家具', 1, true),
('RECYCLING', '小件类', '书籍纸箱、塑料瓶、废金属、小家电', 2, true),
-- 家政咨询
('CONSULT', '保姆', '日常家务、做饭、打扫卫生', 1, true),
('CONSULT', '月嫂', '产妇护理与新生儿照护', 2, true),
('CONSULT', '育儿嫂', '科学喂养、早教与宝宝日常照料', 3, true),
('CONSULT', '陪诊', '陪同挂号、取药、检查、就诊', 4, true),
('CONSULT', '代买菜', '按需求代买生鲜蔬菜送到家', 5, true);
```

### 10.3 Operator（运营人员示例，上线前后台录入）

```sql
-- 至少需要一条用途为「接单」的运营人员记录
-- 居民端首页客服电话取该记录，无兜底逻辑，运营必须维护
INSERT INTO operators (name, phone, purpose) VALUES
('运营客服', '13800138000', '接单');
```

---

## 11. addressSnapshot JSON 结构

订单中 `addressSnapshot` 字段的结构，下单时从 Address 表冗余写入（确保历史订单不受地址变更影响）：

> **v2.0 变更**：字段 `name`（原标签）和 `phone`（原联系电话）更新为 `contactName`、`contactPhone`，新增 `buildingInfo`。

```json
{
  "contactName": "张女士",
  "contactPhone": "13800138000",
  "province": "北京市",
  "city": "北京市",
  "district": "朝阳区",
  "detail": "弘善家园3号楼1单元101",
  "buildingInfo": "1单元101室",
  "addressTag": "家"
}
```

---

_本文档 v2.0，基于需求文档 v2.0（`requirement_v2.0.md`）全面更新：枚举重构、Worker 扩展、Address 重构、订单字段重命名封存、ConsultOrder 补全、Complaint 补全、ServiceCatalog 去价格新增副标题图标、新增 Banner / Operator / ConsultFollowUp 三张表；将作为 `prisma/schema.prisma` 的直接输入。_
