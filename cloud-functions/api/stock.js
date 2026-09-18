// GET /api/stock?code=600519  或  ?keyword=茅台
// 返回个股综合分析：行情 + K线 + 分时 + 技术指标 + 评分 + 信号 + 投研报告

import { resolveStockByKeyword, searchStockCode } from "./_shared.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        Referer: "https://quote.eastmoney.com/",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 带重试的抓取（东财历史接口线上偶发超时/限流，重试提高成功率） */
async function fetchWithRetry(url, retries = 3, timeoutMs = 20000) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchJson(url, timeoutMs);
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

/** 6 位代码 → 腾讯股票代码（沪市 sh，深市 sz，北交所 bj） */
function toTencentCode(code) {
  const c = String(code);
  if (c.startsWith("6")) return "sh" + c;
  if (c.startsWith("8") || c.startsWith("4")) return "bj" + c;
  return "sz" + c;
}

function clamp(n, min = 0, max = 100) {
  return Math.round(Math.min(max, Math.max(min, n)));
}

/* ---------------- 技术指标 ---------------- */
function ma(arr, n) {
  if (arr.length < n) return null;
  const slice = arr.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / n;
}

function std(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, c) => s + (c - m) * (c - m), 0) / arr.length);
}

function emaSeries(arr, n) {
  const k = 2 / (n + 1);
  const out = [arr[0]];
  for (let i = 1; i < arr.length; i++) out.push(arr[i] * k + out[i - 1] * (1 - k));
  return out;
}

function calcMacd(closes) {
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const dif = closes.map((_, i) => ema12[i] - ema26[i]);
  const dea = emaSeries(dif, 9);
  const hist = dif.map((d, i) => (d - dea[i]) * 2);
  return {
    dif: dif[dif.length - 1],
    dea: dea[dea.length - 1],
    hist: hist[hist.length - 1],
    difSeries: dif,
    deaSeries: dea,
    histSeries: hist,
  };
}

function calcRsi(closes, n = 14) {
  if (closes.length < n + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - n; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / n) / (losses / n);
  return 100 - 100 / (1 + rs);
}

/* ---------------- 通道与支撑阻力 ---------------- */
/** 唐奇安通道（Donchian Channel，N=20）：上轨=N日最高，下轨=N日最低 */
function calcDonchian(kline, n = 20) {
  const slice = kline.slice(-n);
  const up = Math.max.apply(null, slice.map((k) => k.high));
  const low = Math.min.apply(null, slice.map((k) => k.low));
  return { up, low, mid: (up + low) / 2 };
}

/** 回归导轨通道（Linear Regression Channel，N=20）：线性回归线 ± 2 标准差 */
function calcRegression(closes, n = 20) {
  const y = closes.slice(-n);
  const len = y.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < len; i++) {
    sumX += i; sumY += y[i]; sumXY += i * y[i]; sumX2 += i * i;
  }
  const slope = (len * sumXY - sumX * sumY) / (len * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / len;
  const mid = slope * (len - 1) + intercept;
  let ss = 0;
  for (let i = 0; i < len; i++) {
    const r = y[i] - (slope * i + intercept);
    ss += r * r;
  }
  const sd = Math.sqrt(ss / len);
  return { mid, up: mid + 2 * sd, low: mid - 2 * sd, slope };
}

/** 关键支撑位与阻力位（近期高低点 + 布林上下轨） */
function calcSupportResistance(kline, ind, last) {
  const last20 = kline.slice(-20);
  const last60 = kline.slice(-60);
  const high20 = Math.max.apply(null, last20.map((k) => k.high));
  const low20 = Math.min.apply(null, last20.map((k) => k.low));
  const high60 = Math.max.apply(null, last60.map((k) => k.high));
  const low60 = Math.min.apply(null, last60.map((k) => k.low));

  const resistances = [high20, high60];
  if (ind.boll) resistances.push(ind.boll.up);
  const supports = [low20, low60];
  if (ind.boll) supports.push(ind.boll.low);

  const res = resistances
    .filter((v) => v > last)
    .sort((a, b) => a - b)
    .map((v) => Number(v.toFixed(2)))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 3);
  const sup = supports
    .filter((v) => v < last)
    .sort((a, b) => b - a)
    .map((v) => Number(v.toFixed(2)))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 3);
  return { resistances: res, supports: sup };
}

/** 分批建仓交易计划（基于支撑位） */
function buildTradingPlan(price, sr) {
  const steps = [{ step: "现价观察", price: price, action: "观望 / 试探仓 10%" }];
  sr.supports.forEach((s, i) => {
    steps.push({ step: "支撑 " + (i + 1), price: s, action: "回调加仓 " + (20 + i * 15) + "%" });
  });
  return { steps, resistances: sr.resistances, supports: sr.supports };
}

/** 核心监控清单（利好/利空双向 · 行情可自动判定的维度） */
function buildMonitorItems(ind, quote, last, closes) {
  const items = [];
  const push = (dimension, metric, window, good, bad, status, weight) => {
    items.push({ dimension, metric, window, good, bad, status, weight });
  };

  // 估值（PE 分位）
  const pe = quote && quote.pe;
  if (pe != null && pe > 0) {
    push('估值', 'PE(TTM) 分位', '每日',
      '回落至 35 倍以下（安全边际提升）', '突破 50 倍（透支预期）',
      (pe < 35 ? '利好' : pe > 50 ? '利空' : '中性') + ' · ' + pe.toFixed(2) + ' 倍', 7);
  }

  // 技术趋势
  const multiUp = ind.ma5 > ind.ma10 && ind.ma10 > ind.ma20 && ind.ma20 > ind.ma60;
  const multiDown = ind.ma5 < ind.ma10 && ind.ma10 < ind.ma20 && ind.ma20 < ind.ma60;
  push('技术趋势', '均线排列 MA5/10/20/60', '每日',
    '均线多头排列', '均线空头排列',
    multiUp ? '利好' : multiDown ? '利空' : '中性', 8);

  // 量能变化
  const volRatio = ind.vol20 > 0 ? ind.vol5 / ind.vol20 : 1;
  push('量能变化', '5 日均量 / 20 日均量', '每日',
    '放量（量比 > 1.2）', '缩量（量比 < 0.8）',
    volRatio > 1.2 ? '利好' : volRatio < 0.8 ? '利空' : '中性', 6);

  // 短线动量
  const ret5 = (last / closes[closes.length - 6] - 1) * 100;
  push('短线动量', '近 5 日涨跌幅', '每日',
    '上涨 > 2%', '下跌 < -2%',
    ret5 > 2 ? '利好' : ret5 < -2 ? '利空' : '中性', 5);

  // 布林位置
  if (ind.boll) {
    push('布林位置', '价格相对布林通道', '每日',
      '站上布林中轨', '跌破布林中轨',
      last > ind.boll.mid ? '利好' : '利空', 6);
  }

  // MACD 方向
  push('MACD', 'DIF 与 DEA 关系', '每日',
    '金叉状态（DIF > DEA）', '死叉状态（DIF < DEA）',
    ind.macd.dif > ind.macd.dea ? '利好' : '利空', 6);

  return items;
}

/* ---------------- 评分 ---------------- */
function technicalScore(closes, ind, last) {
  let s = 50;
  const reasons = [];
  const add = (n, text) => { s += n; reasons.push({ delta: n, text }); };

  const multiUp = ind.ma5 > ind.ma10 && ind.ma10 > ind.ma20 && ind.ma20 > ind.ma60;
  const multiDown = ind.ma5 < ind.ma10 && ind.ma10 < ind.ma20 && ind.ma20 < ind.ma60;
  if (multiUp) add(20, "均线多头排列（MA5 > MA10 > MA20 > MA60）");
  else if (multiDown) add(-20, "均线空头排列（MA5 < MA10 < MA20 < MA60）");
  else add(0, "均线缠绕，趋势方向不明");

  add(last > ind.ma20 ? 10 : -10, last > ind.ma20 ? "价格站上 20 日均线" : "价格跌破 20 日均线");
  add(last > ind.ma60 ? 8 : -8, last > ind.ma60 ? "价格站上 60 日均线" : "价格跌破 60 日均线");
  add(ind.macd.dif > ind.macd.dea ? 8 : -8, ind.macd.dif > ind.macd.dea ? "MACD 金叉状态（DIF > DEA）" : "MACD 死叉状态（DIF < DEA）");
  add(ind.macd.hist > 0 ? 6 : -6, ind.macd.hist > 0 ? "MACD 柱体为正（多头动能）" : "MACD 柱体为负（空头动能）");
  if (ind.boll) {
    if (last > ind.boll.up) add(-5, "价格突破布林上轨（短线超买）");
    else if (last < ind.boll.low) add(5, "价格跌破布林下轨（短线超卖，或有反弹）");
    else add(0, "价格位于布林通道内");
  }
  const ret5 = (last / closes[closes.length - 6] - 1) * 100;
  const ret20 = (last / closes[closes.length - 21] - 1) * 100;
  add(ret5 > 0 ? 5 : -5, `近 5 日${ret5 > 0 ? "上涨" : "下跌"} ${ret5.toFixed(2)}%`);
  add(ret20 > 0 ? 5 : -5, `近 20 日${ret20 > 0 ? "上涨" : "下跌"} ${ret20.toFixed(2)}%`);

  return { score: clamp(s), reasons };
}

function strategyScore(closes, vols, ind, last) {
  let s = 50;
  const reasons = [];
  const add = (n, text) => { s += n; reasons.push({ delta: n, text }); };

  const dev = (last / ind.ma60 - 1) * 100;
  if (dev > 0 && dev < 15) add(10, `价格高于 60 日均线 ${dev.toFixed(1)}%，趋势健康`);
  else if (dev >= 15) add(-8, `价格偏离 60 日均线 ${dev.toFixed(1)}%，短期过热`);
  else add(-5, `价格低于 60 日均线 ${Math.abs(dev).toFixed(1)}%，趋势偏弱`);

  const vol5 = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const vol20 = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
  if (vol5 > vol20 * 1.2) add(15, "近 5 日量能明显放大（高于 20 日均量 20%）");
  else if (vol5 < vol20 * 0.8) add(-10, "近 5 日缩量（低于 20 日均量 20%），交投清淡");
  else add(0, "量能平稳");

  const rets = [];
  for (let i = 1; i < closes.length; i++) rets.push((closes[i] / closes[i - 1] - 1) * 100);
  const vol = std(rets.slice(-20));
  if (vol < 1) add(8, `波动率低（${vol.toFixed(2)}%），走势平稳`);
  else if (vol > 3) add(-8, `波动率高（${vol.toFixed(2)}%），风险较大`);
  else add(0, `波动率适中（${vol.toFixed(2)}%）`);

  if (ind.rsi != null) {
    if (ind.rsi >= 40 && ind.rsi <= 70) add(10, `RSI=${ind.rsi.toFixed(1)}，处于健康区间`);
    else if (ind.rsi > 80) add(-10, `RSI=${ind.rsi.toFixed(1)}，超买`);
    else if (ind.rsi < 30) add(5, `RSI=${ind.rsi.toFixed(1)}，超卖（或有反弹）`);
  }

  return { score: clamp(s), reasons };
}

function confidenceScore(tech, strat) {
  const diff = Math.abs(tech.score - strat.score);
  const score = clamp(120 - diff);
  const reasons = [{
    delta: 0,
    text: `技术面(${tech.score})与策略面(${strat.score})相差 ${diff} 分，一致度 ${score}%`,
  }];
  return { score, reasons };
}

/* ---------------- 信号 ---------------- */
function generateSignals(closes, vols, ind, last, quote, donchian, regression) {
  const sigs = [];
  const vol5 = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const vol20 = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const ret5 = (last / closes[closes.length - 6] - 1) * 100;
  const ret20 = (last / closes[closes.length - 21] - 1) * 100;

  // 均线
  if (ind.ma5 > ind.ma10 && ind.ma10 > ind.ma20) sigs.push({ type: "利好", text: "均线多头排列（MA5>MA10>MA20），短期趋势向上" });
  if (ind.ma5 < ind.ma10 && ind.ma10 < ind.ma20) sigs.push({ type: "利空", text: "均线空头排列（MA5<MA10<MA20），短期趋势向下" });
  // MACD
  if (ind.macd.dif > ind.macd.dea) sigs.push({ type: "利好", text: "MACD 金叉状态（DIF>DEA），中期趋势偏多" });
  if (ind.macd.dif < ind.macd.dea) sigs.push({ type: "利空", text: "MACD 死叉状态（DIF<DEA），中期趋势偏空" });
  // 布林
  if (ind.boll && last > ind.boll.mid) sigs.push({ type: "利好", text: "价格站上布林中轨，多头占优" });
  if (ind.boll && last < ind.boll.mid) sigs.push({ type: "利空", text: "价格跌破布林中轨，空头占优" });
  if (ind.boll && last > ind.boll.up) sigs.push({ type: "利空", text: "突破布林上轨，短线超买" });
  if (ind.boll && last < ind.boll.low) sigs.push({ type: "利好", text: "跌破布林下轨，短线超卖" });
  // 量价
  if (vol5 > vol20 * 1.2 && ret5 > 0) sigs.push({ type: "利好", text: "放量上涨，量价配合良好" });
  if (vol5 < vol20 * 0.8 && ret5 < 0) sigs.push({ type: "利空", text: "缩量下跌，承接乏力" });
  // RSI
  if (ind.rsi != null && ind.rsi >= 40 && ind.rsi <= 60) sigs.push({ type: "利好", text: `RSI=${ind.rsi.toFixed(1)}，处于健康区间` });
  if (ind.rsi != null && ind.rsi > 80) sigs.push({ type: "利空", text: `RSI=${ind.rsi.toFixed(1)}，超买回调风险` });
  if (ind.rsi != null && ind.rsi < 30) sigs.push({ type: "利好", text: `RSI=${ind.rsi.toFixed(1)}，超卖或有反弹` });
  // 唐奇安通道
  if (donchian && last >= donchian.up) sigs.push({ type: "利好", text: "突破唐奇安上轨（20 日新高）" });
  if (donchian && last <= donchian.low) sigs.push({ type: "利空", text: "跌破唐奇安下轨（20 日新低）" });
  // 回归导轨
  if (regression && regression.slope > 0.05) sigs.push({ type: "利好", text: "回归导轨斜率向上，趋势上行" });
  if (regression && regression.slope < -0.05) sigs.push({ type: "利空", text: "回归导轨斜率向下，趋势下行" });
  // 突破前高/前低
  const high20 = Math.max.apply(null, closes.slice(-21, -1));
  const low20 = Math.min.apply(null, closes.slice(-21, -1));
  if (last > high20) sigs.push({ type: "利好", text: "突破 20 日高点，创阶段新高" });
  if (last < low20) sigs.push({ type: "利空", text: "跌破 20 日低点，创阶段新低" });
  // 换手率
  if (quote && quote.turnover != null) {
    if (quote.turnover > 5) sigs.push({ type: "中性", text: `换手率 ${quote.turnover}%，交投活跃` });
    else if (quote.turnover < 1) sigs.push({ type: "中性", text: `换手率 ${quote.turnover}%，交投清淡` });
  }
  // 动量
  if (ret20 > 10) sigs.push({ type: "利好", text: `近 20 日上涨 ${ret20.toFixed(1)}%，动能强劲` });
  if (ret20 < -10) sigs.push({ type: "利空", text: `近 20 日下跌 ${Math.abs(ret20).toFixed(1)}%，弱势明显` });
  // 横盘
  if (Math.abs(ret5) < 1.5) sigs.push({ type: "中性", text: "近 5 日涨跌幅收窄，横盘整理" });

  // 连阳/连阴
  const last3 = closes.slice(-3);
  let upCount = 0, downCount = 0;
  for (let i = 1; i < last3.length; i++) {
    if (last3[i] > last3[i - 1]) upCount++;
    else if (last3[i] < last3[i - 1]) downCount++;
  }
  if (upCount >= 2) sigs.push({ type: "利好", text: "连续收阳，短线做多情绪升温" });
  if (downCount >= 2) sigs.push({ type: "利空", text: "连续收阴，短线承压" });

  // 估值 PE 分档
  if (quote && quote.pe != null && quote.pe > 0) {
    if (quote.pe < 30) sigs.push({ type: "利好", text: `PE ${quote.pe.toFixed(1)} 倍，估值偏低（安全边际）` });
    else if (quote.pe > 60) sigs.push({ type: "利空", text: `PE ${quote.pe.toFixed(1)} 倍，估值偏高（透支预期）` });
    else sigs.push({ type: "中性", text: `PE ${quote.pe.toFixed(1)} 倍，估值中性` });
  }

  // 成交额活跃度
  if (quote && quote.amount != null && quote.amount > 0) {
    const amtYi = quote.amount / 10000;
    if (amtYi > 20) sigs.push({ type: "利好", text: `成交额 ${amtYi.toFixed(1)} 亿，资金关注度高` });
    else if (amtYi < 1) sigs.push({ type: "中性", text: `成交额 ${amtYi.toFixed(2)} 亿，交投清淡` });
  }

  // 振幅
  if (quote && quote.amplitude != null) {
    if (quote.amplitude > 5) sigs.push({ type: "中性", text: `振幅 ${quote.amplitude}%，波动剧烈` });
    else if (quote.amplitude < 1.5) sigs.push({ type: "中性", text: `振幅 ${quote.amplitude}%，波动平稳` });
  }

  return sigs;
}

/* ---------------- 报告 ---------------- */
function buildReport(name, code, price, changePct, score, ind, sigs) {
  const rating = score.total >= 75 ? "偏强" : score.total >= 55 ? "中性偏多" : score.total >= 40 ? "中性偏弱" : "偏弱";
  const lines = [
    `【${name}（${code}）盯盘结论】`,
    `最新价 ${price}，涨跌幅 ${changePct >= 0 ? "+" : ""}${changePct}%。`,
    `综合评分 ${score.total} 分（技术面 ${score.technical} / 策略面 ${score.strategy} / 置信度 ${score.confidence}），整体${rating}。`,
    ``,
    `【技术面】MA5=${ind.ma5.toFixed(2)}，MA10=${ind.ma10.toFixed(2)}，MA20=${ind.ma20.toFixed(2)}，MA60=${ind.ma60.toFixed(2)}。`,
    `布林带：上轨 ${ind.boll.up.toFixed(2)} / 中轨 ${ind.boll.mid.toFixed(2)} / 下轨 ${ind.boll.low.toFixed(2)}。`,
    `MACD：DIF=${ind.macd.dif.toFixed(3)}，DEA=${ind.macd.dea.toFixed(3)}，柱体=${ind.macd.hist.toFixed(3)}。`,
    `RSI(14)=${ind.rsi != null ? ind.rsi.toFixed(1) : "—"}。`,
    ``,
    `【信号】`,
    ...sigs.map((s) => `· [${s.type}] ${s.text}`),
    ``,
    `本报告由技术指标自动生成，仅供参考，不构成投资建议。`,
  ];
  return lines.join("\n");
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const code = (url.searchParams.get("code") || "").trim();
    const keyword = (url.searchParams.get("keyword") || "").trim();

    // 解析股票（code 也尝试反查名称）
    let stock = code ? (resolveStockByKeyword(code) || { code }) : resolveStockByKeyword(keyword);
    if (!stock || !stock.code) {
      if (keyword || code) {
        const s = await searchStockCode(keyword || code);
        if (s) stock = s;
      }
    }
    if (!stock || !/^\d{6}$/.test(stock.code)) {
      return Response.json({ error: "未识别到有效股票，请输入 6 位股票代码或公司名" }, { status: 404 });
    }

    const tc = toTencentCode(stock.code);

    // 腾讯行情源：fqkline 返回实时行情(qt)+日K线(qfqday)；mkline 返回5分钟K线；minute 返回分时
    const klineUrl = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tc},day,,,120,qfq`;
    const m5Url = `https://ifzq.gtimg.cn/appstock/app/kline/mkline?param=${tc},m5,,240`;
    const minuteUrl = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${tc}`;

    const [kline, m5, minute] = await Promise.allSettled([
      fetchWithRetry(klineUrl),
      fetchWithRetry(m5Url),
      fetchWithRetry(minuteUrl),
    ]);

    // 实时行情（从 fqkline 返回的 qt 字段取，避免单独请求 GBK 编码接口）
    const kd = kline.status === "fulfilled" ? kline.value : null;
    const kdStock = kd && kd.data && kd.data[tc] ? kd.data[tc] : null;
    const qt = kdStock && kdStock.qt && Array.isArray(kdStock.qt[tc]) ? kdStock.qt[tc] : null;
    const name = (qt && qt[1]) || stock.name || code;
    const price = qt ? +qt[3] : null;
    const prevClose = qt ? +qt[4] : null;
    let changePct = qt ? +qt[32] : null;
    if ((changePct == null || isNaN(changePct)) && price != null && prevClose) {
      changePct = +((price - prevClose) / prevClose * 100).toFixed(2);
    }
    // 完整行情详情（腾讯 qt 字段索引）
    const quote = qt ? {
      open: +qt[5],           // 今开
      prevClose: +qt[4],      // 昨收
      high: +qt[33],          // 最高
      low: +qt[34],           // 最低
      volume: +qt[36],        // 成交量（手）
      amount: +qt[37],        // 成交额（万元）
      turnover: +qt[38],      // 换手率 %
      pe: +qt[39],            // 市盈率
      amplitude: +qt[43],     // 振幅 %
      floatCap: +qt[44],      // 流通市值（亿）
      totalCap: +qt[45],      // 总市值（亿）
      pb: +qt[46],            // 市净率
      limitUp: +qt[47],       // 涨停价
      limitDown: +qt[48],     // 跌停价
    } : null;

    // 解析日 K 线（腾讯格式 [date, open, close, high, low, volume]）
    const dayArr = kdStock ? (kdStock.qfqday || kdStock.day || []) : [];
    const kdata = dayArr.slice(-120).map((d) => ({
      date: d[0], open: +d[1], close: +d[2], high: +d[3], low: +d[4],
      volume: +d[5], amount: 0,
    }));

    // 解析 5 分钟 K 线（用于「五日」图，时间格式 YYYYMMDDHHMM）
    const m5d = m5.status === "fulfilled" ? m5.value : null;
    const m5Arr = m5d && m5d.data && m5d.data[tc] && m5d.data[tc].m5 ? m5d.data[tc].m5 : [];
    const kline5 = m5Arr.slice(-240).map((d) => {
      const raw = String(d[0]);
      const date = raw.length >= 12
        ? raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8) + " " + raw.slice(8, 10) + ":" + raw.slice(10, 12)
        : raw;
      return { date, open: +d[1], close: +d[2], high: +d[3], low: +d[4], volume: +d[5], amount: 0 };
    });

    // 解析分时（腾讯格式 "HHMM 价格 累计量 累计额"，均价 = 累计额/累计量/100）
    const md = minute.status === "fulfilled" ? minute.value : null;
    const minArr = md && md.data && md.data[tc] && md.data[tc].data ? md.data[tc].data.data : [];
    const tdata = minArr.map((m) => {
      const p = String(m).split(" ");
      const pr = +p[1], vol = +p[2], amt = +p[3];
      return {
        time: p[0].slice(0, 2) + ":" + p[0].slice(2),
        price: pr,
        avg: vol > 0 ? +(amt / (vol * 100)).toFixed(3) : pr,
        volume: vol,
      };
    });

    if (kdata.length < 25) {
      return Response.json({ error: "K 线数据不足，无法分析" }, { status: 502 });
    }

    // 指标
    const closes = kdata.map((k) => k.close);
    const vols = kdata.map((k) => k.volume);
    const last = closes[closes.length - 1];
    const ind = {
      ma5: ma(closes, 5), ma10: ma(closes, 10), ma20: ma(closes, 20), ma60: ma(closes, 60),
      boll: null,
      macd: calcMacd(closes),
      rsi: calcRsi(closes),
      vol5: ma(vols, 5), vol20: ma(vols, 20),
    };
    const bollArr = closes.slice(-20);
    if (bollArr.length >= 20) {
      const mid = bollArr.reduce((a, b) => a + b, 0) / 20;
      const sd = std(bollArr);
      ind.boll = { up: mid + 2 * sd, mid, low: mid - 2 * sd };
    }

    // 通道与支撑阻力
    const donchian = calcDonchian(kdata, 20);
    const regression = calcRegression(closes, 20);
    const supportResistance = calcSupportResistance(kdata, ind, last);
    const tradingPlan = buildTradingPlan(last, supportResistance);

    // 核心监控清单（自动判定）
    const monitorItems = buildMonitorItems(ind, quote, last, closes);
    const monGood = monitorItems.filter((m) => m.status.startsWith('利好')).length;
    const monBad = monitorItems.filter((m) => m.status.startsWith('利空')).length;
    const monNeutral = monitorItems.length - monGood - monBad;
    const monitorSummary = {
      total: monitorItems.length,
      good: monGood,
      bad: monBad,
      neutral: monNeutral,
      verdict: monGood > monBad ? '偏多' : monBad > monGood ? '偏空' : '多空交织',
    };

    // 评分
    const technical = technicalScore(closes, ind, last);
    const strategy = strategyScore(closes, vols, ind, last);
    const confidence = confidenceScore(technical, strategy);
    const total = clamp((technical.score + strategy.score) / 2);
    const score = {
      total,
      technical: technical.score,
      strategy: strategy.score,
      confidence: confidence.score,
      reasons: {
        technical: technical.reasons,
        strategy: strategy.reasons,
        confidence: confidence.reasons,
      },
    };

    // 信号
    const signals = generateSignals(closes, vols, ind, last, quote, donchian, regression);

    // 报告
    const report = buildReport(name, stock.code, price != null ? price.toFixed(2) : "—",
      changePct != null ? changePct.toFixed(2) : 0, score, ind, signals);

    return Response.json({
      name, code: stock.code, price, changePct, prevClose,
      quote,
      updatedAt: new Date().toISOString(),
      kline: kdata,
      kline5,
      trends: tdata,
      indicators: ind,
      donchian, regression, supportResistance, tradingPlan,
      monitorItems, monitorSummary,
      score, signals, report,
    });
  } catch (e) {
    return Response.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
