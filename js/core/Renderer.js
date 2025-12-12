/**
 * 渲染器
 * 负责渲染网站卡片和 UI 元素
 * @module core/Renderer
 */
export class Renderer {
  constructor() {
    this.cardTemplate = document.getElementById("siteCardTemplate");
  }

  /**
   * 渲染网站卡片
   * @param {Object} site - 网站数据
   * @returns {HTMLElement} 卡片元素
   */
  renderSiteCard(site) {
    const card = this.cardTemplate.content.cloneNode(true).querySelector(".site-card");

    // 设置数据属性
    card.dataset.siteId = site.name.toLowerCase().replace(/\s+/g, "-");
    card.dataset.name = site.name;
    card.dataset.description = site.description || "";
    card.dataset.tags = (site.tags || []).join(" ");

    // 设置图标
    const iconEl = card.querySelector(".site-icon");
    iconEl.textContent = site.icon || "🔗";
    iconEl.setAttribute("aria-label", `${site.name} 图标`);

    // 设置名称和链接
    const nameLink = card.querySelector(".site-link-main");
    nameLink.textContent = site.name;
    nameLink.href = site.url;
    nameLink.setAttribute("aria-label", `访问 ${site.name}`);

    // 设置描述
    const descriptionEl = card.querySelector(".site-description");
    if (site.description) {
      descriptionEl.textContent = site.description;
    } else {
      descriptionEl.remove();
    }

    // 渲染标签
    const tagsContainer = card.querySelector(".site-tags");
    if (site.tags && site.tags.length > 0) {
      site.tags.forEach((tag) => {
        const tagEl = this.createTagElement(tag);
        tagsContainer.appendChild(tagEl);
      });
    } else {
      tagsContainer.remove();
    }

    // 渲染链接
    const linksContainer = card.querySelector(".site-links");
    if (site.links && site.links.length > 0) {
      site.links.forEach((link) => {
        const linkEl = this.createLinkElement(link);
        linksContainer.appendChild(linkEl);
      });
    } else {
      linksContainer.remove();
    }

    return card;
  }

  /**
   * 创建标签元素
   * @param {string} tag - 标签文本
   * @returns {HTMLElement} 标签元素
   */
  createTagElement(tag) {
    const tagEl = document.createElement("button");
    tagEl.type = "button";
    tagEl.className = "site-tag";
    tagEl.textContent = tag;
    tagEl.dataset.tag = tag;
    tagEl.setAttribute("aria-label", `过滤标签: ${tag}`);
    tagEl.setAttribute("title", `点击添加/移除标签: ${tag}`);
    return tagEl;
  }

  /**
   * 创建链接元素
   * @param {Object} link - 链接对象 {text, url}
   * @returns {HTMLElement} 链接元素
   */
  createLinkElement(link) {
    const linkEl = document.createElement("a");
    linkEl.href = link.url;
    linkEl.textContent = link.text;
    linkEl.className = "site-link";
    linkEl.target = "_blank";
    linkEl.rel = "noopener noreferrer";
    linkEl.setAttribute("aria-label", `访问 ${link.text}`);
    return linkEl;
  }

  /**
   * 渲染网站列表
   * @param {Array<Object>} sites - 网站数据数组
   * @param {HTMLElement} container - 容器元素
   */
  renderSites(sites, container) {
    const grid = document.createElement("div");
    grid.className = "sites-grid";
    grid.setAttribute("role", "list");

    sites.forEach((site) => {
      const card = this.renderSiteCard(site);
      card.setAttribute("role", "listitem");
      grid.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(grid);
  }

  /**
   * 显示加载状态
   * @param {HTMLElement} container - 容器元素
   */
  showLoading(container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p class="loading-text">正在加载网站数据...</p>
      </div>
    `;
    container.setAttribute("aria-busy", "true");
  }

  /**
   * 显示错误状态
   * @param {HTMLElement} container - 容器元素
   * @param {string} message - 错误消息
   */
  showError(container, message = "加载网站数据失败，请刷新页面重试。") {
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon" aria-hidden="true">⚠️</div>
        <p class="error-text">${message}</p>
        <button type="button" class="error-retry" onclick="location.reload()">重试</button>
      </div>
    `;
    container.setAttribute("aria-busy", "false");
  }

  /**
   * 显示空状态
   * @param {HTMLElement} container - 容器元素
   * @param {string} query - 搜索查询
   */
  showEmpty(container, query = "") {
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">🔍</div>
        <p class="empty-text">未找到相关网站</p>
        ${
          query
            ? `
          <a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer" class="google-search-link">
            <span aria-hidden="true">🔍</span>
            <span>在 Google 中搜索 "${query}"</span>
          </a>
        `
            : ""
        }
      </div>
    `;
    container.setAttribute("aria-busy", "false");
  }

  /**
   * 更新卡片可见性
   * @param {HTMLElement} card - 卡片元素
   * @param {boolean} visible - 是否可见
   */
  toggleCardVisibility(card, visible) {
    card.classList.toggle("hidden", !visible);
    card.setAttribute("aria-hidden", !visible);
  }
}

