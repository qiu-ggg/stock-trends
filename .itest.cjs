/* 集成测试：用最小 DOM / echarts / fetch 桩跑通 script.js 全链路 */
const fs = require('fs');
const vm = require('vm');

/* ---------- 最小 DOM ---------- */
const handlers = {};
const elements = {};
function makeEl(id) {
  const el = {
    id: id || '', innerHTML: '', textContent: '', value: '', disabled: false,
    dataset: {}, style: {}, hidden: false, className: '',
    classList: {
      _s: {},
      add(c) { this._s[c] = true; }, remove(c) { this._s[c] = false; },
      toggle(c, f) { const v = f === undefined ? !this._s[c] : !!f; this._s[c] = v; return v; },
      contains(c) { return !!this._s[c]; }
    },
    addEventListener(ev, fn) { (handlers[id + ':' + ev] = handlers[id + ':' + ev] || []).push(fn); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild() {}, removeChild() {}, remove() {}, focus() {},
    setAttribute() {}, getAttribute() { return null; }, matches() { return false; },
    closest() { return null; }, click() {}
  };
  return el;
}
function getEl(id) { if (!elements[id]) elements[id] = makeEl(id); return elements[id]; }

const document = {
  getElementById: getEl,
  querySelectorAll() { return []; },
  querySelector() { return null; },
  createElement(tag) { const e = makeEl('created-' + tag); e.tagName = tag; return e; },
  body: makeEl('body'),
  addEventListener() {}
};

/* ---------- echarts 桩：捕获 setOption ---------- */
const setOptionCalls = [];
const sandbox = {
  console, Date, Math, JSON, Promise, isNaN, parseInt, parseFloat, isFinite,
  Number, String, Array, Object, Boolean, Error, RegExp, encodeURIComponent, decodeURIComponent,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: function (fn) { return setTimeout(fn, 0); },
  document,
  localStorage: (function () { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; })(),
  scrollTo() {}, devicePixelRatio: 2,
  addEventListener() {},
  echarts: { init: function () { return { setOption: function (o) { setOptionCalls.push(o); }, resize: function () {} }; } }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.addEventListener = function () {};

/* ---------- fetch 桩：腾讯行情 + 平台接口 ---------- */
function klineRows(n) {
  const rows = [];
  let p = 30;
  for (let i = 0; i < n; i++) {
    p += (i < n * 0.7 ? 0.10 : Math.sin(i / 7) * 0.22) + Math.sin(i / 2.5) * 0.04;
    const o = p - 0.1, c = p + 0.06, h = Math.max(o, c) + 0.14, l = Math.min(o, c) - 0.14;
    const dd = String((i % 28) + 1);
    rows.push(['2026-01-' + (dd.length < 2 ? '0' + dd : dd), o.toFixed(2), c.toFixed(2), h.toFixed(2), l.toFixed(2), String(90000 + i * 400)]);
  }
  return rows;
}
function qtOf(name, price) {
  const q = new Array(50).fill(0);
  q[1] = name; q[3] = price; q[4] = price - 0.2; q[5] = price - 0.05;
  q[32] = 1.35; q[33] = price + 0.4; q[34] = price - 0.4; q[36] = 321000; q[37] = 71000;
  q[38] = 2.8; q[39] = 31.2; q[43] = 3.4; q[44] = 240; q[45] = 300; q[46] = 2.1;
  q[47] = price * 1.1; q[48] = price * 0.9;
  return q;
}
const KL = klineRows(260);
const TC = 'sh600519';
sandbox.fetch = function (url) {
  let payload = {};
  if (String(url).indexOf('fqkline') >= 0) {
    const price = Number(KL[KL.length - 1][2]);
    const o = {}; o[TC] = { qt: {}, qfqday: KL };
    o[TC].qt[TC] = qtOf('贵州茅台', price);
    payload = { data: o };
  } else if (String(url).indexOf('mkline') >= 0) {
    const o = {}; o[TC] = { m5: [] };
    for (let i = 0; i < 240; i++) {
      const t = '2026010' + ((i % 5) + 1) + '09' + String(30 + (i % 30)).slice(0, 2) + '00';
      o[TC].m5.push([t, '30.10', '30.20', '30.25', '30.05', '1200']);
    }
    payload = { data: o };
  } else if (String(url).indexOf('minute') >= 0) {
    const o = {}; o[TC] = { data: { data: ['0930 30.10 100 301000', '0931 30.20 120 362400'] } };
    payload = { data: o };
  } else if (String(url).indexOf('/api/hot') >= 0) {
    payload = { items: [], updatedAt: Date.now() };
  } else if (String(url).indexOf('/api/feeds') >= 0) {
    payload = { items: [], total: 0, page: 1, pageSize: 8, hasMore: false };
  }
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload), text: () => Promise.resolve('') });
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('profiles.js', 'utf8'), sandbox, { filename: 'profiles.js' });
vm.runInContext(fs.readFileSync('data.js', 'utf8'), sandbox, { filename: 'data.js' });
vm.runInContext(fs.readFileSync('script.js', 'utf8'), sandbox, { filename: 'script.js' });

function fail(m) { console.log('✗ ' + m); process.exitCode = 1; }
function ok(m) { console.log('✓ ' + m); }

setTimeout(async function () {
  const input = getEl('stock-search-input');
  input.value = '600519';
  const fns = handlers['stock-search-input:keydown'] || [];
  if (!fns.length) { fail('未捕获到股票搜索的 keydown 监听器'); return; }
  for (const fn of fns) await fn({ key: 'Enter', target: input });
  await new Promise((r) => setTimeout(r, 300));

  const A = getEl('action-box').innerHTML;
  const C = getEl('channel-box').innerHTML;
  const P = getEl('profile-box').innerHTML;
  const M = getEl('monitor-box').innerHTML;
  const R = getEl('report-box').innerHTML;
  const PL = getEl('plan-box').innerHTML;

  console.log('\n--- 各卡片 HTML 长度 ---');
  console.log('action', A.length, '| channel', C.length, '| profile', P.length, '| plan', PL.length, '| monitor', M.length, '| report', R.length);

  A.length > 200 ? ok('动作判定卡片已渲染') : fail('动作判定卡片为空');
  A.indexOf('action-name') >= 0 ? ok('动作名与配色已渲染') : fail('动作名缺失');
  A.indexOf('action-scale-chip active') >= 0 ? ok('七档动作谱已渲染并高亮当前档') : fail('动作谱缺失');

  C.indexOf('channel-zone') >= 0 ? ok('轨道研判结论区已渲染') : fail('轨道研判结论区缺失');
  C.indexOf('回归导轨通道') >= 0 ? ok('回归导轨通道条目已渲染') : fail('回归导轨条目缺失');
  C.indexOf('rail-mark') >= 0 ? ok('轨道可视化条已渲染') : fail('轨道可视化条缺失');
  C.indexOf('channel-rule') >= 0 ? ok('轨道规则明细（九类判读）已渲染') : fail('轨道规则明细缺失');

  P.indexOf('profile-tag') >= 0 ? ok('个股画像标签已渲染') : fail('个股画像标签缺失');
  P.indexOf('自动画像') >= 0 ? ok('自动画像来源已显著标注') : fail('自动画像标注缺失');
  P.indexOf('profile-disclaimer') >= 0 ? ok('自动画像诚信免责已渲染') : fail('自动画像免责缺失');

  PL.indexOf('硬性风控') >= 0 ? ok('硬性风控交易计划已渲染') : fail('硬性风控计划缺失');
  PL.indexOf('盈亏比') >= 0 ? ok('盈亏比条目已渲染') : fail('盈亏比缺失');
  PL.indexOf('ps-step') >= 0 ? ok('分批节奏已渲染') : fail('分批节奏缺失');

  M.indexOf('mon-state') >= 0 ? ok('监控清单七态标签已渲染') : fail('监控七态缺失');
  M.indexOf('七态说明') >= 0 ? ok('监控七态说明已渲染') : fail('监控七态说明缺失');

  R.indexOf('report-doc') >= 0 ? ok('8 章报告已渲染为 HTML 文档') : fail('报告文档缺失');
  R.indexOf('report-toc') >= 0 ? ok('报告目录已渲染') : fail('报告目录缺失');
  R.indexOf('八、持仓攻略') >= 0 ? ok('报告含第八章「持仓攻略」') : fail('报告缺少第八章');
  R.indexOf('btn-download-html') >= 0 && R.indexOf('btn-download-md') >= 0 ? ok('HTML / Markdown 双下载按钮已就位') : fail('下载按钮缺失');
  (handlers['btn-download-html:click'] || []).length ? ok('HTML 下载按钮已绑定事件') : fail('HTML 下载未绑定');

  // 图表：导轨通道序列
  const klineOpt = setOptionCalls.filter((o) => o.series && o.series.some((s) => s.name === '导轨上轨'));
  if (klineOpt.length) {
    const opt = klineOpt[0];
    const kSeries = opt.series.find((s) => s.name === 'K线');
    const rail = opt.series.find((s) => s.name === '导轨上轨');
    const mid = opt.series.find((s) => s.name === '导轨中轨');
    console.log('K线根数', kSeries.data.length, '| 导轨上轨点数', rail.data.length, '| 非空', rail.data.filter((v) => v != null).length, '| 导轨中轨点数', mid.data.length);
    rail.data.length === kSeries.data.length ? ok('回归导轨与 K 线严格同长（尾部对齐）') : fail('导轨与 K 线长度不一致');
    rail.data.filter((v) => v != null).length > 0 ? ok('回归导轨已实际绘制出通道') : fail('回归导轨无有效点');
  } else {
    fail('K 线图未绘制回归导轨通道');
  }

  console.log('\n结论：' + (process.exitCode ? '存在失败项' : '全部通过'));
}, 50);
