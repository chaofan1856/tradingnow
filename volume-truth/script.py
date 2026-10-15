# -*- coding: utf-8 -*-
"""On-screen text for 《市场的测谎仪：成交量》 (no narration, no sound effects: the score carries it).

Each entry is one subtitle line; 【…】 marks the gold keyword, | forces a line break.
  scene : visual scene id (src/scenes.js)
  hold  : extra seconds on screen (a visual beat needs time)
  pos   : B (bottom, default) · T (top) · C (centre) · L / R (side columns); y / size override
Reading time per line is computed in tools/timeline.py.
"""

LINES = [
    # ---------- 引子 ----------
    dict(scene='open', sub='K线可以被画出来，均线可以被资金扭曲。', pos='T', y=230),
    dict(scene='open', sub='对倒可以造出成交量，却造不出持续的【真金白银】。', hold=0.6),
    dict(scene='open', sub='每一手成交，都是用钱铺出来的路标。', hold=0.8),

    # ---------- 雏形 纸带与觉醒 ----------
    dict(scene='tape', sub='十九世纪的交易所里，没有成交量柱，只有黑板上飞快改写的粉笔价格。', hold=0.4),
    dict(scene='tape', sub='1867年，股票电报纸带机问世。', hold=0.4),
    dict(scene='tape', sub='纸带上不只打印代码与价格，第一次，还打印出了【成交股数】。', hold=0.6),
    dict(scene='tape', sub='最顶尖的交易员不看图表，只盯纸带——比如杰西·利弗莫尔。', hold=0.4),
    dict(scene='tape', sub='他们发现：上涨时，纸带吐得越快、股数越大，这轮上涨才【真正安全】。', hold=0.6),
    dict(scene='tape', sub='这是人类对成交量，最早的觉醒。', hold=1.0),

    # ---------- 奠基 威科夫 ----------
    dict(scene='wyckoff', sub='把成交量变成一门系统学问的，是理查德·威科夫。', hold=0.4),
    dict(scene='wyckoff', sub='威科夫：股市和菜市场没有区别，价格由供求决定。', hold=0.4),
    dict(scene='wyckoff', sub='而成交量，就是供求关系的【度量衡】。', hold=0.6),
    dict(scene='wyckoff', sub='努力：|成交量，|投入的资金。', hold=0.6, pos='L', y=320, size=58),
    dict(scene='wyckoff', sub='结果：|价格的涨跌。', hold=0.6, pos='R', y=320, size=58),
    dict(scene='wyckoff', sub='天量砸下，价格却纹丝不动——说明上方有人在【疯狂出货】。', hold=0.6),
    dict(scene='wyckoff', sub='他把大资金想象成一个“综合人”：|吸筹与派发再隐蔽，也会在成交量上留下【巨型脚印】。', hold=1.0),

    # ---------- 量化 OBV ----------
    dict(scene='obv', sub='1963年，格兰维尔提出能量潮指标——【OBV】。', hold=0.4),
    dict(scene='obv', sub='上涨日的成交量记为正，|下跌日的成交量记为负，|逐日累加。', hold=0.8, pos='L', y=300, size=58),
    dict(scene='obv', sub='格兰维尔：成交量是价格的火车头。', hold=0.6),
    dict(scene='obv', sub='主力悄悄建仓时，价格可以压着不涨，OBV却像蓄水的堤坝一路抬高。', hold=0.4),
    dict(scene='obv', sub='直到堤坝决口，价格【一飞冲天】。', hold=1.0),

    # ---------- 2021 GME ----------
    dict(scene='gme', sub='2021年1月，一场散户与华尔街的对决，把成交量推上了世界头条。', hold=0.4),
    dict(scene='gme', sub='对冲基金重仓做空游戏驿站，空头仓位超过流通股的140%。', hold=0.4),
    dict(scene='gme', sub='Reddit上的散户，在“咆哮小猫”的号召下集体买入，锁死筹码。', hold=0.4),
    dict(scene='gme', sub='成交量海啸般爆发，|股价从不到20美元，冲到盘中【483美元】。', hold=0.8),
    dict(scene='gme', sub='空头想买回股票平仓，市场上却几乎【没有卖盘】。', hold=0.6),
    dict(scene='gme', sub='梅尔文资本当月亏损过半，被迫接受数十亿美元注资，次年清盘。', hold=1.0),
]

FINALE = '价格是市场的皮，成交量是市场的骨。|皮可以伪装，骨骼不会说谎。'
FINALE_EN = 'Price is the skin of the market, volume its bones. Skin can be disguised; bones never lie.'
