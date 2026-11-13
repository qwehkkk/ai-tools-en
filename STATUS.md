# 项目状态 · 2026-11-13

一句话：**站点 26 条 URL 全部健康、域名层（www 301 / 域名邮箱 / GitHub About）全部收口；当前停在「等 3 篇指南被收录 → 重申 AdSense」这一步，不加工具。**

技术细节在 `README.md`；这份文件只记状态、待办和下一步的判断依据。

---

## 线上事实

| 项 | 值 |
|---|---|
| 地址 | https://getoolkit.com |
| 部署 | GitHub `qwehkkk/ai-tools-en` → Cloudflare Pages（推送即部署，约 10 秒） |
| 工具数 | **17** + **3 篇长文指南**（`/guides/`，2026-11-09 上线） |
| sitemap URL | **26 条**（17 工具 + 3 指南 + 首页 + about/privacy/contact + agent-skills + sitemap 页） |
| 全站体检 | 27 页、0 死链、0 元数据问题（`python tests/audit.py`），26 条 sitemap URL 全量 200 |
| ads.txt | `google.com, pub-4065367396215160, DIRECT, f08c47fec0942fa0` |
| IndexNow | 26 条已推送（2026-11-09），key `ef8e4253e417291bba6c439eea3947d1` |
| www | **301 → 主域**（Cloudflare Redirect Rule，Dynamic 表达式保留路径与查询串，2026-11-09） |
| 联系邮箱 | `contact@getoolkit.com`（Email Routing → 个人邮箱，测试信已收，页面无明文/Cloudflare 混淆） |
| GitHub 仓库 | description + website + topics 已填（2026-11-09） |

> ⚠️ **域名拼写防呆（2026-10-26 加）**：本站域名是 **`getoolkit.com`（一个 t，get+oolkit）**，唯一真源是 `site.json` 的 `url`，任何场合都从这里复制，**不要手打**。
> `gettoolkit.com`（两个 t）**不是本站**，它属于 HugeDomains，公网是 $5,995 域名出售页。
> 2026-10-26 曾把它打成两个 t 去查注册局，误报过一次「域名失联 P0 事故」——查 RDAP / DoH / 线上异常之前，先核对拼写。
>
> **健康检查：`node check-live.js`** —— 域名从 `site.json` 读取并逐字符打印，同时查权威 NS、A 记录和 5 个关键页面的状态码/特征串。任何「站点是不是挂了」的判断先跑它，不要手打 URL 去 curl。

> ⚠️ **周更只在 `C:\Users\Administrator\WorkBuddy\2026-10-13-19-27-18\ai-tools-en` 做（2026-11-10 加）**
> 本机有**两份**同名目录，`git remote` 都指向 `qwehkkk/ai-tools-en`，但**历史互不包含**：
> `2026-10-22-20-13-32/ai-tools-en` 是独立历史（21 提交），远程没有它的任何提交，**在那边做的一切都推不上去**。
> 判断哪份是真的：`git -C <dir> log -1 --format=%h` 必须等于 `git ls-remote origin main` 的短 SHA。
> 2026-11-09 的周更就是做错在这份副本里，导致线上停在 11-02 整整一周。

**2026-11-13：第 4 次周更 —— 零增删，纯星数刷新**
- 数据：**20 条 5 类**（与上期一致，0 新增 / 0 删除），20 条星数逐个走 GitHub API 核实刷新
- Movers TOP3：`mattpocock/skills` +4.9K（323.5K）/ `cloudflare/security-audit-skill` +4.7K（71.6K）/ `anthropics/skills` +4.3K（194.0K）
- 分类决策：设计/视觉产出类本周**无一条上 trending** → 不新建 `Design & Output Quality`，维持 5 类；`AgriciDaniel/claude-seo`（28.9K）本周未在榜，"连续两周"条件不成立 → 仍不收录
- 本周 trending 复核：周榜 14 个仓库中 agent-skills/plugins 主题的仅 `anthropics/skills`、`addyosmani/agent-skills`、`mattpocock/skills`、`cloudflare/security-audit-skill`（全已在榜）；`anthropics/claude-quickstarts`、`vercel-labs/agent-browser` 属工具/示例非技能目录，按"不确定就不加"跳过
- 测试：`node tests/run-all.js` 全过（27 页 / sitemap 26 条 / 死链 0）；sitemap 中 agent-skills `lastmod` 已同步 `2026-11-13`
- 线上验证：`Last updated 2026-11-13` 到位，新增星数与 Movers 数字均可见

**2026-11-09：第 3 次周更 —— 曾一度没上线（事故记录）**
- 数据：**20 条 5 类**（+2：`anthropics/skills` 189.7K 官方技能库、`jakubkrehel/skills` 11.7K UI 类），18 条星数全部刷新。Movers TOP3：security-audit-skill +10.5K / mattpocock/skills +9.3K / claude-mem +5.6K
- **事故**：这一期的改动做在了 `2026-10-22-20-13-32/ai-tools-en`（提交 `3e8a995`）。那份是**独立历史**，与远程 main 互不包含，既推不上去也从未合并 → 线上「Last updated」一直停在 `2026-11-02`，一周无人发现
- 修复：把该副本的 `skills-data.json` 并入真仓库并重新生成，20 条 / `2026-11-09` / Movers 重算 / sitemap lastmod 同步
- **未执行的下期决策点**：设计类（hallmark/impeccable/taste-skill）是否 ≥2 条在榜未复核 → 延到 11-16 一起判断；`claude-seo` 连续 2 周判断同样延后

**2026-11-02：第 2 次周更（自动化第 3 期）+ lastmod 滞后修复**
- 17 条星数全部刷新 + **新增 `multica-ai/andrej-karpathy-skills`（228.0K，连续 2 周在榜，符合收录规则）**，现 18 条 5 类（`05841b5`）。Movers TOP3：security-audit-skill +8.9K / claude-mem +6.1K / mattpocock/skills +5.8K
- 线上验证通过（check-live 7 项 + 服务端抓取确认 `228.0K`/Movers/`2026-11-02`），IndexNow 23 条已推
- **修复 lastmod 滞后**（`13e981b`）：sitemap 在提交前生成，agent-skills.html 的 git 日期永远滞后一个周更周期 → 改为该页直接读 `skills-data.json` 的 `updated` 字段
- 下期（11-09）决策点：设计类（hallmark/impeccable/taste-skill）再有 ≥2 条在榜 → 加「Design & Output Quality」分类；claude-seo 连续 2 周在榜 → 收录
- **收录状态（11-03 核实）**：Bing `site:getoolkit.com` 仍无结果（与 URL Inspection 的 "Discovered but not crawled" 一致，站侧 bingbot UA 实测可正常抓取，属 Bing 排队/权重问题）；等 10-26 Request indexing 生效，3-7 天后复查

**2026-10-26：首次周更 + Movers 区块 + sitemap lastmod 修复**
- `skills-data.json` 17 条星数全部刷新（`a3b27b0`），页面「Last updated 2026-10-26」，线上已验证（200 / 17KB / `303.5K` 到位），IndexNow 23 条已推
- 条目数仍 17（无新增：`andrej-karpathy-skills` 仅 1 周在榜，按「连续 2 周」规则观察）
- **修复 `lastmod` 假信号**（`e1d81a1`）：`generate-sitemap.js` 原本给所有 URL 打当天日期，23 条全被刷成生成日 → 搜索引擎会判定 lastmod 不可信而忽略。现改为取该页 git 最后一次提交日期（回退 mtime），线上分布已恢复真实：21 条 10-21 / 1 条 10-22 / agent-skills 10-26
- robots.txt 由站主另行提交 `607d794`（屏蔽 `/cdn-cgi/l/` 的 Cloudflare 生成 404）
- **新增「Biggest Movers」区块**（`20a7e02`）：在目录页顶部列出本周星数涨幅 TOP5，数据由 `generate-skills-page.js` 从 `skills-data.json` 的 git 历史 diff 自动算出（向前找第一个内容不同的版本，避免 HEAD==工作区时算出零涨幅），涨幅 ≥20% 自动加 `hot` 标。**替代原计划的独立周更页**——新页面会与目录页内容高度重叠，有重复内容风险且稀释权重。线上已验证：Movers 区块与 17 张卡片同在
- **修复内链孤岛**（`dd6062f`）：`/agent-skills` 此前**只被 `sitemap.html` 链接**，首页与 17 个工具页都没有入口，爬虫只能靠 sitemap 发现。已在全部 24 个页面的 footer-nav 加 `<a href="/agent-skills">Agent Skills</a>`，内链权重与可发现性同时解决。`check-live.js` 增加「工具页含 Agent Skills 内链」检查项，防止复发

**已知小问题**：`ai-tools-en.pages.dev` 自 2026-10-26 起返回 **522**。自定义域 `getoolkit.com` 不受影响（服务端抓取确认全站正常），属可选排查项，不阻塞任何工作。

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

| 事项 | 状态 | 下一步 |
|---|---|---|
| GSC 收录 | **24/26 已索引**（2026-11-09 截图）；21 条「备用网页」是 www 副本，301 生效后等重抓自动消失 | 等 `/guides/` 三条被收录。**收录了 → 立即重申 AdSense** |
| AdSense | **11-09 拒审「低价值内容」**（新站第一次申请的正常判罚） | **不要反复点申请**。等指南收录后再重申一次 |
| Bing | `site:getoolkit.com` 仍无结果（11-03 核实），站侧抓取正常，纯排队 | Bing Webmaster 若还没从 GSC 导入，值得做（2 分钟） |

**2026-11-09 拒审后的整改（已完成，重申前别再动）**：
1. 3 篇长文指南上线（编码对比 / cron / 哈希选择），全部基于工具真实行为写，eval_seo 1.0
2. 域名邮箱 `contact@getoolkit.com` 替换无人收信的 Gmail
3. www 301 统一到主域（消除 21 条重复页）
4. GitHub 仓库 About 外链位填上
5. privacy 页新增浏览器扩展声明（`486b08e`，另一条线做的）

**重申时机的唯一标准**：GSC 网址检查输入 `https://getoolkit.com/guides/base64-vs-url-encoding`，
显示「已编入索引」→ 重申。指南 11-09 上线，预期 11-13 至 11-16 收录。

---

## 数据出来后怎么判断

看 GSC「网页」报告，只要两个数字：

**① 已编入索引的页面数**（现在 26 条 URL，基线 24）

- **明显少于 26**（比如个位数）→ 站点信任度问题。下一步不是加工具，是**做外链**：
  把 QR、Text Diff、Cron 这几个提交到 AlternativeTo、Product Hunt、相关 Reddit
  板块。新域名没有外链时，Google 就是会给很少的配额。
- **接近或等于 26** → 收录正常，进入第 ② 步。

**② 有没有「已抓取，目前未编入索引」**

- **有，且数量多** → 内容质量/重复度问题。这时该做的是**把已有页面写厚**
  （指南就是这一步的产物），而不是继续加第 18 个工具。
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
