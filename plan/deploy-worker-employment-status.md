# 员工在职/离职 + 管理端 H5 — 远程部署指导

> **变更主题**  
> 1. 员工新增 `employmentStatus`（在职 / 离职）；离职不可派单、不可登录员工端。  
> 2. **首次**将 `apps/miniapp-admin` 管理端 H5 部署到测试机（与 PC 管理后台同域共存）。  
> **适用环境**：腾讯云测试机（路径与进程名以 [`docs/TencentCloud-Test-Deploy.md`](../docs/TencentCloud-Test-Deploy.md) 为准）。  
> **关联 SQL**：[`plan/sql/add-worker-employment-status.sql`](./sql/add-worker-employment-status.sql)（与 Prisma migration 语义一致）。

---

## 1. 本次要上线的内容

| 层级 | 改动 | 是否必须部署 |
|------|------|-------------|
| MySQL | `workers.employment_status`（`ACTIVE` / `RESIGNED`，默认在职） | **必须** |
| 后端 Nest | 派单/改派校验、员工 CRUD/筛选、离职禁止登录 | **必须** |
| PC 管理后台 | 员工列表筛选/列/表单「在职状态」；派单候选排除离职 | **必须** |
| 管理端 H5（`miniapp-admin`） | 订单查看/派单；派单候选排除离职；静态资源 + Nginx 子路径 | **必须（首次）** |
| Nginx | 新增 `/admin/` 静态站点（见 §4.6） | **必须（首次）** |
| shared | `WorkerEmploymentStatus` 枚举与中文文案 | 随前后端构建带上 |

**未改**：居民端小程序、员工端业务页（仅登录接口在服务端拦截离职）。

### 访问地址（部署完成后）

| 应用 | URL |
|------|-----|
| PC 管理后台 | `http://118.195.149.50/` |
| 管理端 H5 | `http://118.195.149.50/admin/` |
| API | `http://118.195.149.50/api/v1/...`（两端共用） |

H5 使用 **hash 路由**，登录页实际为：  
`http://118.195.149.50/admin/#/pages/login/index`  
账号与 PC 相同（Admin 邮箱 + 密码）。

---

## 2. 上线前（本机）检查清单

- [ ] 相关代码已提交并 push 到远程将要拉取的分支（测试机一般为 `master`）
- [ ] Prisma migration 已入库，且 `.gitignore` 已放行目录  
  `apps/server/prisma/migrations/20260827100000_add_worker_employment_status/`  
  （本仓库默认忽略 `migrations/*`，未放行则服务器 `git pull` 后**没有**该文件，`migrate deploy` 不会加列）
- [ ] 生产构建 `base` 为 `/admin/`（`apps/miniapp-admin/vite.config.ts`：`NODE_ENV === 'production'` 时生效）
- [ ] 本机已验证：`GET /api/v1/workers` 返回字段含 `employmentStatus`
- [ ] 本机已验证：将员工设为离职后，派单接口返回业务错误；员工端登录被拒绝
- [ ] 确认服务器当前可 SSH，并已备份数据库与现有 Nginx 配置（见 §3）

---

## 3. 备份（强烈建议）

SSH 登录服务器后：

```bash
# 数据库（按实际账号/库名修改）
mysqldump -u <user> -p <database> workers > /root/backup_workers_$(date +%Y%m%d_%H%M%S).sql
# 或整库：
# mysqldump -u <user> -p <database> > /root/backup_full_$(date +%Y%m%d_%H%M%S).sql

# Nginx 现网配置
sudo cp /etc/nginx/conf.d/dayangyunjie.conf \
  /root/dayangyunjie.conf.bak.$(date +%Y%m%d_%H%M%S)
```

---

## 4. 部署步骤（服务器）

默认约定：

| 项 | 路径 / 名称 |
|----|-------------|
| 代码目录 | `/opt/dayangyunjie-code` |
| PM2 进程 | `dayangyunjie-api` |
| PC 管理后台静态 | `/var/www/dayangyunjie-admin/` |
| 管理端 H5 静态 | `/var/www/dayangyunjie-miniapp-admin/` |
| Nginx 配置 | `/etc/nginx/conf.d/dayangyunjie.conf` |

### 4.1 拉取代码与安装依赖

```bash
cd /opt/dayangyunjie-code
git fetch origin
git status
git pull origin master   # 或你们实际发布分支

# 确认 migration 与 miniapp-admin 已在仓库中
ls apps/server/prisma/migrations/20260827100000_add_worker_employment_status/migration.sql
ls apps/miniapp-admin/package.json

npm install
```

若 migration 的 `ls` 报不存在：说明未 push / 未改 `.gitignore`，**不要继续**；先在开发机补齐入库。临时兜底可手工执行 §4.2「备选：手工 SQL」。

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
mysql -u <user> -p <database> < /opt/dayangyunjie-code/plan/sql/add-worker-employment-status.sql
```

确认：

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
sudo mkdir -p /var/www/dayangyunjie-admin
sudo cp -r apps/admin/dist/* /var/www/dayangyunjie-admin/
```

浏览器强刷后打开 `http://118.195.149.50/` →「服务人员」页。

### 4.5 构建并发布管理端 H5（首次必做）

```bash
cd /opt/dayangyunjie-code
npm run build:miniapp-admin

# 产物目录
ls apps/miniapp-admin/dist/build/h5/index.html

# 发布到独立静态目录（不要覆盖 PC 管理后台）
sudo mkdir -p /var/www/dayangyunjie-miniapp-admin
sudo rm -rf /var/www/dayangyunjie-miniapp-admin/*
sudo cp -r apps/miniapp-admin/dist/build/h5/* /var/www/dayangyunjie-miniapp-admin/
sudo chown -R nginx:nginx /var/www/dayangyunjie-miniapp-admin   # 用户名以服务器实际为准，也可能是 www-data
```

校验产物里的资源路径应带 `/admin/` 前缀（例如 `index.html` 中的 `src="/admin/assets/..."`）。若仍是根路径 `/assets/...`，说明构建未带上 `base`，需确认代码已 pull 到含 `vite.config.ts` base 配置的版本后重构建。

### 4.6 修改 Nginx（首次必做）

编辑 `/etc/nginx/conf.d/dayangyunjie.conf`，在**保留**现有 `/`、`/api/`、`/uploads/` 的基础上，**新增** `/admin/`。完整参考如下（可直接整文件替换，替换前请确认 §3 已备份）：

```nginx
server {
    listen 80;
    server_name 118.195.149.50;
    client_max_body_size 10m;

    # ── PC 管理后台（原有）────────────────────────────────
    root /var/www/dayangyunjie-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── 管理端 H5（新增）：同域子路径 /admin/ ───────────
    # 与 PC 后台共用下方 /api/、/uploads/，无需单独配置 API
    location = /admin {
        return 301 /admin/;
    }

    location /admin/ {
        alias /var/www/dayangyunjie-miniapp-admin/;
        index index.html;
        # hash 路由由前端处理；此处保证目录与静态资源可访问
        try_files $uri $uri/ /admin/index.html;
    }

    # ── API / 上传（原有，两端共用）───────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

校验并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

> **说明**  
> - H5 请求 API 使用相对路径 `/api/v1`，与 PC 同域，**不必**再配 `VITE_API_BASE` / 改 `CORS_ORIGIN`。  
> - 若 `try_files` + `alias` 在个别 Nginx 版本上报错或 404，可改为仅 `alias` + `index`（hash 模式一般够用）：  
>   `location /admin/ { alias /var/www/dayangyunjie-miniapp-admin/; index index.html; }`

### 4.7（可选）确认 CORS

同域访问时通常无需改动。若 `apps/server/.env` 已有：

```env
CORS_ORIGIN=http://118.195.149.50
```

保持即可。修改后需重新 `build` server 并 `pm2 restart dayangyunjie-api`。

---

## 5. 上线验收

### 5.1 在职/离职

| # | 操作 | 期望 |
|---|------|------|
| 1 | `GET /api/v1/workers?page=1&pageSize=1`（带 Admin Token） | `code=0`，条目含 `"employmentStatus":"ACTIVE"` |
| 2 | PC「服务人员」列表 | 可见「服务状态」「在职状态」；可按在职/离职筛选 |
| 3 | 编辑某员工为「离职」并保存 | 保存成功；列表显示「离职」 |
| 4 | PC / H5 对待派单订单派给该离职员工 | 接口失败（离职不可派单）；候选列表无此人 |
| 5 | 用该员工手机号登录员工端 | 登录失败（账号已离职） |
| 6 | 改回「在职」后再派单 | 可正常派单（仍须空闲 + 技能匹配） |

### 5.2 管理端 H5

| # | 操作 | 期望 |
|---|------|------|
| 1 | 浏览器打开 `http://118.195.149.50/admin/` | 出现登录页（非 PC 后台、非 404） |
| 2 | Admin 邮箱+密码登录 | 进入订单列表 |
| 3 | 切换保洁/废品 Tab、下拉刷新 | 列表正常；接口走同域 `/api/v1` |
| 4 | 打开待派单 → 分配/改派 | 可选到在职空闲员工；离职员工不出现 |
| 5 | 打开订单详情 → 返回 | 能回到列表（hash 路由） |
| 6 | 强刷 `http://118.195.149.50/admin/#/pages/orders/index` | 不 404 |

快速 curl：

```bash
curl -sI http://118.195.149.50/admin/
# 期望 200，Content-Type 含 text/html

curl -s "http://118.195.149.50/api/v1/workers?page=1&pageSize=1" \
  -H "Authorization: Bearer <admin_access_token>"
```

若 `/workers` 仍 500 且无 `employmentStatus`：多半是 **库未升级** 或 **后端未重启 / 未 generate**。

---

## 6. 回滚说明

| 层级 | 做法 |
|------|------|
| 管理端 H5 | 删除或注释 Nginx 中 `/admin/` 段 → `nginx -t && systemctl reload nginx`；可选清空 `/var/www/dayangyunjie-miniapp-admin/` |
| Nginx 整体 | 用 §3 备份的 `dayangyunjie.conf.bak.*` 覆盖回 `/etc/nginx/conf.d/dayangyunjie.conf` 后 reload |
| 代码 | `git checkout` 到上一发布 commit → 重新 build shared/server/admin → `pm2 restart` → 覆盖 PC 静态资源 |
| 数据库 | 确认无依赖后执行 [`plan/sql/add-worker-employment-status.rollback.sql`](./sql/add-worker-employment-status.rollback.sql)；或从 §3 备份恢复 |

> 回滚库字段前，必须先回滚依赖该字段的后端代码，否则仍会 500。

---

## 7. 常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| `/workers` 500 | 代码已上、库未加列 | 执行 §4.2 |
| `migrate deploy` 未应用本迁移 | migration 未随 git 到达 | 检查 `.gitignore` 放行与 push；或手工 SQL |
| `Duplicate column 'employment_status'` | migrate 与手工 SQL 重复 | 忽略；`SHOW COLUMNS` 确认即可 |
| PC 列表正常，派单仍出现离职员工 | PC 静态未更新 | 重做 §4.4 并强刷 |
| 打开 `/admin/` 404 | Nginx 未改或未 reload | 检查 §4.6；`nginx -t` |
| `/admin/` 白屏，控制台 JS 404 | 构建 `base` 未带 `/admin/`，或静态未拷全 | 确认 vite base → 重做 §4.5 |
| `/admin/` 打开却是 PC 后台 | `location /` 抢先匹配或 alias 写错 | 确认 `location /admin/` 在配置中且 `alias` 指向 miniapp 目录 |
| H5 登录后接口跨域 / 连不上 | 误配了绝对 API 域名 | 同域应使用默认 `/api/v1`；检查是否多余设置了 `VITE_API_BASE` |
| 员工端仍能登录离职账号 | 后端未重启 | `pm2 restart dayangyunjie-api` |

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
npm run build:miniapp-admin
pm2 restart dayangyunjie-api
sudo cp -r apps/admin/dist/* /var/www/dayangyunjie-admin/
sudo mkdir -p /var/www/dayangyunjie-miniapp-admin
sudo rm -rf /var/www/dayangyunjie-miniapp-admin/*
sudo cp -r apps/miniapp-admin/dist/build/h5/* /var/www/dayangyunjie-miniapp-admin/
# 首次还需按 §4.6 改 Nginx，之后只需：
sudo nginx -t && sudo systemctl reload nginx
```

完整环境基建（首次装机、PM2、MySQL）见 [`docs/TencentCloud-Test-Deploy.md`](../docs/TencentCloud-Test-Deploy.md)。  
本文覆盖：**在职/离职增量发布 + 管理端 H5 首次上线（含 Nginx）**。
