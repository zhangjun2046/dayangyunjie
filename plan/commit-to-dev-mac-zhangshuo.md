# 提交到 `dev/mac-zhangshuo`（范围清单）

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-20  
> 性质：提交操作说明（不改业务代码，只约定「交什么 / 不交什么 / 怎么挂远程」）  
> 目标仓库：https://github.com/zhangjun2046/dayangyunjie  
> 目标分支：**`dev/mac-zhangshuo`**（远程没有单独的 `mac-zhangshuo`；勿写错）  
> 对比基准：远程 `dev/mac-zhangshuo` @ `54981a8c` 与本地工作区差异（2026-08-20 核对）

---

## 0. 前置现状（提交前必读）

1. 本地目录 `dayangyunjie-master` **当前不是 git 仓库**（无 `.git`），需要先挂到远程再提交。  
2. 远程已有完整 monorepo；本次不是「首次推空仓」，而是把本地相对该分支的**增量**推上去。  
3. 本地存在 `apps/server/.env`，**禁止提交**（已在 `.gitignore`）。  
4. `.gitignore` 默认忽略 `apps/server/prisma/migrations/`；投诉多选的 Prisma migration 是否入库需与团队约定（见 §3）。

---

## 1. 本次应提交的功能范围

| 批次 | 内容 | 说明 |
|------|------|------|
| A | 投诉原因多选 | 见 [`complaint-reasons-multi-select.md`](./complaint-reasons-multi-select.md) |
| B | 订单计划第 1 步：状态文案统一 | 见 [`order-status-labels-consolidate.md`](./order-status-labels-consolidate.md) |
| C | 订单计划第 2 步：服务进度 | 见 [`order-service-progress.md`](./order-service-progress.md) |
| D | 订单计划第 3 步：员工统计与改派 | 见 [`order-plans-execution-order.md`](./order-plans-execution-order.md) |
| E | README 问题修复条目 | 2026-08-20 四条说明 |

建议：**一个 commit 交 A–E**，或拆成「投诉多选」+「订单计划 1–3 + README」两个 commit。不要混入无关本地实验。

---

## 2. 文件清单（相对远程：CHANGED / NEW）

路径均相对仓库根。标记含义：

- **NEW**：远程分支上不存在，本地新增  
- **CHANGED**：远程已有，本地内容不同  

### 2.1 Shared

| 状态 | 路径 |
|------|------|
| CHANGED | `packages/shared/src/entities/order.ts` |

`packages/shared/src/index.ts` 与远程一致，**不必为本次特意改**。

### 2.2 后端 — 服务进度（NEW）

| 状态 | 路径 |
|------|------|
| NEW | `apps/server/src/common/order-progress/order-progress.service.ts` |
| NEW | `apps/server/src/common/order-progress/order-progress.module.ts` |
| NEW | `apps/server/src/common/order-progress/order-progress.service.spec.ts` |

### 2.3 后端 — 保洁 / 废品订单（改派 + progress）

| 状态 | 路径 |
|------|------|
| CHANGED | `apps/server/src/modules/cleaning-order/cleaning-order.service.ts` |
| CHANGED | `apps/server/src/modules/cleaning-order/cleaning-order.controller.ts` |
| CHANGED | `apps/server/src/modules/cleaning-order/cleaning-order.module.ts` |
| NEW | `apps/server/src/modules/cleaning-order/dto/reassign-order.dto.ts` |
| NEW | `apps/server/src/modules/cleaning-order/cleaning-order-reassign.spec.ts` |
| CHANGED | `apps/server/src/modules/recycling-order/recycling-order.service.ts` |
| CHANGED | `apps/server/src/modules/recycling-order/recycling-order.controller.ts` |
| CHANGED | `apps/server/src/modules/recycling-order/recycling-order.module.ts` |
| NEW | `apps/server/src/modules/recycling-order/dto/reassign-order.dto.ts` |
| NEW | `apps/server/src/modules/recycling-order/recycling-order-reassign.spec.ts` |

### 2.4 后端 — 咨询单 / 员工 / 评价 / 投诉 / Schema

| 状态 | 路径 |
|------|------|
| CHANGED | `apps/server/src/modules/consult-order/consult-order.service.ts` |
| CHANGED | `apps/server/src/modules/consult-order/consult-order.controller.ts` |
| CHANGED | `apps/server/src/modules/consult-order/consult-order.module.ts` |
| CHANGED | `apps/server/src/modules/worker/worker.service.ts` |
| NEW | `apps/server/src/modules/worker/worker.service.spec.ts` |
| CHANGED | `apps/server/src/modules/review/review.service.ts` |
| CHANGED | `apps/server/src/modules/complaint/complaint.service.ts` |
| CHANGED | `apps/server/prisma/schema.prisma` |

### 2.5 居民端小程序

| 状态 | 路径 |
|------|------|
| NEW | `apps/miniapp-customer/src/constants/order-status.ts` |
| CHANGED | `apps/miniapp-customer/src/components/OrderStatusTimeline.vue` |
| CHANGED | `apps/miniapp-customer/src/pages/order-detail/index.vue` |
| CHANGED | `apps/miniapp-customer/src/pages/orders/index.vue` |
| CHANGED | `apps/miniapp-customer/src/pages/complaint/index.vue` |
| CHANGED | `apps/miniapp-customer/src/pages/complaint-detail/index.vue` |
| CHANGED | `apps/miniapp-customer/src/pages/complaint-list/index.vue` |
| CHANGED | `apps/miniapp-customer/src/api/complaint.ts` |

### 2.6 员工端小程序

| 状态 | 路径 |
|------|------|
| NEW | `apps/miniapp-worker/src/constants/order-status.ts` |
| CHANGED | `apps/miniapp-worker/src/pages/task-detail/index.vue` |
| CHANGED | `apps/miniapp-worker/src/pages/index/index.vue` |
| CHANGED | `apps/miniapp-worker/src/pages/mine/index.vue` |
| CHANGED | `apps/miniapp-worker/src/pages/tasks/index.vue` |
| CHANGED | `apps/miniapp-worker/src/api/worker.ts` |
| CHANGED | `apps/miniapp-worker/src/api/order.ts` |

### 2.7 管理端

| 状态 | 路径 |
|------|------|
| CHANGED | `apps/admin/src/views/orders/cleaning/index.vue` |
| CHANGED | `apps/admin/src/views/orders/recycling/index.vue` |
| CHANGED | `apps/admin/src/views/orders/complaint/index.vue` |
| CHANGED | `apps/admin/src/views/workers/index.vue` |
| CHANGED | `apps/admin/src/api/cleaning.ts` |
| CHANGED | `apps/admin/src/api/recycling.ts` |
| CHANGED | `apps/admin/src/api/worker.ts` |
| CHANGED | `apps/admin/src/api/complaint.ts` |

### 2.8 文档与手工 SQL

| 状态 | 路径 |
|------|------|
| CHANGED | `README.md`（问题修复：投诉多选 + 订单计划 1–3 步） |
| NEW | `plan/order-plans-execution-order.md` |
| NEW | `plan/complaint-reasons-multi-select.md` |
| NEW | `plan/order-service-progress.md` |
| NEW | `plan/order-status-labels-consolidate.md` |
| NEW | `plan/sql/complaint-reasons-enum-to-json.sql` |
| NEW | `plan/sql/complaint-reasons-enum-to-json.rollback.sql` |
| NEW | `plan/commit-to-dev-mac-zhangshuo.md`（本文） |

可选一并提交（若希望计划目录完整入库，与本次功能无强绑定）：

- `plan/appoint-time-lead-validation.md`（远程无；预约提前期计划，代码侧当时与远程一致）
- 其他本地已有、远程尚无的 `plan/*.md`（按需决定，避免一次塞太多无关文档）

---

## 3. Prisma migrations 怎么处理

本地已有：

```text
apps/server/prisma/migrations/20260820000000_complaint_reasons_json/
```

但根目录 `.gitignore` 含：

```text
apps/server/prisma/migrations/
```

**两种做法（二选一，提交前与协作者确认）：**

| 方案 | 操作 |
|------|------|
| A. 只交手工 SQL（推荐与现有约定一致） | **不**强制 add `migrations/`；依赖 `plan/sql/complaint-reasons-*.sql` + `schema.prisma` |
| B. migrations 也入库 | `git add -f apps/server/prisma/migrations/20260820000000_complaint_reasons_json`（仅本条；不要把整个 ignore 规则删掉除非团队统一改） |

---

## 4. 明确不要提交

| 路径 / 类型 | 原因 |
|-------------|------|
| `apps/server/.env` | 密钥与本地配置 |
| `node_modules/` | 依赖安装产物 |
| `dist/`、`build/`、`*.tsbuildinfo` | 构建产物 |
| `uploads/` | 本地上传文件 |
| `.DS_Store`、`.idea/`、`.vscode/` | IDE / 系统垃圾 |
| `.workbuddy/`、`.cursor-logs/`、`.claude/` | 本地工具目录（若存在） |
| 与远程 **SAME**、且未参与 A–E 的业务文件 | 例如当时核对过的 `booking-cleaning/index.vue` 等 |

---

## 5. 推荐操作步骤（手工执行）

> 以下为建议命令；在已能访问 GitHub、已配置 SSH/HTTPS 凭据的前提下执行。

### 5.1 挂上远程（本地尚无 `.git` 时）

**方式一：clone 再覆盖（更稳）**

```bash
cd ~/Desktop
git clone -b dev/mac-zhangshuo git@github.com:zhangjun2046/dayangyunjie.git dayangyunjie-push
# 将 dayangyunjie-master 中 §2 清单内文件复制到 dayangyunjie-push 对应路径
cd dayangyunjie-push
git status
```

**方式二：在现有目录 init（注意别把无关文件一起 add）**

```bash
cd /Users/zhangshuo/Desktop/dayangyunjie-master
git init
git remote add origin git@github.com:zhangjun2046/dayangyunjie.git
git fetch origin
git checkout -b dev/mac-zhangshuo origin/dev/mac-zhangshuo
# 若本地未跟踪文件与远程冲突，用 status 核对后再 add §2 清单
```

### 5.2 只暂存清单内文件

示例（按需增减；migrations 见 §3）：

```bash
git add \
  packages/shared/src/entities/order.ts \
  apps/server/src/common/order-progress \
  apps/server/src/modules/cleaning-order \
  apps/server/src/modules/recycling-order \
  apps/server/src/modules/consult-order \
  apps/server/src/modules/worker/worker.service.ts \
  apps/server/src/modules/worker/worker.service.spec.ts \
  apps/server/src/modules/review/review.service.ts \
  apps/server/src/modules/complaint/complaint.service.ts \
  apps/server/prisma/schema.prisma \
  apps/miniapp-customer/src/constants/order-status.ts \
  apps/miniapp-customer/src/components/OrderStatusTimeline.vue \
  apps/miniapp-customer/src/pages/order-detail/index.vue \
  apps/miniapp-customer/src/pages/orders/index.vue \
  apps/miniapp-customer/src/pages/complaint \
  apps/miniapp-customer/src/pages/complaint-detail \
  apps/miniapp-customer/src/pages/complaint-list \
  apps/miniapp-customer/src/api/complaint.ts \
  apps/miniapp-worker/src/constants/order-status.ts \
  apps/miniapp-worker/src/pages/task-detail/index.vue \
  apps/miniapp-worker/src/pages/index/index.vue \
  apps/miniapp-worker/src/pages/mine/index.vue \
  apps/miniapp-worker/src/pages/tasks/index.vue \
  apps/miniapp-worker/src/api/worker.ts \
  apps/miniapp-worker/src/api/order.ts \
  apps/admin/src/views/orders/cleaning/index.vue \
  apps/admin/src/views/orders/recycling/index.vue \
  apps/admin/src/views/orders/complaint/index.vue \
  apps/admin/src/views/workers/index.vue \
  apps/admin/src/api/cleaning.ts \
  apps/admin/src/api/recycling.ts \
  apps/admin/src/api/worker.ts \
  apps/admin/src/api/complaint.ts \
  README.md \
  plan/order-plans-execution-order.md \
  plan/complaint-reasons-multi-select.md \
  plan/order-service-progress.md \
  plan/order-status-labels-consolidate.md \
  plan/sql \
  plan/commit-to-dev-mac-zhangshuo.md

git status   # 确认无 .env / node_modules / dist
```

### 5.3 提交并推送

```bash
git commit -m "$(cat <<'EOF'
feat: 投诉原因多选与订单进度/改派/员工统计

统一三端状态文案与服务进度展示；管理端仅 ASSIGNED 可改派；完善员工完成率与评分回写；投诉原因改为 reasons JSON 数组。
EOF
)"

git push -u origin HEAD:dev/mac-zhangshuo
```

推送前再确认：`git remote -v` 指向 `zhangjun2046/dayangyunjie`，分支为 `dev/mac-zhangshuo`。

---

## 6. 提交后自检

- [ ] GitHub 上 `dev/mac-zhangshuo` 可见本次 commit  
- [ ] README「问题修复」含 2026-08-20 四条  
- [ ] 无 `.env`、无 `node_modules` 进入 diff  
- [ ] 生产升级投诉字段：已准备好执行 `plan/sql/complaint-reasons-enum-to-json.sql`（或 Prisma migrate，视 §3 方案）

---

## 7. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-08-20 | 初稿：相对 `dev/mac-zhangshuo` 的提交范围与操作步骤 |
