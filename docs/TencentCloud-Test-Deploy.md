# 腾讯云测试环境部署方案

> **文档版本**：v1.15
> **编制日期**：2026-07-28（v1.15 确认小程序开发者工具联调环境就绪）
> **适用范围**：大洋云洁 (dayangyunjie-code) 一期 MVP —— 腾讯云**测试环境**部署（非正式生产）
> **前置进度**：P1–P5 已全部完成（后端核心 API、居民端小程序、员工端小程序、管理后台）；**P6 测试环境部署与开发者工具联调已完成**
> **关联文档**：`docs/tech.md`（技术选型）、`docs/CodingPlan.md`（P6 集成与部署单元）、`docs/MiniApp-Architecture.md`

---

## 一、目标与边界

### 1.1 目标

把当前代码从「本地开发」搬到腾讯云的一台服务器上，供团队/客户在**开发者工具**中联调小程序、并通过浏览器访问管理后台，验证保洁/废品/家政三条业务主流程在"云端数据库 + 云端 API"下能否跑通。

### 1.2 与正式生产的关键区别

| 维度 | 测试环境（本方案） | 正式生产（后续单独规划） |
|------|--------------------|--------------------------|
| 居民端/员工端小程序访问方式 | **微信开发者工具**（模拟器），非真机 | 真机 + 微信正式发布 |
| 域名 / HTTPS | **不强制**，可用 `http://公网IP` | 必须已备案域名 + HTTPS |
| 对象存储 | 本地磁盘 `STORAGE_PROVIDER=local` | 腾讯云 COS 私有桶 + 签名 URL |
| 微信登录 | 继续 mock（`code -> 固定 openid`） | 真实 `code2session` |
| 数据库 | 服务器本机 MySQL 8 | TencentDB MySQL（独立实例 + 备份策略） |
| WebSocket 实时推送 / 订阅消息（P6.1、P6.2） | 可不做 | 需要 |
| 进程守护 | PM2 保活即可 | PM2/systemd + 集中日志 + 告警 |
| 数据 | 可随时清库重建 | 正式数据，需备份 |

因为居民端/员工端小程序**明确通过开发者工具测试**，本方案**不需要**申请域名和 SSL 证书 —— 开发者工具里勾选"不校验合法域名、TLS 版本以及 HTTPS"即可用 `http://公网IP` 直连云端 API。这是本方案相对生产环境能显著简化的核心点。

### 1.3 本方案覆盖的组件

| 组件 | 路径 | 部署方式 |
|------|------|----------|
| NestJS API | `apps/server` | PM2 常驻进程，监听 `3000`，Nginx 反代 |
| PC 管理后台 | `apps/admin` | `vite build` 静态产物 → `/var/www/dayangyunjie-admin/`，Nginx 根路径 `/` |
| 管理端 H5 | `apps/miniapp-admin` | `npm run build:miniapp-admin` → `/var/www/dayangyunjie-miniapp-admin/`，Nginx 子路径 `/admin/` |
| 居民端小程序 | `apps/miniapp-customer` | 微信开发者工具直接编译预览，`VITE_API_BASE` 指向云端 |
| 员工端小程序 | `apps/miniapp-worker` | 同上 |
| MySQL 8 | Prisma | 服务器本机安装（不使用独立 TencentDB） |
| 文件存储 | Upload 模块 | 本地 `apps/server/uploads/` 目录 |

---

## 二、腾讯云资源准备（人工控制台操作）

| # | 资源 | 规格建议 | 说明 |
|---|------|----------|------|
| 1 | 云服务器 CVM | **TencentOS Server 3.3**，2 核 4G，系统盘 50G+ | 已落地实例 `ins-g089n0zo`（南京一区） |
| 2 | 安全组 | 放行 `22`（SSH）、`80`（HTTP） | **不要**对公网开放 `3306`（MySQL）、`3000`（Node 直连端口） |
| 3 | 公网 IP | 服务器自带 | 当前测试机：`118.195.149.50`，后续填入小程序 `.env.production` |
| 4 | 域名 / SSL | **不需要** | 因小程序走开发者工具，管理后台可直接用 `http://公网IP` 访问 |

> 若后续需要真机预览小程序或对外演示管理后台走 HTTPS，可在此基础上追加"测试域名 + 免费 SSL"，属于本方案的可选升级项，见第十一节。

### 2.1 SSH 登录（Xshell / 终端）

| 参数 | 测试环境值 | 在控制台哪里确认 |
|------|------------|------------------|
| 主机 | `118.195.149.50` | 实例列表 → 公网 IP |
| 端口 | `22` | 安全组入站规则 |
| 用户名 | `root` | TencentOS 默认 `root`；实例详情 → 登录 可二次确认 |
| 认证 | 密码 或 SSH 密钥 | **更多 → 密码/密钥**（重置密码后需重启实例） |

Xshell 新建会话：主机填公网 IP，端口 `22`，用户身份验证选 Password 或 Public Key，用户名 `root`。

登录后确认系统（应与本方案一致）：

```bash
whoami                  # root
cat /etc/os-release     # TencentOS Server 3.3 (Final)，PLATFORM_ID=platform:el8
```

> TencentOS 3.x 基于 RHEL 8，包管理器为 `dnf`（兼容 `yum`），与 Ubuntu 的 `apt` 不同；下文命令均已按 TencentOS 编写。

### 2.2 安全组放行 SSH（端口 22）

若 Xshell 报 `Connection failed` 且 Ping 通、22 不通，说明 **安全组未放通 TCP 22**（与密码无关）。

**添加入站规则**（私有网络 → 安全组 → 入站规则 → 添加规则）：

| 字段 | 值 |
|------|-----|
| 类型 | 自定义 |
| 来源 | 本机公网 IP（查 `curl -s https://ifconfig.me`）或 `0.0.0.0/0`（临时） |
| 协议端口 | **`TCP:22`**（不能只填 `22`，否则无法保存） |
| 策略 | 允许 |

> 使用 Clash 代理时，不同网站可能显示不同出口 IP；可添加多条来源 `/32`，或将 SSH 目标 `118.195.149.50` 设为 `DIRECT`。登录日志中 `from 103.208.15.171` 即为腾讯云看到的实际来源 IP。

「实例端口通」仅用于 **检测**，不会自动添加规则；必须在安全组 **入站规则** 中手动添加。

---

## 三、服务器基础环境搭建

通过 SSH 登录服务器后执行（**当前进度：第三节已全部完成**）：

### 3.0 已验证环境（测试机 `ins-g089n0zo`，2026-07-27）

| 组件 | 版本 / 状态 | 验证命令 |
|------|-------------|----------|
| 操作系统 | TencentOS Server 3.3 (Final)，`20260624` | `cat /etc/os-release` |
| Node.js | **v22.23.1** | `node -v` |
| npm | **10.9.8** | `npm -v` |
| MySQL | **8.0.46** Community Server，`mysqld` active (running) | `mysql --version`、`systemctl status mysqld` |
| Nginx | **1.14.1**，`nginx` active (running) | `nginx -v`、`systemctl status nginx` |
| PM2 | **7.0.3** | `pm2 -v` |

> Nginx 1.14.1 为 TencentOS 源自带版本，反代 NestJS API 足够；无需为测试环境单独升级。

```bash
# 更新系统
dnf update -y

# 安装常用工具
dnf install -y curl git gcc-c++ make

# 安装 Node.js 22（NodeSource RPM 源，适配 EL8）
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

# 安装 MySQL 8（官方社区版源）
dnf install -y https://dev.mysql.com/get/mysql80-community-release-el8-9.noarch.rpm
# TencentOS / RHEL 8 需先禁用系统自带的 mysql 模块，否则会报 "filtered out by modular filtering"
dnf module disable mysql -y
dnf install -y mysql-community-server
systemctl enable mysqld
systemctl start mysqld

# 安装 Nginx
dnf install -y nginx
systemctl enable nginx
systemctl start nginx

# 安装 PM2
npm install -g pm2
```

验证版本：

```bash
node -v    # v22.23.1
npm -v     # 10.9.8
mysql --version   # 8.0.46
nginx -v          # nginx/1.14.1
pm2 -v            # 7.0.3
systemctl status mysqld nginx   # 均应 active (running)
```

> MySQL 安装要点（已在测试机验证）：必须先 `dnf module disable mysql -y`，再 `dnf install -y mysql-community-server`；服务名为 `mysqld`（非 `mysql`）。

### 3.1 MySQL 初始化与创建测试库

> **状态**：✅ 已于 2026-07-27 在测试机完成。

| 项目 | 值 |
|------|-----|
| 业务库 | `dayangyunjie_test`（utf8mb4 / utf8mb4_unicode_ci） |
| 业务用户 | `dyyj_test`@`localhost` |
| 业务账号连通性 | ✅ 已验证（`SELECT DATABASE()` → `dayangyunjie_test`） |
| root | 已改密（勿写入 Git） |
| 安全加固 | 已删除匿名用户、test 库 |

> **常见报错**：`Unable to find a match: mysql-community-server` 或 `filtered out by modular filtering`  
> 原因：TencentOS 自带的 `mysql` 模块与 MySQL 官方源冲突。先执行 `dnf module disable mysql -y`，再重新 `dnf install -y mysql-community-server`。

> **密码注意**：
> - `CREATE USER ... IDENTIFIED BY '密码'` 中单引号内**不要有多余空格**。
> - 修正密码时 `ALTER USER` **必须以分号结尾**，再单独执行 `FLUSH PRIVILEGES;`（不可写在同一行无分号连接）。
>
> ```sql
> ALTER USER 'dyyj_test'@'localhost' IDENTIFIED BY '你的业务库密码';
> FLUSH PRIVILEGES;
> ```

MySQL 8 首次安装后，临时 root 密码在日志中：

```bash
grep 'temporary password' /var/log/mysqld.log
```

使用临时密码登录并修改 root 密码（需含大小写+数字+特殊字符）：

```bash
mysql -u root -p
```

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '你的Root强密码';
-- 可选：删除匿名用户、禁止 root 远程登录等，等价于 mysql_secure_installation
DELETE FROM mysql.user WHERE User='';
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
```

创建业务库与用户：

```sql
CREATE DATABASE dayangyunjie_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dyyj_test'@'localhost' IDENTIFIED BY '设置一个测试密码';
GRANT ALL PRIVILEGES ON dayangyunjie_test.* TO 'dyyj_test'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

验证业务库账号（测试机已通过）：

```bash
mysql -u dyyj_test -p dayangyunjie_test -e "SELECT DATABASE();"
```

预期输出：

```
+-------------------+
| DATABASE()        |
+-------------------+
| dayangyunjie_test |
+-------------------+
```

### 3.2 防火墙与 SELinux（TencentOS 特有）

若启用 `firewalld`，需放行 HTTP（安全组放行 80 不够时）：

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --reload
```

Nginx 反向代理 Node 时，SELinux 可能拦截，执行一次：

```bash
setsebool -P httpd_can_network_connect 1
```

---

## 四、拉取代码与安装依赖

**代码仓库**：[zhangjun2046/dayangyunjie](https://github.com/zhangjun2046/dayangyunjie/tree/master)（公开仓库，默认分支 `master`）

在服务器上执行：

```bash
# 1. 进入部署目录
cd /opt

# 2. 克隆代码（HTTPS，公开库无需 Token）
git clone -b master https://github.com/zhangjun2046/dayangyunjie.git dayangyunjie-code

# 3. 进入项目根目录
cd dayangyunjie-code

# 4. Linux 服务器覆盖 Windows 缓存路径（根目录 .npmrc 原为 D:\npm-cache）
echo 'cache=/root/.npm' > .npmrc

# 5. 安装依赖（monorepo，仅根目录执行一次）
npm install
```

**代码同步原则**：配置/代码变更在 **本机修改 → push GitHub → 服务器 `git pull`**，避免在服务器直接改业务文件。`.npmrc` 缓存路径、`.env` 等环境配置可在服务器单独设置。

### 4.0 远程 `git status` 只有 `package.json` / `package-lock.json`

`git pull` 前若看到（且 `Your branch is up to date with 'origin/master'`）：

```text
Changes not staged for commit:
        modified:   package-lock.json
        modified:   package.json
```

这是服务器上 `npm install` 相对 Windows 开发机重写了 lock / 可选依赖，**不要在服务器提交**。

```bash
cd /opt/dayangyunjie-code
git diff --stat
git restore package.json package-lock.json
# 部署需要 Linux 缓存路径时再覆盖（会再次弄脏 .npmrc，属预期，勿提交）：
echo 'cache=/root/.npm' > .npmrc
git pull origin master
npm ci    # 失败再用 npm install；装完若 lock 又脏，再 restore，不要 add
```

**拉取验证**（2026-07-27 测试机已通过）：

```bash
cd /opt/dayangyunjie-code
git branch -v          # 应显示 * master
git log -1 --oneline   # 最近一次提交
ls apps/server apps/admin package.json
```

成功标志：`git clone` 日志出现 `Receiving objects: 100%` 且 `Resolving deltas: 100% ... done`；目录为 `/opt/dayangyunjie-code`（1542 objects，约 1.21 MiB）。

**依赖安装验证**（2026-07-27 测试机已通过）：

```bash
cd /opt/dayangyunjie-code
git log -1 --oneline
# 0c2598c fix: remove Windows-only rollup optional dep...

grep -c "rollup-win32" package.json apps/miniapp-customer/package.json apps/miniapp-worker/package.json
# 三个均输出 0

npm install
# added 1480 packages, audited 1486 packages（约 3 分钟）
```

| 项 | 结果 |
|----|------|
| 当前 commit | `0c2598c`（与 GitHub `origin/master` 一致） |
| 安装包数 | 1480 added，1486 audited |
| `deprecated` 警告 | 来自间接依赖，测试环境可忽略 |
| `59 vulnerabilities` | 测试环境可暂不处理，勿执行 `npm audit fix --force` |

验证：

```bash
ls apps/server apps/admin apps/miniapp-customer package.json
node -v   # 应 >= 22
```

> monorepo 使用 npm workspaces（`apps/*` + `packages/*`），根目录 `npm install` 一次即可完成全部子包依赖安装。

**常见问题**：

| 现象 | 处理 |
|------|------|
| `git: command not found` | `dnf install -y git` |
| `unable to access ... Operation timed out` | **国内服务器直连 GitHub 常超时**，见下方 **4.1 替代拉取方式** |
| `EBADPLATFORM` / `rollup-win32-x64-msvc` | 根目录误锁 Windows 专用 Rollup 包，见 **4.2** |
| 日志路径含 `D:\npm-cache` | 执行 `echo 'cache=/root/.npm' > .npmrc` 后再 install |
| 私有仓库 | 需 Personal Access Token 或 SSH Key，公开库不需要 |

### 4.2 `npm install` 报 EBADPLATFORM（rollup-win32）

**原因**：早期在 Windows 开发机将 `@rollup/rollup-win32-x64-msvc` 写入了根 `package.json` 的 `devDependencies`（仅支持 win32），Linux 无法安装。

**处理**（仓库已修复，服务器拉最新代码后安装）：

```bash
cd /opt/dayangyunjie-code
git pull origin master   # 超时可重试 3~5 次，见 4.1
echo 'cache=/root/.npm' > .npmrc
npm install
```

> 修复已合入 commit `0c2598c`；服务器勿用 `sed` 手改 `package.json`，统一走 `git pull`。

### 4.1 替代拉取方式（GitHub 超时）

大陆腾讯云 CVM 直连 `github.com` 经常 300s 超时，**不是命令错误**。任选一种：

**方案 A（推荐）：本机打包 → SCP 上传**

在本机 Windows（已能访问 GitHub / 有本地仓库）PowerShell：

```powershell
cd D:\coding\dayangyunjie-code
git bundle create $env:TEMP\dayangyunjie.bundle master
scp $env:TEMP\dayangyunjie.bundle root@118.195.149.50:/opt/
```

服务器：

```bash
cd /opt
git clone dayangyunjie.bundle dayangyunjie-code
cd dayangyunjie-code
npm install
```

**方案 B：国内 GitHub 镜像站 clone**

```bash
cd /opt
git clone -b master https://gitclone.com/github.com/zhangjun2046/dayangyunjie.git dayangyunjie-code
```

若仍失败，换镜像或改用方案 A。

**方案 C：下载 ZIP（无需 git 历史）**

```bash
cd /opt
curl -L -o master.zip "https://gitclone.com/github.com/zhangjun2046/dayangyunjie/archive/refs/heads/master.zip"
unzip master.zip
mv dayangyunjie-master dayangyunjie-code
cd dayangyunjie-code
npm install
```

> `unzip` 未安装时：`dnf install -y unzip`

后续更新代码（GitHub 超时时用循环重试）：

```bash
cd /opt/dayangyunjie-code
for i in 1 2 3 4 5; do
  echo "=== 第 $i 次尝试 git pull ==="
  git pull origin master && break
  echo "失败，5 秒后重试..."
  sleep 5
done
npm ci      # 严格按 lock；失败再用 npm install，装完不要提交 package.json / lock
```

---

## 五、环境变量配置

### 5.1 后端 `apps/server/.env`

> **状态**：✅ 已于 2026-07-27 在测试机 `/opt/dayangyunjie-code/apps/server/.env` 配置完成。

在服务器上新建（**不要提交 Git**）：

```bash
cd /opt/dayangyunjie-code/apps/server
# 推荐用 cat 或 nano（Xshell 下比 vi 更直观）
cat > .env << 'EOF'
DATABASE_URL=mysql://dyyj_test:你的业务库密码@127.0.0.1:3306/dayangyunjie_test

JWT_ACCESS_SECRET=替换为随机字符串
JWT_REFRESH_SECRET=替换为另一随机字符串
JWT_ACCESS_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

WECHAT_MOCK_OPENID_PREFIX=mock_openid_

STORAGE_PROVIDER=local

# 浏览器从公网 IP 访问时，NestJS CORS 须放行（否则登录报 Internal server error）
CORS_ORIGIN=http://118.195.149.50

# 本地存储落盘图片对外可访问的地址；不配置会回退为 http://localhost:3000，
# 导致上传的服务前/后照片仅服务器本机能看到，其它客户端一律加载失败
SERVER_BASE_URL=http://118.195.149.50
EOF
```

| 变量 | 测试机配置 | 说明 |
|------|------------|------|
| `DATABASE_URL` | `dyyj_test` → `dayangyunjie_test` | 与 3.1 节建库一致 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 已设独立随机串 | 测试环境专用，勿与生产共用 |
| `JWT_*_EXPIRES_IN` | `2h` / `7d` | 与代码默认值一致 |
| `WECHAT_MOCK_OPENID_PREFIX` | `mock_openid_` | 继续 mock 微信登录 |
| `STORAGE_PROVIDER` | `local` | 上传文件落盘 `apps/server/uploads/` |
| `CORS_ORIGIN` | `http://118.195.149.50` | ✅ 已配置，修复登录 500 |
| `SERVER_BASE_URL` | `http://118.195.149.50` | ⚠️ 必配，否则上传图片 URL 回退为 `localhost`，居民端/员工端小程序及跨机访问一律无法加载图片（见第八.5节排查记录） |

验证：

```bash
cat .env   # 确认内容完整，勿将输出贴到公开渠道
```

配置检查清单：

- [x] `DATABASE_URL` 用户名、库名与 MySQL 3.1 节一致
- [x] JWT 两个 secret 均已替换占位符
- [x] `STORAGE_PROVIDER=local`（测试环境不接 COS）
- [x] `CORS_ORIGIN=http://118.195.149.50`（修复登录 500，见第八节）
- [ ] `SERVER_BASE_URL=http://118.195.149.50`（未配置会导致上传图片 URL 落为 `localhost`，居民端/员工端看不到服务前后照片）

### 5.2 管理后台 `apps/admin/.env.production`

同域反代，走相对路径最省事（无需处理 CORS）：

```env
VITE_API_BASE_URL=/api/v1
```

### 5.3 居民端小程序 `apps/miniapp-customer/.env.production`

> **状态**：✅ 已于 2026-07-28 在本机 Windows 配置完成。

```env
VITE_API_BASE=http://118.195.149.50/api/v1
```

### 5.4 员工端小程序 `apps/miniapp-worker/.env.production`

> **状态**：✅ 已于 2026-07-28 在本机 Windows 配置完成。

```env
VITE_API_BASE=http://118.195.149.50/api/v1
```

> 两个小程序各自读取**本目录下**的 `.env.production`（居民端不会读员工端配置）。`npm run build:mp-weixin` 为 production 构建，会将 `VITE_API_BASE` 编译进 `dist/build/mp-weixin` 产物。

---

## 六、数据库迁移、构建与启动

### 6.1 Prisma 迁移

```bash
cd /opt/dayangyunjie-code/apps/server
npx prisma generate
```

**测试环境验证**（2026-07-27 测试机已全部通过）：

| 步骤 | 结果 |
|------|------|
| `prisma generate` | ✅ Prisma Client v6.19.3 |
| `prisma db push` | ✅ `Your database is now in sync with your Prisma schema`（1.28s） |
| `prisma db seed` | ✅ Admin + ServiceCatalog 10 行 + Operator |

seed 默认数据（`prisma/seed.ts`）：

| 类型 | 内容 |
|------|------|
| 管理员 | `admin@dayunyunjie.com`，密码 `admin123`，`isSuperAdmin=true` |
| 服务目录 | 10 条 ServiceCatalog |
| 运营人员 | 1 条 Operator（接单用） |

#### 建表方式（二选一）

> **重要**：当前仓库 `.gitignore` 忽略了 `apps/server/prisma/migrations/`，`git clone` 后**没有迁移文件**，`migrate deploy` 会显示 `No migration found` 且**不会建表**，导致 `db seed` 报 `The table admins does not exist`。

**测试环境（当前采用）— 用 `db push` 按 schema 建表：**

```bash
npx prisma db push
npx prisma db seed   # 写入管理员、服务目录等种子数据
```

**正式环境（推荐）— 将 migrations 纳入 Git 后使用：**

```bash
# 本机生成并提交 migrations 后，服务器再执行：
npx prisma migrate deploy
npx prisma db seed
```

`db push` 与 `migrate deploy` 区别：

| 命令 | 适用场景 | 说明 |
|------|----------|------|
| `db push` | 测试环境、无 migrations 目录 | 直接按 `schema.prisma` 同步表结构 |
| `migrate deploy` | 生产/已有 migrations 入库 | 只应用已有迁移文件，不生成新迁移 |

> 测试环境不要用 `migrate dev`（会尝试生成新迁移，存在数据丢失风险）。

```bash
cd /opt/dayangyunjie-code
```

### 6.2 整体构建

```bash
cd /opt/dayangyunjie-code
npm run build
```

该命令按顺序构建 `@dayangyunjie/shared` → 双端小程序（H5 产物，本方案实际不使用其 H5 构建）→ `admin` → `server`。

**测试机验证**（2026-07-27）：✅ 全部构建成功。

| 包 | 结果 | 说明 |
|----|------|------|
| `@dayangyunjie/shared` | ✅ | 编译通过 |
| `@dayangyunjie/miniapp-customer` | ✅ | `DONE Build complete` |
| `@dayangyunjie/miniapp-worker` | ✅ | `DONE Build complete` |
| `@dayangyunjie/admin` | ✅ | `✓ built in 13.61s`，产物在 `apps/admin/dist/` |
| `@dayangyunjie/server` | ✅ | `nest build` 完成，产物在 `apps/server/dist/` |

构建后验证：

```bash
ls apps/server/dist/main.js
ls apps/admin/dist/index.html
```

> 构建过程中的 `Deprecation Warning [legacy-js-api]`、`#__PURE__` 注释提示、chunk > 500kB 警告均为**非致命警告**，可忽略。

### 6.3 用 PM2 启动后端

```bash
cd /opt/dayangyunjie-code/apps/server
pm2 start dist/main.js --name dayangyunjie-api
pm2 save
pm2 startup   # 按提示执行输出的命令，使 PM2 开机自启
```

**测试机验证**（2026-07-27）：✅ 全部成功。

| 项 | 结果 |
|----|------|
| PM2 进程 | `dayangyunjie-api` status **online**（pid 50090） |
| `pm2 save` | 已保存至 `/root/.pm2/dump.pm2` |
| `pm2 startup` | `pm2-root.service` 已 enable（开机自启） |
| API 验证 | `curl http://127.0.0.1:3000/api/docs` 返回 Swagger HTML |

验证：

```bash
pm2 status
curl http://127.0.0.1:3000/api/docs
```

能返回 Swagger 页面 HTML 即说明后端启动成功。

### 6.4 部署管理后台静态资源

```bash
sudo mkdir -p /var/www/dayangyunjie-admin
sudo cp -r /opt/dayangyunjie-code/apps/admin/dist/* /var/www/dayangyunjie-admin/
```

**测试机验证**（2026-07-27）：✅ 静态文件已复制至 `/var/www/dayangyunjie-admin/`。

验证：

```bash
ls /var/www/dayangyunjie-admin/index.html
```

> 此时 PC 管理后台仅能通过 Nginx 对外访问，需完成 **第七节** 配置后方可浏览器访问 `http://118.195.149.50/`。

### 6.5 部署管理端 H5 静态资源

管理端 H5（`apps/miniapp-admin`）供运营在手机浏览器查看订单、派单；与 PC 管理后台（`apps/admin`）是不同应用。

```bash
cd /opt/dayangyunjie-code
npm run build:miniapp-admin
sudo mkdir -p /var/www/dayangyunjie-miniapp-admin
sudo cp -r apps/miniapp-admin/dist/build/h5/* /var/www/dayangyunjie-miniapp-admin/
```

| 项 | 值 |
|----|-----|
| 构建命令 | `npm run build:miniapp-admin`（根目录） |
| 产物目录 | `apps/miniapp-admin/dist/build/h5/` |
| Nginx 静态目录 | `/var/www/dayangyunjie-miniapp-admin/` |
| 访问地址 | `http://118.195.149.50/admin/`（hash 路由，`base` 为 `/admin/`） |

验证：

```bash
ls /var/www/dayangyunjie-miniapp-admin/index.html
curl -I http://118.195.149.50/admin/
```

> 若在服务器 build 报 `Cannot find module @rollup/rollup-linux-x64-gnu`，见 [`Remote-Server-Update.md`](./Remote-Server-Update.md) 第二节「一次性补 Linux 原生包」。**rollup 装一次即可**，后续 build 不必重复。也可在本机 Windows/Mac build 后 `scp` 到服务器。
>
> 日常发版步骤见 [`Remote-Server-Update.md`](./Remote-Server-Update.md)。

---

## 七、Nginx 配置

TencentOS 使用 `/etc/nginx/conf.d/` 目录（非 Ubuntu 的 `sites-available` 方式）。

创建 `/etc/nginx/conf.d/dayangyunjie.conf`（**整段一次性粘贴**，从 `cat` 到 `EOF`；若只粘第一行会卡在 `>` 提示符，按 `Ctrl+C` 取消后重来）：

```bash
cat > /etc/nginx/conf.d/dayangyunjie.conf << 'EOF'
server {
    listen 80;
    server_name 118.195.149.50;

    root /var/www/dayangyunjie-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 管理端 H5（apps/miniapp-admin，hash 路由）
    location /admin/ {
        alias /var/www/dayangyunjie-miniapp-admin/;
        index index.html;
    }

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
EOF
```

启用配置并重载：

```bash
# 备份并禁用默认站点（注意末尾是 || true，不是 || tr）
mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true

# SELinux 放行 Nginx 反代 Node（TencentOS 需要）
setsebool -P httpd_can_network_connect 1

nginx -t
systemctl reload nginx
```

**测试机验证**（2026-07-27）：✅ Nginx 配置语法正确并已重载。

| 项 | 结果 |
|----|------|
| `nginx -t` | `syntax is ok` / `test is successful` |
| `dayangyunjie.conf` | 已写入 `/etc/nginx/conf.d/` |
| SELinux | `httpd_can_network_connect` 已开启 |

验证（**请用公网 IP**，不要用 `127.0.0.1`——`server_name` 为公网 IP 时，`curl http://127.0.0.1/` 可能命中默认欢迎页）：

```bash
curl -I http://118.195.149.50/
curl -I http://118.195.149.50/admin/
curl -I http://118.195.149.50/api/docs
ls -la /var/www/dayangyunjie-admin/index.html
ls -la /var/www/dayangyunjie-miniapp-admin/index.html
```

浏览器访问：

- PC 管理后台：`http://118.195.149.50/`（登录：`admin@dayunyunjie.com` / `admin123`）
- 管理端 H5：`http://118.195.149.50/admin/`（同上 Admin 账号）
- Swagger：`http://118.195.149.50/api/docs`

---

## 八、CORS 说明

管理后台与 API 虽经 Nginx 同站反代，但浏览器请求仍会带 `Origin: http://118.195.149.50` 头；NestJS 默认 CORS 仅放行 `localhost`/`127.0.0.1`，未放行公网 IP 时会抛 `CORS blocked` 异常，前端显示 **Internal server error**。

**测试环境必须在 `apps/server/.env` 追加：**

```env
CORS_ORIGIN=http://118.195.149.50
```

并在 `apps/server/src/main.ts` 中通过 `CORS_ORIGIN` 读取（已合入代码库）。修改后需重新 `npm run build --workspace=@dayangyunjie/server` 并 `pm2 restart dayangyunjie-api`。

**测试机验证**（2026-07-28）：✅ 已修复并验证登录接口。

```bash
curl -X POST http://118.195.149.50/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -H "Origin: http://118.195.149.50" \
  -d '{"email":"admin@dayunyunjie.com","password":"admin123"}'
# 应返回 "code":0 及 accessToken
```

浏览器访问 `http://118.195.149.50/` 使用相同账号登录。

**管理后台默认登录账号**（`prisma db seed` 写入）：

| 字段 | 值 |
|------|-----|
| 邮箱 | `admin@dayunyunjie.com`（注意是 **yunjie**，不是 yunyunjie） |
| 密码 | `admin123` |

---

## 八.5、上传照片无法显示（`SERVER_BASE_URL` 说明）

**现象**：员工端小程序上传"服务前/服务后"照片并确认完成后，订单状态正常流转，但照片在管理后台/居民端小程序均无法加载（图片位显示裂图）。本机 dev 环境（浏览器与 server 同机）看起来正常，部署到测试机后才暴露问题。

**根因**：`apps/server/src/common/storage/local-storage.strategy.ts` 落盘图片时用 `SERVER_BASE_URL` 拼接返回给前端的 URL，未配置时回退为 `http://localhost:3000`：

```ts
this.baseUrl = process.env.SERVER_BASE_URL ?? 'http://localhost:3000';
// ...
const url = `${this.baseUrl}/uploads/${filename}`;
```

这个 URL 会原样存入数据库（`work_photos.url`）。本机开发时浏览器和 server 同机，`localhost:3000` 能访问通，看不出问题；部署到测试机后，若未设置 `SERVER_BASE_URL`，同样回退成 `localhost`，写入数据库的 URL 在任何其它客户端（居民端/员工端真机、其它机器上的管理后台浏览器）里都无法访问。

**修复步骤**：

1. 在 `apps/server/.env` 追加（与 5.1 节一致）：

```env
SERVER_BASE_URL=http://118.195.149.50
```

2. 重新构建并重启后端：`npm run build --workspace=@dayangyunjie/server && pm2 restart dayangyunjie-api`。
3. **历史脏数据**：修复前已上传的照片，其 `work_photos.url` 仍是 `http://localhost:3000/...`，需要一次性批量替换前缀（不会丢文件，`apps/server/uploads/` 目录下文件本身是完整的）：

```sql
UPDATE work_photos
SET url = REPLACE(url, 'http://localhost:3000', 'http://118.195.149.50')
WHERE url LIKE 'http://localhost:3000%';
```

4. 若后续切换为 HTTPS 域名，`SERVER_BASE_URL` 需与小程序 `VITE_API_BASE` 协议保持一致（同为 HTTPS），否则小程序在 HTTPS 页面下会因混合内容拦截 HTTP 图片。

**关于自签名证书的说明（2026-07-28 评估结论：测试阶段不需要）**：曾在 `/etc/nginx/ssl/` 下手动生成过自签名证书并给 Nginx 加过 `listen 443 ssl`，直接连接服务器抓取证书验证后确认 `Subject`/`Issuer` 均为 `CN=118.195.149.50`——即自签名证书，绑定的还是裸 IP。公网可信 CA（含 Let's Encrypt）均不为裸 IP 签发证书，必须先有备案域名。自签名证书只能靠客户端"跳过校验"（`curl -k`、开发者工具"不校验 HTTPS 证书"）才能访问，真机与正式发布一律会拒绝，对"给同事在开发者工具里测试"这个目标没有实际收益，反而增加协议不一致的风险。**结论：测试阶段统一使用 `http://118.195.149.50`，不使用该自签名证书**；Nginx 的 `listen 443` 配置块可保留但不使用，待后续申请到真实域名 + 可信证书（见第十一节）后再启用并把本节、第五节、9.1 节的地址一并切换为 HTTPS 域名。

---

## 九、居民端/员工端小程序对接云端测试环境

> **状态**：✅ 已于 2026-07-28 在本机 Windows 完成构建，微信开发者工具可正常打开双端 `dist/build/mp-weixin` 目录。

### 9.1 本机修改 `.env.production`（本机改 → 保存即可，无需 push 到服务器）

**居民端** `apps/miniapp-customer/.env.production`：

```env
VITE_API_BASE=http://118.195.149.50/api/v1
```

**员工端** `apps/miniapp-worker/.env.production`：

```env
VITE_API_BASE=http://118.195.149.50/api/v1
```

### 9.2 微信开发者工具设置

本项目为 **uni-app CLI**，微信开发者工具**不能**直接打开 `apps/miniapp-customer` 源码目录，须打开编译后的 `mp-weixin` 目录。

#### 联调云端测试环境（推荐）

在本机项目根目录执行（先确认 9.1 节 `.env.production` 已改为公网 IP）：

```powershell
cd D:\coding\dayangyunjie-code

# 居民端：编译微信小程序（读取 apps/miniapp-customer/.env.production）
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-customer
# 或进入子目录：cd apps\miniapp-customer && npm run build:mp-weixin

# 员工端：编译微信小程序（读取 apps/miniapp-worker/.env.production）
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-worker
# 或进入子目录：cd apps\miniapp-worker && npm run build:mp-weixin
```

**本机验证**（2026-07-28）：✅ 双端 `npm run build:mp-weixin` 均输出 `DONE Build complete`；微信开发者工具可分别导入以下目录并正常打开。

| 端 | 构建命令 | 开发者工具导入路径 | 编译后 API 地址（`api/request.js`） |
|----|----------|-------------------|-------------------------------------|
| 居民端 | `apps/miniapp-customer` 下 `npm run build:mp-weixin` | `D:\coding\dayangyunjie-code\apps\miniapp-customer\dist\build\mp-weixin` | `http://118.195.149.50/api/v1` |
| 员工端 | `apps/miniapp-worker` 下 `npm run build:mp-weixin` | `D:\coding\dayangyunjie-code\apps\miniapp-worker\dist\build\mp-weixin` | `http://118.195.149.50/api/v1` |

> `dist\dev\mp-weixin` 是**开发模式**产物（`npm run dev:mp-weixin`），读的是 `.env.development`（默认 `127.0.0.1`），**不会连云端**。联调腾讯云请用 `dist\build\mp-weixin`。

#### 本地开发模式（连本机后端时用）

```powershell
npm run dev:mp-weixin --workspace=@dayangyunjie/miniapp-customer
```

然后打开 `dist\dev\mp-weixin`，API 指向 `.env.development` 中的 `127.0.0.1:3000`。

#### 开发者工具通用设置

1. 右上角 **详情** → **本地设置**，勾选：
   - **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**
2. 修改 `.env` 或源码后需**重新执行对应的 build/dev 命令**，再在工具中 **编译/刷新**。

### 9.3 建议验证流程

| 顺序 | 端 | 操作 |
|------|-----|------|
| 1 | 管理后台 | 浏览器登录，查看订单/配置 |
| 2 | 居民端 | mock 微信登录 → 创建保洁/废品/家政订单 |
| 3 | 管理后台 | 派单 |
| 4 | 员工端 | 手机号+密码登录 → 接单 → GPS 签到 → 上传照片 → 完成 |
| 5 | 居民端 | 评价 / 废品验收 |
| 6 | 服务器 | `ls /opt/dayangyunjie-code/apps/server/uploads/` 确认图片落盘 |

由于明确使用**微信开发者工具**测试，无需域名与 HTTPS。联调前确认：

1. `apps/miniapp-customer/.env.production` 与 `apps/miniapp-worker/.env.production` 中的 `VITE_API_BASE` 已指向 `http://118.195.149.50/api/v1`（见第五节）。
2. 执行 `npm run build:mp-weixin` 后，用微信开发者工具分别导入 `dist\build\mp-weixin` 目录（**不要**直接打开 `apps/miniapp-customer` 或 `apps/miniapp-worker` 源码根目录）。
3. 在开发者工具右上角「详情」→「本地设置」中勾选 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**。
4. 按上表验证流程跑通登录、下单、派单、GPS 签到、拍照上传、评价等业务链路。
5. 图片上传后可在服务器 `apps/server/uploads/` 目录下看到落盘文件，说明本地存储策略工作正常。

> 该方式仅适用于开发者工具内测试；若后续要在**真机**上体验/预览，微信通常要求 request 合法域名为 HTTPS，此时需要按第十一节补充域名与证书。

---

## 十、部署后验收清单

| # | 验收项 | 预期结果 | 测试环境状态 |
|---|--------|----------|--------------|
| 1 | 浏览器访问 `http://公网IP/` | 能看到并登录管理后台 | ✅ 已验证 |
| 2 | 访问 `http://公网IP/api/docs` | 能看到 Swagger 文档页 | ✅ 已验证 |
| 3 | 管理后台各模块（订单/服务人员/投诉/配置管理/数据看板） | 数据可正常查询、新增、修改 | ✅ 已验证 |
| 4 | 开发者工具中居民端登录 + 三类预约（保洁/废品/家政） | 能成功创建订单，管理后台能看到 | 联调时按需验证 |
| 5 | 管理后台派单 → 员工端开发者工具接单 | 状态正确流转为 `ASSIGNED` | 联调时按需验证 |
| 6 | 员工端 GPS 签到 → 上传服务照片 → 完成服务 | 照片落盘到服务器 `uploads/`，状态流转正确 | 联调时按需验证 |
| 7 | 居民端评价 / 废品验收 | 状态最终流转为 `REVIEWED` | 联调时按需验证 |
| 8 | 投诉提交与后台处理 | 完整闭环 | 联调时按需验证 |
| 9 | `pm2 restart dayangyunjie-api` 或 kill 进程后 | PM2 自动拉起服务 | ✅ 已验证 |
| 10 | 服务器重启后 | Nginx、MySQL、PM2 均自动恢复（`pm2 startup` + 系统服务默认自启） | ✅ 已验证 |
| 11 | 微信开发者工具导入双端 `dist/build/mp-weixin` | 居民端、员工端均可正常打开并请求云端 API | ✅ 已验证（2026-07-28） |

---

## 十一、可选升级项（暂不在本方案范围内）

以下内容在测试环境阶段**不需要**处理，留待正式生产部署单独规划：

| 项 | 说明 |
|----|------|
| 腾讯云 COS 对接 | `apps/server/src/common/storage/cos-storage.strategy.ts` 目前仍是占位 stub，`STORAGE_PROVIDER=cos` 时会抛 `NotImplementedException`，正式上线前需安装 `cos-nodejs-sdk-v5` 并补全实现 |
| 真实微信登录 | 当前 `/auth/wechat-login` 仍是 `code -> 固定 openid` 的 mock 逻辑，真机/正式发布前需接入微信官方 `code2session` |
| 测试域名 + 免费 SSL | 仅在需要真机预览小程序，或管理后台需通过 HTTPS 域名对外演示时才需要；申请后只需修改 Nginx `server_name` 与 `.env.production` 中的 `VITE_API_BASE`/`VITE_API_BASE_URL` 即可切换，不影响现有代码结构 |
| WebSocket 实时推送（P6.1） | 订单状态变更后管理后台/小程序实时刷新，测试环境可先手动刷新页面替代 |
| 微信订阅消息（P6.2） | 派单/完成等节点的模板消息推送，依赖已发布的小程序与微信公众平台配置，测试环境可不做 |
| 独立 TencentDB / 腾讯云 Redis | 测试环境用服务器本机 MySQL 即可；数据量增大或需要多机部署时再评估 |
| 自动化备份、集中日志、告警 | 正式生产环境的运维基线（详见 `docs/tech.md` §"部署运维基线"），测试环境可省略 |

---

## 十二、常用运维命令速查

> **日常发版**：见 [`Remote-Server-Update.md`](./Remote-Server-Update.md)（标准流程、`--ignore-scripts` 兜底、原生包补装、H5 发布与验收）。

```bash
# 查看后端进程状态
pm2 status
pm2 logs dayangyunjie-api

# 重启后端（更新代码后）
cd /opt/dayangyunjie-code
echo 'cache=/root/.npm' > .npmrc
git restore package.json package-lock.json   # 若 status 显示这两文件被 npm 改过
git pull origin master
npm ci || npm install
cd apps/server && npx prisma generate && npx prisma migrate deploy && cd ../..
npm run build --workspace=@dayangyunjie/shared
npm run build --workspace=@dayangyunjie/server
npm run build --workspace=@dayangyunjie/admin
pm2 restart dayangyunjie-api

# 重新发布 PC 管理后台
sudo cp -r apps/admin/dist/* /var/www/dayangyunjie-admin/

# 重新发布管理端 H5
npm run build:miniapp-admin
sudo cp -r apps/miniapp-admin/dist/build/h5/* /var/www/dayangyunjie-miniapp-admin/

# 查看 Nginx 状态与日志
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 查看 MySQL 状态（TencentOS 服务名为 mysqld）
systemctl status mysqld
```

---

## 十三、部署进度追踪

| 步骤 | 内容 | 状态 |
|------|------|------|
| 1 | 腾讯云 CVM 开通、安全组放行 22/80 | ✅ 已完成 |
| 2 | SSH 登录（Xshell，`root@118.195.149.50`） | ✅ 已完成 |
| 3a | 第三节：系统更新、`dnf module disable mysql`、安装 MySQL 8.0.46 | ✅ 已完成 |
| 3b | 第三节：Node v22.23.1 / Nginx 1.14.1 / PM2 7.0.3 | ✅ 已完成 |
| 3c | 3.1 节：MySQL root 改密 + `dayangyunjie_test` / `dyyj_test` | ✅ 已完成 |
| 3d | 3.2 节：防火墙 / SELinux（若 HTTP 访问异常时执行） | 待做 / 按需 |
| 4a | 第四节：`git clone` + `git pull` → `/opt/dayangyunjie-code`（`0c2598c`） | ✅ 已完成 |
| 4b | 第四节：`npm install`（1486 packages audited） | ✅ 已完成 |
| 5 | 第五节：`apps/server/.env` 已配置 | ✅ 已完成 |
| 6a | 6.1 节：`prisma generate` | ✅ 已完成 |
| 6b | 6.1 节：`prisma db push` + `db seed` | ✅ 已完成 |
| 6c | 6.2 节：`npm run build` | ✅ 已完成 |
| 6d | 6.3 节：PM2 启动后端（online + 开机自启） | ✅ 已完成 |
| 6e | 6.4 节：PC 管理后台静态资源 → `/var/www/dayangyunjie-admin` | ✅ 已完成 |
| 6f | 6.5 节：管理端 H5 → `/var/www/dayangyunjie-miniapp-admin`，访问 `/admin/` | ✅ 已完成 |
| 7 | 第七节：Nginx 反代 + PC 管理后台登录 + `/admin/` H5 | ✅ 已完成 |
| 7b | 第八节：CORS 修复 + `admin-login` 验证 | ✅ 已完成 |
| 8 | 第九节：小程序开发者工具联调（本机 `.env.production` + `build:mp-weixin`） | ✅ 已完成（2026-07-28） |
| 9 | 第十节：部署验收（环境就绪 + 开发者工具可打开双端） | ✅ 已完成 |

---

_本文档 v1.15，腾讯云测试环境部署与微信开发者工具联调已全部完成。业务主流程（下单→派单→服务→评价）可按第九节 9.3 建议流程在联调时逐项验证。_
