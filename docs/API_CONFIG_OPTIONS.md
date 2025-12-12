# API 配置方案对比

## 为什么推荐使用配置文件？

### 当前推荐方案：单独的配置文件

```javascript
// js/config/config.js
export const config = {
  apiBaseUrl: 'http://localhost:3002/api'
};
```

**优点：**
- ✅ **配置集中**：所有配置在一个文件中，易于管理
- ✅ **代码清晰**：HTML 保持简洁，不混入配置
- ✅ **易于切换环境**：开发/生产环境只需修改一个文件
- ✅ **类型安全**：可以使用 JSDoc 或 TypeScript 提供类型提示
- ✅ **版本控制友好**：可以创建不同环境的配置文件
- ✅ **无需修改 HTML**：配置和代码分离

**缺点：**
- ⚠️ **需要额外文件**：但这是值得的，因为配置更清晰

## 其他可选方案

### 方案 1: HTML 中配置

```html
<script data-api-base="http://localhost:3002/api" src="js/main.js" type="module"></script>
```

**优点：**
- ✅ 简单直接
- ✅ 无需额外文件

**缺点：**
- ❌ 配置和 HTML 混在一起
- ❌ 不同环境需要修改 HTML
- ❌ 不够灵活

### 方案 2: 全局变量

```html
<script>
  window.SITE_DASHBOARD_API_BASE = 'http://localhost:3002/api';
</script>
```

**优点：**
- ✅ 可以在运行时动态设置

**缺点：**
- ❌ 污染全局命名空间
- ❌ 不够优雅

### 方案 3: 自动检测

```javascript
// localhost 环境自动使用 http://localhost:3002/api
```

**优点：**
- ✅ 开发环境零配置

**缺点：**
- ❌ 生产环境仍需配置
- ❌ 不够明确

## 推荐方案的优势

使用 `js/config/config.js` 配置文件是最佳选择，因为：

1. **配置与代码分离**：配置和业务逻辑分开，更清晰
2. **易于管理**：所有配置集中在一个地方
3. **环境切换简单**：开发/生产环境只需修改一个文件
4. **HTML 保持简洁**：不需要在 HTML 中添加配置属性
5. **可扩展性强**：可以轻松添加其他配置项

## 使用示例

### 开发环境

```javascript
// js/config/config.js
export const config = {
  apiBaseUrl: 'http://localhost:3002/api',
};
```

### 生产环境

```javascript
// js/config/config.js
export const config = {
  apiBaseUrl: 'https://api.example.com/api',
};
```

### 多环境配置（可选）

如果需要支持多环境，可以创建多个配置文件：

```javascript
// js/config/config.dev.js
export const config = {
  apiBaseUrl: 'http://localhost:3002/api',
};

// js/config/config.prod.js
export const config = {
  apiBaseUrl: 'https://api.example.com/api',
};
```

然后在构建或部署时选择对应的配置文件。
