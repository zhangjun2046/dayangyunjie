# 大洋云洁智享平台 — 技术栈选型文档

> **文档版本**：v1.4
> **编制日期**：2026-06-01
> **修订说明**：v1.4 经技术评审修正 3 处事实错误（SQLite 窗口函数 / wechat-sdk-node 依赖 / 依赖版本号），补充上线必需工程项（API 鉴权 / RBAC / COS 私有桶 / 状态变更日志 / 支付流水表 / 部署运维），重新论证 SCF 水印与 uni-app 选型；v1.3 §7 原型图 AI 代码生成源备注；v1.2 新增 §2.2 管理后台推荐骨架（vue3-element-admin / youlai，非强制约束）；v1.1 新增 §1.4 PocketBase 对照分析；v1.0 为初始技术栈选型结论
>
> **标记说明**：本版改进点以 `【v1.4 修订】`（更正/收紧）与 `【v1.4 新增】`（补充项）标注，便于快速定位；原内容尽量保留。

---

## 1. 决策背景

### 1.1 项目特征

| 维度 | 特征 |
| :--- | :--- |
| 客户端 | 居民端微信小程序 + 员工端微信小程序 + Web 管理后台 |
| 业务复杂度 | 中等：多类型订单状态机（保洁 6 态 / 废品 8 态）、拍照留痕、GPS 签到、验收流程 |
| 微信生态深度 | 微信授权登录、订阅消息、公众号模板消息、腾讯地图、一键拨号 |
| 团队特点 | 不绑定特定语言栈，计划使用 WorkBuddy AI 辅助开发 |
| 云平台 | 腾讯云 |
| 迭代节奏 | 一期 MVP 快速交付，二期扩展支付 / 优惠券 / 会员体系 |

### 1.2 核心约束

1. **AI 辅助开发**：技术栈必须对 AI 代码生成友好（类型安全、语法简洁、样板代码少）
2. **腾讯云原生**：存储、数据库、云函数优先使用腾讯云服务，降低运维成本
3. **二期可扩展**：数据库和架构须预留在线支付、优惠券、会员积分等能力
4. **快速交付**：一期以 MVP 速度优先，避免过度工程化

### 1.3 被评估过的方案

| 方案 | 被拒绝原因 |
| :--- | :--- |
| Spring Boot + MyBatis-Plus | AI 生成代码量大（单接口 7 个文件 + XML），团队无 Java 积累 |
| Go + Gin | 微信 SDK 生态薄弱，ORM 不成熟，AI 训练语料少于 TS |
| Nuxt.js / Next.js | SSR/SSG 能力在管理后台完全用不上，引入不必要复杂度 |
| 腾讯云 CloudBase 云开发 | NoSQL 难以支撑数据看板聚合查询和订单状态机多表关联 |
| **PocketBase（Go + SQLite）** | 详见 §1.4 对照分析 |

### 1.4 PocketBase 对照分析

> 基于外部技术文章评估（PocketBase：一人公司后端开发的神器），对照大洋云洁项目实际需求。
>
> **【v1.4 修订】** 本节原有两处不准确表述已更正：①PocketBase 不止支持 Go hook，自 v0.17 起内置 JS 运行时（goja），支持 JS hooks / JS routes / JS migrations——但该运行时**不是 Node.js，无法复用 npm 生态与官方 Node SDK**，微信能力仍需手写 HTTP 对接；②SQLite 自 3.25.0 起完整支持窗口函数（`ROW_NUMBER()`/`RANK()`），原"不支持窗口函数"的论据不成立。**否决 PocketBase 的真正理由是「生态不匹配 + 业务定制重 + SQLite 单写不适合支付/订单强一致」，而非「语言或能力做不到」。** 下表中"需手写 Go hook"应理解为"需手写 JS/Go hook 且无法用 Node 生态"。

#### 1.4.1 PocketBase 是什么

PocketBase 是一个 Go 编写、内置 SQLite 的开箱即用全栈后端，单个可执行文件运行，自动提供：
- 数据库（CRUD + 数据验证 + 实时订阅）
- 认证系统（邮箱密码 + 15 个 OAuth2 提供商）
- 文件存储（本地或 S3 兼容存储，自动生成缩略图）
- 管理后台（可视化 Web 界面，localhost:8090/_/）
- REST API（自动生成，无需手写）

#### 1.4.2 与大洋云洁需求的匹配度

| 需求章节 | 具体能力 | NestJS（当前方案） | PocketBase |
| :--- | :--- | :--- | :--- |
| §2 订单状态机 | 保洁 6 态 / 废品 8 态流转 + 状态校验 | NestJS Service 实现，AI 直接生成 TS 代码 | ❌ 需在 Go hook（`OnRecordCreate` / `OnRecordsUpdate`）中手写状态流转逻辑，AI 对 Go hook 生成质量低于 TS |
| 微信小程序登录 | `wx.login` → code2session → openid | `axios` + 自封装 WechatModule | ❌ 需从零手写 Go HTTP 调用微信 API，管理 openid 映射 |
| 微信订阅消息 | 订单状态变更自动推送 | axios 调微信 API | ❌ 需在 Go hook 里手写 HTTP 调用微信订阅消息 API |
| GPS 签到 + 超距校验 | Haversine 公式，200m 阈值 | Node 实现，AI 生成 | ❌ 需在 Go hook 里手写经纬度计算和阈值判断 |
| 照片水印 | 上传 → SCF 自动加时间戳+订单号水印 | `cos-nodejs-sdk-v5` + SCF | ⚠️ PocketBase 支持 S3 兼容存储（COS 有 S3 兼容模式），但水印处理需额外 Go 扩展或 SCF 独立部署 |
| 数据看板（§5.1） | 近 7 天订单趋势、服务类型环形图、满意度占比、小时分布柱状图、员工绩效排名 | MySQL 窗口函数 + GROUP BY + ECharts | ⚠️ **【v1.4 修订】** SQLite 自 3.25.0 起支持窗口函数，能力本身不缺；真正短板是**单写串行**在高并发聚合 + 写入混合场景下不如 MySQL 稳，且托管/备份生态弱于 TencentDB |
| 投诉处理流（§5.6） | 系统受理 → 人工处理 → 记录 → 结案 | NestJS Service | ❌ PocketBase 只提供数据 CRUD，处理流程全部要写 Go hook |
| 家政咨询单 SLA（§3.4） | 提交 → 15 分钟 SLA → 运营电话跟进 | NestJS 定时任务 / SCF 触发 | ❌ 需要自己写定时检查逻辑（Go hook 或外部 cron） |
| 管理后台图表（§5.1） | 折线/面积图、环形图、柱状图、绩效表格 | Vue 3 + ECharts（无论如何都要另起项目） | ⚠️ PocketBase 内置管理后台是通用 CRUD 界面，**没有任何图表能力**，管理后台仍需另起 Vue 3 项目 |
| 二期微信支付 | 支付下单 → 回调 → 状态同步 | NestJS + 微信支付 SDK | ❌ 需手写 Go 对接微信支付 V3 API |
| 文件上传（COS） | 照片上传 + S3 兼容 | `cos-nodejs-sdk-v5` | ✅ COS 支持 S3 兼容模式，PocketBase 可对接 |

#### 1.4.3 工作量推演（"居民预约保洁"完整流程）

| 步骤 | NestJS 做法 | PocketBase 做法 |
| :--- | :--- | :--- |
| 1. 微信登录 | `axios` + 自封装 WechatModule | 需要 Go 扩展对接 `code2session`，从零写 HTTP 调用和 token 管理 |
| 2. 创建订单 | 前端调 POST `/api/orders`，Prisma 写入 | 前端直接调 PocketBase REST API ✅ |
| 3. 推送订阅消息 | Node SDK 发模板消息 | Go hook 里写微信 API 调用 |
| 4. 派单给员工 | NestJS Service 修改 status + 通知 | Go hook 里写派单逻辑 + WebSocket 推送 |
| 5. GPS 签到 | 后端 Haversine 校验 | Go hook 里写经纬度计算 + 阈值判断 |
| 6. 照片水印 | COS + SCF，配置即完成 | Go hook 里用图片库加水印，或独立部署水印服务 |
| 7. 员工点「已收款」 | NestJS 更新字段 | Go hook 更新字段（这个倒简单） |

**结论**：步骤 2 和 7 PocketBase 更快，但步骤 1/3/4/5/6 全是额外工作量。而 NestJS 方案下，AI 能在统一语言里写出所有步骤。

#### 1.4.4 对四大核心约束的对照

| 约束 | NestJS（当前方案） | PocketBase | 胜出方 |
| :--- | :--- | :--- | :--- |
| **AI 代码生成友好** | TypeScript，AI 生成质量最高 | Go 扩展必须手写或依赖低质量 AI 生成 | **NestJS** |
| **腾讯云原生** | COS SDK + TencentDB + SCF + 腾讯地图 | 仅 COS（S3 兼容），放弃 TencentDB / SCF | **NestJS** |
| **二期可扩展** | MySQL 强事务 + NestJS 模块化 | SQLite 单写瓶颈 + Go 单体，支付/优惠券需大量 Go 手写 | **NestJS** |
| **快速交付 MVP** | AI 写 TS，全链路同一语言 | CRUD 快 10 倍，但微信/状态机/GPS 反而更慢 | **取决于出发点** |

> 第四项（快速交付）是 PocketBase 唯一可能得分的维度，但前提是**项目恰好是标准 CRUD + 不需要深度微信集成**。大洋云洁不满足这个前提。

#### 1.4.5 PocketBase 适合什么场景

| 场景 | 是否适合 PocketBase |
| :--- | :--- |
| 博客、内容管理系统 | ✅ 非常适合 |
| 简单 SaaS（用户 + 订阅 + 基础 CRUD） | ✅ 非常适合 |
| 原型验证 / MVP（无复杂业务逻辑） | ✅ 非常适合 |
| 微信生态深度集成（小程序登录、订阅消息、支付） | ❌ 不适合 |
| 复杂订单状态机（多状态流转 + 校验） | ❌ 不适合 |
| 数据看板（复杂聚合查询 + 窗口函数） | ❌ 不适合 |
| 需要强事务保障（支付、订单） | ❌ 不适合（SQLite 单写） |

#### 1.4.6 结论

**PocketBase 不适合大洋云洁项目。** **【v1.4 修订】** 准确的否决理由是三条:①其内置 JS 运行时是 goja 而非 Node.js,微信登录/订阅消息/支付等深度集成无法复用 npm 生态与官方 SDK,定制成本高;②SQLite 单写串行不适合支付/订单这类强一致、高并发写入场景;③托管运维与聚合分析生态弱于 TencentDB MySQL。它解决的是项目里最不痛苦的那 20%(标准 CRUD),对真正棘手的 80%(微信生态深度集成、复杂状态机、GPS 校验、数据看板)帮不上忙。(注:并非"SQLite 不支持窗口函数"或"只能写 Go",这两条早期论据已更正。)

PocketBase 像一个"厨房里的多功能料理机"——如果你要做沙拉（标准 CRUD 应用），它 30 秒出餐。但大洋云洁要做的是"川菜全席"（微信深度集成 + 复杂状态机 + 图表看板），料理机能帮忙切个菜，但真正炒菜还得上灶台。

**tech.md 技术栈选择不需要调整。** NestJS + Prisma + MySQL + Vue 3 仍然是针对大洋云洁业务特征的最优解。

---

## 2. 最终技术栈

### 2.1 总览

```
┌─────────────────────────────────────────────────────────┐
│                      客户端层                            │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  居民端小程序     │  │  员工端小程序     │             │
│  │  uni-app (Vue 3) │  │  uni-app (Vue 3) │             │
│  │  TypeScript      │  │  TypeScript      │             │
│  └────────┬─────────┘  └────────┬─────────┘             │
│           │         HTTPS        │                       │
├───────────┼──────────────────────┼───────────────────────┤
│           │          后端 API 层  │                       │
│           │    ┌─────────────────▼──────────┐            │
│           │    │  NestJS (TypeScript)        │            │
│           │    │  ├─ Prisma ORM             │            │
│           │    │  ├─ WebSocket (Socket.IO)  │            │
│           │    │  ├─ 腾讯云 COS SDK         │            │
│           │    │  └─ 微信 Module（自封装）  │            │
│           │    └────────┬───────────────────┘            │
├───────────┼─────────────┼────────────────────────────────┤
│           │      数据层  │                                │
│           │    ┌────────▼───────────┐                    │
│           │    │  TencentDB MySQL 8 │                    │
│           │    │  腾讯云 Redis      │                    │
│           │    │  腾讯云 COS        │                    │
│           │    └────────────────────┘                    │
├───────────┴──────────────────────────────────────────────┤
│                      管理后台                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Vue 3 + Element Plus + ECharts + TypeScript     │   │
│  │  纯 SPA，Nginx 静态托管于腾讯云轻量服务器         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 分层选型明细

| 层 | 技术 | 版本 | 选型理由 |
| :--- | :--- | :--- | :--- |
| **小程序框架** | uni-app (Vue 3 + TS) | Vue 3.4+ | 一套代码覆盖居民端+员工端；Vue 生态成熟；地图/GPS/拍照原生能力封装完善；后续可编译支付宝小程序或 H5 |
| **后端框架** | NestJS | v11+ | TypeScript 全栈统一；装饰器模式 AI 生成质量高；模块化架构天然支持二期支付/优惠券独立模块；WebSocket 原生集成 |
| **ORM** | Prisma | v7+ | 类型安全的数据库操作；Schema 即文档；自动生成类型，前后端共享；迁移管理完善 |
| **Web 管理后台** | Vue 3 + Element Plus + ECharts | Vue 3.4+ / EP 2.6+ | Element Plus 专为中文后台设计；表格/弹窗/表单直接映射原型图；无需 SSR，纯 SPA 部署最简。**推荐骨架复用 vue3-element-admin (youlai)**：Element Plus 未过度封装、AI 生成页面可直接嵌入（非强制约束，仅加速参考）。**【v1.4 修订】** youlai 默认后端是 Java/Spring Boot，该骨架本质是**后端无关的纯前端模板**，对接本项目 NestJS 只需改 axios 基址与鉴权拦截器，不存在"自带 NestJS 配套" |
| **图表** | ECharts | v5+ | 覆盖 §5.1 数据看板全部图表类型（折线/环形/柱状）；腾讯云地图扩展天然兼容 |
| **数据库** | MySQL 8.0（腾讯云 TencentDB） | 8.0 | 强事务保障（支付/订单核心需求）；窗口函数支持数据看板聚合查询；腾讯云托管免运维 |
| **缓存** | Redis（腾讯云） | 7.0 | 员工空闲状态缓存；微信 access_token 缓存；看板数据缓存 |
| **对象存储** | 腾讯云 COS | — | 照片上传+水印（时间戳/订单号）；与腾讯云生态打通。**【v1.4 修订】** 居民/工单照片属隐私数据，须用**私有桶 + 签名 URL**访问，禁用公开读 |
| **地图服务** | 腾讯地图 WebService API | — | 微信小程序原生集成；GPS 超距校验（Haversine） |
| **云函数** | 腾讯云 SCF | — | **【v1.4 修订】** 仅用于必须异步/定时的任务（超时未接单提醒 / 家政 SLA 提醒）。**照片水印改在 NestJS 进程内用 `sharp` 处理**——已有常驻进程，无需为水印单起 SCF 运行时 + COS 触发器，避免与"避免过度工程化"冲突 |
| **部署** | 腾讯云轻量应用服务器 + Nginx | — | 后端 NestJS 单进程运行；管理后台静态托管；SCF 处理异步任务 |

### 2.3 语言决策：为什么是 TypeScript 全栈

> **【v1.4 修订】** 下表两处早期论据已收紧:①Java"单接口 7 个文件"为夸张表述,现代 Spring Boot 并不需要,**否决 Java 的真正理由是「团队无 Java 积累 + 前后端类型不能共享」**;②Go 微信 SDK 并不"薄弱"(`silenceper/wechat` 等已成熟,覆盖登录/订阅/支付),**否决 Go 的真正理由同样是「前后端类型无法共享」**。TS 全栈的核心优势 = 前后端同语言、类型直接 `import` 复用。

| 对比维度 | TypeScript | Java（被拒绝） | Go（被拒绝） |
| :--- | :--- | :--- | :--- |
| AI 代码生成质量 | **最高** — 类型标注+简洁语法 | 中 — 样板代码偏多 | 中 — 语法简洁但错误处理冗长 |
| 前后端类型共享 | **原生支持**（决定性优势） | 需额外工具 | 不支持 |
| 微信 SDK 生态 | 自封装 HTTP + 官方 V3 SDK | WxJava（最全但 Java 限定） | silenceper/wechat（成熟，非薄弱） |
| 腾讯云 SDK | **tencentcloud-sdk-nodejs** | tencentcloud-sdk-java | tencentcloud-sdk-go |
| 小程序类型复用 | 同语言，直接 import type | 需 OpenAPI 生成 | 完全不能 |

---

## 3. 一期 MVP 技术范围

以下能力在一期实现，不做多余设计：

| 能力 | 一期实现方式 | 备注 |
| :--- | :--- | :--- |
| 微信登录 | uni-app `wx.login` + NestJS 后端换取 openid | 首次下单弹窗补全姓名/手机号 |
| 订阅消息 | 微信订阅消息 + 公众号模板消息 | 必推节点清单待确认 |
| GPS 签到 | `uni.getLocation` + 后端 Haversine 超距校验 | 默认阈值 200 m |
| 照片上传 | uni-app `chooseImage` → COS（私有桶）→ NestJS `sharp` 加水印 | **【v1.4 修订】** 批次号+时间戳水印；私有桶 + 签名 URL 访问 |
| 订单状态实时推送 | WebSocket（Socket.IO） | 管理后台实时刷新；小程序端走订阅消息 |
| 日历（含农历） | 前端 lunar-javascript / solarlunar 库 | 预约时间选择页 |
| 数据看板 | NestJS 聚合查询 + Redis 缓存 + ECharts | 默认近 7 天 |
| API 鉴权 | 小程序端 JWT（access + refresh），token 进 Redis | **【v1.4 新增】** 一期必做;居民端/员工端按角色区分接口边界 |
| 基础 RBAC | 超管 / 运营 / 客服 三类基础角色 | **【v1.4 新增】** 一期不应只有单一 admin;完整 RBAC 留二期 |
| 订单状态变更日志 | 独立 `order_status_log` 表，记录操作人/时间/前后态 | **【v1.4 新增】** 审计与纠纷追溯必需 |
| 部署 | 腾讯云轻量服务器 + Nginx 反向代理 | 单进程够用 |
| 部署运维基线 | PM2/systemd 守护 + 集中日志 + 定时备份 + TLS + 健康检查 + 密钥管理 | **【v1.4 新增】** 单进程=单点,进程守护与备份不可省 |

---

## 4. 二期扩展预留

| 二期能力 | 架构预留 | 说明 |
| :--- | :--- | :--- |
| 在线支付（微信支付） | `PaymentModule` 独立模块 | NestJS 模块化天然支持。**【v1.4 修订】** 不止预留 `payment_transaction_id`,应设计**独立支付流水表 + 退款流水表**,并规划回调验签 / 幂等 / 对账;用 `wechatpay-node-v3` 对接微信支付 V3 |
| 优惠券 | `CouponModule` | 订单表关联 `coupon_id`；不影响一期字段 |
| 会员积分 | `MemberModule` | 用户表扩展积分字段；独立积分流水表 |
| 多社区/多城市 | 数据表预留 `community_id` | 地址表已有省/市/区级联字段 |
| 管理后台权限 (RBAC) | `AuthModule` + `Guard` | NestJS 的 Guard 装饰器天然支持；一期暂用单一 admin 账号 |
| 消息推送精细化 | `NotificationModule` 抽象层 | 切面拦截订单状态变更，统一推送 |

---

## 5. 项目依赖清单

### 5.1 小程序（uni-app）

```json
{
  "dependencies": {
    "vue": "^3.4",
    "pinia": "^2.1",
    "lunar-javascript": "^1.x"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "@dcloudio/types": "^3.4",
    "uni-app": "^3.x"
  }
}
```

### 5.2 后端（NestJS）

> **【v1.4 修订】** ①移除不存在的 `wechat-sdk-node`(npm 上 404),微信能力改为**自封装 `WechatModule`**:登录/订阅消息用官方 HTTP API + `axios`,`access_token` 存 Redis;微信支付用 `wechatpay-node-v3`。②版本号按 npm 当前稳定版更新(实测:nest 11 / prisma 7 / vite 8 / echarts 6),**新项目以启动当日最新稳定版初始化并在 lockfile 锁死**。③新增 `sharp` 做进程内照片水印。

```json
{
  "dependencies": {
    "@nestjs/core": "^11.x",
    "@nestjs/websockets": "^11.x",
    "@nestjs/platform-socket.io": "^11.x",
    "@prisma/client": "^7.x",
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "tencentcloud-sdk-nodejs": "^4.x",
    "cos-nodejs-sdk-v5": "^2.x",
    "wechatpay-node-v3": "^2.x",
    "ioredis": "^5.x",
    "axios": "^1.x",
    "sharp": "^0.34.x"
  },
  "devDependencies": {
    "prisma": "^7.x",
    "@types/node": "^20.x",
    "typescript": "^5.4"
  }
}
```

> 注：`@nestjs/schedule` 用于一期定时任务（SLA / 超时提醒）；横向扩展后定时任务需加分布式锁防重复触发，Socket.IO 多实例需接 `@socket.io/redis-adapter`。

### 5.3 管理后台（Vue 3）

> **【v1.4 修订】** echarts 5→6、vite 5→8 按当前稳定版更新；同样建议启动时锁定最新稳定版。

```json
{
  "dependencies": {
    "vue": "^3.4",
    "vue-router": "^4.3",
    "pinia": "^2.1",
    "element-plus": "^2.14",
    "echarts": "^6.x",
    "axios": "^1.7",
    "socket.io-client": "^4.x"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "vite": "^8.x",
    "@vitejs/plugin-vue": "^5.x"
  }
}
```

---

## 6. 目录结构（建议）

```
dayangyunjie/
├── apps/
│   ├── miniapp-customer/     # 居民端小程序 (uni-app)
│   ├── miniapp-worker/       # 员工端小程序 (uni-app)
│   ├── server/               # 后端 API (NestJS)
│   └── admin/                # 管理后台 (Vue 3)
├── packages/
│   └── shared/               # 共享类型 (Order, User, etc.)
├── prisma/
│   └── schema.prisma         # 数据库 Schema
├── requirement/              # 需求文档
├── codework/                 # 技术文档
└── .workbuddy/               # WorkBuddy 工作记录
```

> `packages/shared` 存放纯 TypeScript 类型定义（订单、用户、DTO 等），三个 App 均通过 workspace 引用，确保类型一致性。

---

## 7. 与需求文档的映射

| 需求章节 | 对应技术实现 |
| :--- | :--- |
| §2 订单状态机 | NestJS `OrderService` 状态流转 + Prisma 事务 |
| §3 居民端 | uni-app 页面（首页、预约流、订单列表/详情、评价、投诉）。**原型图为 AI 代码生成源**（`requirement/customer/` 下 19 张） |
| §4 员工端 | uni-app 页面（任务列表/详情、服务指引弹窗、GPS 签到、拍照上传）。**原型图为 AI 代码生成源**（`requirement/uses/` 下 8 张） |
| §5.1 数据看板 | NestJS 聚合 API + ECharts 可视化 |
| §5.2–5.6 管理后台 | Vue 3 + Element Plus 表格/弹窗页面 |
| §7 微信能力 | uni-app 原生 API + NestJS 微信 SDK + 腾讯云 COS |

---

*本文档 v1.4，经技术评审修正 3 处事实错误（SQLite 窗口函数 / wechat-sdk-node / 依赖版本号）、补充上线必需工程项、重新论证 SCF 水印与语言选型论据，改进点以 `【v1.4 修订】`/`【v1.4 新增】` 标注；v1.3 §7 新增原型图 AI 代码生成源备注；v1.2 新增 §2.2 管理后台推荐骨架（非强制约束）；v1.1 新增 PocketBase 对照分析；v1.0 为初始选型结论。技术选型随项目演进而迭代。*
