'use strict';
/* 《K线图的前世今生》 — the film's own words for the title card, section headings and header citations. */
const FILM = {
  title: 'K线图的前世今生', latin: 'THE LIFE OF THE CANDLESTICK', sub: '大米 · 酒田 · 华尔街 · 红与绿',
  masters: ['本间宗久', '尼森'],
  sections: ['dojima', 'homma', 'nison', 'color'],
  sec: {
    dojima: { pre: '篇章', num: 1, place: '诞生', sub: '大阪堂岛米会所', lat: 'Dojima Rice Exchange', zh: '大阪 · 堂岛米会所', note: '江户时代 · 1730' },
    homma: { pre: '篇章', num: 2, place: '封神', sub: '酒田之神', lat: 'Sankin Kinsen-roku', zh: '《三猿金泉录》', note: '相传 · 1755' },
    nison: { pre: '篇章', num: 3, place: '破圈', sub: '华尔街的东方启蒙', lat: 'Japanese Candlestick Charting Techniques', zh: '《日本蜡烛图技术》', note: '史蒂夫·尼森 · 1991' },
    color: { pre: '篇章', num: 4, place: '红绿颠倒', sub: '颜色里的文化', lat: 'East & West', zh: '红涨绿跌 · 绿涨红跌', note: 'A股 · 美股' },
  },
  cites: [],
};
