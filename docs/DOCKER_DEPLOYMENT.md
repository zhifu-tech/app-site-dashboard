# Docker 部署指南

本文档详细说明如何使用 Docker 方式将 `site-dashboard` 部署到服务器。

## 目录

- [前置条件](#前置条件)
- [部署流程](#部署流程)
- [配置说明](#配置说明)
- [验证部署](#验证部署)
- [更新和回滚](#更新和回滚)
- [故障排查](#故障排查)
- [常见问题](#常见问题)

## 前置条件

### 1. 服务器要求

- **操作系统**：Linux（推荐 Ubuntu 20.04+ 或 CentOS 7+）
- **Docker**：已安装 Docker Engine 20.10+ 或 Docker CE
- **Docker Compose**（可选）：用于本地调试
- **网络**：服务器可以访问外网（用于拉取 Docker 镜像）
- **端口**：确保 80 端口未被占用（或使用其他端口）

### 2. 本地环境要求

- **Docker**：已安装 Docker Desktop 或 Docker Engine
- **SSH 访问**：可以 SSH 连接到服务器
- **SSH 密钥**：已配置 SSH 密钥认证（推荐）

### 3. 检查服务器 Docker 环境

在服务器上执行以下命令检查 Docker 是否已安装：

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker 服务状态
systemctl status docker

# 如果没有安装，安装 Docker（Ubuntu/Debian）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker
```

### 4. 配置 SSH 密钥（如果未配置）

如果还没有配置 SSH 密钥，需要先配置：

```bash
# 在本地生成 SSH 密钥（如果还没有）
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_site_dashboard

# 将公钥复制到服务器
ssh-copy-id -i ~/.ssh/id_rsa_site_dashboard.pub root@8.138.183.116

# 测试 SSH 连接（应该不需要密码）
ssh -i ~/.ssh/id_rsa_site_dashboard root@8.138.183.116
```

## 部署流程

### 方式一：使用部署脚本（推荐）

这是最简单的方式，脚本会自动完成所有步骤：

```bash
# 1. 进入项目目录
cd /path/to/site-dashboard

# 2. 确保脚本有执行权限
chmod +x ./scripts/site-dashboard.sh

# 3. 执行 Docker 部署命令
./scripts/site-dashboard.sh docker-deploy
```

**脚本会自动执行以下操作：**

1. ✅ 在本地构建 Docker 镜像
2. ✅ 将镜像导出为压缩文件
3. ✅ 上传镜像文件到服务器
4. ✅ 在服务器上加载镜像
5. ✅ 停止并删除旧容器（如果存在）
6. ✅ 启动新容器
7. ✅ 清理临时文件

### 方式二：手动部署

如果需要更多控制，可以手动执行每个步骤：

#### 步骤 1: 构建 Docker 镜像

在本地项目目录执行：

```bash
cd /path/to/site-dashboard

# 构建镜像
docker build -t site-dashboard:latest .

# 验证镜像
docker images | grep site-dashboard
```

#### 步骤 2: 导出镜像

```bash
# 导出镜像为 tar.gz 文件
docker save site-dashboard:latest | gzip > site-dashboard-image.tar.gz

# 检查文件大小（通常几十到几百 MB）
ls -lh site-dashboard-image.tar.gz
```

#### 步骤 3: 上传镜像到服务器

```bash
# 使用 scp 上传（需要配置 SSH 密钥）
scp -i ~/.ssh/id_rsa_site_dashboard \
    site-dashboard-image.tar.gz \
    root@8.138.183.116:/tmp/

# 或者使用部署脚本中配置的 SSH 别名
scp site-dashboard-image.tar.gz site-dashboard-server:/tmp/
```

#### 步骤 4: 在服务器上加载并运行

SSH 连接到服务器：

```bash
ssh -i ~/.ssh/id_rsa_site_dashboard root@8.138.183.116
# 或使用别名
ssh site-dashboard-server
```

在服务器上执行：

```bash
# 1. 加载镜像
docker load < /tmp/site-dashboard-image.tar.gz

# 2. 停止并删除旧容器（如果存在）
docker stop site-dashboard 2>/dev/null || true
docker rm site-dashboard 2>/dev/null || true

# 3. 运行新容器
docker run -d \
  --name site-dashboard \
  --restart unless-stopped \
  -p 80:80 \
  site-dashboard:latest

# 4. 验证容器运行状态
docker ps | grep site-dashboard

# 5. 查看容器日志
docker logs site-dashboard

# 6. 清理临时文件
rm -f /tmp/site-dashboard-image.tar.gz
```

## 配置说明

### 1. 修改 API 地址

在部署前，需要确保前端配置了正确的 API 地址。

**修改 `js/config/config.js`：**

```javascript
export const config = {
  // 生产环境 API 地址
  apiBaseUrl: 'https://api.zhifu.tech/api', // 替换为实际的后端 API 地址
};
```

**或者修改 `index.html`：**

```html
<script data-api-base="https://api.zhifu.tech/api" src="js/main.js" type="module"></script>
```

### 2. 端口配置

默认情况下，容器映射到主机的 80 端口。如果需要使用其他端口：

```bash
docker run -d \
  --name site-dashboard \
  --restart unless-stopped \
  -p 8082:80 \  # 映射到 8082 端口
  site-dashboard:latest
```

### 3. 容器重启策略

容器使用 `--restart unless-stopped` 策略，这意味着：
- ✅ 容器异常退出时自动重启
- ✅ 服务器重启后自动启动容器
- ✅ 手动停止容器后不会自动启动

### 4. 使用 Docker Compose（可选）

如果需要更复杂的配置，可以创建 `docker-compose.prod.yml`：

```yaml
version: '3.8'

services:
  site-dashboard:
    image: site-dashboard:latest
    container_name: site-dashboard
    ports:
      - "80:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

然后使用：

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 验证部署

### 1. 检查容器状态

```bash
# 在服务器上执行
docker ps | grep site-dashboard

# 应该看到类似输出：
# CONTAINER ID   IMAGE                  STATUS         PORTS                NAMES
# abc123def456   site-dashboard:latest  Up 5 minutes   0.0.0.0:80->80/tcp   site-dashboard
```

### 2. 检查容器日志

```bash
# 查看实时日志
docker logs -f site-dashboard

# 查看最近 100 行日志
docker logs --tail=100 site-dashboard
```

### 3. 检查端口监听

```bash
# 检查 80 端口是否被监听
netstat -tlnp | grep :80
# 或
ss -tlnp | grep :80

# 应该看到类似输出：
# tcp  0  0.0.0.0:80  0.0.0.0:*  LISTEN  12345/docker-proxy
```

### 4. 测试 HTTP 访问

```bash
# 在服务器上测试
curl http://localhost/

# 应该返回 HTML 内容

# 从外部测试（替换为实际域名或 IP）
curl http://8.138.183.116/
curl https://site-dashboard.zhifu.tech/
```

### 5. 浏览器访问测试

在浏览器中访问：
- `http://8.138.183.116/`（如果使用 IP）
- `https://site-dashboard.zhifu.tech/`（如果配置了域名）

**检查项：**
- ✅ 页面正常加载
- ✅ 样式文件正常加载
- ✅ JavaScript 文件正常加载
- ✅ API 请求成功（打开浏览器开发者工具，查看 Network 标签）
- ✅ 站点数据正常显示

### 6. 健康检查

容器内置了健康检查，可以查看健康状态：

```bash
docker inspect site-dashboard | grep -A 10 Health
```

## 更新和回滚

### 更新部署

当需要更新应用时，只需重新执行部署流程：

```bash
# 方式一：使用脚本（推荐）
./scripts/site-dashboard.sh docker-deploy

# 方式二：手动更新
# 1. 构建新镜像
docker build -t site-dashboard:latest .

# 2. 导出并上传（参考上面的步骤）
# ...

# 3. 在服务器上重新加载和运行
ssh site-dashboard-server
docker load < /tmp/site-dashboard-image.tar.gz
docker stop site-dashboard
docker rm site-dashboard
docker run -d --name site-dashboard --restart unless-stopped -p 80:80 site-dashboard:latest
```

### 回滚到旧版本

如果需要回滚到之前的版本：

```bash
# 1. 查看可用的镜像标签
docker images | grep site-dashboard

# 2. 如果有旧版本的镜像，直接使用
docker stop site-dashboard
docker rm site-dashboard
docker run -d --name site-dashboard --restart unless-stopped -p 80:80 site-dashboard:v1.0.0

# 3. 如果没有旧版本镜像，需要重新构建或从备份恢复
```

**建议：** 在每次部署时给镜像打标签，方便回滚：

```bash
# 构建时打标签
docker build -t site-dashboard:v1.0.1 -t site-dashboard:latest .

# 部署时使用标签
docker run -d --name site-dashboard --restart unless-stopped -p 80:80 site-dashboard:v1.0.1
```

## 故障排查

### 1. 容器无法启动

**检查容器日志：**

```bash
docker logs site-dashboard
```

**常见原因：**
- 端口被占用：`Error: bind: address already in use`
- 镜像不存在：`Error: No such image`
- 权限问题：`Permission denied`

**解决方案：**

```bash
# 检查端口占用
netstat -tlnp | grep :80
# 或使用其他端口
docker run -d --name site-dashboard -p 8082:80 site-dashboard:latest

# 检查镜像是否存在
docker images | grep site-dashboard

# 检查 Docker 服务状态
systemctl status docker
```

### 2. 页面无法访问

**检查步骤：**

```bash
# 1. 检查容器是否运行
docker ps | grep site-dashboard

# 2. 检查端口映射
docker port site-dashboard

# 3. 检查防火墙规则
iptables -L -n | grep 80
# 或
firewall-cmd --list-all

# 4. 检查 Nginx 配置（如果使用 Nginx 反向代理）
nginx -t
```

**解决方案：**

```bash
# 开放防火墙端口（CentOS/RHEL）
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --reload

# 或使用 iptables（Ubuntu/Debian）
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
```

### 3. API 请求失败

**检查项：**

1. **API 地址配置是否正确**
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签中的 API 请求
   - 检查请求 URL 是否正确

2. **CORS 问题**
   - 确保后端服务器配置了正确的 CORS 头
   - 检查浏览器控制台的错误信息

3. **网络连接**
   ```bash
   # 在容器内测试 API 连接
   docker exec site-dashboard wget -O- http://api-server:3002/api/health
   ```

### 4. 容器频繁重启

**检查容器退出原因：**

```bash
# 查看容器退出状态
docker inspect site-dashboard | grep -A 5 State

# 查看完整日志
docker logs site-dashboard
```

**常见原因：**
- 健康检查失败
- 应用崩溃
- 资源不足（内存、CPU）

**解决方案：**

```bash
# 临时禁用健康检查进行调试
docker run -d --name site-dashboard-test \
  --restart unless-stopped \
  -p 8082:80 \
  --health-cmd="echo OK" \
  --health-interval=30s \
  site-dashboard:latest

# 检查系统资源
free -h
df -h
```

### 5. 镜像加载失败

**错误信息：** `Error loading image: open /tmp/xxx.tar.gz: no such file or directory`

**解决方案：**

```bash
# 检查文件是否存在
ls -lh /tmp/site-dashboard-image.tar.gz

# 检查文件完整性
file /tmp/site-dashboard-image.tar.gz

# 重新上传文件
scp site-dashboard-image.tar.gz site-dashboard-server:/tmp/
```

## 常见问题

### Q1: Docker 镜像太大，上传很慢怎么办？

**解决方案：**

1. **使用多阶段构建优化镜像大小**
   - 当前 Dockerfile 已经使用 `nginx:alpine` 基础镜像，体积较小

2. **使用 Docker Registry**
   ```bash
   # 推送到私有或公共 Registry
   docker tag site-dashboard:latest your-registry.com/site-dashboard:latest
   docker push your-registry.com/site-dashboard:latest
   
   # 在服务器上拉取
   docker pull your-registry.com/site-dashboard:latest
   ```

3. **使用 rsync 代替 scp**（如果服务器支持）
   ```bash
   rsync -avz --progress site-dashboard-image.tar.gz root@8.138.183.116:/tmp/
   ```

### Q2: 如何查看容器资源使用情况？

```bash
# 查看容器资源使用
docker stats site-dashboard

# 查看容器详细信息
docker inspect site-dashboard
```

### Q3: 如何进入容器内部调试？

```bash
# 进入容器 shell
docker exec -it site-dashboard /bin/sh

# 在容器内执行命令
docker exec site-dashboard ls -la /usr/share/nginx/html
docker exec site-dashboard cat /etc/nginx/conf.d/default.conf
```

### Q4: 如何备份容器数据？

由于当前应用是静态文件，数据通过 API 获取，不需要备份容器数据。如果需要备份配置：

```bash
# 导出容器配置
docker inspect site-dashboard > site-dashboard-config.json

# 保存镜像
docker save site-dashboard:latest | gzip > backup/site-dashboard-$(date +%Y%m%d).tar.gz
```

### Q5: 如何配置 HTTPS？

当前 Docker 容器只提供 HTTP 服务。如果需要 HTTPS，有两种方案：

**方案 1: 使用 Nginx 反向代理（推荐）**

在服务器上配置 Nginx 作为反向代理，处理 SSL：

```nginx
server {
    listen 443 ssl http2;
    server_name site-dashboard.zhifu.tech;
    
    ssl_certificate /etc/nginx/ssl/site-dashboard.zhifu.tech_bundle.crt;
    ssl_certificate_key /etc/nginx/ssl/site-dashboard.zhifu.tech.key;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**方案 2: 在容器内配置 SSL**

修改 Dockerfile，将 SSL 证书复制到容器内，并配置 Nginx 使用 HTTPS。

### Q6: 如何与 site-dashboard-server 配合部署？

`site-dashboard` 前端需要 `site-dashboard-server` 后端 API 服务。部署顺序：

1. **先部署后端服务**（`site-dashboard-server`）
   - 确保后端服务正常运行
   - 记录后端 API 地址（如 `http://8.138.183.116:3002/api`）

2. **配置前端 API 地址**
   - 修改 `js/config/config.js` 中的 `apiBaseUrl`
   - 或修改 `index.html` 中的 `data-api-base` 属性

3. **部署前端服务**（`site-dashboard`）
   - 使用 Docker 部署前端
   - 确保前端可以访问后端 API

4. **验证**
   - 访问前端页面
   - 检查浏览器 Network 标签，确认 API 请求成功

## 总结

Docker 部署的优势：
- ✅ **环境一致性**：开发、测试、生产环境完全一致
- ✅ **快速部署**：一键构建、上传、运行
- ✅ **易于回滚**：可以快速切换到之前的版本
- ✅ **资源隔离**：容器化部署，不影响主机环境
- ✅ **自动重启**：容器异常退出时自动重启

部署流程总结：
1. 构建镜像：`docker build -t site-dashboard:latest .`
2. 导出镜像：`docker save site-dashboard:latest | gzip > image.tar.gz`
3. 上传镜像：`scp image.tar.gz server:/tmp/`
4. 加载运行：`docker load < /tmp/image.tar.gz && docker run ...`

**推荐使用部署脚本**：`./scripts/site-dashboard.sh docker-deploy`，自动完成所有步骤。
