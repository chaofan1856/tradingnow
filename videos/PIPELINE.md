# TradingNow 知识视频 · 多会话生产流水线

一支视频 = 1 个**视频会话**（写脚本、质检、合成、做下载网页）+ 4 个**渲染会话**（各渲 1/4，4K60 最高画质）。
引擎来自 `kline-video/`（《K线与动能博弈》），风格规范见 `kline-video/STYLE_PROMPT.md`，必须先读。

## 硬性规则
- **时长 ≤ 5 分钟**（`node render.mjs --timeline` 打印的总时长）。讲稿超长就精简措辞、合并要点，不丢核心知识点。
- **水印不变**：左上角 TN TradingNow 水印、标题栏、颗粒黑底、金色光束/散景/微尘、转场、配乐、片尾 Logo（`assets/logo.png`）全部沿用引擎，`index.html` 不改样式常量。片尾文字只写视频标题，不加“完”。
- **画质**：4K 3840×2160 / 60fps / H.264 High CRF 12 tune grain / JPEG q100 截帧（render.mjs 默认值，不要改）。
- **画面全部原创绘制**（canvas + K 工具）：不使用、不临摹任何照片、纪录片画面、书籍封面、公司/交易所/平台 Logo 或人物肖像。
  人物用剪影/线描象征，书用无封面设计的抽象书形 + 书名文字，历史场景用原创几何/线稿风格（浮世绘感可以用色块、线条“致意”，但不复刻任何具体作品）。
- **史实**：知识点里的人名、年份、数字按讲稿使用；民间流传或有争议的说法（如作者归属、名称由来、夸张描述）用“相传 / 一般认为 / 据报道”表述，不要写成确凿事实。字幕不含诋毁真人的说法。
- 片尾保留风险提示：内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。

## A. 视频会话
1. `git checkout -b video/<slug>`，`python3 kline-video/tools/new_video.py <slug> "<标题>"`，然后在 `videos/<slug>/` 工作。
   `pip install fonttools brotli`（字体子集化需要）。
2. 重写 `script.js` 的 scenes（参考 `script.example.js` 的写法与节奏）：冷开场 → 标题卡 → 导言 → [章节卡 壹/贰/叁… → 知识场景] → 回顾 → 片尾。
   每个知识点都要有专门设计的动画；章节卡 `chapter('壹', 1, …)`；同一模块的 header 相同（标题栏保持不动）。
   给章节场景之外的每个模块首场景加 `chapter: '模块一：…'` 字段可选（仅用于 YouTube 章节时间点）。
3. `python3 tools/fonts.py` → `node render.mjs --timeline`（确认 ≤ 5:00）→ `node render.mjs --stills t1,t2,…`（18~24 帧，含每个转场中点）→ 拼联系表亲自检查：
   无重叠、无出画、不压水印/标题栏/右上标题区、字幕区(y≥860)只放字幕。有问题改到干净。
4. `python3 tools/score.py`（原创配乐，按时间线卡点）。
5. 提交并推送 `video/<slug>`（不要提交 segs/成片/bgm.wav 等大文件，.gitignore 已覆盖）。
6. 用 `create_session` 开 4 个渲染会话（`source_url` = 本仓库，`source_revision` = `video/<slug>`，title 如“<标题> 渲染 2/4”），prompt 见 B。
7. 后台等待并收集：`tools/shard_pull.sh <slug> 4`（run_in_background，超时 2 小时；它会等 4 个分支都出现、拉回 segs/、再删掉分支）。
   超过 60 分钟某个分片还没到，用 `list_sessions`/`list_events` 查看那个渲染会话，必要时用 `send_message` 让它继续或重开一个会话渲同一分片。
8. 合成：`node render.mjs --workers 4`（全部分块已在缓存，只做拼接 → video.mp4），`python3 tools/score.py`，`python3 tools/assemble.py` → `成片/<标题>_4K60.mp4`。
   用 ffprobe 核对：3840×2160、60fps、帧数 = timeline frames、时长 ≤ 300 s。
9. 下载网页：
   - 写 `web/youtube.json`：`{"title": "...", "description": "简介 + 章节时间点 + 风险提示 + #标签"}`（时间点取自 timeline.json）。
   - 抽一帧标题卡做海报：`ffmpeg -ss <标题卡第 3 秒> -i 成片/… -frames:v 1 -vf scale=1920:-1 -q:v 3 web/poster.jpg`。
   - `python3 tools/web_plan.py` 切块（每页 ≤40 个 19MB 附件块 + ≤15 个 15MB 发布文件块），`python3 tools/web_build.py`。
   - 依次发布 `web/page_1.html … page_N.html`（Artifact publish，`capabilities: {assets:{}, downloads:true}`，`files: {"poster.jpg": …}`，icon `video`），
     把各页 URL 按顺序写进 `web/links.json`。
   - 每页：附件块用 `asset: true` + `file_paths`（每次 ≤25 个）上传到该页 URL，把返回的 `/_blob/<id>` 写进 `web/asset_urls.json`（键 = 块文件名）；
     发布文件块用 `files`（每次发布 ≤4 个，≤64MB）随该页发布。若附件存储提示已满：把剩余附件块改成 15MB 发布文件块追加到本页（或新开一页），并相应改 plan.json。
   - 全部上传后 `python3 tools/web_build.py`（应显示 missing: 0），用同一 file_path 重新发布每一页。
10. 删除本地 web/pieces、segs、video.mp4 释放磁盘；提交推送；向用户汇报：下载网页按步骤顺序的链接、时长、规格、做过的检查、任何未完成项。

## B. 渲染会话（prompt 模板）
```
你是《<标题>》的渲染会话 <k>/4。仓库已检出分支 video/<slug>。
cd videos/<slug>；node render.mjs --shard <k>/4 --workers 4 > render.log 2>&1（用 run_in_background，超时 7200000）；
渲染完成后 bash tools/shard_push.sh <slug> <k>。不要改任何文件，不要提交到 video/<slug>。
渲染中卡住会自动重试；若失败退出，直接重跑同一命令（已完成的块会跳过）。完成后回复“分片 <k> 已推送”。
```
