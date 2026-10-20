# GetToolkit — Free Online Tools (English)

面向欧美用户的纯静态在线工具站。零后端、零 API 成本，所有处理都在浏览器端完成。

线上地址：https://getoolkit.com

## 技术栈

- 纯 HTML + CSS + 原生 JavaScript（和 easytool 一致）
- 无框架、无打包工具、无后端、无第三方请求
- 部署在 Cloudflare Pages（免费，Git 自动部署）

## 目录结构

```
ai-tools-en/
├── index.html                     # 首页（12 个工具卡片）
├── about.html                     # 关于页
├── privacy.html                   # 隐私政策（含广告 Cookie 披露，AdSense 必需）
├── contact.html                   # 联系页（mailto，无表单/无后端）
├── 404.html                       # 真 404（noindex）
├── sitemap.html                   # 生成物：全工具列表页
├── sitemap.xml                    # 生成物：给搜索引擎
├── robots.txt
├── favicon.svg
├── og-image.png                   # 1200×630 社交分享图
├── site.json                      # 站点 URL 的唯一配置源
├── generate-sitemap.js            # 扫描 tools/ 生成两个站点地图
├── set-domain.js                  # 一条命令全站换域名
├── css/style.css                  # 全站样式（含暗色模式变量）
├── js/
│   ├── theme.js                   # 暗色模式切换（head 同步加载，防闪烁）
│   ├── md5.js                     # 自实现 MD5（SHA 系列走 Web Crypto）
│   └── <tool>.js                  # 每个工具一个脚本
└── tools/
    ├── json-formatter.html        # JSON 格式化 / 校验
    ├── base64-converter.html      # Base64 编解码
    ├── json-csv-converter.html    # JSON ↔ CSV
    ├── image-compressor.html      # 图片压缩（Canvas API）
    ├── url-encoder.html           # URL 编解码
    ├── uuid-generator.html        # UUID v4，可批量
    ├── word-counter.html          # 字数 / 字符 / 阅读时间
    ├── html-entities.html         # HTML 实体编解码
    ├── timestamp-converter.html   # Unix 时间戳 ↔ 日期
    ├── hash-calculator.html       # MD5 / SHA-1 / 256 / 384 / 512
    ├── color-converter.html       # HEX / RGB / HSL
    └── lorem-ipsum-generator.html # 占位文本
```

## 加一个新工具的流程

1. 在 `tools/` 下写 `<slug>.html`，在 `js/` 下写 `<slug>.js`
   - 页面 head 照抄现有工具页：title / description / canonical / icon / OG / JSON-LD
   - canonical 与 OG url **不带 `.html`**（Cloudflare Pages 会把 `/x.html` 308 跳到 `/x`）
2. 在 `index.html` 的 `.tool-grid` 里加一张卡片（`href="tools/<slug>"`）
3. 跑一次生成脚本，两个站点地图自动更新：
   ```bash
   node generate-sitemap.js
   ```
4. 提交并推送，Cloudflare 自动部署：
   ```bash
   git add -A && git commit -m "Add <tool> tool" && git push
   ```
5. 新页面不需要去 GSC 手动提交——Google 会从 sitemap 发现。想加速再用「网址检查 → 请求编入索引」。

## 换域名

`site.json` 是域名唯一配置源，其它文件里的 URL 都由脚本替换：

```bash
node set-domain.js example.com    # 替换全站所有绝对 URL
node generate-sitemap.js          # 重新生成站点地图
```

## Cloudflare Pages 构建配置

| 字段 | 值 |
|---|---|
| Framework preset | **None** |
| Build command | **留空** |
| Build output directory | `/` |

选任何框架预设都会导致构建失败——这是纯静态站。

## SEO 现状（已完成）

- 每个工具页独立 URL、title、description、canonical、FAQ
- canonical / sitemap / 内链全部使用无扩展名 URL（与 Pages 的 308 目标一致）
- Schema.org `WebApplication` 结构化数据（每页），首页为 `WebSite`
- OG + Twitter 卡片元数据，统一使用 `og-image.png`
- `404.html` 返回真正的 404 状态（此前未知路径会返回 200 + 首页，属软 404）
- sitemap.xml 由脚本生成，自动带当天 `lastmod`
- `generate-sitemap.js` 同时扫描根目录页面（about / privacy / contact 等），
  自动排除 `index`、`404`、`sitemap`、`google*.html`（GSC 验证文件）
- 列表标题优先取页面 `<h1>`，描述超过 110 字符按词边界截断

## 法务页与 AdSense 合规

AdSense 审核要求站点具备可访问的「关于 / 隐私政策 / 联系方式」三页，缺任一项容易被拒。

- `privacy.html` 覆盖：本地处理声明、服务器日志（Cloudflare）、无 Cookie 统计、
  第三方广告 Cookie（Google / DoubleClick）与退出链接、GDPR/CCPA 权利、未成年人条款
- `contact.html` 使用 `mailto:hello@getoolkit.com`，站内不留任何表单与收集字段
- 三页均带 canonical、OG、JSON-LD，并在全站 footer 导航中互相链接
- **需自行确认**：`hello@getoolkit.com` 要真实可达。DNS 托管在 Cloudflare 时，
  用 Cloudflare Email Routing 免费把该地址转发到常用邮箱即可

## 待加工具

**纯前端，零依赖：**
- [ ] Text Diff（两段文本对比）
- [ ] Regex Tester
- [ ] JSON ↔ YAML
- [ ] Case Converter
- [ ] Cron Expression Explainer

**引入 JS 库（本地托管，不走 CDN，避免第三方依赖）：**
- [ ] QR Code Generator
- [ ] PDF Compressor（pdf-lib）
- [ ] Markdown Previewer
- [ ] PDF ↔ Image

**需要 AI（第二波，用 Cloudflare Workers 做代理，密钥不暴露在前端）：**
- [ ] AI Email Rewriter
- [ ] AI Summarizer
- [ ] AI Caption Generator
