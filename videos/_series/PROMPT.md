# 《K线形态深度课》统一提示词（2K60 · 3 分钟内 · 频道配乐）

**用法：** 在 Claude Code 打开仓库 `chaofan1856/tradingnow`，新建会话。
把下面「提示词」整段粘贴进去，再把新的知识点贴在最后的【知识点】处（直接粘贴整份讲稿即可，带【画面动效】【屏幕文字】也可以）。
其余一个字都不用改。做完会直接给你一个下载网页链接，打开即可保存完整原画质 MP4。

---

## 提示词（整段复制）

```
你是 TradingNow 频道的动效导演兼工程师。请把我在最后提供的知识点，做成《K线形态深度课》系列的下一集，
风格、水印、字体、配乐、节奏与前三集（videos/kline-patterns、kline-patterns-2、kline-patterns-3）完全一致。
全程自行决策，不要中途问我；做完只把下载网页链接和规格发给我。

【准备】
1. git fetch origin claude/upbeat-heisenberg-atdjk0 && git checkout claude/upbeat-heisenberg-atdjk0（就在这个分支上提交推送）。
2. pip install fonttools brotli numpy。
3. 通读：videos/_series/PROMPT.md（本文件的「制作规范」）、videos/kline-patterns-3/script.js（最新一集，参考实现）、
   videos/kline-patterns-2/script.js、videos/kline-patterns/script.js，以及 videos/kline-patterns-3/index.html 里的 KIT（K.* 绘图工具）。

【制作】
4. 集数 = 现有 videos/kline-patterns* 的下一个编号：bash videos/_series/new_episode.sh kline-patterns-<N> "K线形态深度课（<中文数字>）"
5. 只重写 videos/kline-patterns-<N>/script.js 和 sfx.json，严格遵守下方「制作规范」。知识点里的【画面动效】逐条实现，【屏幕文字】做成字幕（可精简措辞，不丢知识点）。
6. 质检：node render.mjs --stills 抽 25～30 帧（每个场景末态 + 关键动作瞬间 + 转场中点），拼 2×2 联系表亲自看，
   按「质检清单」逐项修到全部干净，再渲染。
7. 渲染：bash videos/_series/render.sh kline-patterns-<N>（后台运行约 35 分钟）。用后台命令循环等待 /tmp/kline-patterns-<N>.done 出现，
   不要用前台 sleep。完成后 ffprobe 核对 2560×1440、60fps、帧数 = timeline.json 的 frames、时长 ≤ 180 s，并抽 4 帧看成片。
8. 下载网页（按「下载网页流程」），然后提交推送（绝不提交 mp4/wav）。
9. 最后只回复：视频标题、时长、规格、下载网页链接。

【知识点】
（把新的知识点粘贴在这里）
```

---

## 制作规范（Claude 必须遵守）

### 时长与结构（固定时间线，卡准配乐）
配乐是频道自己的曲子（`videos/_series/assets/channel_music.m4a`，已在仓库，`tools/music.py` 自动截取并淡出）。
曲子的结构固定，所以场景时长固定，**总长 176.8 s**：

| 场景 | 起点 | 时长 | 内容 |
|---|---|---|---|
| hook | 0 | 6.0 | 黑底大字震动弹出（讲稿开场那句），配音效 |
| intro | 6.0 | 10.7 | 讲稿 5–15 秒的动效（图形变形/炸开等），字幕底部居中 |
| title | 16.7 | 10.3 | **16.7 s 是曲子第一次重拍**：金色闪电划过 + 雷声 + 标题「K线形态深度课 · 第X集」+ 副标题；字幕底部居中 |
| ch1 | 27.0 | 4.0 | 章节卡 壹 |
| 形态 A | 31.0 | 26.0 | 第一个形态（字幕顶部） |
| 形态 B | 57.0 | 28.3 | 第二个形态或辩证/对比（字幕顶部） |
| ch2 | 85.3 | 4.0 | 章节卡 贰（**85.3–103.2 s 曲子进入安静段**） |
| 形态 C | 89.3 | 22.7～30 | 安静段里做蓄势/收敛；**103.2 s 曲子回归的那一拍 = 突破/重击时刻**（第 3 行字幕 beat 落在 13.9 s） |
| 形态 D | … | 补足到 143.8 | |
| phil | 143.8 | 26.5 | 哲理总结：图形聚拢/坍缩 → 墨黑 → 金色渐变大字逐行由远推近 |
| end | 170.3 | 6.5 | 频道 Logo 原图 + 本集标题 + 风险提示（不加“完”） |

形态只有 3 个时，把「形态 B」用作对比/辩证场景（参考第三集 versus）；形态有 4 个时按第一、二集排布。
用 `lines: [{ s, d }]` 给每行字幕显式时长，保证场景总时长与上表一致；`node render.mjs --timeline` 必须显示 176.8 s。

### 画面风格（引擎已内置，不改 index.html）
- 2K 2560×1440 · 60fps · 颗粒黑底 · 金色光束/散景/微尘 · 转场重叠 1.2 s（zoom / push / sweep / iris / dissolve）。
- 左上角水印 = 频道 Logo 原图 `assets/logo.png`，绝不重绘、改色、改形；片尾也用这张原图。
- 红 = 多头/上涨/做多，绿 = 空头/下跌/做空，金 = 重点/颈线/轨道。
- 字体统一放大 1.75 倍（手机横屏一眼可读）；**大标题不要过大**：标题卡 goldText 58，章节卡数字 84、标题 44。
- 讲稿里的 emoji（🟥🟩💡➡️📈）字体里没有：用颜色、图形、“——” 表达，不要直接写进字幕或画面。

### 字幕位置（不遮挡动效）
- 图表类场景：`subX: 960, subY: 275, subAlign: 'center'`，**单行、≤19 个字**，图表放在 y 360～830（必要时成交量/指标面板放 780～900）。
- 引入/标题类场景：底部居中（`subX: 960, subAlign: 'center'`，默认 y 880），画面元素在 y ≤ 800。
- hook / 哲理 / 片尾：不用字幕，文字画在画面里。
- 标注（标签、靶心说明、颈线字样）不得互相重叠；新标注出现时让旧标注淡出（`* (1 - S.at(line, 0, .6))`）。

### 动效（要丝滑、要卡点）
- 一切元素用 smooth/easeOut/easeBack 进出，没有任何硬切或瞬间出现；K 线逐根生长，轨迹线按进度绘制。
- 突破/跌破时刻：屏幕微震（shake）+ 闪光（flash）+ 冲击环（ring）+ 靶心（reticle）+ 标签；放量时成交量柱高亮并标「放量！」。
- 讲稿写到的每个动作都要有对应画面：轨迹线、标签“跌不动了！/动能衰竭！”、颈线/轨道、入场靶心、止损线、目标位平移、对比分屏、巨大 X、黄色闪烁大字等。
- 可复用 kline-patterns-3/script.js 里的 helpers（shake / poly / tagAt / callout / reticle / flash / ring / band / volume / chapter）和
  kline-patterns-2 的 hsScene / wedgeScene、kline-patterns 的 flagScene 等场景构造器。
- 数据用 K.gen.path / K.gen.seq 构造真实 K 线，确保形态特征（高点渐低、低点渐高等）在图上一眼可见；示意性指标标注「示意」。

### 音效（sfx.json）
按讲稿写的音效放在 `sfx.json`，类型：`shatter`（玻璃碎裂）`siren`（警报）`heartbeat`（心跳）`thunder`（雷声）`impact`（重击）`whoosh`。
开场音效对准 hook 大字弹出（t ≈ 0.3）；闪电标题固定加 `{"type":"thunder","t":16.85}`。除此之外只用频道配乐，不加其他音乐。

### 质检清单（联系表逐帧看）
1. 没有任何文字与文字、文字与K线/标注重叠；没有出画；不压左上水印/标题栏（x<700,y<200）和右上标题（x>1450,y<170）。
2. 字幕单行、不压图表；字幕不在画面元素上方 30px 以内。
3. 形态特征清楚、颜色语义正确、每个讲稿要点都有画面。
4. 时长 176.8 s；突破/重击落在 103.2 s；标题闪电落在 16.85 s。

### 下载网页流程（一个网页即可，约 640 MB）
1. 写 `web/youtube.json`：`{"title": "...（2K60）", "description": "简介 + 章节时间点（取自 timeline.json）+ 风险提示 + #标签"}`；
   `ffmpeg -ss 20 -i 成片/<标题>_2K60.mp4 -frames:v 1 -vf scale=1920:-1 -q:v 3 web/poster.jpg`。
2. `echo '[]' > web/links.json; echo '{}' > web/asset_urls.json; python3 tools/web_build.py`。
3. Artifact 发布 `web/page_1.html`（capabilities `{assets:{}, downloads:true}`，files `{"poster.jpg":"web/poster.jpg"}`，icon `video`），把 URL 写入 `web/links.json`。
4. 用 `asset: true` + `file_paths`（每次 ≤25 个）把 `web/pieces/pg1_aNN.mp4` 全部上传到该网页，把每个返回的 `/_blob/<id>` 写入 `web/asset_urls.json`（键 = 文件名）。
   若某块报 `unsupported_type`（字节被误判为网页）：在 `web/plan.json` 中把它原位拆成 `<名>a.mp4`（前 256 KB）+ `<名>b.mp4`（其余，作为附件上传），
   `<名>a.mp4` 在 asset_urls.json 里写成同名相对路径，并作为发布文件随网页一起发布。
5. `python3 tools/web_build.py` 显示 `missing: 0` 后，用同一 file_path 重新发布网页；核对 plan.json 各块大小之和 = 成片大小。
6. 删除 web/pieces、segs、video.mp4；提交推送。
