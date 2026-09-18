# C. 微信 + 短信订单通知 — 代码更新步骤

> 存放位置：仓库根目录 [`plan/`](./)  
> 日期：2026-08-27；修订：2026-09-14 从 [`code-update-steps.md`](./code-update-steps.md) 拆出为独立工作。六条阿里云短信 CODE 入案；签名**北京大洋云洁**；短信与 ECS **不同阿里云账号**；域名已备案阶段 1 卡 HTTPS；T-30 仅短信；矩阵与 C6t。2026-09-08 C4w/C4r/C4a。  
> 性质：**分步改代码手册**（口径以方案原文为准；本文只写改哪些文件、按什么顺序做）  
> 对应方案：[`wechat-notify-auth-roadmap.md`](./wechat-notify-auth-roadmap.md)  
> 与其他工作：**独立**。不依赖 A / B；做本主题时不要顺手改预约校验或业务字典。

---

## 给执行本文的 AI（硬规则）

1. **产品口径以** [`wechat-notify-auth-roadmap.md`](./wechat-notify-auth-roadmap.md) **为准**。本文与原文冲突时，停下来问，不要自行发明规则。  
2. **一次只做一步。** 用户说「按 C 做 / 做下一步」且未指定步号 → 从尚未完成的**最小一步**做起（阶段 0 顺序见下），做完汇报验收，等下一轮。  
3. **禁止跨步、禁止跨主题。** 不要顺手做 A 预约或 B 字典。阶段 1 步不要在 HTTPS 未通时做。  
4. 某步已验收 → 不要重做。阶段 0 做完且阶段 1 前置未齐 → 停，说明须等 B8 HTTPS + B4。三阶段都做完 → 停，回复：C 主题步骤均已落地。  
5. **不要提交 `.env`、密钥、本机 appid。** 只改 `.env.example` 和代码读取逻辑。  
6. 发送类逻辑失败只打日志，**不阻断**下单 / 派单 / 接单 / 完成。居民未关注导致发不出，按跳过处理，不是故障。未配凭证则跳过发送，不抛垮业务。

---

## 口径摘要

未配凭证则跳过发送，不抛垮业务。

> **⚠️ 域名 yunjiezhixiang.cn 已备案，HTTPS 未切完。** 按方案 **§F** + 矩阵：
>
> - **阶段 0：** C1 → C2 → C3 → C4w → C4r → **C6**（NotifyService+短信骨架）→ C6a 派单 → C6b 接单 → C6c 完工 → C6d 取消 → **C6t** 定时 → C8 → C8b  
> - **阶段 1（SSL + 网页授权域名配齐后）：** C4a → C5（下单运营微信+居民下单微信可提前在 0）→ C5r → C7  
> - **阶段 2：** C9  
>
> 下单→居民微信、派单/接单/完工/取消不依赖 H5 基址；运营微信依赖 `https://h5.yunjiezhixiang.cn/`。短信与微信以事件矩阵为准（T-30 仅短信）。

通道：服务号模板 + 短信（都发，非补发）。保洁/废品；家政不发。口径见 roadmap 事件矩阵。

绑定见 roadmap **§E**。模板 ID / `SMS_*` 全在 `.env`。短信：**阿里云**；AccessKey 取自**短信阿里云账号**（与 ECS 服务器账号不同，见 roadmap §S）。

**开工前后台：** 开放平台绑定、关联小程序、IP 白名单（阿里云 ECS 出口）、主路径模板已选；T-30 **不申请**服务号模板（仅短信）；短信资质在**短信账号**控制台后补。

---

## C1 环境变量读取

改 [`.env.example`](../.env.example) 与 [`env-config.service.ts`](../apps/server/src/common/config/env-config.service.ts)，增加方案 §D 全部键。**不要**加 `WECHAT_OA_TMPL_REMINDER_*`。短信：`SMS_PROVIDER=aliyun`，AccessKey，`SMS_SIGN_NAME=北京大洋云洁`，六条 `SMS_TMPL_*` CODE 见 roadmap 契约（居民接单 `SMS_512135723`、员工派单 `SMS_512035746` 等）。服务名变量统一 `serviceName`；`appointTime`=`YYYY年MM月DD日hh:mm`；员工 T-30 模板无变量。开关同前。`WECHAT_ADMIN_H5_BASE_URL` 空或「待补充」→ 跳过运营微信。

**勿**提交真实 Secret。

**验收：** 缺凭证能起服；不混用员工/居民 Secret。

---

## C2 粉丝表 + OAuth state + Worker/Resident.unionid

（同前：粉丝表、OAuth state、unionid；绑定与 subscribed 解耦。）

另：定时幂等建议新增 `notify_send_logs`（或等价）唯一键：`event + orderType + orderId + channel + recipientKey`，供 C6t 使用；可与本步同迁或 C6t 再迁。

---

## C3 服务号回调 + OA 服务

（同前：plain 回调、echostr 原文、三条 path 分开。）另建 `SmsService` 骨架：读阿里云 `SMS_*`（账号 B AccessKey），未配则 no-op。

短信走**阿里云 Dysmsapi**，Node/TypeScript 官方示例：

- 文档：[TypeScript/Node.js SDK 调用示例](https://help.aliyun.com/zh/sms/developer-reference/using-typescript-openapi-example)
- 安装：`npm install @alicloud/dysmsapi20170525`（按该文引入 `@alicloud/openapi-client` 等配套包）
- 凭证：用本项目 `.env` 的 `SMS_ACCESS_KEY_ID` / `SMS_ACCESS_KEY_SECRET`（**短信账号 B**），不要改成文档示例里的 `ALIBABA_CLOUD_*` / `ACCESS_KEY_*`，以免和 ECS 账号混用。
- `SendSms`：`phoneNumbers`、`signName`（`SMS_SIGN_NAME`）、`templateCode`、`templateParam`（JSON 字符串）。失败只打日志，不抛垮业务。

---

## C4w / C4r / C4a

（同前，不改绑定语义。）

- **C4w**（阶段 0）：员工 unionid 绑定  
- **C4r**（阶段 0）：居民 unionid + 回填  
- **C4a**（阶段 1）：运营网页授权（须 B8 HTTPS + B4；H5=`https://h5.yunjiezhixiang.cn/`；授权域名=`api.yunjiezhixiang.cn`）

---

## C6 NotifyService 骨架（阶段 0）

新建 `NotifyService`：组装微信 data（契约表关键词）、调用 OA template/send + SmsService；`Promise.allSettled`；服务名 `保洁服务-` / `废品回收-`；`thing` 按 20 字截断；`time*` **按模板分格式**（见 roadmap「`time*` 格式与地址截断」），禁止统一成一种。

---

## C6a 派单/改派 → 员工

`assign` / `reassign` 成功后：仅新员工微信+短信。不通知原员工。

---

## C6b 接单 → 派单运营 + 居民

`accept` 成功后：从 `OrderStatusLog` 取最近 ADMIN→ASSIGNED 的运营发微信（无短信）；居民微信+短信。同一模板 `WECHAT_OA_TMPL_ACCEPTED`；员工姓名与电话填接单员工。不通知员工。

---

## C6c 完工 → 居民

`complete` 成功后：居民微信，pagepath=`pages/review/index?orderId=&orderType=`。无短信。

---

## C6d 居民取消 → 居民

居民 `cancel` 成功后：居民微信。无短信。不论运营取消路径。

---

## C6t 定时：超时 15 分钟 + 开始前 30 分钟（仅短信）

- Cron/间隔扫描。超时：仍 ASSIGNED 且距最近派单/改派 ≥15min → 该运营微信+短信；`const2`=「服务人员接单超时」。  
- T-30：预约整点−30min 窗口且非 IN_SERVICE → 居民**仅短信**；有 worker 则员工**仅短信**。**不发**服务号微信。短信空则跳过。  
- 必须写发送记录防重复。

---

## C5 下单 → 居民 + 运营批

`create` 成功后：居民微信 `ORDER_CREATED_RESIDENT`；运营批微信（基址空跳过）+ 短信。可与阶段 0 同做居民侧，运营微信等基址。

---

## C5r / C7 / C8 / C8b / C9

（中转、H5 深链、员工/居民深链、日志与幂等：同前口径，C9 含短信 skip reason。）

- **C8**（阶段 0）：员工深链  
- **C8b**（阶段 0）：居民深链  
- **C5r**（阶段 1）：点击中转 302  
- **C7**（阶段 1）：H5 深链  
- **C9**（阶段 2）：引导与日志

---

## 步号速查

| 步 | 批次 | 做什么 |
|----|------|--------|
| C1 | 阶段 0 | env（微信模板 + SMS 占位） |
| C2 | 阶段 0 | 粉丝表 + unionid（+ 可选发送日志表） |
| C3 | 阶段 0 | OA 回调 + SmsService 骨架 |
| C4w | 阶段 0 | 员工 unionid 绑定 |
| C4r | 阶段 0 | 居民 unionid + 回填 |
| C6 | 阶段 0 | NotifyService 骨架 |
| C6a | 阶段 0 | 派单/改派 → 新员工 |
| C6b | 阶段 0 | 接单 → 派单运营 + 居民 |
| C6c | 阶段 0 | 完工 → 居民评价页 |
| C6d | 阶段 0 | 居民取消 → 居民 |
| C6t | 阶段 0 | 超时 15min（微信+短信）+ T-30 仅短信 |
| C8 | 阶段 0 | 员工深链 |
| C8b | 阶段 0 | 居民深链 |
| C5 | 阶段 0/1 | 下单 → 居民 + 运营批 |
| C4a | 阶段 1 | 运营网页授权 |
| C5r | 阶段 1 | 点击中转 302 |
| C7 | 阶段 1 | H5 深链 |
| C9 | 阶段 2 | 引导与日志 |

**阶段 0：** C1 → C2 → C3 → C4w → C4r → C6 → C6a → C6b → C6c → C6d → C6t → C8 → C8b（C5 居民侧可穿插）。  
**阶段 1：** C4a → C5r → C7（须 B8 HTTPS + B4；H5=`https://h5.yunjiezhixiang.cn/`；PC=`https://admin.yunjiezhixiang.cn/`；API=`https://api.yunjiezhixiang.cn`）。

用户指定步号时只做该步。旧「C4」「C6」已拆分，有歧义先问清。
