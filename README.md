# GetToolkit (English) - Free Online Tools

面向欧美用户的纯静态在线工具站。零后端、零 API 成本，所有处理在浏览器端完成。

## 技术栈

- 纯 HTML + CSS + 原生 JavaScript（和 easytool 一致）
- 无框架、无打包工具、无后端
- 部署到 Cloudflare Pages（免费）

## 项目结构

```
ai-tools-en/
├── index.html                      # 首页（工具导航）
├── tools/
│   ├── json-formatter.html         # JSON 格式化
│   ├── base64-converter.html       # Base64 编解码
│   ├── json-csv-converter.html     # JSON ↔ CSV 互转
│   └── image-compressor.html       # 图片压缩（Canvas API）
├── css/
│   └── style.css                   # 全站样式
├── js/
│   ├── json-formatter.js
│   ├── base64-converter.js
│   ├── json-csv-converter.js
│   └── image-compressor.js
├── sitemap.xml                     # SEO
├── robots.txt                      # SEO
└── README.md                       # 本文件
```

## 部署到 Cloudflare Pages

### 方法 1：直接上传（最简单）

1. 登录 Cloudflare Dashboard → Pages
2. Create a project → Upload assets
3. 把 `ai-tools-en` 目录下所有文件拖进去
4. 项目名填 `aitools-en`（会生成 getoolkit.com）
5. 部署完成

### 方法 2：Git 连接（推荐，后续更新方便）

1. 把 `ai-tools-en` 推到 GitHub 仓库
2. Cloudflare Pages → Create a project → Connect to Git
3. 选仓库，构建命令留空（纯静态），输出目录填 `.`
4. 部署

## 部署后必做

1. **Google Search Console**：添加站点 `https://getoolkit.com`
   - 验证方式：HTML meta 标签（加到 index.html）或 DNS TXT 记录
   - 提交 sitemap：`https://getoolkit.com/sitemap.xml`
2. **Google Analytics**：接入 GA4，跟踪 ID 加到每个页面
3. **域名**（可选，等起量后）：买个好域名绑上去，Cloudflare Pages 支持自定义域名 + 301 重定向

## 每个工具的 SEO 要点

- 每个工具页有独立 URL、独立 title、独立 description
- 每个工具页有 Schema.org 结构化数据（WebApplication 类型）
- 每个工具页有 FAQ section（增加长尾词覆盖）
- canonical 指向自身（避免重复内容）

## 下一步

- Week 2-3：再加 6-8 个工具页（参考下面的选题清单）
- Week 4 起：每周看 Google Search Console 数据，哪类人气旺加倍投入
- Week 8：方向复盘

## 待加工具清单（按简单到复杂）

**纯前端，零依赖：**
- [ ] HTML Entity Encoder/Decoder
- [ ] Text Diff (对比两段文本)
- [ ] Lorem Ipsum Generator
- [ ] Hash Calculator (MD5/SHA-1/SHA-256，用 SubtleCrypto API)
- [ ] Timestamp Converter
- [ ] Color Format Converter (HEX/RGB/HSL)
- [ ] Regex Tester
- [x] URL Encoder/Decoder ✅
- [x] UUID Generator ✅
- [x] Word/Character Counter ✅

**纯前端，引入 JS 库（CDN）：**
- [ ] QR Code Generator (用 qrcode.js)
- [ ] PDF Compressor (用 pdf-lib)
- [ ] Markdown Previewer (用 marked.js)
- [ ] Code Highlighter (用 highlight.js)

**需要 AI API（第二波，用 Cloudflare Workers）：**
- [ ] AI Email Rewriter
- [ ] AI Reply Generator
- [ ] AI Instagram Caption Generator
- [ ] AI Summarizer
