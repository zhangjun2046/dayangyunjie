# 阿里云 ECS（Alibaba Cloud Linux 4）整体部署

> **文档类型**：新机器**首次整机部署**。代码用本机 `tar` + `scp` 上传，**服务器不使用 git**。  
> **编制**：2026-09-15；修订：2026-09-21（日常发版路径；第十四节查库；第十五节交付前清测试订单）。  
> 微信服务号 / 短信后台与联调见 [`WeChat-SMS-Notify-After-Aliyun-Deploy.md`](./WeChat-SMS-Notify-After-Aliyun-Deploy.md)。本文只把站和 `.env` 跑起来。

---

## 一、目标

| 组件 | 仓库路径 | 部署到哪里 |
|------|----------|------------|
| NestJS API | `apps/server` | 本机 `127.0.0.1:3000`，Nginx 反代 `/api/`、`/uploads/` |
| PC 管理后台 | `apps/admin` | Nginx 静态目录 |
| 运营管理端 H5 | `apps/miniapp-admin` | Nginx 静态目录（正式构建 `base` 为 `/`） |
| MySQL 8 | Prisma | **本机** MySQL（不开放公网 3306） |
| 上传图片 | `STORAGE_PROVIDER=local` | `apps/server/uploads/`，经 Nginx `/uploads/` 访问 |
| 居民端 / 员工端小程序 | `apps/miniapp-customer` / `miniapp-worker` | **不上 ECS**；本机 `build:mp-weixin` 后上传微信后台 |

| 用途 | 主机名 |
|------|--------|
| PC | `https://admin.yunjiezhixiang.cn/` |
| 运营 H5 | `https://h5.yunjiezhixiang.cn/` |
| API | `https://api.yunjiezhixiang.cn`，路径前缀 `/api/v1` |

PC / 运营 H5 **不要**写 `.env.production`（走当前域名下相对 `/api/v1`）。真机小程序打 `https://api.yunjiezhixiang.cn`。

含通知的版本发到**已有库**：必须 `npx prisma db push`（不要 `migrate deploy`、不要再 `db seed`），并**重传居民端/员工端**小程序，否则静默绑定和粉丝表都不存在。

---

## 二、打包策略

ECS 上只跑 **三端**：API、PC 后台、运营 H5。日常**哪一端有改动才打哪一端**，先把产物放到本机 **`~/Desktop`**，再 `scp` 到服务器 `~/upload/`。不要每次把五端都打一遍。

| 产物 | 何时打包 | 本机先放到 | 再 scp 到服务器 |
|------|----------|------------|-----------------|
| API（`shared` + `server` 源码 tar） | 改了 `packages/shared` 或 `apps/server` | `~/Desktop/dayangyunjie-api-src.tgz` | `~/upload/`，ECS 上编译 |
| `apps/admin` dist tar | 改了 PC 管理后台 | `~/Desktop/dayangyunjie-admin-dist.tgz` | `~/upload/`，解压到静态目录 |
| `apps/miniapp-admin` H5 tar | 改了运营 H5 | `~/Desktop/dayangyunjie-miniapp-admin-h5.tgz` | `~/upload/`，解压到静态目录 |
| `miniapp-customer` / `miniapp-worker` | **永远不打进 ECS 包** | 本机 `build:mp-weixin` 后微信后台上传 | **不上 ECS** |

**注意：**

- 不要在 ECS 上跑根目录 `npm run build`（会编 uni-app / Vite）。运营 H5、PC 是纯静态，本机构建后拷过去即可。
- `sharp`、Prisma engine **按操作系统编译**。把 Mac 的 `node_modules` 拷到 ECS，API 启动即崩。ECS 上只编 `shared` + `server`，不要编 uni-app。
- 不要只上传 `apps/server/dist` 却不在 Linux 上 `prisma generate`。
- 不要在 ECS 上构建微信小程序包（本机微信开发者工具完成）。
- 根 `workspaces` 是 `apps/*`。日常 API tar **不再包含** `apps/miniapp-customer`、`apps/miniapp-worker`。服务器上须**保留**首次部署留下的这两目录（解压不会删已有文件），否则 `npm ci` 会报缺 workspace。不要从 ECS 删它们。
---

## 三、阿里云控制台准备

### 3.1 本台实例（已拍板，按此部署）

控制台「实例详情」当前值：

| 项 | 值 |
|----|-----|
| 地域 | 华北 6（乌兰察布） |
| 可用区 | 可用区 C |
| 实例规格 | **4 核 8G**，`ecs.e`，系列 **V** |
| I/O 优化 | I/O 优化实例 |
| CPU / 内存 | 4 核 / 8 GB |
| 系统盘 | ESSD Entry，`/dev/xvda`，**50 GiB** |
| 带宽 | **3072 Kbps**（3 Mbps）按固定带宽 |
| 操作系统 | `aliyun_4_x64_20G_alibase_20260801.vhd`，Alibaba Cloud Linux 4，Linux 64 位 |
| 网络类型 | 专有网络 VPC |
| 虚拟交换机 | `vsw-0jlsy9eu1khamm8sczmq9` |
| 公网 | 绑定**弹性公网 IP** |
| 登录 | 密钥对（推荐）或自定义 root 密码 |

**注意：** 固定带宽 3 Mbps 偏紧，多端同时传图、小程序拉资源可能变慢；不够再升带宽，不要用这个当故障误判成 Nginx/代码坏了。系统盘 50 GiB 够本方案（代码 + MySQL + 本地 `uploads`）；镜像名里的 `20G` 是镜像体积，不是当前磁盘。换机时交换机 ID 会变，以控制台为准。

> 不要再用 CentOS 7 / Node 18 / MySQL 的 `el7` 源。Alibaba Cloud Linux 4 用 **`dnf`**，自带仓库可装 Node 20/22 与 MySQL 8。

### 3.2 安全组（入方向）

| 端口 | 授权对象 | 用途 |
|------|----------|------|
| 22 | 仅办公网 / 跳板 IP，不要 `0.0.0.0/0` 长期裸奔 | SSH |
| 80 | `0.0.0.0/0` | HTTP（证书申请、跳转 HTTPS） |
| 443 | `0.0.0.0/0` | HTTPS |

**不要**对公网开放 `3306`、`3000`。Node 只听本机，由 Nginx 反代。

### 3.3 域名

根域 `yunjiezhixiang.cn` 须已完成 ICP 备案，且 **DNS 托管在阿里云「云解析 DNS」**（NS 为 `dns*.hichina.com` 或阿里云分配的 DNS）。解析与免费证书自动 DNS 验证都依赖这一点。A 记录见 **第九节 9.1**。

微信公众平台「网页授权域名」填 `api.yunjiezhixiang.cn`（不要 `www`，不要 `admin.` / `h5.`）。

### 3.4 SSH

```bash
ssh root@<ECS公网IP>
cat /etc/os-release    # 应看到 Alibaba Cloud Linux / alinux，VERSION_ID=4
```

---

## 四、系统初始化（Alibaba Cloud Linux 4）

包管理器是 **`dnf`**（`yum` 是兼容命令，下文统一用 `dnf`）。不要装 CentOS 7 / `el7` 的 RPM。

### 4.1 基础包、时区、防火墙

```bash
dnf update -y
dnf install -y wget curl tar unzip gcc-c++ make openssl openssl-devel \
  firewalld policycoreutils-python-utils

timedatectl set-timezone Asia/Shanghai

systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

SELinux 保持 Enforcing 时，Nginx 反代本机 Node 需要：

```bash
setsebool -P httpd_can_network_connect 1
```

本方案 `/uploads/` 反代到 Node，一般不必再设 `httpd_read_user_content`。

### 4.2 Node.js（用系统仓库，预期 20/22）

不要再用 NodeSource 的 `setup_18.x`，也不要在本镜像上硬装 CentOS 7 用的 Node 18。

```bash
dnf install -y nodejs
# 若 `npm -v` 报没有命令：
dnf install -y nodejs-npm
node -v    # 预期 v20 或 v22
npm -v
```

```bash
npm install -g pm2
```

### 4.3 Nginx

```bash
dnf install -y nginx
systemctl enable --now nginx
```

配置目录：`/etc/nginx/conf.d/`（不是 Ubuntu 的 `sites-available`）。

### 4.4 MySQL 8

优先用 Alibaba Cloud Linux 4 仓库，不要装 `mysql80-community-release-el7`。

```bash
dnf install -y mysql-server
systemctl enable --now mysqld
```

若报找不到 `mysql-server`，再试 `dnf search mysql` 后安装仓库里的 `mysql` / `mysql-community-server`（仍不要选 el7 源）。

初次 root 临时密码（有则用；没有则看 `journalctl -u mysqld` 或直接 `mysql`）：

```bash
grep 'temporary password' /var/log/mysqld.log
mysql -uroot -p
```

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '请换成强密码';
CREATE DATABASE dayangyunjie CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dyyj'@'127.0.0.1' IDENTIFIED BY '请换成业务库强密码';
GRANT ALL ON dayangyunjie.* TO 'dyyj'@'127.0.0.1';
FLUSH PRIVILEGES;
```

日常在 ECS 上查库（用户 `dyyj`、库 `dayangyunjie`）见 **第十四节**。

密码若含 `@` `#` 等，写入 `DATABASE_URL` 时必须 **URL 编码**。

---

## 五、把 API 源码打 tar 后 scp 到服务器

服务器目录：代码跑在 `/opt/dayangyunjie-code`；本机打好的 tar **先放到桌面，再 scp 到服务器 `~/upload/`**（root 登录时即 `/root/upload`）；解压前把现网 `dayangyunjie-code` 打成备份放到 **`/opt/bk/`**。  
**`<仓库根>`** = 本机含根 `package.json` 的那一层（能看到 `apps/`、`packages/`、`package-lock.json`）。  
**打 tar 在 `<仓库根>` 执行**，不要在 `apps/server` 里打包（会缺 lockfile 和 `packages/shared`）。打好后用桌面上的文件 `scp`。

**注意：** `apps/server/node_modules` 是本机 OS 编的。整目录 `scp -r apps/server` 上去，Linux 上 API 很容易启动即崩。根 `workspaces` 是 `apps/*` 和 `packages/*`，API 源码 tar 必须有：

| 必须打进 API tar | 原因 |
|------------------|------|
| `package.json`、`package-lock.json` | 在仓库根装依赖 |
| `tsconfig.base.json` | `shared` / `server` 的 `tsconfig` 都 `extends` 它；缺了则 `tsc` / `prisma db seed` 失败 |
| `packages/shared/` | API 依赖 `@dayangyunjie/shared` |
| `apps/server/` | Nest 源码、`prisma/` |
| `apps/admin/`、`apps/miniapp-admin/` 的**源码** | 满足 workspaces；**不在服务器编译**这两端。静态站另打 dist tar，见 5.3.3 |

**不要**打进 API tar：`apps/miniapp-customer/`、`apps/miniapp-worker/`（不上 ECS，本机出微信包即可）。本机 `.env`、`uploads`、`node_modules`、`dist`、`*.tsbuildinfo`、macOS `._*`、以及误进目录的 `D:\npm-cache` 也不要打进包。  
（只排除 `dist` 却带上本机 `*.tsbuildinfo` 时，ECS 上 `tsc` 会以为已编译过、退出码 0 却不生成 `packages/shared/dist/`。）

### 5.1 本机打包（在 `<仓库根>`，产物放到桌面）

只改了 API / `shared` 才打这一包。不要把 `miniapp-customer`、`miniapp-worker` 打进去。

```bash
cd <仓库根>

tar --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='uploads' \
    --exclude='*.tsbuildinfo' \
    --exclude='._*' \
    --exclude='D:\npm-cache' \
    -czf ~/Desktop/dayangyunjie-api-src.tgz \
    package.json \
    package-lock.json \
    tsconfig.base.json \
    packages/shared \
    apps/server \
    apps/admin \
    apps/miniapp-admin
```

确认包内没有不该有的内容，且含有 `tsconfig.base.json`、**没有**两个小程序目录：

```bash
tar -tzf ~/Desktop/dayangyunjie-api-src.tgz | grep -E 'node_modules|tsbuildinfo|D:\\npm-cache|/\._|miniapp-customer|miniapp-worker' || true
# 应无输出

tar -tzf ~/Desktop/dayangyunjie-api-src.tgz | grep -E '^tsconfig\.base\.json$'
# 应有一行

ls -lh ~/Desktop/dayangyunjie-api-src.tgz
```

### 5.2 本机 scp

从**桌面**上传，不要用 `/tmp` 里的包：

```bash
scp ~/Desktop/dayangyunjie-api-src.tgz root@<ECS公网IP>:~/upload/
```

### 5.3 服务器解压

先 SSH 登录：

```bash
ssh root@<ECS公网IP>
```

#### 5.3.1 首次解压 API 源码

```bash
mkdir -p /opt/dayangyunjie-code
tar -xzf ~/upload/dayangyunjie-api-src.tgz -C /opt/dayangyunjie-code
ls /opt/dayangyunjie-code/package.json \
   /opt/dayangyunjie-code/tsconfig.base.json \
   /opt/dayangyunjie-code/apps/server/package.json
```

#### 5.3.2 日常更新 API 源码

以后只更新 API：本机按 5.1 打到桌面 → 5.2 `scp` 到 **`~/upload/`**。本机打包已 `--exclude='.env'` 和 `--exclude='uploads'`，**正常解压不会覆盖**服务器上已有的 `apps/server/.env` 和 `apps/server/uploads/`（tar 里没有这两样，也不会删服务器上已有文件）。`node_modules`、`dist` 已从 tar 排除，解压不会删；`dist` 解压后本来就要重新 `build`。不要把服务器备份打进源码包。日常 tar 不含两个小程序，**不要删**服务器上已有的 `apps/miniapp-customer`、`apps/miniapp-worker`。

解压前固定三步，不要对调：**先把现网 `dayangyunjie-code` 打包装进 `/opt/bk`** → **再单独备份 `.env` / `uploads`** → **最后从 `~/upload` 解压新包**。整目录备份用于整机回滚；`.env` 和 `uploads` 再拷一份，是防止新包万一漏了 `--exclude`。root 上 `cp` 常被别名成 `cp -i`：目标已存在时会问 `overwrite?`，输入 **`y`** 覆盖、**`n`** 跳过。不要加 `2>/dev/null`，否则提问看不见。每步用 `ls` 确认完成后才进行下一步。

```bash
# 1）整目录打包备份到 /opt/bk（含 node_modules，体积较大，可能要一两分钟）
STAMP=$(date +%Y%m%d-%H%M%S)
tar -czf /opt/bk/dayangyunjie-code.bak-$STAMP.tgz -C /opt dayangyunjie-code
ls -lh /opt/bk/dayangyunjie-code.bak-$STAMP.tgz

# 2）再备份正在用的密钥和图片
cd /opt/dayangyunjie-code
cp apps/server/.env /root/server.env.bak
rm -rf /root/server-uploads.bak
cp -a apps/server/uploads /root/server-uploads.bak
ls -l /root/server.env.bak /root/server-uploads.bak

# 3）从 ~/upload 解压新源码（覆盖 /opt/dayangyunjie-code 里的源码文件，不删已有 .env / uploads / node_modules）
tar -xzf ~/upload/dayangyunjie-api-src.tgz -C /opt/dayangyunjie-code

# 解压后若 .env 或图片不对，再用这两份快照还原（正常解压可跳过；已存在会再问 y/n）
# cp /root/server.env.bak apps/server/.env
# mkdir -p apps/server/uploads
# cp -a /root/server-uploads.bak/. apps/server/uploads/

# 编译并重启
find packages/shared apps/server -name '*.tsbuildinfo' -delete
npm run build --workspace=@dayangyunjie/shared
npm run build --workspace=@dayangyunjie/server
cd /opt/dayangyunjie-code/apps/server
npx prisma generate
pm2 restart dayangyunjie-api
pm2 status
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/docs

# 只改了表结构（加表、加列、改索引）才执行下面几行
# cd /opt/dayangyunjie-code/apps/server
# npx prisma generate
# npx prisma db push
# pm2 restart dayangyunjie-api

# 空库才 seed；有业务数据不要执行
# npx prisma db seed
```

整目录备份回滚（回到解压前的代码树）：

```bash
# 先停 API，避免进程占用旧文件
pm2 stop dayangyunjie-api
rm -rf /opt/dayangyunjie-code
tar -xzf /opt/bk/dayangyunjie-code.bak-<STAMP>.tgz -C /opt
# 若还要用解压前那份密钥/图片（一般整目录包里已有；已存在会问 y/n）：
# cp /root/server.env.bak /opt/dayangyunjie-code/apps/server/.env
# cp -a /root/server-uploads.bak/. /opt/dayangyunjie-code/apps/server/uploads/
pm2 restart dayangyunjie-api
```

`/opt/bk/dayangyunjie-code.bak-*.tgz` 会占盘，留最近 1～2 份即可，旧的 `rm` 掉。不要备份进即将 scp 上去的源码包，也不要放到 `~/upload`（那是新包入口）。

#### 5.3.3 更新 PC 后台（admin）与运营 H5（miniapp-admin）

静态站在 `/var/www/`，**不要**用 API 那个源码 tar 去覆盖这两处。**只打包有改动的那一端。** 顺序固定：**本机构建 → 打 tar 到桌面 → 服务器先备份现网目录 → 本机 scp 桌面文件到 `~/upload` → 服务器解压覆盖**。不要先解压再备份。Nginx 不用改、不要再 `mkdir`。

本机先按 **第八节** 打出 dist，再打成 tar 放到桌面（包根下必须直接是 `index.html`，不要多套一层目录名）：

```bash
# 本机 <仓库根>；只打有改动的那一行，打完用 ls 确认桌面上有这个文件
tar -czf ~/Desktop/dayangyunjie-admin-dist.tgz -C apps/admin/dist .
tar -czf ~/Desktop/dayangyunjie-miniapp-admin-h5.tgz -C apps/miniapp-admin/dist/build/h5 .
ls -lh ~/Desktop/dayangyunjie-*.tgz
```

桌面上的 zip（如 `dayangyunjie-miniapp-admin-h5.zip`）也可以，见下方解压注意。

**1）服务器：先备份**

```bash
ssh root@<ECS公网IP>

STAMP=$(date +%Y%m%d-%H%M%S)
cp -a /var/www/dayangyunjie-admin /root/dayangyunjie-admin.bak-$STAMP
cp -a /var/www/dayangyunjie-miniapp-admin /root/dayangyunjie-miniapp-admin.bak-$STAMP
ls -ld /root/dayangyunjie-admin.bak-$STAMP /root/dayangyunjie-miniapp-admin.bak-$STAMP
```

记下 `$STAMP`，回滚时要用。

**2）本机：再上传**

```bash
# 本机：从桌面上传有改动的那一端
scp ~/Desktop/dayangyunjie-admin-dist.tgz root@<ECS公网IP>:~/upload/
scp ~/Desktop/dayangyunjie-miniapp-admin-h5.tgz root@<ECS公网IP>:~/upload/
```

若用桌面 zip：

```bash
scp ~/Desktop/dayangyunjie-miniapp-admin-h5.zip root@<ECS公网IP>:~/upload/
# PC 后台同理，有 dayangyunjie-admin.zip 再 scp
```

**3）服务器：再解压覆盖**

先清空站点目录再解压，避免留下上一版 `assets/` 里的旧哈希文件。

```bash
# tar 包（根下直接是 index.html）
rm -rf /var/www/dayangyunjie-admin/*
tar -xzf ~/upload/dayangyunjie-admin-dist.tgz -C /var/www/dayangyunjie-admin
ls /var/www/dayangyunjie-admin/index.html

rm -rf /var/www/dayangyunjie-miniapp-admin/*
tar -xzf ~/upload/dayangyunjie-miniapp-admin-h5.tgz -C /var/www/dayangyunjie-miniapp-admin
ls /var/www/dayangyunjie-miniapp-admin/index.html
```

zip 若多了一层目录（`unzip -l` 看到 `dayangyunjie-miniapp-admin-h5/index.html`），解到临时目录再把**含 `index.html` 的那一层**拷进去：

```bash
rm -rf /tmp/h5-unz
mkdir -p /tmp/h5-unz
unzip -o ~/upload/dayangyunjie-miniapp-admin-h5.zip -d /tmp/h5-unz
# 确认 index.html 所在目录后：
rm -rf /var/www/dayangyunjie-miniapp-admin/*
cp -a /tmp/h5-unz/dayangyunjie-miniapp-admin-h5/. /var/www/dayangyunjie-miniapp-admin/
ls /var/www/dayangyunjie-miniapp-admin/index.html
```

覆盖的是目录里的文件，不要变成 `/var/www/dayangyunjie-miniapp-admin/dayangyunjie-miniapp-admin-h5/`，否则页面会 404。

**回滚（解压后页面异常时）**

```bash
# 把 STAMP 换成备份时的时间戳
rm -rf /var/www/dayangyunjie-admin
cp -a /root/dayangyunjie-admin.bak-STAMP /var/www/dayangyunjie-admin
rm -rf /var/www/dayangyunjie-miniapp-admin
cp -a /root/dayangyunjie-miniapp-admin.bak-STAMP /var/www/dayangyunjie-miniapp-admin
```

验收：`https://admin.yunjiezhixiang.cn/` 、`https://h5.yunjiezhixiang.cn/`（浏览器强刷或清缓存）。

---

## 六、后端环境变量

只在 **ECS** 维护：`/opt/dayangyunjie-code/apps/server/.env`（不要打进 tar、不要从本机整份覆盖）。

```bash
cd /opt/dayangyunjie-code/apps/server
openssl rand -hex 32    # JWT_ACCESS_SECRET
openssl rand -hex 32    # JWT_REFRESH_SECRET（必须和 access 不同）
```

| 变量 | 设什么 | 不设会怎样 |
|------|--------|------------|
| `JWT_ACCESS_SECRET` | 上面第一条随机串 | 代码回退开发默认值，**生产不能用** |
| `JWT_REFRESH_SECRET` | 上面第二条随机串 | 同上 |
| `JWT_ACCESS_EXPIRES_IN` | 如 `2h`、`8h` | 代码默认 `2h` |
| `JWT_REFRESH_EXPIRES_IN` | 如 `7d`、`15d` | 代码默认 `7d` |

改这四项后必须 `pm2 restart dayangyunjie-api`。已发出去的旧 token 在过期前仍有效；换 secret 等于让旧 token 全部失效。

`JWT_*_SECRET` 写成 `待补充` **不会**走代码默认值，必须换成上面的随机串。  
`WECHAT_*` / `SMS_ACCESS_KEY_*` 为 `待补充` 时该通道跳过，不挡业务。  
`WECHAT_OA_TMPL_*`、`SMS_TMPL_*` 已拍板，不要改；**不要**加 `WECHAT_OA_TMPL_REMINDER_*`（T-30 只发短信）。  
`STORAGE_PROVIDER=local` 时不要写 `COS_*`。明文模式不要写 `WECHAT_OA_AES_KEY`。不要写 `GITHUB_TOKEN`。  
`WECHAT_MP_RELEASED=true`：居民/员工模板带正式版小程序跳转。未发正式版时用 `false`：模板仍发，但**不带** `miniprogram`（微信服务号模板不能跳体验版；带了会 40165 导致整条失败）。运营 H5 跳转不受此开关影响。
`WECHAT_ADMIN_H5_BASE_URL` 为 `待补充` 时跳过运营微信。H5 通了填 `https://h5.yunjiezhixiang.cn`（子域根路径，不加 `/admin/`，**不是** `admin.`）。  
短信 AccessKey 必须来自**短信账号**，不要用 ECS 主账号。`cat .env` 只在服务器上看，不要贴到公开渠道。

```bash
cat > /opt/dayangyunjie-code/apps/server/.env << 'EOF'
DATABASE_URL=mysql://dyyj:X7%2AkP9%21mQvLn@127.0.0.1:3306/dayangyunjie

JWT_ACCESS_SECRET=2bc46db13eb62bc5cae8e10751341888d0eec5d626a312d939564635156fa0bb
JWT_REFRESH_SECRET=f90f03a913d46be454ce167c92b71d657e9759a808b07de76b1b25eeac80aeb3
JWT_ACCESS_EXPIRES_IN=6h
JWT_REFRESH_EXPIRES_IN=7d

WECHAT_MOCK_OPENID_PREFIX=mock_openid_
WECHAT_CUSTOMER_APPID=wx3767fa12506d8997
WECHAT_CUSTOMER_SECRET=7680f35bc69e7008d93a1a2d6f9341f0

WECHAT_WORKER_APPID=wxbd085578dda8a2ff
WECHAT_WORKER_SECRET=64f0781ab7ce26d77f6655a9a59aae21

WECHAT_OA_APPID=wxcd447aa0f2505c09
WECHAT_OA_SECRET=1eff1a011f64c0e7c5179e14bbce9aea
WECHAT_OA_TOKEN=DyYjOaTok7kQm2Np9xL4wRc8Ht5vB3
WECHAT_OA_ENCODING_MODE=plain

WECHAT_OA_TMPL_ORDER_CREATED_RESIDENT=76lGU6M3l0CV9XdSVGvg3AyoCUt-_PK1TZbY-DVbZnU
WECHAT_OA_TMPL_NEW_ORDER_ADMIN=c3VSz6fV6mqD7Q-gXXlE22Q6zLkanw9c9ntRTHHK41E
WECHAT_OA_TMPL_WORKER_ASSIGNED=OAuzYglX64w1OIKBB3rQ9NGTHGaNV2ytUTvwacvdONM
WECHAT_OA_TMPL_ACCEPTED=eX--7A13c7k0HF60IC9RNSJsFkEckAsqp5fbPd9xbA4
WECHAT_OA_TMPL_COMPLETED_RESIDENT=cRhLoBGqdg7L1dz0x4QwQfhWt5kVmcJGjjm-xtsgdqk
WECHAT_OA_TMPL_CANCELLED_RESIDENT=dMNDuYBvKOWPj-HJpNbyqazj9VwoDOW_N1E7iHwrpRs
WECHAT_OA_TMPL_ACCEPT_TIMEOUT_ADMIN=1kdKwgR6Feosro1zA16zpX_4-73HkXm3iWocT7Iwbmg

WECHAT_ADMIN_H5_BASE_URL=https://h5.yunjiezhixiang.cn
WECHAT_MP_RELEASED=false

STORAGE_PROVIDER=local
CORS_ORIGIN=https://admin.yunjiezhixiang.cn,https://h5.yunjiezhixiang.cn
SERVER_BASE_URL=https://api.yunjiezhixiang.cn

SMS_PROVIDER=aliyun
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=北京大洋云洁
SMS_ENDPOINT=dysmsapi.aliyuncs.com
SMS_REGION_ID=cn-hangzhou
SMS_TMPL_NEW_ORDER_ADMIN=SMS_512410706
SMS_TMPL_WORKER_ASSIGNED=SMS_512035746
SMS_TMPL_ACCEPTED_RESIDENT=SMS_512135723
SMS_TMPL_REMINDER_RESIDENT=SMS_512230700
SMS_TMPL_REMINDER_WORKER=SMS_512160710
SMS_TMPL_ACCEPT_TIMEOUT_ADMIN=SMS_512185692
EOF
```

`DATABASE_URL` 密码段先 `待补充`，换成真实密码（含 `@` 要 URL 编码）。居民/员工小程序 Secret **不要混用**。`TOKEN` 与公众平台服务器配置一致。

---

## 七、在 ECS 上只构建并启动 API

全部在 **SSH 登录后的服务器**执行。不要编 admin / uni-app。  
先确认：第五节已解压、第六节已写好 `.env`、MySQL 已启动。`DATABASE_URL` 里的密码不能仍是 `待补充`，否则建表会失败。

```bash
cd /opt/dayangyunjie-code
```

### 7.0 安装依赖

```bash
cd /opt/dayangyunjie-code
npm ci --ignore-scripts
```

| 现象 | 不要做什么 | 改怎么做 |
|------|------------|----------|
| `npm ci` 因可选依赖 / postinstall 失败 | **不要**再跑无参数 `npm ci`（会清空 `node_modules` 再失败一次） | `npm install --ignore-scripts` |
| 报缺少某个 workspace 包 | 不要只拷了 `apps/server` | 按第五节把 `apps/*`、`packages/shared`、根 `package-lock.json` 打进 tar 再解压 |
| 日志出现 `D:\npm-cache` | — | 本机垃圾目录被打进 tar。删掉服务器上的 `**/D:\npm-cache` 与 `._*`，按 5.1 重新打包（已排除该项）后必要时 `rm -rf node_modules apps/*/node_modules packages/*/node_modules` 再 `npm ci --ignore-scripts` |

`--ignore-scripts` 之后 **Prisma Client 和 Linux 版 sharp 往往没装上**，下面 7.1、7.4 会补。

### 7.1 空库首次建表

当前源码里的 `apps/server/prisma/migrations/` **不完整**。空库不要跑 `npx prisma migrate deploy`（会失败或漏表）。

```bash
cd /opt/dayangyunjie-code/apps/server
npx prisma generate
npx prisma db push
npx prisma db seed
```

| 现象 | 不要做什么 | 改怎么做 |
|------|------------|----------|
| `Can't reach database` / Access denied | — | 检查 MySQL 已 `systemctl start mysqld`；`.env` 的用户、库名、**已 URL 编码的密码** 与第四节建库一致 |
| `migrate deploy`：No migration found / 表不存在 | 不要用 `migrate deploy` 初始化空库 | 改用上面的 `db push` |
| seed 报 `admins` 表不存在 | — | `db push` 没成功就 seed 了。先 `db push` 再 `seed` |
| 以后更新又跑了 `db seed` | 不要在有数据的库上例行 seed | seed **只空库这一次**。会写入管理员 `admin@dayunyunjie.com` / `admin123`（邮箱拼写以 `prisma/seed.ts` 为准）。装完**立刻改密码**；再 seed 会把密码写回 `admin123` |

`db push` 后 `_prisma_migrations` 可能仍为空。以后不要对残缺 migration 跑 `migrate deploy`（「列已存在」或建不出表）。

```bash
mysql -udyyj -p -h127.0.0.1 -e "SHOW TABLES;" dayangyunjie
```

应能看到 `admins` 等表。含通知的版本 `db push` 后还应有 `wechat_oa_followers`、`wechat_oa_oauth_states`、`notify_send_logs`。

### 7.2 编译 API

必须先编 `shared`，再编 `server`。`--ignore-scripts` 后若还没 `prisma generate`，先做 7.1。

```bash
cd /opt/dayangyunjie-code
npm run build --workspace=@dayangyunjie/shared
npm run build --workspace=@dayangyunjie/server
```

| 现象 | 不要做什么 | 改怎么做 |
|------|------------|----------|
| `Property '…' does not exist on type 'PrismaService'` | 不要删 `package-lock.json` | `cd /opt/dayangyunjie-code/apps/server && npx prisma generate`，再重新 `build` server |
| `Cannot find module '@dayangyunjie/shared'` | 不要先编 server | 先成功编 shared，并确认 `ls packages/shared/dist/index.js` 存在 |
| `tsc` 编 shared 退出 0 但没有 `dist/` | 不要反复空跑 `build` | 删本机带上来的增量缓存：`find packages/shared apps/server -name '*.tsbuildinfo' -delete`，再编 shared；下次 tar 按 5.1 排除 `*.tsbuildinfo` |
| 缺 `tsconfig.base.json` / seed 报 Cannot read file | 不要只拷 `apps/server` | 按 5.1 把根目录 `tsconfig.base.json` 打进 tar，或单独 `scp` 到 `/opt/dayangyunjie-code/` |
| 想跑根目录 `npm run build` | **不要**（会编小程序/H5） | 只跑上面两条 workspace |
| 构建时报缺 `@rollup/rollup-linux-x64-gnu` | 不要按报错去删 lock / 整棵 `node_modules` | 你编到前端了。停掉，回到只编 shared + server |

构建里的 Deprecation、chunk 体积警告可忽略。

### 7.3 验证产物

```bash
ls -l /opt/dayangyunjie-code/packages/shared/dist/index.js
ls -l /opt/dayangyunjie-code/apps/server/dist/main.js
```

两条都存在、时间是刚才构建的时间、上一步命令无报错，即产物可用。

### 7.4 启动

必须在 `apps/server` 目录启动（才能加载该目录下的 `.env`）。

```bash
cd /opt/dayangyunjie-code/apps/server
mkdir -p uploads
pm2 delete dayangyunjie-api 2>/dev/null || true
pm2 start dist/main.js --name dayangyunjie-api --cwd /opt/dayangyunjie-code/apps/server
pm2 save
pm2 startup
```

`pm2 startup` 会打印一条 `sudo env PATH=…` 命令，**原样再执行一次**，开机才会拉起 PM2。

| 现象 | 不要做什么 | 改怎么做 |
|------|------------|----------|
| `pm2 status` 为 `errored`，日志 `Could not load the "sharp" module` | **不要**按日志执行 `npm install --include=optional sharp`（`--workspace` 也容易报 npm null） | 在 **`/opt/dayangyunjie-code` 根目录**：`npm install @img/sharp-linux-x64@0.34.5 --no-save --ignore-scripts`（必须加 `--ignore-scripts`，否则会跑 miniapp 的 postinstall 且缺 `scripts/`）。`ls node_modules/@img/sharp-linux-x64/package.json` 有文件后 `pm2 restart dayangyunjie-api` |
| 仍缺 sharp | — | 确认 `node -v` 为 20/22；再试根目录同上命令。Alibaba Cloud Linux 4 的 glibc 足够跑官方二进制 |
| 装 sharp 时报 `Cannot find module '.../scripts/link-uni-local-deps.mjs'` | 不要为此去编 uni / 重跑无参 `npm ci` | API 包未含 `scripts/`。加 `--ignore-scripts` 即可；本方案不在 ECS 构建小程序 |
| 起来马上退出：数据库连不上 | — | 第七节 7.1 的 `DATABASE_URL`；`pm2 logs dayangyunjie-api --lines 80 --nostream` |
| JWT 仍是 `待补充` | 可以起进程，但登录票据不安全 | 按第六节换成随机串后 `pm2 restart dayangyunjie-api` |
| 反复 `pm2 restart` 但 ↺ 次数在涨 | 不要无意义重启 | 先看 `~/.pm2/logs/dayangyunjie-api-error.log` |

### 7.5 验证启动

```bash
pm2 status
curl -I http://127.0.0.1:3000/api/docs
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/docs
```

通过：`dayangyunjie-api` 为 **online**；`/api/docs` 返回 **200**。公网 **不要**直连 3000。

```bash
pm2 logs dayangyunjie-api --lines 80 --nostream
```

应有类似 `大洋云洁 Server is running`。有 Prisma / ECONNREFUSED 则回到 7.1、7.4 表格。

---

## 八、本机构建 admin / miniapp-admin 并用 scp 上传

PC 与运营 H5 默认 API 都是相对路径 **`/api/v1`**。浏览器请求**当前域名**下的 `/api/v1`、`/uploads/`，由 Nginx 反代到本机 3000。因此：

- **不要**建 `apps/admin/.env.production` / `apps/miniapp-admin/.env.production`
- **不要**改 `vite.config.ts` 里的 `base`
- 静态站**只传 `dist`，不要传 `node_modules`**
- 本机需已在 `<仓库根>` 做过一次 `npm ci`。开发用的 `.env.development` 不会打进生产包。

**顺序（首次）：服务器建目录 → 本机构建 → 本机 scp。** `scp` 时目标目录必须已存在。日常发版跳过 8.0。

### 8.0 服务器先建静态目录（首次一次）

```bash
mkdir -p /var/www/dayangyunjie-admin /var/www/dayangyunjie-miniapp-admin
```

第九节 Nginx 的 `root` 指向这两个目录，**不要再 mkdir**。

### 8.1 PC 管理后台

```bash
cd <仓库根>
npm run build --workspace=@dayangyunjie/shared
npm run build --workspace=@dayangyunjie/admin
ls apps/admin/dist/index.html
scp -r apps/admin/dist/* root@<ECS公网IP>:/var/www/dayangyunjie-admin/
```

访问（Nginx 配好后）：`https://admin.yunjiezhixiang.cn/`

### 8.2 运营 H5

正式 `base` 是 **`/`**。Nginx 把 H5 挂在 `h5.` 子域根路径。

```bash
cd <仓库根>
npm run build:miniapp-admin
ls apps/miniapp-admin/dist/build/h5/index.html
scp -r apps/miniapp-admin/dist/build/h5/* root@<ECS公网IP>:/var/www/dayangyunjie-miniapp-admin/
```

访问：`https://h5.yunjiezhixiang.cn`  
日常发版：本机构建后 **tar 到桌面**，再按 **5.3.3** 备份 → scp → 解压，不要只 scp 覆盖 `/var/www`。首次仍按上面建目录后直接 scp。

---

## 九、云解析 DNS、证书与 Nginx

前提：域名已备案，**三张**个人免费证书已签发（`admin.` / `h5.` / `api.` 各一张）。  
浏览器静态站走相对 `/api/v1`，所以 **admin、h5 两个 HTTPS 站点也必须反代 `/api/` 和 `/uploads/`**，不能只给 `api.` 反代。小程序、服务号回调仍走 `api.yunjiezhixiang.cn`。

```bash
mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true
```

静态目录已在 **8.0** 建好，这里不要再 `mkdir /var/www/...`。

### 9.1 确认云解析

[云解析 DNS](https://dns.console.aliyun.com/) → `yunjiezhixiang.cn`，三条 A 记录都指向该 ECS **弹性公网 IP**（不要填内网 IP）：

| 记录类型 | 主机记录 | 解析到 |
|----------|----------|--------|
| A | `admin` | `admin.yunjiezhixiang.cn` |
| A | `h5` | `h5.yunjiezhixiang.cn` |
| A | `api` | `api.yunjiezhixiang.cn` |

不要加 `www.admin`、`admin.h5`。NS 须在阿里云，否则免费证书自动 DNS 验证会失败（证书已签过可忽略）。

本机默认**没有** `dig`（属 `bind-utils`，不必为这一步去装）。用系统自带的 `getent` 即可：

```bash
getent hosts admin.yunjiezhixiang.cn
getent hosts h5.yunjiezhixiang.cn
getent hosts api.yunjiezhixiang.cn
```

三行都应解析到**同一条** ECS 弹性公网 IP（不要内网 IP）。Windows 本机可用 `nslookup`。安全组 / firewalld 已放行 80、443。

### 9.2 证书放到 Nginx 目录

下载类型选 **Nginx**，解压得到 `.pem` + `.key`。私钥不要打进源码 tar。

```bash
mkdir -p /etc/nginx/ssl/yunjiezhixiang
chmod 700 /etc/nginx/ssl/yunjiezhixiang
```

本机（证书解压目录，按实际文件名改）：

```bash
scp admin.yunjiezhixiang.cn.pem  root@<ECS公网IP>:/etc/nginx/ssl/yunjiezhixiang/admin.pem
scp admin.yunjiezhixiang.cn.key  root@<ECS公网IP>:/etc/nginx/ssl/yunjiezhixiang/admin.key
scp h5.yunjiezhixiang.cn.pem     root@<ECS公网IP>:/etc/nginx/ssl/yunjiezhixiang/h5.pem
scp h5.yunjiezhixiang.cn.key     root@<ECS公网IP>:/etc/nginx/ssl/yunjiezhixiang/h5.key
scp api.yunjiezhixiang.cn.pem    root@<ECS公网IP>:/etc/nginx/ssl/yunjiezhixiang/api.pem
scp api.yunjiezhixiang.cn.key    root@<ECS公网IP>:/etc/nginx/ssl/yunjiezhixiang/api.key
```

服务器：

```bash
chmod 600 /etc/nginx/ssl/yunjiezhixiang/*.key
chmod 644 /etc/nginx/ssl/yunjiezhixiang/*.pem
chcon -t httpd_config_t /etc/nginx/ssl/yunjiezhixiang/* 2>/dev/null || true
```

90 天到期再领三张新证，同名覆盖后 `nginx -t && systemctl reload nginx`。

### 9.3 Nginx（三主机 HTTPS + 同域反代）

服务号回调：`https://api.yunjiezhixiang.cn/api/v1/wechat/oa/callback`。  
Swagger：`https://api.yunjiezhixiang.cn/api/docs`。图片公网地址用 `SERVER_BASE_URL=https://api.yunjiezhixiang.cn`（小程序不走 admin/h5）。

Alibaba Cloud Linux 4 的 Nginx 较新，本文仍用 **TLSv1.2**（够用）。不要为了抄旧文档去装 CentOS 7 的 Nginx。  
`X-Forwarded-Proto` 必须传到 Node。运营 H5 的 `location /` SPA 回退必须保留。

```bash
cat > /etc/nginx/conf.d/dayangyunjie.conf << 'EOF'
# HTTP 只跳 HTTPS
server {
    listen 80;
    server_name admin.yunjiezhixiang.cn h5.yunjiezhixiang.cn api.yunjiezhixiang.cn;
    return 301 https://$host$request_uri;
}

# PC 管理后台：静态 + 同域 /api /uploads
server {
    listen 443 ssl;
    server_name admin.yunjiezhixiang.cn;

    ssl_certificate     /etc/nginx/ssl/yunjiezhixiang/admin.pem;
    ssl_certificate_key /etc/nginx/ssl/yunjiezhixiang/admin.key;
    ssl_protocols       TLSv1.2;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /var/www/dayangyunjie-admin;
    index index.html;
    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 运营 H5：h5 子域根路径静态站 + 同域反代
server {
    listen 443 ssl;
    server_name h5.yunjiezhixiang.cn;

    ssl_certificate     /etc/nginx/ssl/yunjiezhixiang/h5.pem;
    ssl_certificate_key /etc/nginx/ssl/yunjiezhixiang/h5.key;
    ssl_protocols       TLSv1.2;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 20m;

    root /var/www/dayangyunjie-miniapp-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# API / 上传 / 服务号（小程序合法域名用这一台）
server {
    listen 443 ssl;
    server_name api.yunjiezhixiang.cn;

    ssl_certificate     /etc/nginx/ssl/yunjiezhixiang/api.pem;
    ssl_certificate_key /etc/nginx/ssl/yunjiezhixiang/api.key;
    ssl_protocols       TLSv1.2;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

nginx -t && systemctl reload nginx
```

### 9.4 后端 `.env` 与验收

确认 `apps/server/.env`（**不是**前端的 `.env.production`）：

```env
CORS_ORIGIN=https://admin.yunjiezhixiang.cn,https://h5.yunjiezhixiang.cn
SERVER_BASE_URL=https://api.yunjiezhixiang.cn
WECHAT_ADMIN_H5_BASE_URL=https://h5.yunjiezhixiang.cn
WECHAT_MP_RELEASED=false
```

```bash
pm2 restart dayangyunjie-api
```

```bash
curl -I https://admin.yunjiezhixiang.cn/
curl -I https://admin.yunjiezhixiang.cn/api/docs
curl -I https://h5.yunjiezhixiang.cn/
curl -I https://h5.yunjiezhixiang.cn/api/docs
curl -I https://api.yunjiezhixiang.cn/api/docs
```

通过：`admin.` 与 `h5.` 首页均为 200；两处 `/api/docs` 为 200。浏览器能登录 PC、能在 `h5.` 根路径打开 H5；上传一张图后库里的 URL 主机是 `https://api.yunjiezhixiang.cn`。

---

## 十、居民端 / 员工端小程序（不上 ECS）

这两端**不能**像第八节那样走 Nginx 同域 `/api/v1`：微信要求 request 合法域名是备案 HTTPS 主机，必须直连 **`https://api.yunjiezhixiang.cn`**。  
因此要写各自目录下的 `.env.production`（不要给 admin / miniapp-admin 写生产 env）。两个应用各自读自己的文件。`npm run build:mp-weixin` 会把 `VITE_API_BASE` 编译进包。

- `apps/miniapp-customer/.env.production`
- `apps/miniapp-worker/.env.production`

两份都写成（不要填公网 IP、不要填 `admin.` / `h5.`）：

```env
VITE_API_BASE=https://api.yunjiezhixiang.cn/api/v1
```

```bash
cd <仓库根>
npm run build --workspace=@dayangyunjie/shared
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-customer
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-worker
```

微信开发者工具打开：

- `apps/miniapp-customer/dist/build/mp-weixin`
- `apps/miniapp-worker/dist/build/mp-weixin`

上传到对应小程序账号。合法域名 request / uploadFile / downloadFile：`https://api.yunjiezhixiang.cn`。服务号回调：`https://api.yunjiezhixiang.cn/api/v1/wechat/oa/callback`。

**不要**把微信上传包 `scp` 到 ECS，也不要配 Nginx 去托管小程序包。

---

## 十一、验收清单

- [ ] 安全组仅 22/80/443；3306、3000 不对公网
- [ ] 云解析三条 A 记录 `admin` / `h5` / `api` 指向 ECS 弹性 IP（`getent hosts` 三条同 IP）
- [ ] 三张个人免费证书已签发，Nginx 指向对应 `.pem` / `.key`
- [ ] `pm2 status` 中 `dayangyunjie-api` 为 `online`
- [ ] `curl -I http://127.0.0.1:3000/api/docs` 与 `curl -I https://api.yunjiezhixiang.cn/api/docs` 成功
- [ ] 浏览器 HTTPS 打开 PC 后台并登录（seed 后立刻改密）
- [ ] 浏览器打开 `https://h5.yunjiezhixiang.cn`（运营 H5 在子域根路径）
- [ ] HTTP 访问三主机返回 301 到 HTTPS
- [ ] `https://admin.yunjiezhixiang.cn/api/docs` 与 `https://h5.yunjiezhixiang.cn/api/docs` 能反代到 API
- [ ] 上传一张图，库里的 URL 主机是 `https://api.yunjiezhixiang.cn`，不是 `localhost`
- [ ] 小程序 `VITE_API_BASE` 为 `https://api.yunjiezhixiang.cn/api/v1` 并能登录、下单
- [ ] 运营微信基址为 `https://h5.yunjiezhixiang.cn`（仍 `待补充` 则只跳过运营微信）

机器通了之后，微信后台、开放平台、短信账号和人员绑定见 [`WeChat-SMS-Notify-After-Aliyun-Deploy.md`](./WeChat-SMS-Notify-After-Aliyun-Deploy.md)。

---

## 十二、常见问题

| 现象 | 处理 |
|------|------|
| `getent hosts` 不到域名 / IP 不对 | NS 未切到阿里云；记录值填了内网 IP；TTL/缓存未过。ECS 上不必装 `dig`；本机可用 `nslookup` |
| 证书申请 DNS 验证失败 | 域名须在本账号云解析；或手工按控制台提示加 TXT |
| `nginx -t` 报证书路径 | `.pem`/`.key` 文件名、权限、`chcon`；CSR 非系统生成时包里没有 key |
| 浏览器证书报错主机名不匹配 | 三个 `server` 必须用**各自**那张单域名证，不能三站共用一张 |
| HTTPS 能开、接口 CORS 失败 | `CORS_ORIGIN` 含 `https://admin...` 与 `https://h5...`，无尾斜杠 |
| 管理后台登录 500 | 补 `CORS_ORIGIN` 为浏览器实际 Origin（含协议、无路径） |
| 小程序/H5 图片全裂 | 补 `SERVER_BASE_URL=https://api.yunjiezhixiang.cn`，重新上传一张图 |
| Nginx 502 | `setsebool -P httpd_can_network_connect 1`；确认 PM2 在听 3000 |
| H5 静态 404 / JS 路径错误 | 访问 `https://h5.yunjiezhixiang.cn`；检查 Nginx `root /var/www/dayangyunjie-miniapp-admin` 与 `try_files ... /index.html`，并确认正式构建未设置 `VITE_PUBLIC_BASE=/admin/` |
| `prisma` 报 engine / openssl | Alibaba Cloud Linux 4 + 系统 Node 20/22 一般可用；仍失败看 `npx prisma --version` 与 Prisma 文档的 OpenSSL 变体 |
| `scp -r apps/server` 后 API 起不来 | 把本机 `node_modules` 带上去了。删掉服务器 `node_modules`，按第五节重新 tar（排除 `node_modules`）再 `npm ci --ignore-scripts` |
| `npm ci` 报缺少某个 workspace | 根 `workspaces` 是 `apps/*`。日常 tar **不含** `miniapp-customer` / `miniapp-worker`，服务器上这两目录必须还在（首次部署留下的即可）。不要删它们。`admin` / `miniapp-admin` 源码须在 API tar 里 |
| `npm ci` 在服务器编 uni 失败 | 不要在 ECS 跑根目录 `npm run build`；静态站本机编后 scp `dist` |
| seed 后登录不上 | 邮箱是 `dayunyunjie` 拼写；或二次 seed 覆盖了你改过的密码 |
| 空库 `migrate deploy` 失败 | 首次用 `db push`，见第七节 |
| 误装了 CentOS 7 的 Node 18 / `el7` MySQL 源 | 不要混用。卸掉旧源和包后按第四节用 `dnf` 重装 |

```bash
pm2 logs dayangyunjie-api --lines 200
```

---

## 十三、本机 → 服务器文件对照（发版时）

本机在 `<仓库根>` 构建/打 tar，**产物先放到 `~/Desktop`**，再 `scp` 到服务器 `~/upload/`。ECS 上解压、`npm ci`、`prisma`、`pm2`。  
首次部署走第四节～第十二节；**日常发版只看本节**（机器已通、Nginx / 证书不动）。**只打包有改动的端**；居民端 / 员工端小程序不上 ECS。

| 变更 | 本机 | 服务器 |
|------|------|--------|
| API / `shared` | 5.1 打 `~/Desktop/dayangyunjie-api-src.tgz` → 5.2 `scp` 到 `~/upload/` | **13.1**（备份打到 `/opt/bk`） |
| 仅 PC 后台 | 第八节构建 dist，5.3.3 打 `~/Desktop/dayangyunjie-admin-dist.tgz` 再 scp | 先备份 `/var/www/dayangyunjie-admin`，再解压；Nginx 不用改 |
| 仅运营 H5 | 第八节构建 h5，5.3.3 打 `~/Desktop/dayangyunjie-miniapp-admin-h5.tgz` 再 scp | 先备份 `/var/www/dayangyunjie-miniapp-admin`，再解压 |
| customer / worker | 本机 `build:mp-weixin`，`VITE_API_BASE=https://api.yunjiezhixiang.cn/api/v1`，微信后台上传 | **不上 ECS、不打进 API tar** |

静态覆盖后 Nginx 一般不必重启；若加了缓存头，可 `nginx -s reload`。

静态覆盖后 Nginx 一般不必重启；若加了缓存头，可 `nginx -s reload`。

### 13.1 API 日常更新（可复制）

**本机**（`<仓库根>` 打 tar 到桌面，再 scp；含 `tsconfig.base.json`，不含两个小程序）：

```bash
# 5.1 打好 ~/Desktop/dayangyunjie-api-src.tgz 后：
scp ~/Desktop/dayangyunjie-api-src.tgz root@8.160.117.103:~/upload/
```

**ECS**：

```bash
# 解压前三步与 5.3.2 相同：/opt/bk 整目录备份 → .env/uploads → 从 ~/upload 解压
STAMP=$(date +%Y%m%d-%H%M%S)
tar -czf /opt/bk/dayangyunjie-code.bak-$STAMP.tgz -C /opt dayangyunjie-code
ls -lh /opt/bk/dayangyunjie-code.bak-$STAMP.tgz

cd /opt/dayangyunjie-code
cp apps/server/.env /root/server.env.bak
rm -rf /root/server-uploads.bak
cp -a apps/server/uploads /root/server-uploads.bak
ls -l /root/server.env.bak /root/server-uploads.bak

tar -xzf ~/upload/dayangyunjie-api-src.tgz -C /opt/dayangyunjie-code
# 解压后 .env / 图片不对再还原，见 5.3.2

# package-lock / 依赖有变才重装；无变可跳过本行
npm ci --ignore-scripts

# 若此前 sharp 已装过且未删 node_modules，可跳过；否则：
# npm install @img/sharp-linux-x64@0.34.5 --no-save --ignore-scripts

find packages/shared apps/server -name '*.tsbuildinfo' -delete
npm run build --workspace=@dayangyunjie/shared
npm run build --workspace=@dayangyunjie/server

cd /opt/dayangyunjie-code/apps/server
npx prisma generate
# 仅 schema 有变更时（含通知相关表 / unionid 等）：
# npx prisma db push
# 有数据的库不要再 db seed，也不要 migrate deploy

pm2 restart dayangyunjie-api
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/docs
# 期望 200
```

**不要：** 把本机 `node_modules` / `.env` 打进包；把 `miniapp-customer` / `miniapp-worker` 打进 API tar；在 ECS 跑根目录 `npm run build`；有业务数据后再 `db seed`。

通知联调仍见 [`WeChat-SMS-Notify-After-Aliyun-Deploy.md`](./WeChat-SMS-Notify-After-Aliyun-Deploy.md)。

---

## 十四、MySQL 常用查询（用户 `dyyj`，库 `dayangyunjie`）

只在 **ECS SSH** 上查，库不对公网开放 3306。  
**用户名是 `dyyj`，库名是 `dayangyunjie`**（不要写成库名叫 dyyj）。用户绑在 `127.0.0.1`，登录必须带 **`-h127.0.0.1`**，否则可能走 socket 变成 `dyyj@localhost` 被拒绝。

密码与第四节建库、第六节 `DATABASE_URL` 相同。`-p` 后面不要直接贴密码（会进命令历史）；回车后再输入。不要把 `oa_openid` / `unionid` 发到群里。

### 14.1 登录与退出

```bash
mysql -udyyj -p -h127.0.0.1 dayangyunjie
```

进去后：

```sql
SELECT DATABASE();
SHOW TABLES;
```

应看到 `workers`、`residents`、`admins`、`wechat_oa_followers` 等。退出：`EXIT;` 或 `\q`。

一行命令（查完即退）：

```bash
mysql -udyyj -p -h127.0.0.1 dayangyunjie -e "SHOW TABLES;"
```

### 14.2 员工 `workers`

```sql
-- 列表（不含密码哈希）
SELECT id, employee_no, name, phone, skill_type, employment_status, status, unionid, mp_openid
FROM workers
ORDER BY id DESC
LIMIT 50;

-- 按手机号
SELECT id, employee_no, name, phone, employment_status, unionid
FROM workers
WHERE phone = '13800000000';

-- 在职
SELECT id, employee_no, name, phone, skill_type
FROM workers
WHERE employment_status = 'ACTIVE';
```

`employment_status`：`ACTIVE` 在职 / `RESIGNED` 离职。`status`：`IDLE` 空闲 / `BUSY` 服务中（与在职无关）。`skill_type`：`CLEANING` / `RECYCLING`。查询不要带 `password_hash`。

### 14.3 居民 `residents`

```sql
SELECT id, name, phone, nickname, openid, unionid, created_at
FROM residents
ORDER BY id DESC
LIMIT 50;

SELECT id, name, phone, unionid
FROM residents
WHERE phone = '13800000000';
```

### 14.4 运营 `admins`

```sql
SELECT id, username, email, name, phone, status, is_super_admin
FROM admins
ORDER BY id;

-- 功能授权（超管不写这张表）
SELECT a.id, a.email, a.name, p.menu_key
FROM admins a
LEFT JOIN admin_permissions p ON p.admin_id = a.id
ORDER BY a.id, p.menu_key;
```

`status`：`ENABLED` / `DISABLED`。

### 14.5 服务号粉丝 `wechat_oa_followers`

发模板用的是这里的 **`oa_openid`**，且 `subscribed = 1`，并已挂上对应 `worker_id` / `resident_id` / `admin_id`。

```sql
SELECT id, subscribed, admin_id, worker_id, resident_id, unionid, oa_openid, updated_at
FROM wechat_oa_followers
ORDER BY id DESC
LIMIT 50;

-- 已关注且已绑员工
SELECT f.id, f.subscribed, w.id AS worker_id, w.name, w.phone
FROM wechat_oa_followers f
JOIN workers w ON w.id = f.worker_id
WHERE f.subscribed = 1;

-- 已关注且已绑居民
SELECT f.id, f.subscribed, r.id AS resident_id, r.name, r.phone
FROM wechat_oa_followers f
JOIN residents r ON r.id = f.resident_id
WHERE f.subscribed = 1;

-- 已关注且已绑运营
SELECT f.id, f.subscribed, a.id AS admin_id, a.email, a.name
FROM wechat_oa_followers f
JOIN admins a ON a.id = f.admin_id
WHERE f.subscribed = 1;

-- 有绑定但已取关（微信发不出，reason=unsubscribed）
SELECT id, admin_id, worker_id, resident_id, subscribed
FROM wechat_oa_followers
WHERE subscribed = 0
  AND (admin_id IS NOT NULL OR worker_id IS NOT NULL OR resident_id IS NOT NULL);

-- 某员工有没有挂上粉丝
SELECT w.id, w.name, w.phone, w.unionid,
       f.id AS follower_id, f.subscribed, f.oa_openid
FROM workers w
LEFT JOIN wechat_oa_followers f ON f.worker_id = w.id
WHERE w.phone = '13800000000';
```

### 14.6 订单（联调对照）

```sql
SELECT id, order_no, gps_lat, gps_lng, status, resident_id, worker_id, appoint_date, appoint_time_slot
FROM cleaning_orders
ORDER BY id DESC
LIMIT 20;

SELECT id, order_no, gps_lat, gps_lng, status, resident_id, worker_id, appoint_date, appoint_time_slot
FROM recycling_orders
ORDER BY id DESC
LIMIT 20;

-- 某单当前派给谁
SELECT o.id, o.order_no, o.status, o.worker_id, w.name, w.phone
FROM cleaning_orders o
LEFT JOIN workers w ON w.id = o.worker_id
WHERE o.id = 10;
```

`status` 常见：`PENDING_ASSIGN` / `ASSIGNED` / `ACCEPTED` / `IN_SERVICE` / `PENDING_REVIEW` / `REVIEWED` / `CANCELLED`。

### 14.7 通知发送日志 `notify_send_logs`

```sql
SELECT id, event, order_type, order_id, channel, recipient_key, created_at
FROM notify_send_logs
ORDER BY id DESC
LIMIT 30;
```

没收到微信时：先看粉丝表是否 `subscribed=1` 且挂了对应 id，再对 `pm2 logs dayangyunjie-api` 搜 `reason=`。口径见 [`WeChat-SMS-Notify-After-Aliyun-Deploy.md`](./WeChat-SMS-Notify-After-Aliyun-Deploy.md)。

---

## 十五、交付前清测试订单（保留配置，清空员工与订单）

全流程测完、正式交付时：**删订单流水和测试员工，不删配置、不删运营/居民、不整目录清空 `uploads/`。**  
服务品类 icon、大件价格海报、轮播图都在同一个 `apps/server/uploads/`，`rm -rf uploads` 会把配置图一起干掉，前台品类图标 404。

**不要**再跑 `npx prisma db seed`（会把超管密码写回 `admin123`）。先 `mysqldump` 再动手。

### 15.1 留哪些表

| 留 | 表 |
|----|-----|
| 配置 | `service_catalogs`、`recycling_items`、`review_keywords`、`appoint_time_slot_configs`、`appoint_time_lead_configs`、`complaint_reason_configs`、`banners`、`operators` |
| 账号 | `admins`、`admin_permissions`、`residents`、`addresses` |
| 微信绑定 | `wechat_oa_followers` 里**运营/居民**的绑定保留；员工绑定随员工一起清 |

`operators.phone` 若仍是 seed 的 `13800138000`，改成真客服号，不要整表删。交付后在 PC 后台重新录入正式员工，员工需重新用员工端登录并完成服务号绑定。

### 15.2 删哪些表（订单、员工及相关）

子表先于主表。在 ECS：`mysql -udyyj -p -h127.0.0.1 dayangyunjie`

```sql
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM complaint_follow_ups;   -- 投诉跟进记录
DELETE FROM complaints;             -- 投诉单
DELETE FROM reviews;                -- 居民评价
DELETE FROM work_photos;            -- 员工作业前后照片（库内 URL，文件另按 15.3 删）
DELETE FROM order_status_logs;      -- 订单状态流转（派单/接单/开始服务等）
DELETE FROM consult_follow_ups;     -- 家政咨询跟进记录
DELETE FROM consult_orders;         -- 家政咨询单（单号 CNS）
DELETE FROM cleaning_orders;        -- 保洁订单（单号 CLN）
DELETE FROM recycling_orders;       -- 废品回收订单（单号 RCY）
DELETE FROM notify_send_logs;       -- 超时/提醒通知的幂等占位（不是配置）
DELETE FROM wechat_oa_oauth_states; -- 运营网页授权一次性 state，可清
DELETE FROM wechat_oa_followers WHERE worker_id IS NOT NULL; -- 测试员工的服务号绑定
DELETE FROM workers;                -- 员工账号（测试工号/手机号一并清掉）

SET FOREIGN_KEY_CHECKS = 1;
```

需要订单/员工自增 id 从 1 起，再对已清空的表执行 `ALTER TABLE 表名 AUTO_INCREMENT = 1;`（`cleaning_orders` / `recycling_orders` / `consult_orders` / `work_photos` / `reviews` / `complaints` / `workers` 等）。单号按当天日期重新编，与旧 id 无关。

### 15.3 `uploads/` 哪些能删、哪些必须留

全部图片都在 `/opt/dayangyunjie-code/apps/server/uploads/`，靠**文件名前缀**区分，不要按扩展名一锅端。

| 文件名 | 来源 | 交付时 |
|--------|------|--------|
| `ICON_*.webp` | `POST /upload/icon`：服务品类 / 回收品项图标 | **留** |
| `POSTER_*.webp` | `POST /upload/poster`：大件价格表长图 | **留** |
| `CLN*.jpg` / `RCY*.jpg` / `CNS*.jpg` | 作业前后照片、带订单号的评价/投诉图 | **可删**（对应订单已删） |
| `IMG_*.jpg` | `/upload/image` 且没带订单号：轮播、员工头像/健康证/技能证、废品下单前物品图 | **不要按前缀全删** |

员工删掉后，其头像/证件会变成无人引用的 `IMG_` 文件，占空间很小。**不要为清这些去 `rm IMG_*`**，会误删轮播图。

**只删 `CLN*` / `RCY*` / `CNS*` 开头的 jpg，对现网配置没有影响。** 品类 icon 是 `ICON_*.webp`，价格海报是 `POSTER_*.webp`，轮播是 `IMG_*.jpg`，都不会被这两条 `rm` 碰到。咨询单几乎没有作业图，`CNS*` 多半本来就没有文件，多写一条无害。

先备份再删文件：

```bash
cd /opt/dayangyunjie-code/apps/server
STAMP=$(date +%Y%m%d-%H%M%S)
tar -czf /opt/bk/uploads.bak-$STAMP.tgz uploads
ls -lh /opt/bk/uploads.bak-$STAMP.tgz

# 只删订单作业图；不动 ICON_ / POSTER_ / IMG_
cd uploads
rm -f CLN*.jpg RCY*.jpg CNS*.jpg
```

删之前可预览将删哪些：

```bash
cd /opt/dayangyunjie-code/apps/server/uploads
ls -1 CLN*.jpg RCY*.jpg CNS*.jpg 2>/dev/null | head
```

若仍不放心，按库里**仍引用的 URL** 核对配置图还在：

```sql
SELECT icon, price_image_url FROM service_catalogs
WHERE icon IS NOT NULL OR price_image_url IS NOT NULL;
SELECT icon FROM recycling_items WHERE icon IS NOT NULL;
SELECT image_url FROM banners;
```

打开对应 URL（`https://api.yunjiezhixiang.cn/uploads/文件名`）应仍是 200。

### 15.4 清完后

```bash
pm2 restart dayangyunjie-api
```

PC 后台：品类图标、时段、轮播仍在；订单列表、员工列表为空。运营/居民微信绑定还在；正式员工需重新建档并绑定服务号。
