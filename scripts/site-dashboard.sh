#!/bin/bash

# ============================================
# Site Dashboard - 统一管理脚本
# ============================================
# 整合所有部署和管理功能
# 使用方法: ./site-dashboard.sh [command] [options]
# ============================================

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ============================================
# 配置变量
# ============================================

# 服务器配置
SERVER_HOST="8.138.183.116"
SERVER_USER="root"
SERVER_PORT="22"

# 应用目录配置
APP_DIR="/var/www/html/site-dashboard"
NGINX_CONF_PATH="/etc/nginx/conf.d/site-dashboard.conf"
SSL_CERT_DIR="/etc/nginx/ssl"

# SSH 配置
SSH_KEY_NAME="id_rsa_site_dashboard"
SSH_KEY_PATH="$HOME/.ssh/$SSH_KEY_NAME"
SSH_ALIAS="site-dashboard-server"

# Docker 配置
DOCKER_IMAGE_NAME="site-dashboard"
DOCKER_CONTAINER_NAME="site-dashboard"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

# 颜色输出定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================
# 工具函数
# ============================================

# 初始化 SSH 连接参数
init_ssh_connection() {
  if [ -f "$SSH_KEY_PATH" ]; then
    SSH_OPTIONS="-i $SSH_KEY_PATH"
    SSH_TARGET="$SERVER_USER@$SERVER_HOST"
  elif ssh -o ConnectTimeout=1 -o BatchMode=yes "$SSH_ALIAS" "echo" &>/dev/null 2>&1; then
    SSH_OPTIONS=""
    SSH_TARGET="$SSH_ALIAS"
  else
    SSH_OPTIONS=""
    SSH_TARGET="$SERVER_USER@$SERVER_HOST"
  fi
}

# 执行 SSH 命令（统一入口）
# 用法: ssh_exec "command" 或 ssh_exec << 'ENDSSH' ... ENDSSH
ssh_exec() {
  if [ $# -eq 0 ]; then
    # 从标准输入读取（用于 here-document）
    ssh $SSH_OPTIONS -p ${SERVER_PORT} ${SSH_TARGET}
  else
    # 直接执行命令
    ssh $SSH_OPTIONS -p ${SERVER_PORT} ${SSH_TARGET} "$@"
  fi
}

# 查找 Nginx 命令路径（统一函数）
find_nginx_cmd() {
  if command -v nginx &> /dev/null; then
    echo "nginx"
  elif [ -f "/usr/sbin/nginx" ]; then
    echo "/usr/sbin/nginx"
  elif [ -f "/usr/local/sbin/nginx" ]; then
    echo "/usr/local/sbin/nginx"
  elif [ -f "/sbin/nginx" ]; then
    echo "/sbin/nginx"
  else
    echo ""
  fi
}

# 检查 Nginx 服务状态
check_nginx_status() {
  systemctl is-active --quiet nginx 2>/dev/null || service nginx status &>/dev/null
}

# 打印成功消息
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# 打印错误消息
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# 打印警告消息
print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# 打印信息消息
print_info() {
  echo -e "${CYAN}ℹ $1${NC}"
}

# ============================================
# 欢迎界面
# ============================================
show_welcome() {
  echo ""
  echo -e "${CYAN}"
  cat << "EOF"
 ____          __             ____                       __       __                                 __     
/\  _`\    __ /\ \__         /\  _`\                    /\ \     /\ \                               /\ \    
\ \,\L\_\ /\_\\ \ ,_\     __ \ \ \/\ \     __       ____\ \ \___ \ \ \____    ___      __     _ __  \_\ \   
 \/_\__ \ \/\ \\ \ \/   /'__`\\ \ \ \ \  /'__`\    /',__\\ \  _ `\\ \ '__`\  / __`\  /'__`\  /\`'__\/'_` \  
   /\ \L\ \\ \ \\ \ \_ /\  __/ \ \ \_\ \/\ \L\.\_ /\__, `\\ \ \ \ \\ \ \L\ \/\ \L\ \/\ \L\.\_\ \ \//\ \L\ \ 
   \ `\____\\ \_\\ \__\\ \____\ \ \____/\ \__/.\_\\/\____/ \ \_\ \_\\ \_,__/\ \____/\ \__/.\_\\ \_\\ \___,_\
    \/_____/ \/_/ \/__/ \/____/  \/___/  \/__/\/_/ \/___/   \/_/\/_/ \/___/  \/___/  \/__/\/_/ \/_/ \/__,_ /
                                                                                                            
                                                                                                            
EOF
  echo -e "${NC}"
  echo -e "${CYAN}              Site Dashboard - 网站资源仪表板@Zhifu's Tech${NC}"
  echo ""
  local cmd="${1:-help}"
  echo -e "${YELLOW}版本: 1.0.0${NC}"
  echo -e "${YELLOW}服务器: ${SERVER_HOST}${NC}"
  echo -e "${YELLOW}命令: ${cmd}${NC}"
  echo ""
}

# ============================================
# 帮助信息
# ============================================
show_help() {
  echo -e "${CYAN}Site Dashboard - 使用帮助${NC}"
  echo ""
  echo -e "${YELLOW}用法:${NC}"
  echo "  ./site-dashboard.sh [command] [options]"
  echo ""
  echo -e "${YELLOW}可用命令:${NC}"
  echo ""
  echo -e "  ${GREEN}update-nginx${NC}       更新 Nginx 配置文件"
  echo -e "  ${GREEN}start-nginx${NC}        启动 Nginx 服务"
  echo ""
  echo -e "  ${GREEN}Docker 命令:${NC}"
  echo -e "  ${GREEN}docker-build${NC}        构建 Docker 镜像"
  echo -e "  ${GREEN}docker-up${NC}           启动 Docker 容器（本地调试）"
  echo -e "  ${GREEN}docker-down${NC}         停止 Docker 容器"
  echo -e "  ${GREEN}docker-logs${NC}         查看 Docker 容器日志"
  echo -e "  ${GREEN}docker-shell${NC}        进入 Docker 容器 shell"
  echo -e "  ${GREEN}docker-restart${NC}      重启 Docker 容器"
  echo -e "  ${GREEN}docker-deploy${NC}       使用 Docker 部署到服务器"
  echo ""
  echo -e "  ${GREEN}help${NC}                显示此帮助信息"
  echo ""
  echo -e "${YELLOW}示例:${NC}"
  echo "  ./site-dashboard.sh update-nginx"
  echo "  ./site-dashboard.sh docker-up"
  echo "  ./site-dashboard.sh docker-deploy"
  echo ""
}

# ============================================
# 更新 Nginx 配置
# ============================================
cmd_update_nginx() {
  # 确定配置文件路径
  NGINX_LOCAL_CONF="${1:-$SCRIPT_DIR/site-dashboard.nginx.conf}"
  [ -f "$NGINX_LOCAL_CONF" ] || { print_error "配置文件不存在: ${NGINX_LOCAL_CONF}"; exit 1; }

  # 检查证书文件
  SSL_CERT_LOCAL_DIR="$SCRIPT_DIR/site-dashboard.zhifu.tech_nginx"
  SSL_CERT_BUNDLE_CRT="$SSL_CERT_LOCAL_DIR/site-dashboard.zhifu.tech_bundle.crt"
  SSL_CERT_BUNDLE_PEM="$SSL_CERT_LOCAL_DIR/site-dashboard.zhifu.tech_bundle.pem"
  SSL_CERT_KEY="$SSL_CERT_LOCAL_DIR/site-dashboard.zhifu.tech.key"
  
  SSL_CERT_FILES_EXIST=false
  if [ -f "$SSL_CERT_BUNDLE_CRT" ] && [ -f "$SSL_CERT_KEY" ]; then
    SSL_CERT_FILES_EXIST=true
    SSL_CERT_FILE="$SSL_CERT_BUNDLE_CRT"
  elif [ -f "$SSL_CERT_BUNDLE_PEM" ] && [ -f "$SSL_CERT_KEY" ]; then
    SSL_CERT_FILES_EXIST=true
    SSL_CERT_FILE="$SSL_CERT_BUNDLE_PEM"
  fi

  echo -e "${GREEN}更新 Nginx 配置到服务器 ${SERVER_HOST}...${NC}"

  # 服务器端准备
  ssh_exec << 'ENDSSH'
set -e
NGINX_CMD=$(command -v nginx || echo "/usr/sbin/nginx" || echo "/usr/local/sbin/nginx" || echo "/sbin/nginx" || echo "")
[ -n "$NGINX_CMD" ] && echo "✓ Nginx: $($NGINX_CMD -v 2>&1)" || echo "⚠ Nginx 未找到，将继续上传配置"

mkdir -p /etc/nginx/conf.d/backup
[ -f "/etc/nginx/conf.d/site-dashboard.conf" ] && {
  BACKUP_FILE="/etc/nginx/conf.d/backup/site-dashboard.conf.backup.$(date +%Y%m%d_%H%M%S)"
  cp /etc/nginx/conf.d/site-dashboard.conf "$BACKUP_FILE"
  echo "✓ 已备份: $BACKUP_FILE"
}
mkdir -p /etc/nginx/conf.d
ENDSSH

  # 上传配置文件
  echo -e "${YELLOW}上传配置文件...${NC}"
  scp $SSH_OPTIONS -P ${SERVER_PORT} "$NGINX_LOCAL_CONF" ${SSH_TARGET}:${NGINX_CONF_PATH}

  # 上传证书（如果存在）
  if [ "$SSL_CERT_FILES_EXIST" = true ]; then
    echo -e "${YELLOW}上传 SSL 证书...${NC}"
    ssh_exec "mkdir -p ${SSL_CERT_DIR}"
    
    SSL_CERT_NAME="site-dashboard.zhifu.tech"
    [ -f "$SSL_CERT_BUNDLE_CRT" ] && scp $SSH_OPTIONS -P ${SERVER_PORT} "$SSL_CERT_BUNDLE_CRT" ${SSH_TARGET}:${SSL_CERT_DIR}/${SSL_CERT_NAME}_bundle.crt
    [ -f "$SSL_CERT_BUNDLE_PEM" ] && scp $SSH_OPTIONS -P ${SERVER_PORT} "$SSL_CERT_BUNDLE_PEM" ${SSH_TARGET}:${SSL_CERT_DIR}/${SSL_CERT_NAME}_bundle.pem
    scp $SSH_OPTIONS -P ${SERVER_PORT} "$SSL_CERT_KEY" ${SSH_TARGET}:${SSL_CERT_DIR}/${SSL_CERT_NAME}.key
    
    ssh_exec "chmod 644 ${SSL_CERT_DIR}/${SSL_CERT_NAME}_bundle.* 2>/dev/null || true; chmod 600 ${SSL_CERT_DIR}/${SSL_CERT_NAME}.key; chown root:root ${SSL_CERT_DIR}/${SSL_CERT_NAME}.*"
  fi

  # 测试并应用配置
  ssh_exec << 'ENDSSH'
set -e
NGINX_CMD=$(command -v nginx || echo "/usr/sbin/nginx" || echo "/usr/local/sbin/nginx" || echo "/sbin/nginx" || echo "")

if [ -n "$NGINX_CMD" ]; then
  TEST_OUTPUT=$($NGINX_CMD -t 2>&1)
  if echo "$TEST_OUTPUT" | grep -q "test is successful"; then
    echo "✓ Nginx 配置语法正确"
  else
    echo "⚠ 配置测试失败，尝试兼容模式（移除 http2）..."
    TEMP_CONF=$(mktemp)
    sed 's/listen 443 ssl http2;/listen 443 ssl;/g' "/etc/nginx/conf.d/site-dashboard.conf" > "$TEMP_CONF"
    if $NGINX_CMD -t -c "$TEMP_CONF" 2>&1 | grep -q "test is successful"; then
      echo "⚠ 已移除 http2 支持"
      cp "$TEMP_CONF" "/etc/nginx/conf.d/site-dashboard.conf"
      echo "✓ 已更新为兼容配置"
      rm -f "$TEMP_CONF"
    else
      echo "✗ Nginx 配置语法错误"
      echo "$TEST_OUTPUT"
      rm -f "$TEMP_CONF"
      exit 1
    fi
  fi
fi

chmod 644 /etc/nginx/conf.d/site-dashboard.conf
chown root:root /etc/nginx/conf.d/site-dashboard.conf

# 重新加载 Nginx
if systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null; then
  echo "✓ Nginx 配置已重新加载"
elif systemctl restart nginx 2>/dev/null || service nginx restart 2>/dev/null; then
  echo "⚠ 使用 restart 方式重新加载"
  echo "✓ Nginx 已重启"
else
  echo "⚠ 无法重新加载 Nginx（可能未运行）"
fi

# 检查状态
if systemctl is-active --quiet nginx 2>/dev/null || service nginx status &>/dev/null; then
  echo "✓ Nginx 正在运行"
else
  echo "⚠ Nginx 未运行，可手动启动: systemctl start nginx"
fi
ENDSSH

  echo ""
  print_success "Nginx 配置更新完成！"
  echo -e "${YELLOW}配置文件: ${NGINX_CONF_PATH}${NC}"
  [ "$SSL_CERT_FILES_EXIST" = true ] && echo -e "${YELLOW}SSL 证书: ${SSL_CERT_DIR}/site-dashboard.zhifu.tech.*${NC}"
}

# ============================================
# 启动 Nginx
# ============================================
cmd_start_nginx() {
  echo -e "${GREEN}检查并启动 Nginx...${NC}"
  
  ssh_exec << 'ENDSSH'
set -e
NGINX_CMD=$(command -v nginx || echo "/usr/sbin/nginx" || echo "/usr/local/sbin/nginx" || echo "/sbin/nginx" || echo "")

[ -z "$NGINX_CMD" ] && {
  echo "✗ Nginx 未安装"
  [ -f /etc/redhat-release ] && echo "安装: yum install -y nginx"
  [ -f /etc/debian_version ] && echo "安装: apt-get install -y nginx"
  exit 1
}

echo "✓ Nginx: $($NGINX_CMD -v 2>&1)"

# 检查配置语法
$NGINX_CMD -t 2>&1 || { echo "✗ Nginx 配置语法错误"; exit 1; }
echo "✓ Nginx 配置语法正确"

# 启动 Nginx
if systemctl is-active --quiet nginx 2>/dev/null || service nginx status &>/dev/null; then
  echo "✓ Nginx 已在运行"
else
  echo "⚠ 正在启动 Nginx..."
  systemctl start nginx 2>/dev/null || service nginx start 2>/dev/null || { echo "✗ Nginx 启动失败"; exit 1; }
  sleep 2
  systemctl is-active --quiet nginx 2>/dev/null || service nginx status &>/dev/null || { echo "✗ Nginx 启动失败"; exit 1; }
  echo "✓ Nginx 已成功启动"
fi

# 设置开机自启
systemctl enable nginx 2>/dev/null || chkconfig nginx on 2>/dev/null || true
echo "✓ Nginx 已设置为开机自启"
ENDSSH

  echo ""
  print_success "Nginx 启动完成！"
}

# ============================================
# Docker 相关函数
# ============================================

# 构建 Docker 镜像
cmd_docker_build() {
  echo -e "${GREEN}构建 Docker 镜像...${NC}"
  echo ""
  
  cd "$PROJECT_ROOT"
  [ -f "Dockerfile" ] || { print_error "未找到 Dockerfile"; exit 1; }

  BASE_IMAGE="nginx:1.25-alpine"
  if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${BASE_IMAGE}$"; then
    echo -e "${YELLOW}拉取基础镜像...${NC}"
    docker pull --platform linux/amd64 "$BASE_IMAGE" || {
      print_error "基础镜像拉取失败，请手动拉取: docker pull --platform linux/amd64 $BASE_IMAGE"
      exit 1
    }
  fi

  echo -e "${YELLOW}构建镜像（平台: linux/amd64）...${NC}"
  docker build --platform linux/amd64 -t "$DOCKER_IMAGE_NAME:latest" . || {
    print_error "Docker 镜像构建失败"
    exit 1
  }
  
  print_success "Docker 镜像构建完成！"
  docker images | grep "$DOCKER_IMAGE_NAME" || true
}

# 启动 Docker 容器（本地调试）
cmd_docker_up() {
  echo -e "${GREEN}启动 Docker 容器（本地调试模式）...${NC}"
  echo ""
  
  cd "$PROJECT_ROOT"
  [ -f "docker-compose.yml" ] || { print_error "未找到 docker-compose.yml"; exit 1; }
  
  PORT=${PORT:-8082}
  if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "端口 $PORT 已被占用"
    echo "使用自定义端口: PORT=8081 ./scripts/site-dashboard.sh docker-up"
    exit 1
  fi
  
  docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
  
  echo ""
  print_success "Docker 容器已启动！"
  echo -e "${YELLOW}访问地址: ${GREEN}http://localhost:${PORT}${NC}"
  echo -e "${YELLOW}查看日志: ${BLUE}./scripts/site-dashboard.sh docker-logs${NC}"
  echo -e "${YELLOW}停止容器: ${BLUE}./scripts/site-dashboard.sh docker-down${NC}"
}

# 停止 Docker 容器
cmd_docker_down() {
  echo -e "${GREEN}停止 Docker 容器...${NC}"
  echo ""
  
  cd "$PROJECT_ROOT"
  docker-compose -f "$DOCKER_COMPOSE_FILE" down
  
  echo ""
  print_success "Docker 容器已停止！"
}

# 查看 Docker 容器日志
cmd_docker_logs() {
  echo -e "${GREEN}查看 Docker 容器日志...${NC}"
  echo ""
  
  cd "$PROJECT_ROOT"
  docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f --tail=100
}

# 进入 Docker 容器 shell
cmd_docker_shell() {
  echo -e "${GREEN}进入 Docker 容器 shell...${NC}"
  echo ""
  
  cd "$PROJECT_ROOT"
  
  docker ps | grep -q "$DOCKER_CONTAINER_NAME" || {
    print_error "容器未运行，请先启动容器"
    echo "启动容器: ./scripts/site-dashboard.sh docker-up"
    exit 1
  }
  
  docker exec -it "$DOCKER_CONTAINER_NAME" /bin/sh
}

# 重启 Docker 容器
cmd_docker_restart() {
  echo -e "${GREEN}重启 Docker 容器...${NC}"
  echo ""
  
  cd "$PROJECT_ROOT"
  docker-compose -f "$DOCKER_COMPOSE_FILE" restart
  
  echo ""
  print_success "Docker 容器已重启！"
}

# 使用 Docker 部署到服务器
cmd_docker_deploy() {
  echo -e "${GREEN}使用 Docker 部署到服务器 ${SERVER_HOST}...${NC}"
  echo ""
  
  cd "$PROJECT_ROOT"
  
  # 1. 构建镜像
  echo -e "${YELLOW}[1/4] 构建 Docker 镜像...${NC}"
  BASE_IMAGE="nginx:1.25-alpine"
  
  # 检查并拉取基础镜像
  if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${BASE_IMAGE}$"; then
    echo -e "${BLUE}本地未找到基础镜像，正在拉取...${NC}"
    if ! docker pull --platform linux/amd64 "$BASE_IMAGE"; then
      print_error "基础镜像拉取失败"
      echo ""
      echo -e "${YELLOW}可能的解决方案：${NC}"
      echo ""
      echo -e "${CYAN}方案 1: 配置 Docker 镜像加速器（推荐）${NC}"
      echo "  macOS: Docker Desktop → Settings → Docker Engine → 添加 registry-mirrors"
      echo "  Linux: 编辑 /etc/docker/daemon.json 添加 registry-mirrors"
      echo ""
      echo -e "${CYAN}方案 2: 手动拉取镜像${NC}"
      echo "  docker pull --platform linux/amd64 $BASE_IMAGE"
      echo ""
      echo -e "${CYAN}方案 3: 查看详细错误信息${NC}"
      echo "  docker pull --platform linux/amd64 $BASE_IMAGE"
      echo ""
      echo -e "${CYAN}更多帮助：${NC}"
      echo "  查看 FAQ: cat docs/FAQ.md"
      echo ""
      exit 1
    fi
    print_success "基础镜像拉取成功"
  else
    echo -e "${BLUE}使用本地基础镜像: $BASE_IMAGE${NC}"
  fi
  
  # 构建镜像
  if ! docker build --platform linux/amd64 -t "$DOCKER_IMAGE_NAME:latest" .; then
    print_error "镜像构建失败"
    echo ""
    echo -e "${YELLOW}可能的解决方案：${NC}"
    echo ""
    echo -e "${CYAN}方案 1: 配置 Docker 镜像加速器（推荐）${NC}"
    echo "  macOS: Docker Desktop → Settings → Docker Engine → 添加 registry-mirrors"
    echo "  Linux: 编辑 /etc/docker/daemon.json 添加 registry-mirrors"
    echo ""
    echo -e "${CYAN}方案 2: 检查网络连接${NC}"
    echo "  ping docker.io"
    echo "  curl -I https://hub.docker.com"
    echo ""
    echo -e "${CYAN}方案 3: 查看详细错误信息${NC}"
    echo "  docker build --platform linux/amd64 -t $DOCKER_IMAGE_NAME:latest . --progress=plain"
    echo ""
    echo -e "${CYAN}更多帮助：${NC}"
    echo "  查看 FAQ: cat docs/FAQ.md"
    echo ""
    exit 1
  fi
  
  print_success "Docker 镜像构建完成"
  
  # 2. 导出镜像
  echo -e "${YELLOW}[2/4] 导出镜像...${NC}"
  TEMP_IMAGE_FILE=$(mktemp).tar.gz
  docker save "$DOCKER_IMAGE_NAME:latest" | gzip > "$TEMP_IMAGE_FILE" || {
    print_error "镜像导出失败"
    rm -f "$TEMP_IMAGE_FILE"
    exit 1
  }
  
  # 3. 上传镜像
  echo -e "${YELLOW}[3/4] 上传镜像到服务器...${NC}"
  scp $SSH_OPTIONS -P ${SERVER_PORT} "$TEMP_IMAGE_FILE" ${SSH_TARGET}:/tmp/site-dashboard-image.tar.gz || {
    print_error "镜像上传失败"
    rm -f "$TEMP_IMAGE_FILE"
    exit 1
  }
  
  # 4. 在服务器上加载并运行
  echo -e "${YELLOW}[4/4] 在服务器上加载镜像并运行容器...${NC}"
  ssh_exec << 'ENDSSH'
set -e
docker load < /tmp/site-dashboard-image.tar.gz
docker stop site-dashboard 2>/dev/null || true
docker rm site-dashboard 2>/dev/null || true
docker run -d --name site-dashboard --restart unless-stopped -p 127.0.0.1:8082:80 site-dashboard:latest
rm -f /tmp/site-dashboard-image.tar.gz
echo "✓ 容器已启动"
docker ps | grep site-dashboard || true
ENDSSH
  
  rm -f "$TEMP_IMAGE_FILE"
  
  echo ""
  print_success "Docker 部署完成！"
  echo -e "${YELLOW}容器端口: ${GREEN}127.0.0.1:8082${NC}"
  echo -e "${YELLOW}配置 Nginx: ${BLUE}./scripts/site-dashboard.sh update-nginx scripts/site-dashboard.nginx.docker.conf${NC}"
}

# ============================================
# 主函数
# ============================================
main() {
  show_welcome "$1"
  COMMAND="${1:-help}"

  case "$COMMAND" in
    update-nginx)
      cmd_update_nginx "$2"
      ;;
    start-nginx)
      cmd_start_nginx
      ;;
    docker-build)
      cmd_docker_build
      ;;
    docker-up)
      cmd_docker_up
      ;;
    docker-down)
      cmd_docker_down
      ;;
    docker-logs)
      cmd_docker_logs
      ;;
    docker-shell)
      cmd_docker_shell
      ;;
    docker-restart)
      cmd_docker_restart
      ;;
    docker-deploy)
      cmd_docker_deploy
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      print_error "未知命令 '$COMMAND'"
      echo ""
      show_help
      exit 1
      ;;
  esac
}

# 自动初始化 SSH 连接
init_ssh_connection

# 执行主函数
main "$@"
