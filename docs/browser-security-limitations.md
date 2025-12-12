# 浏览器环境中的目录遍历限制

## 为什么浏览器无法直接遍历服务器目录？

### 1. 安全模型限制

浏览器遵循**同源策略（Same-Origin Policy）**，这是 Web 安全的基础：

```
同源 = 协议 + 域名 + 端口 完全相同

✅ 同源示例：
- http://example.com/page1.html
- http://example.com/page2.html

❌ 不同源示例：
- http://example.com 和 https://example.com（协议不同）
- http://example.com 和 http://api.example.com（域名不同）
- http://example.com:80 和 http://example.com:8080（端口不同）
```

### 2. 文件系统访问限制

浏览器**不允许 JavaScript 直接访问服务器文件系统**，原因包括：

#### 2.1 防止信息泄露
```javascript
// ❌ 浏览器不允许这样做
const files = await fs.readdir('/etc/passwd');  // 无法执行
const config = await fs.readFile('/var/www/config.json');  // 无法执行
```

如果允许，恶意网站可以：
- 读取服务器上的敏感文件（配置文件、私钥、数据库密码等）
- 探测服务器目录结构
- 发现隐藏文件或备份文件

#### 2.2 防止跨站攻击
```javascript
// ❌ 恶意网站无法这样做
fetch('https://bank.com/internal/users.json')  // 会被 CORS 阻止
fetch('file:///etc/passwd')  // 浏览器会阻止
```

#### 2.3 防止路径遍历攻击
```javascript
// ❌ 浏览器会阻止这种尝试
fetch('/data/../../../etc/passwd')  // 服务器应该拒绝，浏览器也会检查
```

### 3. HTTP 协议的限制

HTTP 协议本身**不支持目录列表**（除非服务器明确配置）：

```
GET /data/ HTTP/1.1
Host: example.com

# 服务器响应：
# ❌ 默认情况下，服务器不会返回目录内容列表
# ✅ 服务器只会返回：
#   - 如果存在 index.html，返回 index.html
#   - 如果配置了目录索引，返回 HTML 目录列表（需要服务器配置）
#   - 否则返回 403 Forbidden 或 404 Not Found
```

### 4. 浏览器 API 的限制

#### 4.1 File System Access API（仅限本地文件）
```javascript
// ✅ 仅适用于用户主动选择的本地文件
const fileHandle = await window.showOpenFilePicker();
// 用户必须主动选择文件，无法自动扫描目录
```

#### 4.2 Fetch API 的限制
```javascript
// ✅ 可以请求已知的文件
fetch('/data/site-chatgpt.yml')  // 可以

// ❌ 无法列出目录内容
fetch('/data/')  // 如果服务器未配置目录索引，返回 403/404
```

### 5. 实际场景示例

#### 场景 1：尝试列出目录
```javascript
// ❌ 无法直接实现
async function listDirectory(path) {
  // 浏览器没有这样的 API
  const files = await fs.readdir(path);  // ReferenceError: fs is not defined
  return files;
}
```

#### 场景 2：尝试使用 Fetch 获取目录列表
```javascript
// ❌ 如果服务器未配置目录索引，会失败
const response = await fetch('/data/');
// 返回：403 Forbidden 或 404 Not Found
// 即使服务器返回 HTML 目录列表，也需要解析 HTML，不可靠
```

#### 场景 3：我们的解决方案（尝试加载已知文件）
```javascript
// ✅ 我们的实现方式
async function discoverSiteFiles() {
  const candidateFiles = ['site-chatgpt.yml', 'site-cursor.yml', ...];
  
  // 并行尝试加载每个文件
  const results = await Promise.all(
    candidateFiles.map(file => 
      fetch(`/data/${file}`, { method: 'HEAD' })
        .then(res => res.ok ? file : null)
        .catch(() => null)
    )
  );
  
  return results.filter(Boolean);
}
```

### 6. 替代方案对比

#### 方案 1：索引文件（我们采用的方案）
```javascript
// ✅ 优点：
// - 快速（一次请求获取所有文件名）
// - 可靠（服务器端生成，保证准确性）
// - 性能好（减少请求次数）

// ❌ 缺点：
// - 需要维护索引文件（但我们用脚本自动生成）
```

#### 方案 2：服务器端 API
```javascript
// ✅ 优点：
// - 完全动态
// - 可以实时获取文件列表

// ❌ 缺点：
// - 需要后端支持
// - 增加服务器负担
// - 不符合纯前端项目需求

// 示例：
fetch('/api/sites/list')
  .then(res => res.json())
  .then(files => { /* ... */ });
```

#### 方案 3：目录索引（服务器配置）
```javascript
// ✅ 优点：
// - 服务器自动生成目录列表

// ❌ 缺点：
// - 需要服务器配置（Apache/Nginx）
// - 安全性问题（可能暴露敏感文件）
// - HTML 解析不可靠

// Nginx 配置示例：
// autoindex on;  # 启用目录索引
```

#### 方案 4：尝试加载候选文件（我们的回退方案）
```javascript
// ✅ 优点：
// - 不需要服务器支持
// - 纯前端实现

// ❌ 缺点：
// - 需要维护候选列表
// - 性能较差（多次请求）
// - 可能遗漏文件
```

### 7. 我们的实现策略

我们采用了**双重机制**：

```javascript
async loadSites() {
  // 1. 优先使用索引文件（快速、准确）
  let siteFiles = await this.loadSiteFilesFromIndex();
  
  // 2. 如果索引不存在，使用自动发现（回退方案）
  if (!siteFiles || siteFiles.length === 0) {
    siteFiles = await this.discoverSiteFiles();
  }
  
  // 3. 加载所有站点文件
  return await this.loadAllSites(siteFiles);
}
```

**优势：**
- ✅ **性能优先**：有索引时快速加载
- ✅ **向后兼容**：索引不存在时自动回退
- ✅ **自动化**：部署时自动生成索引
- ✅ **纯前端**：不需要后端支持

### 8. 安全考虑总结

浏览器限制目录遍历是为了：

1. **保护服务器安全**
   - 防止敏感文件泄露
   - 防止路径遍历攻击
   - 防止信息泄露

2. **保护用户隐私**
   - 防止恶意网站读取本地文件
   - 防止跨站攻击

3. **维护 Web 安全模型**
   - 同源策略
   - CORS 机制
   - 内容安全策略（CSP）

### 9. 最佳实践

对于我们的项目：

1. **使用索引文件**（推荐）
   ```bash
   npm run generate:sites  # 自动生成索引
   ```

2. **部署时自动生成**
   - 部署脚本自动运行生成命令
   - Docker 构建时自动生成

3. **回退机制**
   - 索引不存在时使用自动发现
   - 确保应用始终可用

4. **版本控制**
   - 索引文件可以提交到 Git（可选）
   - 或者每次部署时重新生成

## 总结

浏览器无法直接遍历服务器目录是**有意为之的安全设计**，目的是：
- 🔒 保护服务器安全
- 🔒 保护用户隐私
- 🔒 维护 Web 安全模型

我们的解决方案通过**索引文件 + 自动发现**的双重机制，既保证了性能，又保证了可用性，同时完全符合浏览器的安全限制。
