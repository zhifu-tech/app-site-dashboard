# 多应用部署指南

当在同一台服务器上部署多个 Web 应用时，需要特别注意端口管理和 Nginx 配置。

## 问题说明

### 常见问题

1. **端口冲突**：多个应用都想使用 80/443 端口
2. **平台不匹配警告**：在 ARM64 (M1/M2 Mac) 上构建的镜像在 AMD64 服务器上运行
3. **资源竞争**：多个容器竞争系统资源

## 解决方案

### 架构设计

推荐使用 **Nginx 反向代理** 架构：

```
Internet
   ↓
Nginx (80/443) ← 统一入口
   ↓
   ├─→ Docker Container 1 (127.0.0.1:8082) - site-dashboard
   ├─→ Docker Container 2 (127.0.0.1:8081) - book-excerpt
   └─→ Docker Container 3 (127.0.0.1:3002) - site-dashboard-server (API)
```

### 端口分配策略

| 应用 | 容器内部端口 | 主机映射 | 说明 |
|------|------------|---------|------|
| site-dashboard (前端) | 80 | 127.0.0.1:8082 | 仅本地访问，通过 Nginx 代理 |
| site-dashboard-server (API) | 3002 | 127.0.0.1:3002 | API 服务，可通过 Nginx 代理或直接访问 |
| book-excerpt (前端) | 80 | 127.0.0.1:8081 | 仅本地访问，通过 Nginx 代理 |
| Nginx | 80/443 | 0.0.0.0:80/443 | 统一入口，反向代理到各个容器 |

**原则**：
- ✅ 容器端口映射到 `127.0.0.1`（仅本地访问），避免端口冲突
- ✅ 使用不同的内部端口（8082, 8081, 3002 等）
- ✅ Nginx 监听 `0.0.0.0:80/443`，作为统一入口

## 部署步骤

### 1. 部署 site-dashboard-server (API)

```bash
cd site-dashboard-server
./scripts/site-dashboard-server.sh docker-deploy
```

**容器配置**：
- 端口映射：`127.0.0.1:3002:3002`
- 平台：`linux/amd64`
- 数据卷：`/opt/site-dashboard-server/data:/app/data`

### 2. 部署 site-dashboard (前端)

```bash
cd site-dashboard
./scripts/site-dashboard.sh docker-deploy
```

**容器配置**：
- 端口映射：`127.0.0.1:8082:80`
- 平台：`linux/amd64`
- 注意：使用内部端口 8082，避免与 80 端口冲突

### 3. 配置 Nginx 反向代理

#### 方案 A: 使用域名区分（推荐）

**site-dashboard.nginx.docker.conf**：
```nginx
server {
    listen 80;
    server_name site-dashboard.zhifu.tech;
    
    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**book-excerpt.nginx.conf**：
```nginx
server {
    listen 80;
    server_name book-excerpt.zhifu.tech;
    
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 方案 B: 使用路径区分

```nginx
server {
    listen 80;
    server_name zhifu.tech;
    
    # site-dashboard
    location /dashboard/ {
        proxy_pass http://127.0.0.1:8082/;
        proxy_set_header Host $host;
    }
    
    # book-excerpt
    location /book/ {
        proxy_pass http://127.0.0.1:8081/;
        proxy_set_header Host $host;
    }
    
    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3002/api/;
        proxy_set_header Host $host;
    }
}
```

### 4. 更新 Nginx 配置

```bash
# 上传 Nginx 配置
scp scripts/site-dashboard.nginx.docker.conf root@server:/etc/nginx/conf.d/site-dashboard.conf

# 测试配置
ssh root@server "nginx -t"

# 重新加载 Nginx
ssh root@server "systemctl reload nginx"
```

## 平台不匹配问题

### 问题

在 macOS (ARM64/M1/M2) 上构建的镜像，在 AMD64 服务器上运行会出现警告：
```
WARNING: The requested image's platform (linux/arm64) does not match the detected host platform (linux/amd64/v4)
```

### 解决方案

**已自动处理**：部署脚本会在构建和运行容器时自动指定 `--platform linux/amd64`。

**手动指定平台**：
```bash
# 构建时指定
docker build --platform linux/amd64 -t site-dashboard:latest .

# 运行时指定
docker run --platform linux/amd64 -d --name site-dashboard -p 127.0.0.1:8082:80 site-dashboard:latest
```

## 端口冲突排查

### 检查端口占用

```bash
# 检查 80 端口
netstat -tlnp | grep :80
# 或
ss -tlnp | grep :80

# 检查所有 Docker 容器端口映射
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### 解决端口冲突

1. **停止占用端口的容器**：
   ```bash
   docker stop <container-name>
   ```

2. **使用不同的端口**：
   ```bash
   # 修改部署脚本中的端口映射
   -p 127.0.0.1:8082:80  # site-dashboard
   -p 127.0.0.1:8081:80  # book-excerpt
   ```

3. **确保 Nginx 配置正确**：
   ```bash
   # 检查 Nginx 是否监听 80 端口
   netstat -tlnp | grep nginx.*:80
   
   # 检查 Nginx 配置
   nginx -t
   ```

## 验证部署

### 1. 检查容器状态

```bash
# 查看所有运行中的容器
docker ps

# 应该看到类似输出：
# CONTAINER ID   IMAGE                        PORTS
# abc123        site-dashboard:latest        127.0.0.1:8082->80/tcp
# def456        site-dashboard-server:latest  127.0.0.1:3002->3002/tcp
# ghi789        book-excerpt:latest           127.0.0.1:8081->80/tcp
```

### 2. 测试本地访问

```bash
# 测试前端（应该返回 HTML）
curl http://127.0.0.1:8082/

# 测试 API（应该返回 JSON）
curl http://127.0.0.1:3002/api/health
```

### 3. 测试 Nginx 代理

```bash
# 通过域名访问（应该返回 HTML）
curl -H "Host: site-dashboard.zhifu.tech" http://localhost/

# 或直接访问（如果配置了域名解析）
curl http://site-dashboard.zhifu.tech/
```

### 4. 检查日志

```bash
# 容器日志
docker logs site-dashboard
docker logs site-dashboard-server

# Nginx 日志
tail -f /var/log/nginx/site-dashboard-access.log
tail -f /var/log/nginx/site-dashboard-error.log
```

## 最佳实践

### 1. 端口管理

- ✅ **使用内部端口**：容器映射到 `127.0.0.1`，避免外部直接访问
- ✅ **统一入口**：Nginx 监听 `0.0.0.0:80/443`，作为统一入口
- ✅ **端口规划**：提前规划端口分配，避免冲突

### 2. 容器命名

- ✅ **使用有意义的名称**：`site-dashboard`, `site-dashboard-server`
- ✅ **保持一致性**：所有相关容器使用统一命名规范

### 3. 数据持久化

- ✅ **使用数据卷**：重要数据挂载到主机目录
- ✅ **备份策略**：定期备份数据卷

### 4. 监控和日志

- ✅ **集中日志**：使用统一的日志目录
- ✅ **健康检查**：配置容器健康检查
- ✅ **资源监控**：监控容器资源使用情况

### 5. 安全考虑

- ✅ **最小权限**：容器以非 root 用户运行（如果可能）
- ✅ **网络隔离**：使用 Docker 网络隔离容器
- ✅ **SSL/TLS**：使用 HTTPS 加密通信

## 故障排查

### 问题 1: 容器无法启动（端口被占用）

**错误信息**：
```
Error: bind: address already in use
```

**解决方案**：
1. 检查端口占用：`netstat -tlnp | grep :80`
2. 停止占用端口的进程或容器
3. 使用不同的端口映射

### 问题 2: Nginx 502 Bad Gateway

**原因**：
- 后端容器未启动
- 端口映射不正确
- Nginx 配置错误

**解决方案**：
1. 检查容器状态：`docker ps`
2. 检查端口映射：`docker port <container-name>`
3. 测试本地访问：`curl http://127.0.0.1:8082/`
4. 检查 Nginx 配置：`nginx -t`

### 问题 3: 平台不匹配警告

**解决方案**：
- 部署脚本已自动处理，构建和运行时会指定 `--platform linux/amd64`
- 如果仍有警告，检查脚本是否正确执行

## 总结

多应用部署的关键点：

1. ✅ **端口管理**：使用内部端口 + Nginx 反向代理
2. ✅ **平台兼容**：构建和运行时指定正确的平台
3. ✅ **统一入口**：使用 Nginx 作为统一入口
4. ✅ **域名区分**：使用不同域名区分应用（推荐）
5. ✅ **监控日志**：集中管理日志，便于排查问题

遵循这些最佳实践，可以安全、高效地在同一台服务器上部署多个应用。


