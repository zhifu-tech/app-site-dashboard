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
    card.dataset.url = site.url || "";
    card.dataset.description = site.description || "";
    card.dataset.tags = (site.tags || []).join(" ");

    // 设置图标
    const iconEl = card.querySelector(".site-icon");
    if (!iconEl) {
      console.warn(`[Renderer] 未找到图标元素，站点: ${site.name}`);
      return;
    }
    
    // 清空内容并重置样式
    iconEl.innerHTML = "";
    iconEl.style.display = "flex";
    
    if (site.icon && site.icon.trim()) {
      const iconImg = document.createElement("img");
      iconImg.src = site.icon;
      iconImg.alt = `${site.name} 图标`;
      iconImg.className = "site-icon-img";
      iconImg.loading = "lazy";
      
      // 图片加载成功
      iconImg.onload = function() {
        console.debug(`[Renderer] 图标加载成功: ${site.name}`);
      };
      
      // 图片加载失败 - 显示默认图标
      iconImg.onerror = function() {
        console.warn(`[Renderer] 图标加载失败: ${site.name} - ${site.icon}`);
        // 移除失败的图片
        if (this.parentNode === iconEl) {
          iconEl.removeChild(this);
        }
        // 显示默认图标
        const fallbackIcon = document.createTextNode("🔗");
        iconEl.appendChild(fallbackIcon);
      };
      
      // 添加图片到容器
      iconEl.appendChild(iconImg);
    } else {
      // 没有图标URL，显示默认图标
      iconEl.textContent = "🔗";
    }
    
    iconEl.setAttribute("aria-label", `${site.name} 图标`);

    // 设置名称和链接
    const nameLink = card.querySelector(".site-link-main");
    nameLink.textContent = site.name;
    nameLink.href = site.url;
    nameLink.setAttribute("aria-label", `访问 ${site.name}`);

    // 设置操作按钮的数据属性
    const moreBtn = card.querySelector(".site-action-more");
    const editBtn = card.querySelector(".site-action-edit");
    const deleteBtn = card.querySelector(".site-action-delete");
    const menu = card.querySelector(".site-action-menu");
    
    if (moreBtn) {
      moreBtn.dataset.siteUrl = site.url || "";
      moreBtn.dataset.siteName = site.name || "";
    }
    if (editBtn) {
      editBtn.dataset.siteUrl = site.url || "";
      editBtn.dataset.siteName = site.name || "";
    }
    if (deleteBtn) {
      deleteBtn.dataset.siteUrl = site.url || "";
      deleteBtn.dataset.siteName = site.name || "";
    }
    
    // 点击更多按钮切换菜单显示
    if (moreBtn && menu) {
      moreBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isExpanded = moreBtn.getAttribute("aria-expanded") === "true";
        const newExpanded = !isExpanded;
        moreBtn.setAttribute("aria-expanded", String(newExpanded));
        if (newExpanded) {
          menu.classList.add("site-action-menu-open");
        } else {
          menu.classList.remove("site-action-menu-open");
        }
      });
    }

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
   * @param {string|null} detectedUrl - 检测到的 URL（如果有）
   */
  renderSites(sites, container, detectedUrl = null) {
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

    // 如果有检测到的 URL，添加添加站点卡片
    if (detectedUrl) {
      this.showAddSiteCard(grid, detectedUrl);
    }

    // 应用瀑布流布局
    this.applyMasonryLayout(grid);
  }

  /**
   * 应用瀑布流布局
   * @param {HTMLElement} grid - 网格容器元素
   */
  applyMasonryLayout(grid) {
    // 移动端使用相对定位，不需要瀑布流
    if (window.innerWidth <= 767) {
      return;
    }

    const cards = Array.from(grid.querySelectorAll(".site-card, .add-site-card"));
    if (cards.length === 0) {
      return;
    }

    // 获取 CSS 变量值
    const cardWidth = this.getMasonryCardWidth();
    const gap = parseFloat(getComputedStyle(grid).getPropertyValue("--card-gap")) || 16;
    const columns = this.getMasonryColumns();

    // 初始化列高度数组
    const columnHeights = new Array(columns).fill(0);

    // 计算每个卡片的位置
    cards.forEach((card, index) => {
      // 确保卡片可见并测量高度
      card.style.visibility = "hidden";
      card.style.position = "absolute";
      card.style.width = `${cardWidth}px`;
      card.style.opacity = "0";

      // 找到最短的列
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));

      // 计算位置
      const left = shortestColumnIndex * (cardWidth + gap);
      const top = columnHeights[shortestColumnIndex];

      // 设置位置
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;

      // 更新列高度
      // 需要先添加到 DOM 才能获取实际高度
      const cardHeight = card.offsetHeight || card.getBoundingClientRect().height;
      columnHeights[shortestColumnIndex] += cardHeight + gap;

      // 显示卡片
      card.style.visibility = "visible";
      card.style.opacity = "1";
    });

    // 设置容器高度
    const maxHeight = Math.max(...columnHeights);
    grid.style.height = `${maxHeight}px`;

    // 监听窗口大小变化，重新布局
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.applyMasonryLayout(grid);
      }, 250);
    };

    // 移除旧的监听器（如果存在）
    if (grid._masonryResizeHandler) {
      window.removeEventListener("resize", grid._masonryResizeHandler);
    }

    // 添加新的监听器
    grid._masonryResizeHandler = handleResize;
    window.addEventListener("resize", handleResize);
  }

  /**
   * 获取瀑布流卡片宽度
   * @returns {number} 卡片宽度（像素）
   */
  getMasonryCardWidth() {
    const grid = document.querySelector(".sites-grid");
    if (!grid) return 280;

    const computedStyle = getComputedStyle(grid);
    const cardWidth = computedStyle.getPropertyValue("--masonry-card-width");
    
    if (cardWidth) {
      // 解析 calc() 表达式
      const match = cardWidth.match(/calc\((.+)\)/);
      if (match) {
        // 简单处理：计算实际值
        const containerWidth = grid.offsetWidth || grid.clientWidth;
        const columns = this.getMasonryColumns();
        const gap = parseFloat(computedStyle.getPropertyValue("--card-gap")) || 16;
        return (containerWidth - (columns - 1) * gap) / columns;
      }
      return parseFloat(cardWidth);
    }

    // 默认计算
    const containerWidth = grid.offsetWidth || grid.clientWidth;
    const columns = this.getMasonryColumns();
    const gap = parseFloat(computedStyle.getPropertyValue("--card-gap")) || 16;
    return (containerWidth - (columns - 1) * gap) / columns;
  }

  /**
   * 获取瀑布流列数
   * @returns {number} 列数
   */
  getMasonryColumns() {
    const width = window.innerWidth;
    if (width >= 1400) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
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
   * @param {string|null} detectedUrl - 检测到的 URL（如果有）
   */
  showEmpty(container, query = "", detectedUrl = null) {
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const escapedQuery = this.escapeHtml(query);
    const escapedUrl = detectedUrl ? this.escapeHtml(detectedUrl) : "";
    
    // AI平台按钮配置
    const aiPlatforms = [
      {
        name: "腾讯元宝",
        url: "https://yuanbao.tencent.com/chat",
        icon: "💎",
        className: "ai-platform-button ai-platform-yuanbao"
      },
      {
        name: "ChatGPT",
        url: "https://chatgpt.com/",
        icon: "💬",
        className: "ai-platform-button ai-platform-chatgpt"
      }
    ];

    const aiPlatformButtons = detectedUrl
      ? `
        <div class="ai-platforms">
          <p class="ai-platforms-title">添加站点：</p>
          <div class="ai-platforms-list">
            <button 
              type="button" 
              class="create-site-button" 
              data-url="${escapedUrl}"
              aria-label="新建站点"
            >
              <span class="ai-platform-icon" aria-hidden="true">➕</span>
              <span class="ai-platform-name">新建站点</span>
            </button>
            ${aiPlatforms.map(platform => `
              <button 
                type="button" 
                class="${platform.className}" 
                data-platform="${this.escapeHtml(platform.name)}"
                data-url="${escapedUrl}"
                data-target="${this.escapeHtml(platform.url)}"
                aria-label="使用 ${platform.name} 生成站点信息"
              >
                <span class="ai-platform-icon" aria-hidden="true">${platform.icon}</span>
                <span class="ai-platform-name">${platform.name}</span>
              </button>
            `).join("")}
          </div>
        </div>
      `
      : "";

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">🔍</div>
        <p class="empty-text">未找到相关网站</p>
        ${aiPlatformButtons}
        ${
          query && !detectedUrl
            ? `
          <a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer" class="google-search-link">
            <span aria-hidden="true">🔍</span>
            <span>在 Google 中搜索 "${escapedQuery}"</span>
          </a>
        `
            : ""
        }
      </div>
    `;
    container.setAttribute("aria-busy", "false");
  }

  /**
   * 显示添加站点卡片（当有搜索结果但检测到 URL 时）
   * @param {HTMLElement} grid - 网格容器元素
   * @param {string} url - 检测到的 URL
   */
  showAddSiteCard(grid, url) {
    const addSiteCard = document.createElement("div");
    addSiteCard.className = "add-site-card";
    addSiteCard.setAttribute("role", "listitem");
    
    // AI平台按钮配置
    const aiPlatforms = [
      {
        name: "腾讯元宝",
        url: "https://yuanbao.tencent.com/chat",
        icon: "💎",
        className: "ai-platform-button ai-platform-yuanbao"
      },
      {
        name: "ChatGPT",
        url: "https://chatgpt.com/",
        icon: "💬",
        className: "ai-platform-button ai-platform-chatgpt"
      }
    ];

    addSiteCard.innerHTML = `
      <div class="add-site-card-content">
        <div class="add-site-card-icon" aria-hidden="true">➕</div>
        <div class="add-site-card-info">
          <h3 class="add-site-card-title">添加新站点</h3>
          <p class="add-site-card-url">${this.escapeHtml(url)}</p>
        </div>
        <div class="add-site-card-actions">
          <p class="ai-platforms-title-small">添加站点：</p>
          <div class="ai-platforms-list-small">
            <button 
              type="button" 
              class="create-site-button" 
              data-url="${this.escapeHtml(url)}"
              aria-label="新建站点"
            >
              <span class="ai-platform-icon" aria-hidden="true">➕</span>
              <span class="ai-platform-name">新建站点</span>
            </button>
            ${aiPlatforms.map(platform => `
              <button 
                type="button" 
                class="${platform.className}" 
                data-platform="${this.escapeHtml(platform.name)}"
                data-url="${this.escapeHtml(url)}"
                data-target="${this.escapeHtml(platform.url)}"
                aria-label="使用 ${platform.name} 生成站点信息"
              >
                <span class="ai-platform-icon" aria-hidden="true">${platform.icon}</span>
                <span class="ai-platform-name">${platform.name}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
    grid.appendChild(addSiteCard);
  }

  /**
   * HTML 转义
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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

