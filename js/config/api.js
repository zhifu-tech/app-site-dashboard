/**
 * API 配置
 * @module config/api
 */

/**
 * API 配置
 * 支持多种配置方式（按优先级）：
 * 1. 配置文件：js/config/config.js（推荐）
 * 2. HTML data 属性：<script data-api-base="...">
 * 3. 全局变量：window.SITE_DASHBOARD_API_BASE
 * 4. 自动检测：localhost 环境自动使用 http://localhost:3002/api
 * @module config/api
 */

import { config as appConfig } from './config.js';

export const apiConfig = {
  /**
   * 获取 API 基础 URL
   * @returns {string} API 基础 URL
   * @throws {Error} 如果未配置 API 地址
   */
  getBaseUrl() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // 1. 优先使用配置文件（推荐方式）
    if (appConfig?.apiBaseUrl) {
      const baseUrl = appConfig.apiBaseUrl.replace(/\/$/, ''); // 移除末尾斜杠
      
      // 如果是相对路径（以 / 开头）
      if (baseUrl.startsWith('/')) {
        // 开发环境：相对路径无法访问 localhost:3002，需要转换为完整 URL
        if (isLocalhost) {
          return `${protocol}//${hostname}:3002/api`;
        }
        // 生产环境：直接返回相对路径（通过 Nginx 代理）
        return baseUrl;
      }
      
      // 完整 URL，直接返回
      return baseUrl;
    }

    // 2. 检查是否有全局配置（通过 script 标签的 data 属性）
    const scriptTag = document.querySelector('script[data-api-base]');
    if (scriptTag) {
      const apiBase = scriptTag.getAttribute('data-api-base');
      if (apiBase && apiBase.trim()) {
        const baseUrl = apiBase.trim().replace(/\/$/, '');
        // 相对路径在开发环境需要转换
        if (baseUrl.startsWith('/') && isLocalhost) {
          return `${protocol}//${hostname}:3002/api`;
        }
        return baseUrl;
      }
    }

    // 3. 检查是否有全局变量（通过 window 对象）
    if (window.SITE_DASHBOARD_API_BASE) {
      const apiBase = window.SITE_DASHBOARD_API_BASE;
      if (apiBase && apiBase.trim()) {
        const baseUrl = apiBase.trim().replace(/\/$/, '');
        // 相对路径在开发环境需要转换
        if (baseUrl.startsWith('/') && isLocalhost) {
          return `${protocol}//${hostname}:3002/api`;
        }
        return baseUrl;
      }
    }

    // 4. 默认值：从当前域名推断（仅限 localhost 环境）
    if (isLocalhost) {
      return `${protocol}//${hostname}:3002/api`;
    }
    
    // 生产环境必须显式配置
    throw new Error(
      'API 地址未配置。请修改 js/config/config.js 文件中的 apiBaseUrl，' +
      '或在 HTML 中设置 data-api-base 属性，或配置 window.SITE_DASHBOARD_API_BASE 变量。'
    );
  },

  /**
   * 检查是否启用 API 模式
   * @returns {boolean}
   */
  isApiEnabled() {
    try {
      return this.getBaseUrl() !== null;
    } catch {
      return false;
    }
  },
};
