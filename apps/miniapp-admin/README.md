# 管理端 H5（uni-app）

保洁 / 废品订单查看与派单。账号为系统「用户管理」中的 Admin（邮箱 + 密码）。

## 开发

1. 启动后端：`npm run dev`（默认 `http://127.0.0.1:3000`）
2. 启动本端：`npm run dev:miniapp-admin` → [http://localhost:5176/](http://localhost:5176/)
3. H5 开发请求走 Vite 代理 `/api/v1 → 127.0.0.1:3000`

## 生产构建

```bash
npm run build:h5 --workspace=@dayangyunjie/miniapp-admin
# 或根目录：npm run build:miniapp-admin
```

产物目录：`apps/miniapp-admin/dist/build/h5`（hash 路由）。

部署建议：同域 Nginx 托管静态资源，并将 `/api/v1` 反代到 Nest；若前后端不同域，构建前配置 `VITE_API_BASE`，并保证服务端 `CORS_ORIGIN` 允许该域名。
