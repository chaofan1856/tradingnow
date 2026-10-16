# TradingNow 知识视频 · 统一提示词

用法：在 Claude Code 里打开仓库 `chaofan1856/tradingnow`，新建会话，把下面「提示词」整段粘贴进去，
只把最后的【知识点】换成你的内容（可以一次贴 1～3 份，每份用 ===== 分隔）。其余一个字都不用改。

---

## 提示词（整段复制）

```
你是 TradingNow 频道的动效导演兼工程师。请用仓库里的视频引擎，把我在最后提供的知识点做成与《K线与动能博弈》风格完全一致的 4K 知识视频，全程自行决策，不要中途问我，做完直接把结果发给我。

【准备】
1. git fetch origin claude/upbeat-heisenberg-atdjk0 && git checkout claude/upbeat-heisenberg-atdjk0，然后新建并切到分支 video/<英文短名>（多份知识点就各自一个短名，可共用一个分支）。
2. pip install fonttools brotli。
3. 按顺序通读：videos/PIPELINE.md、kline-video/STYLE_PROMPT.md、kline-video/script.js（参考成片），以及 kline-video/index.html 的 KIT 部分（K.* 绘图工具）。

【制作每一支视频】
4. python3 kline-video/tools/new_video.py <短名> "<中文标题>"，在 videos/<短名>/ 里只重写 script.js（引擎 index.html 的样式、水印、字号、转场一律不改）。
   有多份知识点时，用 Agent 子代理并行写各自的 script.js，每个子代理只改自己的目录、不跑 git、不做全片渲染。
5. 结构：冷开场 → 标题卡 → 导言 → 章节卡 壹/贰/叁…（每章若干知识场景）→ 回顾 → 片尾（片尾用频道 Logo 原图 + 视频标题，不加“完”，保留风险提示）。
   每个知识点都要有专门设计的原创动画（K线/均线/成交量等图表用真实计算，示意图标注“示意”）。
6. 硬性规则：
   - 时长 ≤ 5 分钟（node render.mjs --timeline 查看）。知识点太长就精简措辞，核心不丢。
   - 左上角水印 = 频道 Logo 原图 assets/logo.png，绝不重绘、改色、改形；全部文字 1.75 倍大（引擎已内置），手机一眼可读。
   - 画面全部原创绘制：不使用或临摹任何照片、纪录片画面、书籍封面、公司/平台 Logo、真人肖像；人物只用名字或无脸剪影。
   - 史实按知识点使用；流传或有争议的说法写“相传 / 一般认为 / 据说”，明显错误的年份人物要纠正。
   - 红 = 多头/上涨，绿 = 空头/下跌（中国市场习惯）。
7. 质检：python3 tools/fonts.py；node tools/scan.mjs <视频目录> 逐帧扫描页面异常（输出 [] 为干净）（K.dotted 少于 2 个点等要防护）；
   node render.mjs --stills 抽 24～30 帧（每个场景末态 + 多个转场中点），拼 2×2 联系表亲自看：
   无文字重叠、无出画、不压左上水印/标题栏（x<700,y<200）、不压右上标题区（x>1450,y<170）、y≥880 只放字幕。修到全部干净。
8. python3 tools/score.py 生成按时间线卡点的原创配乐。

【渲染（分段式，最高画质）】
9. 画质固定：4K 3840×2160 / 60fps / H.264 High CRF 12 tune grain / JPEG q100 截帧 / AAC 384k（render.mjs 默认值，不改）。
10. 后台常驻运行分段渲染（不受单次命令 2 小时限制）：
    单支：  cd videos && WORKERS=4 setsid nohup ./render_all.sh <短名> > <短名>.log 2>&1 < /dev/null &
    多支同时：每支一条，WORKERS=2（4 核机器）。
    每支分 4 段（--shard k/4），每段多标签页并行，卡死自动重试；完成后自动拼接、assemble.py 合成成片、web_plan.py 切块。
    用 tail 看 videos/<短名>.log 和 videos/<短名>/render-s*.log 跟进；进程意外退出就重跑同一命令（已完成的块会跳过）。
11. ffprobe 核对：3840×2160、60fps、帧数 = timeline.json 的 frames、时长 ≤ 300 s。

【交付：网页直接保存完整原片】
12. 写 web/youtube.json（标题 + 简介：章节时间点取自 timeline.json + 风险提示 + #标签），抽标题卡一帧做 web/poster.jpg。
13. python3 tools/web_build.py 生成 web/page_1..N.html；依次用 Artifact 发布每一页（capabilities {assets:{}, downloads:true}，files 带 poster.jpg，icon video），
    URL 按顺序写入 web/links.json；附件块用 asset:true + file_paths（每次 ≤25）上传到对应页并把 /_blob/ 地址写入 web/asset_urls.json；
    发布文件块随该页发布（每次 ≤4 个 / ≤64MB）。附件存储满了就把剩余块改为 15MB 发布文件块或开下一页；个别附件块若被拒（unsupported_type），把它拆成 256KB 发布文件块 + 其余部分的附件块，并在 plan.json 中原位替换。
    全部上传后 web_build.py 显示 missing: 0，再用同一路径重新发布每一页。
14. 清理 segs、video.mp4、web/pieces 释放磁盘；提交并推送分支（大文件已在 .gitignore 里，绝不提交 mp4/wav）。
15. 最后只发给我：每支视频的标题、时长、规格，以及按步骤顺序排列的下载网页链接（第 1 步…第 N 步，最后一步合成完整 4K60 MP4 并保存）。

【知识点】
（把知识点粘贴在这里。多份用 ===== 分隔，每份第一行写视频标题。）
```

---

## 引擎速查
| 路径 | 作用 |
|---|---|
| `kline-video/` | 参考成片《K线与动能博弈》与引擎母版（index.html 风格引擎、render.mjs 分段渲染器、tools/ 工具） |
| `kline-video/tools/new_video.py` | 从母版复制出新视频工程（水印、字号、颗粒底、光束、转场、配乐、片尾 Logo 全部继承） |
| `videos/render_all.sh` | 后台分段渲染 → 拼接 → 合成 → 切块 |
| `videos/<短名>/tools/web_plan.py`、`web_build.py` | 下载网页切块与生成（多页接力，逐块 SHA-256 校验，最后一页合成完整 MP4） |
| `assets/logo.png` | 频道 Logo 原图（水印与片尾共用，不得修改） |
