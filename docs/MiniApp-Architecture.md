# MiniApp-Architecture.md — 小程序架构交接文档

> **生成节点**：P3.8 代下单集成验证完成后（2026-06-21）；P4.1（2026-06-21）补充员工端登录认证；**P4.2（2026-06-21）** 补充员工端首页待接单任务列表  
> **用途**：供 P4（员工端）、P5（管理后台）及后续维护对接，记录居民端已完成的页面结构、Store 设计、组件、API 封装与代下单数据流；并记录员工端 P4.1 登录认证实现  
> **应用目录**：`apps/miniapp-customer/`（居民端）、`apps/miniapp-worker/`（员工端）

---

## 目录

1. [技术栈](#1-技术栈)
2. [目录结构](#2-目录结构)
3. [页面路由总表](#3-页面路由总表)
4. [Pinia Store 设计](#4-pinia-store-设计)
5. [核心组件](#5-核心组件)
6. [Composable 工具](#6-composable-工具)
7. [API 封装层](#7-api-封装层)
8. [代下单数据流](#8-代下单数据流)
9. [双端 API 配置](#9-双端-api-配置)
10. [关键业务规则](#10-关键业务规则)
11. [员工端 P4.1 登录认证（miniapp-worker）](#11-员工端-p41-登录认证miniapp-worker)
12. [员工端 P4.2 首页待接单列表（miniapp-worker）](#12-员工端-p42-首页待接单列表miniapp-worker)

---

## 1. 技术栈

| 项目 | 技术 |
|------|------|
| 框架 | uni-app + Vue 3 Composition API |
| 构建 | Vite |
| 状态管理 | Pinia（持久化到 `uni.setStorageSync`） |
| UI 样式 | 原生 CSS / rpx 适老化设计 |
| 共享类型 | `@dayangyunjie/shared`（packages/shared） |
| 编译目标 | H5（开发预览）+ mp-weixin（微信小程序） |

---

## 2. 目录结构

```
apps/miniapp-customer/
├── src/
│   ├── App.vue                  # 应用入口：隐私协议弹窗 + 微信登录 + 路由守卫初始化
│   ├── pages/
│   │   ├── index/               # 首页（tabBar）
│   │   ├── orders/              # 我的订单列表（tabBar）
│   │   ├── mine/                # 我的（tabBar）
│   │   ├── service-detail/      # 服务详情页（三类入口）
│   │   ├── booking-cleaning/    # 保洁预约三步向导
│   │   ├── booking-recycling/   # 废品回收预约三步向导
│   │   ├── booking-consult/     # 家政咨询两步向导
│   │   ├── address-select/      # 服务地址选择页
│   │   ├── address-manage/      # 服务地址管理页（CRUD + 设默认）
│   │   ├── order-detail/        # 订单详情页（三类通用模板）
│   │   ├── review/              # 评价提交页
│   │   ├── complaint/           # 投诉提交页
│   │   ├── complaint-list/      # 我的投诉列表页
│   │   └── complaint-detail/    # 投诉详情/进度页
│   ├── store/
│   │   ├── auth.ts              # 认证状态（持久化）
│   │   ├── booking-cleaning.ts  # 保洁向导状态
│   │   ├── booking-recycling.ts # 废品向导状态
│   │   └── booking-consult.ts   # 家政咨询向导状态
│   ├── components/
│   │   ├── PrivacyModal.vue     # 隐私协议弹窗（首次必弹）
│   │   ├── ProfileCompleteModal.vue  # 身份补全弹窗（首次下单前）
│   │   └── OrderStatusTimeline.vue   # 订单状态时间轴
│   ├── composables/
│   │   └── useRouteGuard.ts    # 路由守卫（未登录拦截）
│   ├── api/
│   │   ├── request.ts          # uni.request 封装（token 注入 + 401 自动刷新）
│   │   ├── auth.ts             # 认证接口
│   │   ├── address.ts          # 地址 CRUD
│   │   ├── banner.ts           # 轮播图查询
│   │   ├── cleaning-order.ts   # 保洁订单 CRUD + 操作
│   │   ├── recycling-order.ts  # 废品订单 CRUD + 操作
│   │   ├── consult-order.ts    # 咨询单 CRUD
│   │   ├── complaint.ts        # 投诉 CRUD
│   │   ├── operator.ts         # 运营人员（客服电话）
│   │   ├── review.ts           # 评价提交/查询
│   │   ├── service-catalog.ts  # 服务目录查询
│   │   └── upload.ts           # 图片上传
│   └── utils/
│       └── lunar.ts            # 公历→农历转换（日历组件辅助）
├── pages.json                  # 路由配置（14 个页面）
├── vite.config.ts              # Vite 配置 + H5 代理
├── .env.development            # 开发环境变量
└── .env.production             # 生产环境变量
```

---

## 3. 页面路由总表

| 路径 | 页面名称 | tabBar | 鉴权 | 备注 |
|------|---------|--------|------|------|
| `pages/index/index` | 首页 | ✅ | 否 | Banner + 服务入口 + 客服 |
| `pages/orders/index` | 我的订单 | ✅ | ✅ | 三 Tab：保洁/废品/家政 |
| `pages/mine/index` | 我的 | ✅ | ✅ | 手机号 + 地址 + 投诉入口 |
| `pages/service-detail/index` | 服务详情 | 否 | 否 | Query: `type=cleaning\|recycling\|consult` |
| `pages/booking-cleaning/index` | 保洁预约 | 否 | ✅ | 三步向导（含代下单） |
| `pages/booking-recycling/index` | 废品预约 | 否 | ✅ | 三步向导（含代下单） |
| `pages/booking-consult/index` | 家政咨询 | 否 | ✅ | 两步向导（含代下单） |
| `pages/address-select/index` | 地址选择 | 否 | ✅ | Query: `from=cleaning\|recycling` |
| `pages/address-manage/index` | 地址管理 | 否 | ✅ | CRUD + 设默认；省市区锁定北京/朝阳 |
| `pages/order-detail/index` | 订单详情 | 否 | ✅ | Query: `id=&type=cleaning\|recycling\|consult` |
| `pages/review/index` | 评价提交 | 否 | ✅ | Query: `orderId=&orderType=&orderNo=` |
| `pages/complaint/index` | 投诉提交 | 否 | ✅ | Query: `orderId=&orderType=&orderNo=` |
| `pages/complaint-list/index` | 我的投诉 | 否 | ✅ | 状态 Tab 筛选 |
| `pages/complaint-detail/index` | 投诉详情 | 否 | ✅ | Query: `id=` |

---

## 4. Pinia Store 设计

### 4.1 `useAuthStore`（`store/auth.ts`）

持久化到 `uni.setStorageSync`（key: `__auth__`），App 启动时自动恢复。

| 状态 | 类型 | 说明 |
|------|------|------|
| `accessToken` | `string\|null` | JWT access token（2h 有效） |
| `refreshToken` | `string\|null` | JWT refresh token（7d 有效） |
| `resident` | `ResidentInfo\|null` | `{id, openid, nickname, avatar, phone}` |
| `hasPhone` | `boolean` | 是否已授权/填写手机号 |
| `hasAgreedPrivacy` | `boolean` | 是否已同意隐私协议 |
| `isLoggedIn` | `computed boolean` | `accessToken && resident` 双非空 |

**Actions**：`wechatLogin(code)` / `setPhone(phone)` / `setPrivacyAgreed()` / `logout()`

---

### 4.2 `useBookingCleaningStore`（`store/booking-cleaning.ts`）

三步向导状态，进入预约页调用 `reset()` 清空。

| 状态 | 类型 | 步骤 | 说明 |
|------|------|------|------|
| `step` | `1\|2\|3` | — | 当前向导步骤 |
| `selectedCatalog` | `ServiceCatalogDto\|null` | Step 1 | 选中的保洁服务类型 |
| `duration` | `number` | Step 1 | 服务时长（1–8h，默认 2h） |
| `selectedDate` | `string` | Step 2 | 预约日期 YYYY-MM-DD |
| `selectedTime` | `string` | Step 2 | 预约时段（如 "09:00"） |
| `selectedAddress` | `AddressDto\|null` | Step 2 | 选中的服务地址 |
| `isProxy` | `boolean` | Step 2 | 是否为代家人下单 |
| `serviceContactName` | `string` | Step 3 | 被服务人姓名（代下单时必填） |
| `serviceContactPhone` | `string` | Step 3 | 被服务人手机号（代下单时必填） |
| `remark` | `string` | Step 3 | 备注 |

---

### 4.3 `useBookingRecyclingStore`（`store/booking-recycling.ts`）

结构与保洁向导一致，差异字段：

| 状态 | 类型 | 说明（差异点） |
|------|------|------|
| `selectedCatalog` | `ServiceCatalogDto\|null` | 废品回收类型（大件/小件） |
| `estimatedWeight` | `number` | 预估重量（kg，默认 5，步进 1，上限 50） |

无 `duration` 字段。

---

### 4.4 `useBookingConsultStore`（`store/booking-consult.ts`）

两步向导，无地址字段。

| 状态 | 类型 | 步骤 | 说明 |
|------|------|------|------|
| `step` | `1\|2` | — | 当前步骤（1=类型选择 2=需求填写） |
| `selectedCatalog` | `ServiceCatalogDto\|null` | Step 1 | 选中的家政服务类型 |
| `isProxy` | `boolean` | Step 2 | 是否为家人代下单 |
| `serviceContactName` | `string` | Step 2 | 被服务人姓名 |
| `serviceContactPhone` | `string` | Step 2 | 被服务人手机号 |
| `contactName` | `string` | Step 2 | 联系人姓名 |
| `contactPhone` | `string` | Step 2 | 联系人手机号 |
| `requirementDesc` | `string` | Step 2 | 需求描述 |
| `remark` | `string` | Step 2 | 备注 |

---

## 5. 核心组件

### 5.1 `PrivacyModal.vue`

- **触发时机**：`App.vue` `onLaunch` 检查 `authStore.hasAgreedPrivacy`，首次使用必弹
- **功能**：展示隐私政策全文；点击「同意」→ `authStore.setPrivacyAgreed()` → 继续微信登录流程
- **「我的」页提供入口可再次查看**

### 5.2 `ProfileCompleteModal.vue`

- **触发时机**：首次下单前检查 `authStore.hasPhone`，手机号未填时弹出
- **两种填写方式**：
  1. 微信快速授权（`<button open-type="getPhoneNumber">`）获取手机号
  2. 手动输入姓名 + 手机号
- **提交后**：调 `PUT /residents/:id` 更新居民信息，调 `authStore.setPhone(phone)` 持久化

### 5.3 `OrderStatusTimeline.vue`

- **用途**：订单详情页的服务进度时间轴
- **Props**：`status: string`（当前状态值），`order-type: 'CLEANING' | 'RECYCLING' | 'CONSULT'`
- **状态节点映射**：

| orderType | 节点序列 |
|-----------|---------|
| `CLEANING` / `RECYCLING` | 已预约 → 已派单 → 已接单 → 服务中 → 待评价 → **已评价** |
| `CONSULT` | 待跟进 → 跟进中 → 已完成 |

- **当前节点**高亮显示，已过节点标记完成

---

## 6. Composable 工具

### `useRouteGuard`（`composables/useRouteGuard.ts`）

在 `App.vue` `onLaunch` 中注册，监听页面跳转。

- 鉴权页面（订单/我的/预约/详情）：未登录时重定向到首页并弹出登录提示
- 首页不拦截（Banner 等内容无需登录）

---

## 7. API 封装层

### 7.1 `request.ts` — HTTP 基础层

基于 `uni.request` 封装，提供：
- 统一 `Authorization: Bearer <token>` 注入
- 401 自动触发 `POST /auth/refresh` 刷新 token，刷新成功后重试原请求
- 失败后 `authStore.logout()` 并跳转登录

### 7.2 各业务 API 模块

| 文件 | 主要导出函数 | 对应后端路径前缀 |
|------|------------|----------------|
| `auth.ts` | `wechatLogin` / `refreshToken` / `getProfile` | `/auth` |
| `address.ts` | `getAddresses` / `createAddress` / `updateAddress` / `setDefaultAddress` / `deleteAddress` | `/addresses` |
| `banner.ts` | `fetchActiveBanners` | `/banners/active` |
| `cleaning-order.ts` | `createCleaningOrder` / `getCleaningOrders` / `getCleaningOrderDetail` / `cancelCleaningOrder` | `/cleaning-orders` |
| `recycling-order.ts` | `createRecyclingOrder` / `getRecyclingOrders` / `getRecyclingOrderDetail` / `cancelRecyclingOrder` | `/recycling-orders` |
| `consult-order.ts` | `createConsultOrder` / `getConsultOrders` / `getConsultOrderDetail` | `/consult-orders` |
| `review.ts` | `submitReview` / `fetchReviewByOrder` | `/reviews` |
| `complaint.ts` | `submitComplaint` / `getComplaints` / `getComplaintDetail` | `/complaints` |
| `service-catalog.ts` | `fetchServiceCatalogs` / `fetchCleaningCatalogs` / `fetchRecyclingCatalogs` / `fetchConsultCatalogs` | `/service-catalogs` |
| `operator.ts` | `fetchContactOperator` | `/operators/contact` |
| `upload.ts` | `uploadImage` | `/upload/image` |

---

## 8. 代下单数据流

代下单（为家人代操作预约）功能在三类向导中均已实现，数据流完整闭环。

### 8.1 数据流图

```
用户操作：勾选「为家人代下单」
         ↓
Store 字段：
  isProxy = true
  serviceContactName = "张妈妈"
  serviceContactPhone = "138xxxx0000"
         ↓
提交前验证（validateProxy）：
  - serviceContactName 非空
  - serviceContactPhone 符合 /^1\d{10}$/
  - 所有字符串值提交前 .trim() 去除首尾空格
         ↓
API 请求体：
  {
    isProxyOrder: true,
    serviceContactName: "张妈妈",     ← 已 trim
    serviceContactPhone: "138xxxx0000", ← 已 trim
    ...其他订单字段
  }
         ↓
后端写入 DB（cleaning_orders / recycling_orders / consult_orders）：
  is_proxy_order = true
  service_contact_name = "张妈妈"
  service_contact_phone = "138xxxx0000"
         ↓
订单详情 API 返回：
  { isProxyOrder: true, serviceContactName: "张妈妈", serviceContactPhone: "138xxxx0000", ... }
         ↓
order-detail/index.vue 展示（三类通用区块）：
  ┌──────────────────────┐
  │ 代下单               │  ← 橙色标签
  │ 被服务人  张妈妈      │
  │ 联系方式  138xxxx0000 │  ← 完整显示，不脱敏
  └──────────────────────┘
```

### 8.2 三类向导 Toggle UI 差异

| 向导 | UI 控件 | 触发方式 |
|------|---------|---------|
| 保洁（booking-cleaning） | Yes/No 两个单选圆钮 | `@tap="store.isProxy = true/false"` |
| 废品（booking-recycling） | Yes/No 两个单选圆钮 | 同上 |
| 家政（booking-consult） | 自定义 Toggle 开关 | `@tap="store.isProxy = !store.isProxy"` |

### 8.3 代下单字段必填规则

- `isProxyOrder=true` 时，`serviceContactName` 与 `serviceContactPhone` 均为**前端必填**（提交前验证）
- 后端 DTO 亦声明两者联动必填（ConsultOrder DTO 有 `@ValidateIf((o) => o.isProxyOrder)` 约束）
- 未代下单时（`isProxyOrder=false` 或不传），两个字段传 `undefined`，后端写入 `null`

### 8.4 订单列表中的代下单标记

`orders/index.vue` 订单卡片展示「代下单」橙色小标签（仅 `isProxyOrder === true` 时），不展示被服务人详情（点击进入详情页查看完整信息）。

---

## 9. 双端 API 配置

| 环境 | API Base URL | 配置方式 |
|------|-------------|---------|
| H5 开发 | `/api/v1`（相对路径） | `vite.config.ts` 代理 `/api` → `http://127.0.0.1:3000` |
| 小程序开发 | `http://127.0.0.1:3000/api/v1` | `.env.development` `VITE_API_BASE` |
| 小程序生产 | `https://域名/api/v1` | `.env.production` `VITE_API_BASE` |

`request.ts` 运行时判断：
```typescript
// #ifdef H5
baseURL = '/api/v1';
// #ifndef H5
baseURL = import.meta.env.VITE_API_BASE;
// #endif
```

---

## 10. 关键业务规则

### 10.1 登录态生命周期

1. 冷启动：`App.vue onLaunch` → `PrivacyModal`（首次）→ `wx.login()` → `POST /auth/wechat-login`
2. Token 续期：`request.ts` 拦截 401 → `POST /auth/refresh` → 重试
3. 首次下单前：检查 `hasPhone`，弹出 `ProfileCompleteModal` 补全姓名+手机号

### 10.2 订单状态映射（居民端显示名）

| 系统状态 | 居民端显示名 |
|---------|------------|
| `PENDING_ASSIGN` | 待派单 |
| `ASSIGNED` | 已派单 |
| `ACCEPTED` | 已接单 |
| `IN_SERVICE` | 服务中 |
| `PENDING_REVIEW` | 待评价 |
| `REVIEWED` | 已评价 |
| `CANCELLED` | 已取消 |
| `FOLLOW_UP` | 待跟进（家政） |
| `FOLLOWING` | 跟进中（家政） |
| `COMPLETED` | 已完成（家政） |

### 10.3 评价入口规则

- 仅 `status === 'PENDING_REVIEW'` 且订单创建时间在 **7 天内** 显示「去评价」按钮
- 提交评价后订单自动流转至 `REVIEWED`，评价按钮不再显示
- 家政咨询单无评价功能

### 10.4 投诉入口规则

- `ACCEPTED`、`IN_SERVICE`、`PENDING_REVIEW`、`REVIEWED` 状态显示「投诉」入口
- `PENDING_ASSIGN`、`ASSIGNED` 状态**不可投诉**（服务尚未开始）
- 家政咨询单支持投诉（状态 ≥ `FOLLOWING` 时可见）

### 10.5 取消订单规则

- 仅 `PENDING_ASSIGN`（待派单）状态可取消，其他状态无取消按钮（提示联系客服）
- 取消由居民端触发 `POST /cleaning-orders/:id/cancel` 或废品同名接口

### 10.6 地址选择约束

- 省/市/区级联**默认锁定「北京市/朝阳区」**，灰色禁用态（仅详细地址可编辑）
- 地址选择页为空时弹窗引导新增，新增保存后自动回填至预约向导

---

---

## 11. 员工端 P4.1 登录认证（miniapp-worker）

> **验收状态**：✅ 已通过（2026-06-21）  
> **应用目录**：`apps/miniapp-worker/`

### 11.1 目录结构（P4.1 新增）

```
apps/miniapp-worker/
├── src/
│   ├── App.vue                  # 入口：路由守卫 + 未登录跳转登录页
│   ├── api/
│   │   ├── request.ts           # uni.request 封装（storage key: __worker_auth__）
│   │   └── auth.ts              # workerLogin()
│   ├── store/
│   │   └── auth.ts              # Pinia Worker auth store
│   ├── composables/
│   │   └── useRouteGuard.ts     # 路由守卫（仅 login 页公开）
│   └── pages/
│       └── login/index.vue      # 员工登录页
├── vite.config.ts               # H5 proxy /api/v1 → localhost:3000
├── .env.development
└── .env.production
```

### 11.2 页面路由

| 路径 | 说明 | 需登录 |
|------|------|--------|
| `pages/login/index` | 手机号+密码登录，协议勾选，「开始服务」按钮 | 否 |
| `pages/index/index` | 首页（tabBar，P4.2 待接单 ASSIGNED 列表） | 是 |
| `pages/tasks/index` | 任务（tabBar，P1.4 骨架） | 是 |
| `pages/mine/index` | 我的（tabBar，P1.4 骨架） | 是 |

### 11.3 Auth Store 设计

| 字段 | 类型 | 说明 |
|------|------|------|
| `accessToken` | `string \| null` | Worker JWT access token |
| `refreshToken` | `string \| null` | Worker JWT refresh token |
| `worker` | `{ id, phone, name, employeeNo } \| null` | 当前登录员工信息 |
| `isLoggedIn` | `computed boolean` | 是否已登录 |

**持久化**：`uni.setStorageSync('__worker_auth__', JSON.stringify(state))`

### 11.4 API 对接

| 接口 | 封装函数 | 用途 |
|------|---------|------|
| `POST /auth/worker-login` | `workerLogin(phone, password)` | 登录获取 JWT |

### 11.5 双端 API 配置

与居民端一致：
- H5：`request.ts` 使用 `/api/v1`，Vite proxy 转发至 `http://127.0.0.1:3000`
- 小程序：`VITE_API_BASE=http://127.0.0.1:3000/api/v1`（开发）

### 11.6 认证流程

```
App Launch → installRouteGuard()
          → isLoggedIn? 否 → redirectTo /pages/login/index
          → 是 → 正常进入 tabBar 页面

Login Page → 校验协议+手机号+密码
          → POST /auth/worker-login
          → authStore.login(result)
          → switchTab /pages/index/index
```

---

## 12. 员工端 P4.2 首页待接单列表（miniapp-worker）

> **验收状态**：✅ 已通过（2026-06-21）

### 12.1 功能概述

首页**仅**展示当前登录员工被分配的 **ASSIGNED（已派单/待接单）** 任务，无统计卡片、无待反馈列表（符合 v2.0 §4.1）。

### 12.2 关键文件

| 文件 | 说明 |
|------|------|
| `src/api/order.ts` | `fetchAssignedOrders(workerId)` / `acceptOrder(type, id, operatorId)` |
| `src/pages/index/index.vue` | 任务卡片 UI、下拉刷新、接单乐观移除 |
| `src/pages.json` | navigationBar 蓝色品牌色 `#1677ff` |

### 12.3 API 对接

| 接口 | 封装 | 说明 |
|------|------|------|
| `GET /cleaning-orders?workerId=&statuses=ASSIGNED&pageSize=100` | `fetchAssignedOrders` | 与废品单并发 `Promise.all` |
| `GET /recycling-orders?workerId=&statuses=ASSIGNED&pageSize=100` | 同上 | 合并后按预约时间升序 |
| `POST /cleaning-orders/:id/accept` | `acceptOrder('cleaning', ...)` | Body: `{ operatorId: worker.id }` |
| `POST /recycling-orders/:id/accept` | `acceptOrder('recycling', ...)` | 同上 |

### 12.4 数据映射（AssignedOrderItem）

| 卡片字段 | 来源 |
|---------|------|
| `serviceName` | 保洁 `serviceItem` / 废品 `serviceType` |
| `appointDate` | ISO 日期截取前 10 位，`YYYY-MM-DD` → `YYYY.MM.DD` |
| `appointTimeSlot` | 原样展示 |
| `address` | `addressSnapshot`：区 + detail + buildingInfo 拼接 |
| `orderType` | `'cleaning' \| 'recycling'` |

### 12.5 页面生命周期

- `onShow`：每次显示刷新列表（从其他 Tab 返回时更新）
- `onPullDownRefresh`：下拉刷新后 `uni.stopPullDownRefresh()`
- 接单成功：本地 `filter` 移除该卡片，Toast「接单成功」

### 12.6 后端依赖（P4.2 补充）

列表 Query DTO 新增 `workerId`（`QueryCleaningOrderDto` / `QueryRecyclingOrderDto`），`findAll` 按员工 ID 过滤。分页响应字段为 **`items`**（与居民端一致）。

---

> **文档版本**：v1.3（P4.2 员工端首页待接单列表验收通过）  
> **生成日期**：2026-06-21  
> **修订日期**：2026-06-21（v1.3：P4.2 首页 ASSIGNED 列表 + order.ts；v1.2：P4.1 员工端登录；v1.1：P3.8 代下单）  
> **覆盖范围**：P3.1–P3.8 居民端小程序 + P4.1–P4.2 员工端  
> **下一阶段**：P4.3 我的任务列表（双 Tab + 精确状态筛选）

---

## 附录：P3.8 集成验证修复清单（2026-06-21）

| 文件 | 修复内容 |
|------|----------|
| `pages/booking-cleaning/index.vue` | 提交代下单字段前对 `serviceContactName`/`serviceContactPhone` 执行 `.trim()` |
| `pages/booking-recycling/index.vue` | 同上 |
| `pages/order-detail/index.vue` | 「等待分配服务人员」占位仅保洁/废品 `PENDING_ASSIGN` 显示，家政咨询单排除 |
