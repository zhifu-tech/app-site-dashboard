/**
 * Dashboard 主应用类
 * 协调各个模块，管理应用状态
 * @module app/Dashboard
 */
import { DataLoader } from "../core/DataLoader.js";
import { SearchManager } from "../core/SearchManager.js";
import { Renderer } from "../core/Renderer.js";
import { SiteCreator } from "../core/SiteCreator.js";
import { RulesLoader } from "../core/RulesLoader.js";
import { Modal } from "../core/Modal.js";
import { debounce } from "../utils/debounce.js";

export class Dashboard {
  constructor() {
    this.dataLoader = new DataLoader();
    this.searchManager = new SearchManager();
    this.renderer = new Renderer();
    this.siteCreator = new SiteCreator();
    this.rulesLoader = new RulesLoader();
    this.modal = new Modal();

    this.sites = [];
    this.filteredSites = [];
    this.detectedUrl = null;

    this.elements = {
      container: document.getElementById("dashboardContent"),
      searchInput: document.getElementById("searchInput"),
      searchClear: document.getElementById("searchClear"),
    };

    this.init();
  }

  /**
   * 初始化应用
   */
  async init() {
    if (!this.elements.container || !this.elements.searchInput) {
      console.error("[Dashboard] 必需的 DOM 元素未找到");
      return;
    }

    this.setupEventListeners();
    await this.loadData();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 搜索输入防抖处理
    const debouncedSearch = debounce((e) => {
      this.handleSearch(e.target.value);
    }, 300);

    this.elements.searchInput.addEventListener("input", debouncedSearch);
    this.elements.searchInput.addEventListener("focus", () => {
      this.elements.searchInput.select();
    });

    // 清空搜索按钮
    if (this.elements.searchClear) {
      this.elements.searchClear.addEventListener("click", () => {
        this.elements.searchInput.value = "";
        this.handleSearch("");
        this.elements.searchInput.focus();
      });
    }

    // 快捷键支持
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + K 聚焦搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        this.elements.searchInput?.focus();
        this.elements.searchInput?.select();
      }
      // Esc 清空搜索
      else if (e.key === "Escape" && this.elements.searchInput?.value) {
        this.elements.searchInput.value = "";
        this.handleSearch("");
        this.elements.searchInput.blur();
      }
    });

    // 标签点击事件委托
    this.elements.container.addEventListener("click", (e) => {
      if (e.target.classList.contains("site-tag")) {
        e.preventDefault();
        e.stopPropagation();
        const tag = e.target.dataset.tag;
        if (tag) {
          this.handleTagClick(tag);
        }
      }
      // AI平台按钮点击事件
      else if (e.target.closest(".ai-platform-button")) {
        e.preventDefault();
        e.stopPropagation();
        const button = e.target.closest(".ai-platform-button");
        const url = button?.dataset.url;
        const targetUrl = button?.dataset.target;
        if (url && targetUrl) {
          this.handleAiPlatformClick(url, targetUrl);
        }
      }
      // 站点操作按钮点击事件
      else if (e.target.closest(".site-action-edit")) {
        e.preventDefault();
        e.stopPropagation();
        const button = e.target.closest(".site-action-edit");
        const url = button?.dataset.siteUrl;
        // 关闭菜单
        const menu = button?.closest(".site-action-menu");
        const moreBtn = button?.closest(".site-card")?.querySelector(".site-action-more");
        if (menu) menu.classList.remove("site-action-menu-open");
        if (moreBtn) moreBtn.setAttribute("aria-expanded", "false");
        if (url) {
          this.handleEditSite(url);
        }
      }
      else if (e.target.closest(".site-action-delete")) {
        e.preventDefault();
        e.stopPropagation();
        const button = e.target.closest(".site-action-delete");
        const url = button?.dataset.siteUrl;
        const name = button?.dataset.siteName;
        // 关闭菜单
        const menu = button?.closest(".site-action-menu");
        const moreBtn = button?.closest(".site-card")?.querySelector(".site-action-more");
        if (menu) menu.classList.remove("site-action-menu-open");
        if (moreBtn) moreBtn.setAttribute("aria-expanded", "false");
        if (url) {
          this.handleDeleteSite(url, name);
        }
      }
      // 点击外部关闭菜单
      else if (!e.target.closest(".site-card-actions")) {
        document.querySelectorAll(".site-action-menu").forEach(menu => {
          menu.classList.remove("site-action-menu-open");
        });
        document.querySelectorAll(".site-action-more").forEach(btn => {
          btn.setAttribute("aria-expanded", "false");
        });
      }
    });

    // 检查URL参数，看是否有从AI平台返回的数据
    this.checkUrlParams();
  }

  /**
   * 加载数据
   */
  async loadData() {
    this.renderer.showLoading(this.elements.container);

    try {
      this.sites = await this.dataLoader.loadSites();
      this.filteredSites = [...this.sites];
      this.render();
    } catch (error) {
      console.error("[Dashboard] 数据加载失败:", error);
      this.renderer.showError(this.elements.container, "加载网站数据失败，请刷新页面重试。");
    }
  }

  /**
   * 处理搜索
   * @param {string} query - 搜索查询
   */
  handleSearch(query) {
    const { searchTerm, tags } = this.searchManager.parseQuery(query);

    // 更新清空按钮显示状态
    if (this.elements.searchClear) {
      this.elements.searchClear.hidden = !query.trim();
    }

    // 检测输入是否为 URL
    const detectedUrl = this.searchManager.detectUrl(query);
    if (detectedUrl) {
      // 检查该 URL 是否已存在
      const exists = this.searchManager.siteExists(this.sites, detectedUrl);
      this.detectedUrl = exists ? null : detectedUrl;
    } else {
      this.detectedUrl = null;
    }

    // 过滤网站
    this.filteredSites = this.sites.filter((site) =>
      this.searchManager.matchSite(site, searchTerm, tags)
    );

    this.render();
  }

  /**
   * 处理标签点击
   * @param {string} tag - 标签名称
   */
  handleTagClick(tag) {
    const activeTags = this.searchManager.toggleTag(tag);

    // 更新搜索框
    if (activeTags.length > 0) {
      const currentQuery = this.elements.searchInput.value.trim();
      const { searchTerm } = this.searchManager.parseQuery(currentQuery);
      const newQuery = searchTerm
        ? `${searchTerm}, ${this.searchManager.formatTags(activeTags)}`
        : this.searchManager.formatTags(activeTags);
      this.elements.searchInput.value = newQuery;
    } else {
      const currentQuery = this.elements.searchInput.value.trim();
      const { searchTerm } = this.searchManager.parseQuery(currentQuery);
      this.elements.searchInput.value = searchTerm;
    }

    this.handleSearch(this.elements.searchInput.value);
    this.elements.searchInput.focus();
  }

  /**
   * 渲染界面
   */
  render() {
    if (this.filteredSites.length === 0) {
      const query = this.elements.searchInput.value.trim();
      this.renderer.showEmpty(this.elements.container, query, this.detectedUrl);
      return;
    }

    // 如果有检测到的 URL 且不在结果中，显示添加站点卡片
    this.renderer.renderSites(this.filteredSites, this.elements.container, this.detectedUrl);

    this.elements.container.setAttribute("aria-busy", "false");
  }

  /**
   * 处理AI平台按钮点击
   * @param {string} url - 站点 URL
   * @param {string} targetUrl - AI平台URL
   */
  async handleAiPlatformClick(url, targetUrl) {
    try {
      // 加载规则并复制到剪切板
      const prompt = await this.rulesLoader.loadAndCopyRules(url);
      
      // 构建返回URL（包含站点URL作为参数）
      const returnUrl = `${window.location.origin}${window.location.pathname}?siteUrl=${encodeURIComponent(url)}`;
      
      // 将返回URL也复制到剪切板（方便用户使用）
      const fullPrompt = `${prompt}\n\n请将生成的YAML数据复制后，返回以下页面并粘贴到URL参数 siteData 中：\n${returnUrl}\n\n或者，您可以将YAML数据保存到浏览器的localStorage中，键名为 "pendingSiteData"，然后刷新页面。`;
      
      // 再次复制完整提示（包含返回URL）
      await this.rulesLoader.copyToClipboard(fullPrompt);
      
      // 跳转到AI平台
      window.open(targetUrl, "_blank");
      
      // 显示提示信息
      alert(`规则和提示已复制到剪切板！\n\n操作步骤：\n1. 在AI平台中粘贴提示信息\n2. 生成站点数据（YAML格式）\n3. 复制生成的YAML数据\n4. 返回此页面，将YAML数据添加到URL参数 siteData 中\n\n或者：将YAML数据保存到localStorage（键名：pendingSiteData）后刷新页面`);
    } catch (error) {
      console.error("[Dashboard] 处理AI平台点击失败:", error);
      alert(`操作失败: ${error.message || "未知错误"}`);
    }
  }

  /**
   * 检查URL参数，看是否有从AI平台返回的数据
   */
  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const siteDataParam = urlParams.get("siteData");
    
    // 也检查localStorage（用于处理大数据）
    const storedSiteData = localStorage.getItem("pendingSiteData");
    
    let yamlContent = null;
    if (siteDataParam) {
      yamlContent = decodeURIComponent(siteDataParam);
      // 清理URL参数
      const newUrl = window.location.pathname + (urlParams.get("siteUrl") ? `?siteUrl=${urlParams.get("siteUrl")}` : "");
      window.history.replaceState({}, "", newUrl);
    } else if (storedSiteData) {
      yamlContent = storedSiteData;
      localStorage.removeItem("pendingSiteData");
    }
    
    if (yamlContent) {
      // 显示原始YAML文本，不进行解析预览
      this.modal.showYamlContent(yamlContent, async (editedYaml) => {
        try {
          // 解析YAML数据
          const siteData = this.parseYamlFromUrl(editedYaml);
          if (siteData) {
            // 保存站点数据
            await this.saveSiteData(siteData);
          } else {
            alert("YAML格式错误，无法解析站点数据");
          }
        } catch (error) {
          console.error("[Dashboard] 解析站点数据失败:", error);
          alert(`解析站点数据失败: ${error.message || "未知错误"}`);
        }
      });
    }
  }

  /**
   * 从URL参数解析YAML数据
   * @param {string} yamlString - YAML字符串（可能经过URL编码）
   * @returns {Object|null} 解析后的站点数据对象
   */
  parseYamlFromUrl(yamlString) {
    try {
      // URL解码
      let decoded = yamlString;
      try {
        decoded = decodeURIComponent(yamlString);
      } catch {
        // 如果解码失败，使用原始字符串
        decoded = yamlString;
      }
      
      // 尝试提取YAML代码块
      const yamlMatch = decoded.match(/```(?:yaml)?\s*\n([\s\S]*?)\n```/);
      const yamlContent = yamlMatch ? yamlMatch[1] : decoded;
      
      // 简单的YAML解析（基本字段）
      const data = {};
      const lines = yamlContent.split("\n");
      
      let currentSection = null;
      let currentLink = null;
      let descriptionLines = [];
      let inDescription = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const indent = line.length - line.trimStart().length;
        
        // 跳过注释和空行
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }
        
        // 处理数组项（以 - 开头）
        if (trimmed.startsWith("-")) {
          const item = trimmed.substring(1).trim();
          
          if (currentSection === "links") {
            // 如果当前有未完成的链接，先保存它
            if (currentLink && currentLink.text) {
              if (!data.links) data.links = [];
              // 即使没有 url 也保存（可能后续会补充）
              data.links.push(currentLink);
            }
            
            // 开始新链接
            currentLink = {};
            
            // 解析text和url（可能在同一行）
            const textMatch = item.match(/text:\s*(.+?)(?:\s+url:|$)/);
            const urlMatch = item.match(/url:\s*(.+)/);
            
            if (textMatch) {
              currentLink.text = this.cleanYamlValue(textMatch[1]);
            }
            if (urlMatch) {
              currentLink.url = this.cleanYamlValue(urlMatch[1]);
            }
          } else if (currentSection === "tags") {
            // 解析标签
            if (!data.tags) data.tags = [];
            const tag = this.cleanYamlValue(item);
            if (tag) data.tags.push(tag);
          }
          continue;
        }
        
        // 处理缩进的键值对（可能是链接的属性或其他嵌套内容）
        if (indent >= 2) {
          if (currentSection === "links" && currentLink) {
            // 这是链接的属性（如 url）
            const colonIndex = trimmed.indexOf(":");
            if (colonIndex > 0) {
              const key = trimmed.substring(0, colonIndex).trim();
              const value = this.cleanYamlValue(trimmed.substring(colonIndex + 1).trim());
              currentLink[key] = value;
            }
            continue;
          } else if (inDescription) {
            // 多行描述
            descriptionLines.push(trimmed);
            continue;
          }
        }
        
        // 处理顶级键值对（indent < 2）
        const colonIndex = trimmed.indexOf(":");
        if (colonIndex > 0 && indent < 2) {
          // 先保存之前的链接
          if (currentSection === "links" && currentLink && currentLink.text) {
            if (!data.links) data.links = [];
            data.links.push(currentLink);
            currentLink = null;
          }
          
          // 结束描述
          if (inDescription && descriptionLines.length > 0) {
            data.description = descriptionLines.join(" ").trim();
            inDescription = false;
            descriptionLines = [];
          }
          
          const key = trimmed.substring(0, colonIndex).trim();
          let value = trimmed.substring(colonIndex + 1).trim();
          
          // 检查是否是数组开始
          if (value === "" || value === "[]") {
            if (key === "links") {
              currentSection = "links";
              data.links = [];
              currentLink = null;
            } else if (key === "tags") {
              currentSection = "tags";
              data.tags = [];
            } else {
              currentSection = null;
            }
            continue;
          }
          
          // 处理普通字段
          value = this.cleanYamlValue(value);
          
          if (key === "description") {
            // 描述可能是多行的
            inDescription = true;
            descriptionLines = [value];
            currentSection = null;
          } else if (key === "links") {
            currentSection = "links";
            data.links = [];
            currentLink = null;
          } else if (key === "tags") {
            currentSection = "tags";
            data.tags = [];
          } else {
            currentSection = null;
            inDescription = false;
            data[key] = value;
          }
        }
      }
      
      // 处理最后一个链接
      if (currentSection === "links" && currentLink && currentLink.text) {
        if (!data.links) data.links = [];
        data.links.push(currentLink);
      }
      
      // 处理最后的描述
      if (inDescription && descriptionLines.length > 0) {
        data.description = descriptionLines.join(" ").trim();
      }
      
      // 验证必需字段
      if (!data.name || !data.url) {
        throw new Error("缺少必需字段: name 或 url");
      }
      
      // 确保数组字段存在
      if (!data.links) data.links = [];
      if (!data.tags) data.tags = [];
      
      return data;
    } catch (error) {
      console.error("[Dashboard] YAML解析失败:", error);
      throw error;
    }
  }

  /**
   * 清理YAML值（移除引号等）
   * @param {string} value - YAML值
   * @returns {string} 清理后的值
   */
  cleanYamlValue(value) {
    if (!value) return "";
    return value.replace(/^["']|["']$/g, "").trim();
  }

  /**
   * 将站点数据转换为YAML格式
   * @param {Object} siteData - 站点数据对象
   * @returns {string} YAML格式字符串
   */
  siteDataToYaml(siteData) {
    const lines = [];
    
    // 必需字段
    if (siteData.group) lines.push(`group: ${siteData.group}`);
    if (siteData.name) lines.push(`name: ${siteData.name}`);
    if (siteData.url) lines.push(`url: ${siteData.url}`);
    if (siteData.icon) lines.push(`icon: ${siteData.icon}`);
    if (siteData.description) lines.push(`description: ${siteData.description}`);
    
    // 链接数组
    if (siteData.links && siteData.links.length > 0) {
      lines.push("links:");
      siteData.links.forEach(link => {
        lines.push(`  - text: ${link.text}`);
        lines.push(`    url: ${link.url}`);
      });
    }
    
    // 标签数组
    if (siteData.tags && siteData.tags.length > 0) {
      lines.push("tags:");
      siteData.tags.forEach(tag => {
        lines.push(`  - ${tag}`);
      });
    }
    
    return lines.join("\n");
  }

  /**
   * 处理编辑站点
   * @param {string} url - 站点 URL
   */
  async handleEditSite(url) {
    try {
      // 获取站点数据
      const siteData = await this.siteCreator.getSite(url);
      
      // 转换为YAML格式
      const yamlContent = this.siteDataToYaml(siteData);
      
      // 显示编辑弹窗
      this.modal.showYamlContent(yamlContent, async (editedYaml) => {
        try {
          // 解析YAML数据
          const parsedData = this.parseYamlFromUrl(editedYaml);
          if (parsedData) {
            // 保存站点数据（覆盖）
            await this.saveSiteData(parsedData);
          } else {
            alert("YAML格式错误，无法解析站点数据");
          }
        } catch (error) {
          console.error("[Dashboard] 编辑站点失败:", error);
          alert(`编辑站点失败: ${error.message || "未知错误"}`);
        }
      }, true); // 传入true表示编辑模式
    } catch (error) {
      console.error("[Dashboard] 获取站点数据失败:", error);
      alert(`获取站点数据失败: ${error.message || "未知错误"}`);
    }
  }

  /**
   * 处理删除站点
   * @param {string} url - 站点 URL
   * @param {string} name - 站点名称
   */
  async handleDeleteSite(url, name) {
    try {
      // 确认删除
      const confirmed = confirm(`确定要删除站点 "${name}" 吗？\n\n此操作不可撤销。`);
      if (!confirmed) {
        return;
      }

      // 调用删除API
      await this.siteCreator.deleteSite(url);

      // 重新加载数据
      await this.loadData();

      // 显示成功消息
      alert("站点删除成功！");
    } catch (error) {
      console.error("[Dashboard] 删除站点失败:", error);
      alert(`删除站点失败: ${error.message || "未知错误"}`);
    }
  }

  /**
   * 保存站点数据
   * @param {Object} siteData - 站点数据对象
   */
  async saveSiteData(siteData) {
    try {
      // 调用 SiteCreator 创建站点
      await this.siteCreator.createSite(siteData);

      // 重新加载数据
      await this.loadData();

      // 显示成功消息
      alert("站点保存成功！");
      
      // 清空搜索框
      this.elements.searchInput.value = "";
      this.handleSearch("");
    } catch (error) {
      console.error("[Dashboard] 保存站点失败:", error);
      alert(`保存站点失败: ${error.message || "未知错误"}`);
      throw error;
    }
  }
}

