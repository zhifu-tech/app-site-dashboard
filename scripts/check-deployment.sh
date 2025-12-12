#!/bin/bash

# ============================================
# 部署状态检查脚本
# ============================================
# 用于检查 site-dashboard 的部署状态
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 加载共用脚本
APP_COMMON_DIR="$(cd "$PROJECT_ROOT/../app-common" && pwd)"
[ -f "$APP_COMMON_DIR/scripts/common-utils.sh" ] && source "$APP_COMMON_DIR/scripts/common-utils.sh"
[ -f "$APP_COMMON_DIR/scripts/ssh-utils.sh" ] && source "$APP_COMMON_DIR/scripts/ssh-utils.sh"

# 服务器配置
export SERVER_HOST="${SERVER_HOST:-8.138.183.116}"
export SERVER_USER="${SERVER_USER:-root}"
export SERVER_PORT="${SERVER_PORT:-22}"

init_ssh_connection

echo ""
print_info "Site Dashboard 部署状态检查"
echo ""
echo ""

# 1. 检查 Docker 容器状态
print_info "1. 检查 Docker 容器状态..."
ssh_exec "docker ps --filter 'name=site-dashboard' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" || {
  print_error "无法连接到服务器或 Docker 未运行"
  exit 1
}
echo ""

# 2. 检查容器是否在运行
print_info "2. 检查容器是否在运行..."
container_running=$(ssh_exec "docker ps --filter 'name=site-dashboard' --format '{{.Names}}'")
if [ -z "$container_running" ]; then
  print_error "容器 site-dashboard 未运行"
  echo ""
  print_info "启动容器命令："
  echo "  ./scripts/site-dashboard.sh docker-deploy"
else
  print_success "容器 site-dashboard 正在运行"
fi
echo ""

# 3. 检查端口映射
print_info "3. 检查端口映射..."
port_mapping=$(ssh_exec "docker ps --filter 'name=site-dashboard' --format '{{.Ports}}'")
if echo "$port_mapping" | grep -q "8082"; then
  print_success "端口映射正确: $port_mapping"
else
  print_error "端口映射不正确: $port_mapping"
  print_warning "应该映射到 127.0.0.1:8082:80"
fi
echo ""

# 4. 测试容器本地访问
print_info "4. 测试容器本地访问..."
local_response=$(ssh_exec "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8082/" || echo "000")
if [ "$local_response" = "200" ] || [ "$local_response" = "301" ] || [ "$local_response" = "302" ]; then
  print_success "容器本地访问正常 (HTTP $local_response)"
else
  print_error "容器本地访问失败 (HTTP $local_response)"
  print_info "检查容器日志："
  echo "  docker logs site-dashboard"
fi
echo ""

# 5. 检查 Nginx 配置
print_info "5. 检查 Nginx 配置..."
nginx_conf_exists=$(ssh_exec "test -f /etc/nginx/conf.d/site-dashboard.conf && echo 'yes' || echo 'no'")
if [ "$nginx_conf_exists" = "yes" ]; then
  print_success "Nginx 配置文件存在"
  
  # 检查配置内容
  proxy_pass=$(ssh_exec "grep -A 1 'proxy_pass' /etc/nginx/conf.d/site-dashboard.conf | grep '127.0.0.1:8082' || echo ''")
  if [ -n "$proxy_pass" ]; then
    print_success "Nginx 配置正确（代理到 127.0.0.1:8082）"
  else
    print_error "Nginx 配置可能不正确（未找到代理到 127.0.0.1:8082 的配置）"
    print_info "应该使用 Docker 版本的配置文件："
    echo "  ./scripts/site-dashboard.sh update-nginx scripts/site-dashboard.nginx.docker.conf"
  fi
else
  print_error "Nginx 配置文件不存在"
  print_info "更新 Nginx 配置："
  echo "  ./scripts/site-dashboard.sh update-nginx scripts/site-dashboard.nginx.docker.conf"
fi
echo ""

# 6. 检查 Nginx 服务状态
print_info "6. 检查 Nginx 服务状态..."
nginx_status=$(ssh_exec "systemctl is-active nginx 2>/dev/null || echo 'inactive'")
if [ "$nginx_status" = "active" ]; then
  print_success "Nginx 服务正在运行"
else
  print_error "Nginx 服务未运行"
  print_info "启动 Nginx："
  echo "  ./scripts/site-dashboard.sh start-nginx"
fi
echo ""

# 7. 测试 Nginx 配置语法
print_info "7. 测试 Nginx 配置语法..."
nginx_test=$(ssh_exec "nginx -t 2>&1" || echo "failed")
if echo "$nginx_test" | grep -q "successful"; then
  print_success "Nginx 配置语法正确"
else
  print_error "Nginx 配置语法错误"
  echo "$nginx_test"
fi
echo ""

# 8. 检查 SSL 证书
print_info "8. 检查 SSL 证书..."
ssl_cert_exists=$(ssh_exec "test -f /etc/nginx/ssl/site-dashboard.zhifu.tech_bundle.crt && test -f /etc/nginx/ssl/site-dashboard.zhifu.tech.key && echo 'yes' || echo 'no'")
if [ "$ssl_cert_exists" = "yes" ]; then
  print_success "SSL 证书存在"
else
  print_warning "SSL 证书不存在（HTTPS 可能无法工作）"
fi
echo ""

# 总结
print_title "检查完成"
echo ""
print_info "如果所有检查都通过但仍无法访问，请检查："
echo "  1. 域名 DNS 解析是否正确"
echo "  2. 防火墙是否开放 80/443 端口"
echo "  3. Nginx 错误日志: tail -f /var/log/nginx/site-dashboard-error.log"
echo "  4. 容器日志: docker logs site-dashboard"
echo ""

