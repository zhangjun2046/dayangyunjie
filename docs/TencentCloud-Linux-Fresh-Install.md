# 腾讯云 Linux 新环境首次部署

> **只做一次。** 装完且 API 为 `online` 之后，日常发版改走 [`Remote-Server-Update.md`](./Remote-Server-Update.md)。  
> 既有测试机的操作记录见 [`TencentCloud-Test-Deploy.md`](./TencentCloud-Test-Deploy.md)，不要把那里的「已完成」和旧公网 IP 抄到新机器上。

适用范围：腾讯云 CVM + **TencentOS Server 3.x**（RHEL 8 / `dnf`）。Ubuntu / Debian 包名与 Nginx 路径不同，不能照贴。  
本文是测试环境装机（`http://公网IP`、本机 MySQL、本地磁盘上传、小程序用开发者工具）。不是正式生产。

下文所有 `<公网IP>` 都换成**这台新机器**的公网 IP，不要用 `118.195.149.50`。

---

## 文档怎么配合

| 阶段 | 用哪篇 |
|------|--------|
| 空机器 → 浏览器能打开后台、API `online` | **本文** |
| 本机 `git push` 之后更新代码 / 迁移 / 静态资源 | [`Remote-Server-Update.md`](./Remote-Server-Update.md) |

装机结束时，下面这些必须已经成立，更新文档才能直接用：

- 代码在 `/opt/dayangyunjie-code`，远程跟踪 `origin/master`
- 根目录 `node_modules` 含 `@dcloudio`、`@rollup/rollup-linux-x64-gnu`、`@img/sharp-linux-x64`
- PM2 进程名 **`dayangyunjie-api`** 已在跑（第一次是 `start`，以后才是 `restart`）
- Nginx 已反代 `/`、`/admin/`、`/api/`、`/uploads/`
- 空库已用 `db push` + `db seed` 建好，并且把仓库里已有迁移标成已应用（见第六节）

---

## 一、云资源与 SSH

### 1.1 控制台

| 资源 | 建议 | 注意 |
|------|------|------|
| CVM | TencentOS Server 3.3，2 核 4G，系统盘 50G+ | 记下公网 IP |
| 安全组入站 | `TCP:22`、`TCP:80` | **不要**对公网开放 `3306`、`3000` |
| 域名 / SSL | 测试阶段不需要 | 开发者工具勾选「不校验合法域名」即可 |

安全组端口必须写成 **`TCP:22`** / **`TCP:80`**，只填 `22` 往往保存不了。  
Clash 等代理可能让腾讯云看到的来源 IP 与你本机不一致；SSH 连不上时把该 IP 加进安全组，或临时 `0.0.0.0/0`。

### 1.2 登录

```bash
ssh root@<公网IP>
whoami                  # root
cat /etc/os-release     # 应含 TencentOS Server 3.x，PLATFORM_ID=platform:el8
```

---

## 二、系统软件

```bash
dnf update -y
dnf install -y curl git gcc-c++ make unzip

# Node.js 22（NodeSource，适配 EL8）
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

# MySQL 8：必须先关系统自带 mysql 模块，否则 filtered out by modular filtering
dnf install -y https://dev.mysql.com/get/mysql80-community-release-el8-9.noarch.rpm
dnf module disable mysql -y
dnf install -y mysql-community-server
systemctl enable mysqld
systemctl start mysqld

dnf install -y nginx
systemctl enable nginx
systemctl start nginx

npm install -g pm2
```

验证（小版本号可变，大版本对齐即可）：

```bash
node -v                 # v22.x
npm -v
mysql --version         # 8.0.x
nginx -v
pm2 -v
systemctl status mysqld nginx   # 均应 active (running)
```

TencentOS 上 MySQL 服务名是 **`mysqld`**，不是 `mysql`。

### 2.1 防火墙与 SELinux（按需）

安全组放了 80 仍打不开 HTTP 时：

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --reload
```

Nginx 反代本机 Node 前执行一次（SELinux 可能拦）：

```bash
setsebool -P httpd_can_network_connect 1
```

---

## 三、MySQL：改密、建库、建用户

首次安装的临时 root 密码在日志里：

```bash
grep 'temporary password' /var/log/mysqld.log
```

```bash
mysql -u root -p
```

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '你的Root强密码';
DELETE FROM mysql.user WHERE User='';
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;

CREATE DATABASE dayangyunjie_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dyyj_test'@'localhost' IDENTIFIED BY '你的业务库密码';
GRANT ALL PRIVILEGES ON dayangyunjie_test.* TO 'dyyj_test'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

密码注意：`IDENTIFIED BY` 单引号里不要多余空格；`ALTER USER` 必须以分号结尾，再单独 `FLUSH PRIVILEGES;`。

```bash
mysql -u dyyj_test -p dayangyunjie_test -e "SELECT DATABASE();"
# 应输出 dayangyunjie_test
```

库名 / 用户若改了，第五节 `DATABASE_URL` 一并改。

---

## 四、拉取代码与首次依赖

仓库：[zhangjun2046/dayangyunjie](https://github.com/zhangjun2046/dayangyunjie)（公开，默认分支 `master`）。

### 4.1 clone

```bash
cd /opt
git clone -b master https://github.com/zhangjun2046/dayangyunjie.git dayangyunjie-code
cd dayangyunjie-code
```

大陆 CVM 直连 GitHub 经常超时，**不是命令写错**。任选：

**方案 A（推荐）：本机打 bundle 再 scp**

本机已有仓库时：

```bash
# macOS / Linux
git bundle create /tmp/dayangyunjie.bundle master
scp /tmp/dayangyunjie.bundle root@<公网IP>:/opt/
```

```powershell
# Windows PowerShell（把路径换成你的仓库根）
git bundle create $env:TEMP\dayangyunjie.bundle master
scp $env:TEMP\dayangyunjie.bundle root@<公网IP>:/opt/
```

服务器：

```bash
cd /opt
git clone dayangyunjie.bundle dayangyunjie-code
cd dayangyunjie-code
git remote add origin https://github.com/zhangjun2046/dayangyunjie.git
git fetch origin
git branch -u origin/master master
```

**方案 B：镜像**

```bash
cd /opt
git clone -b master https://gitclone.com/github.com/zhangjun2046/dayangyunjie.git dayangyunjie-code
cd dayangyunjie-code
```

不要用 ZIP 当正式部署：没有 git 历史，后面无法按更新文档 `git pull`。

确认：

```bash
git branch -v          # * master
git log -1 --oneline
ls apps/server apps/admin packages/shared package.json
```

### 4.2 npm 缓存路径

仓库根目录 `.npmrc` 是 Windows 的 `D:\npm-cache`。服务器必须覆盖，**不要把这份 `.npmrc` 提交进 Git**：

```bash
cd /opt/dayangyunjie-code
echo 'cache=/root/.npm' > .npmrc
```

### 4.3 首次装依赖（不要 `npm install` / 无参数 `npm ci`）

三个小程序的 `postinstall` 会跑 `link-uni-local-deps`。Linux 上普通 `npm ci` 会在 `[missing] node_modules/.bin/uni` 失败，留下残树。  
此处命令与 [`Remote-Server-Update.md`](./Remote-Server-Update.md) 第零节「有输出」相同；**刚 clone 过，不要再 `git pull`**。

```bash
cd /opt/dayangyunjie-code

npm ci --ignore-scripts || npm install --ignore-scripts

ls node_modules/@dcloudio/vite-plugin-uni/package.json
ls node_modules/@dcloudio/uni-mp-weixin/package.json

ROLLUP_VER=$(node -p "require('./node_modules/rollup/package.json').version")
echo "rollup=$ROLLUP_VER"
npm install "@rollup/rollup-linux-x64-gnu@${ROLLUP_VER}" --no-save --force
ls node_modules/@rollup/rollup-linux-x64-gnu/package.json

npm install @img/sharp-linux-x64@0.34.5 --no-save
ls node_modules/@img/sharp-linux-x64/package.json

mkdir -p node_modules/.bin
ln -sf ../@dcloudio/vite-plugin-uni/bin/uni.js node_modules/.bin/uni
test -e node_modules/.bin/uni && echo 'uni ok'
node scripts/link-uni-local-deps.mjs miniapp-admin miniapp-customer miniapp-worker
```

`link-uni-local-deps` 应打印 `Done.`。上面任意一步 `ls` 失败就停，不要继续构建。

不要：

- postinstall 失败后再跑无参数 `npm ci`
- 按 rollup 报错删除 `package-lock.json`
- 按 sharp 日志执行 `npm install --include=optional sharp`

`git status` 里 `.npmrc` / `package-lock.json` 变脏是预期的，不要 `git add`。

---

## 五、环境变量

### 5.1 后端 `apps/server/.env`（不要提交 Git）

```bash
cd /opt/dayangyunjie-code/apps/server
openssl rand -hex 32    # 复制为 JWT_ACCESS_SECRET
openssl rand -hex 32    # 再跑一次，复制为 JWT_REFRESH_SECRET
```

把下面整段里的占位符换成真实值后写入（`cat` 从第一行粘到 `EOF`；卡在 `>` 时 `Ctrl+C` 重来）：

```bash
cat > /opt/dayangyunjie-code/apps/server/.env << 'EOF'
DATABASE_URL=mysql://dyyj_test:你的业务库密码@127.0.0.1:3306/dayangyunjie_test

JWT_ACCESS_SECRET=替换为上面生成的随机串
JWT_REFRESH_SECRET=替换为另一条随机串
JWT_ACCESS_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

WECHAT_MOCK_OPENID_PREFIX=mock_openid_

STORAGE_PROVIDER=local

CORS_ORIGIN=http://<公网IP>
SERVER_BASE_URL=http://<公网IP>
EOF
```

| 变量 | 作用 |
|------|------|
| `DATABASE_URL` | 与第三节用户、库名、密码一致。密码含 `@` 等字符须 URL 编码 |
| `CORS_ORIGIN` | 浏览器带 `Origin: http://<公网IP>`；不配则管理后台登录 500 |
| `SERVER_BASE_URL` | 上传图片拼进库的公网前缀；不配会变成 `http://localhost:3000`，其它机器全裂图 |
| `WECHAT_CUSTOMER_APPID` / `SECRET` | **可选。** 不写则居民端走 mock 登录；要真 `code2session` 再追加 |

`cat .env` 只在服务器上看，不要贴到群里或 Issue。

### 5.2 PC 管理后台（可选，建议写上）

生产构建默认 API 为 `/api/v1`（同域反代）。仍建议：

```bash
cat > /opt/dayangyunjie-code/apps/admin/.env.production << 'EOF'
VITE_API_BASE_URL=/api/v1
EOF
```

管理端 H5 同域也走 `/api/v1`，一般不必再配 `VITE_API_BASE`。

---

## 六、首次建表（空库不要 `migrate deploy`）

仓库 `.gitignore` 只白名单了后期增量迁移，**没有初始建表迁移**。空库跑 `migrate deploy` 会对不存在的表做 `ALTER`，会失败。

```bash
cd /opt/dayangyunjie-code/apps/server
npx prisma generate
npx prisma db push
npx prisma db seed
```

`db seed` **只在空库装机时跑这一次**。会写入：

| 类型 | 内容 |
|------|------|
| 管理员 | `admin@dayunyunjie.com` / `admin123`（邮箱是 **yunjie**） |
| 服务目录 | 保洁 / 大件类 / 小件类 / 家政等 |
| 评价关键词、投诉原因、回收品项 | 表为空才插入 |

装完立刻改掉默认管理员密码。以后**不要**再 seed（会把密码写回 `admin123`）。

### 6.1 把已有迁移标成已应用

`db push` 已经把当前 `schema.prisma` 同步进库，但 `_prisma_migrations` 是空的。不标记的话，日后更新文档里的 `migrate deploy` 会把增量 SQL 再跑一遍，报「列/表已存在」。

仓库里没有 `migration_lock.toml`（被 `migrations/*` 忽略）。先补 lock，再 resolve：

```bash
cd /opt/dayangyunjie-code/apps/server

mkdir -p prisma/migrations
cat > prisma/migrations/migration_lock.toml << 'EOF'
# Please do not edit this file manually
provider = "mysql"
EOF

npx prisma migrate resolve --applied 20260820073000_add_review_keywords
npx prisma migrate resolve --applied 20260820130000_add_complaint_reason_configs
npx prisma migrate resolve --applied 20260821160000_refactor_complaint_reason_relation
npx prisma migrate resolve --applied 20260823120000_complaint_reasons_json_snapshot
npx prisma migrate resolve --applied 20260823120100_add_worker_skill_cert_urls
npx prisma migrate resolve --applied 20260827100000_add_worker_employment_status
npx prisma migrate resolve --applied 20260901040000_add_recycling_items
npx prisma migrate resolve --applied 20260901053000_add_recycling_order_snapshot
npx prisma migrate resolve --applied 20260901080000_add_service_catalog_price_image
```

若某条提示找不到目录，先确认 `ls prisma/migrations/` 里是否有对应文件夹（须已在 Git 白名单并 pull 到当前 commit）。  
以后仓库若新增迁移，**不要**对那条再 `resolve`，留给更新文档的 `migrate deploy` 真正执行。

`migration_lock.toml` 在服务器上会出现 untracked，不要 `git add`。

---

## 七、首次构建与拷贝静态资源

不要跑根目录 `npm run build`（会编居民端/员工端 H5，服务器不用，却容易再踩 uni/rollup）。

```bash
cd /opt/dayangyunjie-code

npm run build --workspace=@dayangyunjie/shared
npm run build --workspace=@dayangyunjie/server
npm run build --workspace=@dayangyunjie/admin
npm run build:miniapp-admin
```

必须先 **shared**，再 server / admin。server 若报 Prisma 类型缺字段，回到 `apps/server` 再执行一次 `npx prisma generate`。

确认产物：

```bash
ls -la packages/shared/dist/index.js
ls -la apps/server/dist/main.js
ls -la apps/admin/dist/index.html
ls -la apps/miniapp-admin/dist/build/h5/index.html
```

拷到 Nginx 目录：

```bash
sudo mkdir -p /var/www/dayangyunjie-admin
sudo mkdir -p /var/www/dayangyunjie-miniapp-admin
sudo cp -r /opt/dayangyunjie-code/apps/admin/dist/* /var/www/dayangyunjie-admin/
sudo cp -r /opt/dayangyunjie-code/apps/miniapp-admin/dist/build/h5/* /var/www/dayangyunjie-miniapp-admin/
ls /var/www/dayangyunjie-admin/index.html
ls /var/www/dayangyunjie-miniapp-admin/index.html
```

admin 构建缺 `@rollup/rollup-linux-x64-gnu`：回到第四节补 rollup（必须 `--force` 并以 `ls` 为准），不要删 lock。也可在本机构建后 `scp` 到 `/var/www/`（见更新文档 FAQ）。

---

## 八、PM2 启动 API（第一次用 start）

工作目录必须是 `apps/server`（`uploads/` 相对 `process.cwd()`）：

```bash
cd /opt/dayangyunjie-code/apps/server
pm2 start dist/main.js --name dayangyunjie-api
pm2 save
pm2 startup
# 把上一条打印出的 systemd 命令原样再执行一遍
```

```bash
pm2 status
curl -I http://127.0.0.1:3000/api/docs
```

`dayangyunjie-api` 应为 **online**，本机 docs 为 HTTP 200。

若为 `errored` 且 ↺ 次数在涨，看日志，不要反复 `restart`：

```bash
pm2 logs dayangyunjie-api --lines 40 --nostream
tail -n 80 ~/.pm2/logs/dayangyunjie-api-error.log
```

`Could not load the "sharp" module`：回到第四节装 `@img/sharp-linux-x64@0.34.5`，`ls` 确认后 `pm2 restart dayangyunjie-api`。不要用日志里的 `--include=optional sharp`。

---

## 九、Nginx

TencentOS 用 `/etc/nginx/conf.d/`（不是 Ubuntu 的 `sites-available`）。把 `<公网IP>` 换成新 IP 后整段粘贴：

```bash
cat > /etc/nginx/conf.d/dayangyunjie.conf << 'EOF'
server {
    listen 80;
    server_name <公网IP>;

    root /var/www/dayangyunjie-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

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

heredoc 里的 `server_name` 不会替换。若写成了字面量 `<公网IP>`，用下面改一处即可：

```bash
sed -i 's/<公网IP>/你的真实IP/' /etc/nginx/conf.d/dayangyunjie.conf
```

```bash
mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true
setsebool -P httpd_can_network_connect 1
nginx -t
systemctl reload nginx
```

验收时用**公网 IP**，不要用 `127.0.0.1`（`server_name` 对不上会落到默认欢迎页）：

```bash
curl -I http://<公网IP>/
curl -I http://<公网IP>/admin/
curl -I http://<公网IP>/api/docs
```

浏览器：

- PC 管理后台：`http://<公网IP>/` — `admin@dayunyunjie.com` / `admin123`（登录后改密）
- 管理端 H5：`http://<公网IP>/admin/`
- Swagger：`http://<公网IP>/api/docs`

用 `http://公网IP` 打开后台时，控制台可能出现 `Cannot read properties of undefined (reading 'digest')`。这是非安全上下文没有 `crypto.subtle`，**不代表部署失败**。需要该能力时用 HTTPS 或本机 `localhost`。

大件价格海报：seed 只有「大件类」目录，图是空的。到 **服务配置 → 编辑大件类** 上传（所属业务=废品回收且名称含「大件」）。

---

## 十、装机验收清单

全部勾上之后，才改用更新文档。

| # | 检查 | 预期 |
|---|------|------|
| 1 | `git -C /opt/dayangyunjie-code log -1 --oneline` | 与本机 `origin/master` 同一 commit |
| 2 | `ls node_modules/@dcloudio/vite-plugin-uni/package.json` | 存在 |
| 3 | `ls node_modules/@rollup/rollup-linux-x64-gnu/package.json` | 存在 |
| 4 | `ls node_modules/@img/sharp-linux-x64/package.json` | 存在 |
| 5 | `pm2 status` | `dayangyunjie-api` **online** |
| 6 | `curl -I http://127.0.0.1:3000/api/docs` | 200 |
| 7 | `curl -I http://<公网IP>/` 与 `/admin/` | 200，不是 Nginx 默认页 |
| 8 | 浏览器登录 PC 后台 | 能进订单 / 配置 |
| 9 | 第六节 `migrate resolve` 已全部执行 | 之后 `migrate deploy` 不再重放旧 SQL |

登录接口抽查：

```bash
curl -X POST http://<公网IP>/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -H "Origin: http://<公网IP>" \
  -d '{"email":"admin@dayunyunjie.com","password":"admin123"}'
```

应返回 `"code":0` 和 `accessToken`。

---

## 十一、本机小程序对接（不在服务器上构建）

居民端 / 员工端**不部署到这台 Linux**。本机改 API 地址后用微信开发者工具打开编译产物。

`apps/miniapp-customer/.env.production` 与 `apps/miniapp-worker/.env.production`：

```env
VITE_API_BASE=http://<公网IP>/api/v1
```

本机仓库根目录：

```bash
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-customer
npm run build:mp-weixin --workspace=@dayangyunjie/miniapp-worker
```

开发者工具分别导入：

- `apps/miniapp-customer/dist/build/mp-weixin`
- `apps/miniapp-worker/dist/build/mp-weixin`

不要打开源码根目录。详情 → 本地设置：勾选 **不校验合法域名、web-view、TLS 以及 HTTPS 证书**。  
`dist/dev/mp-weixin` 读的是 `.env.development`（本机后端），不会连云端。

建议冒烟：后台登录 → 居民端下单 → 派单 → 员工端接单 / 拍照 → `ls /opt/dayangyunjie-code/apps/server/uploads/` 有文件。

真机预览通常要求 HTTPS 合法域名，不在本文范围。

---

## 十二、装完之后

1. 本机改代码 → `git push origin master`。
2. SSH 上服务器，**整篇只跟** [`Remote-Server-Update.md`](./Remote-Server-Update.md)：`git restore` → `git pull` → 看 lockfile → 共同构建（此时才是 `migrate deploy` + `pm2 restart`）。
3. 不要再跑本文的 `db push` / `db seed` / `pm2 start`（进程已存在时 `start` 会重名失败）。
4. 不要把服务器 `.npmrc`、`.env`、`migration_lock.toml` 提交进仓库。

---

## 十三、明确不要做的事

- 不要对公网开放 MySQL `3306` 或 Node `3000`。
- 不要 `npm install` 或无参数 `npm ci` 作为首次装依赖。
- 不要根目录 `npm run build`。
- 不要在空库上 `npx prisma migrate deploy` 当首次建表。
- 不要在已有运营数据后例行 `prisma db seed`。
- 不要把旧测试机 IP、本文 heredoc 里未替换的 `<公网IP>` 留在 Nginx / `.env` / 小程序里。
- 不要用 ZIP 当唯一代码来源（后续无法 `git pull`）。
