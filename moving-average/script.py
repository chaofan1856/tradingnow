# -*- coding: utf-8 -*-
"""On-screen text for 《趋势指挥官：均线》 (no narration, no sound effects: the score carries it).

Each entry is one subtitle line; 【…】 marks the gold keyword, | forces a line break.
  scene : visual scene id (src/scenes.js)
  hold  : extra seconds on screen (a visual beat needs time)
  pos   : B (bottom, default) · T (top) · C (centre) · L / R (side columns); y / size override
Reading time per line is computed in tools/timeline.py.
"""

LINES = [
    # ---------- 引子 红绿背后的隐藏丝线 ----------
    dict(scene='open', sub='无数人迷失在上下乱跳的红绿K线里。', pos='T', y=230),
    dict(scene='open', sub='直到一条平滑的线划过屏幕——噪音退去，趋势【一目了然】。', hold=0.8),
    dict(scene='open', sub='人们把它比作股价的“万有引力”。', hold=0.4),
    dict(scene='open', sub='可它的算法，并不诞生于华尔街。', hold=0.8),

    # ---------- 跨界起源 ----------
    dict(scene='origin', sub='二十世纪初，英国统计学家胡克，较早用移动平均处理经济数据，滤掉短期起伏。', hold=0.4),
    dict(scene='origin', sub='移动平均：把最近N天的价格相加，再除以N，每天向前滑动一格。', hold=0.4),
    dict(scene='origin', sub='MA = (P1 + P2 + … + Pn) ÷ n', hold=1.2, pos='C', y=540, size=70),
    dict(scene='origin', sub='二战之后，美国军方的预测研究，需要更快地跟踪目标与需求。', hold=0.2),
    dict(scene='origin', sub='罗伯特·布朗等人提出【指数平滑】：越新的数据，权重越大。', hold=0.6),
    dict(scene='origin', sub='在没有电脑的年代，|它只需要一次乘法、|一次加法。', hold=0.6, pos='L', y=300, size=58),
    dict(scene='origin', sub='后来，它成了行情软件里的|【EMA】。', hold=0.8, pos='R', y=320, size=58),

    # ---------- 封神 格兰维尔 ----------
    dict(scene='granville', sub='让均线走上神坛的，是华尔街最张扬的明星分析师——约瑟夫·格兰维尔。', hold=0.6),
    dict(scene='granville', sub='在他看来，均线就像价格的【引力中心】。', hold=0.6),
    dict(scene='granville', sub='拉扯与回归：|价格再疯狂，|也像被橡皮筋拉住，|终会回到平均成本。', hold=0.8, pos='L', y=280, size=56),
    dict(scene='granville', sub='趋势护城河：|趋势一旦形成，|均线就是支撑，|也是阻力。', hold=0.8, pos='R', y=280, size=56),
    dict(scene='granville', sub='1960年，他在书中总结出【格兰维尔八大法则】，|至今仍是技术分析的第一课。', hold=1.0),

    # ---------- 1981 一封电报 ----------
    dict(scene='telegram', sub='1981年1月6日晚，格兰维尔向全美订户发出一封加急电报：', hold=0.4),
    dict(scene='telegram', sub='SELL EVERYTHING', hold=1.0, pos='C', y=520, size=96),
    dict(scene='telegram', sub='卖掉一切。', hold=0.6),
    dict(scene='telegram', sub='次日开盘，抛单如潮：美股大跌，成交量创下【历史纪录】。', hold=0.6),
    dict(scene='telegram', sub='他一言撼动大盘，被奉为能预言崩盘的人。', hold=0.4),
    dict(scene='telegram', sub='可随后，美股踏着上升的均线，走出了长达十几年的大牛市。', hold=0.6),
    dict(scene='telegram', sub='格兰维尔却执迷于自己的空头判断，一再唱空，被市场【无情抛弃】。', hold=0.6),
    dict(scene='telegram', sub='工具永远只是路标——盲目迷信任何神话，都会被市场吞噬。', hold=1.2),
]

FINALE = 'K线是激动的潮水，均线是深沉的洋流。|潮水涌得再高，终要向洋流低头。'
FINALE_EN = 'Candles are restless tides; the average is the deep current. However high the tide, it bows to the current.'
