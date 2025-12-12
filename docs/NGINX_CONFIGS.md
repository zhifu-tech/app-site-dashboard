# Nginx 配置文件说明

## 两个配置文件及其用途

### 1. `scripts/site-dashboard.nginx.conf` 
**用途：生产环境部署（服务器）**

- **使用场景**：部署到生产服务器时使用
- **包含内容**：
  - HTTP 配置（端口 80）
  - HTTPS 配置（端口 443，SSL 证书）
  - 完整的生产环境配置（缓存、压缩、安全头等）
- **部署方式**：
  ```bash
  ./scripts/site-dashboard.sh update-nginx
  ```
- **部署位置**：`/etc/nginx/conf.d/site-dashboard.conf`
- **特点**：包含 SSL 证书配置，适用于正式域名

---

### 2. `scripts/nginx.docker.conf`
**用途：Docker 本地开发环境**

- **使用场景**：使用 Docker Compose 进行本地开发时使用
- **包含内容**：
  - 仅 HTTP 配置（端口 80）
  - **不包含 HTTPS**（本地开发不需要 SSL 证书）
  - 简化的开发环境配置
- **使用方式**：
  ```bash
  ./scripts/site-dashboard.sh docker-up
  ```
- **挂载位置**：在 `docker-compose.yml` 中挂载到容器
  ```yaml
  volumes:
    - ./scripts/nginx.docker.conf:/etc/nginx/templates/default.conf.template:ro
  ```
- **特点**：避免 SSL 证书错误，适合本地调试

---

## 使用场景对比

| 配置文件 | 环境 | HTTP | HTTPS | SSL证书 | 使用命令 |
|---------|------|------|-------|---------|---------|
| `site-dashboard.nginx.conf` | 生产环境 | ✅ | ✅ | ✅ 需要 | `./scripts/site-dashboard.sh update-nginx` |
| `nginx.docker.conf` | Docker 本地开发 | ✅ | ❌ | ❌ 不需要 | `./scripts/site-dashboard.sh docker-up` |

## 快速选择

- **本地开发（Docker）**：使用 `nginx.docker.conf`
- **生产环境部署**：使用 `site-dashboard.nginx.conf`
