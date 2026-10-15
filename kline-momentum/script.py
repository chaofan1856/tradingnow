# -*- coding: utf-8 -*-
"""On-screen text for 《K线与动能博弈》 (no narration, no sound effects: the score carries it).

Each entry is one subtitle line; 【…】 marks the gold keyword, | forces a line break.
  scene : visual scene id (src/scenes.js)
  hold  : extra seconds on screen (a visual beat needs time)
  pos   : B (bottom, default) · T (top) · C (centre) · L / R (side columns); y / size override
Reading time per line is computed in tools/timeline.py.
"""

LINES = [
    # ---------- cold open ----------
    dict(scene='open', sub='你每天看到的K线，不是随机跳动的数字。', pos='T', y=230),
    dict(scene='open', sub='每一根，都是多空双方用真金白银博弈后，留下的【情绪切片】。', hold=0.6),
    dict(scene='open', sub='在A股，红色是多头的炽热，绿色是空头的冰冷。', hold=0.4),

    # ---------- 模块一 多空符号的解构 ----------
    dict(scene='body', sub='一根K线，由实体与影线组成，记录一个周期里的四个价格：', hold=0.2),
    dict(scene='body', sub='开盘、最高、最低、收盘——【OHLC】。', hold=0.8, pos='C', y=540, size=72),
    dict(scene='body', sub='红色阳线：|收盘高于开盘，|开盘在底，收盘在顶。|多头占优。', hold=0.6, pos='L', y=290, size=56),
    dict(scene='body', sub='绿色阴线：|收盘低于开盘，|开盘在顶，收盘在底。|空头占优。', hold=0.6, pos='R', y=290, size=56),
    dict(scene='body', sub='上影线的顶端，是这一周期的最高点——多头冲锋的【极限】。', hold=0.4),
    dict(scene='body', sub='下影线的底端，是这一周期的最低点——空头打压的【极限】。', hold=0.4),
    dict(scene='body', sub='十字星：实体极小，开盘与收盘几乎重合。', hold=0.4),
    dict(scene='body', sub='多空激战一整轮，最终回到原点，谁也没能吞噬谁——市场陷入【极度犹豫】。', hold=1.0),

    # ---------- 模块二 秩序的轨迹 ----------
    dict(scene='trend', sub='市场从不直线运行，它用冲锋与回调，一波一波向前延伸。', hold=0.6),
    dict(scene='trend', sub='上涨趋势：|高点更高，低点更高。|多头掌控全局，|逢低做多。', hold=1.0, pos='L', y=290, size=56),
    dict(scene='trend', sub='下跌趋势：|高点更低，低点更低。|空头撕扯市场，|逢高做空。', hold=1.0, pos='R', y=290, size=56),
    dict(scene='trend', sub='震荡市场：高点与低点在同一水平横向拉锯，多空势均力敌。', hold=0.4),
    dict(scene='trend', sub='红绿交织，筹码密集换手——这是一场【泥潭战】。', hold=1.0),

    # ---------- 模块三 动能增强 ----------
    dict(scene='gain', sub='反转发生之前，K线的大小与颜色，已经写下了人性的温度。', hold=0.6),
    dict(scene='gain', sub='形态一：紧凑排列。|同色K线紧密相连，几乎没有反向波动与长影线。', hold=0.6),
    dict(scene='gain', sub='主导方完全控盘，对手盘【毫无还手之力】。', hold=0.6),
    dict(scene='gain', sub='形态二：实体放大。|同色K线，一根比一根大。', hold=0.6),
    dict(scene='gain', sub='红色越来越大，是买盘疯狂；绿色越来越大，是恐慌抛售。', hold=0.2),
    dict(scene='gain', sub='多头或空头正在加速冲锋，动能处于【极盛期】。', hold=1.0),

    # ---------- 模块三 动能衰竭 ----------
    dict(scene='loss', sub='信号一：宽幅震荡。|紧凑的趋势之后，突然出现剧烈的上下波动与长影线。', hold=0.6),
    dict(scene='loss', sub='主导方正在失去控制权，对手盘开始【大规模反扑】。', hold=0.6),
    dict(scene='loss', sub='信号二：实体缩小。|同色K线越来越小，行进距离锐减。', hold=0.6),
    dict(scene='loss', sub='冲锋后劲不足，多头或空头已经【精疲力竭】。', hold=0.6),
    dict(scene='loss', sub='信号三：颜色突变。|一连串强势阳线之后，刺入一根无法创新高的阴线。', hold=0.6),
    dict(scene='loss', sub='原有的价格惯性被打断，多空动能遭到【实质性阻断】。', hold=1.2),
]

FINALE = '每一根K线，|都是贪婪与恐惧在时间里留下的脚印。'
FINALE_EN = 'Every candle is a footprint that greed and fear leave on time.'
