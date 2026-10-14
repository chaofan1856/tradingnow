# -*- coding: utf-8 -*-
"""Narration script for 《博弈的符号》.

Each entry is one subtitle line = one narration clip.
  scene : which visual scene the line belongs to (index.html SCENES)
  sub   : subtitle text; 【…】 marks the gold keyword
  tts   : optional text fed to the voice instead of `sub` (homophones for rare
          or polyphonic characters so the narrator reads them correctly)
  gap   : silence after this line, seconds
Scene breaks add their own breathing room (SCENE_GAP in tools/voice.py).
"""

LINES = [
    # ---------- cold open + title ----------
    dict(scene='open', sub='你每天盯着的K线，红与绿，涨与跌。', tts='你每天盯着的K线，红与绿，涨与跌。', gap=0.5),
    dict(scene='open', sub='它看上去，只是屏幕上跳动的数字。', gap=0.35),
    dict(scene='open', sub='可在它背后，那场【博弈】已经进行了五千年。', tts='可在它背后，那场博弈，已经进行了五千年。', gap=0.4),

    # ---------- I-1 Sumer ----------
    dict(scene='sumer', sub='五千年前，美索不达米亚平原。', gap=0.45),
    dict(scene='sumer', sub='最早的金融机构，不是私人银行，而是【神庙】。', gap=0.4),
    dict(scene='sumer', sub='春播时，农民从神庙借走大麦；', tts='春播时，农民从神庙，借走大麦；', gap=0.2),
    dict(scene='sumer', sub='秋收后，【连本带息】归还。', gap=0.4),
    dict(scene='sumer', sub='每一笔契约，都被刻进楔形文字泥板——', tts='每一笔契约，都被刻进，歇形文字泥板。', gap=0.15),
    dict(scene='sumer', sub='本金、利息，还有违约的惩罚。', gap=0.5),
    dict(scene='sumer', sub='五千年前的人类就已明白：【时间】，是有价值的。', gap=0.35),
    dict(scene='sumer', sub='而利息，正是时间的【价格】。', gap=0.45),
    dict(scene='sumer', sub='今天的【杠杆】与【期权】，', gap=0.1),
    dict(scene='sumer', sub='不过是这块泥板，跨越五千年的回声。', gap=0.3),

    # ---------- I-2 Babylon ----------
    dict(scene='babylon', sub='一千年后，古巴比伦。', gap=0.4),
    dict(scene='babylon', sub='从《埃什南纳法典》到《汉谟拉比法典》，', tts='从埃什南纳法典，到汉模拉比法典，', gap=0.15),
    dict(scene='babylon', sub='人类第一次用【成文法】，约束金融。', gap=0.45),
    dict(scene='babylon', sub='大麦借贷，年息不得超过三分之一；', gap=0.2),
    dict(scene='babylon', sub='白银借贷，不得超过【百分之二十】。', gap=0.45),
    dict(scene='babylon', sub='世上，从来没有绝对自由的市场。', gap=0.45),
    dict(scene='babylon', sub='涨跌停板、保证金、强制平仓——', tts='涨跌停板，保证金，强制平仓。', gap=0.15),
    dict(scene='babylon', sub='四千年前，就已有了【秩序】的雏形。', gap=0.3),

    # ---------- II-1 Shang-Zhou / Warring States ----------
    dict(scene='zhou', sub='在东方，商周以贝作币，又用青铜铸贝。', gap=0.4),
    dict(scene='zhou', sub='到了春秋战国，民间借贷盛行。', tts='到了春秋战国，民间借贷，盛型。', gap=0.4),
    dict(scene='zhou', sub='齐国管仲，以【轻重之术】吞吐天下；', gap=0.2),
    dict(scene='zhou', sub='魏国李悝，行平籴之法，调节余缺。', tts='魏国李亏，行平敌之法，条节余缺。', gap=0.4),
    dict(scene='zhou', sub='国家亲自放贷、收储、平抑物价——', gap=0.15),
    dict(scene='zhou', sub='像极了今天的逆回购、平准基金与政策性贷款。', gap=0.45),
    dict(scene='zhou', sub='金融，从来都是【治理】的终极工具。', gap=0.3),

    # ---------- II-2 Tang flying cash ----------
    dict(scene='tang', sub='唐代，商人在长安，把铜钱交给各道进奏院，', tts='唐代，商人在长安，把铜钱，交给各道进奏院，', gap=0.15),
    dict(scene='tang', sub='换回一纸凭券；到了异地，合券取钱。', tts='换回一纸凭券；到了异弟，合券取钱。', gap=0.35),
    dict(scene='tang', sub='这，就是【飞钱】。', gap=0.35),
    dict(scene='tang', sub='信用第一次挣脱了铜钱的重量，在空间中【流动】。', gap=0.3),

    # ---------- II-3 Song jiaozi ----------
    dict(scene='song', sub='北宋，蜀地出现了【交子】——世界上最早的纸币。', tts='北宋，蜀弟出现了交子，世界上，最早的纸币。', gap=0.4),
    dict(scene='song', sub='货币，不再依赖金属本身的价值，', gap=0.15),
    dict(scene='song', sub='而建立在【信用】之上。', gap=0.3),
    dict(scene='song', sub='信用，从此彻底【符号化】。', gap=0.3),

    # ---------- II-4 Shanxi piaohao ----------
    dict(scene='piaohao', sub='明清，山西票号【汇通天下】，', tts='明清，山西票浩，汇通天下，', gap=0.15),
    dict(scene='piaohao', sub='以联号与密押，织成一张全国的汇兑网络。', tts='以联浩与密押，织成一张全国的，汇对网络。', gap=0.3),
    dict(scene='piaohao', sub='大额银两，不必再靠镖车翻山越岭。', gap=0.3),

    # ---------- II-5 synthesis ----------
    dict(scene='chain', sub='从飞钱，到交子，再到票号——', tts='从飞钱，到交子，再到票浩。', gap=0.2),
    dict(scene='chain', sub='中国古代金融史，是一部【效率】的进化史：', tts='中国古代金融史，是一部，效帅的进化史。', gap=0.15),
    dict(scene='chain', sub='不断提升流动性，不断降低交易成本。', gap=0.3),
    dict(scene='chain', sub='正如今天，从电汇，走向【数字资产】。', gap=0.3),

    # ---------- III climax: 1602 ----------
    dict(scene='voc', sub='直到【1602】年，阿姆斯特丹。', tts='直到，一六零二年，阿姆斯特丹。', gap=0.45),
    dict(scene='voc', sub='荷兰东印度公司成立，向所有人发售股份。', gap=0.35),
    dict(scene='voc', sub='第一家上市公司，第一家证券交易所，就此诞生。', gap=0.4),
    dict(scene='voc', sub='所有权与经营权分离，普通人也能参与宏大的博弈。', gap=0.4),
    dict(scene='voc', sub='人类第一次把【未来的风险与收益】，', gap=0.1),
    dict(scene='voc', sub='打包成可以实时交易的标的。', gap=0.4),
    dict(scene='years', sub='现代资本市场，只有【四百多年】。', gap=0.3),

    # ---------- III climax: the candle ----------
    dict(scene='candle', sub='你每天看到的K线，记录的从来不只是红与绿。', gap=0.4),
    dict(scene='candle', sub='它是苏美尔神庙的【泥板】，', tts='它是苏美尔，神庙的泥板，', gap=0.1),
    dict(scene='candle', sub='是唐代长安的【飞钱】，', gap=0.2),
    dict(scene='candle', sub='是五千年来从未改变的【贪婪】、【恐惧】，', gap=0.1),
    dict(scene='candle', sub='和信用博弈的数字符号。', gap=0.5),
    dict(scene='consensus', sub='金融，是跨越【时间】分配资源；', gap=0.3),
    dict(scene='consensus', sub='而价格，是所有人博弈之后的【共识】。', gap=0.3),
]

# Final title card: text only, no voice — music alone carries it out.
FINALE = 'K线的跳动终有止境，而人性的博弈，跨越千年。'
