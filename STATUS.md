# 项目状态 · 2026-10-22

一句话：**站点已完整上线并保持零问题，当前停在「等内容被收录」这一步，不再加工具；2026-10-22 新增了 Agent Skills 目录页（内容页，非工具）。**

技术细节在 `README.md`；这份文件只记状态、待办和下一步的判断依据。

---

## 线上事实

| 项 | 值 |
|---|---|
| 地址 | https://getoolkit.com |
| 部署 | GitHub `qwehkkk/ai-tools-en` → Cloudflare Pages（推送即部署，约 10 秒） |
| 工具数 | **17** |
| sitemap URL | **23 条**（17 工具 + 首页 + about/privacy/contact + agent-skills 目录页 + sitemap 页） |
| 全站体检 | 23 页、0 死链、0 元数据问题（`python tests/audit.py`） |
| ads.txt | `google.com, pub-4065367396215160, DIRECT, f08c47fec0942fa0` |
| IndexNow | 23 条已推送，key `ef8e4253e417291bba6c439eea3947d1` |

**2026-10-26：首次周更 + sitemap lastmod 修复**
- `skills-data.json` 17 条星数全部刷新（`a3b27b0`），页面「Last updated 2026-10-26」，线上已验证（200 / 17KB / `303.5K` 到位），IndexNow 23 条已推
- 条目数仍 17（无新增：`andrej-karpathy-skills` 仅 1 周在榜，按「连续 2 周」规则观察）
- **修复 `lastmod` 假信号**（`e1d81a1`）：`generate-sitemap.js` 原本给所有 URL 打当天日期，23 条全被刷成生成日 → 搜索引擎会判定 lastmod 不可信而忽略。现改为取该页 git 最后一次提交日期（回退 mtime），线上分布已恢复真实：21 条 10-21 / 1 条 10-22 / agent-skills 10-26
- robots.txt 由站主另行提交 `607d794`（屏蔽 `/cdn-cgi/l/` 的 Cloudflare 生成 404）

**2026-10-23：目录页已数据模型化**
- 条目抽成 `skills-data.json`（单一数据源），`node generate-skills-page.js` 渲染；周更流程 = 改 JSON → 生成 → sitemap → 测试 → 推送
- 新增 `llms.txt`（`generate-sitemap.js` 自动输出，23 页带描述，供 AI agent/LLM 爬虫发现站点）
- 后续计划与分工见 WorkBuddy 工作区 `reports/行动计划-三线并行.md`（周更页 10-26 启动；MCP servers 板块等 11-13 GSC 判读后定）

**2026-10-22 新增：`/agent-skills`（Agent Skills & Plugins 目录页）**
- 背景：GitHub agent skill 生态爆发但缺「发现层」，此页是首个试水内容页（18 个条目、5 分类、星数快照、兼容性标注），数据取自当日 GitHub Trending
- 页面完全复用站点模板（css/style.css + theme.js），8 组测试全过，`.html` 308 规范跳转正常
- 后续打算：观察 GSC 数据，若表现好可扩展为周期性更新（配合 WorkBuddy 每周一的 GitHub trending 自动分析）；中文版可考虑放 toolona.com（easytool）

工具清单：JSON Formatter、Base64、JSON↔CSV、Image Compressor、URL Encoder、
UUID、Word Counter、HTML Entities、Timestamp、Hash、Color、Lorem Ipsum、
Text Diff、Regex Tester、Case Converter、Cron Explainer、QR Code Generator。

---

## 已经做完的

**基建**
- 纯静态（HTML/CSS/原生 JS），零后端、零第三方请求、零 API 成本
- `site.json` 是域名唯一配置源，`node set-domain.js <域名>` 一键全站替换
- `generate-sitemap.js` 扫目录出 sitemap.xml + sitemap.html；`generate-related.js`
  给每个工具页注入面包屑 + JSON-LD + 4 个相关工具内链（可反复运行）
- `indexnow.js` 主动推 URL 给 Bing / Yandex / Seznam / Naver

**SEO 与合规**
- 每页独立 title / description / canonical / OG / JSON-LD，全部窄化到 Google 显示窗口内
- 无扩展名 URL 全站一致（Pages 对 `.html` 会 308）
- 真 404（此前未知路径返回 200 假首页，属软 404，已修）
- favicon、1200×630 OG 图、robots.txt、ads.txt
- About / Privacy / Contact 三页，隐私政策含 AdSense + DoubleClick 明确披露

**质量**
- 8 组检查一条命令：`node tests/run-all.js`
- 276 项功能断言（含 QR 编码器与参考实现逐格对比、OpenCV 真实解码）

---

## 现在卡在外部，不在代码

| 事项 | 状态 | 你能做的 |
|---|---|---|
| GSC 收录 | 尚未出数据，站点才提交一天 | 等 2–3 天；有数据后看下面决策树 |
| AdSense | 两个站都是「正在准备」 | 初始审核通常 1–2 周，中途无反馈，只能等 |
| Cloudflare Web Analytics | 已添加 | 确认是否选了 Automatic（自动注入，不用改代码） |
| Bing Webmaster | 未做 | GSC 一键导入，2 分钟 |

`hello@` 已改成 `asdzcc@gmail.com`，但**这个地址没有真实邮箱在收信**。
邮箱地址在 `contact.html` 里，真有人写会退信。想开通：Cloudflare → Email Routing
免费转发到现有邮箱。

---

## 数据出来后怎么判断

看 GSC「网页」报告，只要两个数字：

**① 已编入索引的页面数**

- **明显少于 22**（比如个位数）→ 站点信任度问题。下一步不是加工具，是**做外链**：
  把 QR、Text Diff、Cron 这几个提交到 AlternativeTo、Product Hunt、相关 Reddit
  板块。新域名没有外链时，Google 就是会给很少的配额。
- **接近或等于 22** → 收录正常，进入第 ② 步。

**② 有没有「已抓取，目前未编入索引」**

- **有，且数量多** → 内容质量/重复度问题。这时该做的是**把已有工具页写厚**
  （每个工具加使用说明、常见问题、实际例子），而不是继续加第 18 个工具。
- **没有** → 健康，等排名即可。

**③ 如果收录正常但点击为 0**

说明关键词竞争问题。这时改 title / description 的收益远大于加新工具。
改完推一次 `node indexnow.js`。

---

## 下次继续时

**加工具**（`README.md` 有完整流程，4 步）：清单里还剩 JSON↔YAML（要手写
YAML 解析器，成本最高）、Markdown Previewer、PDF Compressor、PDF↔Image。

**日常命令**
```bash
node generate-sitemap.js     # 改了页面之后
node tests/run-all.js        # 提交前，8 组检查
node indexnow.js             # 部署之后，推给搜索引擎
```

**已知债务**
- `tests/ref-qr.json` 是 158KB 的二进制矩阵基准，入库是为了能复跑 QR 回归，
  不要随手删
- QR 编码器只实现 byte mode；数字/字母模式能省容量，但 URL 场景用不上
- 掩码选择用 ISO 完整惩罚规则，与 python-qrcode 约三成用例选到不同掩码
  （都合法，扫描器读 format 位即可还原）
