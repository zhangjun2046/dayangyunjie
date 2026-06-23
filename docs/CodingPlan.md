# 大洋云洁 (dayangyunjie) — AI 自动开发计划

> **文档用途**: 本人是非技术人员，使用 **Cursor Agent** 进行 AI 辅助自动开发。
> 本文档是开发的唯一操作手册，按开发单元逐个指导每个环节该做什么、怎么做、怎么验收。
>
> **编码仓库根目录（Cursor 工作区）**: `D:\coding\dayangyunjie-code`  
> 商务/调研资料在同级目录 `D:\coding\dayangyunjie`（不在本 Git 仓库内）。  
> **磁盘硬性约束**见 [§2.1 磁盘与路径硬性约束](#21-磁盘与路径硬性约束禁止占用-c-盘)。

### 开发单元验收进度

| 单元                                     | 状态      | 验收日期   | 备注                                                                                                                                                |
| ---------------------------------------- | --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1.1 NestJS 脚手架 + Prisma 初始化       | ✅ 已通过 | 2026-06-02 | `npm run build` 成功；`apps/server/prisma/schema.prisma` 空占位存在；§2.1 磁盘约束（npm 缓存 / TEMP / TMP）已验证                                   |
| P1.2 Schema.prisma 编写 + 迁移/种子      | ✅ 已通过 | 2026-06-02 | 12 模型 + 8 枚举（Schema v1.1，无 WorkerCertificate）；`migrate deploy` + `db seed`；Prisma Studio 人工验收：Admin×1、ServiceCatalog×10             |
| P1.3 共享类型包 packages/shared          | ✅ 已通过 | 2026-06-02 | 8 枚举 + 中文 labels + 实体/DTO；根目录 `npm run build` 通过；server / miniapp-customer / miniapp-worker / admin 均可 import `@dayangyunjie/shared` |
| P1.4 uni-app 双端骨架（居民端 + 员工端） | ✅ 已通过 | 2026-06-02 | `apps/miniapp-customer` / `apps/miniapp-worker` 均完成 uni-app 骨架；H5 双端启动成功并可切换 tabBar；根目录 `npm run build` 通过                    |
| P1.5 Vue 3 管理后台脚手架                | ✅ 已通过 | 2026-06-02 | `apps/admin` 完成 Vue3+Vite+Element Plus 最小骨架；登录页与主布局页可访问；根目录 `npm run build` 通过                                             |
| P2.1 Auth 模块（JWT + 微信登录）         | ✅ 已通过 | 2026-06-02 | 已实现 Resident 微信 mock 登录、JWT access/refresh、`JwtStrategy`/Guard、`/auth/profile` 受保护接口、`/auth/refresh`、Swagger 可测；验收通过         |
| P2.2 用户 CRUD 模块                      | ✅ 已通过 | 2026-06-02 | 三类用户 CRUD 已落地（Resident/Worker/Admin）；Resident 新增最小必填 `openid`；Worker/Admin 明文 `password` 由服务端 `bcrypt` 入库到 `passwordHash` |
| P2.3 地址管理模块                        | ✅ 已通过 | 2026-06-07 | Address 6 接口（CRUD + 设默认）；默认地址互斥（同 resident 仅 1 条 `isDefault=true`）；绑定 `residentId`；Swagger 验收：新增 3 地址→设默认→查仅 1 默认→删非默认 |
| P2.4 服务目录查询模块                    | ✅ 已通过 | 2026-06-07 | ServiceCatalog 2 接口（列表 + 详情）；按 `bizType` 筛选；默认 `isActive=true`；种子数据 CLEANING×3 / RECYCLING×2 / CONSULT×5；已生成 `OrderModule-API-Contract.md`；人工验收通过 |
| P2.5a CleaningOrder CRUD + 创建订单      | ✅ 已通过 | 2026-06-07 | 已实现 create/list/getOne/update；订单号 `CLN+yyyyMMdd+6位序号`；`referenceAmount=serviceDuration×priceMin`；创建接口请求体显式必填 `residentId`；Swagger 验收通过 |
| P2.5b CleaningOrder 状态机核心           | ✅ 已通过 | 2026-06-07 | `OrderStatusLog` 审计日志表（db push 同步）；`OrderStateMachineService`（CLEANING/RECYCLING 双套规则）；`PATCH /cleaning-orders/:id/status` 接口；Jest 35 项测试全部通过；取消专项规则验证 |
| P2.5c 派单/GPS签到/完成/取消操作接口     | ✅ 已通过 | 2026-06-07 | 新增 5 个语义化操作接口（assign/accept/gps-checkin/complete/cancel）；Haversine 200m 超距标记；WorkPhoto 批量写入；Jest 25 项测试全部通过（含距离精度验证）；修复 jest.config.js 模块路径映射 bug |
| P2.6a RecyclingOrder CRUD + 状态机      | ✅ 已通过 | 2026-06-08 | 废品回收订单完整模块（10 接口）；订单号 `RCY+yyyyMMdd+6位序号`；`serviceItem`/`estimatedWeight` 必填；5 个操作接口与保洁完全对称；修复状态机 RECYCLING 规则（移除 PENDING_ACCEPTANCE）；Jest 84 项全部通过；CRUD + 全链路 e2e 验收通过 |
| P2.7 ConsultOrder 咨询单模块            | ✅ 已通过 | 2026-06-08 | 咨询单完整模块（4 接口）；订单号 `CNS+yyyyMMdd+6位序号`；三态流转（PENDING→FOLLOWING_UP→COMPLETED）；无取消态，非法转移/终态保护均返回 400；`order_status_logs` 审计写入；Jest 21 项全部通过；全链路 e2e 11 项验收通过；使用 Sonnet 4.6 LLM 完成 |
| P2.8 GPS 签到校验服务                   | ✅ 已通过 | 2026-06-08 | 新建 `common/geo/GeoService`（`haversineMeters` + `validateCheckin`）；将保洁/废品模块内嵌的重复 Haversine 逻辑抽取为可复用公共服务；`GeoModule` 导出；Jest 18 项全部通过；全套回归 123 项通过；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P2.9 COS 文件上传 + 水印               | ✅ 已通过 | 2026-06-08 | Strategy 模式抽象存储层（`StorageModule`）；`LocalStorageStrategy`（开发期 `/uploads`）+ `CosStorageStrategy`（占位 stub，`STORAGE_PROVIDER` 一行切换）；sharp SVG composite 水印（订单号 + 时间戳）；`POST /api/v1/upload/image`；5 场景全链路验收通过（含文件类型/缺参防御）；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P2.10 评价与投诉模块                    | ✅ 已通过 | 2026-06-08 | ReviewModule（3接口）+ ComplaintModule（5接口）；评价提交驱动 `PENDING_REVIEW → REVIEWED` 并写审计日志；投诉三态流转（PENDING→PROCESSING→COMPLETED）+ 跟进记录；Prisma 无需迁移（schema 已有模型）；Jest 39 项新增（全套回归 162 项）通过；评价/投诉全链路 e2e 验收通过；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P2.11 数据看板聚合 API                  | ✅ 已通过 | 2026-06-08 | DashboardModule（6 聚合接口）；统计卡/订单趋势/服务类型分布/满意度分布/时段分布/员工绩效排名；返回格式适配 ECharts 折线图/环形图/柱状图；支持 `startDate`/`endDate` 时间范围筛选；Jest 20 项新增（全套回归 182 项）通过；全接口 e2e 验收通过（数字合理性 + ECharts 格式校验）；已生成 `Backend-API-Summary.md` 交接文档；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P2.12 Schema v2.0 迁移 + 代码适配      | ✅ 已通过 | 2026-06-15 | `prisma db push` 同步 v2.0 schema；新增 Banner/Operator/ConsultFollowUp 三张表；Worker/Address 字段扩展；seed.ts 更新（ServiceCatalog 无价格字段，Operator 初始记录）；ConsultStatus/OrderSource 枚举适配；Jest 182 项全部通过；使用 Sonnet 4.6 LLM 完成 |
| P2.13 Worker 手机号+密码登录 + 密码管理 | ✅ 已通过 | 2026-06-15 | `POST /auth/worker-login`（phone+password → JWT）；WorkerJwtStrategy/WorkerJwtAuthGuard（role=worker 隔离）；`PUT /workers/:id/change-password`（旧密码验证）；`POST /workers/:id/reset-password`（重置为手机号）；Jest 192 项全部通过；使用 Sonnet 4.6 LLM 完成 |
| P2.14 配置管理 CRUD 接口               | ✅ 已通过 | 2026-06-15 | ServiceCatalog 扩展为全 CRUD + toggle 启用/停用；新建 BannerModule（全 CRUD + `/banners/active` 有效轮播查询）；新建 OperatorModule（全 CRUD + `/operators/contact` 接单人查询）；Jest 32 项全部通过；Swagger 三项验收通过；使用 Sonnet 4.6 LLM 完成 |
| P2.15 家政跟进记录接口 + ConsultOrder v2.0 字段适配（需求修正：废品仍由员工 /complete 触发） | ✅ 已通过 | 2026-06-15 | ConsultFollowUp CRUD；ConsultOrder v2.0 字段（isProxyOrder/serviceContactName/serviceAddress/source）；需求#92「废品居民验收」为错误描述（#98已更正），撤销误引入的 /resident-accept |
| P3.1 应用骨架 + 登录授权                    | ✅ 已通过 | 2026-06-17 | 居民端 App.vue 入口配置；微信 wx.login 静默获取 openid → 后端换取 JWT；隐私协议弹窗（PrivacyModal）首次必弹；首次下单身份补全弹窗（ProfileCompleteModal，支持 getPhoneNumber 快速授权或手动输入）；Pinia auth store 持久化登录态；路由守卫（useRouteGuard）拦截未登录页面；使用 Sonnet 4.6 LLM 完成 |
| P3.2 居民端首页                             | ✅ 已通过 | 2026-06-20 | 动态 Banner 轮播（`GET /banners/active?displayTarget=RESIDENT`）；三大服务卡片 → 服务详情页（含 §1.6 边界声明）→「立即预约」跳转三步向导；客服电话动态获取（`GET /operators/contact`）；H5 Vite 代理 + 小程序 `VITE_API_BASE` 双端 API 配置；使用 Sonnet 4.6 LLM 完成 |
| P3.3 保洁预约三步向导                       | ✅ 已通过 | 2026-06-20 | 动态服务类型（`GET /service-catalogs?bizType=CLEANING`）；时长步进器（1–8h，默认 2h）；公历+农历日历 + 时段选择；地址选择页（空地址引导新增）；代下单勾选 + 确认页填写；无价格展示；`POST /cleaning-orders` 生成 CLN 订单号；使用 Sonnet 4.6 LLM 完成 |
| P3.4 废品回收预约三步向导                   | ✅ 已通过 | 2026-06-20 | 复用 P3.3 向导框架；动态回收类型 + 预估重量步进器（默认 5kg）；地址选择/代下单/日历/时段与保洁一致；`POST /recycling-orders` 生成 RCY 订单号；无价格展示；使用 Sonnet 4.6 LLM 完成 |
| P3.5 家政咨询提交流程                       | ✅ 已通过 | 2026-06-20 | 两步向导（类型选择 + 需求填写）；动态服务类型（`GET /service-catalogs?bizType=CONSULT`）；代下单开关 + 服务对象信息；无地址字段；`POST /consult-orders` 生成 CNS 前缀订单号；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P3.6 我的订单列表 + 详情页                  | ✅ 已通过 | 2026-06-20 | 三类查询DTO加residentId+statuses多状态；新增`POST /recycling-orders/:id/resident-confirm`（IN_SERVICE→PENDING_REVIEW）；订单列表三Tab（保洁/废品/家政）+状态筛选胶囊+卡片+下拉刷新+上拉加载；OrderStatusTimeline时间轴组件；订单详情页三种模板+取消/验收/评价按钮+无价格；pages.json新增order-detail路由；修复详情页用`onLoad`替代`onMounted`获取路由参数（mp-weixin兼容）；修复筛选胶囊scroll-view横向滚动（white-space:nowrap+inline-flex内联方案）；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P3.6_repair 废品回收验收改为员工触发        | ✅ 已通过 | 2026-06-21 | 废品回收「服务中→待评价」触发方从居民端验收回归为员工端完成服务，与保洁对称；删除后端 `POST /recycling-orders/:id/resident-confirm` 接口及 `ResidentConfirmDto`；删除前端「验收服务」按钮、`onResidentConfirm` 函数、`residentConfirmRecycling` API；更新 P4.5 开发计划（废品改为有完成服务按钮）；新增 4 项回归测试（共 29 项全通过）；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P3.7 评价页 + 投诉页 + 我的页              | ✅ 已通过 | 2026-06-21 | 评价页（1–5星+标签+文字+多图上传，7天限时）；投诉页（6原因单选+描述必填+多图凭证，ACCEPTED后才可投诉）；我的页（完整手机号+我的地址CRUD+我的投诉列表/详情）；订单详情展示评价/投诉卡片；Complaint 查询DTO新增residentId；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P3.8 代下单集成验证（保洁+废品+家政）        | ✅ 已通过 | 2026-06-21 | 三类代下单全流程闭环；保洁/废品 trim 一致性修复；家政详情页去除误显示「等待分配服务人员」；全量回归 240 项通过；生成 `MiniApp-Architecture.md`；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P4.1 登录页 + 员工身份认证                  | ✅ 已通过 | 2026-06-21 | 员工端独立登录页（手机号+密码+协议勾选）；`POST /auth/worker-login` 对接；Pinia auth store 持久化（`__worker_auth__`）；路由守卫拦截未登录页面；H5 Vite 代理 + `.env` 双端 API 配置；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P4.2 员工端首页—待接单任务列表              | ✅ 已通过 | 2026-06-21 | 首页仅展示 ASSIGNED 状态任务卡片（保洁+废品回收并发拉取合并）；按预约时间升序排列；卡片含服务名称/时间/地址/"查看详情"/"立即接单"；接单成功后卡片乐观移除；navigationBar 蓝色品牌色；下拉刷新；空状态；使用 Sonnet 4.6 LLM 完成 |
| P4.3 我的任务列表                           | ✅ 已通过 | 2026-06-21 | 任务页双 Tab（保洁/废品）+ 精确系统状态筛选胶囊（全部/已派单/已接单/服务中/待评价/已评价/已取消，无 PENDING_ASSIGN）；`fetchWorkerOrders` 分页列表；ASSIGNED 卡片可接单；下拉刷新 + 上拉加载；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P4.4 任务详情—已派单/已接单态               | ✅ 已通过 | 2026-06-21 | 任务详情页（`pages/task-detail/index`）；ASSIGNED 显示「立即接单」+ 提示，ACCEPTED 显示「开始服务」→ GPS 签到 → IN_SERVICE；作业区 ASSIGNED/ACCEPTED 禁用；代下单展示被服务人；时间轴 active/done 三态；完整手机号 + 地图导航；manifest `requiredPrivateInfos`；Jest 36 项 P4.4 测试通过；使用 Sonnet 4.6 LLM 完成 |
| P4.5 任务详情—服务中态                       | ✅ 已通过 | 2026-06-22 | IN_SERVICE 作业区解锁；上传服务前/后照片（`uni.chooseImage` → `POST /api/v1/upload/image?orderNo=xxx` → sharp SVG 水印叠加订单号+时间戳至右下角）；保洁/废品均显示「完成服务」按钮+确认弹窗 → `/complete` → PENDING_REVIEW；不展示实际重量/金额字段；修复 `UPLOAD_BASE_URL` H5 模式返回空串导致上传 404 的 Bug（改为 `'/api/v1'` 条件编译）；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P4.6 任务详情—待评价/已完成态                 | ✅ 已通过 | 2026-06-22 | PENDING_REVIEW/REVIEWED 状态只读详情模板（无操作按钮）；完整 6 节点时间轴（REVIEWED 全部 done）；作业照片网格只读展示（按 photoType 分服务前/后）；REVIEWED 额外展示「用户评价」区（星级 ★/☆ + 标签胶囊 + 文字 + 图片网格 + 评价时间），通过 `GET /reviews?orderType=&orderId=` 懒加载；新增 `apps/miniapp-worker/src/api/review.ts`（`fetchOrderReview`）；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P4.7 我的页                                 | ✅ 已通过 | 2026-06-22 | 我的页完整实现：个人信息+评分（`GET /workers/:id`）；今日订单/今日已完成统计（保洁+废品并发 `fetchWorkerOrders`，按 appointDate=今天过滤；已完成=今日 REVIEWED）；健康证/技能证书图片预览（`uni.previewImage`）；设置页修改密码（`PUT /workers/:id/change-password`）；无「服务记录」入口；退出登录；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P5.1 登录 + 二级折叠菜单布局框架            | ✅ 已通过 | 2026-06-22 | 后端新增 `POST /auth/admin-login`（email+password → Admin JWT，role=admin）；管理后台真实登录替换 mock；二级折叠侧栏（订单/数据/员工/配置/系统设置）；全部路由含 P5.9–P5.11 配置管理占位页；路由守卫；API 基址对齐 `/api/v1`；seed 默认管理员密码 `admin123`；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成 |
| P5.2 数据看板                               | ✅ 已通过 | 2026-06-22 | 后端 `GET /dashboard/summary` 重构为时间范围统计（total/completed/inProgress/pending，仅保洁+废品）；管理后台 `/data/dashboard` 完整实现：4 张统计卡 + ECharts 折线/环形/柱状图 + 员工绩效排名表格（无「创收金额」列）+ 本日/本周/本月切换联动刷新；`apps/admin/src/api/dashboard.ts` + `echarts` 依赖；验收通过；使用 Sonnet 4.6 LLM 完成 |
| P5.3 保洁订单管理                           | ✅ 已通过 | 2026-06-23 | 管理端 `/orders/cleaning` 完整实现：列表（被服务人列/服务时段/无金额列）+ 分配弹窗 + 代下单弹窗 + 详情抽屉；服务时段与居民端一致（8 起始时间点 + 1–8h 时长步进）；修复：列表服务人员不可见、查询条件不完整、代下单 400（`residentId`/`addressId` 可选 + `addressSnapshotText`）；`apps/admin/src/api/cleaning.ts` + `worker.ts` + `service-catalog.ts`；使用 Sonnet 4.6 LLM 完成 |
| P5.4 废品订单管理                           | ✅ 已通过 | 2026-06-23 | 管理端 `/orders/recycling` 完整实现：复用 P5.3 框架（被服务人/代下单列 + 分配弹窗 + 预估重量列 + 无金额列）；代下单 + 8 时间点 + 重量步进与居民端一致；修复：代下单 400、列表/详情服务人员不可见、查询条件（关键词/电话/服务地址）；`apps/admin/src/api/recycling.ts`；使用 Sonnet 4.6 LLM 完成 |
| P5.5 家政咨询单管理                         | ✅ 已通过 | 2026-06-23 | 管理端 `/orders/consult` 完整实现：列表（被服务人/代下单列 + 客户联系方式筛选）+ 新增咨询单弹窗 + 详情抽屉（ConsultFollowUp 跟进时间轴 + 提交/完成按钮）；状态 FOLLOW_UP/FOLLOWING/COMPLETED；修复：提交跟进时 `operatorId` 必填导致 400；`apps/admin/src/api/consult.ts`；使用 Sonnet 4.6 LLM 完成 |

> **P2.1–P2.15 后端核心 API 全部完成（含 v2.0 补充）。P3.1–P3.8 居民端全部完成。P4.1–P4.7 员工端小程序全部完成。** **P5.1 管理后台登录与布局框架已完成。P5.2 数据看板已完成。P5.3 保洁订单管理已完成。P5.4 废品订单管理已完成。P5.5 家政咨询单管理已完成。** 下一阶段：**P5.6** — 服务人员管理。

---

## 目录

- [开发单元验收进度](#开发单元验收进度)
- [一、项目背景](#一项目背景)
- [二、前置准备清单](#二前置准备清单)
  - [§2.1 磁盘与路径硬性约束](#21-磁盘与路径硬性约束禁止占用-c-盘)
- [三、通用执行流程（每个单元都适用）](#三通用执行流程每个单元都适用)
- [四、模型切换策略](#四模型切换策略)
- [五、上下文继承机制](#五上下文继承机制)
- [六、权限说明总表](#六权限说明总表)
- [七、分阶段开发单元详解](#七分阶段开发单元详解)
  - [P1 基础设施（16h）](#p1-基础设施16h)
  - [P2 后端核心 API（40h，含 v2.0 补充）](#p2-后端核心-api40h)
  - [P3 居民端小程序（28h）](#p3-居民端小程序28h)
  - [P4 员工端小程序（22h）](#p4-员工端小程序22h)
  - [P5 管理后台（37h）](#p5-管理后台37h)
  - [P6 集成与部署（12h）](#p6-集成与部署12h)
- [八、工时汇总与排期建议](#八工时汇总与排期建议)
- [九、风险与应急处理](#九风险与应急处理)
- [附录 A：快速启动口令](#附录-a快速启动口令)
- [附录 B：术语速查表](#附录-b术语速查表)

---

## 一、项目背景

### 我是谁

我是项目的发起人，**不懂编程和技术细节**。我的角色是：

- **产品经理** — 定义需求（已写入仓库根目录 `requirement_v2.0.md`，v2.0 基线）
- **验收员** — 每个 AI 开发单元完成后检查结果是否可用
- **决策者** — 在关键节点做选择（如确认需求细节、批准方案）

### 什么是 Cursor Agent

**Cursor Agent** 是 Cursor 编辑器里的 AI 编程助手（聊天面板选择 **Agent** 模式）。它像一个"会写代码的技术助手"，我通过自然语言告诉它要做什么，它就会：

- 创建和修改代码文件
- 运行终端命令（安装依赖、编译项目等）
- 回答技术问题并给出建议

> **与 Ask 模式的区别**：Ask 只回答、不改文件；**Agent** 才能改代码、跑命令。每个开发单元必须在 **Agent** 模式下执行。

### 开发模式

```
┌─────────────────────────────────────────────────────┐
│                    开发模式                          │
│                                                     │
│  我（非技术人员）                                     │
│    │                                                │
│    │ 用中文说："开始 P2.5a，实现保洁订单 CRUD"         │
│    ▼                                                │
│  Cursor Agent（AI 助手）                              │
│    │                                                │
│    ├─ 读取需求文档 / 技术文档 / 数据库设计             │
│    ├─ 理解当前项目已有代码                             │
│    ├─ 自动生成完整代码文件                            │
│    ├─ 运行命令验证编译通过                            │
│    └─ 告诉我完成了，请我检查                           │
│    │                                                │
│    ▼                                                │
│  我（审查 + 反馈）                                    │
│    │                                                │
│    └─ 看生成的文件 → 有问题就反馈 → AI 修正 → 再检查   │
└─────────────────────────────────────────────────────┘
```

### 关键认知

| 事实                   | 说明                                         |
| ---------------------- | -------------------------------------------- |
| **我不需要写代码**     | 全部由 AI 生成                               |
| **我不需要懂技术术语** | 用中文描述需求即可                           |
| **但我必须参与**       | 每个单元都需要我审查结果、反馈问题、手动测试 |
| **AI 不是全自动**      | 它像一个非常能干的实习生，需要我来指导和验收 |

### 已有文档

| 文档                | 路径                                             | 内容                                   |
| ------------------- | ------------------------------------------------ | -------------------------------------- |
| 需求文档（v2.0）    | `D:\coding\dayangyunjie-code\requirement_v2.0.md` | 功能需求、业务流程、状态枚举、原型图描述（v2.0 最新基线）  |
| 技术选型            | `D:\coding\dayangyunjie-code\docs\tech.md`        | 技术栈、架构约定、编码规范（不变）                         |
| 数据库设计（v2.0）  | `D:\coding\dayangyunjie-code\docs\Schema.md`      | 15 个数据表、8 个枚举、字段定义（v2.0 含 Banner/Operator/ConsultFollowUp） |
| **本开发计划**      | `D:\coding\dayangyunjie-code\docs\CodingPlan.md`  | **本文档 — 你正在看的操作指引**                            |
| 资料区（商务/调研） | `D:\coding\dayangyunjie\`                        | 报价、调研报告等，**不参与**本仓库开发 |

---

## 二、前置准备清单

在开始第一个开发单元之前，需要完成以下准备工作。按优先级排列：

### 🔴 必须在 Day 1 完成（否则 P1 无法启动）

| #   | 准备项                   | 怎么做                                                                                      | 验证方法                                |
| --- | ------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | **切换到 Agent 模式**    | Cursor 聊天面板选择 **Agent**（勿用 Ask）                                                   | Agent 可创建文件并运行终端命令          |
| 2   | **确认编码仓库与工作区** | Cursor **文件 → 打开文件夹** → `D:\coding\dayangyunjie-code`；根目录已有 `.git` 与 `origin` | `git remote -v` 显示 `dayangyunjie.git` |
| 3   | **完成 §2.1 磁盘约束**   | npm 缓存、node_modules、日志目录均在 D 盘（见下节）                                         | 三项验证命令均通过                      |
| 4   | **本地 MySQL 可用**      | 最简单方式：安装 MySQL 8 或用 Docker 运行；连接串在 `.env`                                  | 终端输入 `mysql -u root -p` 能连上      |

### 🟡 必须在 P3 开始前完成（约第 7-8 天）

| #   | 准备项               | 说明                                                           |
| --- | -------------------- | -------------------------------------------------------------- |
| 5   | **微信开发者工具**   | 从微信官网下载安装，用于预览小程序                             |
| 6   | **微信小程序 AppID** | 去[微信公众平台](https://mp.weixin.qq.com)注册，免费获取测试号 |

### ⚪ 必须在 P6 开始前完成（最后 2-3 天）

| #   | 准备项                | 说明            |
| --- | --------------------- | --------------- |
| 7   | **腾讯云服务器 CVM**  | 用于部署上线    |
| 8   | **腾讯云 COS 存储桶** | 用于存储照片    |
| 9   | **域名 + SSL 证书**   | 用于 HTTPS 访问 |

> **注意**: 第 5-9 项不需要现在准备。先把第 1-4 项搞定就可以开工了。

### 2.1 磁盘与路径硬性约束（禁止占用 C 盘）

> P1.1 教训：依赖与日志若落在 `C:\Users\...` 会迅速占满系统盘。以下三条为**每个开发单元启动前**的硬性约束；口令见 [附录 A](#附录-a快速启动口令) 中的「磁盘约束后缀」。

| #   | 约束项            | 强制规则                                                                                                                                                                                | 验证方法                                                                                                    |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | **npm 缓存**      | 仓库根目录 `.npmrc` 已配置 `cache=D:\npm-cache`；禁止改回用户目录默认缓存                                                                                                               | 在仓库根执行：`npm config get cache` → 输出 `D:\npm-cache`                                                  |
| 2   | **node_modules**  | **仅**在 `D:\coding\dayangyunjie-code` **根目录**执行 `npm install`（workspace 会装到各 `apps/*`）；禁止在 `C:\Users\...`、资料区 `D:\coding\dayangyunjie\` 或任意 C 盘路径执行 install | 安装后确认 `D:\coding\dayangyunjie-code\node_modules` 存在；C 盘用户目录下不应出现本项目名的 `node_modules` |
| 3   | **AI / 工具日志** | 统一写到 **`D:\coding\dayangyunjie-code\.cursor-logs\`**（已加入 `.gitignore`，不提交 Git）；系统临时目录使用 `D:\temp`                                                                 | 目录存在且可写；**禁止**把项目日志写到 `C:\Users\...\AppData`                                               |

#### 环境变量（建议 Windows 用户级设置一次）

在「系统属性 → 环境变量 → 用户变量」中新增或修改：

| 变量名             | 值             |
| ------------------ | -------------- |
| `NPM_CONFIG_CACHE` | `D:\npm-cache` |
| `TEMP`             | `D:\temp`      |
| `TMP`              | `D:\temp`      |

设置后**重启 Cursor**，再在仓库根执行上表验证命令。

#### 日志目录结构（建议）

```
D:\coding\dayangyunjie-code\.cursor-logs\
├── agent\          # Cursor Agent 会话导出、单元验收备注（可选手写）
├── terminal\       # 重要终端输出复制备份（可选）
└── prisma\         # prisma migrate 等长输出（可选）
```

#### 定期清理（必做）

| 频率           | 操作                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------- |
| **每周**       | 删除 `.cursor-logs` 下超过 **14 天** 的文件；清空 `D:\temp` 中超过 7 天的临时文件             |
| **每月**       | 检查 `D:\npm-cache` 体积；可执行 `npm cache clean --force` 后重新 install（仅在无编译任务时） |
| **C 盘紧张时** | 立即清理上述目录；用「磁盘清理」检查是否误在 C 盘安装了本项目 `node_modules`                  |

> **给 Cursor Agent 的固定要求**：执行任何 `npm install` / `npx` 前，先 `cd D:\coding\dayangyunjie-code`；不得修改 `.npmrc` 中的 `cache` 路径；不得将日志写入 C 盘。

---

## 三、通用执行流程（每个单元都适用）

无论哪个开发单元，执行流程都是一样的。把这个流程刻在脑子里：

```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  第一步: 启动                                            │
│  ─────────────────                                      │
│ 我对 Cursor Agent 说：                                    │
│  "开始 [单元编号]，[一句话描述要做什么]"                     │
│                                                           │
│  例如:                                                    │
│  "开始 P1.2，把 docs/Schema.md 转译为 Prisma Schema 文件"   │
│  "开始 P2.5a，实现 CleaningOrder CRUD 模块"               │
│  "开始 P3.3，实现居民端保洁预约三步向导页面"               │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  第二步: AI 执行                                         │
│  ────────────────────                                   │
│  Cursor Agent 自动做以下事情：                             │
│  ✓ 读取相关文档（需求 / 技术 / 数据库设计）                │
│  ✓ 读取项目中已有的代码                                   │
│  ✓ 生成/修改代码文件                                      │
│  ✓ 运行命令验证（如 npm run build）                       │
│  ✓ 告诉我完成了                                          │
│                                                           │
│  ★ 这一步我不需要做任何事情，等待即可                       │
│  ★ 根据单元复杂度，可能等待 2-10 分钟                      │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  第三步: 我来审查 ⚠️ 重要！                               │
│  ─────────────────────                                  │
│  AI 完成后，告诉我它做了什么。然后我需要：                  │
│                                                           │
│  ① 看一眼 AI 列出的"生成了哪些文件"                        │
│     → 数量对不对？文件名合理吗？                           │
│                                                           │
│  ② 让 AI 展示关键文件的内容                               │
│     → 不需要看懂每一行代码                                │
│     → 只需要看：有没有明显的遗漏（比如某个功能没实现）      │
│                                                           │
│  ③ 如果发现问题，直接用中文告诉 AI                         │
│     → "ServiceCatalog 缺了 sortOrder 字段"               │
│     → "登录页没有隐私协议弹窗"                             │
│     → AI 会立刻修复                                       │
│                                                           │
│  ④ 如果没问题或修复后 OK 了，说 "继续下一个单元"            │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  第四步: 测试验收 ⚠️ 必做！                              │
│  ─────────────────────                                  │
│  每个单元都有明确的"测试标准"（见下方各单元详细说明）。       │
│  我需要按照标准实际操作一遍，确认能用。                      │
│                                                           │
│  测试方式因单元类型而异（见下方）：                          │
│  - 后端 API 单元 → 用 Swagger 页面点一下接口              │
│  - 小程序页面 → 用微信开发者工具走一遍流程                 │
│  - 管理后台 → 用浏览器打开页面操作一遍                     │
│  - 配置/脚手架 → 看能不能正常启动/编译                      │
│                                                           │
│  ★ 测试通过了才能进入下一个开发单元                          │
│  ★ 测试不通过 → 告诉 AI 问题现象 → AI 修复 → 重新测试      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 我在每个环节的具体动作总结

| 环节     | 我做什么                             | 花多少时间 |
| -------- | ------------------------------------ | ---------- |
| 启动     | 对 AI 说一句话启动单元               | 10 秒      |
| AI 执行  | **什么都不做，等待**                 | 2-10 分钟  |
| 审查     | 看文件列表 + 浏览关键内容 + 反馈问题 | 10-30 分钟 |
| 测试验收 | 按测试标准手动操作验证               | 15-45 分钟 |

**标注 2h 的开发单元，实际我需要投入约 30-75 分钟（含审查+测试）。**

---

## 四、模型切换策略

Cursor Agent 可切换不同 AI 模型来完成不同类型的开发工作（在 Cursor 聊天面板顶部的模型下拉框中选择）：

| 模型档位    | 推荐选择                                             | 特点                       | 适用场景                                  |
| ----------- | ---------------------------------------------------- | -------------------------- | ----------------------------------------- |
| 默认 / Fast | Composer Fast 或 Auto                                | 响应快，适合标准操作       | 脚手架搭建、CRUD 模板、配置文件           |
| 强模型      | Composer 能力更强的模型（如 Claude Sonnet / GPT 等） | 代码质量更高，复杂逻辑更稳 | 订单状态机、微信集成、小程序页面、ECharts |

### 分配规则

```
┌────────────────────────────────────────────────────────┐
│  阶段          工时     模型档位      切换时机             │
│────────────────────────────────────────────────────────│
│  P1 基础设施    16h      默认/Fast    不需切换            │
│  P2.1~2.4      12h      默认/Fast    不需切换            │
│  P2.5a~2.6a    15h      强模型        ← 进入 P2.5a 时切换 │
│  P2.7~2.15     28h      强模型        继续使用（含v2.0）  │
│  P3 全部       28h      强模型        继续使用            │
│  P4 全部       22h      强模型        继续使用            │
│  P5.1~5.6      24h      默认/强模型   ← 可切回 Fast       │
│  P5.7~5.11     13h      默认/Fast     继续使用            │
│  P6 全部       12h      默认/Fast     继续使用            │
└────────────────────────────────────────────────────────┘
```

### 如何切换模型

在 Cursor 聊天面板顶部点击**模型名称**，从下拉列表中选择对应档位即可。

> **重要提示**: 第一次切换到强模型时（进入 P2.5a），请 @ 引用 `docs/CodingPlan.md` 对应单元，并让 AI 生成上下文摘要文档，确保新对话能接上之前的工作成果。

---

## 五、上下文继承机制

### 为什么需要这个

当从一个模型档位切换到另一个时（例如从 Fast 切换到强模型），新对话可能看不到之前的聊天记录。就像换了一个新的技术助手，它不知道之前做了什么。

### 解决办法

在关键节点，AI 会**自动生成一份"交接文档"**，包含：

- 已完成的开发单元列表
- 已创建的文件及其作用
- 重要的类名/方法名/API 接口地址
- 下一个单元需要知道的关键信息

### 自动生成交接文档的节点

| 节点                        | 生成的文档                    | 内容                                       |
| --------------------------- | ----------------------------- | ------------------------------------------ |
| P2.4 完成后 → 进入 P2.5a 前 | `OrderModule-API-Contract.md` | 用户/认证模块的全部 API 接口列表           |
| P2.11 完成后 → 进入 P3 前   | `Backend-API-Summary.md`      | 后端全部接口路径/参数/返回值，供小程序对接 |
| P3 完成后 → 进入 P4 前      | `MiniApp-Architecture.md`     | 居民端的页面结构、store 设计、组件复用说明 |

**这些文档不需要我自己编写，AI 会在到达这些节点时自动提示并生成。**

---

## 六、权限说明总表

### AI（Cursor Agent）已有的能力

| 能力         | 状态                    | 说明                       |
| ------------ | ----------------------- | -------------------------- |
| 读写项目文件 | ✅ 已有                 | 可以创建/修改/删除代码文件 |
| 运行终端命令 | ✅ 已有（Agent 模式下） | 可以运行 npm、npx 等命令   |
| Node.js 环境 | ✅ 已有                 | Node.js 22+ 已安装         |
| Python 环境  | ✅ 已有                 | Python 3.13+ 已安装        |

### 需要我提供的资源/账号

| 资源                        | 何时需要 | 怎么给 AI                                               | 安全注意事项                      |
| --------------------------- | -------- | ------------------------------------------------------- | --------------------------------- |
| **GitHub 账号**（代码托管） | P1 起    | 已记录用户名 `zhangjun2046` + Token（见上方账号信息块） | AI 会在 P1 配置 git remote 和推送 |
| MySQL 连接信息              | P1.2 起  | 告诉 AI 地址、端口、用户名、密码                        | 开发期用简单密码即可              |
| 微信小程序 AppID            | P3/P4 起 | 告诉 AI AppID 和 AppSecret                              | Secret 写入 .env，不提交到 git    |
| 腾讯云 COS 密钥             | P2.9 起  | 告诉 AI SecretId 和 SecretKey                           | 同上，写入 .env                   |

### 我的账号速查

| 平台       | 用户名/邮箱                                                        | 用途                                |
| ---------- | ------------------------------------------------------------------ | ----------------------------------- |
| **GitHub** | `zhangjun2046` / `13810779530@139.com`                             | 代码托管、版本备份（P1 起全程使用） |
| Token      | `github_pat_11BQEO...OtkpD`（完整 Token 见上方 GitHub 账号信息块） | 用于推送认证（替代密码）            |

### AI 做不到的事

| 事项              | 原因              | 替代方案                                |
| ----------------- | ----------------- | --------------------------------------- |
| 登录腾讯云控制台  | AI 没有浏览器     | 我自己登录操作，然后把需要的密钥告诉 AI |
| 登录微信公众平台  | 同上              | 同上                                    |
| 手机扫码授权      | 需要真人操作      | 我自己在手机上操作                      |
| 注册/实名认证账号 | 需要身份证/手机号 | 我自己注册                              |

---

## 七、分阶段开发单元详解

### P1 基础设施（16h）

**目标**: 搭建整个项目的基础骨架，让三个端（后端/居民小程序/管理后台）都能跑起来。

---

#### P1.1 NestJS 项目脚手架 + Prisma 初始化（3h）

> **验收状态**：✅ **已通过**（2026-06-02）  
> 验收依据：① `cd apps/server && npm run build` 无报错；② `prisma/schema.prisma` 存在（207 字节，仅 generator/datasource 占位）。  
> 下一单元：[P1.2](#p12-schemaprisma-编写4h)

**干什么**

创建后端项目的基本结构。包括：

- NestJS 项目初始化（类似盖房子先搭框架）
- 安装 Prisma（数据库工具）
- 配置基础的项目结构

**Cursor Agent 干什么**

- 创建 `apps/server/` 目录及全部基础文件
- 配置 `package.json`、`tsconfig.json`、`nest-cli.json`
- 安装所需依赖包
- 初始化 Prisma 配置
- 运行 `npm run build` 验证编译通过

**人工干什么**

- ✅ 等待 AI 完成（约 5-10 分钟）
- ✅ 确认终端显示 "Build succeeded"
- ✅ 对 AI 说 "继续"

**使用模型**: 默认/Fast

**需要权限**: 文件读写、终端命令（npm install）、Node.js 环境

**测试标准 — 通过后方可进入 P1.2**:

1. 终端运行 `cd apps/server && npm run build` 显示成功 — ✅ 2026-06-02 已验
2. `apps/server/prisma/` 目录存在且包含 `schema.prisma` 文件（此时为空） — ✅ 2026-06-02 已验

---

#### P1.2 Schema.prisma 编写（4h）

> **验收状态**：✅ **已通过**（2026-06-02）  
> 验收依据：① `schema.prisma` + `seed.ts` + 迁移 `20260602120000_init_schema`；② `npx prisma migrate deploy` / `migrate status` 显示 up to date（本机 dev 账号无 shadow 库权限，未用 `migrate dev`）；③ `npx prisma db seed` 成功；④ 人工 Prisma Studio：`dev_db` 可见 12 张业务表，Admin×1、ServiceCatalog×10。  
> 下一单元：[P1.4](#p14-uni-app-双端骨架4h)（待启动）

**干什么**

把 `docs/Schema.md`（数据库设计文档）翻译成 Prisma 能理解的格式。这是整个系统的数据基石——所有数据都要存进这个数据库里。

包含：

- 13 个数据模型（用户表、订单表、评价表等）
- 8 个枚举（订单状态、支付状态等）
- 表之间的关联关系（订单属于谁、谁下了单等）
- 索引（加速查询）
- 种子数据（测试用的假数据）

**Cursor Agent 干什么**

- 读取 `docs/Schema.md` 全文
- 生成 `apps/server/prisma/schema.prisma` 文件（约 300 行）
- 生成种子数据文件 `apps/server/prisma/seed.ts`
- 运行 `npx prisma migrate dev` 在 MySQL 中建表
- 运行 `npx prisma db seed` 写入种子数据

**人工干什么**

- ✅ 等待 AI 完成
- ✅ AI 会列出"生成了 X 个模型、Y 个枚举"，核对数量是否为 13 个模型 + 8 个枚举
- ✅ 如发现遗漏（如"少了 ServiceCatalog 的 sortOrder 字段"），反馈给 AI
- ✅ 确认终端显示 migrate 成功（数据库表已建立）

**使用模型**: 默认/Fast

**需要权限**: 文件读写、终端命令（prisma migrate）、MySQL 连接

**测试标准 — 通过后方可进入 P1.3**:

1. 数据库迁移成功执行，无报错 — ✅ 2026-06-02 已验（`migrate deploy`；等价于 dev 的 deploy 结果）
2. `npx prisma studio` 打开后能看到全部业务表结构 — ✅ 2026-06-02 已验（12 张业务表；v1.1 无 WorkerCertificate，非文档旧称 13 张）
3. `npx prisma db seed` 成功写入种子数据 — ✅ 2026-06-02 已验（Admin×1、ServiceCatalog×10）

---

#### P1.3 共享类型包 packages/shared/（2h）

> **验收状态**：✅ **已通过**（2026-06-02）  
> 验收依据：① `packages/shared` 含 8 枚举、labels、实体出参、请求 DTO、统一 `ApiResponse`；② 根目录 `npm run build` 链式构建 shared → 三端 smoke → server 无报错；③ `apps/server` 健康检查返回 `orderStatusSample`；④ `apps/miniapp-customer` / `miniapp-worker` / `admin` 各含 `shared-smoke.ts` 引用枚举。  
> 下一单元：[P1.4](#p14-uni-app-双端骨架4h)（待启动）

**干什么**

创建一个"共享词典"。因为后端、居民端、管理后台都会用到相同的数据类型定义（如"订单状态有哪些"、"性别枚举是什么"），把它们集中到一个地方，避免重复定义导致不一致。

**Cursor Agent 干什么**

- 创建 `packages/shared/` 目录
- 定义全部 DTO（数据传输对象）、枚举、通用响应类型
- 配置 TypeScript 编译
- 验证三个 app 都能 import 这个包

**人工干什么**

- ✅ 确认编译通过
- ✅ 无需深入查看具体代码（这是纯机械性的类型定义）

**使用模型**: 默认/Fast

**需要权限**: 文件读写、Node.js

**测试标准 — 通过后方可进入 P1.4**:

1. `npm run build` 无报错
2. AI 演示从三个 app 分别 import shared 包中的枚举（如 `OrderStatus`）不报错

---

#### P1.4 uni-app 双端骨架（4h）

> **验收状态**：✅ **已通过**（2026-06-02）  
> 验收依据：① `apps/miniapp-customer` / `apps/miniapp-worker` 已完成 uni-app Vue3+Vite 工程化骨架；② 两端 `pages.json` 均含 3 个 tabBar 并可切换；③ 根目录 `npm run build` 全链通过；④ H5 双端开发服务可独立启动（5174 / 5175）。  
> 下一单元：[P2.1](#p21-auth-模块--jwt--微信登录6h)（待启动）

**干什么**

创建两个小程序项目的基本框架：

- **居民端**: 居民使用的微信小程序（下单、查订单、评价）
- **员工端**: 清洁员工使用的微信小程序（接单、签到、拍照）

两个项目共用一套 uni-app 代码库，但通过条件编译区分不同功能。

> **已确认落地方式（P1.4）**：采用 **两个独立 uni-app 工程**（monorepo 两个 workspace）：
>
> - `apps/miniapp-customer`（居民端）
> - `apps/miniapp-worker`（员工端）  
>   两端各自维护 `pages.json/tabBar` 与 `manifest.json/appid`，共享类型通过 `@dayangyunjie/shared`；如后续需要复用 UI/逻辑，再按 P3/P4 迭代抽到 `packages/*` 或使用 `#ifdef` 条件编译。

**Cursor Agent 干什么**

- 创建 uni-app 项目结构
- 配置底部导航栏（首页/订单/我的）
- 配置微信小程序编译选项
- 安装 UI 组件库（uni-ui）
- 验证 H5 模式可编译运行

**人工干什么**

- ✅ 确认 H5 模式可以启动（浏览器打开能看到页面）
- ✅ 底部导航栏可以看到几个 tab（即使点击后是空白页也正常）
- ✅ 确认有两个入口：居民端、员工端

**使用模型**: 默认/Fast

**需要权限**: 文件读写、Node.js、npm

**测试标准 — 通过后方可进入 P1.5**:

1. H5 开发模式启动成功，浏览器可见底部 tabbar
2. 点击不同 tab 能切换页面（内容可以是空的）

---

#### P1.5 Vue 3 管理后台脚手架（3h）

**干什么**

创建管理后台（物业管理人员使用的网页系统）的基础框架。基于一个叫 vue3-element-admin 的开源模板搭建。

**Cursor Agent 干什么**

- 基于 youlai 模板初始化 Vue 3 项目
- 配置路由系统（页面跳转规则）
- 配置布局框架（侧栏菜单 + 顶部导航 + 内容区）
- 封装 HTTP 请求模块（axios）
- 配置登录页
- 验证 `npm run dev` 可启动

**人工干什么**

- ✅ 浏览器打开管理后台地址
- ✅ 能看到登录页面
- ✅ 能看到侧栏菜单（即使还没连接真实登录功能）

**使用模型**: 默认/Fast

**需要权限**: 文件读写、Node.js、npm

**测试标准 — 通过后 P1 阶段完成**:

1. `npm run dev` 启动成功
2. 浏览器访问看到登录页渲染正常
3. 侧栏布局框架可见

**🎉 P1 阶段验收标准**: 在 `D:\coding\dayangyunjie-code` 根目录 `npm run build` 成功；`apps/server/prisma/schema.prisma` 已按 `docs/Schema.md` 建表并 seed；居民端/员工端/管理后台三个脚手架均可启动（Auth 登录属 P2.1）。

---

### P2 后端核心 API（40h）

**目标**: 实现后端全部业务逻辑接口。这是整个系统的大脑——小程序和管理后台的所有数据交互都靠这里。

> **注意**: 从 P2.5a 开始切换到 **强模型**。

---

#### P2.1 Auth 模块 — JWT + 微信登录（6h）

> **验收状态**：✅ **已通过**（2026-06-02）  
> **需求确认（范围冻结）**：仅覆盖 **Resident** 微信登录 + JWT；**Worker/Admin 登录不在 P2.1 范围内**。  
> **微信模式确认**：P2.1 采用**纯 mock**（`code -> 固定 openid`），并预留真实微信 `code2session` 接入点（后续阶段切换）。  
> 验收依据：① Swagger `http://localhost:3000/api/docs` 可见 Auth 接口；② `POST /api/v1/auth/wechat-login`（mock code）返回 access/refresh token；③ `GET /api/v1/auth/profile` 带 token 返回 200、不带 token 返回 401；④ `POST /api/v1/auth/refresh` 可刷新 token。  
> 下一单元：[P2.2](#p22-用户-crud-模块5h)（待启动）

**干什么**

实现用户身份认证系统。就像小区的门禁系统——谁来了要验证身份，验过了才放行。

包含：

- 微信登录：用户在小程序里点"授权登录"→ 获取 openid → 系统识别用户身份
- JWT 令牌：登录成功后发一张"通行证"（token），后续每次请求带着这张证
- Token 刷新：通行证过期了可以换新的

**Cursor Agent 干什么**

- 创建 WechatModule（处理微信登录逻辑）
- 实现 JwtStrategy（JWT 验证策略）
- 创建 Guard（门卫，拦截未登录请求）
- 配合 Swagger 提供可测试的接口文档

**人工干什么**

- ✅ 理解概念即可（无需看代码）：微信登录 = 用微信号当身份证；JWT = 临时通行证
- ✅ 让 AI 用 Swagger 演示登录流程

**使用模型**: 默认/Fast

**需要权限**: 文件读写、终端、微信 AppID（可先用假值 mock）

**测试标准 — 通过后方可进入 P2.2**:

1. Swagger UI (`http://localhost:3000/api/docs`) 打开可见 Auth 相关接口
2. POST `/api/v1/auth/wechat-login` 传入微信 code 能返回 token（mock 模式下返回假 token）
3. 带 token 访问受保护接口返回数据（不带 token 返回 401 未授权）

---

#### P2.2 用户 CRUD 模块（5h）

> **验收状态**：✅ **已通过**（2026-06-02）  
> **需求确认（口径冻结）**：`Resident` 新增最小必填为 `openid`（其余字段可选）；`Worker/Admin` 接口接收明文 `password`，服务端 `bcrypt` 写入 `passwordHash`（查询不返回哈希）。  
> 验收依据：① Swagger 可见 `residents/workers/admins` CRUD 接口并可调用；② 三类用户均完成新增→查询→修改→删除闭环；③ `Worker/Admin` 密码为服务端加密存储（数据库非明文）。  
> 下一单元：[P2.3](#p23-地址管理模块2h)（✅ 已通过）

- **Resident（居民）**：小区住户的信息管理
- **Worker（清洁员工）**：服务人员的信息管理
- **Admin（管理员）**：后台管理人员的信息管理

**Cursor Agent 干什么**

- 为三张用户表分别生成 Controller + Service
- 实现 POST（新增）/ GET（查询）/ PUT（修改）/ DELETE（删除）接口
- 密码加密存储（bcrypt，存的是加密后的密码，不是明文）
- 接入 Swagger 文档

**人工干什么**

- ✅ 在 Swagger 页面上逐个点一下四个接口
- ✅ 新增一条测试数据 → 查询能查到 → 修改后再查 → 删除后查不到

**使用模型**: 默认/Fast

**需要权限**: 文件读写、终端、MySQL

**测试标准 — 通过后方可进入 P2.3**:

1. 三类用户的 CRUD 四个接口在 Swagger 中均可调用
2. 新增的用户密码经过加密存储（数据库中不是明文密码）

---

#### P2.3 地址管理模块（2h）

> **验收状态**：✅ **已通过**（2026-06-07）  
> **验收依据**：① Swagger `http://localhost:3000/api/docs` 可见 `addresses` 6 个接口（POST/GET 列表/GET 详情/PUT/PUT default/DELETE）；② 为 `residentId=1` 新增 3 个地址；③ `PUT /api/v1/addresses/:id/default` 设默认后，列表查询仅 1 条 `isDefault=true`；④ 删除 1 条非默认地址成功。  
> 下一单元：[P2.4](#p24-服务目录模块2h)（✅ 已通过）

**干什么**

居民的收货/服务地址管理。类似外卖 app 里的地址簿功能。

包含：

- 新增地址
- 编辑地址
- 删除地址
- 设置默认地址

**Cursor Agent 干什么**

- 生成 Address CRUD 全套接口
- 实现默认地址逻辑（设一个为默认时自动取消其他的默认标记）
- 绑定到 Resident 用户

**人工干什么**

- ✅ 用 Swagger 新增 3 个地址 → 设其中一个为默认 → 查询确认只有 1 个默认 → 删除 1 个非默认地址

**使用模型**: 默认/Fast

**需要权限**: 同上

**测试标准 — 通过后方可进入 P2.4**:

1. 新增/编辑/删除/设默认地址四个接口均可用
2. 设默认后只有一个地址的 isDefault=true

---

#### P2.4 服务目录模块（2h）

> **验收状态**：✅ **已通过**（2026-06-07，人工验收确认）  
> **验收依据**：① Swagger `http://localhost:3000/api/docs` 可见 `service-catalogs` 2 个接口（GET 列表/GET 详情）；② `?bizType=CLEANING/RECYCLING/CONSULT` 分别返回 3/2/5 条含参考价；③ 无 bizType 时返回 10 条 active 种子数据；④ 无效 bizType 返回 400；⑤ 已生成 [`OrderModule-API-Contract.md`](OrderModule-API-Contract.md)。  
> 下一单元：[P2.5a](#p25a-cleaningorder-crud--创建订单2h此处切换到强模型)（待启动）

**干什么**

维护平台提供的服务项目列表（保洁类型、废品回收类型等）。v2.0 起价格字段已封存，接口不返回价格信息（由 P2.12 迁移完成后生效）。

**Cursor Agent 干什么**

- 生成 ServiceCatalog 查询接口
- 支持按 bizType（保洁/废品/家政）筛选
- 返回服务名称、副标题、图标等信息（无价格字段）

**人工干什么**

- ✅ 用 Swagger 查询服务列表，确认能看到保洁/废品/家政分类的数据

**使用模型**: 默认/Fast

**需要权限**: 同上

**⚠️ P2.4 完成后，AI 会自动生成 `OrderModule-API-Contract.md` 交接文档。**

**测试标准 — 通过后准备切换模型进入 P2.5a**:

1. 小程序端可通过 API 获取三种服务的列表（v1.x 含参考价格；v2.0 由 P2.12 迁移后去除价格字段）
2. 数据来自 P1.2 写入的种子数据

---

#### P2.5a CleaningOrder CRUD + 创建订单（2h）🔄 **此处切换到强模型**

**干什么**

实现保洁订单的基础数据操作。注意这只是"创建和查询订单"，还不涉及状态流转（那是下一个单元的事）。

包含：

- 创建保洁订单（居民提交预约请求）
- 订单列表（支持分页、筛选）
- 订单详情
- 订单编号自动生成（CLN 前缀 + 时间戳）

**Cursor Agent 干什么**

- 读取 `OrderModule-API-Contract.md`（上一节点 AI 生成的交接文档）
- 创建 CleaningOrder Controller + Service
- 实现 create/list/getOne/update 方法
- 订单号生成规则：CLN + yyyyMMdd + 6位序号
- 计算 referenceAmount（预估金额 = `serviceDuration × priceMin`）
- 创建订单请求体显式必填 `residentId`（公开接口联调阶段）

**人工干什么**

- ✅ 用 Swagger POST 创建一个保洁订单 → 返回订单号以 CLN 开头
- ✅ 用 GET 查到刚创建的订单 → 信息一致

**当前状态**：✅ **P2.5a 测试通过（2026-06-07）**

**使用模型**: **强模型** ⬅️ **从这里开始切换**

**需要权限**: 文件读写、终端、MySQL

**测试标准 — 通过后方可进入 P2.5b**:

1. POST 创建订单返回 CLN 前缀订单号
2. GET 列表/详情能正确返回数据
3. referenceAmount 计算正确
4. POST 创建请求体显式必填 `residentId`

---

#### P2.5b CleaningOrder 状态机核心（3h）

**干什么**

这是**整个系统最核心、最复杂的业务逻辑**。定义保洁订单的状态流转规则——订单从"下单"到"最终完成"中间要经历哪些步骤，哪些转换是合法的，哪些是不允许的。

**保洁订单枚举定义（P2.5b 已确认，2026-06-07）**：

| 枚举值 | 系统状态名 | 触发动作 |
|---|---|---|
| `PENDING_ASSIGN` | 待派单 | 居民下单 |
| `ASSIGNED` | 已派单 | 运营后台分配员工（员工端显示"待接单"） |
| `ACCEPTED` | 已接单 | 员工点击「立即接单」 |
| `IN_SERVICE` | 服务中 | 员工「开始服务」含 GPS 签到 |
| `PENDING_REVIEW` | 待评价 | 员工完成服务（**保洁**）/ 居民「验收服务」（**废品**，v2.0 起，见 P2.15） |
| `REVIEWED` | 已评价 | 居民提交评价（终态） |
| `CANCELLED` | 已取消 | **仅从 `PENDING_ASSIGN` 触发**（终态） |

```
PENDING_ASSIGN → ASSIGNED → ACCEPTED → IN_SERVICE → PENDING_REVIEW → REVIEWED
     ↓（仅此处允许）
  CANCELLED
```

> **取消规则**：居民**仅可在 `PENDING_ASSIGN`（待派单）状态取消**。一旦进入 `ASSIGNED` 及后续状态，系统拒绝取消，提示用户联系客服。  
> **三端显示名**：除 `ASSIGNED` 在员工端显示"待接单"外，其余状态三端名称完全一致。  
> **不实现 paymentStatus**：线下收款留痕一期不做，数据模型中不含 `paymentStatus` 字段。

**Cursor Agent 干什么**

- 设计独立的 `OrderStateMachine` 类/方法集
- 实现每种状态的合法转移规则
- 非法转移抛出明确异常（如"不能从已完成状态退回待派单"）
- 编写状态流转测试用例
- 维护 order_status_log 审计日志（每次状态变更都留记录）

**人工干什么**

- ✅ **重点审查**: AI 会输出一张"状态流转规则表"，我需要对照需求文档确认每条规则正确
- ✅ 特别关注：取消操作的规则（哪些状态下允许取消？取消后退款？）
- ✅ 让 AI 跑一遍测试用例，所有状态流转场景都通过

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P2.5c**:

1. 每种合法状态跳转都能成功执行
2. 每种非法状态跳转都被正确拒绝并给出错误提示
3. order_status_log 每次状态变更都有记录
4. AI 提供的测试用例全部通过

---

#### P2.5c 派单 + GPS签到 + 完成操作接口（2h）

**干什么**

实现保洁订单的各种"操作按钮"对应的后端逻辑：

- **派单**：管理员分配员工 → 订单变为"已派单"
- **GPS 签到**：员工到达现场 → 上传位置 → 系统判断距离是否在 200m 内 → 订单变为"服务中"
- **完成服务**：员工上传完工照片 → 订单变为"待评价"
- **取消订单**：任意非终态下的取消操作

**Cursor Agent 干什么**

- 基于上一步的状态机，实现各操作 API endpoint
- GPS 校验：接收经纬度 → Haversine 公式计算距离 → 超距标记
- 操作前后触发状态变更（调用 P2.5b 的状态机）
- 返回操作结果和更新后的订单状态

**人工干什么**

- ✅ 用 Swagger 依次调用：创建订单 → 派单 → 模拟接单 → 模拟 GPS 签到 → 完成服务 → 确认状态依次正确变化
- ✅ 测试超距签到（故意传一个很远的坐标）→ 应被标记为异常

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后 P2.5（保洁订单）全部完成**:

1. e2e 全链路：居民下单 → 后台派单 → 员工接单 → GPS 签到 → 上传照片 → 完成 → 状态全程正确
2. 超距签到被正确标记

---

#### P2.6a RecyclingOrder CRUD + 状态机（3h）

> ⚠️ **v2.0 变更（见 P2.15）**：废品订单 `IN_SERVICE → PENDING_REVIEW` 的触发方由 worker `/complete` 接口改为 resident `/recycling-orders/:id/accept` 接口。P2.6a 已实现的 `/complete` 接口在废品模块中**仅供历史回归参考**，**v2.0 起以 P2.15 实现的 `/accept` 接口为准**；保洁订单仍由 worker `/complete` 触发，两端逻辑已分离。

**干什么**

废品回收订单的完整 CRUD 及操作接口（v1.x 基线）。废品状态链与保洁相同，字段差异仅在于 `estimatedWeight`（预估重量）替代 `serviceDuration`（服务时长）。

废品订单状态链（与保洁一致）：
```
PENDING_ASSIGN → ASSIGNED → ACCEPTED → IN_SERVICE → PENDING_REVIEW → REVIEWED
     ↓（仅此处）
  CANCELLED
```

**Cursor Agent 干什么**

- 复用 P2.5b 的状态机模式（状态链与保洁完全一致，**无** `PENDING_ACCEPTANCE`）
- 创建 RecyclingOrder Controller + Service
- 字段差异：`estimatedWeight`（预估重量 kg，供员工确认搬运工具）
- 订单号前缀改为 RCY
- 操作接口与保洁对称（v1.x）：`assign` / `accept` / `gps-checkin` / `complete`（v2.0 废品改由居民触发，见 P2.15）/ `cancel`

**人工干什么**

- ✅ 与 P2.5a 类似的 CRUD 测试流程
- ✅ 确认废品订单状态链无 `PENDING_ACCEPTANCE`，与保洁一致
- ✅ e2e 全链路（v1.x）：创建 → 派单 → 接单 → GPS 签到 → 完成 → 状态变 `PENDING_REVIEW`（v2.0 废品「完成」改由居民 `/accept` 触发，v1.x 回归仍有效）

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P2.7**:

1. POST 创建订单返回 RCY 前缀订单号，含 `estimatedWeight` 字段
2. 废品订单状态链与保洁一致（无 `PENDING_ACCEPTANCE`）
3. 五个操作接口（assign/accept/gps-checkin/complete/cancel）全部可用

---

#### P2.6b ~~废品特有流程~~（已并入 P2.6a）

> **已调整（2026-06-08）**：废品回收流程与保洁完全一致（v1.x），无"验收/称重/收款"独立流程。废品操作接口在 P2.6a 一并实现，本单元取消。原计划的以下接口在 v1.x **均不实现**：
> - ~~`POST /recycling-orders/:id/record-weight`~~（实际重量录入，废品不计价）
> - ~~`POST /recycling-orders/:id/accept-by-resident`~~（v1.x 无验收节点）
>
> **节省工时约 3h。**
>
> ⚠️ **v2.0 追加（P2.15）**：居民验收接口 `POST /recycling-orders/:id/accept` 已在 v2.0 补充单元 **P2.15** 重新实现。与 v1.x 取消的废品特有流程不同，v2.0 将居民验收作为正式业务节点：废品员工 GPS 签到进入 `IN_SERVICE` 后，须由居民在小程序点击「验收服务」触发 `IN_SERVICE → PENDING_REVIEW`，详见 P2.15 详解。

---

#### P2.7 ConsultOrder 咨询单模块（3h）

**干什么**

家政咨询需求的处理。相对简单，只有三个状态：

```
待跟进(FOLLOW_UP) → 跟进中(FOLLOWING) → 已完成(COMPLETED)
```

**Cursor Agent 干什么**

- ConsultOrder CRUD
- 简单的三态流转
- 订单号 CNS 前缀

**人工干什么**

- ✅ 提交咨询单 → 后台变更为跟进中 → 变更已完成，状态流转正确

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P2.8**:

---

#### P2.8 GPS 签到校验（2h）

**干什么**

独立的 GPS 距离计算服务。员工上传坐标后，系统计算与服务地址的距离，判断是否在允许范围内。

**Cursor Agent 干什么**

- Haversine 公式实现（根据两点经纬度计算地球表面距离）
- 距离阈值配置（默认 200 米）
- 超距标记 + 异常原因记录
- 独立为可复用的 Service

**人工干什么**

- ✅ 传入一组经纬度 → 看返回的距离数值是否合理（可以用手机 GPS 坐标粗略判断）
- ✅ 传入一个很远的位置 → 确认被标记为超距

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P2.9**:

1. 传入坐标 → 返回距离（米）
2. 超 200m 标记超距并记录说明

---

#### P2.9 COS 文件上传 + 水印（3h）

**干什么**

图片上传功能。员工拍摄的服务照片上传到腾讯云对象存储（COS），并在图片上自动添加水印（批次号 + 时间戳）。

**Cursor Agent 干什么**

- 集成 cos-nodejs-sdk-v5
- 图片上传接口（接收 multipart/form-data）
- sharp 库添加水印文字（订单号 + 当前时间）
- 私有桶存储 + 临时签名 URL 生成
- 开发期先用本地 `/uploads` 目录模拟，部署前切换 COS

**人工干什么**

- ✅ 用 Swagger 上传一张测试图片 → 能访问到图片 URL → 图片上有水印文字

**使用模型**: **强模型**

**需要权限**: 文件读写、终端、COS 密钥（开发期可跳过，用本地存储）

**测试标准 — 通过后方可进入 P2.10**:

1. 上传图片后访问 URL 可见水印（含订单号 + 时间）
2. 开发期本地存储模式也能正常工作

---

#### P2.10 评价与投诉模块（3h）

**干什么**

居民对服务的评价和投诉功能。

**评价**：星级（1-5）+ 标签标签（准时/专业/干净等）+ 文字评语 + 图片
**投诉**：投诉内容 + 凭证图片 → 管理人员处理 → 跟进记录 → 结案

**Cursor Agent 干什么**

- Review CRUD（评价）
- Complaint CRUD（投诉）
- ComplaintFollowUp（投诉跟进记录）
- 评价与订单关联

**人工干什么**

- ✅ 提交一次评价（选星、选标签、写文字）→ 查看评价详情 → 数据一致
- ✅ 提交一次投诉 → 添加处理跟进 → 结案

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P2.11**:

1. 评价提交成功，星/标签/文字/图均可保存
2. 投诉提交 → 处理跟进 → 结案，全流程状态正确

---

#### P2.11 数据看板聚合 API（2h）

**干什么**

为管理后台的数据看板提供统计数据。这些接口不做复杂计算，就是把数据库里的数据聚合成图表能用的格式。

包含：

- 近 7 日订单趋势（每天多少单）
- 服务类型分布（保洁/废品/家政各占多少比例）
- 满意度占比（五星/四星/三星等占比）
- 时段分布（哪个时间段下单最多）
- 员工绩效排名（谁完成单量最多、评分最高）

**Cursor Agent 干什么**

- 各统计聚合接口
- 返回数据格式适配 ECharts 图表组件入参
- 带时间范围筛选（本周/本月/自定义）

**人工干什么**

- ✅ 调用各聚合接口 → 返回的数字看起来合理（如总数 > 0、百分比加起来 = 100%）

**使用模型**: **强模型**

**需要权限**: 同上

**⚠️ P2.11 完成后（即 P2 v1.x 阶段完成），AI 会自动生成 `Backend-API-Summary.md` 交接文档。**

**测试标准 — 通过后方可进入 P2.12**:

1. 各聚合接口返回数据格式符合 ECharts 入参要求
2. 数据来源于种子数据或前面单元创建的测试数据

---

#### P2.12 Schema v2.0 迁移 + 代码适配（3h）

> **需求来源**：`requirement_v2.0.md` v2.0 / `docs/Schema.md` v2.0 / `apps/server/prisma/schema.prisma` v2.0

**干什么**

将数据库和代码库从 v1.x 升级至 v2.0 数据模型。主要包括：

- 运行 `prisma migrate` 将 v2.0 schema 同步到数据库（新增 Banner / Operator / ConsultFollowUp 三张表；Worker 新增 employeeNo/gender/idCard/position/nickname/emergency 等字段；Address 新增 contactName/buildingInfo/addressTag 字段）
- 更新 `seed.ts`：ServiceCatalog 去除价格字段（priceMin/priceMax/priceUnit/description 已从 schema 移除），新增 subtitle 字段；补充 Operator 初始示例记录（至少一条用途=接单）
- 更新 ConsultOrder 服务代码枚举引用：`PENDING → FOLLOW_UP`、`FOLLOWING_UP → FOLLOWING`（与 schema 枚举值对齐）
- 更新 OrderSource 枚举使用（删除 PROXY 引用，仅保留 MINIPROGRAM / PHONE）
- 全套回归测试通过（182 条 Jest 测试）

**Cursor Agent 干什么**

- 读取 `apps/server/prisma/schema.prisma`（已按 v2.0 更新）
- 执行 `npx prisma migrate dev --name v2_schema_update`
- 更新 `apps/server/prisma/seed.ts` 匹配新字段/枚举
- 定位并修复代码中使用旧枚举值（`PENDING` / `FOLLOWING_UP` / `PROXY`）的地方
- 运行 `npm run test` 验证全量回归通过

**人工干什么**

- ✅ Prisma Studio 验证三张新表（Banner / Operator / ConsultFollowUp）可见
- ✅ 确认 `db seed` 成功，ServiceCatalog 无价格字段，Operator 有初始记录（`运营客服 / 13800138000 / 接单`）
- ✅ Jest 全量回归通过（182 条，8 个 suite，2.877s）

**使用模型**: Sonnet 4.6

**验收结论**：✅ 2026-06-15 通过，可进入 P2.13

**测试标准 — 通过后方可进入 P2.13**:

1. Prisma Studio 可见 15 张业务表（含 Banner / Operator / ConsultFollowUp）
2. `npx prisma db seed` 成功，ServiceCatalog 副标题正常，Operator 初始记录存在
3. Jest 全量回归通过（无枚举引用错误）

---

#### P2.13 Worker 手机号+密码登录 + 密码管理接口（3h）

> **需求来源**：`requirement_v2.0.md` §4.0、§5.3.1、§10.2 #29

**干什么**

为员工端实现独立的手机号+密码登录体系（不使用微信授权），并提供密码自助修改和管理员重置功能：

- `POST /api/v1/auth/worker-login`：phone + password → JWT（独立于居民端微信登录，令牌中携带 `role=worker`）
- Worker 专属 JWT Strategy 与 Guard（区分 resident / worker 身份令牌）
- `PUT /api/v1/workers/:id/change-password`：员工自行修改密码（需旧密码验证）
- `POST /api/v1/workers/:id/reset-password`：管理员重置密码为完整手机号（Admin 权限）
- 密码均为 bcrypt 哈希，查询接口不返回 `passwordHash`

**Cursor Agent 干什么**

- 在 AuthModule 新增 `WorkerLocalStrategy`（phone/password）
- 新增 `WorkerJwtStrategy`（读取 worker JWT）和 `WorkerJwtGuard`
- 在 WorkersController 新增 `change-password` 和 `reset-password` 接口
- Swagger 文档标注

**人工干什么**

- ✅ Swagger 用手机号+密码调 `worker-login` → 返回 access token
- ✅ 用 worker token 访问员工专属保护接口 → 200；不带 token → 401
- ✅ 调 `reset-password` 后用手机号作为密码可重新登录

**使用模型**: **强模型**

**测试标准 — 通过后方可进入 P2.14**:

1. `POST /auth/worker-login` 返回 JWT token
2. Worker token 与 Resident token 互相隔离（各自 Guard 保护）
3. 重置密码后手机号可作为新密码登录

**验收结论**：✅ 2026-06-15 通过，可进入 P2.14

**使用模型**: Sonnet 4.6

---

#### P2.14 配置管理 CRUD 接口（ServiceCatalog / Banner / Operator）（4h）

> **需求来源**：`requirement_v2.0.md` §5.4.1–§5.4.6、§6.3–§6.5

**干什么**

为管理后台配置管理模块提供完整 CRUD 接口（P2.4 只实现了 ServiceCatalog 只读查询）：

- **ServiceCatalog（服务配置）**：
  - `POST /service-catalogs`（新增）
  - `PUT /service-catalogs/:id`（编辑：名称/副标题/图标/排序）
  - `DELETE /service-catalogs/:id`（删除）
  - `PATCH /service-catalogs/:id/toggle`（启用/停用，切换 `isEnabled`）
- **Banner（轮播图）**：
  - 完整 CRUD（新增/列表/详情/编辑/删除）
  - `GET /banners/active?displayTarget=RESIDENT`：查询当前有效轮播图（供小程序首页使用）
- **Operator（运营人员）**：
  - 完整 CRUD（新增/列表/编辑/删除）
  - `GET /operators/contact`：返回用途为「接单」的第一条记录（供居民端首页客服电话动态获取）

**Cursor Agent 干什么**

- 新增 `BannerModule`（Controller + Service）
- 新增 `OperatorModule`（Controller + Service）
- 扩展 `ServiceCatalogModule`（在已有只读接口基础上补充写操作）
- 编写 Jest 单元测试

**人工干什么**

- ✅ Swagger 验收：ServiceCatalog toggle 可切换启用/停用状态
- ✅ Banner 按 `displayTarget=RESIDENT` 筛选正确返回
- ✅ `GET /operators/contact` 返回接单运营人员信息

**使用模型**: **强模型**

**测试标准 — 通过后方可进入 P2.15**:

1. 三组接口（ServiceCatalog / Banner / Operator）CRUD 均可在 Swagger 中操作
2. `GET /banners/active` 仅返回 `isEnabled=true` 且在生效时间范围内的记录
3. `GET /operators/contact` 返回第一条用途为「接单」的运营人员

**验收结论**：✅ 2026-06-15 通过，**可进入 P2.15**

---

#### P2.15 家政跟进记录接口 + ConsultOrder v2.0 字段适配（需求修正）✅

> **需求来源**：`requirement_v2.0.md` §5.1.3、§10.2 #82、#98

**需求修正说明**

`requirement_v2.0.md` #92 括号中「废品由居民「验收服务」触发」为**错误描述**，已在 #98 更正。废品订单「服务中→待评价」与保洁订单完全对称，均由**员工端「完成服务」**按钮触发（`POST /recycling-orders/:id/complete`，该接口在 P2.6a 已实现）。代码中误引入的 `/resident-accept` 端点已在本次修正中撤销。

**已实现内容**

- **家政跟进记录**：
  - `POST /api/v1/consult-orders/:id/follow-ups`：新增跟进记录（ConsultFollowUp）
  - `GET /api/v1/consult-orders/:id/follow-ups`：获取跟进记录列表（按时间升序）
- **ConsultOrder 字段适配**：ConsultOrder 创建接口支持 v2.0 新增字段（isProxyOrder / serviceContactName / serviceContactPhone / serviceAddress / source / remark）
- **废品完成服务**：沿用 P2.6a 已有 `POST /recycling-orders/:id/complete`（员工触发，与保洁对称）

**测试结果**：63 tests passed（recycling×30 + consult×33），0 failed

**验收**：
- ✅ 为一条咨询单新增跟进记录 → GET 列表返回按时间顺序排列
- ✅ 废品订单 GPS 签到进 `IN_SERVICE` → 员工调 `/complete` → 状态变 `PENDING_REVIEW`
- ✅ 保洁订单 `/complete`（worker 触发）回归正常

---

### P3 居民端小程序（28h）

**目标**: 实现居民使用的微信小程序全部页面（基于需求文档 v2.0）。

> **继续使用强模型。**

---

#### P3.1 应用骨架 + 登录授权（3h）

> **验收状态**：✅ **已通过**（2026-06-17）  
> **验收依据**：① `App.vue` 配置隐私协议弹窗（`PrivacyModal.vue`）首次必弹，同意后调 `wx.login` → `/auth/wechat-login` 换取 JWT；② Pinia `auth store` 持久化登录态，刷新后免登录；③ `ProfileCompleteModal.vue` 在首次下单前弹出，支持 `getPhoneNumber` 快速授权或手动填写；④ `useRouteGuard` 路由守卫拦截未登录跳转至登录确认；⑤ 微信开发者工具 H5/mp-weixin 双模式可启动；`npm run build` 通过。  
> 使用 Sonnet 4.6 LLM 完成；下一单元：[P3.2](#p32-首页3h)
>
> **需求来源**：`requirement_v2.0.md` §3.0.1

**干什么**

小程序的"大门"：

- 启动时的隐私协议弹窗（首次使用必弹）；「我的」页可再次查看
- 微信授权登录（静默获取用户 openid）
- ✏️ **新增**：微信手机号快速授权（`getPhoneNumber`），首次下单时弹窗补全姓名+手机号（支持微信快速授权或手工输入）
- 登录状态持久化（下次打开不用重新登录）
- 页面路由拦截（没登录不能进某些页面）

**Cursor Agent 干什么**

- 配置 App.vue（应用入口）
- 实现微信 wx.login 获取 code → 发送到后端换取 openid/token
- 隐私协议弹窗组件（首次进入弹出）
- 首次下单前身份补全弹窗（姓名+手机号，支持 getPhoneNumber 快速填入）
- 路由守卫（拦截未登录访问）

**人工干什么**

- ✅ 微信开发者工具/H5 模式启动小程序
- ✅ 首次进入看到隐私协议弹窗，同意后完成登录
- ✅ 发起预约前弹出补全弹窗（首次），填入手机号后继续
- ✅ 关闭再重新打开 → 不再弹出协议

**使用模型**: **强模型**（Sonnet 4.6）

**需要权限**: 文件读写、Node.js、微信开发者工具

**测试标准 — 通过后方可进入 P3.2**:

1. 首次进入触发隐私协议弹窗 — ✅ 2026-06-17 已验
2. 首次下单前触发身份补全弹窗（支持手机号快速授权）— ✅ 2026-06-17 已验
3. 已登录状态下直接进入不弹窗 — ✅ 2026-06-17 已验

---

#### P3.2 首页（3h）

> **验收状态**：✅ **已通过**（2026-06-20）  
> **验收依据**：① 首页 Banner 从 `GET /banners/active?displayTarget=RESIDENT` 动态加载，无数据时展示品牌默认占位卡；② 三大服务卡片点击 → 服务详情页展示服务说明 + §1.6 边界声明四条；③ 详情页「立即预约」跳转对应三步向导（保洁/废品）；④ 底部客服条电话从 `GET /operators/contact` 动态获取，支持一键拨打；⑤ H5/mp-weixin 双模式 `npm run build` 通过。  
> 使用 Sonnet 4.6 LLM 完成；下一单元：[P3.3](#p33-保洁预约三步向导5h)  
> **需求来源**：`requirement_v2.0.md` §3.1

**干什么**

小程序的主屏幕，所有内容动态化：

- 品牌区：「大洋云洁·智享社区」标语
- ✏️ **营销 Banner**：从 `GET /banners/active?displayTarget=RESIDENT` 动态拉取轮播图（支持跳转链接），不再硬编码静态图片
- 三大服务入口卡片：保洁服务 / 废品回收 / 家政服务；副文案「专业上门·品质保障」；点击进入**服务详情页**（展示服务说明+§1.6 边界声明）→ 再点「立即预约」进入三步向导
- 客服联系条：「电话预约」按钮；电话号码从 `GET /operators/contact`（用途=接单的第一条）动态获取

**Cursor Agent 干什么**

- 首页布局和样式（适老化：大卡片、高对比）
- 调用 `/banners/active` 接口渲染轮播图（链接跳转）
- 三个服务卡片 → 服务详情页 → 立即预约跳转
- 调用 `/operators/contact` 接口获取客服电话

**人工干什么**

- ✅ 首页 Banner 为轮播图（可从后台配置）
- ✅ 点击服务卡片进入服务详情页，页面展示服务说明+边界声明
- ✅ 服务详情页「立即预约」跳入三步向导
- ✅ 客服电话按钮展示动态电话号码

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P3.3**:

1. Banner 轮播图从 API 动态加载（非硬编码）— ✅ 2026-06-20 已验
2. 服务卡片点击路径：卡片 → 详情页 → 立即预约 → 三步向导 — ✅ 2026-06-20 已验
3. 客服电话从 `/operators/contact` 动态获取 — ✅ 2026-06-20 已验

---

#### P3.3 保洁预约三步向导（5h）

> **验收状态**：✅ **已通过**（2026-06-20）  
> **验收依据**：① 服务类型从 `GET /service-catalogs?bizType=CLEANING&isEnabled=true` 动态加载，无参考价展示；② 步骤 2 日历（公历+农历）+ 时段（08:00–11:00 / 14:00–17:00）+ 地址区跳转 `/pages/address-select/index?from=cleaning`，空地址引导新增；③ 步骤 2 底部「为家人代下单」勾选，步骤 3 条件展示服务对象姓名/手机号；④ 确认页含服务须知（§1.6 边界声明），无价格字段；⑤ 提交 `POST /cleaning-orders`（`source=MINIPROGRAM`，代下单时 `isProxyOrder=true`）生成 CLN 前缀订单号；`npm run build` 通过。  
> 使用 Sonnet 4.6 LLM 完成；下一单元：[P3.4](#p34-废品回收预约三步向导4h)  
> **需求来源**：`requirement_v2.0.md` §3.2、§3.0.3、§3.0.4

**干什么**

**居民端最复杂的功能**。用户预约保洁服务三步完成：

```
第一步: 选择服务
  ├── 服务类型卡片（从 GET /service-catalogs?bizType=CLEANING&isEnabled=true 动态拉取）
  ├── 选择服务时长（± 步进器，单位小时，默认 2 小时）
  └── 不展示参考价（2.0 版本价格信息线下处理）

第二步: 预约时间
  ├── 日历组件（公历+农历，选择日期）
  ├── 时段选择（上午 08:00–11:00 / 下午 14:00–17:00）
  ├── ✏️ 服务地址：展示默认地址+脱敏手机号；点击跳至服务地址选择页
  │   └── 地址簿为空时弹窗引导新增，保存后自动回填
  └── ✏️ 「为家人代下单」勾选框（位于步骤 2 底部）

第三步: 确认订单
  ├── 信息汇总（服务类型、时长、预约时间、服务地址）
  ├── ✏️ 代下单信息区（勾选代下单时展示：服务对象姓名+手机号输入框）
  ├── 备注多行输入
  ├── 服务须知纯文本展示（包含 §1.6 全部边界声明：高空外窗/顽固污渍/贵重物品/上门确认）
  └── "确定预约" 按钮 → 成功页（展示 CLN 前缀订单号）
```

**Cursor Agent 干什么**

- Pinia store 管理三步数据
- 服务类型动态拉取（`/service-catalogs?bizType=CLEANING`）
- 步骤 2：服务地址选择页跳转（§3.0.4）+ 空地址引导新增逻辑
- 步骤 2：代下单勾选框（底部）
- 步骤 3：代下单信息填写区（条件展示）；服务须知完整文本；无价格展示
- 省/市/区级联选择器默认锁定「北京市/朝阳区」灰色禁用态
- 提交时 `source=MINIPROGRAM`，代下单时 `isProxyOrder=true`

**人工干什么**

- ✅ 步骤 1：服务类型为后台配置的动态数据（非硬编码）；无价格显示
- ✅ 步骤 2：点击地址区域跳转地址选择页；地址簿为空时引导新增
- ✅ 步骤 2：勾选「为家人代下单」后步骤 3 出现服务对象填写区
- ✅ 步骤 3：服务须知包含全部边界声明；无参考价
- ✅ 完整走通 → 生成 CLN 开头订单号

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P3.4**:

1. 完整走通三步提交，生成 CLN 前缀订单号（无价格字段）— ✅ 2026-06-20 已验
2. 代下单开关有效：`isProxyOrder=true` + 被服务人信息写入订单 — ✅ 2026-06-20 已验
3. 服务地址选择页可用；空地址引导流程正常 — ✅ 2026-06-20 已验

---

#### P3.4 废品回收预约三步向导（4h）

> **验收状态**：✅ **已通过**（2026-06-20）  
> **验收依据**：① 复用 P3.3 三步向导框架（Pinia store + 日历 + 地址选择页 + 代下单）；② 步骤 1 从 `GET /service-catalogs?bizType=RECYCLING` 动态加载回收类型，预估重量步进器（默认 5kg）；③ 提交 `POST /recycling-orders`（`source=MINIPROGRAM`，含代下单字段）生成 RCY 前缀订单号；④ 确认页无价格字段；`npm run build` 通过。  
> 使用 Sonnet 4.6 LLM 完成；下一单元：[P3.5](#p35-家政咨询流程2h)  
> **需求来源**：`requirement_v2.0.md` §3.3

**干什么**

与保洁预约结构一致，三步向导：

```
第一步: 选择回收类型
  ├── 大件类 / 小件类卡片（从 /service-catalogs?bizType=RECYCLING 动态拉取）
  └── 预估重量步进器（默认 5kg）

第二步: 预约时间（同保洁，含地址选择 + 「为家人代下单」勾选框）

第三步: 确认订单
  ├── 回收类型、预估重量、预约时间/地址
  ├── 代下单信息区（勾选时展示）
  ├── 备注
  ├── 服务须知（含 §1.6 边界声明）
  └── 不展示参考价；生成 RCY 前缀订单号
```

**Cursor Agent 干什么**

- 复用 P3.3 的向导框架和地址选择逻辑
- 步骤 1 改为废品回收类型（大件/小件 + 预估重量步进器）
- 调用 RecyclingOrder 创建接口；`source=MINIPROGRAM`

**人工干什么**

- ✅ 完整走通 → 生成 RCY 开头订单号
- ✅ 代下单流程同保洁，验证 `isProxyOrder=true`
- ✅ 确认页无价格字段

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P3.5**:

1. 废品预约完整走通，生成 RCY 前缀订单号 — ✅ 2026-06-20 已验
2. 代下单功能与保洁一致 — ✅ 2026-06-20 已验

---

#### P3.5 家政咨询流程（2h）

> **验收状态**：✅ **已通过**（2026-06-20）  
> **验收依据**：① 服务类型从 `GET /service-catalogs?bizType=CONSULT&isEnabled=true` 动态加载（非硬编码）；② 两步向导：Step 1 类型选择卡片 + Step 2 需求填写；③ 代下单开关勾选后展示服务对象姓名/手机号；④ 表单无服务地址字段；⑤ 提交 `POST /consult-orders`（`source=MINIPROGRAM`，含代下单字段）生成 CNS 前缀订单号；`npm run build` 通过。  
> 使用 Sonnet 4.6 LLM 完成；下一单元：[P3.6](#p36-我的订单列表详情6h)  
> **需求来源**：`requirement_v2.0.md` §3.4、§10.2 #61、#71

**干什么**

家政服务咨询需求提交：

```
类型选择页（服务类型从 /service-catalogs?bizType=CONSULT 动态拉取）
  ↓
填写需求页
  ├── ✏️ 「是否为家人代下单」勾选框（勾选后展示服务对象姓名/手机号）
  ├── 核心诉求（多行文本）
  ├── 联系人姓名、联系电话
  └── 不含服务地址字段（运营电话回访后录入）
  ↓
提交成功（CNS 前缀编号）
```

**Cursor Agent 干什么**

- 家政类型选择页（动态拉取，非硬编码）
- 填写需求表单（包含代下单开关+服务对象信息区）
- **不含地址字段**（家政为咨询单，地址由运营电话获取）
- 提交 → 调用 ConsultOrder 创建接口

**人工干什么**

- ✅ 服务类型为动态数据
- ✅ 勾选代下单 → 展示服务对象姓名/手机号填写区
- ✅ 表单无服务地址字段
- ✅ 提交 → 看到 CNS 编号

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P3.6**:

1. 提交咨询单生成 CNS 前缀编号 — ✅ 2026-06-20 已验
2. 代下单字段正确传入 — ✅ 2026-06-20 已验
3. 无服务地址字段 — ✅ 2026-06-20 已验

---

#### P3.6 我的订单—列表+详情（6h）

> **需求来源**：`requirement_v2.0.md` §3.5、§3.6、§3.7、§2.1、§2.5

**干什么**

订单管理中心，v2.0 重大更新：

**订单列表页**：

- ✏️ **顶 Tab**：保洁服务 / 废品回收 / **家政服务**（新增家政 Tab）
- 保洁/废品状态筛选使用聚合展示名：全部 / 待服务 / 进行中 / 待反馈 / 已完成 / 已取消
- 家政 Tab 状态筛选：全部 / 待跟进(FOLLOW_UP) / 跟进中(FOLLOWING) / 已完成(COMPLETED)
- 家政咨询单卡片显示运营联系方式（从 `/operators/contact` 获取）

**订单详情页**：

- ✏️ **待派单状态**：服务人员区域显示「等待平台为您分配服务人员」占位文案（无服务人员卡片）；底部新增「取消订单」按钮（弹窗确认 → CANCELLED）
- 服务进度时间轴：节点名与系统状态精确对应，「已完成」改为「已评价」（对应 REVIEWED）
- ✏️ **废品「服务中」态**：底部主按钮「验收服务」（蓝色）→ 调 `/recycling-orders/:id/accept` → 触发 PENDING_REVIEW
- ✏️ **不展示**实际重量、核定金额、已收款状态（三端均封存）
- 代下单场景展示「被服务人」姓名+手机号（完整显示，不脱敏）
- 评价时限：`PENDING_REVIEW` 状态 7 天内可提交；超时保持 PENDING_REVIEW 不变，不自动好评

**Cursor Agent 干什么**

- 订单列表页（三 Tab + 状态筛选胶囊 + 订单卡片）
- 三种订单详情模板（保洁/废品/家政）
- 时间轴组件（节点名按 §2.4 精确映射）
- 废品详情「验收服务」按钮逻辑
- 待派单「取消订单」按钮+确认弹窗
- 评价入口（仅 PENDING_REVIEW 且 7 天内）
- 下拉刷新 + 上拉加载更多

**人工干什么**

- ✅ 订单列表切换三 Tab（保洁/废品/家政）正常
- ✅ 待派单状态：无服务人员卡片，有取消按钮
- ✅ 废品「服务中」：有「验收服务」按钮，点击后状态变 PENDING_REVIEW
- ✅ 详情页无价格/重量/收款信息
- ✅ 时间轴末尾节点名为「已评价」

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P3.7**:

1. 三 Tab 切换正常，家政咨询单列表可见
2. 废品「验收服务」→ 状态变 PENDING_REVIEW
3. 待派单可取消，其他状态无取消按钮
4. 详情页无价格相关字段

---

#### P3.6_repair 废品回收验收改为员工触发

> **验收状态**：✅ **已通过**（2026-06-21）  
> **验收依据**：① 删除后端 `POST /recycling-orders/:id/resident-confirm` 接口及 `ResidentConfirmDto` DTO 文件；② 删除前端居民小程序「验收服务」按钮、`onResidentConfirm` 函数及 `residentConfirmRecycling` API 函数；③ 废品 `IN_SERVICE→PENDING_REVIEW` 仅保留员工端 `POST /recycling-orders/:id/complete`（与保洁完全对称）；④ 新增 4 项回归测试，全套 29 项通过；⑤ 更新 P4.5 计划（废品改为有完成服务按钮）；`npx tsc --noEmit` 后端 0 错误；使用 Sonnet 4.6 LLM 完成。

---

#### P3.7 评价页 + 投诉页 + 我的页（3h）

> **验收状态**：✅ **已通过**（2026-06-21）  
> **验收依据**：① 评价页 `POST /reviews`（星级+标签+文字+多图，PENDING_REVIEW 且 7 天内）；② 投诉页 `POST /complaints`（6 原因+描述+多图凭证，仅 ACCEPTED 及之后状态可见入口）；③ 我的页展示完整手机号（无昵称）；④ 服务地址管理页 CRUD + 设默认（`GET/POST/PUT/DELETE /addresses`）；⑤ 我的投诉列表+详情（`GET /complaints?residentId=` / `GET /complaints/:id`）；⑥ 订单详情页展示评价/投诉卡片；`npm run build` 通过。  
> 使用 Sonnet 4.6 LLM 完成；下一单元：[P3.8](#p38-代下单集成验证2h)  
> **需求来源**：`requirement_v2.0.md` §3.7、§3.8、§3.9、§3.0.3

**干什么**

**评价页**（PENDING_REVIEW 状态下可进入，7 天内有效）：

- 星级 1–5 星 + 快捷标签多选 + 文字 + 图片上传
- 提交后不可修改

**投诉页**（触发条件：订单状态 ≥ ACCEPTED）：

- 投诉原因单选（6 个选项）+ 问题描述必填 + 凭证图片**多张**上传
- 投诉自动关联当前订单（系统记录订单编号）

**我的页**（v2.0 变更）：

- ✏️ 用户信息区显示**完整手机号**（不展示微信昵称）
- ✏️ 地址管理入口改为「服务地址管理」→ 跳转服务地址管理页（含新增/编辑/删除/设默认）
- ✏️ 服务地址管理页：省/市/区级联默认锁定「北京市/朝阳区」灰色禁用态；地址标签（家/父母家）
- 消息通知：基于微信公众号模板消息+小程序订阅消息
- 客服联系方式、服务协议/隐私协议

**Cursor Agent 干什么**

- 评价表单页（评价时限校验 7 天）
- 投诉表单页（多张图片上传；ACCEPTED 状态后才可触发）
- 我的页面（手机号展示、服务地址入口）
- 服务地址管理页（CRUD + 设默认 + 省市区锁定）
- 服务地址选择页（列表选择 + 底部新增入口）

**人工干什么**

- ✅ 「我的」页显示完整手机号，无昵称
- ✅ 评价提交（选 5 星、选标签、写字）；REVIEWED 状态后不再可评
- ✅ 投诉只在 ACCEPTED 及之后状态可提交；支持多张图片
- ✅ 服务地址管理：新增/编辑/删除/设默认 均正常

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P3.8**:

1. 评价提交成功，7 天限时校验有效
2. 待派单/已派单状态下投诉按钮不可见
3. 「我的」页显示完整手机号
4. 服务地址 CRUD + 省市区锁定正常

---

#### P3.8 代下单集成验证（2h）

> **验收状态**：✅ **已通过**（2026-06-21）  
> **验收依据**：① 保洁/废品/家政三类代下单全流程：`isProxyOrder=true` + 被服务人姓名/手机号正确写入订单；② 订单详情页「被服务人」完整展示（不脱敏）；③ 修复保洁/废品提交前 `serviceContactName`/`serviceContactPhone` trim 一致性（与家政对齐）；④ 修复家政咨询单详情页误显示「等待分配服务人员」占位（加 `orderType !== 'consult'`）；⑤ 全量回归 240 项 Jest 通过；⑥ `npm run build` 通过；⑦ 已生成 [`MiniApp-Architecture.md`](MiniApp-Architecture.md) 交接文档。  
> 使用 Sonnet 4.6 LLM 完成；下一单元：[P4.1](#p41-登录页--员工身份认证2h)  
> **需求来源**：`requirement_v2.0.md` §3.10、§3.2、§3.3、§3.4

**干什么**

代下单功能已分散集成于 P3.3（保洁）/ P3.4（废品）/ P3.5（家政）各步骤中。P3.8 进行跨步骤集成联调与闭环验证：

- 保洁代下单全流程：步骤 2 勾选「为家人代下单」→ 步骤 3 填服务对象姓名+手机号 → 提交 → 订单详情展示「被服务人」信息（完整显示，不脱敏）
- 废品代下单全流程（同上）
- 家政代下单全流程：填写需求页勾选代下单 → 提交 → 咨询单列表展示
- 后端验证：`isProxyOrder=true`，`serviceContactName` / `serviceContactPhone` 正确存储

**Cursor Agent 干什么**

- 检查并修复三个预约流程中代下单数据传递的一致性
- 确认订单详情页「被服务人」信息展示逻辑

**人工干什么**

- ✅ 保洁/废品/家政各走一遍代下单流程 → 生成订单
- ✅ 订单详情页展示「被服务人」姓名+手机号（完整不脱敏）
- ✅ 数据库中 `isProxyOrder=true` + 被服务人字段有值

**使用模型**: **强模型**

**需要权限**: 同上

**⚠️ P3.8 完成后（即 P3 全部完成），AI 会自动生成 `MiniApp-Architecture.md` 交接文档。**

**测试标准 — 通过后 P3 阶段完成**:

1. 三类代下单订单 `isProxyOrder=true`，被服务人信息正确 — ✅ 2026-06-21 已验
2. 完整走通「预约保洁（代下单）→ 下单成功 → 查看订单详情 → 评价」闭环（废品/家政代下单列表与详情展示正确）— ✅ 2026-06-21 已验

---

### P4 员工端小程序（22h）

**目标**: 实现服务人员使用的微信小程序（基于需求文档 v2.0）。功能聚焦于"登录→接单→干活→交工"的工作流。

> **继续使用强模型。**

---

#### P4.1 登录页 + 员工身份认证（2h）

> **验收状态**：✅ **已通过**（2026-06-21）  
> **验收依据**：① 登录页 UI 参照原型（浅蓝渐变 + 手机号/密码输入 +「开始服务」按钮 + 底部协议勾选）；② `POST /auth/worker-login` 登录成功返回 Worker JWT 并持久化；③ 未勾选协议点登录 → 提示必须同意；④ 密码错误 → 提示错误；⑤ 登录成功 `switchTab` 进入首页；⑥ 路由守卫拦截未登录访问 tabBar 页面；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成。  
> 下一单元：[P4.2](#p42-首页待接单任务列表2h)  
> **需求来源**：`requirement_v2.0.md` §4.0、§10.2 #15 #29 #78

**干什么**

员工端独立登录页（不使用微信授权）：

- 手机号 + 密码登录表单
- 底部「我已阅读并同意《用户协议》和《隐私政策》」勾选框（必选才可登录）
- 初始密码为完整手机号（由管理后台创建员工时自动设置）
- 首次登录后可修改密码（「我的」→「设置」→「修改密码」）
- 忘记密码说明（引导联系管理员重置）
- 调用 `POST /auth/worker-login` 接口（P2.13 实现）

**Cursor Agent 干什么**

- 独立登录页（App 入口判断员工端）
- 登录表单（手机号/密码/协议勾选）
- 调用 worker-login 接口获取 JWT
- 登录状态持久化；路由守卫

**人工干什么**

- ✅ 输入手机号+密码（初始密码=手机号）→ 登录成功进首页
- ✅ 不勾选协议点登录 → 提示必须同意
- ✅ 密码错误 → 提示错误

**使用模型**: **强模型**

**需要权限**: 文件读写、Node.js、微信开发者工具

**测试标准 — 通过后方可进入 P4.2**:

1. 手机号+密码登录成功，进入首页
2. 协议勾选校验有效
3. Worker JWT 与 Resident JWT 隔离（不可互用）

---

#### P4.2 首页—待接单任务列表（2h）

> **验收状态**：✅ **已通过**（2026-06-21）  
> **验收依据**：① 首页仅展示 ASSIGNED 状态任务卡片（保洁+废品并发拉取合并，按预约时间升序）；② 卡片展示服务名称、预约日期（点分格式）、时段、地址（`addressSnapshot` 解析）；③「立即接单」调 accept 接口成功后卡片乐观移除；④ 无统计卡片、无待反馈列表；⑤ 下拉刷新 + 空状态；⑥ 后端列表 Query 新增 `workerId` 筛选（员工端专用）；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成。  
> 下一单元：[P4.3](#p43-我的任务列表3h)  
> **需求来源**：`requirement_v2.0.md` §4.1、§10.2 #16 #73

**干什么**

员工端首页简化为仅展示「待接单」任务（v2.0 大幅简化，删除统计卡片和待反馈列表）：

- 仅展示 **ASSIGNED（已派单但未接单）** 状态的任务卡片
- 每张卡片：服务类型图标、计划服务时间、服务地址
- 每张卡片操作按钮：**查看详情** 和 **立即接单**
- 点击「立即接单」→ 调 `/cleaning-orders/:id/accept` 或 `/recycling-orders/:id/accept`（接单操作）

**Cursor Agent 干什么**

- 首页仅渲染 ASSIGNED 状态任务列表（按时间排序）
- 任务卡片组件（含立即接单按钮）
- 接单成功后卡片消失（状态变 ACCEPTED）

**人工干什么**

- ✅ 首页仅显示待接单任务，无统计卡片和待反馈列表
- ✅ 点击「立即接单」→ 订单状态变 ACCEPTED，卡片消失

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P4.3**:

1. 首页无统计卡片、无待反馈列表
2. 仅展示 ASSIGNED 状态订单卡片
3. 接单操作状态变更 ASSIGNED → ACCEPTED 正确

---

#### P4.3 我的任务列表（3h）

> **验收状态**：✅ **已通过**（2026-06-21）  
> **验收依据**：① 任务页双 Tab（保洁服务/废品回收）切换列表；② 状态筛选胶囊使用精确系统状态名（已派单/已接单/服务中/待评价/已评价/已取消），无 PENDING_ASSIGN；③ `GET /cleaning-orders` / `GET /recycling-orders` 按 `workerId` + `statuses` 分页查询；④ ASSIGNED 卡片显示「查看详情」「立即接单」；⑤ 下拉刷新 + 上拉加载更多；⑥ `npm run build` 通过；使用 Sonnet 4.6 LLM 完成。  
> 下一单元：[P4.4](#p44-任务详情已派单已接单态4h)  
> **需求来源**：`requirement_v2.0.md` §4.2、§2.2、§10.2 #81

**干什么**

员工的全部任务历史视图：

- **顶 Tab**：保洁服务 / 废品回收
- **状态筛选胶囊**（使用精确系统状态值，不使用聚合展示名）：
  - 全部 / 已派单 / 已接单 / 服务中 / 待评价 / 已评价 / 已取消
  - **无** PENDING_ASSIGN（员工端不可见待派单订单）
- 任务卡片：服务类型、计划服务时间段、服务地址、状态标签

**Cursor Agent 干什么**

- Tab 切换（CLEANING / RECYCLING）
- 状态筛选（精确系统状态值，排除 PENDING_ASSIGN）
- 任务卡片组件
- 列表分页加载

**人工干什么**

- ✅ 切换 Tab 列表内容变化（保洁/废品分开）
- ✅ 筛选胶囊使用系统状态名（已派单/已接单/服务中/待评价/已评价/已取消）
- ✅ 列表无 PENDING_ASSIGN 状态订单

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P4.4**:

1. 状态筛选使用精确系统状态名
2. 无 PENDING_ASSIGN 状态订单显示

---

#### P4.4 任务详情—已派单/已接单态（4h）

> **验收状态**：✅ **已通过**（2026-06-21）  
> **验收依据**：① 新增 `pages/task-detail/index` 路由（蓝色导航栏）；② ASSIGNED 底部显示橙色提示 + 绿色「立即接单」，接单成功后刷新为 ACCEPTED；③ ACCEPTED 底部显示「开始服务」→ `uni.getLocation` + `POST /gps-checkin` → 状态变 IN_SERVICE，时间轴高亮「服务中」；④ 作业记录区 ASSIGNED/ACCEPTED 灰色禁用；⑤ 代下单展示「代下单人/被服务人」分区；⑥ 完整手机号 + 一键拨号 + 地址复制导航；⑦ `manifest.json` 声明 `requiredPrivateInfos: ["getLocation"]`；⑧ 后端 P4.4 单元测试 36 项通过；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成。  
> 下一单元：[P4.5](#p45-任务详情服务中态3h)  
> **需求来源**：`requirement_v2.0.md` §4.3、§10.2 #74 #80 #83

**干什么**

任务详情页（订单处于 ASSIGNED 或 ACCEPTED 状态时）：

- 头部：任务名、订单号、状态标签（精确系统状态名：「已派单」/「已接单」）
- 客户信息：完整手机号、一键拨号 + 地图导航（地址复制到剪贴板）
- ✏️ 代下单场景：展示「代下单人」与「被服务人」分区（完整手机号）
- 服务进度时间轴（done / active / pending 三态，精确显示当前节点）
- ✏️ 作业记录区（上传前后照片按钮）：**ASSIGNED / ACCEPTED 状态下灰色禁用态**，仅 IN_SERVICE 后可操作
- 底部按钮：**ASSIGNED →「立即接单」**；**ACCEPTED →「开始服务」** → GPS 签到 → 状态变 IN_SERVICE
- GPS 超距（>200m）：前端弹窗提示（后端不阻断）

**Cursor Agent 干什么**

- 任务详情页（多状态条件渲染）
- GPS 定位（wx.getLocation）→ 坐标发送到后端；开发工具失败时提供「模拟签到」
- 作业记录区按 status 控制 enabled/disabled 状态
- 代下单被服务人信息展示

**人工干什么**

- ✅ ASSIGNED 状态：仅「立即接单」可点，不可直接「开始服务」
- ✅ ACCEPTED 状态：点「开始服务」→ GPS 授权 → 状态变 IN_SERVICE → 时间轴高亮「服务中」
- ✅ 代下单订单展示被服务人信息

**使用模型**: **强模型**（Sonnet 4.6）

**需要权限**: 同上

**测试标准 — 通过后方可进入 P4.5**:

1. ACCEPTED 状态下「开始服务」触发 GPS 采集，状态变 IN_SERVICE — ✅ 2026-06-21 已验
2. ASSIGNED/ACCEPTED 状态下作业照片区为灰色禁用 — ✅ 2026-06-21 已验
3. ASSIGNED 不可直接开始服务，须先接单 — ✅ 2026-06-21 已验
4. 代下单订单展示被服务人信息 — ✅ 2026-06-21 已验

---

#### P4.5 任务详情—服务中态（3h）

> **验收状态**：✅ **已通过**（2026-06-22）  
> **验收依据**：① IN_SERVICE 进入作业区解锁，无 SOP 弹窗；② `handleAddPhoto` 调用 `uploadImage(filePath, orderNo)` → `POST /api/v1/upload/image?orderNo=xxx` → 后端 sharp SVG composite 叠加水印（订单号+时间戳，右下角白字黑描边）；③ 保洁/废品均显示「完成服务」按钮+确认弹窗 → 各自 `/complete` → 状态变 PENDING_REVIEW；④ 不展示实际重量/金额字段；⑤ 修复 `UPLOAD_BASE_URL` H5 模式返回空串导致上传 404 Bug（改为 `'/api/v1'` 条件编译与 `BASE_URL` 保持一致）；⑥ `npm run build` 通过；使用 Sonnet 4.6 LLM 完成。  
> 下一单元：[P4.6](#p46-任务详情待评价已完成态2h)  
> **需求来源**：`requirement_v2.0.md` §4.3（服务中部分）、§4.7、§10.2 #75 #76 #82 #83 #92

**干什么**

同一任务详情页在「服务中」(IN_SERVICE) 状态下的展示和操作：

- ✏️ **无 SOP 弹窗**（已从 v2.0 删除，进入 IN_SERVICE 后直接可操作）
- 作业记录区解锁：上传打扫前照片 + 打扫后照片（拍照/相册）；照片有水印（订单号+时间）
- **保洁订单**：新增「**完成服务**」按钮 → 弹窗「确认已完成本次服务？」→ 确认后调 `/cleaning-orders/:id/complete` → 状态变 PENDING_REVIEW
- **废品订单**：与保洁对称，新增「**完成服务**」按钮 → 弹窗确认 → 调 `POST /recycling-orders/:id/complete` → 状态变 PENDING_REVIEW；不展示实际重量/核定金额/已收款字段

**Cursor Agent 干什么**

- IN_SERVICE 状态下条件渲染（保洁/废品分支）
- 作业拍照+上传（调 `/upload/image`，含水印）
- 保洁：「完成服务」按钮+确认弹窗
- 废品：「完成服务」按钮+确认弹窗（与保洁对称）；展示预估重量；不展示实际重量/金额

**人工干什么**

- ✅ 进入服务中：无 SOP 弹窗，直接可上传照片
- ✅ 保洁：上传照片后点「完成服务」→ 状态变 PENDING_REVIEW
- ✅ 废品：有「完成服务」按钮，点击后状态变 PENDING_REVIEW（与保洁对称）
- ✅ 无实际重量、核定金额、已收款字段

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P4.6**:

1. 进入 IN_SERVICE 无 SOP 弹窗 — ✅ 2026-06-22 已验
2. 保洁「完成服务」正确触发 IN_SERVICE → PENDING_REVIEW — ✅ 2026-06-22 已验
3. 废品「完成服务」正确触发 IN_SERVICE → PENDING_REVIEW（与保洁对称），页面无重量/金额字段 — ✅ 2026-06-22 已验
4. 照片上传成功（含水印） — ✅ 2026-06-22 已验

---

#### P4.6 任务详情—待评价/已完成态（2h）

> **验收状态**：✅ **已通过**（2026-06-22）  
> **验收依据**：① PENDING_REVIEW/REVIEWED 状态详情页只读，无底部操作按钮；② 完整 6 节点时间轴（REVIEWED 全部 done）；③ 作业照片网格只读展示（按 `photoType` 分服务前/后）；④ REVIEWED 额外展示「用户评价」区（星级 ★/☆ + 标签胶囊 + 文字 + 图片网格 + 评价时间），通过 `GET /reviews?orderType=&orderId=` 懒加载；⑤ 新增 `apps/miniapp-worker/src/api/review.ts`（`fetchOrderReview`）；⑥ `npm run build` 通过；使用 Sonnet 4.6 LLM 完成。  
> 下一单元：[P4.7](#p47-我的页2h)  
> **需求来源**：`requirement_v2.0.md` §4.6、§4.5、§10.2 #84

**干什么**

任务详情页在「待评价」(PENDING_REVIEW) 和「已评价」(REVIEWED) 状态下的只读展示：

- 两种状态共用同一只读详情模板
- 完整时间轴（已预约 → 已派单 → 已接单 → 服务中 → 待评价 → 已评价）
- 已上传照片网格（只读，不可修改）
- REVIEWED 状态额外展示居民评价内容（星级、标签、文字、图片）
- 员工不可在此状态修改任何内容

**Cursor Agent 干什么**

- PENDING_REVIEW / REVIEWED 状态详情只读模板
- 复用时间轴组件
- 照片网格展示（只读）
- REVIEWED 状态条件渲染评价区

**人工干什么**

- ✅ 待评价状态：页面只读，时间轴完整，照片网格可见
- ✅ 已评价状态：额外显示居民评价（星级/标签/文字）
- ✅ 两种状态均无「完成服务」或其他操作按钮

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P4.7**:

1. 待评价/已评价状态详情页只读，无操作按钮 — ✅ 2026-06-22 已验
2. 已评价状态展示居民评价内容 — ✅ 2026-06-22 已验

---

#### P4.7 我的页（2h）

> **验收状态**：✅ **已通过**（2026-06-22）  
> **验收依据**：① 我的页展示姓名、评分、今日订单/今日已完成统计；② 证书名为「技能证书」+「健康证」，点击 `uni.previewImage` 查看大图，无 URL 提示「暂未上传」；③ 无「服务记录」菜单入口；④ 设置页修改密码（旧密码验证）成功后重新登录；⑤ `GET /workers/:id` + `PUT /workers/:id/change-password` 前端对接完成；⑥ `npm run build` 通过；使用 Sonnet 4.6 LLM 完成。  
> 下一单元：[P5.1](#p51-登录--二级折叠菜单布局框架3h)  
> **需求来源**：`requirement_v2.0.md` §4.8、§10.2 #17 #77

**干什么**

员工的个人中心（v2.0 变更）：

- 个人信息：头像、姓名、评分
- 统计：今日订单 / 已完成（数字醒目，点击跳转任务列表）
- 我的证书：**健康证** / **技能证书**（图片展示，点击查看大图；注意：不是「家政服务员证」）
- 菜单：✏️ **删除「服务记录」入口**（历史记录通过「我的任务」筛选查看）
- 菜单保留：**设置**（含修改密码功能）、**隐私协议**

**Cursor Agent 干什么**

- 个人信息 + 统计数据展示（调后端 worker detail 接口）
- 证书图片查看（命名为「技能证书」，非「家政服务员证」）
- 「设置」页面（含修改密码：旧密码验证 → 调 `change-password` 接口）
- 删除服务记录菜单项

**人工干什么**

- ✅ 「我的」页有姓名、评分、今日/已完成统计
- ✅ 证书名为「技能证书」
- ✅ 无「服务记录」菜单入口
- ✅ 「设置 → 修改密码」可成功修改并重新登录

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后 P4 阶段完成**:

1. 证书命名为「技能证书」
2. 无「服务记录」入口
3. 修改密码功能可用
4. 完整走通「登录 → 接单 → GPS 签到 → 拍照 → 保洁完成服务/废品等待验收 → 查看待评价详情」闭环

---

### P5 管理后台（37h）

**目标**: 实现运营管理人员使用的 Web 管理系统（基于需求文档 v2.0）。导航采用二级折叠菜单，新增配置管理模块（P5.9–P5.11）。

> **此阶段可切换回默认/Fast 模型**（CRUD 模板化程度高），数据看板和复杂表单建议保持强模型。

---

#### P5.1 登录 + 二级折叠菜单布局框架（3h）

> **需求来源**：`requirement_v2.0.md` §5.0、§10.2 #14  
> **下一单元**：[P5.2](#p52-数据看板4h)

**干什么**

管理后台的门面：

- Admin 登录页面（邮箱+密码，调 `/auth/admin-login`）
- 登录后二级折叠菜单结构（v2.0 新增配置管理一级菜单）：

```
订单管理
  ├── 保洁订单
  ├── 废品订单
  ├── 家政订单
  └── 投诉反馈
数据管理
  └── 数据看板
员工管理
  └── 服务人员管理
配置管理          ← 新增一级菜单
  ├── 服务配置
  ├── 运营人员信息配置
  └── 轮播图管理
系统设置          ← 占位
```

- 路由配置、权限守卫

**Cursor Agent 干什么**

- 登录页面（Element Plus 表单）
- 侧栏二级折叠菜单组件（el-sub-menu）
- 布局容器（顶栏+侧栏+内容区）
- 全部路由配置（含 P5.9–P5.11 配置管理路由）
- 路由守卫（未登录跳转登录页）

**人工干什么**

- ✅ 用 admin@dayunyunjie.com 登录 → 进入管理后台首页
- ✅ 侧栏二级折叠菜单可展开/收起
- ✅ 「配置管理」展开后有三个子菜单

**使用模型**: 默认/Fast

**需要权限**: 文件读写、Node.js、浏览器

**测试标准 — 通过后方可进入 P5.2**:

1. 登录成功
2. 五大一级菜单均可见，展开后子菜单正确

---

#### P5.2 数据看板（4h）

> **需求来源**：`requirement_v2.0.md` §5.2.1、§10.2 #85

**干什么**

管理后台的数据可视化大屏（入口：数据管理 > 数据看板）：

- **顶部统计**：总数（保洁+废品，不含家政咨询）/ 已完成 / 进行中 / 待接单
- **订单趋势折线图**：近 7 天每天订单量
- **服务类型环形图**：保洁/废品/家政占比
- **满意度环形图**：五星到一星分布
- **时段柱状图**：按小时订单分布（09:00–19:00）
- ✏️ **员工绩效排名表格**：排名 / 员工姓名 / 完成订单数 / 评分 / 完成率（**移除「创收金额」列**）

**Cursor Agent 干什么**

- ECharts 图表组件封装（折线/环形/柱状）
- 6 个图表/表格的实现
- 调用 P2.11 聚合 API 获取数据
- 时间范围切换（本日/本周/本月），统计卡与图表联动刷新

**人工干什么**

- ✅ 6 个图表/表格均有数据
- ✅ 员工绩效表格无「创收金额」列
- ✅ 切换时间范围数据刷新

**使用模型**: **强模型**（ECharts 较复杂）

**需要权限**: 同上

**测试标准 — 通过后方可进入 P5.3**:

1. 各图表渲染正常，无价格列
2. 时间范围切换正常

---

#### P5.3 保洁订单管理（6h）

> **需求来源**：`requirement_v2.0.md` §5.1.1、§10.2 #19 #20 #44 #47 #48 #49 #51 #52 #63 #64 #88 #89

**干什么**

保洁订单全生命周期管理（入口：订单管理 > 保洁订单）：

**列表页**：
- 顶部统计卡：今日保洁订单/待接单/进行中/今日已完成
- 搜索（订单号/客户姓名/地址）
- 状态 Tab（精确系统状态值）：全部 / 待派单 / 已派单 / 已接单 / 服务中 / 待评价 / 已评价 / 已取消
- 表格列：订单编号/客户信息/✏️ **被服务人**/✏️ **被服务人联系方式**/✏️ **是否代下单**/服务类型/服务地址/服务时间/服务人员/状态/操作（详情、联系客户、**分配**）
- ✏️ **移除「金额」列**

**分配订单弹窗**：
- 订单摘要 + 服务人员下拉（仅显示空闲/可接单人员，含技能标签和评分）

**新增保洁订单表单**：
- 服务项目（下拉，动态拉取 ServiceCatalog）
- 联系人姓名/手机
- ✏️ 是否代下单开关 + 被服务人姓名/手机（条件必填）
- 上门日期 / ✏️ **服务时段**（8 个起始时间点：08:00–11:00、14:00–17:00，与居民端一致）/ **服务时长**（1–8 小时步进器）
- 订单来源（电话预约/小程序，无「代下单」选项）
- 省/市/区级联（默认锁定「北京市/朝阳区」灰色禁用）/ 详细地址 / 备注

**详情页**：完整订单信息（含被服务人）/服务进度时间轴/作业前后照片/评价内容

**Cursor Agent 干什么**

- Element Plus 表格（el-table）+ 分页（el-pagination）
- 搜索 + 筛选联动
- 分配订单弹窗（服务人员下拉）
- 新增订单弹窗（含代下单字段/服务时段/省市区锁定）
- 订单详情抽屉（el-drawer）+ 时间轴组件
- 操作按钮调后端 API

**人工干什么**

- ✅ 列表无金额列；有被服务人/代下单列
- ✅ 状态 Tab 使用精确系统状态名
- ✅ 「分配」弹窗可选服务人员 → 订单变已派单
- ✅ 新增订单：服务时段下拉可选；代下单勾选后被服务人字段条件必填

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P5.4**:

1. 列表无金额列，有被服务人/代下单列
2. 分配弹窗可用，分配后状态变 ASSIGNED
3. 新增订单含服务时段字段；代下单条件必填验证正确

---

#### P5.4 废品订单管理（3h）

> **需求来源**：`requirement_v2.0.md` §5.1.2、§10.2 #43 #62

**干什么**

废品订单管理（入口：订单管理 > 废品订单），与保洁订单管理结构一致，废品特有差异：

- ✏️ 同步 P5.3 的被服务人/代下单列 + 分配弹窗
- 列表保留预估重量字段
- ✏️ 详情页：**不展示**实际重量、核定金额、已收款状态

**Cursor Agent 干什么**

- 复用 P5.3 的表格/详情框架
- 废品特有字段（预估重量）
- 详情页过滤实际重量/金额/收款字段

**人工干什么**

- ✅ 废品订单列表有预估重量字段，无金额列
- ✅ 详情页无实际重量/核定金额/已收款状态
- ✅ 分配弹窗可用

**使用模型**: 默认/Fast

**需要权限**: 同上

**测试标准 — 通过后方可进入 P5.5**:

1. 废品订单列表/详情均无价格/收款字段
2. 分配功能正常

---

#### P5.5 家政咨询单管理（3h）

> **验收状态**：✅ **已通过**（2026-06-23）  
> **验收依据**：① 列表有被服务人/代下单列，状态 Tab 使用 FOLLOW_UP/FOLLOWING/COMPLETED 显示名；② 新增咨询单弹窗（CONSULT 服务目录 + 代下单 + 核心诉求，无预约时间字段）；③ 详情抽屉 ConsultFollowUp 跟进时间轴 + 跟进录入区；④ 「提交」保存跟进记录并自动 FOLLOW_UP→FOLLOWING；⑤ 「完成」结案为 COMPLETED；⑥ 修复 `updateConsultStatus` 缺少必填 `operatorId` 导致 400；⑦ 列表增加「客户联系方式」查询条件；`npm run build` 通过；使用 Sonnet 4.6 LLM 完成。  
> 下一单元：[P5.6](#p56-服务人员管理原员工管理5h)  
> **需求来源**：`requirement_v2.0.md` §5.1.3、§10.2 #32 #37 #39

**干什么**

家政咨询单处理（入口：订单管理 > 家政订单），无派单/员工端流程：

**列表页**：
- 顶部统计卡：今日咨询 / 跟进中 / 已完成
- 表格列：订单编号/客户信息/✏️ **是否代下单**/✏️ **被服务人**/✏️ **被服务人联系方式**/服务类型/✏️ **服务地址**/提交时间/跟进状态/操作（详情/联系客户）

**状态枚举名（v2.0 更新）**：待跟进(FOLLOW_UP) / 跟进中(FOLLOWING) / 已完成(COMPLETED)

**详情页**：
- 订单信息（含代下单/被服务人）
- 处理跟进时间轴（ConsultFollowUp 列表按时间展示）
- 处理录入区
- ✏️ 操作按钮：「**提交**」（保存跟进记录）+ 「**完成**」（结案；不是「结束」）

**新增家政咨询单**（后台代替居民电话下单）：
- 服务项目/联系人/是否代下单/被服务人（条件必填）/需求描述/来源/备注

**Cursor Agent 干什么**

- 列表页+详情页（含跟进记录时间轴）
- 调用 `/consult-orders/:id/follow-ups` 读写跟进记录
- 「提交」和「完成」按钮状态变更

**人工干什么**

- ✅ 列表有被服务人/代下单列；状态使用 FOLLOW_UP/FOLLOWING/COMPLETED 显示名
- ✅ 跟进时间轴可见；「提交」保存跟进记录
- ✅ 「完成」结案为 COMPLETED

**使用模型**: 默认/Fast

**需要权限**: 同上

**测试标准 — 通过后方可进入 P5.6**:

1. 状态变更流畅（FOLLOW_UP → FOLLOWING → COMPLETED）
2. 跟进记录可写入并按时间展示

---

#### P5.6 服务人员管理（原员工管理）（5h）

> **需求来源**：`requirement_v2.0.md` §5.3.1、§10.2 #21 #26 #29 #31 #34 #35 #85

**干什么**

上门服务人员管理（入口：员工管理 > 服务人员管理；菜单统一命名「服务人员管理」）：

**列表页**：
- 统计：全部/空闲/服务中
- 搜索（姓名/手机号）+ 状态/技能筛选
- 表格列：员工信息 / 状态 / 评分 / ✏️ **今日订单**（非「本月订单」）/ 技能标签 / 操作（详情、编辑、✏️ **重置密码**）
- ✏️ **移除**投诉率列、证书标签列

**「重置密码」操作**：将密码重置为完整手机号，调 `POST /workers/:id/reset-password`

**详情页**：
- 基本信息（含今日订单数）
- ✏️ **证书信息区**：健康证 / **技能证书**（图片+有效期）
- 绩效统计（完成订单数/完成率；✏️ **移除「创收金额」**）
- ✏️ **投诉记录列表**

**添加/编辑表单（v2.0 扩展）**：
- 员工编号 / 姓名 / 手机号（登录账号）
- ✏️ 昵称 / 性别 / 身份证号 / 岗位（保洁员/回收员）
- ✏️ 技能：**下拉单选**（保洁 / 收废品）
- ✏️ 紧急联系人 / 紧急联系人电话
- 证书图片上传（健康证/技能证书）

**Cursor Agent 干什么**

- 列表页（今日订单列、重置密码操作）
- 详情页（证书区、投诉记录列表）
- 新增/编辑弹窗（扩展字段、单选技能）
- 重置密码确认弹窗

**人工干什么**

- ✅ 列表有「今日订单」；无投诉率/证书标签列
- ✅ 「重置密码」操作后员工可用手机号登录
- ✅ 技能为单选下拉；详情页有证书信息区

**使用模型**: **强模型**

**需要权限**: 同上

**测试标准 — 通过后方可进入 P5.7**:

1. 重置密码功能可用
2. 技能为下拉单选
3. 详情页证书区展示正常

---

#### P5.7 投诉反馈管理（2h）

> **需求来源**：`requirement_v2.0.md` §5.1.4、§10.2 #33 #37 #45

**干什么**

投诉处理和跟进（入口：**订单管理 > 投诉反馈**，从原一级菜单改为子菜单）：

**列表页**（v2.0 字段调整）：
- 表格列：投诉单编号 / ✏️ **关联订单**（被投诉原服务单编号）/ 客户信息 / 服务类型 / 服务地址 / ✏️ **投诉内容**（文字摘要）/ 状态 / 操作
- ✏️ **移除**：服务时间列、服务人员列、摘要列

**详情页**：
- 关联原始订单信息
- 投诉内容（文字+凭证图片）
- 处理跟进时间轴
- 处理录入区
- ✏️ 操作按钮：「**提交**」（保存跟进记录）+ 「**完成**」（结案；不是「结束」）

**Cursor Agent 干什么**

- 列表页（含关联订单/投诉内容列；移除旧列）
- 详情页（跟进时间轴+录入）
- 「完成」结案操作

**人工干什么**

- ✅ 列表有关联订单列和投诉内容列；无服务时间/服务人员列
- ✅ 处理跟进 → 「完成」结案，状态变已完成
- ✅ 跟进时间轴可见

**使用模型**: 默认/Fast

**需要权限**: 同上

**测试标准 — 通过后方可进入 P5.8**:

1. 列表字段符合 v2.0（含关联订单/投诉内容）
2. 跟进 → 结案流程正常

---

#### P5.8 系统设置占位页（2h）

> **需求来源**：`requirement_v2.0.md` §5.5

**干什么**

系统设置菜单占位（功能建设中，不交付具体子功能）：

- 点击侧栏「系统设置」→ 进入占位页（显示「功能建设中」）
- 菜单保留，为后续版本预留入口

**Cursor Agent 干什么**

- 设置页面骨架（占位提示）
- 路由配置

**人工干什么**

- ✅ 点击设置菜单 → 页面打开不报错 → 显示占位信息

**使用模型**: 默认/Fast

**需要权限**: 同上

**测试标准 — 通过后方可进入 P5.9**:

1. 系统设置菜单可见，点击进入占位页

---

#### P5.9 服务配置管理（3h）

> **需求来源**：`requirement_v2.0.md` §5.4.1–§5.4.2、§10.2 #23 #27 #42 #86

**干什么**

服务项目的动态管理（入口：配置管理 > 服务配置），调用 P2.14 的 ServiceCatalog CRUD 接口：

**列表页**：
- 表格列：服务大类 / 服务名称 / 副标题 / 图标缩略图 / 排序 / 启用状态 / 创建时间 / 操作（编辑/启用停用/删除）

**新增/编辑服务**（弹窗）：
- 所属大类（保洁服务/废品回收/家政服务）
- 服务名称（必填）
- 卡片图标（图片上传）
- 副标题（文本）
- 排序（数字，默认 0）
- **无计价方式/单价/参考价字段**（价格线下处理）
- 新增默认启用

**Cursor Agent 干什么**

- 列表页（el-table + 图标缩略图列）
- 新增/编辑弹窗
- 启用/停用切换（调 `/service-catalogs/:id/toggle`）
- 删除确认弹窗

**人工干什么**

- ✅ 新增服务配置 → 列表可见
- ✅ 切换启用/停用 → 接口调通
- ✅ 列表无价格相关列

**使用模型**: 默认/Fast

**需要权限**: 同上

**测试标准 — 通过后方可进入 P5.10**:

1. ServiceCatalog CRUD 全功能可用
2. 启用/停用状态切换正常

---

#### P5.10 运营人员信息配置（2h）

> **需求来源**：`requirement_v2.0.md` §5.4.3–§5.4.4、§10.2 #28 #35 #40 #41

**干什么**

运营人员联系信息配置（入口：配置管理 > 运营人员信息配置），调用 P2.14 的 Operator CRUD 接口：

**列表页**：
- 表格列：姓名 / 手机号（完整展示）/ 用途（接单）/ 创建时间 / 操作（编辑/删除）
- 无启用/停用列（停用即删除，启用即新增）

**新增/编辑**（弹窗）：
- 姓名（必填）/ 手机号（必填）/ 用途（目前仅「接单」）
- 无密码字段、无状态字段

**Cursor Agent 干什么**

- 列表页（手机号完整展示，不脱敏）
- 新增/编辑弹窗（简单表单）
- 删除确认弹窗

**人工干什么**

- ✅ 新增运营人员 → 列表可见
- ✅ 删除后居民端首页客服电话更新

**使用模型**: 默认/Fast

**需要权限**: 同上

**测试标准 — 通过后方可进入 P5.11**:

1. Operator CRUD 全功能可用
2. 手机号完整展示

---

#### P5.11 轮播图管理（2h）

> **需求来源**：`requirement_v2.0.md` §5.4.5–§5.4.6、§10.2 #30 #36 #46 #48

**干什么**

居民端首页 Banner 轮播图管理（入口：配置管理 > 轮播图管理），调用 P2.14 的 Banner CRUD 接口：

**列表页**：
- 表格列：标题 / 展示端 / 跳转链接 / 排序 / 生效时间（起止）/ 是否启用 / 最后修改时间 / 操作（编辑/删除）

**新增/编辑**（弹窗）：
- 上传图片（必填）/ 标题 / 展示端（居民端/员工端/全部）
- 跳转类型（不跳转/服务详情/自定义链接）+ 跳转路径
- 生效起始/结束时间（必填）/ 排序（数字）/ 是否启用

**Cursor Agent 干什么**

- 列表页（含最后修改时间列）
- 新增/编辑弹窗（图片上传+时间范围选择器）
- 删除确认弹窗

**人工干什么**

- ✅ 新增轮播图（居民端）→ 居民端首页展示
- ✅ 修改排序 → 轮播顺序变化
- ✅ 停用后居民端不再显示该 Banner

**使用模型**: 默认/Fast

**需要权限**: 同上

**测试标准 — 通过后 P5 阶段完成**:

1. Banner CRUD 全功能可用
2. 新增轮播图后居民端首页展示更新
3. Chrome 全页面可操作，无 console 报错
4. 保洁订单全生命周期可在后台操作（含分配弹窗）

---

### P6 集成与部署（12h）

**目标**: 把开发好的系统部署到线上环境，让真实用户可以使用。

> **切换回默认/Fast 模型。**

---

#### P6.1 WebSocket 实时推送（3h）

**干什么**

实现消息实时推送能力。当订单状态发生变化时，相关方立即收到通知，不用手动刷新页面。

例如：

- 管理后台派单 → 员工端小程序立即收到"您有新订单"提醒
- 员工完成服务 → 居民端小程序立即收到"服务已完成，请评价"提示

**Cursor Agent 干什么**

- Socket.IO 服务端集成
- 订单状态变更事件监听和广播
- 前端 WebSocket 连接和消息处理
- 管理后台实时刷新

**人工干什么**

- ✅ 后台派单后，观察员工端（或浏览器控制台）收到推送消息

**使用模型**: 默认/Fast

**需要权限**: 文件读写、终端

**测试标准 — 通过后方可进入 P6.2**:

1. 订单状态变更 → 管理后台实时刷新（不需 F5）

---

#### P6.2 微信订阅消息集成（3h）

> **需求来源**：`requirement_v2.0.md` §6.0、§10.2 #93 #94

**干什么**

配置微信小程序订阅消息/公众号模板消息，在 v2.0 状态流转的关键节点主动推送通知：

**居民端触达节点**（基于 v2.0 状态机，无 PENDING_ACCEPTANCE）：
- 订单已派单（PENDING_ASSIGN → ASSIGNED）→ 通知下单人
- 服务已开始（GPS 签到 → IN_SERVICE）→ 通知下单人
- 保洁服务已完成（IN_SERVICE → PENDING_REVIEW via `/complete`）→ 通知居民评价
- ✏️ 废品验收提醒：**废品员工到达后（GPS IN_SERVICE）→ 通知居民触发「验收服务」**（无收款步骤）
- 评价已收到（PENDING_REVIEW → REVIEWED）→ 感谢通知

**代下单场景**（新增）：
- 关键节点同时通知**下单人**（子女）和**被服务人**（老人）：派单通知、服务开始通知

**员工端**：
- 新订单派单通知（PENDING_ASSIGN → ASSIGNED）→ 通知员工

**Cursor Agent 干什么**

- 微信订阅消息 SDK 集成（后端 NestJS）
- 消息模板配置（含代下单双接收人逻辑）
- 各节点 Event/Hook 注入发送逻辑

**人工干什么**

- ✅ 在微信小程序后台申请消息模板（AI 会告诉你申请哪些模板）
- ✅ 测试：触发订单派单 → 手机收到通知；代下单时子女+老人均收到
- ✅ 废品验收场景：员工 GPS 到达后，居民收到「请验收」提醒

**使用模型**: 默认/Fast

**需要权限**: 文件读写、终端、微信小程序后台（需手动操作申请模板）

**测试标准 — 通过后方可进入 P6.3**:

1. 关键节点可推送消息（含 v2.0 废品验收节点）
2. 代下单场景双接收人通知正确

---

#### P6.3 Nginx 反向代理 + HTTPS（2h）

**干什么**

配置 Web 服务器，让用户可以通过域名安全地访问系统：

- Nginx 反向代理：将域名请求转发到 NestJS 后端和 Vue 前端
- HTTPS：SSL 证书配置，数据加密传输

**Cursor Agent 干什么**

- 生成 Nginx 配置文件
- 配置 API 反向代理（/api → NestJS :3000）
- 配置前端静态文件服务
- SSL 证书配置

**人工干什么**

- ✅ 将 Nginx 配置部署到服务器
- ✅ 申请域名和 SSL 证书（或在腾讯云一键申请）
- ✅ 浏览器访问 https://域名 正常打开

**使用模型**: 默认/Fast

**需要权限**: 文件读写、服务器 SSH 权限（或腾讯云控制台操作）

**测试标准 — 通过后方可进入 P6.4**:

1. HTTPS 访问 API + 管理后台正常

---

#### P6.4 PM2 进程守护 + 日志（2h）

**干什么**

确保后端服务稳定运行——崩溃了自动重启，日志妥善保存。

**Cursor Agent 干什么**

- PM2 配置文件（ecosystem.config.js）
- 进程守护配置（崩溃自动重启）
- 日志按日期分割（每天一个文件）

**人工干什么**

- ✅ 在服务器上安装 PM2
- ✅ 用 AI 生成的配置启动服务
- ✅ 手动 kill 进程 → 观察 PM2 是否自动重启

**使用模型**: 默认/Fast

**需要权限**: 终端、服务器 SSH

**测试标准 — 通过后方可进入 P6.5**:

1. 进程崩溃自动重启
2. 日志按日期分割

---

#### P6.5 全链路联调 + Bug 修复（2h）

> **需求来源**：`requirement_v2.0.md` §7.0 全链路验证

**干什么**

最终的全面检验。在三端联调过程中发现并修复问题（基于 v2.0 全量场景）。

**Cursor Agent 干什么**

- 协助定位和修复联调中发现的问题
- 补充遗漏的功能细节
- 性能优化（如有明显问题）

**人工干什么**

- ✅ **完整走通以下核心场景**：
  1. **保洁全流程（代下单）**：子女代老人预约保洁 → 后台派单 → 员工接单 → GPS 签到 → 上传照片 → 员工「完成服务」→ 居民评价 → 双人通知
  2. ✏️ **废品全流程（v2.0）**：居民预约废品 → 后台派单 → 员工接单 → GPS 签到 → 上传照片 → **居民「验收服务」**触发 PENDING_REVIEW → 居民评价（无录入重量/收款步骤）
  3. **家政咨询全流程**：居民提交咨询 → 后台跟进（多条 ConsultFollowUp）→ 结案为 COMPLETED
  4. ✏️ **配置管理操作**：管理后台服务配置（新增/启用停用）/ 运营人员配置 / 轮播图配置 → 居民端首页实时更新
  5. 管理后台查看数据看板 → 处理一笔投诉（关联订单展示正确）
- ✅ 发现任何问题都记录下来 → 反馈给 AI 修复 → 重新验证

**使用模型**: 默认/Fast

**需要权限**: 全部

**测试标准 — 通过后 🎉 整个项目一期 MVP 完成！**:

1. 居民-员工-后台全流程无阻塞性 bug（含 v2.0 废品验收流程）
2. 配置管理三模块（服务/运营人员/轮播图）前后台联动正常
3. 生产环境部署完成

---

## 八、工时汇总与排期建议

### 总览（v2.0 基线）

| 阶段                       | 单元数    | 工时     | 模型               | 占比     |
| -------------------------- | --------- | -------- | ------------------ | -------- |
| P1 基础设施                | 5 个      | 16h      | 默认/Fast          | 9.2%     |
| P2 后端核心 API（v1.x）    | 11 个     | 27h      | 默认/Fast + 强模型 | 15.5%    |
| P2 后端补充单元（v2.0）    | 4 个      | 13h      | 强模型             | 7.5%     |
| P3 居民端小程序            | 8 个      | 28h      | 强模型             | 16.1%    |
| P4 员工端小程序            | 7 个      | 22h      | 强模型             | 12.6%    |
| P5 管理后台（含配置管理）  | 11 个     | 37h      | 默认/Fast + 强模型 | 21.3%    |
| P6 集成与部署              | 5 个      | 12h      | 默认/Fast          | 6.9%     |
| **v2.0 合计**              | **51 个** | **155h** | —                  | **100%** |

> **P2 详细分解**：P2.1–P2.11（v1.x 已完成 27h）+ P2.12–P2.15（v2.0 新增 13h）= 40h 合计

### 排期建议

假设每天有效开发 **6-8 小时**（含 AI 等待 + 人工审查 + 测试时间）：

| 方案     | 每天工时 | 预计工作日 | 预计日历天数          |
| -------- | -------- | ---------- | --------------------- |
| 轻松节奏 | 6h       | ~26 天     | 约 5-6 周（扣除周末） |
| 正常节奏 | 8h       | ~19 天     | 约 4 周（扣除周末）   |
| 加快节奏 | 10h      | ~16 天     | 约 3 周（扣除周末）   |

### 建议里程碑（v2.0）

| 日期节点    | 目标                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| **第 1 周** | 完成 P1 + P2.1-P2.4（基础设施 + 认证 + 基础 CRUD），项目骨架跑通            |
| **第 2 周** | 完成 P2.5-P2.11（订单状态机 + 高级接口），后端 v1.x 收尾                   |
| **第 3 周** | 完成 P2.12-P2.15（v2.0 补充：Schema迁移/Worker登录/配置CRUD/验收记录）      |
| **第 4 周** | 完成 P3（居民端小程序）                                                     |
| **第 5 周** | 完成 P4 + P5.1-P5.8（员工端 + 管理后台核心功能）                           |
| **第 6 周** | 完成 P5.9-P5.11 + P6（配置管理 + 集成部署），MVP v2.0 上线                 |

---

## 九、风险与应急处理

### 最大风险及应对

| 风险                               | 影响                             | 概率 | 应对措施                                                                 |
| ---------------------------------- | -------------------------------- | ---- | ------------------------------------------------------------------------ |
| **订单状态机逻辑缺陷**             | P2.5/P2.6 延迟阻塞后续开发       | 中   | 用强模型生成后立即人工 review 转移规则表；让 AI 生成全套测试用例逐一验证 |
| **微信登录依赖真机/AppID**         | P3（居民端）部分功能无法在模拟器中测试；P4（员工端）已改为手机号+密码登录，无微信依赖 | 高   | P3：先 mock openid 开发全部页面逻辑，后期统一切换真实微信环境，只需改配置；P4 不受此风险影响 |
| **COS 配置依赖腾讯云账号**         | 拍照功能无法真测                 | 低   | 开发期用本地 `/uploads` 存储；部署前一行配置切换 COS                     |
| **uni-app H5 与微信小程序差异**    | 部分功能 H5 能跑但微信不行       | 中   | 核心流程必须在微信开发者工具中验证；GPS/拍照等原生能力尤其注意           |
| **单个开发单元 AI 产出质量不达标** | 需要多轮修复影响进度             | 低   | 每个单元严格按测试标准验收；不通过不进入下一单元                         |

### 出问题了怎么办

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  AI 生成的代码有问题？                                │
│                                                     │
│  ① 直接用中文描述问题                                │
│     "订单列表不显示数据"                              │
│     "登录后跳转到错误页面"                            │
│     "派单后状态没有变成已派单"                        │
│                                                     │
│  ② AI 会尝试修复                                    │
│                                                     │
│  ③ 修复后再测试                                     │
│                                                     │
│  ④ 还不行？继续反馈，或者：                           │
│     → 让 AI 解释它在做什么（帮助理解问题根因）        │
│     → 让 AI 回退到上一个可用版本（git revert）        │
│     → 跳过这个单元先做后面的（如果无依赖关系）         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Git 安全网

**每个开发单元完成后，执行一次 git commit。** 这是最重要的安全措施：

- 如果 AI 改坏了东西，随时可以回到上一个正常的版本
- commit 信息由 AI 自动生成，你只需要确认

**如何回滚（如果需要）**：

> 对 AI 说："回滚到上一个版本" 或 "回滚到 P2.5a 完成时的版本"

---

## 附录 A：快速启动口令

开始每个开发单元时，在 **Cursor Agent** 聊天中 @ 引用 `docs/CodingPlan.md` 对应单元，并复制以下口令发送。

### 磁盘约束后缀（每条口令末尾必须追加）

```
工作区 D:\coding\dayangyunjie-code；Agent 模式。npm 缓存 D:\npm-cache（根目录 .npmrc）；仅在仓库根目录 npm install；日志目录 .cursor-logs\；禁止在 C 盘或资料区安装依赖。
```

> 也可简化为：「遵守 CodingPlan §2.1 磁盘约束。」

| 单元  | 启动口令                                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| P1.1  | "开始 P1.1：工作目录 D:\\coding\\dayangyunjie-code，补全 Nest/Prisma，仅根目录 npm install，npm run build 验证" |
| P1.2  | "开始 P1.2，将 docs/Schema.md 转译为 apps/server/prisma/schema.prisma"                                          |
| P1.3  | "开始 P1.3，创建共享类型包 packages/shared"                                                                     |
| P1.4  | "开始 P1.4，创建 uni-app 双端（居民+员工）项目骨架"                                                             |
| P1.5  | "开始 P1.5，基于 youlai 模板创建 Vue 3 管理后台脚手架"                                                          |
| P2.1  | "开始 P2.1，实现 Auth 模块（微信登录 + JWT）"                                                                   |
| P2.2  | "开始 P2.2，实现三类用户的 CRUD 模块"                                                                           |
| P2.3  | "开始 P2.3，实现地址管理模块"                                                                                   |
| P2.4  | "开始 P2.4，实现服务目录查询模块"                                                                               |
| P2.5a | "开始 P2.5a，实现 CleaningOrder CRUD 和创建订单"                                                                |
| P2.5b | "开始 P2.5b，实现保洁订单状态机核心逻辑"                                                                        |
| P2.5c | "开始 P2.5c，实现派单/GPS签到/完成/取消操作接口"                                                                |
| P2.6a | "开始 P2.6a，实现 RecyclingOrder CRUD、状态机及操作接口（流程与保洁一致，含 estimatedWeight 字段）"             |
| P2.6b | ~~已取消，并入 P2.6a~~                                                                                          |
| P2.7  | "开始 P2.7，实现 ConsultOrder 咨询单模块"                                                                       |
| P2.8  | "开始 P2.8，实现 GPS 签到校验服务"                                                                              |
| P2.9  | "开始 P2.9，实现 COS 文件上传和水印功能"                                                                        |
| P2.10 | "开始 P2.10，实现评价与投诉模块"                                                                                |
| P2.11 | "开始 P2.11，实现数据看板聚合 API"                                                                                                              |
| P2.12 | "开始 P2.12（v2.0），执行 prisma migrate v2.0 并更新 seed.ts / 枚举引用（ConsultStatus / OrderSource），全量回归测试通过"                        |
| P2.13 | "开始 P2.13（v2.0），实现 Worker 手机号+密码登录（/auth/worker-login）、Worker JWT Guard、员工改密与管理员重置密码接口"                           |
| P2.14 | "开始 P2.14（v2.0），实现 ServiceCatalog 全 CRUD+toggle、Banner 全 CRUD+有效轮播查询、Operator 全 CRUD+接单人接口"                               |
| P2.15 | "开始 P2.15（v2.0），实现废品居民验收接口（/recycling-orders/:id/accept）、ConsultFollowUp CRUD 及 ConsultOrder v2.0 字段适配"                    |
| P3.1  | "开始 P3.1，实现居民端应用骨架、微信登录和首次下单手机号快速授权"                                                                               |
| P3.2  | "开始 P3.2，实现居民端首页（动态 Banner + 服务详情页 + 动态客服电话）"                                                                          |
| P3.3  | "开始 P3.3，实现保洁预约三步向导（动态服务类型 + 地址选择页 + 代下单勾选 + 无价格展示）"                                                        |
| P3.4  | "开始 P3.4，实现废品回收预约三步向导（复用 P3.3 框架，含代下单）"                                                                               |
| P3.5  | "开始 P3.5，实现家政咨询提交流程（动态服务类型 + 代下单 + 无地址字段）"                                                                         |
| P3.6  | "开始 P3.6，实现我的订单列表（三 Tab：保洁/废品/家政）和详情页（废品验收服务按钮 + 无价格）"                                                    |
| P3.7  | "开始 P3.7，实现评价页、投诉页（多图 + ACCEPTED后才可投诉）和我的页（完整手机号 + 服务地址管理+我的投诉）"                                     |
| P3.8  | "开始 P3.8，代下单集成验证（保洁+废品+家政三类代下单全流程闭环）"                                                                               |
| P4.1  | "开始 P4.1，实现员工端手机号+密码登录页（调 /auth/worker-login）"                                                                               |
| P4.2  | "开始 P4.2，实现员工端首页—仅展示 ASSIGNED 待接单任务列表（无统计卡片）"                                                                        |
| P4.3  | "开始 P4.3，实现员工端任务列表（双 Tab + 精确系统状态值筛选，无 PENDING_ASSIGN）"                                                               |
| P4.4  | "开始 P4.4，实现任务详情—已派单/已接单态（GPS签到 + ACCEPTED 状态作业区禁用 + 代下单展示）"                                                     |
| P4.5  | "开始 P4.5，实现任务详情—服务中态（无SOP弹窗 + 保洁「完成服务」按钮 + 废品也有「完成服务」按钮（与保洁对称） + 无重量/金额字段）"                                      |
| P4.6  | "开始 P4.6，实现任务详情—待评价/已完成态（只读模板 + 时间轴 + 照片网格 + REVIEWED 展示居民评价）"                                               |
| P4.7  | "开始 P4.7，实现员工端我的页（技能证书 + 修改密码 + 无服务记录入口）"                                                                           |
| P5.1  | "开始 P5.1，实现管理后台登录和二级折叠菜单布局（含配置管理一级菜单 + P5.9–P5.11 路由）"                                                         |
| P5.2  | "开始 P5.2，实现数据看板（移除创收金额列 + 今日保洁/待接单/进行中/完成统计）"                                                                   |
| P5.3  | "开始 P5.3，实现保洁订单管理（被服务人列 + 分配弹窗 + 服务时段字段 + 代下单 + 无金额列）"                                                       |
| P5.4  | "开始 P5.4，实现废品订单管理（同步代下单/分配弹窗 + 详情无重量/金额/收款字段）"                                                                 |
| P5.5  | "开始 P5.5，实现家政咨询单管理（被服务人列 + ConsultFollowUp 跟进时间轴 + 提交/完成按钮 + FOLLOW_UP/FOLLOWING/COMPLETED 状态名）"                |
| P5.6  | "开始 P5.6，实现服务人员管理（今日订单列 + 重置密码 + 技能单选 + 证书区 + 投诉记录列表 + 移除创收金额）"                                        |
| P5.7  | "开始 P5.7，实现投诉反馈管理（关联订单列 + 投诉内容列 + 移除旧列 + 完成按钮）"                                                                 |
| P5.8  | "开始 P5.8，实现系统设置占位页"                                                                                                                 |
| P5.9  | "开始 P5.9（v2.0），实现服务配置管理（ServiceCatalog CRUD + 启用停用 toggle + 无价格字段）"                                                      |
| P5.10 | "开始 P5.10（v2.0），实现运营人员信息配置（Operator CRUD + 手机号完整展示）"                                                                    |
| P5.11 | "开始 P5.11（v2.0），实现轮播图管理（Banner CRUD + 展示端筛选 + 排序数字）"                                                                     |
| P6.1  | "开始 P6.1，实现 WebSocket 实时推送"                                                                                                            |
| P6.2  | "开始 P6.2，集成微信订阅消息（含废品验收节点 + 代下单双接收人通知）"                                                                            |
| P6.3  | "开始 P6.3，配置 Nginx 反向代理和 HTTPS"                                                                                                        |
| P6.4  | "开始 P6.4，配置 PM2 进程守护和日志"                                                                                                            |
| P6.5  | "开始 P6.5，全链路联调和 Bug 修复（v2.0：废品验收流程 + 代下单 + 配置管理联动）"                                                               |

---

## 附录 B：术语速查表

| 术语            | 通俗解释                                                             |
| --------------- | -------------------------------------------------------------------- |
| API             | 接口。小程序和后端对话的"窗口"，比如"创建订单"就是一个 API           |
| CRUD            | 增删改查。Create(新建)、Read(读取)、Update(修改)、Delete(删除)       |
| DTO             | 数据传输对象。规定 API 接收和返回的数据格式                          |
| Schema          | 数据库表结构定义。描述一张表有哪些列、各列是什么类型                 |
| Migrate         | 数据迁移。把 Schema 的变更同步到数据库（比如加了一列，数据库也加上） |
| Seed            | 种子数据。预先填入数据库的测试数据                                   |
| JWT             | JSON Web Token。一种用户登录凭证，类似"临时身份证"                   |
| Guard           | 门卫。后端的安检机制，没带有效凭证的请求会被拦住                     |
| Swagger         | API 文档工具。自动生成可在线测试的接口文档页面                       |
| State Machine   | 状态机。规定订单可以从 A 状态变到 B 状态，但不能跳到 C 状态          |
| ECharts         | 图表库。用来画折线图、饼图、柱状图等的工具                           |
| COS             | 腾讯云对象存储。云端硬盘，用来存照片等文件                           |
| Nginx           | Web 服务器。把域名请求转发给后端程序                                 |
| PM2             | 进程管理器。保证后端程序一直运行，崩了自动重启                       |
| uni-app         | 一个框架。写一套代码，可以同时编译成微信小程序和 H5 网页             |
| Pinia           | 状态管理。小程序里在不同页面之间共享数据（比如购物车）的工具         |
| Composition API | Vue 3 的一种写代码的方式（另一种是 Options API）                     |
| Element Plus    | 基于 Vue 3 的 UI 组件库（按钮、表格、弹窗等现成组件）                |
| Haversine       | 根据两个经纬度坐标计算地球表面距离的数学公式                         |
| watermark       | 水印。在图片上叠加的文字或图案（防止盗用）                           |
| endpoint        | API 的具体地址，比如 POST /api/v1/orders                             |
| e2e             | End-to-End。端到端测试，从头到尾完整跑一遍流程                       |

---

> **文档版本**: v4.1
> **创建日期**: 2026-06-01
> **修订日期**: 2026-06-23（v4.1：P5.5 家政咨询单管理验收通过 | v4.0：P5.4 废品订单管理验收通过 | v3.9：P5.3 保洁订单管理验收通过 | v3.8：P5.1 管理后台登录+二级折叠菜单布局验收通过 | v3.7：P4.7 员工端我的页验收通过（技能证书+修改密码+无服务记录入口） | v3.6：P4.6 任务详情待评价/已完成态 | v3.5：P4.5 任务详情服务中态 | v3.4：P4.4 任务详情已派单/已接单态 | v3.3：P4.3 任务列表 | v3.2：P4.2 首页 | v3.1：P4.2 进度表 | v3.0：P4.1 登录）
> **适用范围**: 大洋云洁 (dayangyunjie-code) 社区服务平台一期 MVP（v2.0 基线）
> **使用方式**: 按 P1 → P2 → P3 → P4 → P5 → P6 顺序，逐单元执行。每单元完成后按"测试标准"验收，通过后进入下一单元。P2.1–P2.15 已完成（v1.x + v2.0 阶段）；P3.1–P3.8 已全部完成（含代下单集成验证）；P4.1–P4.7 员工端小程序全部完成；P5.1 管理后台登录与布局框架已完成；P5.2 数据看板已完成；P5.3 保洁订单管理已完成；P5.4 废品订单管理已完成；**P5.5 家政咨询单管理已完成**，当前进入 P5.6 服务人员管理。
