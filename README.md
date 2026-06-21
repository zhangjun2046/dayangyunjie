# 大洋云洁 · 编码仓库 (dayangyunjie-code)

本目录为**专用代码 monorepo**，与资料目录 `D:\coding\dayangyunjie`（商务/调研文档）平级分离。

## 目录说明

| 路径                    | 说明                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `apps/server`           | NestJS 后端 API                                                |
| `apps/miniapp-customer` | 居民端小程序（P1.4 完善；含 shared 验收桩）                    |
| `apps/miniapp-worker`   | 员工端小程序（P1.4 完善；含 shared 验收桩）                    |
| `apps/admin`            | 管理后台（P1.5 完善；含 shared 验收桩）                        |
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
npm run dev:miniapp-worker    # 启动员工端 uni-app H5
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
