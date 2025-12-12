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
}

