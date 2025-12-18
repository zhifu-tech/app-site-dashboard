/**
 * 弹窗组件
 * 用于显示和编辑站点数据
 * @module core/Modal
 */

export class Modal {
  constructor() {
    this.modal = null;
    this.overlay = null;
    this.isOpen = false;
  }

  /**
   * 创建弹窗HTML结构
   */
  createModal() {
    if (this.modal) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "modal-title");

    const modal = document.createElement("div");
    modal.className = "modal-container";
    modal.innerHTML = `
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">站点信息预览</h2>
        <button type="button" class="modal-close" aria-label="关闭弹窗">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="modal-content" id="modalContent">
          <!-- 内容将动态插入 -->
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="modal-button modal-button-secondary" id="modalCancel">取消</button>
        <button type="button" class="modal-button modal-button-primary" id="modalSave">保存</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    this.overlay = overlay;
    this.modal = modal;

    // 绑定关闭事件
    const closeBtn = modal.querySelector(".modal-close");
    const cancelBtn = modal.querySelector("#modalCancel");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
    closeBtn.addEventListener("click", () => this.close());
    cancelBtn.addEventListener("click", () => this.close());

    // ESC 键关闭
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * 显示原始YAML文本
   * @param {string} yamlContent - YAML文本内容
   * @param {Function} onSave - 保存回调函数，接收解析后的站点数据对象
   * @param {boolean} isEdit - 是否为编辑模式，默认为 false
   */
  showYamlContent(yamlContent, onSave, isEdit = false) {
    this.createModal();

    const title = this.modal.querySelector("#modal-title");
    title.textContent = isEdit ? "编辑站点信息（YAML格式）" : "站点信息（YAML格式）";

    const content = this.modal.querySelector("#modalContent");
    const footer = this.modal.querySelector(".modal-footer");
    
    // 确保 footer 有正确的按钮结构（如果之前被清空过）
    let saveBtn = this.modal.querySelector("#modalSave");
    let cancelBtn = this.modal.querySelector("#modalCancel");
    
    if (!saveBtn || !cancelBtn) {
      // 恢复 footer 的原始结构
      footer.innerHTML = `
        <button type="button" class="modal-button modal-button-secondary" id="modalCancel">取消</button>
        <button type="button" class="modal-button modal-button-primary" id="modalSave">保存</button>
      `;
      saveBtn = this.modal.querySelector("#modalSave");
      cancelBtn = this.modal.querySelector("#modalCancel");
    } else {
      // 确保按钮可见
      saveBtn.style.display = "";
      cancelBtn.textContent = "取消";
    }
    
    const labelText = isEdit 
      ? "编辑站点信息：" 
      : "从第三方平台复制的站点信息：";

    // 显示原始YAML文本
    content.innerHTML = `
      <div class="yaml-editor-container">
        <label for="yamlEditor" class="yaml-editor-label">${this.escapeHtml(labelText)}</label>
        <textarea 
          id="yamlEditor" 
          class="yaml-editor" 
          rows="20" 
          spellcheck="false"
          placeholder="请粘贴从AI平台生成的YAML格式站点信息..."
        >${this.escapeHtml(yamlContent)}</textarea>
        <p class="yaml-editor-hint">您可以在此编辑YAML内容，确认无误后点击保存按钮。</p>
      </div>
    `;

    const yamlEditor = content.querySelector("#yamlEditor");

    // 绑定保存事件
    saveBtn.onclick = () => {
      const editedYaml = yamlEditor.value.trim();
      if (!editedYaml) {
        alert("YAML内容不能为空");
        return;
      }

      if (onSave) {
        // 传递原始YAML文本，让调用者解析
        onSave(editedYaml);
      }
      this.close();
    };

    // 绑定取消事件
    cancelBtn.onclick = () => {
      this.close();
    };

    // 聚焦到文本区域
    setTimeout(() => {
      yamlEditor.focus();
      yamlEditor.select();
    }, 100);

    this.open();
  }

  /**
   * 显示站点数据预览（保留此方法以兼容旧代码）
   * @param {Object} siteData - 站点数据对象
   * @param {Function} onSave - 保存回调函数
   */
  showSitePreview(siteData, onSave) {
    this.createModal();

    const content = this.modal.querySelector("#modalContent");
    const saveBtn = this.modal.querySelector("#modalSave");

    // 渲染站点数据预览
    content.innerHTML = this.renderSitePreview(siteData);

    // 绑定保存事件
    saveBtn.onclick = () => {
      if (onSave) {
        onSave(siteData);
      }
      this.close();
    };

    this.open();
  }

  /**
   * 渲染站点数据预览
   * @param {Object} siteData - 站点数据对象
   * @returns {string} HTML字符串
   */
  renderSitePreview(siteData) {
    const linksHtml = siteData.links && siteData.links.length > 0
      ? `
        <div class="preview-section">
          <h3 class="preview-section-title">相关链接</h3>
          <ul class="preview-links">
            ${siteData.links.map(link => `
              <li>
                <a href="${this.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                  ${this.escapeHtml(link.text)}
                </a>
              </li>
            `).join("")}
          </ul>
        </div>
      `
      : "";

    const tagsHtml = siteData.tags && siteData.tags.length > 0
      ? `
        <div class="preview-section">
          <h3 class="preview-section-title">标签</h3>
          <div class="preview-tags">
            ${siteData.tags.map(tag => `
              <span class="preview-tag">${this.escapeHtml(tag)}</span>
            `).join("")}
          </div>
        </div>
      `
      : "";

    return `
      <div class="preview-site">
        <div class="preview-header">
          <div class="preview-icon">${this.escapeHtml(siteData.icon || "🔗")}</div>
          <div class="preview-info">
            <h3 class="preview-name">${this.escapeHtml(siteData.name || "")}</h3>
            <a href="${this.escapeHtml(siteData.url || "")}" target="_blank" rel="noopener noreferrer" class="preview-url">
              ${this.escapeHtml(siteData.url || "")}
            </a>
          </div>
        </div>
        <div class="preview-section">
          <h3 class="preview-section-title">描述</h3>
          <p class="preview-description">${this.escapeHtml(siteData.description || "")}</p>
        </div>
        ${linksHtml}
        ${tagsHtml}
      </div>
    `;
  }

  /**
   * 显示AI平台提示弹窗
   * @param {string} url - 站点 URL
   * @param {string} targetUrl - AI平台URL
   * @param {string} prompt - 已复制的提示内容
   */
  showAiPlatformPrompt(url, targetUrl, prompt) {
    this.createModal();

    const title = this.modal.querySelector("#modal-title");
    title.textContent = "使用 AI 生成站点信息";

    const content = this.modal.querySelector("#modalContent");
    const saveBtn = this.modal.querySelector("#modalSave");
    const cancelBtn = this.modal.querySelector("#modalCancel");
    
    // 隐藏保存按钮，改为显示"新建站点"和"前往AI平台"按钮
    saveBtn.style.display = "none";
    cancelBtn.textContent = "取消";

    content.innerHTML = `
      <div class="ai-platform-prompt-container">
        <div class="ai-platform-prompt-icon" aria-hidden="true">🤖</div>
        <div class="ai-platform-prompt-content">
          <p class="ai-platform-prompt-text">
            <strong>规则和提示已复制到剪切板！</strong>
          </p>
          <div class="ai-platform-prompt-steps">
            <p class="ai-platform-prompt-steps-title">操作步骤：</p>
            <ol class="ai-platform-prompt-steps-list">
              <li>在AI平台中粘贴提示信息</li>
              <li>生成站点数据（YAML格式）</li>
              <li>复制生成的YAML数据</li>
            </ol>
          </div>
        </div>
      </div>
    `;

    // 创建自定义按钮容器
    const footer = this.modal.querySelector(".modal-footer");
    const createSiteBtn = document.createElement("button");
    createSiteBtn.type = "button";
    createSiteBtn.className = "modal-button modal-button-primary";
    createSiteBtn.textContent = "新建站点";
    createSiteBtn.id = "modalCreateSite";
    
    const goToAiBtn = document.createElement("button");
    goToAiBtn.type = "button";
    goToAiBtn.className = "modal-button modal-button-secondary";
    goToAiBtn.textContent = "前往AI平台";
    goToAiBtn.id = "modalGoToAi";

    // 清空footer并添加新按钮
    footer.innerHTML = "";
    footer.appendChild(createSiteBtn);
    footer.appendChild(goToAiBtn);
    footer.appendChild(cancelBtn);

    // 绑定事件
    createSiteBtn.onclick = () => {
      this.close();
      // 触发自定义事件，让Dashboard处理
      const event = new CustomEvent("createSiteFromPrompt", { 
        detail: { url } 
      });
      window.dispatchEvent(event);
    };

    goToAiBtn.onclick = () => {
      window.open(targetUrl, "_blank");
      this.close();
    };

    cancelBtn.onclick = () => {
      this.close();
    };

    this.open();
  }

  /**
   * HTML 转义
   */
  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 打开弹窗
   */
  open() {
    if (!this.modal) {
      this.createModal();
    }
    this.isOpen = true;
    this.overlay.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    
    // 聚焦到关闭按钮
    setTimeout(() => {
      const closeBtn = this.modal.querySelector(".modal-close");
      if (closeBtn) {
        closeBtn.focus();
      }
    }, 100);
  }

  /**
   * 关闭弹窗
   */
  close() {
    if (!this.modal) return;
    this.isOpen = false;
    this.overlay.classList.remove("modal-open");
    document.body.style.overflow = "";
  }

  /**
   * 销毁弹窗
   */
  destroy() {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
      this.modal = null;
    }
    this.isOpen = false;
  }
}

