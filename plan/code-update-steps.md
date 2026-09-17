# 未落地功能：代码更新步骤（总表）

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-27；修订：2026-09-14 按 A / B / C 拆成独立工作手册。  
> 性质：**索引**。执行时打开对应主题手册，不要在本文里改代码步骤。  
> 对应方案与手册：

| 主题 | 方案原文（口径） | 独立工作手册（怎么改代码） |
|------|------------------|----------------------------|
| A 预约过近校验（缓冲可配） | [`appoint-time-lead-validation.md`](./appoint-time-lead-validation.md) | [`code-update-steps-a.md`](./code-update-steps-a.md)（旧手册仍写死 60 分钟，**以方案原文为准**，执行 A 前先对照修订后的 lead-validation） |
| B 业务字典（只建能力） | [`biz-dict.md`](./biz-dict.md) | [`code-update-steps-b.md`](./code-update-steps-b.md) |
| C 微信 + 短信通知 | [`wechat-notify-auth-roadmap.md`](./wechat-notify-auth-roadmap.md) | [`code-update-steps-c.md`](./code-update-steps-c.md) |
| 预约时段后台配置（格子） | [`appoint-time-slot-config.md`](./appoint-time-slot-config.md) | 尚未拆手册；按方案 P1～P3。**必须先做完再做 A** |

预约相关顺序（已拍板，不可对调）：

```
预约时段配置 P1～P3（格子可配、下单读接口）
   ↓
A 过近校验（同一页补缓冲分钟 + 置灰 + create 兜底）
```

B 与 C 仍不依赖预约两主题。**禁止跨主题。**

推荐顺序（无微信依赖的先做）：

```
预约时段配置 P1～P3
   ↓
A 过近校验（缓冲可配，不再写死 60 分钟）
   ↓
B 业务字典（只建能力，不接预约/评价/投诉）
   ↓
C 微信+短信通知（绑定 → 即时节点 → 定时超时/提醒 → 域名后再做运营 H5 点开）
```

---

## 给执行的 AI（怎么选手册）

1. 用户点名 A / B / C 或某一手册 → **只打开那一份**，按其硬规则一次一步。  
2. 用户只说「按 code-update-steps 做 / 做下一步」且未指定主题 → 从尚未完成的**最小主题、最小一步**做起（A1 → … → C），做完汇报验收。  
3. 产品口径以各方案原文为准；步骤以各主题手册为准。本文与手册冲突时以手册为准。  
4. 三块都做完 → 停，回复：本文步骤均已落地。

---

## 步号速查

| 步 | 主题 | 批次 | 做什么 | 手册 |
|----|------|------|--------|------|
| A1 | 预约 | — | 后端按配置缓冲校验 + 单测（勿按旧手册写死 60） | [A](./code-update-steps-a.md) / 以 [lead-validation](./appoint-time-lead-validation.md) 为准 |
| A2 | 预约 | — | 居民两端置灰 + 下一步/提交（缓冲来自配置） | 同上 |
| B1 | 字典 | — | shared + 表 + seed | [B](./code-update-steps-b.md) |
| B2 | 字典 | — | CRUD / enabled | [B](./code-update-steps-b.md) |
| B3 | 字典 | — | PC 配置页 + menuKey | [B](./code-update-steps-b.md) |
| C1 | 通知 | 阶段 0 | env（微信模板 + SMS 占位） | [C](./code-update-steps-c.md) |
| C2 | 通知 | 阶段 0 | 粉丝表 + unionid（+ 可选发送日志表） | [C](./code-update-steps-c.md) |
| C3 | 通知 | 阶段 0 | OA 回调 + SmsService 骨架 | [C](./code-update-steps-c.md) |
| C4w | 通知 | 阶段 0 | 员工 unionid 绑定 | [C](./code-update-steps-c.md) |
| C4r | 通知 | 阶段 0 | 居民 unionid + 回填 | [C](./code-update-steps-c.md) |
| C6 | 通知 | 阶段 0 | NotifyService 骨架 | [C](./code-update-steps-c.md) |
| C6a | 通知 | 阶段 0 | 派单/改派 → 新员工 | [C](./code-update-steps-c.md) |
| C6b | 通知 | 阶段 0 | 接单 → 派单运营 + 居民 | [C](./code-update-steps-c.md) |
| C6c | 通知 | 阶段 0 | 完工 → 居民评价页 | [C](./code-update-steps-c.md) |
| C6d | 通知 | 阶段 0 | 居民取消 → 居民 | [C](./code-update-steps-c.md) |
| C6t | 通知 | 阶段 0 | 超时 15min（微信+短信）+ T-30 仅短信 | [C](./code-update-steps-c.md) |
| C8 | 通知 | 阶段 0 | 员工深链 | [C](./code-update-steps-c.md) |
| C8b | 通知 | 阶段 0 | 居民深链 | [C](./code-update-steps-c.md) |
| C5 | 通知 | 阶段 0/1 | 下单 → 居民 + 运营批 | [C](./code-update-steps-c.md) |
| C4a | 通知 | 阶段 1 | 运营网页授权 | [C](./code-update-steps-c.md) |
| C5r | 通知 | 阶段 1 | 点击中转 302 | [C](./code-update-steps-c.md) |
| C7 | 通知 | 阶段 1 | H5 深链 | [C](./code-update-steps-c.md) |
| C9 | 通知 | 阶段 2 | 引导与日志 | [C](./code-update-steps-c.md) |

**C 阶段 0：** C1 → C2 → C3 → C4w → C4r → C6 → C6a → C6b → C6c → C6d → C6t → C8 → C8b（C5 居民侧可穿插）。  
**C 阶段 1：** C4a → C5r → C7（须 B8 HTTPS + B4；H5=`https://h5.yunjiezhixiang.cn/`）。

用户指定步号时只做该步。旧「C4」「C6」已拆分，有歧义先问清。

---

## 远程机 `git status` 只有 `package.json` / `package-lock.json`

测试机（如 `/opt/dayangyunjie-code`）在 **已与 `origin/master` 同步** 时仍常出现：

```text
On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
        modified:   package-lock.json
        modified:   package.json
```

**原因：** 服务器上跑过 `npm install`。Linux 与 Windows 开发机的可选依赖、npm 大版本不一致时，会改写根目录这两个文件。根目录 [`.npmrc`](../.npmrc) 在部署文档里还会被改成 `cache=/root/.npm`，有时也会脏。

**处理（服务器上不要 commit、不要 push）：**

```bash
cd /opt/dayangyunjie-code   # 以实际部署目录为准

# 确认只动了依赖文件、没有业务改动
git status
git diff --stat

# 丢弃本地被 npm 改写的文件，才能干净 pull
git restore package.json package-lock.json
# 若 .npmrc 也脏：git restore .npmrc
# 然后再按部署文档覆盖 Linux 缓存路径：
echo 'cache=/root/.npm' > .npmrc

git pull origin master
```

拉完后再装依赖：

```bash
# 优先：严格按仓库 lock 安装，一般不再改 package.json / lock
npm ci

# npm ci 因 lock 与 package.json 对不上而失败时，再用 npm install
# 装完若这两个文件又脏了，再次 git restore，不要 git add
```

| 不要 | 要 |
|------|------|
| 在服务器 `git add` / `commit` / `push` 这两个文件 | 改依赖只在本机做，push 后再到服务器 pull |
| 带着脏工作区 `git pull` 被拒就 `stash` 业务未知改动 | 先 `git diff`，确认无业务改动再 `restore` |
| `npm audit fix --force` | 测试机忽略 audit 即可 |

部署文档里的「更新代码」流程见 [`docs/TencentCloud-Test-Deploy.md`](../docs/TencentCloud-Test-Deploy.md) 第四节 / 第十二节。
