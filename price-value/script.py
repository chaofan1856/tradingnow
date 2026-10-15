# -*- coding: utf-8 -*-
"""On-screen text for 《重新理解价格与价值》 (no narration: music + sound design).

Each entry is one subtitle line; 【…】 marks the gold keyword.
  scene : visual scene id (src/scenes.js)
  hold  : optional extra seconds on screen (a visual beat needs time)
Reading time per line is computed in tools/timeline.py.
"""

LINES = [
    # ---------- cold open ----------
    dict(scene='open', sub='屏幕上跳动的这个数字，', pos='T', y=230),
    dict(scene='open', sub='到底是什么？', hold=0.6, pos='C', y=700, size=96),

    # ---------- 壹 价格的本质 ----------
    dict(scene='barter', sub='远古时代，|一只羊，换三把斧头。', hold=0.6, pos='L', y=330),
    dict(scene='barter', sub='从物物交换到今天，价格本质上只是一个【交换比例】。', hold=0.8),
    dict(scene='print', sub='盘面上最新跳动的数字，|不是资产的生命线；', pos='L', y=640, size=56),
    dict(scene='print', sub='它只是上一个买家与上一个卖家，'),
    dict(scene='print', sub='一拍即合的【成交记录】。', hold=0.8, pos='T', y=290, size=76),
    dict(scene='past', sub='价格只代表【过去】，|不代表未来。', hold=0.6, pos='C', y=330, size=76),
    dict(scene='past', sub='高价不等于贵，|低价不等于便宜。', hold=1.4, pos='T', y=250, size=60),

    # ---------- 贰 价格的形成 ----------
    dict(scene='book', sub='价格不是由|某个专家或主力|单方面决定的，', pos='L', y=330, size=54),
    dict(scene='book', sub='而是由|无数买卖双方的|【预期】共同组成。', hold=0.6, pos='R', y=330, size=54),
    dict(scene='book', sub='买方想低价买，卖方想高价卖；', hold=0.4),
    dict(scene='book', sub='只有出价【匹配】，才会产生成交。', hold=1.0),
    dict(scene='mood', sub='「资金推动价格，|情绪改变供求。」', hold=1.0, pos='R', y=300, size=62),
    dict(scene='mood', sub='乐观时加价抢购，价格【上涨】；', hold=0.8),
    dict(scene='mood', sub='恐惧时踩踏割肉，价格【下跌】。', hold=0.8),
    dict(scene='mood', sub='K线记录的不是价值，而是连续变化的【多空博弈】。', hold=1.0),

    # ---------- 叁 冰山模型 ----------
    dict(scene='berg', sub='想象一座冰山。', hold=1.0, pos='L', y=270, size=80),
    dict(scene='berg', sub='水面上的尖角，|是【市场价格】——', hold=0.4, pos='L', y=250),
    dict(scene='berg', sub='唯一能被肉眼|看见的表象，|永远在波动。', hold=0.6, pos='L', y=230, size=54),
    dict(scene='berg', sub='水面下的主体，是【内在价值】：资产九成的实体，', hold=0.6),
    dict(scene='berg', sub='由基本面、盈利能力与行业护城河决定，厚重而稳定。', hold=1.2),
    dict(scene='bubble', sub='当市场狂热，风浪把冰山推高——', hold=0.6),
    dict(scene='bubble', sub='水面上的尖角被无限放大，远超它真实的体量：【泡沫】。', hold=1.2),
    dict(scene='panic', sub='当集体恐慌，|巨浪盖过冰山——', hold=0.8, pos='L', y=250),
    dict(scene='panic', sub='尖角几乎消失，水下的冰山主体却【完好无损】。', hold=1.2),
    dict(scene='revert', sub='无论海浪如何翻涌，尖角终究挣不脱整座冰山的重量。', hold=0.8),
    dict(scene='revert', sub='价格的波动，|终将向【价值回归】。', hold=1.4, pos='L', y=250),

    # ---------- 肆 交易的起点 ----------
    dict(scene='value', sub='价值投资者，|着眼于【水下的冰山】。', hold=0.4, pos='R', y=560, size=58),
    dict(scene='value', sub='恐慌把价格砸到极低，人们以为冰山要沉没时，', hold=0.4),
    dict(scene='value', sub='他们看见冰山依然如故——果断【买入】。', hold=0.8),
    dict(scene='value', sub='代表人物：巴菲特。低价买入被市场低估的伟大公司。', hold=1.0),
    dict(scene='trend', sub='趋势交易者，|着眼于【水面的浪潮】。', hold=0.4, pos='L', y=300),
    dict(scene='trend', sub='不预测冰山的体积，|只顺应风浪的力量；', hold=0.4, pos='L', y=300),
    dict(scene='trend', sub='当资金的巨浪推动价格向上突破，便【顺势】而行。', hold=1.2),

    # ---------- 终极总结 ----------
    dict(scene='summary', sub='新手追逐水面的浪花，', hold=0.6, pos='R', y=250, size=58),
    dict(scene='summary', sub='老手看清背后的风向，', hold=0.6, pos='R', y=250, size=58),
    dict(scene='summary', sub='高手在算水下的冰山。', hold=1.4),
]

FINALE = '新手看【价格】，老手看【供求】，高手看【价值】。'
