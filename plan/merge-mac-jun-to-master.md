# 分支合并方案：`dev/mac-zhangshuo` ← 同事 + 测通 → `master`

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-23（修订：补 migration 策略、lock 重建、shared 构建、bug 回流规矩、发布占位）  
> 性质：**操作与产品确认文档**（按本文执行时再改代码；**本文不自动合并，先不实现**）  
> 目标仓库：https://github.com/zhangjun2046/dayangyunjie  
> 我的分支：`dev/mac-zhangshuo`  
> 同事分支：`dev/windows-zhangjun`  
> 发布分支：`master`（勿误用早期的 `main`）

---

## 给执行本文件的 AI（硬规则）

1. **未明确说「可以工作 / 开始合并」前，禁止 merge / push / 改业务代码。**
2. 合并目标顺序固定：**先合进 `dev/mac-zhangshuo` → 代码确认无误 → 另目录用本机库测试 → 通过后再合 `master`。**
3. 投诉原因按 **方案 3**：动态配置（同事）+ 多选（我方）；**不考虑历史投诉数据迁移兼容。**
4. 遇到 [§2.5](#25-必须暂停并询问的情形) 所列「无法自行判断」的情形：**保持现状 + 记录到 [§7 决策日志](#7-决策日志合并时追加)，集中一次性询问，禁止擅自选边。**
5. 动手前先处理本仓库脏工作区（`stash -u` 或等价），**禁止**把本机 `manifest` appid、`.env.development`、未提交 `uni_modules` 等混进合并提交。
6. 测试方式固定为 **方式 A**：合并并 push 我的分支后，**另 clone 到其他本地目录**再测；测试库用**本机 MySQL**，在该库上执行升级即可。
7. **升级 SQL 在测试完成后统一出一版**，落盘到 [`plan/sql/`](./sql/)，见 [§5](#5-升级-sql测试完成后统一产出)。
8. Prisma migration：**只追加新 migration，禁止修改同事已提交的 3 个 migration 文件**（会导致他本地库 checksum 报错），见 [§4.2](#42-migration-策略追加不改旧的)。
9. 任何目录下提交前都要 `git status` 逐项核对：**禁止**把本机 appid、`.env.development`、`.npmrc` 等调试配置提交上去。
10. **单步执行、逐步确认**：一次只做一个检查点，做完汇报并停下等我确认，不得连做，见 [§0 执行节奏](#0-执行节奏必须遵守)。

---

## 0. 执行节奏（必须遵守）

### 0.1 基本规则

- **一次只推进一个检查点**（见 §0.2 的清单），完成后**立即停下汇报**，等我明确说「继续 / 下一步」才做下一个。
- **禁止连做**：即使某一步很快、看起来顺理成章，也不要顺手把下一步做了。
- **遇到意外立刻停**：只要出现 §0.4 所列情况，停在当前位置汇报，**不要自行绕过、不要试错式反复重跑**。
- 停下时保持仓库处于**可解释的状态**：要么干净，要么明确说明「现在处于 merge 冲突未解决中」这类中间态。

### 0.2 检查点划分（每个是一次「停下汇报」的单位）

| # | 检查点 | 对应章节 |
|---|--------|----------|
| CP0 | `git fetch` + 核对三分支 SHA 与 §1 快照、复算冲突清单 | §1 |
| CP1 | stash、备份分支、执行 `git merge`（**只到冲突暴露为止，先不解**） | 步骤 ① |
| CP2 | 解决**投诉链路 13 个文件**冲突（方案 3 改造） | §2.1、§2.4 |
| CP3 | 解决**其余 8 个文件**冲突（功能叠加） | §2.2–§2.4 |
| CP4 | 重建 `package-lock.json` → `git commit` 完成合并 | 步骤 ① |
| CP5 | 手写新增 migration + `prisma generate` | 步骤 ②.3–4、§4.2 |
| CP6 | 门禁校验：无冲突残留 / build 通过 / diff 复核 | 步骤 ②.1–7 |
| CP7 | `git status` 核对后 push `dev/mac-zhangshuo` | 步骤 ②.8 |
| CP8 | 另目录 clone + §3.1 复制改配置 + skip-worktree | 步骤 ③、§3.1 |
| CP9 | 测试目录环境准备（install → build shared → generate） | §3.2 |
| CP10 | 本机库按 §4.3 恢复并跑完 migration 链 | §4.3 |
| CP11 | 起服务，逐项跑 §3.3 回归清单 | §3.3 |
| CP12 | 产出统一升级 SQL 并提交 push | §5 |
| CP13 | 合并 push `master` | 步骤 ④ |

> 小程序端的启动与验证由我手动进行，AI 在 CP11 只负责后端/管理端部分并等待我的测试反馈。

### 0.3 每步汇报格式

每个检查点完成后按这个结构输出，不要只说「done」：

```
【CP<N> 完成】<检查点名称>
1. 做了什么：具体改了哪些文件 / 执行了哪些命令
2. 结果：命令输出要点、是否符合预期
3. 当前状态：分支、是否有未提交改动、是否处于中间态
4. 下一步将做：CP<N+1> 的内容（等确认，先不做）
5. 需要我确认/手动做的事：若无则写「无」
```

涉及冲突解决的检查点（CP2、CP3），额外逐文件说明：**取了哪边、为什么、有没有丢功能**，并同步追加到 [§7 决策日志](#7-决策日志合并时追加)。

### 0.4 必须暂停讨论的意外情况

出现以下任一情况，**停下汇报，不要自行处置**：

1. 远程 SHA 与 §1 快照对不上，或冲突文件数不是 21 个 —— 说明有人又推了代码；
2. 冲突内容超出 §2 已约定范围，或命中 [§2.5](#25-必须暂停并询问的情形) 的六类情形；
3. 命令报错且**原因不明确**，或同一个错误重试一次仍未解决；
4. `npm install` / `build` 失败，尤其是依赖树、lock 相关；
5. Prisma 报 drift、要求 `reset` 数据库，或 `migrate deploy` 中途失败；
6. 需要**删除数据**或执行不可逆 SQL，且超出 §4.3 已写明的范围；
7. 需要改动本文档未提及的文件（尤其是配置、密钥、部署相关）；
8. 实际情况与本文描述不符（路径不存在、脚本名对不上、字段名不一致等）。

第 8 类尤其重要：**以实际仓库状态为准，不要为了让文档"看起来对"而强行照做**，先报给我。

---

## 1. 分支基线（讨论时核对；执行前再 `git fetch`）

| 分支 | 说明 |
|------|------|
| `origin/master` | 共同祖先；两人分支均从此分出 |
| `origin/dev/mac-zhangshuo` | 我方（远程图、Banner、手机号、改派进度、completedToday、登录白屏、灰显 toast、体验细节、投诉多选 JSON 等） |
| `origin/dev/windows-zhangjun` | 同事（证书多图、技能筛选、评价关键词、服务图标、投诉原因动态配置、预约跳详情、开始服务 200m 提示等） |

**2026-08-23 10:13 核对到的远程快照**（正式执行前用下面命令比对，若 SHA 变了说明有人又推了新提交，需重新评估冲突）：

| 分支 | SHA | 相对 `master` 的提交数 |
|------|-----|------|
| `origin/master` | `54981a8` | — |
| `origin/dev/mac-zhangshuo` | ~~`52ea8de`~~ → **`188ece4`** | ~~8~~ → **9** |
| `origin/dev/windows-zhangjun` | `f8bc66e` | 9 |

> **2026-08-23 CP0 执行后更新**：合并前先补提交了一笔 `fix: 员工端空状态图与请求超时`（`188ece4`），
> 分支 tip 由 `52ea8de` 变为 `188ece4`。重新复算后**冲突文件仍是同样的 21 个**，§2.4 清单无需改动。

- 两分支 **merge-base = `54981a8`**，与 `master` tip 相同 → 分叉后无人再推 `master`，「不考虑他人改 master」的前提成立。
- 当时预测冲突文件 **21 个**（见 §2.4 末尾）。

执行前务必：

```bash
git fetch origin
git rev-parse --short origin/master origin/dev/mac-zhangshuo origin/dev/windows-zhangjun
git log --oneline origin/master..origin/dev/windows-zhangjun
git log --oneline origin/master..origin/dev/mac-zhangshuo
git merge-tree --write-tree --name-only origin/dev/mac-zhangshuo origin/dev/windows-zhangjun | grep '^CONFLICT'
```

---

## 2. 已确认项（产品 / 冲突处理）

### 2.1 投诉原因（原问题 A）— 方案 3

| 项 | 结论 |
|----|------|
| 选项来源 | 管理端可增删的动态配置（保留同事 `ComplaintReasonConfig` 表与 CRUD） |
| 用户操作 | **多选**；**不设选择数量上限**；至少选 1 项 |
| 「其他」原因 | **本次不做**（不需要「其他 + 补充说明」特殊分支） |
| 落库 | 提交时做**文案快照**；配置后续被改名/删除不影响已提交投诉 |
| 历史数据 | **不必考虑**（测试库可直接升级/重建投诉相关结构） |
| 删除配置后的列表筛选 | **本次不考虑**（仅保证详情/列表能把快照文案展示出来） |
| 升级 SQL | 测试完成后统一产出，见 [§5](#5-升级-sql测试完成后统一产出) |

**快照字段建议（执行时按此实现，除非另行推翻）**

`complaints` 用**单个 JSON 字段** `reasons` 存对象数组：

```json
[
  { "configId": 3, "label": "服务态度差" },
  { "configId": 7, "label": "未按时上门" }
]
```

选它的理由：

- 一次读出即可渲染，**详情页直接用 `label`**，不必 join 配置表，满足「能保存、详情能展示」的诉求；
- 同时留下 `configId`，将来若要做统计/筛选不必再改表结构（本次不实现）；
- 单字段避免「ID 数组 + 文案数组」两列顺序错位的隐患；
- 与项目既有 JSON 数组约定（`reviews.tags`、我方原 `complaints.reasons`）一致。

配套结构调整：

- **保留**同事的 `ComplaintReasonConfig` 表与管理端配置页；
- **去掉**同事的 `complaints.reason_config_id`、`complaints.reason_label` 单值列及其外键关系（改为 JSON 快照后无需外键，配置删除天然不影响历史）；
- 居民端提交传多选（配置 ID 数组），服务端查配置补 `label` 后落快照；
- 管理端 / 居民端详情、列表按数组渲染多个原因。

与旧计划 [`complaint-reasons-multi-select.md`](./complaint-reasons-multi-select.md) 的关系：旧文是「写死枚举多选」；**本次以本文方案 3 为准**（动态配置 + 多选），旧手工 SQL 仅作参考。

### 2.2 员工端任务详情（原问题 B）

| 项 | 结论 |
|----|------|
| 我方灰显上传 toast | **保留**（未开始服务时点灰上传区，提示先接单/开始服务） |
| 同事开始服务流程 | **保留**：先弹「建议 200 米内」再 `getLocation` / 签到 |
| 模拟签到 | **去掉**（与同事一致） |

说明：两者改的是不同交互，合并后并存。

### 2.3 预约成功跳转（原问题 C）

**默认完整保留同事逻辑**：预约成功后进入对应订单详情（含先 `switchTab` 再进详情的导航工具）。

### 2.4 其他冲突（执行时默认策略）

| 区域 | 策略 |
|------|------|
| `upload.controller` | git 可自动合并（实测不冲突）；确认我方 `GET file/:filename` + 同事 `POST icon` 都在即可 |
| 派单 / 技能筛选 / 改派进度 | 功能叠加（改派 + `eventKey` + 技能过滤等） |
| 评价关键词 / 服务图标 / 证书多图 | 保留同事能力；与我方评价页文案、样式叠加 |
| 员工端首页 / 任务列表 | 我方空状态图 + 同事二级服务 icon 逻辑，两者叠加 |
| 纯样式同属性抢值 | 见 §2.5，先记录再问，不擅自定 |

**2026-08-23 预测的 21 个冲突文件**（执行时若数量/清单对不上，说明远程有变动，先停下核对）：

投诉链路（按 §2.1 方案 3 改造，占大头）

```
apps/server/prisma/schema.prisma
apps/server/src/modules/complaint/complaint.service.ts
apps/server/src/modules/complaint/complaint.spec.ts
apps/server/src/modules/complaint/dto/create-complaint.dto.ts
packages/shared/src/dto/complaint.dto.ts
packages/shared/src/entities/complaint.ts
packages/shared/src/labels/index.ts
apps/admin/src/api/complaint.ts
apps/admin/src/views/orders/complaint/index.vue
apps/miniapp-customer/src/api/complaint.ts
apps/miniapp-customer/src/pages/complaint/index.vue
apps/miniapp-customer/src/pages/complaint-detail/index.vue
apps/miniapp-customer/src/pages/complaint-list/index.vue
```

其余（多为功能叠加）

```
apps/admin/src/views/orders/cleaning/index.vue
apps/admin/src/views/orders/recycling/index.vue
apps/admin/src/views/workers/index.vue
apps/miniapp-customer/src/pages/booking-cleaning/index.vue
apps/miniapp-customer/src/pages/booking-consult/index.vue
apps/miniapp-customer/src/pages/order-detail/index.vue
apps/miniapp-worker/src/pages/index/index.vue
apps/miniapp-worker/src/pages/tasks/index.vue
```

### 2.5 必须暂停并询问的情形

出现以下任一情况时：**保留可编译的现状 → 记入 [§7 决策日志](#7-决策日志合并时追加) → 集中一次性询问，不擅自选边。**

1. **同一元素、同一样式属性两边取值不同**（如 `top: 20rpx` vs `30rpx`、按钮圆角/配色不一致），且看不出哪边是成套改版的一部分；
2. **同一文案两边不同措辞**，且都符合各自上下文；
3. **两边逻辑互斥**（同一函数被改成两种流程，无法叠加）；
4. 需要**新增/删除数据库字段或表**，且超出 §2.1 已定范围；
5. 需要**改变对外接口契约**（请求/响应字段名、必填性），且两边约定不一致；
6. 合并后**必须删掉某一方已上线的功能**才能自洽。

不属于以上情形（纯功能叠加、导入合并、互不冲突的新增文件）则按 §2.1–§2.4 直接处理，无需打断。

---

## 3. 操作流程

### 步骤 ①：本仓库合并进我的分支

工作目录：当前编码仓（`/Users/zhangshuo/Desktop/dayangyunjie-master`）。

> 顺序要点：**先 stash 再 pull**。工作区脏的时候 `git pull` 会直接失败。

> **stash 要排除 `plan/`**（CP0 决策）：本文档等 `plan/*.md` 是未跟踪文件，`stash -u` 会把它们一起收走，
> 而 CP2 / CP3 正需要照着它做。用 `--` 限定路径，或按下面的写法排除。

```bash
# 1) 先收起本地未提交杂项（含未跟踪，但保留 plan/ 不动），否则后面 pull 会失败
git stash push -u -m "pre-merge local" -- ':(exclude)plan/'

# 2) 同步远程
git fetch origin
git checkout dev/mac-zhangshuo
git pull origin dev/mac-zhangshuo

# 3) 留退路：记录当前位置 + 打带日期的备份分支（避免重名失败）
git rev-parse HEAD
git branch backup/mac-before-merge-$(date +%Y%m%d)

# 4) 合并
git merge origin/dev/windows-zhangjun
```

冲突处理循环（**注意：`git commit` 是这一段的最后一步，lock 必须在它之前重建**）：

```bash
# a) 看还剩哪些冲突文件
git status

# b) 按 §2 逐个改，确认无 <<<<<<< / ======= / >>>>>>> 残留
git add <file>

# c) 所有冲突（含 package.json）都解决后，重建 lock —— 见下方说明
rm package-lock.json
npm install
git add package-lock.json

# d) 最后才提交合并
git commit
```

**为什么要重建 `package-lock.json`**：两个分支的 lock 差异极大（约 1w 行插入 / 7k 行删除，多半是 npm 版本不同重新生成过）。git 不报冲突、会闷头合出一个**很可能不自洽**的 lock。所以不要用自动合并的结果。必须等 `package.json` 的冲突先解决完再 `npm install`，否则 npm 读到带冲突标记的 `package.json` 会直接失败。

需要放弃本次合并时：

```bash
git merge --abort          # 回到合并前状态（备份分支仍在）
```

**此处先不 push**：合并提交完成后进入步骤 ②，跑完门禁再由步骤 ② 的最后一项统一推送。

本仓库可按需 `git stash pop` 取回本地配置（**勿提交**机密与本机 appid）。若 pop 报冲突，说明同事也改过同一文件，按本机调试需要取舍即可，不要把结果提交。

### 步骤 ②：代码确认（通过后才进入测试）

在编码仓完成，**全部通过后才 push、才拉测试目录**：

1. 全仓搜索无冲突标记残留（`<<<<<<<`、`=======`、`>>>>>>>`）；
2. `npm install`（lock 已按上面重建）；
3. 按下方「新增 migration」**手写** migration 文件，并确认与 `schema.prisma` 一致；
4. `cd apps/server && npx prisma generate`；
5. `npm run build`（shared + 双端 + admin + server）能过；
6. `git diff origin/master...HEAD --stat` 复核：两边功能文件都在，无误删；
7. §2.5 的待确认项已全部回收（要么已问、要么确认无）；
8. `git status` 确认没夹带本机配置 → `git push origin dev/mac-zhangshuo`（**整个流程只在这里推一次**）。

**新增 migration：手写，不要用 `prisma migrate dev`**

`prisma migrate dev --create-only` 会先比对数据库实际结构，而本机库正处于「跑过手工 SQL」的漂移状态，Prisma 大概率报 drift 并要求 `reset` 数据库，反而卡住。DDL 内容我们已经清楚（见 [§4.2](#42-migration-策略追加不改旧的)），直接手写即可：

```bash
mkdir -p apps/server/prisma/migrations/20260823120000_complaint_reasons_json_snapshot
# 在该目录下手写 migration.sql，内容见 §4.2
```

写完只跑 `npx prisma generate`（它只读 `schema.prisma`，不连库），不要在这一步执行 `migrate dev` / `migrate deploy`；库的升级统一放到测试目录、按 [§4.3](#43-本机测试库怎么升) 做。

### 步骤 ③：方式 A — 另目录拉取合并后的代码做测试

```bash
git clone -b dev/mac-zhangshuo \
  git@github.com:zhangjun2046/dayangyunjie.git \
  /Users/zhangshuo/Desktop/dayangyunjie-merge-test
```

#### 3.1 手动复制 / 手动改（简版清单）

> 先按这个跑；跑完有报错或漏项，再回来补这一节。

**A. 从编码仓复制过去（被 gitignore，clone 带不过来）**

```bash
SRC=/Users/zhangshuo/Desktop/dayangyunjie-master
DST=/Users/zhangshuo/Desktop/dayangyunjie-merge-test

cp "$SRC/apps/server/.env" "$DST/apps/server/.env"

# uploads/ 被 gitignore，clone 后该目录不存在，必须先建再拷（否则 cp 直接报错）
mkdir -p "$DST/apps/server/uploads"
cp -R "$SRC/apps/server/uploads/." "$DST/apps/server/uploads/"
```

- [ ] `apps/server/.env` —— 复制后把 `DATABASE_URL` 改成本机测试库
- [ ] `apps/server/uploads/` —— 不复制则历史照片/Banner 图打不开（也可测试时重新上传）

**B. 测试目录里改几个值（改完不要提交）**

- [ ] `apps/miniapp-customer/src/manifest.json` —— appid 改成本地的 `wx3767fa12506d8997`
- [ ] `apps/miniapp-customer/.env.development` —— `VITE_API_BASE` 改 `http://127.0.0.1:3000/api/v1`
- [ ] `apps/miniapp-worker/.env.development` —— 同上
- [ ] `.npmrc` —— 注释掉 `cache=D:\npm-cache`（Windows 路径，Mac 上用默认缓存）
- [ ] `apps/miniapp-worker/src/manifest.json` —— 可选：`es6` / `minified` 改 `false`，方便调试

> **appid 必须两处一致**：`manifest.json` 里居民端小程序的 appid 与 `apps/server/.env` 的 `WECHAT_CUSTOMER_APPID` 必须是同一个（本机为 `wx3767fa12506d8997`）。不一致时「微信官方取号绑定手机号」必失败（`decrypt-phone` 解密报错），且不容易一眼看出原因。

**C. 防止 B 类改动被误提交（建议先做）**

B 类都是**已跟踪文件**，`git add .` / `git commit -a` 会把本机 appid、`127.0.0.1` 一起推上分支。在测试目录先屏蔽：

```bash
cd /Users/zhangshuo/Desktop/dayangyunjie-merge-test
git update-index --skip-worktree \
  apps/miniapp-customer/src/manifest.json \
  apps/miniapp-customer/.env.development \
  apps/miniapp-worker/.env.development \
  apps/miniapp-worker/src/manifest.json \
  .npmrc
```

之后这些文件的本地改动不再出现在 `git status`，也不会被提交。确需改动并提交它们时先撤销：`git update-index --no-skip-worktree <file>`。

（补充项写在下面）

-

#### 3.2 环境准备顺序

```bash
cd /Users/zhangshuo/Desktop/dayangyunjie-merge-test

# 1) 依赖（npm workspaces，仓库用 package-lock.json）
npm install

# 2) 必须先构建 shared，否则后端/管理端起不来
#    packages/shared 的 main 指向 dist/index.js，而 dist/ 在 .gitignore 里，clone 不带产物
npm run build --workspace=@dayangyunjie/shared

# 3) Prisma client
cd apps/server && npx prisma generate
```

**4) 升级本机测试库** —— 不要在这里直接敲 `migrate deploy`。本机库是「跑过手工 SQL」的漂移状态，必须先按 [§4.3](#43-本机测试库怎么升) 把投诉相关表恢复成 `master` 状态、清掉 `_prisma_migrations` 对应记录，然后才执行 `npx prisma migrate deploy`。

**5) 起服务** —— 下面几条是常驻进程，**各开一个终端**，不能写在同一段里顺序执行（`npm run dev` 是 `nest start --watch`，不会退出，后面的命令永远轮不到）。

```bash
# 终端 1：后端
cd /Users/zhangshuo/Desktop/dayangyunjie-merge-test && npm run dev

# 终端 2：管理端（vite proxy 已指向 http://localhost:3000，无需改配置）
cd /Users/zhangshuo/Desktop/dayangyunjie-merge-test && npm run dev:admin
```

> 双端小程序（微信开发者工具 / HBuilderX）**由我手动启动和验证**，不在本文命令范围内。

#### 3.3 回归清单（两个分支的功能都要过）

**我方（`dev/mac-zhangshuo`）**

- [ ] 远程图片展示：`RemoteImage` + `GET /upload/file/:filename`（真机/体验版看图不 404）
- [ ] Banner 跳转：外链 `webview`、保洁广告详情页 `cleaning-ad-detail`
- [ ] 居民端「我的」：微信官方取号绑定手机号；「我的投诉」入口
- [ ] 改派进度：管理端多次改派显示为独立「已改派」节点
- [ ] 保洁/废品列表 `completedToday` 筛选
- [ ] 员工端启动不白屏；未登录能正常进登录页
- [ ] 员工端灰显上传区可点并 toast 引导
- [ ] 居民端体验细节：地址预填/区划、空状态图、性别头像、评价文案与按钮样式

**同事（`dev/windows-zhangjun`）**

- [ ] 员工技能证书多图（最多 9 张）+ 员工端可查看
- [ ] 管理端派单按技能筛选服务人员、技能正常显示
- [ ] 评价关键词配置（保洁/废品）与居民端评价页动态拉取
- [ ] 服务类型图标上传，居民端预约页展示
- [ ] 员工端首页/任务列表显示二级服务配置 icon
- [ ] 投诉原因动态配置（管理端增删）
- [ ] 居民端预约成功后跳转到对应订单详情
- [ ] 员工端开始服务前弹「建议 200 米内」确认，再定位签到（无模拟签到）

**合并点专项**

- [ ] 投诉：多选动态原因提交成功，详情/列表展示多个原因文案
- [ ] 删除某个原因配置后，历史投诉详情仍显示原文案（不做筛选要求）
- [ ] 上传：服务图标上传与 `/upload/file` 读图两个能力都在

#### 3.4 测试中发现 bug 怎么改（回流规矩）

允许**直接在测试目录改并提交回 `dev/mac-zhangshuo`**，但守住三条：

1. 提交前必看 `git status`，只 `git add` 具体文件，**不要** `git add .` / `git commit -a`；若已按 §3.1-C 做过 `skip-worktree`，本机配置不会出现在列表里；
2. 测试目录 push 之后，**编码仓要 `git pull`** 同步回来，否则两个目录分叉，最后合 `master` 时容易推错版本；
3. 最终一律以 **`origin/dev/mac-zhangshuo`** 为准；合 `master` 前确认本地 tip 与远程一致。

```bash
# 测试目录
git status
git add <具体文件>
git commit -m "fix: ..."
git push origin dev/mac-zhangshuo

# 编码仓
git pull origin dev/mac-zhangshuo
```

### 步骤 ④：测试通过后合 `master`

在编码仓执行。注意本地不一定有 `master` 分支：

```bash
git fetch origin

# 本地已有 master 就 checkout；没有则从远程建
git checkout master || git checkout -b master origin/master
git pull origin master

git merge origin/dev/mac-zhangshuo
git push origin master
```

合并前确认 `git rev-parse origin/dev/mac-zhangshuo` 与你测试通过的那个 commit 一致（测试期间若按 §3.4 回流过 bug 修复，务必先 `git fetch` 再核对）。

集成已在我方分支完成，合入 `master` 应为快进或干净 merge，**不再解一轮产品冲突**。

---

## 4. 数据库与 Migration

### 4.1 现状（2026-08-23 核对，很关键）

| 分支 | `apps/server/prisma/migrations/` |
|------|------|
| `origin/master` | **空**（无 migrations 目录） |
| `origin/dev/mac-zhangshuo` | **空** —— 我方库变更只有手工 SQL [`plan/sql/complaint-reasons-enum-to-json.sql`](./sql/complaint-reasons-enum-to-json.sql)，没有 migration |
| `origin/dev/windows-zhangjun` | 3 个：`add_review_keywords`、`add_complaint_reason_configs`、`refactor_complaint_reason_relation` |

由此产生两个必须处理的问题：

1. 同事第 3 个 migration `refactor_complaint_reason_relation` 建的正是我们**要去掉**的 `reason_config_id` + `reason_label` + 外键，并且 `DROP COLUMN reason`；它的 backfill 语句依赖 `complaints.reason` 与 `complaint_reason_configs.code` 存在。
2. **本机测试库若已执行过我方手工 SQL**（`reason` 已变成 `reasons` JSON），直接 `npx prisma migrate deploy` 会在这句 backfill 上报错（列不存在）；即使跑通，结果结构也和方案 3 对不上。而且本机库多半没有 `_prisma_migrations` 记录，Prisma 会认为 3 个 migration 全未应用。

### 4.2 Migration 策略：追加，不改旧的

**只追加一个新 migration**，不要修改同事已提交的 3 个文件。

- 原因：同事本机库已应用过那 3 个，Prisma 把每个文件的 checksum 存在 `_prisma_migrations` 里，改动文件会让他 pull 后报 “migration file has been modified”。
- 生产可行性：线上库现在是 `master` 状态（无 configs 表、无 `reason_config_id`），从头跑「同事 3 个 + 新增第 4 个」能连续到达最终态；中间多绕一次建列再删列，投诉表数据量小，可接受。

新 migration 要做的事（对应 §2.1 方案 3）：

- `complaints` 增加 JSON 列 `reasons`；
- 删除 `complaints.reason_config_id`、`complaints.reason_label`、外键 `complaints_reason_config_id_fkey` 及相关索引；
- 保留 `complaint_reason_configs` 表本身；
- 不做历史数据回填（已确认不考虑历史投诉）。

命名建议：`apps/server/prisma/migrations/2026MMDDHHmmss_complaint_reasons_json_snapshot/migration.sql`。它与 §5 的统一升级 SQL 是同一件事的两种载体，**内容必须语义一致**。

### 4.3 本机测试库怎么升

本机库现在是「跑过手工 SQL 的中间态」，生产上并不存在这种状态。为了让测试路径 = 生产路径：

**推荐路径**：把投诉相关表恢复成 `master` 状态，再跑完整 migration 链。历史投诉已确认不用管，可直接重建。

第一步，先看清楚库现在是什么状态：

```bash
cd apps/server
npx prisma migrate status
```

第二步，在 MySQL 里把投诉相关结构恢复成 `master` 状态（`master` 的 `complaints.reason` 是枚举列，且没有 `complaint_reason_configs` 表）：

```sql
-- 备份（可选，但建议留一份）
CREATE TABLE complaints_bak_20260823 AS SELECT * FROM complaints;

-- 清空投诉数据（已确认历史数据不必保留）
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE complaints;
DROP TABLE IF EXISTS complaint_reason_configs;
SET FOREIGN_KEY_CHECKS = 1;

-- 把 complaints 的原因列恢复成 master 的形态
-- 若本机已执行过 plan/sql/complaint-reasons-enum-to-json.sql，则当前是 reasons JSON：
ALTER TABLE complaints DROP COLUMN reasons;
ALTER TABLE complaints
  ADD COLUMN reason ENUM(
    'POOR_ATTITUDE','NOT_CLEAN','NOT_ON_TIME','ITEM_DAMAGED','EXTRA_CHARGE','OTHER'
  ) NOT NULL;
```

> 上面 6 个枚举值取自 `origin/master` 的 `enum ComplaintReason`（2026-08-23 核对）。执行前可再确认一次：
> `git show origin/master:apps/server/prisma/schema.prisma | rg -A8 'enum ComplaintReason'`

第三步，清掉 `_prisma_migrations` 里同事那 3 个 migration 的记录，让 Prisma 认为它们尚未应用（该表可能根本不存在，不存在就跳过）：

```sql
SELECT migration_name, finished_at FROM _prisma_migrations;

DELETE FROM _prisma_migrations
WHERE migration_name IN (
  '20260820073000_add_review_keywords',
  '20260820130000_add_complaint_reason_configs',
  '20260821160000_refactor_complaint_reason_relation'
);
```

> 同理，若 `review_keywords` 表已存在，也要 `DROP TABLE review_keywords;`，否则第 1 个 migration 会因重复建表失败。

第四步，跑完整链：

```bash
npx prisma migrate deploy
npx prisma migrate status     # 应显示全部已应用、无 drift
```

**备选路径**：不重建，手工把库对齐到最终结构，再用 `npx prisma migrate resolve --applied <migration_name>` 逐个标记为已应用。省事，但这样就**没有验证过生产将要走的升级路径**，风险自负。

### 4.4 其他约定

| 项 | 约定 |
|----|------|
| 用哪套库 | **本机 MySQL** |
| 历史投诉 | 不要求兼容迁移；可清空/重建投诉相关结构 |
| 最终升级物 | 新增 migration + §5 统一升级 SQL，两者语义一致 |
| `.env` | 永不提交；测试目录单独配置 |

---

## 5. 升级 SQL（测试完成后统一产出）

**时机**：功能合并 + 本机测试全部通过之后，再统一整理，避免中途反复改 SQL。

**范围**：把**两个分支**相对 `master` 涉及的所有库变更合成一套，可在一个干净的旧库上一次性升到合并后状态。至少覆盖：

- 投诉原因：`ComplaintReasonConfig` 配置表；`complaints` 改为 JSON 快照 `reasons`（并移除 `reason_config_id` / `reason_label` / 旧 `reason` 及相关外键、索引）
- 评价关键词表（同事 `ReviewKeyword`）
- 员工技能证书多图字段（`skill_cert_urls`）
- 服务类型图标相关字段（如有）
- 其余两边 `schema.prisma` 相对 `master` 的差异（执行时以 `git diff origin/master...HEAD -- apps/server/prisma/schema.prisma` 为准逐条核对）

**落盘要求**：

- 目录：[`plan/sql/`](./sql/)
- 文件名建议：`merge-mac-jun-upgrade.sql`（并可配套 `merge-mac-jun-upgrade.rollback.sql`）
- 与 §4.2 新增的 migration **语义必须一致**；SQL 供生产/手工升级使用
- 旧的 [`complaint-reasons-enum-to-json.sql`](./sql/complaint-reasons-enum-to-json.sql) 由本次统一 SQL 收口，文档内注明其失效或仅供参考
- 不考虑历史投诉数据兼容，允许在 SQL 中直接重建投诉原因相关结构

**产出后别忘了提交**（否则步骤 ④ 合进 `master` 的内容不含它）：

```bash
git add plan/sql/merge-mac-jun-upgrade.sql apps/server/prisma/migrations/
git commit -m "chore: 合并后统一升级 SQL 与投诉 migration"
git push origin dev/mac-zhangshuo
```

顺序固定：**产出 SQL → 提交 push 到 `dev/mac-zhangshuo` → 再执行步骤 ④ 合 `master`。**

---

## 6. 执行检查清单

> 与 [§0.2 检查点](#02-检查点划分每个是一次停下汇报的单位)对应，逐项勾选；每勾完一项就是一次汇报点。

- [ ] 已先 stash 再 pull；工作区干净；已打带日期的备份分支
- [ ] `git fetch` 后三个分支 SHA 与 §1 快照比对过
- [ ] `dev/windows-zhangjun` 已 merge 进 `dev/mac-zhangshuo`
- [ ] `package-lock.json` 已删除重建（未用自动合并结果）
- [ ] 投诉按方案 3 改通（动态配置 + 多选 + JSON 快照，无上限、无「其他」）
- [ ] 员工端：灰显 toast + 200m 弹窗；无模拟签到
- [ ] 预约成功跳详情保留
- [ ] §2.5 待确认项已回收，决策记入 §7
- [ ] 按 §4.2 追加新 migration（未改同事旧 migration）
- [ ] 步骤 ② 代码确认（无冲突残留 / shared+各端 build 通过）
- [ ] `git status` 无本机配置夹带，已 push `dev/mac-zhangshuo`
- [ ] 另目录 clone；按 §3.1 A/B/C 复制、改配置、`skip-worktree`
- [ ] 测试目录已 `build shared` → `prisma generate` → 按 §4.3 升级库 → 起服务
- [ ] §3.3 全部回归项测过；期间 bug 按 §3.4 回流并同步回编码仓
- [ ] 按 §5 产出统一升级 SQL，**并已提交 push**
- [ ] 最后 merge / push `master`
- [ ] §8 发布部署（流程待你确认后补写）

---

## 7. 决策日志（合并时追加）

> 格式：`日期 | 文件/位置 | 冲突点 | 处理方式 | 是否已与我确认`

- 2026-08-23 | CP0 | 员工端两页面 + `request.ts` + `icon_empty.png` 未提交，且两页面在冲突清单内 | 合并前单独提交并 push（`188ece4`），避免 stash pop 二次冲突 | 已确认
- 2026-08-23 | CP0 | `plan/*.md` 未跟踪，`stash -u` 会收走本文档 | 不提交，stash 时用 `':(exclude)plan/'` 排除 | 已确认
- 2026-08-23 | CP0 | `.gitignore` 少 10 行、`docs/Local-MySQL-Mac-Setup.md` 被删、`package.json` 加 pnpm `packageManager` | 三处均 `git checkout HEAD --` 还原 | 已确认

**CP2（投诉链路 13 个文件，方案 3 改造）**

- 2026-08-23 | `schema.prisma` | 我方 `reasons Json` vs 同事 `reasonConfigId`+`reasonLabel`+外键 | 取 `reasons Json`（快照数组）；删外键、`@@index([reasonConfigId])`、配置模型的 `complaints Complaint[]` 反向关系 | 按 §2.1 已确认
- 2026-08-23 | `shared/entities/complaint.ts` | 两侧字段形态不同 | 新增 `ComplaintReasonSnapshot { configId, label }`，`ComplaintDto.reasons` 改为其数组 | 按 §2.1 已确认
- 2026-08-23 | `shared/dto/complaint.dto.ts` | 我方 `reasons` 枚举数组 vs 同事 `reasonConfigId` 单值 | 合为 `reasonConfigIds: number[]`（多选，无上限） | 按 §2.1 已确认
- 2026-08-23 | `shared/labels/index.ts` | 我方硬编码 `COMPLAINT_REASON_LABELS` vs 同事删除 | 删除硬编码表（原因已动态化）；`formatComplaintReasons` 改为读快照 `label` 拼接 | 自行判断，纯技术
- 2026-08-23 | `create-complaint.dto.ts` | 校验形态不同 | `@IsArray + @ArrayMinSize(1) + @IsInt({each}) + @Min(1,{each})`，不设上限 | 按 §2.1 已确认
- 2026-08-23 | `complaint.service.ts` | 我方直写 JSON vs 同事事务内查配置 | **保留同事事务**，改 `findUnique`→`findMany({id:{in}})`，按提交顺序去重后落 `[{configId,label}]`；删除已无外键的 `isComplaintReasonForeignKeyError` | 自行判断，两侧优点合并
- 2026-08-23 | `complaint.spec.ts` | 两侧断言互斥 | 合并：保留我方多选去重用例（改断言快照）+ 同事停用/不存在/DB 异常用例（改 `findMany`）；删除 FK P2003 用例（无外键） | 自行判断
- 2026-08-23 | 同事新增的 `complaint-reason-config.dto.spec.ts` / `.contract.spec.ts` | 非冲突文件，但断言旧契约导致测试失败 | 同步改为多选与 JSON 快照断言 | 自行判断，连带修复
- 2026-08-23 | `admin/api/complaint.ts`、`admin/views/orders/complaint/index.vue` | 单值 vs 数组展示 | 列表列用新增 `formatReasons` 拼接；详情按数组渲染多个 `el-tag` | 自行判断
- 2026-08-23 | `customer/api/complaint.ts` | 我方硬编码枚举 vs 同事删除 | 删枚举，改 `ComplaintReasonSnapshot` + `reasonConfigIds`；`formatComplaintReasons` 读快照 | 自行判断
- 2026-08-23 | `customer/pages/complaint/index.vue` + `complaint-form.ts(.spec)` | 我方多选交互 vs 同事单选动态配置 | **两者合并**：沿用同事配置加载/缓存/失效恢复设施，交互改多选；helper 改 `selectedReasonConfigIds`、新增 `toggleComplaintReason`；失效恢复由「标记单个 id」改为「强刷配置后保留仍可用项」 | 自行判断，符合 §2.1 目标
- 2026-08-23 | `customer` 投诉列表/详情页 | 单值 vs 数组 | 统一用 `formatComplaintReasons(item.reasons)` | 自行判断

CP2 验证：`prisma validate` 通过；shared 编译通过；服务端 `jest complaint` **68/68 通过**；居民端 `vue-tsc` 与管理端 `vue-tsc` 对这 13 个文件**无类型错误**（剩余报错均为 CP3 未解决文件的冲突标记）。

**CP3（其余 8 个文件，功能叠加）**

- 2026-08-23 | `admin/views/orders/cleaning|recycling/index.vue` | import 冲突：我方 `useUserStore` vs 同事 `filterAssignableWorkers`/`skillLabel` | 两侧都保留 | 自行判断
- 2026-08-23 | 同上 | `idleWorkers`：我方「空闲 + 排除当前员工」vs 同事「空闲 + 技能匹配」 | **叠加**：`filterAssignableWorkers(...)` 再 `.filter(w => w.id !== currentWorkerId)`，改派时不会把当前员工列进候选 | 自行判断，两侧优点合并
- 2026-08-23 | `admin/views/workers/index.vue` | 投诉原因：我方 `formatComplaintReasons(c.reasons)` vs 同事 `c.reasonLabel` | 取我方；**连带**删除该文件本地硬编码的 `COMPLAINT_REASON_LABELS`（原因已动态化，枚举表失效），改为读快照 `label`，并补 `ComplaintReasonSnapshot` 类型导入 | 按 §2.1 已确认
- 2026-08-23 | `customer/pages/booking-cleaning/index.vue` | 服务卡片图标：同事版多了 `@error` 兜底与 `itemFallbackEmoji` | 同事版是我方超集，直接取同事版 | 自行判断
- 2026-08-23 | `customer/pages/booking-consult/index.vue` | 我方 `defaultIcon` 本地 emoji 表 vs 同事 `itemIconSrc` + 工具函数 | 取同事版；删我方 `defaultIcon`（模板已不引用，emoji 映射被 `serviceCatalogFallbackEmoji` 完全覆盖且有测试） | 自行判断
- 2026-08-23 | `customer/pages/order-detail/index.vue` | 投诉原因展示与 import | 统一取我方 `formatComplaintReasons(complaint.reasons)` | 按 §2.1 已确认
- 2026-08-23 | `worker/pages/index/index.vue` | import：我方 `fetchWorkerDetail`（今日统计）vs 同事服务图标工具 | 两侧都保留，功能互不相干 | 自行判断
- 2026-08-23 | `worker/pages/tasks/index.vue` | import 冲突 + 同事新增 `statusLabel`/图标 helper + `onShow` 写法 | import 两侧都留；**删同事的 `statusLabel`**（模板用的是我方 `getOrderBadgeLabel`，已无引用）；图标三个 helper 保留；`onShow` 叠加为「先 `ensureAuthed` 再并行 `loadOrders` + `loadServiceCatalogs`」 | 自行判断
- 2026-08-23 | 同事新增的 `customer/api/complaint.spec.ts`、`pages/complaint-snapshot-display.spec.ts` | 非冲突文件，但断言旧单选契约（`reasonConfigId`、`reasonLabel`） | 改为 `reasonConfigIds` 数组与 `formatComplaintReasons(x.reasons)` 快照断言 | 自行判断，连带修复

CP3 验证：全仓无冲突标记残留，`git diff --diff-filter=U` 为空；管理端 `vue-tsc` **零错误**（覆盖 40 个源文件）。两个小程序端的剩余 `vue-tsc` 报错已逐条核对为**既有问题**，非本次合并引入，依据：① `TS2307 vitest` 与随之而来的 `TS7006` 是 `vitest` 依赖尚未安装（CP4 装完即消）；② `request.ts` 的 `BASE_URL` 重复声明与 `PATCH` overload，在**本次未改动**的员工端 `request.ts` 上同样报，属条件编译写法固有；③ `TS2551 .value on number` 在未改动的 `login`/`change-password` 页同样报，属 uni input 事件类型；④ `task-detail` 两处报错的代码在合并前 `188ece4` 已逐字存在（行号 508/797 未变）。

**CP4（重建 lock + 提交合并）**

- 2026-08-23 | `package-lock.json` | 两侧差异过大，不用自动合并结果 | 按 §步骤① 删除重建；`npm install` 干净通过（+275 包）。新增依赖为四端 `vitest ^4.1.11` 与服务端显式 `jest ^29.7.0` | 按计划执行
- 2026-08-23 | `apps/server/jest.config.js` | **重建 lock 后服务端 27 个套件全部无法启动**，报 `Cannot read properties of undefined (reading 'extend')` | 根因：同事在 `bb622f0` 加的 `moduleDirectories: ['node_modules', '<rootDir>/../../../node_modules']` 把根 `node_modules` 显式并入解析路径，而新 lock 把居民端 `uni-automator → jest@27` 链上的 **expect@27.5.1 提升到了根目录**；expect@27 是 `module.exports = expect` 老式导出，无 `.expect` 具名导出，jest@29 的 `@jest/expect` 取到 undefined 即崩。**删除该行**（monorepo 下 Node 本就会上溯到根 `node_modules`，该行冗余；同提交的 `@prisma/client` `moduleNameMapper` 保留，它才是真在起作用的） | 已确认
- 2026-08-23 | `apps/server/src/modules/worker/worker.spec.ts` | 同事新增用例的 prisma mock 缺 `orderStatusLog`，撞上我方 `findOne → getStatsForWorkers` 的今日完成量统计，5 条报 `undefined.findMany` | **唯一真正由合并引入的失败**。给 mock 补 `orderStatusLog.findMany`，业务代码未动。该套件 14/14 通过 | 自行判断，纯技术
- 2026-08-23 | `apps/miniapp-customer/.env.development`、`apps/miniapp-worker/.env.development` | 同事分支把 `VITE_API_BASE` 从远程 `118.195.149.50` 切成 `127.0.0.1`，合并会带进 `master` | 查证为**调试残留**：改动混在 `bb622f0`（主题为「技能证书多图」）里，与该功能无关且提交信息未提及。`git checkout 188ece4 --` 还原为远程地址，与 `master` 一致 | 已确认

**CP4 的一次判断更正**：初次汇报称「14 条失败都是合并造成的语义冲突」，该判断缺少基线。随后将 `188ece4`（合并前的 `dev/mac-zhangshuo`）拉成临时 worktree 跑全量服务端测试，得到 **6 套件 / 9 条失败**，与合并后剩余失败**逐条一致**。经 `git diff 188ece4 --` 逐文件核对，`consult-order`、`cleaning/recycling-order-p4-4`、`cleaning-order-p2-5c`、`recycling-order` 涉及的 spec / service / dto **全部未被本次合并改动**。故 **合并净回归为零**，仅 `worker.spec.ts` 5 条为新增且已修复。

CP4 结果：合并提交 `1e383a0`（父节点 `188ece4` + `f8bc66e`），120 文件变更。服务端 **22 套件 / 350 用例通过**，剩 5 套件 9 条 = 合并前既有失败；居民端 89/89、员工端 25/25、管理端 82/82 全通过。

**遗留待办（另起提交，不混进合并）**：修复合并前就存在的 9 条失败——`consult-order` 7 条（用例未传操作人，而 service 要求 `createActor`）、`cleaning/recycling-order-p4-4` 各 1 条（签到状态机参数）、`cleaning-order-p2-5c` 与 `recycling-order.spec` 编译不过（用例仍用 `completeOrder(1, { photoUrls })`，新 DTO 要 `beforePhotoUrls`/`afterPhotoUrls`）。

**CP5（新增 migration + prisma generate）**

- 2026-08-23 | `.gitignore` | **§4.1 的记述有误需更正**：本机 `migrations/` 下实为 6 个目录，但 `.gitignore` 第 31–39 行默认忽略全部、再逐个加白名单，git 只跟踪同事那 3 个。另外 3 个（`init_schema`、`v2_0_schema`、`complaint_reasons_json`）是**本机私有、从未提交**的。因此新 migration 必须同步加白名单，否则提交不上去 | 自行判断，纯技术
- 2026-08-23 | 新增 `20260823120000_complaint_reasons_json_snapshot` | 按 §4.2 追加，未改同事 3 个文件 | 按 §4.2 已确认
- 2026-08-23 | 同上 · **回填历史数据（偏离 §4.2 原文）** | §4.2 原写「不做历史数据回填」，实际实现选择**做回填**。原因：MySQL 的 JSON 列不能声明 DEFAULT，`reasons` 要 NOT NULL 就必须给已有行赋值，无论如何都得写一条 UPDATE；而此刻 `reason_label` 恰好是同事第 3 个 migration 刚回填齐的，转成 `[{configId, label}]` 单元素快照零成本，比写空数组白白丢掉文案更合理。已实测三条历史投诉全部正确转换 | 已追认
- 2026-08-23 | 新增 `20260823120100_add_worker_skill_cert_urls` | **CP5 发现的缺口**：同事在 `bb622f0` 只往 `schema.prisma` 加了 `skillCertUrls`，**没有配套 migration**（本机应是 `db push` 建的列）。若不补，生产 `migrate deploy` 后 `workers` 表缺 `skill_cert_urls`，技能证书多图功能运行期即报错。SQL 内容由 `prisma migrate diff` 机械生成 | 已追认

CP5 验证方式：建临时库 `dyyj_migtest` → 用 `origin/master` 的 schema `db push` 还原成**生产当前结构** → 插 3 条投诉样本 → 按序执行 5 个 migration，全部 OK → `prisma migrate diff --from-url <临时库> --to-schema-datamodel schema.prisma` 输出 **empty migration（零差异）**。历史数据回填结果例：`NOT_CLEAN` → `[{"configId": 2, "label": "打扫不干净"}]`。验证后临时库已删除。`prisma validate` 通过，`prisma generate` 重新生成客户端后服务端测试仍为 22 套件 / 350 通过、9 条既有失败，无新增回归。

**CP6（门禁校验）**

CP5 产物已单独提交为 `7e6321a`（不与合并提交 `1e383a0` 混在一起）。步骤 ② 七项逐条核验结果：

| # | 门禁项 | 结果 |
|---|--------|------|
| 1 | 无冲突标记残留 | 通过（CP3 已全仓核验） |
| 2 | `npm install`（lock 已重建） | 通过（CP4） |
| 3 | 手写 migration 并与 `schema.prisma` 一致 | 通过，且经临时库实证零差异（CP5） |
| 4 | `npx prisma generate` | 通过（CP5） |
| 5 | `npm run build` 全量 | **退出码 0**，shared / 居民端 / 员工端 / 管理端 / server 五个 `dist/` 均产出 |
| 6 | `git diff origin/master...HEAD --stat` 复核 | 183 文件、**零删除**；用 `comm` 对比两分支各自相对 master 的文件清单，**双方改动全部在合并结果中**，唯二"消失"的是两个 `.env.development`，即已确认还原的调试残留 |
| 7 | §2.5 待确认项回收 | 通过。全程触发并已回收：投诉原因方案（CP0–CP2）、`.env.development` 取值、`jest.config.js` 冗余配置、9 条既有失败的处置口径、migration 回填与补列 |

**测试基线**：服务端 22 套件 / 350 用例通过 + 9 条既有失败（与合并前基线逐条一致，净回归为零）；居民端 89/89、员工端 25/25、管理端 82/82。

**CP7（push `dev/mac-zhangshuo`）**

- 2026-08-23 | 远程推送 | 编码仓领先 origin 11 个提交（含合并 `1e383a0` + migration `7e6321a`） | `git push origin HEAD` 成功：`188ece4..7e6321a` | 已确认

**CP12（统一升级 SQL）**

- 2026-08-23 | `plan/sql/merge-mac-jun-upgrade.sql` + `.rollback.sql` | 相对 master 的 schema 差异仅 4 项：`review_keywords`、`complaint_reason_configs`、`complaints.reasons`、`workers.skill_cert_urls`。服务类型 `icon` 在 master 已存在。SQL 直接建成最终形态（不绕同事中间外键）。旧 `complaint-reasons-enum-to-json.sql` 标注失效。 | 已确认
- 验证：临时库用 master schema `db push` → 插 2 条投诉 → 跑升级 SQL → `prisma migrate diff` **empty**；再跑 rollback，ENUM 与样本行还原正确。临时库已删。

（后续合并执行时继续追加）

---

## 8. 发布部署（待确认，先占位）

合进 `master` 之后到「重新打包上线」之间还差这几步，**具体流程待确认后再补写**：

- [ ] 生产库执行 §5 的统一升级 SQL（或在生产跑 `prisma migrate deploy`）——二选一，别重复执行
- [ ] `npm run build` 产出各端构建物
- [ ] 后端部署 / 重启（含 `.env` 生产配置核对）
- [ ] 居民端、员工端小程序上传微信后台并提交版本
- [ ] 管理端发布

> 待补：是否有既定发布流程 / CI；小程序发版由谁操作；生产库升级窗口与备份要求。

---

## 9. 后续工作触发语（给人 / AI）

- 「按 `plan/merge-mac-jun-to-master.md` 开始合并」——即从 **CP0** 开始，按 [§0 执行节奏](#0-执行节奏必须遵守)单步推进
- 「继续」/「下一步」——推进到下一个检查点
- 「回到 CP\<N\>」——重做某个检查点

**AI 收到开工指令后，只做 CP0,做完必须停下汇报。**

合进 `master`、以及产出统一升级 SQL，均须在另目录测试通过后**单独下达**。
