# -*- coding: utf-8 -*-
"""On-screen text for 《交易的矩阵》 (no narration, no sound effects: the score carries it).

Each entry is one subtitle line; 【…】 marks the gold keyword, | forces a line break.
  scene : visual scene id (src/scenes.js)
  hold  : extra seconds on screen (a visual beat needs time)
  pos   : B (bottom, default) · T (top) · C (centre) · L / R (side columns); y / size override
Reading time per line is computed in tools/timeline.py.
"""

LINES = [
    # ---------- cold open ----------
    dict(scene='open', sub='盘面上的每一次跳动，', pos='T', y=230),
    dict(scene='open', sub='都落在一张看不见的【矩阵】里。', hold=0.8),

    # ---------- 核心一 风险与收益 ----------
    dict(scene='risk', sub='收益，是承担不确定性换来的补偿。', hold=0.4),
    dict(scene='risk', sub='世界上不存在|孤立于风险之外的|【超额收益】。', pos='L', y=300, size=58),
    dict(scene='risk', sub='盯着利润、忽视风险，是赌博；|只看风险、不敢承担，是空谈。', hold=0.6, pos='R', y=300, size=56),
    dict(scene='risk', sub='格雷厄姆：投资的铁律，是【不要亏损本金】。', hold=0.4),
    dict(scene='risk', sub='塔勒布：交易不追求高胜率，而追求【不对称性】——', hold=0.2),
    dict(scene='risk', sub='错的时候代价极小，对的时候获利极大。', hold=0.6),
    dict(scene='risk', sub='截断亏损，让利润奔跑：|用确定的小风险，|博取不确定的大利润。', hold=1.0, pos='L', y=290, size=56),

    # ---------- 核心二 非理性博弈 ----------
    dict(scene='crowd', sub='静态的图表，由动态的群体情绪编织而成：'),
    dict(scene='crowd', sub='贪婪、恐惧、期待、绝望。', hold=0.8, pos='C', y=540, size=80),
    dict(scene='crowd', sub='短期内，市场不是价值的反映，|而是【群体心理】的动态投射。', hold=0.4, pos='L', y=300, size=56),
    dict(scene='crowd', sub='利弗莫尔：投机如山岳一样古老，|因为人性从未改变。', hold=0.6, pos='R', y=300, size=56),
    dict(scene='crowd', sub='凯恩斯「选美理论」：不是挑最美的女孩，而是预判大众会认为谁最美。', hold=0.6),
    dict(scene='crowd', sub='交易不是与市场对抗，而是【利用大众的非理性】。', hold=0.2),
    dict(scene='crowd', sub='当贪婪或恐慌让价格严重偏离价值，就是借力获利的时机。', hold=0.8),

    # ---------- 核心三 供需撮合 ----------
    dict(scene='flow', sub='跳动的成交价，不由基本面决定，也不由指标决定，'),
    dict(scene='flow', sub='而是主动买盘与主动卖盘碰撞出的【即时均衡点】。', hold=0.6),
    dict(scene='flow', sub='马歇尔：供给与需求，|如同剪刀的双刃。', hold=0.4, pos='L', y=300, size=58),
    dict(scene='flow', sub='威科夫：需求大于供给，价格上涨；|供给大于需求，价格下跌。', hold=0.6, pos='T', y=230, size=56),
    dict(scene='flow', sub='缺乏买盘，好资产也死气沉沉；资金抢筹，垃圾资产也能一飞冲天。', hold=0.4),
    dict(scene='flow', sub='透过订单流与量价，识别【供需力量的转换】。', hold=1.0),

    # ---------- 四个维度 · 同心圆 ----------
    dict(scene='rings', sub='由外而内，一层层逼近交易的核心。', hold=0.6),

    # ---------- 维度一 概率游戏 ----------
    dict(scene='prob', sub='交易不存在 100% 的确定性。', hold=0.2),
    dict(scene='prob', sub='单次结果趋近随机，|一万次的总和遵循【数学期望】。', hold=0.6),
    dict(scene='prob', sub='道格拉斯：你不必知道下一步会如何，也能赚钱。', hold=0.4),
    dict(scene='prob', sub='放弃「单笔必胜」的执念，建立胜率与盈亏比匹配的【正期望系统】；'),
    dict(scene='prob', sub='单笔风险不超过 1–2%，|活到大数法则发挥威力的那一刻。', hold=0.8),

    # ---------- 维度二 预期博弈 ----------
    dict(scene='expect', sub='市场不对当下的事实定价，而对【未来的预期】定价。'),
    dict(scene='expect', sub='预期不仅在猜测未来，也在改变未来。', hold=0.4),
    dict(scene='expect', sub='索罗斯：市场的错误观念会影响现实，|使错误变成现实。', hold=0.4),
    dict(scene='expect', sub='所以利好兑现，往往就是利空——Sell the fact。', hold=0.6),
    dict(scene='expect', sub='交易的是【预期的落差】，而非事实的对错。', hold=0.8),

    # ---------- 维度三 流动性 ----------
    dict(scene='liquid', sub='供需是抽象的，|资金与筹码的流动是具象的。'),
    dict(scene='liquid', sub='资金是燃料，筹码是围墙；价格永远朝【阻力最小】的方向移动。', hold=0.4),
    dict(scene='liquid', sub='主力会主动砸盘或拉盘，清扫散户的止损单——Sweep Liquidity。', hold=0.8),
    dict(scene='liquid', sub='散户的止损单，正是机构最肥美的【对手盘】。', hold=0.8),

    # ---------- 维度四 自我管理 ----------
    dict(scene='self', sub='行情如流水，你无法控制。', hold=0.4),
    dict(scene='self', sub='你唯一能控制的，|是你的手、你的仓位、你的心态。', hold=0.6),
    dict(scene='self', sub='道格拉斯：市场不会伤害你，失控的行为才会。', hold=0.4),
    dict(scene='self', sub='何时认赔，何时落袋，何时空仓——纪律【无可动摇】。', hold=0.4),
    dict(scene='self', sub='把自己训练成一台【毫无情感的概率执行机器】。', hold=1.2),
]

FINALE = '市场从不记录真相，|它只负责映照出人类所有的狂热与恐慌。'
FINALE_EN = 'The market never records the truth; it merely reflects the collective frenzy and panic of mankind.'
