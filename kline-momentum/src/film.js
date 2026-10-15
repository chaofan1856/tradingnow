'use strict';
/* 《K线与动能博弈》 — the film's own words for the title card, section headings and header citations. */
const FILM = {
  title: 'K线与动能博弈', latin: 'CANDLES & MOMENTUM', sub: '多空符号 · 趋势秩序 · 博弈温度',
  masters: ['尼森', '道', '布鲁克斯'],
  sections: ['body', 'trend', 'gain', 'loss'],
  sec: {
    body: { pre: '模块', num: 1, place: '多空符号的解构', sub: 'K线基础构造', lat: 'Japanese Candlestick Charting Techniques', zh: '《日本蜡烛图技术》', note: '史蒂夫·尼森 · 1991' },
    trend: { pre: '模块', num: 2, place: '秩序的轨迹', sub: '市场三大趋势', lat: 'The Stock Market Barometer', zh: '《股市晴雨表》', note: '道氏理论 · 汉密尔顿 · 1922' },
    gain: { pre: '模块', num: 3, place: '动能增强', sub: '博弈的温度', lat: 'Reading Price Charts Bar by Bar', zh: '《逐根K线解读价格》', note: '阿尔·布鲁克斯 · 2009' },
    loss: { pre: '模块', num: 4, place: '动能衰竭', sub: '反转的前兆', lat: 'Reading Price Charts Bar by Bar', zh: '《逐根K线解读价格》', note: '阿尔·布鲁克斯 · 2009' },
  },
  cites: [],                                        // [section, line index, lat, zh, note]: a second source turns over mid-section
};
