# 服务人员多技能证书专项测试报告

## 1. 测试范围

- 需求：服务人员技能证书由单图扩展为多图，最多 9 张。
- 涉及端：管理端、服务端、员工端小程序。
- 数据兼容：保留 `skillCertUrl`，新增 `skillCertUrls` JSON 数组。
- 测试日期：2026-08-20。

## 2. 自动化测试结果

执行命令：

```bash
npm run test:worker --workspace=@dayangyunjie/server
```

结果：通过，1 个测试套件、14 个用例全部通过。

- AUT-01：新增员工不传技能证书，通过。
- AUT-02：新增 1 张证书，数组和旧单图字段同步写入，通过。
- AUT-03：新增 9 张证书，完整写入且旧字段保存首张，通过。
- AUT-04：旧客户端仅传 `skillCertUrl` 时自动生成数组，通过。
- AUT-05：编辑替换证书数组并同步首张，通过。
- AUT-06：编辑传空数组时同时清空新旧字段，通过。
- AUT-07：历史记录仅有旧字段时，详情回退为单元素数组，通过。
- AUT-08：新数组与旧字段并存时优先使用新数组，通过。
- AUT-09：异常 JSON 历史值安全回退旧字段，通过。
- AUT-10：未知 Prisma 异常保持原样抛出，通过。
- AUT-11：0、1、9 张 DTO 边界校验通过。
- AUT-12：10 张被 DTO 拒绝，通过。
- AUT-13：非数组、非字符串元素被拒绝，通过。
- AUT-14：无协议的非法 URL 被拒绝，通过。

## 3. 数据库与迁移验证

- DB-01：`prisma db push` 成功，MySQL `workers` 表新增 `skill_cert_urls` JSON 列。
- DB-02：Prisma Client 生成成功；后续 `db push` 自动生成阶段出现 Windows 文件占用提示，但不影响已完成的 schema 同步和此前成功生成的 Client。
- DB-03：首次执行历史数据回填脚本成功，`affectedRows=0`（当前库无待回填数据）。
- DB-04：再次执行回填脚本成功，`affectedRows=0`，验证脚本可重复执行。
- DB-05：服务层读取未回填的旧单图记录，自动返回单元素数组，已由 AUT-07 覆盖。

执行命令：

```bash
npm run prisma:generate --workspace=@dayangyunjie/server
npx prisma db push
npm run prisma:backfill-skill-certs --workspace=@dayangyunjie/server
```

## 4. API 与上传验证

- API-01：创建含 3 张证书的临时员工，响应同时返回 3 个 `skillCertUrls` 和首张 `skillCertUrl`，通过。
- API-02：查询该员工详情，3 张证书完整回显，通过。
- API-03：删除首张后保存，查询返回剩余 2 张且旧字段更新为新的首张，通过。
- API-04：提交 10 张证书返回 HTTP 400，提示最多 9 张，通过。
- API-05：上传合法 PNG 返回 HTTP 201、URL 和文件名，通过；测试文件已清理。
- API-06：上传 `text/plain` 返回 HTTP 400，通过。
- API-07：上传 11MB 图片返回 HTTP 413，通过。
- API-08：临时员工在测试结束后成功删除，测试数据已清理。

## 5. 管理端浏览器验收

- WEB-01：管理员登录及服务人员管理列表加载，通过。
- WEB-02：编辑无证书员工时显示“已上传 0/9 张”和继续上传入口，通过。
- WEB-03：3 张证书的员工详情显示 3 个独立缩略图节点，通过。
- WEB-04：编辑 3 张证书的员工时显示 3 个删除按钮，通过。
- WEB-05：删除 1 张并保存后，弹窗关闭且接口持久化为 2 张，通过。
- WEB-06：详情多图网格布局可见，通过。
- WEB-07：浏览器自动化环境禁止设置本地文件输入，未直接执行系统文件选择器；合法/非法/超大文件上传已由 API-05 至 API-07 验证，管理端上传逻辑已通过生产构建类型检查。
- WEB-08：上传中保存按钮禁用、一次多选、部分失败提示由代码路径和生产构建验证；需要人工使用系统文件选择器完成最终交互复核。

浏览器验证截图：

- 编辑表单 0/9 状态：`page-2026-08-20T03-55-13-030Z.png`
- 详情页 3 个证书节点：`page-2026-08-20T03-55-38-996Z.png`

## 6. 员工端与构建回归

- BUILD-01：服务端 `nest build` 通过。
- BUILD-02：管理端 `vue-tsc --noEmit && vite build` 通过。
- BUILD-03：员工端微信小程序 `uni build -p mp-weixin` 通过。
- BUILD-04：员工端点击技能证书时优先预览 `skillCertUrls` 全数组，旧单图回退路径完成编译。
- BUILD-05：健康证仍保持单图逻辑，完成编译。
- BUILD-06：员工端独立 `vue-tsc --noEmit` 未通过，错误均位于本次未修改的既有文件：
  - `src/api/request.ts`：重复声明及 `ImportMeta.env` 类型问题。
  - `src/pages/change-password/index.vue`：事件类型问题。
  - `src/pages/login/index.vue`：输入事件类型不匹配。
  - `src/pages/task-detail/index.vue`：联合类型与隐式 `any` 问题。

## 7. 全量服务端回归

全量 Jest 共执行 15 个套件、239 个已收集用例：

- 12 个套件通过。
- 237 个用例通过。
- 新增 Worker 专项套件 14/14 通过。
- 3 个既有套件未通过，与本需求无关：
  - `recycling-order.spec.ts` 仍使用已废弃的 `photoUrls` 测试字段，编译失败。
  - `cleaning-order-p2-5c.spec.ts` 仍使用已废弃的 `photoUrls` 测试字段，编译失败。
  - `complaint.spec.ts` 有 2 个既有断言预期 `$transaction` 被调用，与当前 service 实现不一致。

## 8. 发布前人工复核清单

- 在目标环境执行 schema 同步后，再执行历史数据回填脚本。
- 使用文件选择器一次选择 2 至 9 张真实图片，确认逐张上传及计数变化。
- 模拟其中一张上传失败，确认成功图片保留、失败数量提示正确。
- 上传至 9 张后确认继续上传入口隐藏；删除 1 张后入口恢复。
- 在微信开发者工具中登录员工端，确认多图左右切换预览。
- 确认生产环境已配置 `SERVER_BASE_URL`，避免图片 URL 指向 localhost。
