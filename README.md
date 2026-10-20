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
├── index.html                     # 首页（17 个工具卡片）
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
├── indexnow.js                     # 把 sitemap 里的 URL 推给 Bing / Yandex（IndexNow）
├── set-domain.js                  # 一条命令全站换域名
├── css/style.css                  # 全站样式（含暗色模式变量）
├── js/
│   ├── theme.js                   # 暗色模式切换（head 同步加载，防闪烁）
│   ├── md5.js                     # 自实现 MD5（SHA 系列走 Web Crypto）
│   ├── qr-tables.js               # QR 纠错块表 + alignment 坐标（生成物，勿手改）
│   ├── qrcode.js                  # 自实现 QR 编码器（Reed-Solomon + 掩码评分）
│   └── <tool>.js                  # 每个工具一个脚本
├── tests/                         # 测试与检查脚本（node tests/run-all.js）
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
    ├── case-converter.html         # 命名风格转换（7 种一次出结果）
    ├── qr-code-generator.html      # QR 码生成（自实现编码器，PNG/SVG 下载）
    ├── cron-explainer.html        # cron 表达式解释 + 未来 5 次执行时间
    ├── text-diff.html             # 文本差异对比（LCS + 词级高亮）
    └── regex-tester.html          # 正则测试（高亮/分组/替换预览）
```

## 测试与检查

脚本都在 `tests/`，用 Node + 假 DOM 直接跑，不需要浏览器。每个脚本都能从任意
目录启动（内部会自己切到仓库根）。

```bash
node tests/run-all.js           # 一次跑完全部，非零退出码表示有失败
```

单独运行：

```bash
node tests/test-text-diff.js    # 20 项断言
node tests/test-regex.js        # 24 项断言
node tests/test-case.js         # 30 项断言
node tests/test-cron.js         # 44 项断言
node tests/test-qr.js           # 158 项断言，含 48 组与参考实现逐格对比
node tests/check-ld.js          # JSON-LD 合法性 + 内链分布
python tests/static-check.py    # 元素 id / onclick 函数是否都存在
python tests/audit.py           # 全站 SEO 体检
```

`tests/audit.py` 查的是**坏了会直接掉流量**的东西：title / description 长度是否
落在 Google 的显示窗口内、canonical 是否指向自身且不带 `.html`、og:image 是否为
绝对地址、每页是否恰好一个 `<h1>`、页面与 sitemap 是否双向一致、内部链接是否有效。
任何一条不通过都会返回非零退出码，可以挂在部署前当门禁。

`tests/server.js` 在本地模拟 Cloudflare Pages 的路由行为（无扩展名 200、
`.html` 308、未知路径 404），用来在推送前验证 URL 形态：

```bash
node tests/server.js            # http://127.0.0.1:8081
```

## QR 编码器（自实现，零第三方库）

`js/qrcode.js` 是一个完整的 QR 编码器，没有引用任何外部库：自己在 GF(256) 上做
Reed-Solomon 纠错、按 ISO 表分块与交织、铺功能图形、蛇形填数据、算 8 种掩码的
惩罚分选最优。`js/qr-tables.js` 里的两张表（纠错块结构、alignment 坐标）是从
python-qrcode 参考实现导出的，**不要手改**——手写这两张表几乎必错。
（实测：常见的 alignment 坐标公式在 version 28 上就会算错。）

只实现 byte mode（UTF-8）。数字/字母模式能省容量，但要多两套编码路径，
URL 场景也用不上，不值得。

**三层验证，缺一层都不敢说它能扫：**

1. 与参考实现逐格对比 —— `tests/ref-qr.json` 由 python-qrcode 生成（强制 byte 模式），
   `node tests/test-qr.js` 对 48 组用例（版本 1–36 × 四个级别）遍历 8 个掩码，
   要求存在一个掩码使矩阵**完全一致**。
2. 真实解码器回读 —— 用 OpenCV 的 `QRCodeDetector` 解码渲染图，覆盖中文、emoji、
   1200 字符的超大码（v39）。超大码在低缩放下解不出是检测器的分辨率限制，
   参考实现同样如此，可用 `scale=16` 复核。
3. 行为断言 —— 空输入、超长拒绝、容量边界（v1-L 恰好 17 字节、18 字节升 v2）、
   确定性输出。

**注意**：本实现的掩码选择用 ISO 的完整惩罚规则，python-qrcode 的 level2 会跳过
重叠的 2×2 块、level3 检测方式也不同，所以两者约三成用例会选到不同掩码。
不同掩码都合法规，扫描器读 format 位即可还原，不需要对齐。

## 加一个新工具的流程

1. 在 `tools/` 下写 `<slug>.html`，在 `js/` 下写 `<slug>.js`
   - 页面 head 照抄现有工具页：title / description / canonical / icon / OG / JSON-LD
   - canonical 与 OG url **不带 `.html`**（Cloudflare Pages 会把 `/x.html` 308 跳到 `/x`）
2. 在 `index.html` 的 `.tool-grid` 里加一张卡片（`href="tools/<slug>"`）
3. 在 `generate-related.js` 的 `GROUPS` 里给它配 4 个邻居（同时保证别人也链到它，
   跑一次 `node tests/check-ld.js` 看「inbound internal links」分布是否均衡）
4. 跑生成脚本，站点地图 + 面包屑 + 相关工具全部自动更新：
   ```bash
   node generate-related.js
   node generate-sitemap.js
   ```
5. 提交并推送，Cloudflare 自动部署：
   ```bash
   git add -A && git commit -m "Add <tool> tool" && git push
   ```
6. 新页面不需要去 GSC 手动提交——Google 会从 sitemap 发现。想加速再用「网址检查 → 请求编入索引」。

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
  改造后每个工具页至少 2 条相关入链（外加首页与站点地图各 1 条），
  卡片文案直接复用首页卡片保证一致

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

**IndexNow 主动推送（Bing / Yandex / Seznam / Naver 即时收录）**
新站等爬虫自己来最慢，IndexNow 是主动告诉搜索引擎「这些 URL 变了」。
key 文件必须先部署上线再推送；首次执行会自动生成 key 并写回 `site.json`：
```bash
node generate-sitemap.js                              # 保证 sitemap 是最新的
git add -A && git commit -m "..." && git push         # 先部署，让 /<key>.txt 可访问
node indexnow.js                                      # 部署完成后推送全部 URL
node indexnow.js --dry                                # 只看要发的 JSON，不真发
```

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
- [x] Case Converter
- [x] Cron Expression Explainer（5/6/7 字段 + L / W / # 扩展语法）

**引入 JS 库（本地托管，不走 CDN，避免第三方依赖）：**
- [x] QR Code Generator（自实现编码器，零第三方库）
- [ ] PDF Compressor（pdf-lib）
- [ ] Markdown Previewer
- [ ] PDF ↔ Image

**需要 AI（第二波，用 Cloudflare Workers 做代理，密钥不暴露在前端）：**
- [ ] AI Email Rewriter
- [ ] AI Summarizer
- [ ] AI Caption Generator
