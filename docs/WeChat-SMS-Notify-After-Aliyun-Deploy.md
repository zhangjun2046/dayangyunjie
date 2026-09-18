# 阿里云部署完成后：微信 / 短信通知联调清单

> **前置**：已按 [`Aliyun-ECS-Alinux4-Deploy.md`](./Aliyun-ECS-Alinux4-Deploy.md) 把 API、PC、运营 H5 跑在 `yunjiezhixiang.cn` 的 HTTPS 上。  
> **编制**：2026-09-15；修订：2026-09-15（补 `pm2 logs` 与完整 `reason=` 对照）。  
> 本文**不写代码**。通知相关代码已在仓库；缺口在部署与微信/短信后台。做完这些才能测服务号模板和阿里云短信。  
> 口径以当前仓库为准：保洁 / 废品订单会发通知；**家政咨询单不发**。微信和短信按事件矩阵**同时发**（不是短信兜底）；预约开始前 30 分钟**只发短信**，没有微信模板。发不出不挡下单 / 派单。

发版最少三件事（漏任何一件都会误判成「代码没好」）：

1. 按部署文档把**当前含通知的源码**发到 ECS；`cd apps/server && npx prisma generate && npx prisma db push`（补 `wechat_oa_followers`、`wechat_oa_oauth_states`、`notify_send_logs`、员工/居民 `unionid`），再 `pm2 restart dayangyunjie-api`。有数据的库**不要**再 `db seed`。  
2. 本机重编并上传 **居民端、员工端** 体验版（静默 `wx.login` 绑定在新包里）。`VITE_API_BASE=https://api.yunjiezhixiang.cn/api/v1`。  
3. 本机 `npm run build:miniapp-admin`，按部署文档覆盖 H5 静态目录。`.env` 里所有 `待补充` 换成真值；`WECHAT_ADMIN_H5_BASE_URL=https://h5.yunjiezhixiang.cn`。`WECHAT_MP_RELEASED`：已发居民/员工**正式版**后设 `true`（模板可点进小程序）；未发正式版用 `false`（仍发服务号模板，但不带小程序跳转，避免 40165）。微信服务号模板**不能**跳体验版。

---

## 事件矩阵（全链路时对照「该不该收到」）

同一动作**不会**同时给居民、员工、运营各发一条微信。每个事件只发给下表角色。微信和短信都配齐时按表发送。

| 事件 | 服务号 | 短信 |
|------|--------|------|
| 下单成功 | 居民 + 有权限的运营（超管或对应订单菜单） | 仅运营（居民无下单短信） |
| 派单 / 改派 | 仅**新**员工 | 仅新员工 |
| 员工接单 | 最近一次派单的运营 + 居民 | 仅居民（运营无接单短信） |
| 完工 | 仅居民（进评价页） | 无 |
| 居民取消 | 仅居民 | 无 |
| 运营取消 | 无 | 无 |
| 接单超时 15 分钟仍 ASSIGNED | 该派单运营 | 该派单运营 |
| 预约开始前 30 分钟 | **无** | 居民；已派员工则员工也有 |
| 家政咨询单 | 无 | 无 |

---

## 配完后可以测什么

| 通道 | 本文 + 服务器 `.env` 齐之后 |
|------|-----------------------------|
| 短信（运营 / 员工 / 居民，含 T-30、接单超时） | 账号有**真实手机号**、短信 Key 不是 `待补充` |
| 居民服务号模板 | 关注服务号 + 居民端登录（静默写 unionid）+ 开放平台 |
| 员工服务号模板 | 关注服务号 + 员工端登录（静默绑定，无按钮）+ 开放平台 |
| 运营服务号模板 | 微信内打开 H5 → 登录 → **绑定微信**（网页授权写入 `adminId`）+ 关注服务号 |
| 点运营模板进 H5 详情 | 中转 `https://api.yunjiezhixiang.cn/api/v1/wechat/oa/redirect?type=cleaning\|recycling&id=` → H5 详情；未登录会先登录再打开该单 |

---

## 一、服务器 `.env`（ECS，不是前端）

路径：`/opt/dayangyunjie-code/apps/server/.env`（以你部署文档里的代码目录为准）。改完 `pm2 restart dayangyunjie-api`。

必须从 `待补充` / 空换成真值：

| 变量 | 用途 |
|------|------|
| `SERVER_BASE_URL` | `https://api.yunjiezhixiang.cn`（无尾路径）。运营模板的点击中转、网页授权 `redirect_uri` 都靠它 |
| `WECHAT_CUSTOMER_APPID` / `SECRET` | 居民端小程序 `code2session` / 绑定 |
| `WECHAT_WORKER_APPID` / `SECRET` | 员工端，**不要**和居民端混用 |
| `WECHAT_OA_APPID` / `SECRET` / `TOKEN` | 服务号。`TOKEN` 与公众平台「服务器配置」完全一致 |
| `WECHAT_OA_ENCODING_MODE` | `plain` |
| `SMS_ACCESS_KEY_ID` / `SECRET` | **短信阿里云账号**（账号 B），不要用 ECS 那套 AccessKey |
| `WECHAT_ADMIN_H5_BASE_URL` | `https://h5.yunjiezhixiang.cn`（运营 H5 子域根路径，不加 `/admin/`）。空或 `待补充` 时**跳过全部运营微信**（短信仍可发） |

`WECHAT_OA_TMPL_*`、`SMS_TMPL_*`、`SMS_SIGN_NAME=北京大洋云洁` 部署文档已写死，不要改。  
`WECHAT_MP_RELEASED`：正式版上线后改 `true`；联调未发正式版保持 `false`（见上文，不是「跳体验版」）。
不要加 `WECHAT_OA_TMPL_REMINDER_*`（T-30 没有微信模板）。

`CORS_ORIGIN` 按部署文档包含 `https://admin.yunjiezhixiang.cn` 与 `https://h5.yunjiezhixiang.cn`。

---

## 二、微信公众平台（小程序）

入口：[mp.weixin.qq.com](https://mp.weixin.qq.com)，分别登录**居民端**、**员工端**两个小程序（不是服务号）。

1. **开发管理 → 开发设置 → 服务器域名**  
   - request / uploadFile / downloadFile：**`https://api.yunjiezhixiang.cn`**  
   - 不要填 IP、不要填 `admin.` / `h5.`、不要 `http://`
2. 本机 `apps/miniapp-customer/.env.production` 与 `apps/miniapp-worker/.env.production`：

```env
VITE_API_BASE=https://api.yunjiezhixiang.cn/api/v1
```

   `npm run build:mp-weixin` 后用开发者工具上传（见部署文档第十节）。真机预览/体验版不要勾「不校验合法域名」。
3. 员工端小程序后台允许被**服务号关联**（与下面开放平台是两件事）。居民端按需关联（完工评价跳居民端）。

运营 H5 **不是**小程序，不要在小程序后台配它的域名。

---

## 三、微信公众平台（服务号）

必须是已认证**服务号**，订阅号不行。与两个小程序同一企业主体。

### 3.1 服务器配置（关注 / 取关）

设置与开发 → 基本配置 → **服务器配置**：

| 项 | 值 |
|----|----|
| URL | `https://api.yunjiezhixiang.cn/api/v1/wechat/oa/callback` |
| Token | 与 ECS `.env` 的 `WECHAT_OA_TOKEN` 相同 |
| EncodingAESKey | 控制台可能强制填写：点「随机生成」即可；**仍选明文模式**。ECS `.env` **不要**写 `WECHAT_OA_AES_KEY`（只有以后改安全模式才需要） |
| 消息加解密 | **明文模式**（与 `WECHAT_OA_ENCODING_MODE=plain` 一致） |

点「提交」时微信会 GET 该 URL，带 `echostr`。接口应**原样返回该字符串**（不是 JSON）。失败先查：证书、Nginx `location /api/`、安全组 443、Token 拼写。

**不要**把网页授权回调填成这个 URL。关注事件成功后 API 日志应有粉丝 upsert；取关后该 openid `subscribed=false`，微信通知会跳过。

### 3.2 IP 白名单

同一页「IP 白名单」填 ECS **弹性公网 IP**（服务器访问微信 API 的出口）。不配则 `template/send`、`code2session`、网页授权换票会失败。

### 3.3 网页授权域名（运营绑定，必配）

公众号设置 → 功能设置 → **网页授权域名**：只填主机名 **`api.yunjiezhixiang.cn`**（无 `https://`、无路径、无 `www`）。

实际回调是：

`https://api.yunjiezhixiang.cn/api/v1/wechat/oa/oauth/callback`

（无 hash；授权完成后再 302 到 H5 `#/pages/wechat-bind/index`。）

PC 浏览器无法完成绑定；必须用**微信内置浏览器**打开 H5。

### 3.4 JS 接口安全域名

本期模板消息不强制。仅当以后改用网页 JS-SDK 再配 `h5.yunjiezhixiang.cn`。

### 3.5 自定义菜单（建议）

菜单「派单后台」指向 `https://h5.yunjiezhixiang.cn`，方便运营用微信打开 H5 再点「绑定微信」。

### 3.6 模板消息

已在服务号选用、ID 已写入 `.env` 的七条即可。不要为 T-30 再申请微信模板。改服务号类目会删模板，不要随便改类目。

运营模板的跳转是 **url**（中转接口），不要在模板后台再配小程序跳转。员工 / 居民模板由服务端带 `miniprogram`，不要和服务号 url 混用。

---

## 四、微信开放平台（unionid，居民 / 员工硬依赖）

入口：[open.weixin.qq.com](https://open.weixin.qq.com)。

把下面绑到**同一个**开放平台账号，否则居民 / 员工小程序与服务号对不上，模板发不出去：

- 居民端小程序  
- 员工端小程序  
- 本业务服务号  

管理端 H5 **不要**当成小程序绑进去。运营绑定走服务号网页授权的 OpenID，不依赖小程序 unionid。

另：服务号后台 → 广告与服务 → 小程序管理 → **关联员工端小程序**（派单模板跳任务详情）。居民端关联用于完工评价页。

---

## 五、阿里云短信（账号 B）

与 ECS **不是**同一个阿里云账号。

1. 短信控制台：签名 **北京大洋云洁** 已过审。  
2. 六条模板 CODE 与 `.env` / 部署文档一致且已过审（变量名以控制台为准：`serviceName`、`appointTime` 等）。  
3. 创建 RAM 用户，只开短信发送权限，把 AccessKey 填进 ECS `.env` 的 `SMS_ACCESS_KEY_*`。  
4. 国内短信需完成企业资质；未过审会发送失败，业务单仍会成功。

---

## 六、业务数据（系统里）

| 角色 | 要准备 |
|------|--------|
| 运营 Admin | PC 用户管理创建，**启用**；勾选 `orders.cleaning` / `orders.recycling`（或超管）。**手机号**填真实号才能测运营短信。 |
| 员工 Worker | PC 员工管理建档，在职，手机号真实。 |
| 居民 | 小程序登录；下单联系电话真实（短信优先订单 `contactPhone`，否则 `Resident.phone`）。 |

seed 默认管理员先改密，并补手机号。家政咨询单不会出通知，不要用它验收。不要对已有数据的库再 `prisma db seed`。

---

## 七、人员绑定服务号（发模板前必做）

发服务号模板时，服务器用的是 **服务号 OpenID**（粉丝表 `wechat_oa_followers.oa_openid`），不是小程序 openid，也不是手机号。  
**员工和运营都不用自己抄、填 OpenID。** 按下面点完，系统会写入并挂到对应员工 / 运营账号。联调时若要确认，看 API 日志或库表，不要让人把 openid 发到群里。

两件事缺一不可：

| | 关注服务号 | 账号绑定 |
|--|------------|----------|
| 做什么 | 微信里搜并关注「北京大洋云洁」 | 员工/居民：登录自己的小程序（静默 `wx.login`）；运营：H5 点「绑定微信」 |
| 系统得到什么 | 回调写入粉丝行：`oa_openid` + `subscribed=true` | 把这条粉丝挂到 `workerId` / `residentId` / `adminId` |
| 只做一件会怎样 | 有 openid 但发不出去（找不到人） | 员工/居民可能对不上粉丝；运营能挂上 openid，但未关注时发送会 `reason=unsubscribed` |

建议顺序：**先关注，再打开对应端登录**（关注时 openid 已进库，静默绑定更容易配对）。先登录再关注也可以，关注事件会补 `subscribed` 并按 unionid 配对。

---

### 7.1 员工：如何让系统拿到服务号 OpenID

员工**没有**网页授权。路径是：关注服务号 + 员工端小程序静默 `wx.login` 拿到 **unionid**，再和粉丝表配对。登录用的是手机号密码，**不会**把 `code` 发到居民登录接口。因此第四节开放平台必须先配好，否则 `code2session` 没有 unionid，绑定会失败（日志 `silent wechat bind skipped`，不挡进首页）。

1. PC **员工管理**已建档、在职；员工用这个手机号登录小程序（不是用运营邮箱）。  
2. 员工用**自己日常用的微信**（以后收派单通知的那只）打开微信，搜索并关注服务号「北京大洋云洁」。不要用别人的微信号。  
3. 同一只微信打开**员工端小程序**（体验版/正式版），手机号 + 密码登录。登录成功后会**自动**再取一次 `wx.login`（与登录请求不是同一个 code）发给 `POST /auth/worker-wechat-bind`。没有「绑定微信」按钮。  
4. 系统：`code2session`（员工端 AppID）→ 写入 `unionid` / `mp_openid` → 按 unionid 找到粉丝行 → 设置 `workerId`。之后派单模板的 `touser` 是这行的 `oa_openid`。  
5. 已写 unionid 但未关注：日志发信会 `reason=unsubscribed`，回去做第 2 步。关注事件也会按 unionid 补配对。  
6. 一只微信不要给多名员工登录：后绑的会报「该微信已绑定其他员工账号」，静默失败，不挡接单。换微信当前无解绑入口。

员工**不要**打开运营 H5 去做绑定，那是给 Admin 账号用的。

---

### 7.2 运营：如何让系统拿到服务号 OpenID

运营**不走小程序**。路径是：微信内打开运营 H5 → 邮箱登录 → 服务号 **snsapi_base 网页授权**，直接拿到服务号 OpenID，写入粉丝表的 `adminId`。不依赖开放平台 unionid。必须在 **微信内置浏览器**，PC Chrome / 企业微信里打开都不行。

1. PC **用户管理**已创建该运营、**启用**，并有保洁/废品订单权限（或超管）。短信另看手机号，和微信绑定无关。  
2. 用**自己要收通知的那只微信**关注服务号「北京大洋云洁」。  
3. **仍在这只微信里**打开运营 H5（不要先用系统浏览器登录再切微信）：  
   - 服务号自定义菜单「派单后台」，或  
   - 聊天里点链接 `https://h5.yunjiezhixiang.cn`  
4. 邮箱 + 密码登录（和 PC 后台同一套 Admin 账号）。  
5. 订单列表右上角点 **「绑定微信」** → 进入绑定页 → 点 **「在微信中授权绑定」**。系统会跳到微信授权页（静默 `snsapi_base`，一般无二次确认框）。  
6. 授权结束后回到绑定页。成功则粉丝表该 `oa_openid` 已带 `adminId`。若提示未关注，回去做第 2 步，否则下单/超时微信会 `reason=unsubscribed`。  
7. 若提示「请用微信打开本页」：当前不在微信内，不要继续。若提示「该微信已绑定其他运营账号」：一只微信只能绑一个 Admin，换号或换人。

运营**不要**去员工端小程序里点绑定，那会把微信挂到员工工号上。

---

### 7.3 居民（对照，下单通知用）

1. 关注同一服务号。  
2. 打开**居民端小程序**并完成微信登录（`POST /auth/wechat-login` 会尽量写入 unionid）。  
3. 若登录时还没有 unionid（存量会话），进入小程序后会**另取一次** `wx.login` 调 `POST /auth/resident-wechat-bind`，不换 token、不复用登录用过的 code。没有「绑定微信」按钮。  
4. 开放平台未把居民端小程序与服务号绑到同一账号时，没有 unionid，微信发不出，先做第四节。

---

### 7.4 怎么确认 OpenID 已经挂上（给运维，不是给一线抄）

不必把 openid 填进 `.env`。绑定成功后：

- 运营 H5 绑定页显示已绑定。员工/居民是静默绑定，界面没有「已绑定」开关。  
- `pm2 logs dayangyunjie-api`：关注有回调；`POST /auth/worker-wechat-bind` 或居民绑定/登录成功；真正发信时不应再出现 `reason=unbound`。  
- 核对库：`wechat_oa_followers` 中该人 `worker_id` / `resident_id` / `admin_id` 非空，`oa_openid` 有值，`subscribed=1`。

---

## 八、建议测试顺序（保洁或废品各走一遍）

### 8.0 联调时先开着 API 日志

发不出**不挡**下单 / 派单 / 接单，所以没收到时不要先猜代码坏了。SSH 到 ECS 开着日志，每走一步业务立刻对照：

```bash
pm2 logs dayangyunjie-api
```

只看跳过（推荐另开一个窗口）：

```bash
pm2 logs dayangyunjie-api --raw | grep --line-buffered -E 'wechat skip|sms skip|reason='
```

跳过行都会带 **`reason=`**。没有 `skip` 也不等于一定进了微信会话：还要看微信 `template/send`、阿里云短信是否报错。绑定失败常见 `silent wechat bind skipped`（员工/居民静默绑），那是登录阶段，还没到发信。

| `reason=` | 通道 | 含义 | 先做什么 |
|-----------|------|------|----------|
| `unbound` | 微信 | 粉丝表没挂上该居民 / 员工 / 运营 | 先关注再登录（或运营 H5 绑定）；核对 `wechat_oa_followers` |
| `unsubscribed` | 微信 | 已挂账号但已取关（`subscribed=false`） | 用同一只微信重新关注服务号 |
| `no_resident` | 微信 | 订单没有 `residentId`（代下单未绑居民） | 用居民端下单测居民微信；运营短信仍可能发 |
| `no_phone` | 短信 | 运营没填手机号，或订单/居民没有联系电话 | PC 补手机号；下单填真实 `contactPhone` |
| `no_credentials` | 微信或短信 | 服务号 AppID/Secret 未配，或短信 Key 仍是 `待补充` / 非 aliyun | 改 ECS `.env` 后 `pm2 restart` |
| `no_template` | 微信或短信 | 对应 `WECHAT_OA_TMPL_*` 或 `SMS_TMPL_*` 空 | 对照部署文档七条微信 + 六条短信 CODE |
| `no_h5_base` | 运营微信 | `WECHAT_ADMIN_H5_BASE_URL` 空或 `待补充` | 填 `https://h5.yunjiezhixiang.cn` 后重启 |
| `no_api_base` | 运营微信跳转 | `SERVER_BASE_URL` 未配 | 填 `https://api.yunjiezhixiang.cn` |
| `no_mp_appid` | 员工/居民微信跳转 | `WECHAT_WORKER_APPID` 或 `WECHAT_CUSTOMER_APPID` 空 | 配对应小程序 AppID（可先发模板、点不开详情） |
| `no_jump` | 微信 | 小程序跳转缺 appid 或 pagepath | 同上；一般伴随 `no_mp_appid` |
| `provider_error` | 短信 | 阿里云拒绝（签名、模板、资质、Key 错号） | 看同行 `code=` / `message=`；不要用 ECS 账号 Key |

**读日志时：** 接单运营无短信、完工/取消无短信、T-30 无微信，都是矩阵规定，日志里本来就不会给那条通道打发送。家政单全程不应出现通知 skip/send。

**一只微信 + 一个手机号可以全链路测，不是不行。** 系统允许同一服务号 OpenID 同时挂 `residentId`、`workerId`、`adminId`。做法：该微信先关注服务号 → 居民端登录 → 员工端用该工号登录 → 微信内 H5 用该运营账号绑定；PC 里运营、员工、下单联系电话都填**这一个号**。

预期（对照上面矩阵，不要以为「点一下会同时来 3 条角色模板」）：

| 你做的事 | 这只微信（服务号会话） | 这个手机号（短信） |
|----------|------------------------|--------------------|
| 居民下单 | 居民模板 + 运营模板（共 2 条） | 运营新单 1 条 |
| 运营派给自己的员工账号 | 员工派单模板 1 条 | 员工派单 1 条 |
| 员工接单 | 运营接单模板 + 居民接单模板（共 2 条） | 居民接单 1 条 |
| 完工 | 居民完工 1 条 | 无 |
| 居民取消 | 居民取消 1 条 | 无 |

点模板会分别进居民小程序 / 员工小程序 / 运营 H5，同一聊天里文案不同是正常的。短信会连着收到「发给运营的」和「发给员工/居民的」，看起来像重复，其实是不同模板。微信对同一 `touser` 短时间多条模板一般能送达；若偶发吞条，看 API 日志是否 `send` 成功。

三只微信、三个号对照更清晰，但**不是硬性要求**。不要用家政单验收。不要多名员工抢同一只微信登录（会冲突且无解绑）。

1. **只测短信**：Key 配好，账号有手机号，不绑微信也能测。居民下单 → 运营新单短信；派单 → 仅新员工短信；接单 → 居民短信（运营无接单短信）。T-30：约一个 30 分钟后的时段，居民/员工仅短信。超时 15 分钟仍 ASSIGNED → 该派单运营短信。  
2. **测居民微信**：7.3 后下单 / 接单 / 完工 / 居民取消。完工进评价页；居民取消无短信。运营取消不通知。  
3. **测员工微信**：7.1 后派单/改派，仅新员工；点开进任务详情（未登录会先登录再回跳）。  
4. **测运营微信**：7.2 后下单 / 接单（派单人）/ 超时。点模板应进对应订单详情（先登录会保留深链）。  
5. **家政单**：确认没有微信和短信。

---

## 九、常见「没收到」

| 现象 | 先查 |
|------|------|
| 所有微信都没有 | 服务号凭证、IP 白名单、模板 ID、回调是否启用、ECS 能否出网访问 `api.weixin.qq.com` |
| 有短信无微信 | 开着 `pm2 logs` 搜 `wechat skip` 与 `reason=`（`unbound` / `unsubscribed` / `no_h5_base` 最常见） |
| 有微信无短信 | 短信 Key / 签名未过审、手机号空、用了 ECS 账号 Key |
| 居民/员工绑定失败 | 两个小程序 Secret 是否反了；开放平台是否同一账号 |
| 运营绑定失败 | 是否微信内打开；网页授权域名是否为 `api.yunjiezhixiang.cn`；`SERVER_BASE_URL` 是否 API 域名 |
| 回调提交失败 | URL 必须 HTTPS；Token；Nginx `location /api/`；echostr 须纯文本 |
| 点运营消息进不了详情 | `SERVER_BASE_URL`、H5 必须在 `h5.` **根路径**（不要 `/admin/`）、是否登录后被丢 query |
| 下单来了 2 条微信 | 同一微信既是居民又是有权限运营时正常（见第八节） |
| 派单只来 1 条微信 | 正常，只发给新员工 |

---

## 十、和部署文档的分工

| 文档 | 做什么 |
|------|--------|
| [`Aliyun-ECS-Alinux4-Deploy.md`](./Aliyun-ECS-Alinux4-Deploy.md) | ECS、MySQL、Nginx、静态站、小程序打 API 域名 |
| 本文 | 微信后台、开放平台、短信账号、人员关注绑定、联调顺序 |
| [`wechat-notify-auth-roadmap.md`](../plan/wechat-notify-auth-roadmap.md) | 产品口径；文中过时句子以**当前代码 + 本文**为准 |
