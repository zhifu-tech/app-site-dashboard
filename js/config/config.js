/**
 * 应用配置
 * 集中管理所有配置项
 * @module config/config
 */

/**
 * 应用配置
 * 修改此文件来配置不同环境的 API 地址
 */
export const config = {
  /**
   * API 服务器地址
   * 
   * 开发环境：自动使用 http://localhost:3002/api（如果未配置）
   * 生产环境：使用相对路径 /api（通过 Nginx 代理），自动适配 HTTPS
   * 
   * 配置说明：
   * - 相对路径（如 '/api'）：生产环境通过 Nginx 代理，开发环境自动转换为 localhost:3002
   * - 完整 URL（如 'http://8.138.183.116:3002/api'）：直接使用，但可能导致混合内容问题
   * - null：自动检测，开发环境使用 localhost:3002，生产环境需要配置
   * 
   * 推荐配置：
   * - 生产环境：'/api'（避免混合内容问题）
   * - 开发环境：null 或 'http://localhost:3002/api'
   */
  apiBaseUrl: 'https://api.site-dashboard.zhifu.tech',
  
  /**
   * 其他配置项可以在这里添加
   */
  // appName: 'Site Dashboard',
  // version: '1.0.0',
};
