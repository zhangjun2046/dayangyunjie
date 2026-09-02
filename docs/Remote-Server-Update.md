# 远程 Linux 服务器代码更新

> 目录：`/opt/dayangyunjie-code` · **新机器首次部署**见 [`TencentCloud-Linux-Fresh-Install.md`](./TencentCloud-Linux-Fresh-Install.md)（须 API 已 `online` 后再用本文）

本机 `git push` 后，SSH 登录服务器。

| 场景 | 怎么走 |
|------|--------|
| `diff` **没输出**，且 `node_modules` 完好 | 第零节 pull 后直接 **「共同构建」** |
| `diff` **有输出**，或 `node_modules` 已坏 | 第零节 **「有输出」** 补依赖，再 **「共同构建」** |

**pull 前**：working tree 须 clean。若 `git status` 只有 `.npmrc` / `package-lock.json` 脏（Linux 写过缓存路径）：

```bash
git restore .npmrc package-lock.json
```

**不要**把服务器上的 `.npmrc` 提交进仓库。写完 `echo 'cache=/root/.npm' > .npmrc` 后工作区再次变脏是预期的。

---

## 零、日常增量（node_modules 完好时）

适用于：API 曾经 `online`，根目录已有 `node_modules/@dcloudio`、`@rollup/rollup-linux-x64-gnu`、`@img/sharp-linux-x64`。  
不必事先知道依赖有没有变：**先 pull，再看本次有没有改 lockfile**。

```bash
cd /opt/dayangyunjie-code
git restore .npmrc package-lock.json
echo 'cache=/root/.npm' > .npmrc
git status      # 没有未提交改动时再 pull
git pull origin master

# 必须紧接着查（ORIG_HEAD 指向刚 pull 之前的提交）
git diff ORIG_HEAD --name-only -- package.json package-lock.json
```

- **没输出**：依赖没变。若 `node_modules` 完好，**不要**跑 `npm ci`，直接执行 **「共同构建」**。若依赖树已坏（缺 `@dcloudio` / rollup / sharp、上次 `npm ci` 失败），即使没输出也先跑下面「有输出」那段补依赖，再共同构建。
- **有输出**（改了 `package.json` 或 `package-lock.json`）：代码已经 pull 过，不要再 `git pull`。先补依赖，再执行 **「共同构建」**：

```bash
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

`link-uni-local-deps` 应打印 `Done.`。然后同样执行 **「共同构建」**。

`git pull` 的文件列表里若出现这两个文件，结论相同，不必再跑 `diff`。

**共同构建**（两条分支最后都跑这一段）：

```bash
cd apps/server && npx prisma generate && npx prisma migrate deploy && cd ../..

npm run build --workspace=@dayangyunjie/shared
npm run build --workspace=@dayangyunjie/server
npm run build --workspace=@dayangyunjie/admin

pm2 restart dayangyunjie-api
sudo cp -r apps/admin/dist/* /var/www/dayangyunjie-admin/

# 若改了管理端 H5
npm run build:miniapp-admin
sudo cp -r apps/miniapp-admin/dist/build/h5/* /var/www/dayangyunjie-miniapp-admin/
```

构建顺序必须先 **shared**，再 server / admin。`prisma generate` 与 `migrate deploy` **每次都可以跑**：没改 schema 不会报错，只是多花几秒。  
**不要**顺手跑 `prisma db seed`（会把默认管理员密码写回 `admin123`）。

---

## 一、构建成功怎么确认

```bash
ll -la packages/shared/dist/index.js
ll -la apps/server/dist/main.js
ll -la apps/admin/dist/index.html
ll -la apps/miniapp-admin/dist/build/h5/index.html   # 仅 H5 更新时
```

文件修改时间为本次 build 时间，且命令无报错，即构建成功。

---

## 二、上线验收

```bash
pm2 status                                    # dayangyunjie-api 为 online
curl -I http://127.0.0.1:3000/api/docs        # HTTP 200
curl -I http://118.195.149.50/                # PC 管理后台
curl -I http://118.195.149.50/admin/          # 管理端 H5（若已部署）
```

浏览器 **强刷**（Ctrl+F5 / Cmd+Shift+R）。

`pm2 status` 为 `errored`（↺ 次数在涨）时看日志，不要反复无意义 `restart`：

```bash
pm2 logs dayangyunjie-api --lines 40 --nostream
tail -n 80 ~/.pm2/logs/dayangyunjie-api-error.log
```

---

## 三、部署目录对照

| 组件 | 构建产物 | 拷贝目标 | 访问 |
|------|----------|----------|------|
| API | `apps/server/dist/` | PM2 直接运行，无需拷贝 | `/api/` |
| PC 管理后台 | `apps/admin/dist/` | `/var/www/dayangyunjie-admin/` | `http://IP/` |
| 管理端 H5 | `apps/miniapp-admin/dist/build/h5/` | `/var/www/dayangyunjie-miniapp-admin/` | `http://IP/admin/` |
| 居民端/员工端小程序 | 本机 `build:mp-weixin` | 微信开发者工具上传 | 不在服务器更新 |

---

## 四、验证 commit 一致

**本机：**

```bash
git fetch origin
git log -1 --oneline HEAD
git log -1 --oneline origin/master
```

两行 commit ID 相同 → 本机已与 Git 远程一致。

**服务器（pull 后）：** `git log -1 --oneline`，ID 与本机相同 → 服务器代码一致。

---

## 五、常见问题

| 情况 | 处理 |
|------|------|
| `git status` 有 `.npmrc` / `package-lock.json` 脏，pull 被拒 | `git restore .npmrc package-lock.json`，不要 commit |
| 日志出现 `D:\npm-cache` | `echo 'cache=/root/.npm' > .npmrc`；只有缓存路径错乱时才 `rm -rf node_modules apps/*/node_modules` 后按第零节「有输出」重装 |
| postinstall `[missing] node_modules/.bin/uni` | **不要重跑 `npm ci`**。按第零节「有输出」：`--ignore-scripts` → `ls` 确认 `@dcloudio` → 补 rollup/sharp（`--force` + `ls`）→ 建 `.bin/uni` → `link-uni-local-deps`，再「共同构建」 |
| 失败后立刻跑 `node scripts/link-uni-local-deps.mjs`，报 `[missing] root node_modules/@dcloudio/...` | postinstall 失败后的残树，包没装上。只补软链无效，按第零节「有输出」`--ignore-scripts` 重装 |
| `npm ci` 已失败，还想「再装一次」 | 用 `npm ci --ignore-scripts`，不要用无参数 `npm ci`（会再次清掉 node_modules 并在 postinstall 失败） |
| server build：`Property 'worker' does not exist on type 'PrismaService'` | `cd apps/server && npx prisma generate`（`--ignore-scripts` 后必做） |
| `vue-tsc` 已过，vite 报 `Cannot find module @rollup/rollup-linux-x64-gnu` | **不要**按报错去删 `package-lock.json` / `node_modules`。根目录执行第零节「有输出」里的 rollup 安装并用 `ls` 确认。或本机构建后拷上去：<br>`npm run build --workspace=@dayangyunjie/admin` 然后 `scp -r apps/admin/dist/* root@<公网IP>:/var/www/dayangyunjie-admin/`<br>H5：`npm run build:miniapp-admin` 然后 `scp -r apps/miniapp-admin/dist/build/h5/* root@<公网IP>:/var/www/dayangyunjie-miniapp-admin/` |
| rollup 安装命令跑过但 build 仍缺模块 | `--no-save` 可能没落到 `@rollup/`。必须 `--force` 并以 `ls` 为准 |
| PM2 `errored`：`Could not load the "sharp" module` | **不要**用日志里的 `npm install --include=optional sharp`。`npm install @img/sharp-linux-x64@0.34.5 --no-save`，`ls` 确认后 `pm2 restart dayangyunjie-api` |
| `npm install --include=optional sharp --workspace=...` 报 npm null | 改用上一行（不要 `--workspace`） |
| admin `vue-tsc`：`priceImageUrl` `null` 不能赋给 `string \| undefined` | 已在 `5261ac9` 修复。再遇到则 `git pull` 到该提交之后 |
| 控制台 `TypeError: Cannot read properties of undefined (reading 'digest')` | 用 `http://公网IP` 打开不是安全上下文，`crypto.subtle` 不可用。与海报字段无关；`http://localhost` 或 HTTPS 才有 `subtle` |
| 服务配置有「大件类」但没有价格海报图 | 迁移只加空列。须 **服务配置 → 编辑大件类** 上传海报（所属业务=废品回收且名称含「大件」） |
| pull 后页面仍像旧版 | 同一 Git 远程；admin / H5 是否已 `cp` 到 `/var/www/`；浏览器强刷 |
| 居民端重量步进 / 价格表整图仍是旧版 | 小程序不在服务器更新，本机 `build:mp-weixin` 后用微信开发者工具上传 |
| 想初始化回收品项跑了 `prisma db seed` | 品项表为空才会插入，但会把默认管理员密码写回 `admin123`。线上已改过密码就不要 seed，改在「回收品项」页手工加 |

---

## 六、明确不要做的事

- 不要在 postinstall 失败后重跑 `npm ci`（无 `--ignore-scripts`）。
- 不要按 rollup 报错删除 `package-lock.json` 和整个 `node_modules`。
- 不要按 sharp 日志执行 `npm install --include=optional sharp`。
- 不要在已有运营数据的库上例行 `prisma db seed`。
- 不要把服务器生成的 `.npmrc`（`cache=/root/.npm`）提交进仓库。
