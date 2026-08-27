# 员工在职/离职状态 — 远程部署指导

> **变更主题**：员工新增 `employmentStatus`（在职 / 离职）；离职员工不可派单、不可登录员工端。  
> **适用环境**：腾讯云测试机（路径与进程名以 [`docs/TencentCloud-Test-Deploy.md`](../docs/TencentCloud-Test-Deploy.md) 为准）。  
> **关联 SQL**：[`plan/sql/add-worker-employment-status.sql`](./sql/add-worker-employment-status.sql)（与 Prisma migration 语义一致）。

---

## 1. 本次要上线的内容

| 层级 | 改动 | 是否必须部署 |
|------|------|-------------|
| MySQL | `workers.employment_status`（`ACTIVE` / `RESIGNED`，默认在职） | **必须** |
| 后端 Nest | 派单/改派校验、员工 CRUD/筛选、离职禁止登录 | **必须** |
| PC 管理后台 | 员工列表筛选/列/表单「在职状态」；派单候选排除离职 | **必须** |
| 管理端 H5（`miniapp-admin`） | 派单候选排除离职（若该环境已托管 H5） | 按需 |
| shared | `WorkerEmploymentStatus` 枚举与中文文案 | 随前后端构建带上 |

**未改**：居民端小程序、员工端业务页（仅登录接口在服务端拦截离职）。

---

## 2. 上线前（本机）检查清单

- [ ] 相关代码已提交并 push 到远程将要拉取的分支（测试机一般为 `master`）
- [ ] Prisma migration 已入库，且 `.gitignore` 已放行目录  
  `apps/server/prisma/migrations/20260827100000_add_worker_employment_status/`  
  （本仓库默认忽略 `migrations/*`，未放行则服务器 `git pull` 后**没有**该文件，`migrate deploy` 不会加列）
- [ ] 本机已验证：`GET /api/v1/workers` 返回字段含 `employmentStatus`
- [ ] 本机已验证：将员工设为离职后，派单接口返回业务错误；员工端登录被拒绝
- [ ] 确认服务器当前可 SSH，并已备份数据库（见 §3）

---

## 3. 数据库备份（强烈建议）

SSH 登录服务器后：

```bash
# 按实际账号/库名修改；测试机常见为本机 MySQL
mysqldump -u <user> -p <database> workers > /root/backup_workers_$(date +%Y%m%d_%H%M%S).sql
# 或整库：
# mysqldump -u <user> -p <database> > /root/backup_full_$(date +%Y%m%d_%H%M%S).sql
```

---

## 4. 部署步骤（服务器）

以下默认部署目录为 `/opt/dayangyunjie-code`，PM2 进程名为 `dayangyunjie-api`，管理后台静态目录为 `/var/www/dayangyunjie-admin/`。若你环境路径不同，请替换。

### 4.1 拉取代码与安装依赖

```bash
cd /opt/dayangyunjie-code
git fetch origin
git status
git pull origin master   # 或你们实际发布分支

# 确认 migration 文件已在仓库中
ls apps/server/prisma/migrations/20260827100000_add_worker_employment_status/migration.sql

npm install
```

若 `ls` 报文件不存在：说明 migration 未 push / 未改 `.gitignore`，**不要继续**；先在开发机补齐入库再部署。临时兜底可手工执行 §4.2「备选：手工 SQL」。

### 4.2 升级数据库（二选一，勿重复）

**推荐：Prisma migrate deploy**

```bash
cd /opt/dayangyunjie-code/apps/server
npx prisma migrate deploy
npx prisma migrate status
npx prisma generate
cd /opt/dayangyunjie-code
```

成功标志：日志出现已应用  
`20260827100000_add_worker_employment_status`，且 `migrate status` 无 pending。

**备选：手工 SQL**（仅当 migration 文件未随代码到达服务器时）

```bash
# 将 plan/sql/add-worker-employment-status.sql 拷到服务器后：
mysql -u <user> -p <database> < /opt/dayangyunjie-code/plan/sql/add-worker-employment-status.sql
```

执行后建议在 MySQL 中确认：

```sql
SHOW COLUMNS FROM workers LIKE 'employment_status';
-- 期望：enum('ACTIVE','RESIGNED')，默认 ACTIVE
```

> 若已用 `migrate deploy` 成功加列，**不要再跑**手工 SQL，否则会报 Duplicate column。

### 4.3 构建后端 + shared，重启 API

```bash
cd /opt/dayangyunjie-code
npm run build --workspace=@dayangyunjie/shared
npm run build --workspace=@dayangyunjie/server
pm2 restart dayangyunjie-api
pm2 status
pm2 logs dayangyunjie-api --lines 50
```

确认进程 `online`，日志无 Prisma / 缺列报错。

### 4.4 构建并发布 PC 管理后台

```bash
cd /opt/dayangyunjie-code
npm run build --workspace=@dayangyunjie/admin
sudo cp -r apps/admin/dist/* /var/www/dayangyunjie-admin/
```

浏览器强刷（或清缓存）后打开「服务人员」页。

### 4.5（可选）管理端 H5

若测试环境已单独托管 `miniapp-admin`：

```bash
cd /opt/dayangyunjie-code
npm run build:miniapp-admin
# 产物：apps/miniapp-admin/dist/build/h5
# 按现有 Nginx 静态目录覆盖发布；同域反代 /api/v1 即可
```

若尚未部署 H5，可跳过；PC 管理后台与后端校验已能保证「离职不可派单」。

---

## 5. 上线验收

| # | 操作 | 期望 |
|---|------|------|
| 1 | `GET /api/v1/workers?page=1&pageSize=1`（带 Admin Token） | `code=0`，条目含 `"employmentStatus":"ACTIVE"` |
| 2 | PC「服务人员」列表 | 可见「服务状态」「在职状态」两列；可按在职/离职筛选 |
| 3 | 编辑某员工为「离职」并保存 | 保存成功；列表显示「离职」 |
| 4 | 对保洁/废品待派单订单派给该离职员工 | 接口失败，文案含「离职员工不可派单」；前端候选列表也不应出现该人 |
| 5 | 用该员工手机号登录员工端 | 登录失败（账号已离职） |
| 6 | 改回「在职」后再派单 | 可正常派单（仍须满足空闲 + 技能匹配） |

快速 curl 示例（替换 Token 与主机）：

```bash
curl -s "http://<host>/api/v1/workers?page=1&pageSize=1" \
  -H "Authorization: Bearer <admin_access_token>"
```

若仍返回 500 且无 `employmentStatus`：多半是 **库未升级** 或 **后端未重启 / 未重新 generate**。对照本机曾出现的错误：Prisma 查询新字段而 MySQL 无列 → Internal server error。

---

## 6. 回滚说明

| 层级 | 做法 |
|------|------|
| 代码 | `git checkout` 到上一发布 commit → 重新 `build` shared/server/admin → `pm2 restart` → 覆盖静态资源 |
| 数据库 | 仅在确认无依赖后执行 [`plan/sql/add-worker-employment-status.rollback.sql`](./sql/add-worker-employment-status.rollback.sql)；或从 §3 备份恢复 `workers` |

> 回滚库字段前，必须先回滚依赖该字段的后端代码，否则仍会 500。

---

## 7. 常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| `/workers` 500，message 为 Internal server error | 代码已上、库未加列 | 执行 §4.2 |
| `migrate deploy` 显示 No pending / 未应用本迁移 | migration 未随 git 到达 | 检查 `.gitignore` 放行与 push；或改用手工 SQL |
| `Duplicate column 'employment_status'` | migrate 与手工 SQL 重复执行 | 忽略；用 `SHOW COLUMNS` 确认列已存在即可 |
| 列表能开，派单仍能选到离职员工 | 管理后台静态资源未更新 | 重做 §4.4 并强刷浏览器 |
| 员工端仍能登录离职账号 | 后端未重启或打到旧进程 | `pm2 restart dayangyunjie-api` 并确认 `pm2 status` |

---

## 8. 一键命令摘要（熟悉环境后）

```bash
cd /opt/dayangyunjie-code
git pull origin master
npm install
cd apps/server && npx prisma migrate deploy && npx prisma generate && cd ../..
npm run build --workspace=@dayangyunjie/shared
npm run build --workspace=@dayangyunjie/server
npm run build --workspace=@dayangyunjie/admin
pm2 restart dayangyunjie-api
sudo cp -r apps/admin/dist/* /var/www/dayangyunjie-admin/
```

完整环境基建（Nginx / PM2 / CORS / 首次装机）见 [`docs/TencentCloud-Test-Deploy.md`](../docs/TencentCloud-Test-Deploy.md)，本文只覆盖**本功能增量发布**。
