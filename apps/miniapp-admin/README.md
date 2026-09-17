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

| 项 | 值 |
|----|-----|
| Nginx 静态目录 | `/var/www/dayangyunjie-miniapp-admin/` |
| 正式访问 | `https://h5.yunjiezhixiang.cn/`（HTTPS 通了之后） |
| 测试机过渡 | `http://118.195.149.50/admin/`（旧同域子路径，将废弃） |

正式托管在独立主机 **`h5.yunjiezhixiang.cn` 根路径**，当前生产默认 `vite base=/`。腾讯云单 IP 旧测试环境构建时显式设置 `VITE_PUBLIC_BASE=/admin/`，本地 `dev` 仍为 `/`。  
API 正式基址 `https://api.yunjiezhixiang.cn/api/v1`。PC 管理端是 `https://admin.yunjiezhixiang.cn/`，不要和本 H5 混淆。

测试机装机、Nginx 与发版见 [`docs/TencentCloud-Test-Deploy.md`](../../docs/TencentCloud-Test-Deploy.md) 6.5 节、[`docs/Remote-Server-Update.md`](../../docs/Remote-Server-Update.md) 第三节。  
若前后端不同域，构建前配置 `VITE_API_BASE`，并保证服务端 `CORS_ORIGIN` 允许该域名。
