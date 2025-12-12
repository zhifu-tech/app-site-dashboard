# API 集成指南

## 概述

`site-dashboard` 前端应用**完全通过 API 获取数据**，不再使用本地文件。

所有站点数据由 `site-dashboard-server` 管理，前端通过 REST API 获取。

## 配置 API（必需）

### 方法 1: 使用配置文件（推荐）⭐

修改 `js/config/config.js` 文件：

```javascript
export const config = {
  apiBaseUrl: 'http://localhost:3002/api', // 开发环境
  // apiBaseUrl: 'https://api.example.com/api', // 生产环境
};
```

**优点：**
- ✅ 配置集中管理
- ✅ 易于切换环境
- ✅ 代码清晰，HTML 保持简洁
- ✅ 不需要修改 HTML

### 方法 2: 通过 HTML 属性配置

在 `index.html` 中，为 script 标签添加 `data-api-base` 属性：

```html
<script 
  data-api-base="http://localhost:3002/api" 
  src="js/main.js" 
  type="module">
</script>
```

### 方法 3: 通过全局变量配置

在加载 `main.js` 之前设置全局变量：

```html
<script>
  window.SITE_DASHBOARD_API_BASE = 'http://localhost:3002/api';
</script>
<script src="js/main.js" type="module"></script>
```

### 方法 4: 自动检测（仅限 localhost）

在 localhost 环境下，如果不配置，会自动使用 `http://localhost:3002/api`。

**生产环境必须显式配置 API 地址**，否则会抛出错误。

**配置优先级**：配置文件 > HTML 属性 > 全局变量 > 自动检测

## API 端点要求

应用需要以下 API 端点：

### 1. 获取站点列表

```http
GET /api/sites
```

**响应格式：**
```json
{
  "success": true,
  "data": [
    "site-chatgpt.yml",
    "site-cursor.yml",
    ...
  ],
  "count": 11
}
```

### 2. 获取单个站点数据

```http
GET /api/sites/:filename
```

**响应格式：**
```json
{
  "success": true,
  "data": {
    "name": "ChatGPT",
    "url": "https://chatgpt.com/",
    "icon": "💬",
    "description": "...",
    "links": [...],
    "tags": [...]
  }
}
```

## 工作流程

1. **检查 API 配置**：应用启动时检查是否配置了 API 地址（必需）
2. **获取站点列表**：从 API 获取所有站点文件名列表
3. **并行获取站点数据**：并行请求所有站点的详细数据
4. **渲染界面**：将获取到的站点数据渲染到界面

## 优势

- ✅ **实时数据**：数据由服务器端管理，更新即时生效
- ✅ **统一管理**：通过 API 可以统一管理所有站点数据
- ✅ **权限控制**：可以在服务器端实现权限控制
- ✅ **数据验证**：服务器端可以验证数据格式
- ✅ **无需构建**：不需要生成索引文件或构建步骤
- ✅ **CRUD 支持**：支持通过 API 进行完整的增删改查操作

## 示例配置

### 开发环境

```html
<!-- 使用本地 API 服务器 -->
<script 
  data-api-base="http://localhost:3002/api" 
  src="js/main.js" 
  type="module">
</script>
```

### 生产环境

```html
<!-- 使用生产 API 服务器 -->
<script 
  data-api-base="https://api.example.com/api" 
  src="js/main.js" 
  type="module">
</script>
```

### 配置检查

应用启动时会检查 API 配置，如果未配置会抛出错误：

```javascript
// 错误示例
Error: API 地址未配置。请在 HTML 中设置 data-api-base 属性或配置 window.SITE_DASHBOARD_API_BASE 变量。
```

## 调试

### 检查当前使用的模式

打开浏览器控制台，查看日志：

```
[DataLoader] 尝试从 API 加载数据: http://localhost:3002/api
[DataLoader] 从 API 成功加载了 11 个站点
```

或

```
[DataLoader] API 加载失败，回退到文件模式
[DataLoader] 从文件成功加载了 11 个站点
```

### 测试 API 连接

```bash
# 测试站点列表 API
curl http://localhost:3002/api/sites

# 测试单个站点 API
curl http://localhost:3002/api/sites/site-chatgpt.yml
```

## 常见问题

### Q: API 服务器未启动怎么办？

A: 应用会无法加载数据。必须确保 `site-dashboard-server` 已启动并运行在正确的端口。

### Q: 如何修改 API 地址？

A: 修改 `index.html` 中的 `data-api-base` 属性，或设置 `window.SITE_DASHBOARD_API_BASE` 变量。

### Q: 生产环境如何配置？

A: 修改 `index.html` 中的 API 地址为生产环境的 API 服务器地址：
```html
<script data-api-base="https://api.example.com/api" src="js/main.js" type="module"></script>
```

### Q: API 响应慢怎么办？

A: API 模式会并行请求所有站点数据。如果仍然慢，可以考虑：
1. 优化 API 服务器性能
2. 检查网络连接
3. 考虑添加缓存机制
