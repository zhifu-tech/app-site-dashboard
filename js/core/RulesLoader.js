/**
 * 规则文件加载器
 * 负责加载规则文件内容并复制到剪切板
 * @module core/RulesLoader
 */

import { apiConfig } from "../config/api.js";

export class RulesLoader {
  constructor() {
    try {
      this.apiBaseUrl = apiConfig.getBaseUrl();
      console.info(`[RulesLoader] API 地址: ${this.apiBaseUrl}`);
    } catch (error) {
      console.error("[RulesLoader] API 配置错误:", error.message);
      throw error;
    }
  }

  /**
   * 获取规则文件内容
   * @returns {Promise<string>} 规则文件内容
   */
  async getRulesContent() {
    try {
      const rulesUrl = `${this.apiBaseUrl}/api/rules/dashboard-new-site`;
      console.info(`[RulesLoader] 加载规则文件: ${rulesUrl}`);

      const response = await fetch(rulesUrl);
      
      if (!response.ok) {
        let errorMessage = `加载规则文件失败: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage += ` - ${errorData.error}`;
          }
        } catch {
          // 忽略JSON解析错误
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "规则文件加载失败");
      }
      
      if (!result.data) {
        throw new Error("规则文件内容为空");
      }

      return result.data;
    } catch (error) {
      console.error("[RulesLoader] 加载规则文件失败:", error);
      // 提供更友好的错误提示
      if (error.message.includes("404")) {
        throw new Error("规则文件API端点不存在，请确保后端服务器已重启并包含最新代码");
      }
      throw error;
    }
  }

  /**
   * 复制文本到剪切板
   * @param {string} text - 要复制的文本
   * @returns {Promise<void>}
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        console.info("[RulesLoader] 已复制到剪切板");
      } else {
        // 降级方案：使用传统方法
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        console.info("[RulesLoader] 已复制到剪切板（降级方案）");
      }
    } catch (error) {
      console.error("[RulesLoader] 复制到剪切板失败:", error);
      throw new Error("复制到剪切板失败，请手动复制");
    }
  }

  /**
   * 获取规则内容并复制到剪切板
   * @param {string} url - 站点URL（用于添加到规则内容中）
   * @returns {Promise<void>}
   */
  async loadAndCopyRules(url) {
    try {
      const rulesContent = await this.getRulesContent();
      
      // 在规则内容前添加站点URL信息
      const prompt = `请根据以下规则，为站点 ${url} 生成站点信息：

${rulesContent}

请按照上述规则生成完整的站点信息，返回格式为YAML格式，参考示例：
\`\`\`yaml
name: 站点名称
url: ${url}
icon: 🔗
description: 站点详细描述（50-150字）
links:
  - text: 链接文本
    url: https://example.com/
tags:
  - 标签1
  - 标签2
\`\`\``;

      await this.copyToClipboard(prompt);
      return prompt;
    } catch (error) {
      console.error("[RulesLoader] 加载并复制规则失败:", error);
      throw error;
    }
  }
}

