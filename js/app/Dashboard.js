/**
 * Dashboard 主应用类
 * 协调各个模块，管理应用状态
 * @module app/Dashboard
 */
import { DataLoader } from "../core/DataLoader.js";
import { SearchManager } from "../core/SearchManager.js";
import { Renderer } from "../core/Renderer.js";
import { debounce } from "../utils/debounce.js";

export class Dashboard {
  constructor() {
    this.dataLoader = new DataLoader();
    this.searchManager = new SearchManager();
    this.renderer = new Renderer();

    this.sites = [];
    this.filteredSites = [];

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
    });
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
      this.renderer.showEmpty(this.elements.container, query);
      return;
    }

    this.renderer.renderSites(this.filteredSites, this.elements.container);
    this.elements.container.setAttribute("aria-busy", "false");
  }
}

