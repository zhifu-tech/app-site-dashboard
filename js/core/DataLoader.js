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
   * @returns {Promise<Array>} 网站数据数组
   */
  async loadSites() {
    try {
      // 1. 获取站点列表
      const apiUrl = `${this.apiBaseUrl}/api/sites`;
      console.info(`[DataLoader] 从 API 加载站点列表: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error("API 返回数据格式错误");
      }
      
      // API 返回的是文件名列表，需要逐个获取站点数据
      const siteFiles = result.data;
      console.info(`[DataLoader] 获取到 ${siteFiles.length} 个站点文件`);
      
      // 2. 并行获取所有站点数据
      const loadPromises = siteFiles.map(async (filename) => {
        try {
          const siteUrl = `${this.apiBaseUrl}/api/sites/${encodeURIComponent(filename)}`;
          const siteResponse = await fetch(siteUrl);
          
          if (!siteResponse.ok) {
            console.warn(`[DataLoader] 无法加载站点: ${filename} (${siteResponse.status})`);
            return null;
          }
          
          const siteResult = await siteResponse.json();
          if (!siteResult.success || !siteResult.data) {
            console.warn(`[DataLoader] 站点数据格式错误: ${filename}`);
            return null;
          }
          
          return siteResult.data;
        } catch (error) {
          console.warn(`[DataLoader] 加载站点失败: ${filename}`, error);
          return null;
        }
      });
      
      const results = await Promise.allSettled(loadPromises);
      
      // 3. 提取成功加载的站点数据
      const sitesData = results
        .map((result) => {
          if (result.status === "fulfilled" && result.value) {
            return result.value;
          }
          return null;
        })
        .filter(site => site !== null && site?.name && site?.url);

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

