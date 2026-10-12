# 认识交易市场 · 博物馆文物编年体

78 秒（2340 帧）横版 1920×1080 @30fps 知识科普短片。8 幕 · 每幕一个年份 = 一个知识点：

| 帧 | 幕 | 年份 | 知识点 | 焦点物 |
|---|---|---|---|---|
| 0–210 | S0 | — | 钩子：价格从哪里来？ | 雅典猫头鹰银币 |
| 210–450 | S1 | 公元前 1754 | 现货 | 黄铜天平（阻尼振荡归于平衡）|
| 450–810 | S2 | 1602 | 股票 | 羽毛笔 → VOC 凭证 → 海岸线航迹与分红回流 |
| 810–1170 | S3 | 1730 | 期货（对比现货）| 堂岛米券沿「春 → 秋」时间轴交割 |
| 1170–1470 | S4 | 1971 | 外汇 | 金链（美元—黄金）断开 → $ ¥ £ 互相称重 |
| 1470–1770 | S5 | 2009 | 加密货币 | 白皮书 → 创世区块与链环 |
| 1770–2160 | S6 | 1792 | 参与者 | 梧桐树下 24 人 → 今日交易大厅（散户/主力/机构/做市商）|
| 2160–2340 | S7 | 2026 | 此刻 · 你 | 时间线 + 银币母题归位 + 买入键 |

成片：`成片/认识交易市场-1920x1080.mp4`

## 渲染链路（确定性逐帧，无录屏）

1. `index.html` —— 单个 canvas，**所有画面只由 `window.seek(frame)` 决定**：无 CSS transition、无 `Date.now()`、无 `Math.random`；
   尘埃、颗粒、米粒、散户漂移全部用「帧号 / 序号 → `hash()` 伪随机」。可调参数在文件顶部。
2. `render.mjs` —— Node 22 内置 `WebSocket` 直连 headless Chrome 的 CDP：`window.seek(n)` → `Page.captureScreenshot`，多标签页并行，零 npm 依赖。
3. `tools/score.py` —— 用 numpy 合成配乐（低音提琴 55+110Hz 长音 + 极慢 tremolo、年份处羽管键琴单音、S7 弦乐升调）与 `sfx/` 音效。
4. `build.sh` —— ffmpeg 按帧号对齐音效（`adelay`），配乐 -20dB / 音效 -8dB 混音，统一补偿增益后与帧序列合成 mp4。

```bash
./build.sh                 # 全片：score → frames → mp4
./build.sh --audio         # 只重做音频并重新封装
node render.mjs --stills 90,300,500   # 抽帧检查 → stills/
python3 tools/fonts.py     # 改了屏幕文字后：重新子集化并内联字体
```

字体（`tools/fonts-src/`，均为 OFL）：思源宋体 Noto Serif SC（字幕/中文）、Noto Serif JP（仅「匁」）、Playfair Display（年份与数字，
已把 `lnum` 固化进 cmap，canvas 内再按等宽格排布以实现 tabular-nums）、EB Garamond Italic（拉丁文书名）。

## 质检要点（对应 brief 的清单）

- 红色台账：`window.redUsage()` 在渲染结束时打印，全片只有 3 种红：`doc-stamp`（文献章）、`rice-seal`（米券朱印）、`buy-indicator`（S7 按键指示）≤ `RED_BUDGET = 6`。
- 黑场只有两次：帧 0–36 从黑淡入、帧 2280–2340 收黑；中间转场全部是 morph / dust wipe / 推轨。
- 免责声明自帧 2272 起浮现，帧 2280 起完整可见直到最后一帧。
