# 好好吃饭 · 私家菜谱

第一步：仅使用本地 Docker 的个人点菜本。React + TypeScript 前端、Node.js + Express API、PostgreSQL 数据库。原目录的 Django 项目不受影响。

## 启动

先打开 Docker Desktop，再在当前目录运行：

```bash
cd /Users/izzy/Desktop/study/foodie/recipe-app
docker compose up -d --build
```

电脑打开 http://localhost:8080 。首次构建需要网络下载镜像和 npm 包，之后运行页面不需要外部图片、字体或 CDN。

手机和电脑连接同一个 Wi-Fi，用手机浏览器打开 `http://电脑的局域网IP:8080`。可在 macOS「系统设置 → Wi-Fi → 详细信息 → TCP/IP」查看电脑 IP。电脑和 Docker 需要保持运行；访客 Wi-Fi 或防火墙可能阻止设备互访。

这是家庭局域网版本：尚未加入账号与权限，同一网络上能访问页面的人共享菜谱、留言和待做清单。不要直接映射到公网。

## 第一版功能

- 浏览所有菜谱，按分类筛选，按菜名或食材搜索。
- 添加菜名、分类、用时、介绍、食材和做法（每行一个步骤）。
- 查看做法和留言，填写名字后留言。
- 点击「想吃这道」加入共享待做清单；可以标记做好或取消。
- 同一道菜不能重复加入待做清单，做好后可以再点。
- 初始数据库为空；菜谱和留言真实存入 PostgreSQL。
- 手机与电脑适配，不安装本机 Node、npm 或 PostgreSQL。

当前版本不包含照片上传、登录、菜谱编辑删除、份数、历史菜单和自动跨设备刷新；其他设备修改后刷新页面查看。

## 常用命令

```bash
# 查看服务状态
docker compose ps
# 查看日志
docker compose logs --tail=100
# 暂停（保留容器与数据）
docker compose stop
# 恢复
docker compose start
# 删除容器与网络，保留数据库卷
docker compose down
# 修改代码后重新构建
docker compose up -d --build
# 后端输入校验测试
docker compose exec api npm test
# 接口集成检查（创建临时记录，结束后自动清理）
docker compose exec api node src/smoke.js
```

数据库放在 `postgres_data` 命名卷中，重建容器不会清空数据。`docker compose down -v` 会删除数据库，请不要日常使用。

## 配置

需要修改端口或数据库初始密码时，把 `.env.example` 复制为 `.env` 后修改，再重新启动。默认端口 8080。`BIND_ADDRESS=127.0.0.1` 可限制为仅本机访问（手机将无法访问）。PostgreSQL 的密码变量仅在第一次创建数据卷时初始化数据库账号；已有数据库修改密码需同步执行 SQL，不能只改 `.env`。

## 数据备份

```bash
docker compose exec -T db pg_dump -U foodie -d recipes > recipes-backup.sql
```

备份文件包含你的全部菜谱与留言，请妥善保管。

## 结构

- `frontend/src/main.tsx`：页面与交互。
- `frontend/src/style.css`：响应式样式。
- `frontend/nginx.conf`：静态页面和 `/api` 反向代理。
- `backend/src/server.js`：API、建表和数据库操作。
- `backend/src/validation.js`：输入校验。
- `compose.yaml`：三个服务和持久化数据卷。

浏览器统一访问 8080，Nginx 把 `/api` 请求转发给 Express；API 和数据库不向主机单独开放端口。构建期间 npm 依赖只安装进镜像，锁文件提交在项目里。后续加功能时再逐步拆分组件、迁移数据库和增加权限。
