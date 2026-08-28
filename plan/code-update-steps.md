# 未落地功能：代码更新步骤

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-27  
> 性质：**分步改代码手册**（口径以各方案原文为准；本文只写改哪些文件、按什么顺序做）  
> 对应方案：
> - [`appoint-time-lead-validation.md`](./appoint-time-lead-validation.md)
> - [`biz-dict.md`](./biz-dict.md)
> - [`wechat-notify-auth-roadmap.md`](./wechat-notify-auth-roadmap.md)

---

## 给执行本文的 AI（硬规则）

1. **产品口径以对应方案原文为准**。本文与原文冲突时，停下来问，不要自行发明规则。  
2. **一次只做一步。** 用户说「按 code-update-steps 实现 / 做下一步」且未指定步号 → 从尚未完成的**最小一步**做起，做完汇报验收，等下一轮。  
3. **禁止跨步、禁止跨主题。** 做预约校验时不要顺手做字典或通知。  
4. 某步已验收 → 不要重做。三块都做完 → 停，回复：本文步骤均已落地。  
5. **不要提交 `.env`、密钥、本机 appid。** 只改 `.env.example` 和代码读取逻辑。  
6. 发送类逻辑失败只打日志，**不阻断**下单 / 派单 / 完成。

推荐顺序（无微信依赖的先做）：

```
A 预约 60 分钟 + 时段置灰
   ↓
B 业务字典（只建能力，不接预约/评价/投诉）
   ↓
C 微信通知（粉丝绑定 → 发消息 → 深链 / 订阅弹窗）
```

A 与 B 互不依赖，可调换。C 不依赖 A/B。

---

## A. 预约时间过期与派单缓冲

口径全文：[`appoint-time-lead-validation.md`](./appoint-time-lead-validation.md)。  
公式：`appointAt <= now + 60min` → 置灰 / toast / 后端 400。文案：**请至少提前 1 小时预约**。时区必须 `+08:00`。

### A1 后端校验 + 单测

改：

- 新建 `apps/server/src/common/appoint-time.ts`：`MIN_LEAD_MINUTES = 60`，`assertAppointNotTooSoon(appointDate, appointTimeSlot)`，过近抛 `BadRequestException('请至少提前 1 小时预约')`；拼 `` `${date}T${hhmm}:00+08:00` ``。时段若为 `09:00-11:00` 取起始 `09:00`。
- [`cleaning-order.service.ts`](../apps/server/src/modules/cleaning-order/cleaning-order.service.ts) `create` 写库前调用。
- [`recycling-order.service.ts`](../apps/server/src/modules/recycling-order/recycling-order.service.ts) `create` 同样。
- 补 create 单测：已过、卡在 60 分钟边界、明天通过。

不改：家政 `create`、改期 `update`、admin 时段按钮样式。

**验收：** 直调保洁/废品 create，过近返回 400；合法时段成功。

### A2 居民端工具函数 + 两页置灰与拦截

改：

- 新建 `apps/miniapp-customer/src/utils/appoint-time.ts`：同一 `MIN_LEAD_MINUTES`、`isAppointTooSoon`、`isDateFullyTooSoon`。
- [`booking-cleaning/index.vue`](../apps/miniapp-customer/src/pages/booking-cleaning/index.vue) 与 [`booking-recycling/index.vue`](../apps/miniapp-customer/src/pages/booking-recycling/index.vue)：
  1. `.time-btn` 增加 `disabled`；disabled 不写 `selectedTime`。
  2. 已选时段变为过近 → 清空 `selectedTime`。
  3. 日历 `disabled`：早于今天 **或** 该日 8 个点全过近。
  4. 进入第二步：今天无点则默认下一可约日。
  5. `nextStep`（2→3）与 `submitOrder` 在已选校验之后再拦 `isAppointTooSoon`，toast 同上。
  6. 进入第二步、切日期、`onShow` 时重算；不做每秒刷新。

**验收：** 当天过近点灰色不可点；可约点能进确认页；确认页坐过缓冲再提交会被 toast；后端仍 400。

---

## B. 业务字典（只建能力）

口径全文：[`biz-dict.md`](./biz-dict.md)。  
**禁止**本主题内改预约页、评价页、投诉提交、下单 DTO 去读字典。

### B1 shared 常量 + Prisma 表

改：

- `packages/shared`：`DictType`、`DICT_TYPE_LABELS`、`BizDictItemDto`（字段见方案 §2.2 / §4.2）。
- [`schema.prisma`](../apps/server/prisma/schema.prisma)：`BizDictItem` → 表 `biz_dict_items`；唯一 `(type, value, bizType)`，空 bizType 用 `''`；索引 `(type, isEnabled, sortOrder)`。
- `npx prisma migrate dev`（在 `apps/server`）。
- [`seed.ts`](../apps/server/prisma/seed.ts)：时段 / 评价标签 / 投诉原因，**该 type 下 0 条才插入**，投诉原因 `isSystem=true`，`OTHER` 不可停用。

**验收：** migrate 成功；空库 seed 后三类都有项；再 seed 不覆盖已改 label。

### B2 后端 CRUD + 公开查询

新建 `apps/server/src/modules/biz-dict/`，挂 [`app.module.ts`](../apps/server/src/app.module.ts)。对标 `service-catalog`。路由见方案 §4.2（`/enabled` 必须写在 `/:id` 前）。写接口 `AdminJwtAuthGuard`。

单测：重复 value 400；删/改系统项 value 400；停用 `OTHER` 400；enabled 不含停用项；非法 type 400。

**验收：** Swagger 管理 CRUD + `GET /biz-dict-items/enabled?type=APPOINT_TIME_SLOT` 可用。

### B3 PC 管理端页面 + 菜单权限

同步（漏一处则普通管理员进不去）：

- `apps/admin/src/views/config/dicts/index.vue`、`api/biz-dict.ts`
- `router/index.ts`：`/config/dicts`，`menuKey: config.dicts`
- `layout/index.vue` 配置菜单 + `showConfigMenu`
- `constants/menu-permissions.ts` `MENU_TREE`
- [`menu-keys.constant.ts`](../apps/server/src/modules/admin-permission/constants/menu-keys.constant.ts) `ALL_MENU_KEYS`

页面行为见方案 §5.2。不给已有普通管理员自动授权。

**验收：** 超管能开「业务字典」；增改停用删除符合系统项规则；小程序预约选项**仍是写死常量**。

---

## C. 微信订单通知

口径全文：[`wechat-notify-auth-roadmap.md`](./wechat-notify-auth-roadmap.md)。  
微信后台模板/域名假设已就绪。未配凭证则跳过发送，不抛垮业务。

居民完成通知跳 **订单详情**（`pages/order-detail/index?id=`），不跳评价页。家政咨询单不发。

开始 C5/C6/C7 前，须把通知方案里的“模板字段契约”按微信后台真实模板填写完整；字段名和长度不能猜。服务号还须单独**关联员工端小程序**，仅绑同一个开放平台不够。

### C1 环境变量读取

改 [`.env.example`](../.env.example) 与 [`env-config.service.ts`](../apps/server/src/common/config/env-config.service.ts)，增加方案 §D 所列键（服务号、模板 ID、员工 AppID、`WECHAT_ADMIN_H5_BASE_URL`）。均为可选；缺则 `hasWechatOaCredentials === false`。

**勿**把真实 Secret 写入仓库。本地 `apps/server/.env` 由人填。

**验收：** 未配 OA 时服务能起；读取逻辑有单测或至少启动不炸。

### C2 粉丝表 + 一次性绑定票据表

Prisma 新增：

- `WechatOaFollower` / `wechat_oa_followers`：字段见通知方案阶段一；`oaOpenid` 唯一；`adminId`、`workerId` 可空唯一；业务账号删除 `onDelete: SetNull`；同一粉丝可同时有 admin + worker。
- `WechatOaBindTicket` / `wechat_oa_bind_tickets`：`tokenHash` 唯一、`targetType`、`targetId`、`expiresAt`、`usedAt`、`createdByAdminId` / `createdByWorkerId`（按角色二选一）和时间。只存随机 token 哈希，不存明文。

**验收：** 表存在；重复绑定同类账号受唯一约束；过期/已用票据不可消费。

### C3 服务号回调 + OA 服务（本期 plain）

新建：

- `WechatOaService`：access_token 缓存（可对标现有 [`wechat-customer.service.ts`](../apps/server/src/modules/auth/wechat-customer.service.ts)）、`user/info`、生成临时带参码、`template/send`
- `WechatOaController`：`GET/POST /api/v1/wechat/oa/callback`；校验签名、timestamp 新鲜度和 nonce；GET 回 echostr；POST 解析明文 XML，处理 subscribe / unsubscribe / SCAN

本期只实现 `WECHAT_OA_ENCODING_MODE=plain`；compatible/safe 与 AES 解密另开任务，不得配置成已支持。

scene：`bind_{高强度随机token}`，禁止裸 `admin_{id}` / `worker_{id}`。首次关注事件读 `qrscene_bind_...`，已关注扫码读 `bind_...`。校验票据哈希、期限和 `usedAt` 后一次性消费。unsubscribe → `subscribed=false`。

**验收：** 微信服务器配置通过验签；首次关注和已关注扫码都能绑定；篡改/过期/重复票据失败；取关后不再视为 subscribed。

### C4 安全带参码接口 + 绑定展示

后端：只允许已登录 Admin / Worker 为自己创建 10 分钟一次性票据；超管可为指定账号创建。根据票据生成临时关注二维码 URL（或 ticket），禁止客户端直接提交目标 ID 后无授权生成。scene 使用紧凑 base64url token 并满足微信长度上限。重新绑定须明确解绑旧微信，不静默覆盖。  
UI（未绑定不挡登录）：

- PC 用户管理或 H5 登录后：「关注服务号接收派单通知」
- 员工端「我的」：绑定码

可与 C5 并行，但没有绑定则发不出运营/员工消息。

**验收：** 扫码关注后粉丝表 `adminId`/`workerId` 有值；冒用其他账号 ID、重复扫码和过期二维码不能改绑。

### C5 下单成功 → 通知运营

新建 `NotifyService`：查 `ENABLED` Admin（超管或 `orders.cleaning` / `orders.recycling`）∩ 粉丝 `subscribed=true`；数据库事务提交后异步 `template/send`；`url` = `{WECHAT_ADMIN_H5_BASE_URL}#/pages/order-detail/index?id={id}&type=cleaning|recycling`。

注入：保洁/废品 `create` 成功之后（`PENDING_ASSIGN`）。批量发送用 `Promise.allSettled`；每个收件人带稳定 `client_msg_id`；无绑定、无模板 ID → 打日志并返回。日志不得包含 Secret/token。

**验收：** 有权限且已绑定的运营收到服务号消息；无权限/未绑定无消息；下单仍成功。

### C6 分配 / 改派 → 通知员工

在 `assignOrder` / `reassignOrder` 成功后：对被派 `workerId` 发 `WECHAT_OA_TMPL_WORKER_ASSIGNED`，`miniprogram.appid=WECHAT_WORKER_APPID`，`pagepath=pages/task-detail/index?orderId={id}&orderType=cleaning|recycling`。  
改派：新员工发新任务；若配置了 `WECHAT_OA_TMPL_WORKER_REASSIGNED` 再通知原员工。

**验收：** 仅被派员工收到；服务号已关联员工小程序；点开进员工端该任务（需员工小程序已发布或体验版）。

### C7 完成服务 → 居民订阅消息

扩展 [`WechatCustomerService`](../apps/server/src/modules/auth/wechat-customer.service.ts)（或独立方法）：用**居民小程序** token 调 `subscribe/send`。  
注入：保洁/废品 `completeOrder` 成功后。`touser=Resident.openid`，`page=pages/order-detail/index?id=`。未授权微信报错 → 只打日志。

**验收：** 曾订阅的居民在「服务通知」收到；未订阅订单仍完成。

### C8 管理端 H5 深链

改：

- [`useRouteGuard.ts`](../apps/miniapp-admin/src/composables/useRouteGuard.ts)：拦截去登录时记下目标 url（含 query）
- [`pages/login/index.vue`](../apps/miniapp-admin/src/pages/login/index.vue)：登录成功 `reLaunch` 回该详情，不要一律 `/pages/orders/index`
- 401 清登录尽量保留深链

**验收：** 未登录打开 `#/pages/order-detail/index?id=1&type=cleaning` → 登录后落到该详情。

### C9 员工端深链登录接力

员工端现有任务详情读取 `orderId/orderType`，登录页成功后固定跳首页。修改员工路由守卫 / 登录页：

- 从模板进入详情但未登录时，保存合法内部目标（含 `orderId/orderType`）再去登录。
- 登录成功优先回到任务详情；无目标才跳首页。
- 只接受 `pages/task-detail/index` 和合法数字 ID、`cleaning|recycling`，禁止任意 URL 回跳。

**验收：** 退出员工登录态后点模板消息，登录成功仍进入原任务。

### C10 居民端订阅引导

实现时从通知方案「居民订阅引导」**三选一**（本步骤开工时再定）：

- **A**：成功卡片加「接收服务完成通知」，并**取消**约 2 秒自动跳详情；点订阅或「查看订单」后再跳。
- **B**：点「提交订单」时先 `wx.requestSubscribeMessage`，再调创建接口。
- **C**：以订单详情「开启完成通知」为主，可保留现有成功后跳转。

硬性约束：只在用户 tap 手势链路里调 `wx.requestSubscribeMessage({ tmplIds: [服务完成模板] })`；不可在下单成功异步回调、`onLoad` 或 `setTimeout` 中自动弹。拒绝/关闭不挡下单和查看订单。

**验收：** 真机/开发者工具在所选入口点击会出订阅面板；拒绝后下单流程完整；没有用户点击时不自动弹。

### C11 引导与日志（阶段三，可收口）

- 未绑定提示常驻（运营 H5 / 员工「我的」）
- 发送失败 log：事件、订单、脱敏 openid、模板、`client_msg_id`、errcode、msgid（表可选）
- Mock：无凭证跳过发送
- 如要求进程重启不丢通知，增加 outbox/队列；否则在上线说明中记录本期为事务提交后的进程内异步发送

**验收：** 对照通知方案「验收标准」四条。

---

## 步号速查

| 步 | 主题 | 做什么 |
|----|------|--------|
| A1 | 预约 | 后端 60 分钟校验 + 单测 |
| A2 | 预约 | 居民两端置灰 + 下一步/提交 |
| B1 | 字典 | shared + 表 + seed |
| B2 | 字典 | CRUD / enabled |
| B3 | 字典 | PC 配置页 + menuKey |
| C1 | 通知 | env 读取 |
| C2 | 通知 | 粉丝表 + 一次性绑定票据表 |
| C3 | 通知 | 明文回调 + 发模板能力 |
| C4 | 通知 | 安全带参码绑定 UI |
| C5 | 通知 | 下单 → 运营 |
| C6 | 通知 | 派单 → 员工 |
| C7 | 通知 | 完成 → 居民 |
| C8 | 通知 | H5 深链 |
| C9 | 通知 | 员工深链登录回跳 |
| C10 | 通知 | 居民订阅引导（A/B/C 三选一） |
| C11 | 通知 | 提示、幂等与发送日志 |

用户指定「做 C5」等步号时，只做该步，仍遵守对应方案原文。

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
