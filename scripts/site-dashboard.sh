#!/bin/bash

# ============================================
# Site Dashboard - 统一管理脚本
# ============================================
# 整合所有部署和管理功能
# 使用方法: ./site-dashboard.sh [command] [options]
# ============================================

# 严格模式：遇到错误立即退出，使用未定义变量报错，管道中任一命令失败则整个管道失败
set -euo pipefail

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ============================================
# 配置变量
# ============================================

# 服务器配置（导出供共用脚本使用）
export SERVER_HOST="${SERVER_HOST:-8.138.183.116}"
export SERVER_USER="${SERVER_USER:-root}"
export SERVER_PORT="${SERVER_PORT:-22}"

# 应用目录配置
APP_DIR="/var/www/html/site-dashboard"
NGINX_CONF_PATH="/etc/nginx/conf.d/site-dashboard.conf"
SSL_CERT_DIR="/etc/nginx/ssl"

# Docker 配置
readonly DOCKER_IMAGE_NAME="site-dashboard"
readonly DOCKER_CONTAINER_NAME="site-dashboard"
readonly DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

# ============================================
# 工具函数
# ============================================

# 加载共用脚本库（必须在 trap 之前加载，以便使用 safe_exit）
APP_COMMON_DIR="$(cd "$PROJECT_ROOT/../app-common" && pwd)"
[ -f "$APP_COMMON_DIR/scripts/common-utils.sh" ] && source "$APP_COMMON_DIR/scripts/common-utils.sh"
[ -f "$APP_COMMON_DIR/scripts/ssh-utils.sh" ] && source "$APP_COMMON_DIR/scripts/ssh-utils.sh"
[ -f "$APP_COMMON_DIR/scripts/nginx-utils.sh" ] && source "$APP_COMMON_DIR/scripts/nginx-utils.sh"
[ -f "$APP_COMMON_DIR/scripts/nginx-update.sh" ] && source "$APP_COMMON_DIR/scripts/nginx-update.sh"

# 设置清理 trap（脚本退出时清理临时文件，必须在加载 common-utils.sh 之后）
trap 'safe_exit $?' EXIT INT TERM

# ============================================
# 欢迎界面
# ============================================
show_welcome() {
  echo ""
  echo -e "${CYAN}"
  # 从 welcome.txt 读取欢迎画面
  local welcome_file="$APP_COMMON_DIR/welcome.txt"
  if [ -f "$welcome_file" ]; then
    cat "$welcome_file"
  else
    # 如果文件不存在，使用默认的 ASCII 艺术字
    echo "ZHIFU"
  fi
  echo -e "${NC}"
  echo -e "${CYAN}              Site Dashboard - 网站资源仪表板@Zhifu's Tech${NC}"
  echo ""
  local cmd="${1:-help}"
  echo -e "${YELLOW}版本: 1.0.0${NC}"
  echo -e "${YELLOW}服务器: ${SERVER_HOST:-未配置}${NC}"
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
  echo -e "  ${GREEN}SSH 配置:${NC}"
  echo -e "  ${GREEN}update-ssh-key${NC}     更新 SSH 公钥到服务器"
  echo ""
  echo -e "  ${GREEN}Nginx 配置:${NC}"
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
  echo "  ./site-dashboard.sh update-ssh-key"
  echo "  ./site-dashboard.sh update-nginx"
  echo "  ./site-dashboard.sh docker-up"
  echo "  ./site-dashboard.sh docker-deploy"
  echo ""
}

# ============================================
# 更新 SSH 公钥到服务器
# ============================================
cmd_update_ssh_key() {
  print_info "更新 SSH 公钥到服务器 ${SERVER_HOST}..."
  echo ""
  
  if ! update_ssh_key_to_server; then
    print_error "SSH 公钥更新失败"
    return 1
  fi
  
  echo ""
  print_success "SSH 登录认证信息已更新！"
  print_info "现在可以使用 SSH 密钥无密码登录服务器"
}

# ============================================
# 更新 Nginx 配置
# ============================================
cmd_update_nginx() {
  # 确定配置文件路径
  local nginx_local_conf="${1:-$SCRIPT_DIR/site-dashboard.nginx.conf}"
  check_file_exists "$nginx_local_conf" "配置文件不存在" || return 1

  local ssl_cert_local_dir="$APP_COMMON_DIR/ssl/site-dashboard.zhifu.tech_nginx"
  local ssl_cert_name="site-dashboard.zhifu.tech"
  local ssl_cert_key="$ssl_cert_local_dir/${ssl_cert_name}.key"
  local ssl_cert_bundle_crt="$ssl_cert_local_dir/${ssl_cert_name}_bundle.crt"
  local ssl_cert_bundle_pem="$ssl_cert_local_dir/${ssl_cert_name}_bundle.pem"

  print_info "更新 Nginx 配置到服务器 ${SERVER_HOST}..."

  # 检查 SSL 证书是否存在
  local ssl_cert_files_exist=false
  if [ -f "$ssl_cert_key" ] && ([ -f "$ssl_cert_bundle_crt" ] || [ -f "$ssl_cert_bundle_pem" ]); then
    ssl_cert_files_exist=true
  fi

  # 使用共用脚本库更新配置
  if [ "$ssl_cert_files_exist" = "true" ]; then
    update_nginx_config \
      "$nginx_local_conf" \
      "$NGINX_CONF_PATH" \
      "$SSH_OPTIONS" \
      "$SERVER_PORT" \
      "$SSH_TARGET" \
      "ssh_exec" \
      "$ssl_cert_name" \
      "$ssl_cert_local_dir" \
      "$SSL_CERT_DIR"
  else
    # 不使用 SSL 证书的简化版本
    prepare_nginx_server "$NGINX_CONF_PATH" "ssh_exec" "$SSH_TARGET"
    print_info "上传配置文件..."
    scp $SSH_OPTIONS -P "${SERVER_PORT}" "$nginx_local_conf" "${SSH_TARGET}:${NGINX_CONF_PATH}"
    test_and_reload_nginx "$NGINX_CONF_PATH" "ssh_exec" "$SSH_TARGET"
  fi

  echo ""
  print_success "Nginx 配置更新完成！"
  print_info "配置文件: ${NGINX_CONF_PATH}"
  [ "$ssl_cert_files_exist" = "true" ] && print_info "SSL 证书: ${SSL_CERT_DIR}/${ssl_cert_name}.*"
}

# ============================================
# 启动 Nginx
# ============================================
cmd_start_nginx() {
  print_info "检查并启动 Nginx..."
  start_nginx_service "ssh_exec" "$SSH_TARGET"
  echo ""
  print_success "Nginx 启动完成！"
}

# ============================================
# Docker 相关函数
# ============================================

# 构建 Docker 镜像
cmd_docker_build() {
  print_info "构建 Docker 镜像..."
  echo ""
  
  cd "$PROJECT_ROOT" || return 1
  check_file_exists "Dockerfile" "未找到 Dockerfile" || return 1

  local base_image="nginx:1.25-alpine"
  local build_platform="${BUILD_PLATFORM:-linux/amd64}"
  
  # 检查基础镜像是否存在
  if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${base_image}$"; then
    print_info "拉取基础镜像..."
    if ! docker pull --platform "$build_platform" "$base_image"; then
      print_error "基础镜像拉取失败，请手动拉取: docker pull --platform $build_platform $base_image"
      return 1
    fi
  fi

  local build_msg="构建镜像（平台: ${build_platform}）..."
  print_info "$build_msg"
  if ! docker build --platform "$build_platform" -t "${DOCKER_IMAGE_NAME}:latest" .; then
    print_error "Docker 镜像构建失败"
    return 1
  fi
  
  print_success "Docker 镜像构建完成！"
  docker images | grep "$DOCKER_IMAGE_NAME" || true
}

# 启动 Docker 容器（本地调试）
cmd_docker_up() {
  print_info "启动 Docker 容器（本地调试模式）..."
  echo ""
  
  cd "$PROJECT_ROOT" || return 1
  check_file_exists "docker-compose.yml" "未找到 docker-compose.yml" || return 1
  
  local port="${PORT:-8082}"
  if is_port_in_use "$port"; then
    print_warning "端口 $port 已被占用"
    echo "使用自定义端口: PORT=8081 ./scripts/site-dashboard.sh docker-up"
    return 1
  fi
  
  if ! docker-compose -f "$DOCKER_COMPOSE_FILE" up -d; then
    print_error "Docker 容器启动失败"
    return 1
  fi
  
  echo ""
  print_success "Docker 容器已启动！"
  print_info "访问地址: http://localhost:${port}"
  print_info "查看日志: ./scripts/site-dashboard.sh docker-logs"
  print_info "停止容器: ./scripts/site-dashboard.sh docker-down"
}

# 停止 Docker 容器
cmd_docker_down() {
  print_info "停止 Docker 容器..."
  echo ""
  
  cd "$PROJECT_ROOT" || return 1
  docker-compose -f "$DOCKER_COMPOSE_FILE" down
  
  echo ""
  print_success "Docker 容器已停止！"
}

# 查看 Docker 容器日志
cmd_docker_logs() {
  print_info "查看 Docker 容器日志..."
  echo ""
  
  cd "$PROJECT_ROOT" || return 1
  docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f --tail=100
}

# 进入 Docker 容器 shell
cmd_docker_shell() {
  print_info "进入 Docker 容器 shell..."
  echo ""
  
  cd "$PROJECT_ROOT" || return 1
  
  if ! docker ps --format "{{.Names}}" | grep -q "^${DOCKER_CONTAINER_NAME}$"; then
    print_error "容器未运行，请先启动容器"
    echo "启动容器: ./scripts/site-dashboard.sh docker-up"
    return 1
  fi
  
  docker exec -it "$DOCKER_CONTAINER_NAME" /bin/sh
}

# 重启 Docker 容器
cmd_docker_restart() {
  print_info "重启 Docker 容器..."
  echo ""
  
  cd "$PROJECT_ROOT" || return 1
  docker-compose -f "$DOCKER_COMPOSE_FILE" restart
  
  echo ""
  print_success "Docker 容器已重启！"
}

# 使用 Docker 部署到服务器
cmd_docker_deploy() {
  print_info "使用 Docker 部署到服务器 ${SERVER_HOST}..."
  echo ""
  
  cd "$PROJECT_ROOT" || return 1
  
  # 1. 构建镜像
  print_info "[1/4] 构建 Docker 镜像..."
  if ! cmd_docker_build; then
    return 1
  fi
  
  # 2. 导出镜像
  print_info "[2/4] 导出镜像..."
  local temp_image_file
  temp_image_file=$(mktemp).tar.gz
  register_cleanup "$temp_image_file"
  
  if ! docker save "${DOCKER_IMAGE_NAME}:latest" | gzip > "$temp_image_file"; then
    print_error "镜像导出失败"
    return 1
  fi
  
  # 3. 上传镜像
  print_info "[3/4] 上传镜像到服务器..."
  local remote_image_file="/tmp/site-dashboard-image.tar.gz"
  if ! scp $SSH_OPTIONS -P "${SERVER_PORT}" "$temp_image_file" "${SSH_TARGET}:${remote_image_file}"; then
    print_error "镜像上传失败"
    return 1
  fi
  
  # 4. 在服务器上加载并运行
  print_info "[4/4] 在服务器上加载镜像并运行容器..."
  ssh_exec << ENDSSH
set -euo pipefail
docker load < ${remote_image_file}
docker stop ${DOCKER_CONTAINER_NAME} 2>/dev/null || true
docker rm ${DOCKER_CONTAINER_NAME} 2>/dev/null || true
docker run -d --name ${DOCKER_CONTAINER_NAME} --restart unless-stopped -p 127.0.0.1:8082:80 ${DOCKER_IMAGE_NAME}:latest
rm -f ${remote_image_file}
echo "✓ 容器已启动"
docker ps | grep ${DOCKER_CONTAINER_NAME} || true
ENDSSH
  
  echo ""
  print_success "Docker 部署完成！"
  print_info "容器端口: 127.0.0.1:8082"
  print_info "配置 Nginx: ./scripts/site-dashboard.sh update-nginx scripts/site-dashboard.nginx.docker.conf"
}

# ============================================
# 主函数
# ============================================
main() {
  show_welcome "${1:-}"
  COMMAND="${1:-help}"

  case "$COMMAND" in
    update-ssh-key)
      cmd_update_ssh_key
      ;;
    update-nginx)
      cmd_update_nginx "${2:-}"
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

# 初始化 SSH 连接（在加载共用脚本后）
init_ssh_connection

# 执行主函数
main "$@"
