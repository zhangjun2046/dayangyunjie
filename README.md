# 大洋云洁 · 编码仓库 (dayangyunjie-code)

大洋云洁 · 智享社区综合服务平台 **专用代码 monorepo**（npm workspaces）。  
与资料/商务文档目录分离；默认分支为 `master`。

## 目录说明

| 路径 | 说明 |
| ---- | ---- |
| `apps/server` | NestJS 后端 API（Prisma + MySQL） |
| `apps/admin` | PC 管理后台（Vue 3 + Element Plus，开发端口 `5173`） |
| `apps/miniapp-admin` | 管理端 H5（uni-app：保洁/废品订单查看与派单，开发端口 `5176`） |
| `apps/miniapp-customer` | 居民端小程序（uni-app） |
| `apps/miniapp-worker` | 员工端小程序（uni-app） |
| `packages/shared` | 共享枚举、DTO、文案（`@dayangyunjie/shared`） |
| `docs/` | 技术文档主稿（CodingPlan、tech、Schema、部署等） |
| `plan/` | 近期未落地功能方案 |
| `requirement.md` | 需求主稿（原型图可在资料区单独存放） |

## 常用命令

在**仓库根目录**执行：

```bash
npm install                 # 安装依赖（仅根目录执行一次）
npm run build               # 编译 shared + 三端 miniapp(H5) + admin + server
npm run dev                 # 启动后端开发模式（默认 http://127.0.0.1:3000）

npm run dev:admin           # PC 管理后台 → http://localhost:5173
npm run dev:miniapp-admin   # 管理端 H5 → http://localhost:5176
npm run build:miniapp-admin # 管理端 H5 生产构建（产物 apps/miniapp-admin/dist/build/h5）

npm run dev:miniapp-customer
npm run dev:mp-weixin --workspace=@dayangyunjie/miniapp-customer
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-customer

npm run dev:miniapp-worker
npm run dev:mp-weixin --workspace=@dayangyunjie/miniapp-worker
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-worker
```

后端 Prisma（在 `apps/server` 下）：

```bash
cd apps/server
npx prisma generate
npx prisma migrate deploy   # 应用已有迁移（测试/生产推荐）
# 本地改 schema 时再用：npx prisma migrate dev
```

环境变量：复制根目录 [`.env.example`](./.env.example) 到 `apps/server/.env`（或按项目约定加载路径）后填写。**勿将含密钥的 `.env` 提交到 Git。**

## 环境要求

- Node.js **22+**
- MySQL **8**
- npm workspaces（根目录一次 `npm install` 即可）

> Windows 开发机历史上曾将 npm 缓存设为 `D:\npm-cache`（见根目录 `.npmrc`）。Linux/macOS 服务器部署请覆盖为本地缓存路径，详见 [`docs/TencentCloud-Test-Deploy.md`](./docs/TencentCloud-Test-Deploy.md)。

## 应用入口速查

| 应用 | 本地开发 | 账号说明 |
| ---- | -------- | -------- |
| 后端 API / Swagger | `http://127.0.0.1:3000` · `/api/docs` | — |
| PC 管理后台 | `http://localhost:5173` | Admin 邮箱+密码（种子示例常见为 `admin@dayunyunjie.com` / `admin123`） |
| 管理端 H5 | `http://localhost:5176` | 同上 Admin；开发态 `/api/v1` 由 Vite 代理到后端 |
| 居民端 / 员工端 | H5 或微信开发者工具打开对应 `dist` | 居民：微信登录；员工：手机号+密码 |

管理端 H5 说明见 [`apps/miniapp-admin/README.md`](./apps/miniapp-admin/README.md)。

## 文档索引

| 文档 | 用途 |
| ---- | ---- |
| [`docs/CodingPlan.md`](./docs/CodingPlan.md) | 分阶段开发计划与验收（Cursor Agent 主稿） |
| [`docs/tech.md`](./docs/tech.md) | 技术选型 |
| [`docs/TencentCloud-Test-Deploy.md`](./docs/TencentCloud-Test-Deploy.md) | 腾讯云测试环境装机与运维 |
| [`docs/Remote-Server-Update.md`](./docs/Remote-Server-Update.md) | 远程 Linux 服务器日常代码更新 |
| [`plan/wechat-notify-auth-roadmap.md`](./plan/wechat-notify-auth-roadmap.md) | 微信订单通知方案 |
| [`plan/appoint-time-lead-validation.md`](./plan/appoint-time-lead-validation.md) | 预约时间过期与派单缓冲校验 |
| [`plan/biz-dict.md`](./plan/biz-dict.md) | 管理端业务字典 |
| [`plan/code-update-steps.md`](./plan/code-update-steps.md) | 上述方案的分步改代码手册 |

## 近期能力（摘要）

- **管理端 H5**（`apps/miniapp-admin`）：保洁/废品订单列表与详情、按权限 Tab、分配/改派、Token 刷新
- **员工在职/离职**：`Worker.employmentStatus`（`ACTIVE` / `RESIGNED`）；离职不可派单、不可登录员工端；PC 员工管理可筛选/编辑
- **投诉 / 咨询「完成」**：须先校验并落库本次跟进，再推进到已完成
- P1–P5：后端核心 API、居民端、员工端、PC 管理后台已按 CodingPlan 收口；测试环境部署见上文文档

更完整的阶段清单见 `docs/CodingPlan.md`。

## 问题修复（摘录）

- 2026-08-27 员工在职/离职：新增 `employment_status` 字段与 migration；派单/改派与员工登录拦截离职账号；PC/H5 派单候选排除离职
- 2026-08-27 管理端投诉/咨询：点「完成」时先提交跟进记录，避免只改状态漏跟进
- 2026-08-27 居民端订单详情取消按钮改为中性灰样式；员工端登录支持密码可见切换
- 2026-08-07 居民端微信登录/手机号授权：配置 `WECHAT_CUSTOMER_APPID`/`SECRET` 后走真实 `code2session` / 取号，未配置仍走 mock
- 2026-08-20 投诉原因多选：`reasons` JSON + migration / 手工升级 SQL；多端展示对齐
- 2026-08-20～08-21 订单状态文案统一、服务进度、改派规则、远程图片 `RemoteImage`、员工端登录白屏与作业区引导等（详见 git 历史）

## Cursor Agent

- 将工作区根目录设为本仓库根（含 `apps/`、`packages/`、`docs/`）
- 开发计划与口令：`docs/CodingPlan.md`
- AI/工具日志目录可按团队约定放在 `.cursor-logs/`（定期清理，见 CodingPlan §2.1）
