# -*- coding: utf-8 -*-
"""On-screen text for 《K线图的前世今生》 (no narration, no sound effects: the score carries it).

Each entry is one subtitle line; 【…】 marks the gold keyword, | forces a line break.
  scene : visual scene id (src/scenes.js)
  hold  : extra seconds on screen (a visual beat needs time)
  pos   : B (bottom, default) · T (top) · C (centre) · L / R (side columns); y / size override
Reading time per line is computed in tools/timeline.py.
"""

LINES = [
    # ---------- 引子 全球金融的统一语言 ----------
    dict(scene='open', sub='华尔街的大屏、加密货币交易所、你手机里的行情软件——', pos='T', y=230),
    dict(scene='open', sub='满屏都是同一种红绿蜡烛。', hold=0.4),
    dict(scene='open', sub='无论哪个国家、交易什么资产，人们都在看【同一种图表】。', hold=0.4),
    dict(scene='open', sub='这件每天左右数万亿资金流向的工具，|起源于三百年前东方的一场【大米博弈】。', hold=1.0),

    # ---------- 诞生 堂岛米会所 ----------
    dict(scene='dojima', sub='十八世纪，日本江户时代。大阪是“天下的厨房”，大米就是财富。', hold=0.4),
    dict(scene='dojima', sub='各地大名把年贡米运到大阪发售，换成金银。', hold=0.2),
    dict(scene='dojima', sub='1730年，幕府正式认可大阪【堂岛米会所】。', hold=0.6),
    dict(scene='dojima', sub='商人交易的不是现米，而是代表大米的票据——|米切手。', hold=0.4, pos='L', y=300, size=58),
    dict(scene='dojima', sub='更有不交割现货、|只按约定价格结算差额的|“账合米”交易：|人类最早的【期货市场】之一。', hold=0.6, pos='R', y=280, size=54),
    dict(scene='dojima', sub='天灾、歉收、饥荒，让米价暴涨暴跌。', hold=0.2),
    dict(scene='dojima', sub='商人们急需一本，能看清价格波动规律的【账本】。', hold=1.0),

    # ---------- 封神 酒田之神 ----------
    dict(scene='homma', sub='出羽国酒田的米商——本间宗久。', hold=0.6, pos='C', y=540, size=76),
    dict(scene='homma', sub='相传他发现：决定米价的不只是供需，更是买卖双方的【恐惧与贪婪】。', hold=0.6),
    dict(scene='homma', sub='本间家成为江户时代屈指可数的巨富，民间传唱：', hold=0.2),
    dict(scene='homma', sub='“比不上本间家，|至少也想当个大名。”', hold=0.8, pos='C', y=520, size=60),
    dict(scene='homma', sub='相传成书于1755年的《三猿金泉录》，记下了他观察米市的心法。', hold=0.4),
    dict(scene='homma', sub='后世据此整理出“酒田战法”：|用蜡烛的形状，判断多空的心理。', hold=0.6),
    dict(scene='homma', sub='三山：|三次冲高不过，|顶部成形。', hold=0.6, pos='L', y=300, size=58),
    dict(scene='homma', sub='三川：|三次探底不破，|底部成形。', hold=0.8, pos='R', y=300, size=58),

    # ---------- 破圈 华尔街的东方启蒙 ----------
    dict(scene='nison', sub='为什么叫“K线”？通行的说法是：它取自日文“界线”一词读音 keisen 的首字母。', hold=0.4),
    dict(scene='nison', sub='二十世纪八十年代以前，华尔街几乎从没见过它。', hold=0.2),
    dict(scene='nison', sub='西方人看的是条形图：|一根竖线，左右两个刻度，|冷冰冰地记录价格。', hold=0.6, pos='L', y=300, size=56),
    dict(scene='nison', sub='1991年，美林证券的分析师史蒂夫·尼森，出版《日本蜡烛图技术》。', hold=0.4),
    dict(scene='nison', sub='实体与影线的张力，第一次让价格有了【情绪】。', hold=0.6),
    dict(scene='nison', sub='来自东方的这套语言，从此征服了华尔街。', hold=1.0),

    # ---------- 红绿颠倒 ----------
    dict(scene='color', sub='有趣的是，同一根蜡烛，在不同的市场颜色正好相反。', hold=0.4),
    dict(scene='color', sub='中国A股：|红涨绿跌。|红色是喜庆与好运。', hold=0.8, pos='L', y=300, size=58),
    dict(scene='color', sub='美股与国际市场：|绿涨红跌。|绿色是美钞的颜色，|红色是赤字与危险。', hold=0.8, pos='R', y=280, size=56),
    dict(scene='color', sub='颜色可以颠倒，蜡烛里的人性，【从未改变】。', hold=1.2),
]

FINALE = '它不只是一张价格走势图，|更是一面照亮人性迷宫的镜子。'
FINALE_EN = 'Not merely a price chart, but a mirror held up to the labyrinth of human nature.'
