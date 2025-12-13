/**
 * 搜索和过滤管理器
 * 负责处理搜索查询和标签过滤
 * @module core/SearchManager
 */
export class SearchManager {
  constructor() {
    this.activeTags = new Set();
  }

  /**
   * 解析搜索查询中的标签
   * @param {string} query - 搜索查询
   * @returns {Object} 包含搜索词和标签的对象
   */
  parseQuery(query) {
    const trimmed = query.trim();
    if (!trimmed) {
      return { searchTerm: "", tags: [] };
    }

    const parts = trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const tags = parts.filter((part) => part.startsWith("#"));
    const searchTerm = parts.filter((part) => !part.startsWith("#")).join(" ");

    return {
      searchTerm: searchTerm.toLowerCase(),
      tags: tags.map((tag) => tag.slice(1).toLowerCase()),
    };
  }

  /**
   * 格式化标签为搜索查询格式
   * @param {Array<string>} tags - 标签数组
   * @returns {string} 格式化的查询字符串
   */
  formatTags(tags) {
    return tags.map((tag) => `#${tag}`).join(", ");
  }

  /**
   * 匹配网站数据
   * @param {Object} site - 网站数据对象
   * @param {string} searchTerm - 搜索词
   * @param {Array<string>} tags - 标签数组
   * @returns {boolean} 是否匹配
   */
  matchSite(site, searchTerm, tags) {
    const siteText =
      `${site.name} ${site.description || ""} ${(site.tags || []).join(" ")}`.toLowerCase();

    // 标签过滤：所有标签都必须匹配（AND 逻辑）
    if (tags.length > 0) {
      const siteTags = (site.tags || []).map((tag) => tag.toLowerCase());
      const allTagsMatch = tags.every((tag) => siteTags.includes(tag));
      if (!allTagsMatch) return false;
    }

    // 搜索词过滤
    if (searchTerm) {
      return siteText.includes(searchTerm);
    }

    return true;
  }

  /**
   * 切换标签
   * @param {string} tag - 标签名称
   * @returns {Array<string>} 当前激活的标签数组
   */
  toggleTag(tag) {
    const normalizedTag = tag.toLowerCase();
    if (this.activeTags.has(normalizedTag)) {
      this.activeTags.delete(normalizedTag);
    } else {
      this.activeTags.add(normalizedTag);
    }
    return Array.from(this.activeTags);
  }

  /**
   * 检测输入是否为有效的 URL
   * @param {string} input - 输入字符串
   * @returns {string|null} 如果是有效 URL 则返回规范化后的 URL，否则返回 null
   */
  detectUrl(input) {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    // 尝试解析 URL
    try {
      // 如果输入不包含协议，尝试添加 https://
      let urlString = trimmed;
      if (!/^https?:\/\//i.test(urlString)) {
        urlString = `https://${urlString}`;
      }

      const url = new URL(urlString);
      // 只接受 http 和 https 协议
      if (url.protocol === "http:" || url.protocol === "https:") {
        // 规范化 URL：移除末尾斜杠（除了根路径）
        const normalizedUrl = url.href.replace(/\/$/, "") || url.href;
        return normalizedUrl;
      }
    } catch (error) {
      // URL 解析失败，不是有效的 URL
      return null;
    }

    return null;
  }

  /**
   * 检查站点列表中是否已存在该 URL
   * @param {Array<Object>} sites - 站点列表
   * @param {string} url - 要检查的 URL
   * @returns {boolean} 是否存在
   */
  siteExists(sites, url) {
    if (!sites || !url) {
      return false;
    }

    // 规范化 URL 用于比较（移除协议、www、末尾斜杠等）
    const normalizeUrlForCompare = (urlStr) => {
      try {
        const urlObj = new URL(urlStr);
        let hostname = urlObj.hostname.replace(/^www\./i, "");
        let pathname = urlObj.pathname.replace(/\/$/, "") || "/";
        return `${hostname}${pathname}`.toLowerCase();
      } catch {
        return urlStr.toLowerCase();
      }
    };

    const normalizedTargetUrl = normalizeUrlForCompare(url);
    return sites.some((site) => {
      if (!site.url) return false;
      const normalizedSiteUrl = normalizeUrlForCompare(site.url);
      return normalizedSiteUrl === normalizedTargetUrl;
    });
  }
}

