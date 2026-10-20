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
├── index.html                     # 首页（14 个工具卡片）
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
├── generate-sitemap.js            # 扫描 tools/ + 根目录页面生成两个站点地图
├── generate-related.js            # 给每个工具页注入面包屑 + 相关工具内链
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
    ├── lorem-ipsum-generator.html # 占位文本
    ├── text-diff.html             # 文本差异对比（LCS + 词级高亮）
    └── regex-tester.html          # 正则测试（高亮/分组/替换预览）
```

## 测试

浏览器脚本用 Node + 假 DOM 直接跑，无需浏览器：

```bash
node .tmp/test-text-diff.js     # 20 项断言
node .tmp/test-regex.js         # 24 项断言
```

全站级检查：

```bash
node .tmp/check-ld.js                                    # JSON-LD 合法性 + 内链分布
python .tmp/static-check.py                              # 元素 id / onclick 函数是否都存在
```

## 加一个新工具的流程

1. 在 `tools/` 下写 `<slug>.html`，在 `js/` 下写 `<slug>.js`
   - 页面 head 照抄现有工具页：title / description / canonical / icon / OG / JSON-LD
   - canonical 与 OG url **不带 `.html`**（Cloudflare Pages 会把 `/x.html` 308 跳到 `/x`）
2. 在 `index.html` 的 `.tool-grid` 里加一张卡片（`href="tools/<slug>"`）
3. 在 `generate-related.js` 的 `GROUPS` 里给它配 4 个邻居（同时保证别人也链到它，
   跑一次 `node .tmp/check-ld.js` 看「inbound internal links」分布是否均衡）
4. 跑生成脚本，站点地图 + 面包屑 + 相关工具全部自动更新：
   ```bash
   node generate-related.js
   node generate-sitemap.js
   ```
5. 提交并推送，Cloudflare 自动部署：
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
- **面包屑 + 相关工具内链**：`generate-related.js` 给每个工具页注入
  `Home › Tools › 当前` 与 `BreadcrumbList` 结构化数据，底部再挂 4 个相关工具卡片。
  此前 14 个工具页之间**零链接**，只有首页通进来，属于典型的孤岛结构；
  改造后每个工具页至少 4 条入链，卡片文案直接复用首页卡片保证一致

## 法务页与 AdSense 合规

AdSense 审核要求站点具备可访问的「关于 / 隐私政策 / 联系方式」三页，缺任一项容易被拒。

- `privacy.html` 覆盖：本地处理声明、服务器日志（Cloudflare）、无 Cookie 统计、
  第三方广告 Cookie（Google / DoubleClick）与退出链接、GDPR/CCPA 权利、未成年人条款
- `contact.html` 使用 `mailto:asdzcc@gmail.com`，站内不留任何表单与收集字段
- 三页均带 canonical、OG、JSON-LD，并在全站 footer 导航中互相链接
- `ads.txt` 位于站点根目录，用于 AdSense 的 ads.txt 站点验证：
  `google.com, pub-4065367396215160, DIRECT, f08c47fec0942fa0`
  （换发布商 ID 时只改这一行，文件必须能通过 `https://getoolkit.com/ads.txt` 拿到）

## 后台操作 SOP

**Cloudflare Web Analytics（无 cookie，推荐优先于 GA）**
Cloudflare 控制台 → 左侧 **Analytics & Logs → Web Analytics** → Add a site →
填 getoolkit.com → 创建后拿到一小段 JS（Beacon）。
想不往每个页面插代码就用 **Automatic** 模式（在 zone 层自动注入，Pages 站点直接生效）。

**Bing Webmaster Tools**
1. 打开 https://www.bing.com/webmasters ，用微软账号登录
2. 选 **Import from Google Search Console**（最省事，站点和 sitemap 一并导入）
3. 若手动添加：Add site → 填 `https://getoolkit.com` → 验证方式选
   **Import from Google Search Console** 或 XML 文件验证
4. 进站后左侧 **Sitemaps** → 提交 `https://getoolkit.com/sitemap.xml`

**GSC 加页速索引**
Search Console → 顶部「网址检查」→ 粘贴新工具 URL → **请求编入索引**。
sitemap 已提交时通常不必手动加，但新站点前期手动点几次更快。

**AdSense**
站点根目录的 `ads.txt` 用于发布商验证，AdSense 后台添加站点后可点「立即验证」。
更换发布商 ID 只改 `ads.txt` 里那一行。

## 待加工具

**纯前端，零依赖：**
- [x] Text Diff（LCS 逐行 + 词级高亮 + 大文件降级）
- [x] Regex Tester（flags / 命名分组 / 替换预览 / 零宽匹配保护）
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
