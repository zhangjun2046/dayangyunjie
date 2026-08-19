# Mac 本机 MySQL 初始化指南

本文档用于同事从 GitHub 下载本项目后，在 Apple Mac 电脑上初始化本机 MySQL，并启动本项目的后端服务。

> 适用场景：本机开发、联调小程序 H5、联调管理后台。
> 当前仓库未提交 `apps/server/prisma/migrations/`，因此本机初始化使用 `prisma db push` 按 `schema.prisma` 同步表结构。

## 一、前置条件

请先确认 Mac 已安装：

- Node.js 22+
- npm
- Git
- Homebrew
- MySQL 8

验证命令：

```bash
node -v
npm -v
git --version
brew -v
```

## 二、安装并启动 MySQL 8

### 2.1 安装 MySQL

优先安装 MySQL 8：

```bash
brew install mysql@8.0
```

如果 Homebrew 提示 `mysql@8.0` 不可用，可改用 Oracle 官方 MySQL 8 安装包，或使用 Docker 运行 MySQL 8。

### 2.2 配置 mysql 命令路径

Apple Silicon Mac（M1/M2/M3）：

```bash
echo 'export PATH="/opt/homebrew/opt/mysql@8.0/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Intel Mac：

```bash
echo 'export PATH="/usr/local/opt/mysql@8.0/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

验证：

```bash
mysql --version
```

### 2.3 启动 MySQL

```bash
brew services start mysql@8.0
```

查看服务状态：

```bash
brew services list | grep mysql
```

如需停止：

```bash
brew services stop mysql@8.0
```

## 三、初始化 MySQL root 密码

首次安装后，Homebrew 版本 MySQL 通常可以直接以 root 登录：

```bash
mysql -u root
```

进入 MySQL 后设置 root 密码：

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '你的Root强密码';
FLUSH PRIVILEGES;
```

以后使用 root 登录：

```bash
mysql -u root -p
```

可选安全初始化：

```bash
mysql_secure_installation
```

## 四、创建项目开发库和账号

本项目后端使用 Prisma + MySQL，数据库连接来自 `apps/server/.env` 中的 `DATABASE_URL`。

建议本机开发统一使用：

| 项目 | 值 |
| --- | --- |
| 数据库 | `dev_db` |
| 用户名 | `dev` |
| 主机 | `localhost`、`127.0.0.1` |
| 字符集 | `utf8mb4` |
| 排序规则 | `utf8mb4_unicode_ci` |

### 4.1 执行初始化 SQL

先登录 MySQL：

```bash
mysql -u root -p
```

执行以下 SQL。请把 `你的Dev密码` 替换成实际密码。

```sql
CREATE DATABASE IF NOT EXISTS dev_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'dev'@'localhost' IDENTIFIED BY '你的Dev密码';
CREATE USER IF NOT EXISTS 'dev'@'127.0.0.1' IDENTIFIED BY '你的Dev密码';

ALTER USER 'dev'@'localhost' IDENTIFIED BY '你的Dev密码';
ALTER USER 'dev'@'127.0.0.1' IDENTIFIED BY '你的Dev密码';

GRANT ALL PRIVILEGES ON dev_db.* TO 'dev'@'localhost';
GRANT ALL PRIVILEGES ON dev_db.* TO 'dev'@'127.0.0.1';

FLUSH PRIVILEGES;
```

验证业务账号：

```bash
mysql -u dev -p -h 127.0.0.1 dev_db -e "SELECT DATABASE();"
```

预期输出包含：

```text
dev_db
```

## 五、配置后端环境变量

进入项目根目录：

```bash
cd ~/your-workspace/dayangyunjie-code
```

创建或编辑后端环境变量文件：

```bash
vi apps/server/.env
```

最小配置示例：

```env
DATABASE_URL=mysql://dev:你的Dev密码@localhost:3306/dev_db
STORAGE_PROVIDER=local

WECHAT_CUSTOMER_APPID=
WECHAT_CUSTOMER_SECRET=
```

如果密码包含特殊字符，需要进行 URL 编码。例如：

| 原字符 | URL 编码 |
| --- | --- |
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `:` | `%3A` |
| `/` | `%2F` |

示例：密码是 `Dev@2026#Jun`，则连接串应写为：

```env
DATABASE_URL=mysql://dev:Dev%402026%23Jun@localhost:3306/dev_db
```

## 六、安装依赖

在项目根目录执行：

```bash
npm install
```

不要在 `apps/server` 单独执行 `npm install`，本项目是 npm workspaces monorepo。

## 七、初始化 Prisma 数据库

进入后端目录：

```bash
cd apps/server
```

生成 Prisma Client：

```bash
npx prisma generate
```

按当前 `schema.prisma` 同步 MySQL 表结构：

```bash
npx prisma db push
```

写入开发种子数据：

```bash
npx prisma db seed
```

seed 默认写入：

| 类型 | 内容 |
| --- | --- |
| 管理员 | `admin@dayunyunjie.com` / `admin123`，超级管理员 |
| 服务目录 | 保洁、废品回收、家政咨询基础服务目录 |
| 运营人员 | `运营客服` / `13800138000` / `接单` |

## 八、启动项目

回到项目根目录：

```bash
cd ../..
```

启动后端：

```bash
npm run dev
```

常用前端启动命令：

```bash
npm run dev:admin
npm run dev:miniapp-customer
npm run dev:miniapp-worker
```

## 九、验证初始化结果

### 9.1 检查数据库表

```bash
cd apps/server
npx prisma studio
```

浏览器打开 Prisma Studio 后，确认可以看到业务表和 seed 数据。

### 9.2 检查后端启动

```bash
npm run dev
```

后端正常启动后，默认监听本机 `3000` 端口。

### 9.3 检查管理后台登录

启动管理后台后，使用 seed 默认管理员登录：

```text
账号：admin@dayunyunjie.com
密码：admin123
```

## 十、常见问题

### 10.1 mysql 命令找不到

确认已配置 MySQL bin 路径：

```bash
echo $PATH
mysql --version
```

Apple Silicon Mac 通常是：

```bash
/opt/homebrew/opt/mysql@8.0/bin
```

Intel Mac 通常是：

```bash
/usr/local/opt/mysql@8.0/bin
```

### 10.2 Access denied for user

常见原因：

- `apps/server/.env` 中密码和 MySQL 用户密码不一致。
- 密码包含 `@`、`#` 等特殊字符但没有 URL 编码。
- 只创建了 `'dev'@'localhost'`，但客户端实际使用 `'dev'@'127.0.0.1'` 连接。

可重新执行第 4 节 SQL 修正用户和授权。

### 10.3 seed 报 The table admins does not exist

原因是还没有建表。请先执行：

```bash
cd apps/server
npx prisma db push
npx prisma db seed
```

### 10.4 migrate deploy 显示 No migration found

这是当前仓库的正常现象。因为 `apps/server/prisma/migrations/` 未提交到 Git，clone 后没有迁移文件。

本机开发初始化请使用：

```bash
npx prisma db push
```

不要依赖：

```bash
npx prisma migrate deploy
```

### 10.5 3306 端口冲突

查看端口占用：

```bash
lsof -i :3306
```

如果已有其他 MySQL 实例，请停止旧实例，或调整当前 MySQL 端口并同步修改 `DATABASE_URL`。

## 十一、完整初始化命令速查

以下命令适合已安装 Homebrew、Node.js 22+、Git 的新 Mac。

```bash
# 1. 安装并启动 MySQL 8
brew install mysql@8.0
brew services start mysql@8.0

# 2. 按芯片类型配置 PATH（二选一）
echo 'export PATH="/opt/homebrew/opt/mysql@8.0/bin:$PATH"' >> ~/.zshrc
# echo 'export PATH="/usr/local/opt/mysql@8.0/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 3. 进入项目根目录
cd ~/your-workspace/dayangyunjie-code

# 4. 安装依赖
npm install

# 5. 创建 apps/server/.env 后，初始化 Prisma
cd apps/server
npx prisma generate
npx prisma db push
npx prisma db seed

# 6. 启动后端
cd ../..
npm run dev
```

MySQL 建库 SQL：

```sql
CREATE DATABASE IF NOT EXISTS dev_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'dev'@'localhost' IDENTIFIED BY '你的Dev密码';
CREATE USER IF NOT EXISTS 'dev'@'127.0.0.1' IDENTIFIED BY '你的Dev密码';

ALTER USER 'dev'@'localhost' IDENTIFIED BY '你的Dev密码';
ALTER USER 'dev'@'127.0.0.1' IDENTIFIED BY '你的Dev密码';

GRANT ALL PRIVILEGES ON dev_db.* TO 'dev'@'localhost';
GRANT ALL PRIVILEGES ON dev_db.* TO 'dev'@'127.0.0.1';

FLUSH PRIVILEGES;
```
