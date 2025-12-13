/**
 * 站点创建服务
 * 负责调用后端 API 创建新站点
 * @module core/SiteCreator
 */

import { apiConfig } from "../config/api.js";

export class SiteCreator {
  constructor() {
    try {
      this.apiBaseUrl = apiConfig.getBaseUrl();
      console.info(`[SiteCreator] API 地址: ${this.apiBaseUrl}`);
    } catch (error) {
      console.error("[SiteCreator] API 配置错误:", error.message);
      throw error;
    }
  }

  /**
   * 直接创建站点（使用已有的站点数据）
   * @param {Object} siteData - 站点数据对象
   * @param {boolean} overwrite - 是否覆盖已存在的文件，默认为 true
   * @returns {Promise<Object>} 创建的站点数据
   */
  async createSite(siteData, overwrite = true) {
    try {
      const createUrl = `${this.apiBaseUrl}/api/sites`;
      console.info(`[SiteCreator] 创建站点: ${createUrl}`, { siteData, overwrite });

      // 添加 overwrite 参数
      const requestData = {
        ...siteData,
        overwrite: overwrite,
      };

      const createResponse = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || `创建站点失败: ${createResponse.status} ${createResponse.statusText}`
        );
      }

      const createResult = await createResponse.json();
      if (!createResult.success || !createResult.data) {
        throw new Error("创建站点失败: 返回数据格式错误");
      }

      console.info(`[SiteCreator] 站点${createResult.overwritten ? "更新" : "创建"}成功:`, createResult.data);
      return createResult.data;
    } catch (error) {
      console.error("[SiteCreator] 创建站点失败:", error);
      throw error;
    }
  }

  /**
   * 获取站点数据
   * @param {string} url - 站点 URL
   * @returns {Promise<Object>} 站点数据对象
   */
  async getSite(url) {
    try {
      // 根据URL查找站点文件名
      const sitesUrl = `${this.apiBaseUrl}/api/sites`;
      const sitesResponse = await fetch(sitesUrl);
      
      if (!sitesResponse.ok) {
        throw new Error(`获取站点列表失败: ${sitesResponse.status}`);
      }

      const sitesResult = await sitesResponse.json();
      if (!sitesResult.success || !Array.isArray(sitesResult.data)) {
        throw new Error("获取站点列表失败: 返回数据格式错误");
      }

      // 查找匹配的站点
      for (const filename of sitesResult.data) {
        const siteUrl = `${this.apiBaseUrl}/api/sites/${encodeURIComponent(filename)}`;
        const siteResponse = await fetch(siteUrl);
        
        if (siteResponse.ok) {
          const siteResult = await siteResponse.json();
          if (siteResult.success && siteResult.data && siteResult.data.url === url) {
            return siteResult.data;
          }
        }
      }

      throw new Error("未找到匹配的站点");
    } catch (error) {
      console.error("[SiteCreator] 获取站点失败:", error);
      throw error;
    }
  }

  /**
   * 删除站点
   * @param {string} url - 站点 URL
   * @returns {Promise<void>}
   */
  async deleteSite(url) {
    try {
      // 先获取站点数据以确定文件名
      const siteData = await this.getSite(url);
      
      // 生成文件名
      const filename = this.generateFilename(siteData.name);
      
      const deleteUrl = `${this.apiBaseUrl}/api/sites/${encodeURIComponent(filename)}`;
      console.info(`[SiteCreator] 删除站点: ${deleteUrl}`, { url, filename });

      const deleteResponse = await fetch(deleteUrl, {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || `删除站点失败: ${deleteResponse.status} ${deleteResponse.statusText}`
        );
      }

      const deleteResult = await deleteResponse.json();
      if (!deleteResult.success) {
        throw new Error("删除站点失败: 返回数据格式错误");
      }

      console.info(`[SiteCreator] 站点删除成功:`, filename);
      return deleteResult;
    } catch (error) {
      console.error("[SiteCreator] 删除站点失败:", error);
      throw error;
    }
  }

  /**
   * 生成文件名（从站点名称）
   * @param {string} name - 站点名称
   * @returns {string} 文件名
   */
  generateFilename(name) {
    const normalizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `site-${normalizedName}.yml`;
  }
}


