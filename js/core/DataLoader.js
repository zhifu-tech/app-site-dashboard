/**
 * 数据加载器
 * 负责从 API 服务器加载网站数据
 * @module core/DataLoader
 */

import { apiConfig } from "../config/api.js";

export class DataLoader {
  constructor() {
    // API 基础 URL（必须配置）
    try {
      this.apiBaseUrl = apiConfig.getBaseUrl();
      console.info(`[DataLoader] API 地址: ${this.apiBaseUrl}`);
    } catch (error) {
      console.error("[DataLoader] API 配置错误:", error.message);
      throw error;
    }
  }

  /**
   * 加载所有网站数据
   * 从 API 服务器获取站点数据
   * 优化：使用 full=true 参数一次性获取所有站点完整数据，避免多次请求
   * @returns {Promise<Array>} 网站数据数组
   */
  async loadSites() {
    try {
      // 使用 full=true 参数一次性获取所有站点的完整数据
      const apiUrl = `${this.apiBaseUrl}/api/sites?full=true`;
      console.info(`[DataLoader] 从 API 加载所有站点数据: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error("API 返回数据格式错误");
      }
      
      // 过滤掉无效的站点数据
      const sitesData = result.data.filter(
        site => site !== null && site?.name && site?.url
      );

      console.info(`[DataLoader] 成功加载了 ${sitesData.length} 个站点`);
      
      if (sitesData.length === 0) {
        throw new Error("未加载到任何站点数据，请检查 API 服务器是否正常运行");
      }
      
      return sitesData;
    } catch (error) {
      console.error("[DataLoader] 加载站点数据失败:", error);
      throw error;
    }
  }
}

