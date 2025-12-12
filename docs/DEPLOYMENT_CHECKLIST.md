# 同服务器部署检查清单

当 `site-dashboard-server` 和 `book-excerpt-generator` 部署在同一台服务器上时，需要确保以下配置正确且无冲突。

## ✅ 配置检查结果

### 1. 域名配置（无冲突）
- **site-dashboard**: `site-dashboard.zhifu.tech`
- **book-excerpt-generator**: `book-excerpt.zhifu.tech`
- ✅ 两个不同的域名，通过 `server_name` 区分，无冲突

### 2. 应用目录（无冲突）
- **site-dashboard**: `/var/www/html/site-dashboard`
- **book-excerpt-generator**: `/var/www/html/book-excerpt-generator`
- ✅ 两个不同的目录，无冲突

### 3. Nginx 配置文件（无冲突）
- **site-dashboard**: `/etc/nginx/conf.d/site-dashboard.conf`
- **book-excerpt-generator**: `/etc/nginx/conf.d/book-excerpt-generator.conf`
- ✅ 两个独立的配置文件，无冲突

### 4. SSL 证书（无冲突）
- **site-dashboard**: 
  - `/etc/nginx/ssl/site-dashboard.zhifu.tech_bundle.crt`
  - `/etc/nginx/ssl/site-dashboard.zhifu.tech.key`
- **book-excerpt-generator**: 
  - `/etc/nginx/ssl/book-excerpt.zhifu.tech_bundle.crt`
  - `/etc/nginx/ssl/book-excerpt.zhifu.tech.key`
- ✅ 两个不同的证书文件，无冲突

### 5. 后端服务端口（无冲突）
- **site-dashboard-server**: `3002`
- **book-excerpt-generator**: 无后端服务（纯前端应用）
- ✅ 无端口冲突

### 6. 日志文件（无冲突）
- **site-dashboard**: 
  - `/var/log/nginx/site-dashboard-access.log`
  - `/var/log/nginx/site-dashboard-error.log`
  - `/var/log/nginx/site-dashboard-https-access.log`
  - `/var/log/nginx/site-dashboard-https-error.log`
- **book-excerpt-generator**: 
  - `/var/log/nginx/book-excerpt-generator-access.log`
  - `/var/log/nginx/book-excerpt-generator-error.log`
  - `/var/log/nginx/book-excerpt-generator-https-access.log`
  - `/var/log/nginx/book-excerpt-generator-https-error.log`
- ✅ 两个不同的日志文件，无冲突

### 7. SSH 密钥（无冲突）
- **site-dashboard**: `~/.ssh/id_rsa_site_dashboard`
- **book-excerpt-generator**: `~/.ssh/id_rsa_book_excerpt`
- ✅ 两个不同的密钥文件，无冲突

## ⚠️ 需要注意的事项

### 1. Nginx 主配置检查
确保 `/etc/nginx/nginx.conf` 中包含：
```nginx
http {
    # ... 其他配置 ...
    include /etc/nginx/conf.d/*.conf;
    # ... 其他配置 ...
}
```

### 2. 端口监听检查
两个应用都监听相同的端口（80 和 443），但通过不同的 `server_name` 区分：
- ✅ 这是 Nginx 的标准做法，完全正确
- ✅ 确保 DNS 解析正确指向服务器 IP

### 3. 后端服务配置
- **site-dashboard-server** 运行在 `3002` 端口
- 如果 `book-excerpt-generator` 未来需要后端服务，需要选择不同的端口（如 `3003`）

### 4. 防火墙配置
确保服务器防火墙开放以下端口：
- `22` (SSH)
- `80` (HTTP)
- `443` (HTTPS)
- `3002` (site-dashboard-server API，如果需要外部访问)

### 5. 资源限制
两个应用共享服务器资源，需要注意：
- **内存使用**：监控 Node.js 服务（site-dashboard-server）的内存占用
- **磁盘空间**：确保有足够的空间存储日志和文件
- **CPU 使用**：监控服务器负载

### 6. PM2 进程管理（如果使用）
如果使用 PM2 管理 `site-dashboard-server`，确保进程名称唯一：
- 进程名：`site-dashboard-server`
- 端口：`3002`

### 7. 数据目录（site-dashboard-server）
- **数据目录**: `/opt/site-dashboard-server/data`（默认）
- 确保目录权限正确：`chown -R node:node /opt/site-dashboard-server/data`
- 确保目录存在且有写权限

## 🔍 验证步骤

### 1. 检查 Nginx 配置语法
```bash
nginx -t
```

### 2. 检查端口占用
```bash
# 检查 80 端口
lsof -i :80
netstat -tlnp | grep :80

# 检查 443 端口
lsof -i :443
netstat -tlnp | grep :443

# 检查 3002 端口（site-dashboard-server）
lsof -i :3002
netstat -tlnp | grep :3002
```

### 3. 检查服务状态
```bash
# 检查 Nginx
systemctl status nginx

# 检查 site-dashboard-server（如果使用 PM2）
pm2 list
pm2 logs site-dashboard-server

# 检查 site-dashboard-server（如果使用 Docker）
docker ps | grep site-dashboard-server
```

### 4. 测试域名访问
```bash
# 测试 site-dashboard
curl -I http://site-dashboard.zhifu.tech
curl -I https://site-dashboard.zhifu.tech

# 测试 book-excerpt-generator
curl -I http://book-excerpt.zhifu.tech
curl -I https://book-excerpt.zhifu.tech

# 测试 site-dashboard-server API
curl http://localhost:3002/api/health
```

### 5. 检查日志
```bash
# 检查 Nginx 错误日志
tail -f /var/log/nginx/site-dashboard-error.log
tail -f /var/log/nginx/book-excerpt-generator-error.log

# 检查 site-dashboard-server 日志
pm2 logs site-dashboard-server
# 或
docker logs site-dashboard-server
```

## 📋 部署顺序建议

1. **部署 site-dashboard-server**
   ```bash
   cd site-dashboard-server
   ./scripts/site-dashboard-server.sh deploy
   ```

2. **部署 site-dashboard 前端**
   ```bash
   cd site-dashboard
   ./scripts/site-dashboard.sh deploy
   ./scripts/site-dashboard.sh update-nginx
   ```

3. **部署 book-excerpt-generator**
   ```bash
   cd book-excerpt-generator
   ./scripts/book-excerpt.sh deploy
   ./scripts/book-excerpt.sh update-nginx
   ```

4. **验证所有服务**
   ```bash
   # 检查 Nginx 配置
   nginx -t
   
   # 重新加载 Nginx
   systemctl reload nginx
   
   # 测试访问
   curl -I http://site-dashboard.zhifu.tech
   curl -I http://book-excerpt.zhifu.tech
   ```

## ✅ 总结

**当前配置完全正确，无冲突！**

两个项目可以安全地部署在同一台服务器上，因为：
- ✅ 使用不同的域名（通过 `server_name` 区分）
- ✅ 使用不同的应用目录
- ✅ 使用不同的 Nginx 配置文件
- ✅ 使用不同的 SSL 证书
- ✅ 使用不同的日志文件
- ✅ 后端服务端口不冲突（book-excerpt-generator 无后端）

只需要确保：
1. DNS 解析正确配置
2. SSL 证书正确安装
3. Nginx 主配置包含 `include /etc/nginx/conf.d/*.conf;`
4. 防火墙开放必要端口
5. 服务器资源充足
