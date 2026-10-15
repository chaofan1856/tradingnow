'use strict';
/* 《市场的测谎仪：成交量》 — the film's own words for the title card, section headings and header citations. */
const FILM = {
  title: '市场的测谎仪：成交量', latin: 'VOLUME · THE LIE DETECTOR', sub: '纸带 · 威科夫 · OBV · 散户圣战',
  masters: ['威科夫', '格兰维尔'],
  sections: ['tape', 'wyckoff', 'obv', 'gme'],
  sec: {
    tape: { pre: '篇章', num: 1, place: '纸带上的觉醒', sub: '量价关系的雏形', lat: 'Reminiscences of a Stock Operator', zh: '《股票作手回忆录》', note: '利弗莫尔 · 1923' },
    wyckoff: { pre: '篇章', num: 2, place: '主力的底牌', sub: '威科夫与供求定律', lat: 'Studies in Tape Reading', zh: '《盘口解读研究》', note: '威科夫 · 1910' },
    obv: { pre: '篇章', num: 3, place: '能量潮', sub: 'On-Balance Volume', lat: "Granville's New Key to Stock Market Profits", zh: '《股市获利新钥匙》', note: '格兰维尔 · 1963' },
    gme: { pre: '篇章', num: 4, place: '散户圣战', sub: '2021 · GameStop', lat: 'r/WallStreetBets', zh: '游戏驿站 · GME', note: '2021年1月' },
  },
  cites: [],
};
