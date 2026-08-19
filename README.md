# 大洋云洁 · 编码仓库 (dayangyunjie-code)

本目录为**专用代码 monorepo**，与资料目录 `D:\coding\dayangyunjie`（商务/调研文档）平级分离。

## 目录说明

| 路径                    | 说明                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `apps/server`           | NestJS 后端 API                                                |
| `apps/miniapp-customer` | 居民端小程序（P3 完成；PNG tabBar/业务图标已替换）            |
| `apps/miniapp-worker`   | 员工端小程序（P4 完成；PNG tabBar/业务图标已替换；废品 serviceItem 映射已修正） |
| `apps/admin`            | 管理后台（P5.1–P5.12 已完成；含首页工作台 + auth + dashboard + cleaning/recycling/consult 订单 + workers/complaint/service-catalog/operator/banner + admin/admin-permission API） |
| `packages/shared`       | 共享枚举、DTO、`ApiResponse`（`@dayangyunjie/shared`）         |
| `docs/`                 | CodingPlan、tech、Schema 等技术文档                            |
| `requirement.md`        | 需求文档（主稿；原型图仍在资料区 `dayangyunjie\requirement\`） |
| `docs/`                 | CodingPlan、tech、Schema（开发指引唯一主稿）                   |

## 常用命令

在**本目录根**执行：

```bash
npm install          # 安装依赖（仅根目录执行一次）
npm run build        # 编译 shared + 双端 miniapp(H5) + admin + 后端
npm run dev          # 启动后端开发模式
npm run dev:miniapp-customer  # 启动居民端 uni-app H5
npm run dev:mp-weixin --workspace=@dayangyunjie/miniapp-customer  # 编译居民端 uni-app dev
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-customer # 编译居民端 uni-app build
npm run dev:miniapp-worker    # 启动员工端 uni-app H5
npm run dev:mp-weixin --workspace=@dayangyunjie/miniapp-worker # 编译员工端 uni-app dev
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-worker # 编译员工端 uni-app build
npm run dev:admin             # 启动管理后台（Vue 3，端口 5173）
```

后端 Prisma（在 `apps/server` 下）：

```bash
cd apps/server
npx prisma generate
npx prisma migrate dev
```

## 环境

- Node.js 22+
- MySQL 8（开发库连接见 `.env`，勿提交 Git）
- npm 缓存建议：`D:\npm-cache`（见根目录 `.npmrc`）

## Cursor Agent

请将工作区根目录设为：**`D:\coding\dayangyunjie-code`**

- 开发计划与口令见 `docs/CodingPlan.md`（Cursor Agent 版）
- npm 缓存：`D:\npm-cache`（根目录 `.npmrc`）
- AI/工具日志：`D:\coding\dayangyunjie-code\.cursor-logs\`（定期清理，见 CodingPlan §2.1）

## 开发进度

- P2.4 服务目录查询模块验收通过（使用 Auto LLM 完成）
- 使用Codex 5.3 LLM完成P2.5a,实现 CleaningOrder CRUD 和创建订单
- 使用Sonnet4.6 LLM完成P2.5c实现派单/GPS签到/完成/取消操作接口
- 使用Sonnet4.6 LLM完成P2.6a，实现 RecyclingOrder CRUD、状态机及操作接口（流程与保洁一致，含 estimatedWeight 字段）
- 使用Sonnet4.6 LLM完成P2.7 实现 ConsultOrder 咨询单模块
- 使用Sonnet4.6 LLM完成P2.8，实现 GPS 签到校验服务
- 使用Sonnet4.6 LLM完成P2.9，实现 COS 文件上传和水印功能
- 使用Sonnet4.6 LLM完成P2.10，实现评价与投诉模块
- 使用Sonnet4.6 LLM完成P2.11，实现数据看板聚合 API。后端核心API开发完成
- 使用Sonnet4.6 LLM完成P2.12，执行 prisma migrate v2.0 并更新 seed.ts / 枚举引用（ConsultStatus / OrderSource），全量回归测试通过
- 开始 P2.13（v2.0），实现 Worker 手机号+密码登录（/auth/worker-login）、Worker JWT Guard、员工改密与管理员重置密码接口
- 使用Sonnet4.6 LLM完成P2.14，实现 ServiceCatalog 全 CRUD+toggle、Banner 全 CRUD+有效轮播查询、Operator 全 CRUD+接单人接口
- 使用Sonnet4.6 LLM完成P2.15，实现废品居民验收接口（/recycling-orders/:id/accept）、ConsultFollowUp CRUD 及 ConsultOrder v2.0 字段适配
- 使用Sonnet4.6 LLM完成P3.1，实现居民端应用骨架、微信登录和首次下单手机号快速授权
- 使用Sonnet4.6 LLM完成P3.2，实现居民端首页（动态 Banner + 服务详情页 + 动态客服电话）
- 使用Sonnet4.6 LLM完成P3.3、P3.4，实现保洁预约三步向导（动态服务类型 + 地址选择页 + 代下单勾选 + 无价格展示）；实现废品回收预约三步向导（复用 P3.3 框架，含代下单）
- 使用Sonnet4.6 LLM完成P3.5，实现家政咨询提交流程（动态服务类型 + 代下单 + 无地址字段）
- 使用Sonnet4.6 LLM完成P3.6，实现我的订单列表（三 Tab：保洁/废品/家政）和详情页（废品验收服务按钮 + 无价格）
- 使用Sonnet4.6 LLM完成P3.7，实现评价页、投诉页（多图 + ACCEPTED后才可投诉）和我的页（完整手机号 + 服务地址管理+我的投诉）
- 使用Sonnet4.6 LLM完成P3.6_repair，废品回收的验收改为由员工触发,与保洁一致
- 使用Sonnet4.6 LLM完成P3.8,代下单集成验证（保洁+废品+家政三类代下单全流程闭环）
- 使用Sonnet4.6 LLM完成P4.1，实现员工端手机号+密码登录页（调 /auth/worker-login）
- 使用Sonnet4.6 LLM完成P4.2，实现员工端首页—仅展示 ASSIGNED 待接单任务列表（无统计卡片）
- 使用Sonnet4.6 LLM完成P4.3，实现员工端任务列表（双 Tab + 精确系统状态值筛选，无 PENDING_ASSIGN）
- 使用Sonnet4.6 LLM完成P4.4，实现任务详情—已派单/已接单态（GPS签到 + ACCEPTED 状态作业区禁用 + 代下单展示）
- 使用Sonnet4.6 LLM完成P4.5，实现任务详情—服务中态（无SOP弹窗 + 保洁「完成服务」按钮 + 废品也有「完成服务」按钮（与保洁对称） + 无重量/金额字段）
- 使用Sonnet4.6 LLM完成P4.6，实现任务详情—待评价/已完成态（只读模板 + 时间轴 + 照片网格 + REVIEWED 展示居民评价）
- 使用Sonnet4.6 LLM完成P4.7，实现员工端我的页（技能证书 + 修改密码 + 无服务记录入口）
- 使用Sonnet4.6 LLM完成P5.1，实现管理后台登录和二级折叠菜单布局（含配置管理一级菜单 + P5.9–P5.11 路由）
- 使用Sonnet4.6 LLM完成P5.2，实现数据看板
- 使用Sonnet4.6 LLM完成P5.3，实现保洁订单管理（被服务人列 + 分配弹窗 + 服务时段字段 + 代下单 + 无金额列），修改了服务人员不可见；查询条件不完整；新增订单报错；新增订单时间范围选择与居民端小程序不一致的问题
- 使用Sonnet4.6 LLM完成 P5.4，实现废品订单管理（同步代下单/分配弹窗 + 详情无重量/金额/收款字段）
- 使用Sonnet4.6 LLM完成P5.5，实现家政咨询单管理（被服务人列 + ConsultFollowUp 跟进时间轴 + 提交/完成按钮 + FOLLOW_UP/FOLLOWING/COMPLETED 状态名）
- 使用Sonnet4.6 LLM完成P5.6，实现服务人员管理（今日订单列 + 重置密码 + 技能单选 + 证书区 + 投诉记录列表 + 移除创收金额）
- 使用Sonnet4.6 LLM完成P5.7，实现投诉反馈管理（关联订单列 + 投诉内容列 + 移除旧列 + 完成按钮）
- 使用Sonnet4.6 LLM完成P5.9，实现服务配置管理（ServiceCatalog CRUD + 启用停用 toggle + 无价格字段）
- 使用默认 LLM完成P5.10，实现运营人员信息配置（Operator CRUD + 手机号完整展示）
- 使用默认 LLM完成P5.11，实现轮播图管理（Banner CRUD + 展示端筛选 + 排序数字）
- 使用Sonnet5 LLM完成P5.8、P5.8b，实现系统管理-用户管理（Admin 扩展字段迁移 + 默认密码Dyyj123.. + 重置密码 + 禁用即时失效 + 顶栏修改密码）;实现系统管理-功能授权（AdminPermission 迁移 + 权限树分配 + 侧栏菜单动态渲染 + 路由守卫拦截）
- 使用Sonnet5 LLM完成P512，实现管理后台首页/工作台（欢迎条 + 4 张按功能授权过滤的待办事项卡片，复用已有列表接口 total，无需新增后端接口）
- 使用Sonnet5 LLM完成P居民端小程序和员工端小程序Icon替换

## 问题修复

- 2026-08-07 居民端微信登录/手机号授权：后端接入真实 `code2session` + `getuserphonenumber`（配置 `WECHAT_CUSTOMER_APPID`/`SECRET` 时生效，未配置仍走 mock）；授权后不再显示假手机号；同微信号重登可按稳定 openid 找回历史订单；首页改为先登录再授权手机号，避免 `/auth/decrypt-phone` 401
- 2026-08-07 同事协作完成：居民端真实微信登录（code2session + getuserphonenumber），未配置密钥时回落 mock
- 2026-08-19 接手同事代码：员工端独立改密页 + 协议页、三端客服电话能力、居民端独立地址编辑页、订单完成流程与 shared 契约调整、双端图标素材全量替换、新增 HBuilderX 依赖软链脚本
