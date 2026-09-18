/* ===== 股海舆情 · 纯前端数据层（直连腾讯/东财，无后端）===== */
(function (global) {
  'use strict';

  var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

  /* ---------------- 常量 ---------------- */
  var STOCK_KEYWORDS = [
    "宁德时代", "贵州茅台", "比亚迪", "中芯国际", "腾讯控股", "隆基绿能",
    "东方财富", "招商银行", "中国平安", "五粮液", "美团", "小米集团",
    "京东方", "北方稀土", "赣锋锂业", "恒瑞医药", "迈瑞医疗", "科大讯飞",
    "三一重工", "海康威视", "紫金矿业", "通威股份", "片仔癀", "泸州老窖",
    "万科A", "中国中免", "立讯精密", "汇川技术", "长江电力", "中国神华"
  ];
  var POSITIVE_WORDS = ["涨", "利好", "突破", "买入", "看多", "涨停"];
  var NEGATIVE_WORDS = ["跌", "利空", "跌破", "卖出", "看空", "跌停"];

  // 热点/讨论抓取的核心股票（股吧列表）
  var EASTMONEY_STOCKS = [
    { name: "宁德时代", code: "300750" },
    { name: "贵州茅台", code: "600519" },
    { name: "比亚迪", code: "002594" },
    { name: "中芯国际", code: "688981" },
    { name: "五粮液", code: "000858" },
    { name: "东方财富", code: "300059" },
    { name: "隆基绿能", code: "601012" },
    { name: "招商银行", code: "600036" },
    { name: "中国平安", code: "601318" }
  ];

  // 股票代码映射（用于搜索识别）
  var STOCK_CODE_MAP = {
    "贵州茅台": "600519", "五粮液": "000858", "泸州老窖": "000568", "山西汾酒": "600809",
    "洋河股份": "002304", "古井贡酒": "000596", "海天味业": "603288", "伊利股份": "600887",
    "双汇发展": "000895", "金龙鱼": "300999", "牧原股份": "002714", "温氏股份": "300498",
    "中国中免": "601888", "海大集团": "002311", "东鹏饮料": "605499",
    "招商银行": "600036", "工商银行": "601398", "建设银行": "601939", "农业银行": "601288",
    "中国银行": "601988", "兴业银行": "601166", "浦发银行": "600000", "平安银行": "000001",
    "宁波银行": "002142", "中信银行": "601998", "交通银行": "601328",
    "中国平安": "601318", "中国人寿": "601628", "中国太保": "601601", "新华保险": "601336",
    "中信证券": "600030", "东方财富": "300059", "华泰证券": "601688", "国泰君安": "601211",
    "中金公司": "601995", "中信建投": "601066", "招商证券": "600999", "广发证券": "000776",
    "恒瑞医药": "600276", "迈瑞医疗": "300760", "药明康德": "603259", "爱尔眼科": "300015",
    "片仔癀": "600436", "云南白药": "000538", "智飞生物": "300122", "长春高新": "000661",
    "复星医药": "600196", "泰格医药": "300347", "凯莱英": "002821", "华兰生物": "002007",
    "以岭药业": "002603", "同仁堂": "600085",
    "中芯国际": "688981", "海康威视": "002415", "立讯精密": "002475", "科大讯飞": "002230",
    "京东方": "000725", "韦尔股份": "603501", "北方华创": "002371", "兆易创新": "603986",
    "中微公司": "688012", "澜起科技": "688008", "紫光国微": "002049", "闻泰科技": "600745",
    "歌尔股份": "002241", "蓝思科技": "300433", "中兴通讯": "000063", "三六零": "601360",
    "用友网络": "600588", "金山办公": "688111", "恒生电子": "600570", "工业富联": "601138",
    "浪潮信息": "000977", "中科曙光": "603019", "东方国信": "300166",
    "宁德时代": "300750", "比亚迪": "002594", "隆基绿能": "601012", "通威股份": "600438",
    "阳光电源": "300274", "亿纬锂能": "300014", "天齐锂业": "002466", "赣锋锂业": "002460",
    "华友钴业": "603799", "汇川技术": "300124", "恩捷股份": "002812", "国轩高科": "002074",
    "晶科能源": "688223", "天合光能": "688599", "TCL中环": "002129", "福斯特": "603806",
    "三花智控": "002050",
    "长城汽车": "601633", "长安汽车": "000625", "上汽集团": "600104", "广汽集团": "601238",
    "赛力斯": "601127", "潍柴动力": "000338", "福耀玻璃": "600660", "拓普集团": "601689",
    "德赛西威": "002920", "均胜电子": "600699",
    "万科A": "000002", "保利发展": "600048", "招商蛇口": "001979", "中国建筑": "601668",
    "中国中铁": "601390", "中国铁建": "601186", "中国交建": "601800", "中国电建": "601669",
    "紫金矿业": "601899", "北方稀土": "600111", "中国神华": "601088", "中国石油": "601857",
    "中国石化": "600028", "中国铝业": "601600", "洛阳钼业": "603993", "山东黄金": "600547",
    "陕西煤业": "601225", "中远海控": "601919", "宝钢股份": "600019", "万华化学": "600309",
    "恒力石化": "600346", "荣盛石化": "002493",
    "格力电器": "000651", "美的集团": "000333", "海尔智家": "600690", "海信家电": "000921",
    "苏泊尔": "002032", "老板电器": "002508", "石头科技": "688169",
    "三一重工": "600031", "长江电力": "600900", "中国核电": "601985", "中国联通": "600050",
    "中国电信": "601728", "中国移动": "600941", "大秦铁路": "601006", "京沪高铁": "601816",
    "分众传媒": "002027", "顺丰控股": "002352", "中国中车": "601766", "徐工机械": "000425",
    "恒立液压": "601100", "中国广核": "003816", "华能国际": "600011", "国电南瑞": "600406",
    "中际旭创": "300308", "新易盛": "300502", "沪电股份": "002463",
    "中天科技": "600522", "亨通光电": "600487", "烽火通信": "600498", "长飞光纤": "601869",
    "光迅科技": "002281", "天孚通信": "300394", "太辰光": "300570",
    "中国卫星": "600118", "中国卫通": "601698", "航天电子": "600879", "中航沈飞": "600760",
    "中航西飞": "000768", "航发动力": "600893", "中国船舶": "600150", "中国重工": "601989",
    "光启技术": "002625", "高德红外": "002414", "中直股份": "600038", "航天电器": "002025",
    "中航光电": "002179", "菲利华": "300395",
    "深信服": "300454", "奇安信": "688561", "启明星辰": "002439", "安恒信息": "688023",
    "网宿科技": "300017", "光环新网": "300383", "拓尔思": "300229", "太极股份": "002368"
  };

  /* ---------------- 工具 ---------------- */
  function toTencentCode(code) {
    var c = String(code);
    if (c.charAt(0) === "6") return "sh" + c;
    if (c.charAt(0) === "8" || c.charAt(0) === "4") return "bj" + c;
    return "sz" + c;
  }

  function sentimentOf(text) {
    var t = text || "";
    var pos = 0, neg = 0;
    for (var i = 0; i < POSITIVE_WORDS.length; i++) if (t.indexOf(POSITIVE_WORDS[i]) !== -1) pos++;
    for (var j = 0; j < NEGATIVE_WORDS.length; j++) if (t.indexOf(NEGATIVE_WORDS[j]) !== -1) neg++;
    if (pos > neg) return "positive";
    if (neg > pos) return "negative";
    return "neutral";
  }

  function countOccurrences(text, kw) {
    var count = 0, idx = text.indexOf(kw);
    while (idx !== -1) { count++; idx = text.indexOf(kw, idx + kw.length); }
    return count;
  }

  function formatTime(d) {
    var t = d instanceof Date ? d : new Date(d);
    if (isNaN(t.getTime())) return "";
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate()) + " " + p(t.getHours()) + ":" + p(t.getMinutes());
  }

  function normalizeGubaTime(s) {
    var m = String(s || "").match(/(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (!m) return "";
    var year = new Date().getFullYear();
    return year + "-" + m[1] + "-" + m[2] + " " + m[3] + ":" + m[4];
  }

  function resolveStockByKeyword(keyword) {
    var k = String(keyword || "").trim();
    if (!k) return null;
    if (STOCK_CODE_MAP[k]) return { name: k, code: STOCK_CODE_MAP[k] };
    for (var name in STOCK_CODE_MAP) {
      if (STOCK_CODE_MAP[name] === k) return { name: name, code: k };
    }
    for (var n2 in STOCK_CODE_MAP) {
      if (n2.indexOf(k) !== -1 || (k.length >= 2 && k.indexOf(n2) !== -1)) return { name: n2, code: STOCK_CODE_MAP[n2] };
    }
    return null;
  }

  /* ---------------- 股吧解析 ---------------- */
  function parseGubaHtml(html, stock) {
    var anchors = [];
    var re = /<a\s[^>]*?(?:data-postid="(\d+)"|href="\/news,[^"]*,(\d+)\.html")[^>]*>([^<]+?)<\/a>/g;
    var m;
    while ((m = re.exec(html)) !== null) anchors.push(m);
    var authors = [];
    var re2 = /<a[^>]*href="\/\/i\.eastmoney\.com\/[^"]*"[^>]*>([^<]+)<\/a>/g;
    var m2;
    while ((m2 = re2.exec(html)) !== null) authors.push(m2);
    var replies = [];
    var re3 = /<div class="reply">(\d+)<\/div>/g;
    var m3;
    while ((m3 = re3.exec(html)) !== null) replies.push(m3);
    var updates = [];
    var re4 = /class="update">([^<]+)<\/div>/g;
    var m4;
    while ((m4 = re4.exec(html)) !== null) updates.push(m4);

    var items = [];
    var n = Math.min(anchors.length, authors.length, replies.length);
    var now = Date.now();
    for (var i = 0; i < n; i++) {
      var fullTag = anchors[i][0];
      var postId = anchors[i][1] || anchors[i][2];
      var title = (anchors[i][3] || "").trim();
      if (!title) continue;
      var author = (authors[i] && authors[i][1] || "").trim() || "股友";
      var replyCount = parseInt(replies[i] && replies[i][1] || "0", 10) || 0;

      var hrefMatch = fullTag.match(/href="([^"]+)"/);
      var postUrl = "";
      if (hrefMatch) {
        var h = hrefMatch[1];
        if (h.indexOf("//") === 0) postUrl = "https:" + h;
        else if (h.charAt(0) === "/") postUrl = "https://guba.eastmoney.com" + h;
        else postUrl = h;
      }
      if (!postUrl) postUrl = "https://guba.eastmoney.com/news," + stock.code + "," + postId + ".html";

      items.push({
        id: "guba-" + postId,
        platform: "东方财富股吧",
        title: title,
        content: "【" + stock.name + "】" + title,
        author: author,
        heat: replyCount * 100 + 50,
        publishedAt: normalizeGubaTime(updates[i] && updates[i][1]) || formatTime(new Date(now - i * 300000)),
        sentiment: sentimentOf(title),
        url: postUrl
      });
    }
    return items;
  }

  /* ---------------- 技术指标 ---------------- */
  function ma(arr, n) {
    if (arr.length < n) return null;
    var s = 0;
    for (var i = arr.length - n; i < arr.length; i++) s += arr[i];
    return s / n;
  }
  function std(arr) {
    if (arr.length < 2) return 0;
    var m = 0, i;
    for (i = 0; i < arr.length; i++) m += arr[i];
    m /= arr.length;
    var ss = 0;
    for (i = 0; i < arr.length; i++) ss += (arr[i] - m) * (arr[i] - m);
    return Math.sqrt(ss / arr.length);
  }
  function emaSeries(arr, n) {
    var k = 2 / (n + 1), out = [arr[0]];
    for (var i = 1; i < arr.length; i++) out.push(arr[i] * k + out[i - 1] * (1 - k));
    return out;
  }
  function calcMacd(closes) {
    var e12 = emaSeries(closes, 12), e26 = emaSeries(closes, 26);
    var dif = [], dea, hist = [], i;
    for (i = 0; i < closes.length; i++) dif.push(e12[i] - e26[i]);
    dea = emaSeries(dif, 9);
    for (i = 0; i < dif.length; i++) hist.push((dif[i] - dea[i]) * 2);
    return {
      dif: dif[dif.length - 1], dea: dea[dea.length - 1], hist: hist[hist.length - 1],
      difSeries: dif, deaSeries: dea, histSeries: hist
    };
  }
  function calcRsi(closes, n) {
    n = n || 14;
    if (closes.length < n + 1) return null;
    var gains = 0, losses = 0;
    for (var i = closes.length - n; i < closes.length; i++) {
      var diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    if (losses === 0) return 100;
    var rs = (gains / n) / (losses / n);
    return 100 - 100 / (1 + rs);
  }
  function calcDonchian(kline, n) {
    n = n || 20;
    var slice = kline.slice(-n);
    var up = -Infinity, low = Infinity;
    for (var i = 0; i < slice.length; i++) {
      if (slice[i].high > up) up = slice[i].high;
      if (slice[i].low < low) low = slice[i].low;
    }
    return { up: up, low: low, mid: (up + low) / 2 };
  }
  function calcRegression(closes, n) {
    n = n || 20;
    var y = closes.slice(-n), len = y.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < len; i++) {
      sumX += i; sumY += y[i]; sumXY += i * y[i]; sumX2 += i * i;
    }
    var slope = (len * sumXY - sumX * sumY) / (len * sumX2 - sumX * sumX);
    var intercept = (sumY - slope * sumX) / len;
    var mid = slope * (len - 1) + intercept;
    var ss = 0;
    for (var j = 0; j < len; j++) { var r = y[j] - (slope * j + intercept); ss += r * r; }
    var sd = Math.sqrt(ss / len);
    return { mid: mid, up: mid + 2 * sd, low: mid - 2 * sd, slope: slope };
  }
  function calcSupportResistance(kline, ind, last) {
    var l20 = kline.slice(-20), l60 = kline.slice(-60);
    var h20 = -Infinity, lo20 = Infinity, h60 = -Infinity, lo60 = Infinity;
    var i;
    for (i = 0; i < l20.length; i++) { if (l20[i].high > h20) h20 = l20[i].high; if (l20[i].low < lo20) lo20 = l20[i].low; }
    for (i = 0; i < l60.length; i++) { if (l60[i].high > h60) h60 = l60[i].high; if (l60[i].low < lo60) lo60 = l60[i].low; }
    var resistances = [h20, h60], supports = [lo20, lo60];
    if (ind.boll) { resistances.push(ind.boll.up); supports.push(ind.boll.low); }
    var res = resistances.filter(function (v) { return v > last; }).sort(function (a, b) { return a - b; })
      .map(function (v) { return +v.toFixed(2); })
      .filter(function (v, idx, arr) { return arr.indexOf(v) === idx; }).slice(0, 3);
    var sup = supports.filter(function (v) { return v < last; }).sort(function (a, b) { return b - a; })
      .map(function (v) { return +v.toFixed(2); })
      .filter(function (v, idx, arr) { return arr.indexOf(v) === idx; }).slice(0, 3);
    return { resistances: res, supports: sup };
  }
  function buildTradingPlan(price, sr) {
    var steps = [{ step: "现价观察", price: price, action: "观望 / 试探仓 10%" }];
    sr.supports.forEach(function (s, i) {
      steps.push({ step: "支撑 " + (i + 1), price: s, action: "回调加仓 " + (20 + i * 15) + "%" });
    });
    return { steps: steps, resistances: sr.resistances, supports: sr.supports };
  }
  function buildMonitorItems(ind, quote, last, closes) {
    var items = [];
    function push(d, m, w, g, b, st, wt) { items.push({ dimension: d, metric: m, window: w, good: g, bad: b, status: st, weight: wt }); }
    var pe = quote && quote.pe;
    if (pe != null && pe > 0) {
      push("估值", "PE(TTM) 分位", "每日", "回落至 35 倍以下（安全边际提升）", "突破 50 倍（透支预期）",
        (pe < 35 ? "利好" : pe > 50 ? "利空" : "中性") + " · " + pe.toFixed(2) + " 倍", 7);
    }
    var multiUp = ind.ma5 > ind.ma10 && ind.ma10 > ind.ma20 && ind.ma20 > ind.ma60;
    var multiDown = ind.ma5 < ind.ma10 && ind.ma10 < ind.ma20 && ind.ma20 < ind.ma60;
    push("技术趋势", "均线排列 MA5/10/20/60", "每日", "均线多头排列", "均线空头排列", multiUp ? "利好" : multiDown ? "利空" : "中性", 8);
    var volRatio = ind.vol20 > 0 ? ind.vol5 / ind.vol20 : 1;
    push("量能变化", "5 日均量 / 20 日均量", "每日", "放量（量比 > 1.2）", "缩量（量比 < 0.8）", volRatio > 1.2 ? "利好" : volRatio < 0.8 ? "利空" : "中性", 6);
    var ret5 = (last / closes[closes.length - 6] - 1) * 100;
    push("短线动量", "近 5 日涨跌幅", "每日", "上涨 > 2%", "下跌 < -2%", ret5 > 2 ? "利好" : ret5 < -2 ? "利空" : "中性", 5);
    if (ind.boll) push("布林位置", "价格相对布林通道", "每日", "站上布林中轨", "跌破布林中轨", last > ind.boll.mid ? "利好" : "利空", 6);
    push("MACD", "DIF 与 DEA 关系", "每日", "金叉状态（DIF > DEA）", "死叉状态（DIF < DEA）", ind.macd.dif > ind.macd.dea ? "利好" : "利空", 6);
    return items;
  }

  /* ---------------- 评分 ---------------- */
  function clamp(n, min, max) { return Math.round(Math.min(max, Math.max(min, n))); }
  function technicalScore(closes, ind, last) {
    var s = 50, reasons = [];
    function add(n, text) { s += n; reasons.push({ delta: n, text: text }); }
    var multiUp = ind.ma5 > ind.ma10 && ind.ma10 > ind.ma20 && ind.ma20 > ind.ma60;
    var multiDown = ind.ma5 < ind.ma10 && ind.ma10 < ind.ma20 && ind.ma20 < ind.ma60;
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
    var r5 = (last / closes[closes.length - 6] - 1) * 100;
    var r20 = (last / closes[closes.length - 21] - 1) * 100;
    add(r5 > 0 ? 5 : -5, "近 5 日" + (r5 > 0 ? "上涨" : "下跌") + " " + r5.toFixed(2) + "%");
    add(r20 > 0 ? 5 : -5, "近 20 日" + (r20 > 0 ? "上涨" : "下跌") + " " + r20.toFixed(2) + "%");
    return { score: clamp(s, 0, 100), reasons: reasons };
  }
  function strategyScore(closes, vols, ind, last) {
    var s = 50, reasons = [];
    function add(n, text) { s += n; reasons.push({ delta: n, text: text }); }
    var dev = (last / ind.ma60 - 1) * 100;
    if (dev > 0 && dev < 15) add(10, "价格高于 60 日均线 " + dev.toFixed(1) + "%，趋势健康");
    else if (dev >= 15) add(-8, "价格偏离 60 日均线 " + dev.toFixed(1) + "%，短期过热");
    else add(-5, "价格低于 60 日均线 " + Math.abs(dev).toFixed(1) + "%，趋势偏弱");
    var vol5 = vols.slice(-5).reduce(function (a, b) { return a + b; }, 0) / 5;
    var vol20 = vols.slice(-20).reduce(function (a, b) { return a + b; }, 0) / 20;
    if (vol5 > vol20 * 1.2) add(15, "近 5 日量能明显放大（高于 20 日均量 20%）");
    else if (vol5 < vol20 * 0.8) add(-10, "近 5 日缩量（低于 20 日均量 20%），交投清淡");
    else add(0, "量能平稳");
    var rets = [];
    for (var i = 1; i < closes.length; i++) rets.push((closes[i] / closes[i - 1] - 1) * 100);
    var vol = std(rets.slice(-20));
    if (vol < 1) add(8, "波动率低（" + vol.toFixed(2) + "%），走势平稳");
    else if (vol > 3) add(-8, "波动率高（" + vol.toFixed(2) + "%），风险较大");
    else add(0, "波动率适中（" + vol.toFixed(2) + "%）");
    if (ind.rsi != null) {
      if (ind.rsi >= 40 && ind.rsi <= 70) add(10, "RSI=" + ind.rsi.toFixed(1) + "，处于健康区间");
      else if (ind.rsi > 80) add(-10, "RSI=" + ind.rsi.toFixed(1) + "，超买");
      else if (ind.rsi < 30) add(5, "RSI=" + ind.rsi.toFixed(1) + "，超卖（或有反弹）");
    }
    return { score: clamp(s, 0, 100), reasons: reasons };
  }
  function confidenceScore(tech, strat) {
    var diff = Math.abs(tech.score - strat.score);
    var score = clamp(120 - diff, 0, 100);
    return { score: score, reasons: [{ delta: 0, text: "技术面(" + tech.score + ")与策略面(" + strat.score + ")相差 " + diff + " 分，一致度 " + score + "%" }] };
  }

  /* ---------------- 信号 ---------------- */
  function generateSignals(closes, vols, ind, last, quote, donchian, regression) {
    var sigs = [];
    var vol5 = vols.slice(-5).reduce(function (a, b) { return a + b; }, 0) / 5;
    var vol20 = vols.slice(-20).reduce(function (a, b) { return a + b; }, 0) / 20;
    var ret5 = (last / closes[closes.length - 6] - 1) * 100;
    var ret20 = (last / closes[closes.length - 21] - 1) * 100;

    if (ind.ma5 > ind.ma10 && ind.ma10 > ind.ma20) sigs.push({ type: "利好", text: "均线多头排列（MA5>MA10>MA20），短期趋势向上" });
    if (ind.ma5 < ind.ma10 && ind.ma10 < ind.ma20) sigs.push({ type: "利空", text: "均线空头排列（MA5<MA10<MA20），短期趋势向下" });
    if (ind.macd.dif > ind.macd.dea) sigs.push({ type: "利好", text: "MACD 金叉状态（DIF>DEA），中期趋势偏多" });
    if (ind.macd.dif < ind.macd.dea) sigs.push({ type: "利空", text: "MACD 死叉状态（DIF<DEA），中期趋势偏空" });
    if (ind.boll && last > ind.boll.mid) sigs.push({ type: "利好", text: "价格站上布林中轨，多头占优" });
    if (ind.boll && last < ind.boll.mid) sigs.push({ type: "利空", text: "价格跌破布林中轨，空头占优" });
    if (ind.boll && last > ind.boll.up) sigs.push({ type: "利空", text: "突破布林上轨，短线超买" });
    if (ind.boll && last < ind.boll.low) sigs.push({ type: "利好", text: "跌破布林下轨，短线超卖" });
    if (vol5 > vol20 * 1.2 && ret5 > 0) sigs.push({ type: "利好", text: "放量上涨，量价配合良好" });
    if (vol5 < vol20 * 0.8 && ret5 < 0) sigs.push({ type: "利空", text: "缩量下跌，承接乏力" });
    if (ind.rsi != null && ind.rsi >= 40 && ind.rsi <= 60) sigs.push({ type: "利好", text: "RSI=" + ind.rsi.toFixed(1) + "，处于健康区间" });
    if (ind.rsi != null && ind.rsi > 80) sigs.push({ type: "利空", text: "RSI=" + ind.rsi.toFixed(1) + "，超买回调风险" });
    if (ind.rsi != null && ind.rsi < 30) sigs.push({ type: "利好", text: "RSI=" + ind.rsi.toFixed(1) + "，超卖或有反弹" });
    if (donchian && last >= donchian.up) sigs.push({ type: "利好", text: "突破唐奇安上轨（20 日新高）" });
    if (donchian && last <= donchian.low) sigs.push({ type: "利空", text: "跌破唐奇安下轨（20 日新低）" });
    if (regression && regression.slope > 0.05) sigs.push({ type: "利好", text: "回归导轨斜率向上，趋势上行" });
    if (regression && regression.slope < -0.05) sigs.push({ type: "利空", text: "回归导轨斜率向下，趋势下行" });
    var high20 = Math.max.apply(null, closes.slice(-21, -1));
    var low20 = Math.min.apply(null, closes.slice(-21, -1));
    if (last > high20) sigs.push({ type: "利好", text: "突破 20 日高点，创阶段新高" });
    if (last < low20) sigs.push({ type: "利空", text: "跌破 20 日低点，创阶段新低" });
    if (quote && quote.turnover != null) {
      if (quote.turnover > 5) sigs.push({ type: "中性", text: "换手率 " + quote.turnover + "%，交投活跃" });
      else if (quote.turnover < 1) sigs.push({ type: "中性", text: "换手率 " + quote.turnover + "%，交投清淡" });
    }
    if (ret20 > 10) sigs.push({ type: "利好", text: "近 20 日上涨 " + ret20.toFixed(1) + "%，动能强劲" });
    if (ret20 < -10) sigs.push({ type: "利空", text: "近 20 日下跌 " + Math.abs(ret20).toFixed(1) + "%，弱势明显" });
    var last3 = closes.slice(-3), upCount = 0, downCount = 0;
    for (var i = 1; i < last3.length; i++) {
      if (last3[i] > last3[i - 1]) upCount++;
      else if (last3[i] < last3[i - 1]) downCount++;
    }
    if (upCount >= 2) sigs.push({ type: "利好", text: "连续收阳，短线做多情绪升温" });
    if (downCount >= 2) sigs.push({ type: "利空", text: "连续收阴，短线承压" });
    if (quote && quote.pe != null && quote.pe > 0) {
      if (quote.pe < 30) sigs.push({ type: "利好", text: "PE " + quote.pe.toFixed(1) + " 倍，估值偏低（安全边际）" });
      else if (quote.pe > 60) sigs.push({ type: "利空", text: "PE " + quote.pe.toFixed(1) + " 倍，估值偏高（透支预期）" });
      else sigs.push({ type: "中性", text: "PE " + quote.pe.toFixed(1) + " 倍，估值中性" });
    }
    if (quote && quote.amount != null && quote.amount > 0) {
      var amtYi = quote.amount / 10000;
      if (amtYi > 20) sigs.push({ type: "利好", text: "成交额 " + amtYi.toFixed(1) + " 亿，资金关注度高" });
      else if (amtYi < 1) sigs.push({ type: "中性", text: "成交额 " + amtYi.toFixed(2) + " 亿，交投清淡" });
    }
    if (quote && quote.amplitude != null) {
      if (quote.amplitude > 5) sigs.push({ type: "中性", text: "振幅 " + quote.amplitude + "%，波动剧烈" });
      else if (quote.amplitude < 1.5) sigs.push({ type: "中性", text: "振幅 " + quote.amplitude + "%，波动平稳" });
    }
    if (Math.abs(ret5) < 1.5) sigs.push({ type: "中性", text: "近 5 日涨跌幅收窄，横盘整理" });
    return sigs;
  }

  function buildReport(name, code, priceStr, changePctStr, score, ind, sigs) {
    var rating = score.total >= 75 ? "偏强" : score.total >= 55 ? "中性偏多" : score.total >= 40 ? "中性偏弱" : "偏弱";
    var lines = [
      "【" + name + "（" + code + "）盯盘结论】",
      "最新价 " + priceStr + "，涨跌幅 " + changePctStr + "%。",
      "综合评分 " + score.total + " 分（技术面 " + score.technical + " / 策略面 " + score.strategy + " / 置信度 " + score.confidence + "），整体" + rating + "。",
      "",
      "【技术面】MA5=" + ind.ma5.toFixed(2) + "，MA10=" + ind.ma10.toFixed(2) + "，MA20=" + ind.ma20.toFixed(2) + "，MA60=" + ind.ma60.toFixed(2) + "。",
      "布林带：上轨 " + ind.boll.up.toFixed(2) + " / 中轨 " + ind.boll.mid.toFixed(2) + " / 下轨 " + ind.boll.low.toFixed(2) + "。",
      "MACD：DIF=" + ind.macd.dif.toFixed(3) + "，DEA=" + ind.macd.dea.toFixed(3) + "，柱体=" + ind.macd.hist.toFixed(3) + "。",
      "RSI(14)=" + (ind.rsi != null ? ind.rsi.toFixed(1) : "—") + "。",
      "",
      "【信号】"
    ];
    sigs.forEach(function (s) { lines.push("· [" + s.type + "] " + s.text); });
    lines.push("");
    lines.push("本报告由技术指标自动生成，仅供参考，不构成投资建议。");
    return lines.join("\n");
  }

  /* ---------------- 腾讯直连 ---------------- */
  function fetchJson(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); reject(new Error("timeout")); }, timeoutMs || 12000);
      fetch(url, { headers: { "User-Agent": UA, Accept: "application/json, text/plain, */*" }, signal: controller ? controller.signal : undefined })
        .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
        .then(function (data) { clearTimeout(timer); resolve(data); })
        .catch(function (e) { clearTimeout(timer); reject(e); });
    });
  }

  function fetchKline(tc, n) {
    return fetchJson("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=" + tc + ",day,,," + (n || 120) + ",qfq", 15000);
  }
  function fetchM5(tc, n) {
    return fetchJson("https://ifzq.gtimg.cn/appstock/app/kline/mkline?param=" + tc + ",m5,," + (n || 240), 15000);
  }
  function fetchMinute(tc) {
    return fetchJson("https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=" + tc, 15000);
  }

  /* ---------------- 股吧抓取与热点聚合 ---------------- */
  function fetchGubaHtml(code) {
    return fetch("https://guba.eastmoney.com/list," + code + ".html", { headers: { "User-Agent": UA } })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.text(); });
  }

  function fetchAllFeeds() {
    var tasks = EASTMONEY_STOCKS.map(function (stock) {
      return fetchGubaHtml(stock.code).then(function (html) {
        return parseGubaHtml(html, stock).slice(0, 15);
      }).catch(function () { return []; });
    });
    return Promise.all(tasks).then(function (arrays) {
      var feeds = [];
      arrays.forEach(function (arr) { feeds = feeds.concat(arr); });
      return feeds;
    });
  }

  function fetchGubaByCode(code) {
    var name = code;
    for (var n in STOCK_CODE_MAP) { if (STOCK_CODE_MAP[n] === code) { name = n; break; } }
    return fetchGubaHtml(code).then(function (html) {
      return parseGubaHtml(html, { name: name, code: code }).slice(0, 30);
    }).catch(function () { return []; });
  }

  function readLastHot() {
    try { return JSON.parse(localStorage.getItem("stock-last-hot") || "{}"); } catch (e) { return {}; }
  }
  function saveLastHot(map) {
    try { localStorage.setItem("stock-last-hot", JSON.stringify(map)); } catch (e) {}
  }
  function simulateDelta(keyword) {
    var h = 0;
    for (var i = 0; i < keyword.length; i++) h = (h * 31 + keyword.charCodeAt(i)) % 1000;
    return Math.round(((h % 60) - 30) / 10) * 10;
  }

  function computeHotItems(pool) {
    var stats = {};
    pool.forEach(function (item) {
      var text = (item.title || "") + " " + (item.content || "");
      var heat = Number(item.heat) || 0;
      STOCK_KEYWORDS.forEach(function (kw) {
        var count = countOccurrences(text, kw);
        if (count === 0) return;
        if (!stats[kw]) {
          stats[kw] = { keyword: kw, mentions: 0, score: 0, heatSum: 0, platforms: {}, sent: { positive: 0, negative: 0, neutral: 0 } };
        }
        var s = stats[kw];
        s.mentions += count;
        s.heatSum += heat;
        s.score += count * 1000 + heat;
        s.platforms[item.platform] = true;
        s.sent[sentimentOf(text)] += count;
      });
    });
    var ranked = [];
    for (var k in stats) ranked.push(stats[k]);
    ranked.sort(function (a, b) { return b.score - a.score; });
    ranked = ranked.slice(0, 10);

    var prev = readLastHot();
    var current = {};
    var items = ranked.map(function (s, idx) {
      var heat = Math.round(s.score);
      var prevHeat = prev[s.keyword];
      var delta;
      if (typeof prevHeat === "number" && prevHeat > 0) delta = Math.round(((heat - prevHeat) / prevHeat) * 1000) / 10;
      else delta = simulateDelta(s.keyword);
      current[s.keyword] = heat;
      var platforms = Object.keys(s.platforms);
      var sent = s.sent;
      var dominant = sent.positive >= sent.negative && sent.positive >= sent.neutral ? "positive"
        : sent.negative >= sent.positive && sent.negative >= sent.neutral ? "negative" : "neutral";
      return {
        rank: idx + 1,
        keyword: s.keyword,
        heat: heat,
        delta: delta,
        mentions: s.mentions,
        platforms: platforms,
        sentiment: dominant,
        summary: ""
      };
    });
    saveLastHot(current);
    return items;
  }

  /* ---------------- 股票分析 ---------------- */
  function analyzeStock(code) {
    var tc = toTencentCode(code);
    return Promise.allSettled([
      fetchKline(tc, 250),
      fetchM5(tc, 240),
      fetchMinute(tc)
    ]).then(function (results) {
      var kline = results[0], m5 = results[1], minute = results[2];

      var kd = kline.status === "fulfilled" ? kline.value : null;
      var kdStock = kd && kd.data && kd.data[tc] ? kd.data[tc] : null;
      var qt = kdStock && kdStock.qt && Array.isArray(kdStock.qt[tc]) ? kdStock.qt[tc] : null;
      var name = (qt && qt[1]) || code;
      var price = qt ? +qt[3] : null;
      var prevClose = qt ? +qt[4] : null;
      var changePct = qt ? +qt[32] : null;
      if ((changePct == null || isNaN(changePct)) && price != null && prevClose) {
        changePct = +((price - prevClose) / prevClose * 100).toFixed(2);
      }
      var quote = qt ? {
        open: +qt[5], prevClose: +qt[4], high: +qt[33], low: +qt[34],
        volume: +qt[36], amount: +qt[37], turnover: +qt[38], pe: +qt[39],
        amplitude: +qt[43], floatCap: +qt[44], totalCap: +qt[45], pb: +qt[46],
        limitUp: +qt[47], limitDown: +qt[48]
      } : null;

      var dayArr = kdStock ? (kdStock.qfqday || kdStock.day || []) : [];
      var kdata = dayArr.slice(-120).map(function (d) {
        return { date: d[0], open: +d[1], close: +d[2], high: +d[3], low: +d[4], volume: +d[5], amount: 0 };
      });
      // 增强引擎使用更长的样本（最多 250 根），以便 MA120 / 自适应回归导轨有足够窗口；
      // 图表仍沿用 120 根，保持既有视觉不变。
      var kdataFull = dayArr.slice(-250).map(function (d) {
        return { date: d[0], open: +d[1], close: +d[2], high: +d[3], low: +d[4], volume: +d[5], amount: 0 };
      });

      var m5d = m5.status === "fulfilled" ? m5.value : null;
      var m5Arr = m5d && m5d.data && m5d.data[tc] && m5d.data[tc].m5 ? m5d.data[tc].m5 : [];
      var kline5 = m5Arr.slice(-240).map(function (d) {
        var raw = String(d[0]);
        var date = raw.length >= 12 ? raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8) + " " + raw.slice(8, 10) + ":" + raw.slice(10, 12) : raw;
        return { date: date, open: +d[1], close: +d[2], high: +d[3], low: +d[4], volume: +d[5], amount: 0 };
      });

      var md = minute.status === "fulfilled" ? minute.value : null;
      var minArr = md && md.data && md.data[tc] && md.data[tc].data ? md.data[tc].data.data : [];
      var tdata = minArr.map(function (m) {
        var p = String(m).split(" ");
        var pr = +p[1], vol = +p[2], amt = +p[3];
        return { time: p[0].slice(0, 2) + ":" + p[0].slice(2), price: pr, avg: vol > 0 ? +(amt / (vol * 100)).toFixed(3) : pr, volume: vol };
      });

      if (kdata.length < 25) throw new Error("K 线数据不足，无法分析");

      var closes = kdata.map(function (k) { return k.close; });
      var vols = kdata.map(function (k) { return k.volume; });
      var last = closes[closes.length - 1];

      var ind = {
        ma5: ma(closes, 5), ma10: ma(closes, 10), ma20: ma(closes, 20), ma60: ma(closes, 60),
        boll: null, macd: calcMacd(closes), rsi: calcRsi(closes),
        vol5: ma(vols, 5), vol20: ma(vols, 20)
      };
      var bollArr = closes.slice(-20);
      if (bollArr.length >= 20) {
        var bm = bollArr.reduce(function (a, b) { return a + b; }, 0) / 20;
        var bsd = std(bollArr);
        ind.boll = { up: bm + 2 * bsd, mid: bm, low: bm - 2 * bsd };
      }

      var donchian = calcDonchian(kdata, 20);
      var regression = calcRegression(closes, 20);
      var supportResistance = calcSupportResistance(kdata, ind, last);
      var tradingPlan = buildTradingPlan(last, supportResistance);

      var monitorItems = buildMonitorItems(ind, quote, last, closes);
      var monGood = monitorItems.filter(function (m) { return m.status.indexOf("利好") === 0; }).length;
      var monBad = monitorItems.filter(function (m) { return m.status.indexOf("利空") === 0; }).length;
      var monNeutral = monitorItems.length - monGood - monBad;
      var monitorSummary = {
        total: monitorItems.length, good: monGood, bad: monBad, neutral: monNeutral,
        verdict: monGood > monBad ? "偏多" : monBad > monGood ? "偏空" : "多空交织"
      };

      var technical = technicalScore(closes, ind, last);
      var strategy = strategyScore(closes, vols, ind, last);
      var confidence = confidenceScore(technical, strategy);
      var total = clamp((technical.score + strategy.score) / 2, 0, 100);
      var score = {
        total: total, technical: technical.score, strategy: strategy.score, confidence: confidence.score,
        reasons: { technical: technical.reasons, strategy: strategy.reasons, confidence: confidence.reasons }
      };

      var signals = generateSignals(closes, vols, ind, last, quote, donchian, regression);
      var report = buildReport(name, code, price != null ? price.toFixed(2) : "—", changePct != null ? changePct.toFixed(2) : "0.00", score, ind, signals);

      // StockSentry 智能盯盘与投研引擎（轨道研判 / 动作判定 / 风控 / 报告 / 画像 / 规则明细）
      // 引擎为独立计算的增强层，任何异常都不影响原有的行情与指标结果返回。
      var enhanced = null;
      try {
        enhanced = SENTRY.analyze({
          code: code, name: name, market: String(tc).slice(0, 2),
          price: price, changePct: changePct, quote: quote,
          kline: kdataFull.length >= 12 ? kdataFull : kdata,
          chartBars: kdata.length
        });
      } catch (err) {
        enhanced = { error: "增强引擎计算失败：" + (err && err.message ? err.message : String(err)) };
      }

      return {
        name: name, code: code, price: price, changePct: changePct, prevClose: prevClose,
        quote: quote, kline: kdata, kline5: kline5, trends: tdata,
        indicators: ind, donchian: donchian, regression: regression,
        supportResistance: supportResistance, tradingPlan: tradingPlan,
        monitorItems: monitorItems, monitorSummary: monitorSummary,
        score: score, signals: signals, report: report,
        enh: enhanced
      };
    });
  }

  /* ==================================================================
   * StockSentry 智能盯盘与投研引擎（纯前端移植版）
   * --------------------------------------------------------------
   * 移植自开源项目 StockSentry：lib/tech.js · lib/rules.js · lib/engine.js
   *   lib/monitors.js · lib/portrait.js · lib/report.js
   * 已剥离全部 Node-only 依赖（fs / https / zlib / child_process / process.env），
   * 全部计算在浏览器内完成；数据源仍复用本文件的腾讯行情直连，不新增任何后端接口。
   * 新增能力：九类轨道综合研判 / 七档动作判定 / 硬性风控覆盖 + 盈亏比修正 /
   *           8 章投研报告（HTML + Markdown 双格式）/ 个股画像 / 规则引擎明细。
   * ================================================================== */
  var SENTRY = (function () {
    'use strict';

    /* ---------------- 通用工具 ---------------- */
    function assign(t) {
      for (var i = 1; i < arguments.length; i++) {
        var s = arguments[i];
        if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k];
      }
      return t;
    }
    function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
    function isNum(x) { return typeof x === 'number' && isFinite(x); }
    function r2(x) { return isNum(x) ? +x.toFixed(2) : null; }
    function r3(x) { return isNum(x) ? +x.toFixed(3) : null; }
    function n2(v) { return (v == null || !isFinite(Number(v))) ? '—' : Number(v).toFixed(2); }
    function p1(v) { return (v == null || !isFinite(Number(v))) ? '—' : Number(v).toFixed(1); }
    function pctStr(v) { return (v == null || !isFinite(Number(v))) ? '—' : (v > 0 ? '+' : '') + Number(v).toFixed(2) + '%'; }
    function lastOf(a) { return (a && a.length) ? a[a.length - 1] : null; }
    function avg(a) { if (!a || !a.length) return null; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }

    /* ---------------- 技术指标序列 ---------------- */
    function smaSeries(arr, n) {
      var out = new Array(arr.length), sum = 0;
      for (var i = 0; i < arr.length; i++) {
        sum += arr[i];
        if (i >= n) sum -= arr[i - n];
        out[i] = i >= n - 1 ? sum / n : null;
      }
      return out;
    }
    function emaSeries(arr, n) {
      var out = new Array(arr.length), k = 2 / (n + 1), prev = null;
      for (var i = 0; i < arr.length; i++) { prev = prev == null ? arr[i] : arr[i] * k + prev * (1 - k); out[i] = prev; }
      return out;
    }
    function macdSeries(closes) {
      var ef = emaSeries(closes, 12), es = emaSeries(closes, 26), dif = [], i;
      for (i = 0; i < closes.length; i++) dif.push(ef[i] - es[i]);
      var dea = emaSeries(dif, 9), hist = [];
      for (i = 0; i < dif.length; i++) hist.push((dif[i] - dea[i]) * 2);
      return { dif: dif, dea: dea, hist: hist };
    }
    /** RSI(14) Wilder 平滑 */
    function rsiSeries(closes, n) {
      n = n || 14;
      var out = new Array(closes.length), gain = 0, loss = 0, i;
      for (i = 0; i < closes.length; i++) out[i] = null;
      for (i = 1; i < closes.length; i++) {
        var d = closes[i] - closes[i - 1];
        var g = Math.max(d, 0), l = Math.max(-d, 0);
        if (i <= n) {
          gain += g / n; loss += l / n;
          if (i === n) out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
        } else {
          gain = (gain * (n - 1) + g) / n;
          loss = (loss * (n - 1) + l) / n;
          out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
        }
      }
      return out;
    }
    /** KDJ(9,3,3) */
    function kdjSeries(highs, lows, closes, n) {
      n = n || 9;
      var K = [], D = [], J = [], k = 50, d = 50, i;
      for (i = 0; i < closes.length; i++) {
        if (i < n - 1) { K.push(null); D.push(null); J.push(null); continue; }
        var hh = -Infinity, ll = Infinity;
        for (var j = i - n + 1; j <= i; j++) { if (highs[j] > hh) hh = highs[j]; if (lows[j] < ll) ll = lows[j]; }
        var rsv = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
        k = (2 / 3) * k + (1 / 3) * rsv;
        d = (2 / 3) * d + (1 / 3) * k;
        K.push(k); D.push(d); J.push(3 * k - 2 * d);
      }
      return { k: K, d: D, j: J };
    }
    /** BOLL(20,2) */
    function bollSeries(closes, n, kk) {
      n = n || 20; kk = kk == null ? 2 : kk;
      var mid = smaSeries(closes, n), up = [], dn = [], i;
      for (i = 0; i < closes.length; i++) {
        if (mid[i] == null) { up.push(null); dn.push(null); continue; }
        var s = 0;
        for (var j = i - n + 1; j <= i; j++) s += (closes[j] - mid[i]) * (closes[j] - mid[i]);
        var sd = Math.sqrt(s / n);
        up.push(mid[i] + kk * sd); dn.push(mid[i] - kk * sd);
      }
      return { mid: mid, up: up, dn: dn };
    }
    /** ATR(14) */
    function atrSeries(highs, lows, closes, n) {
      n = n || 14;
      var tr = [null], i;
      for (i = 1; i < closes.length; i++) {
        tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
      }
      var out = new Array(closes.length), prev = null;
      for (i = 0; i < out.length; i++) out[i] = null;
      for (i = 1; i < tr.length; i++) {
        if (i < n) { var s = 0; for (var j = 1; j <= i; j++) s += tr[j]; prev = s / i; }
        else prev = (prev * (n - 1) + tr[i]) / n;
        out[i] = prev;
      }
      return out;
    }

    /** 摆动高低点（支撑 / 阻力位来源） */
    function pivots(kline, span, lookback) {
      span = span || 5; lookback = lookback || 120;
      var ks = kline.slice(-lookback), highs = [], lows = [];
      for (var i = span; i < ks.length - span; i++) {
        var w = ks.slice(i - span, i + span + 1), isHi = true, isLo = true;
        for (var j = 0; j < w.length; j++) { if (w[j].high > ks[i].high) isHi = false; if (w[j].low < ks[i].low) isLo = false; }
        if (isHi) highs.push(ks[i].high);
        if (isLo) lows.push(ks[i].low);
      }
      return { highs: highs, lows: lows };
    }

    /** 关键价位聚类：按 1.5% 容差合并，按重要性排序 */
    function keyLevels(kline, price) {
      var pv = pivots(kline), all = [];
      pv.highs.forEach(function (v) { all.push({ v: v, t: 'R' }); });
      pv.lows.forEach(function (v) { all.push({ v: v, t: 'S' }); });
      var clusters = [];
      all.sort(function (a, b) { return a.v - b.v; }).forEach(function (p) {
        var c = null;
        for (var i = 0; i < clusters.length; i++) { if (Math.abs(clusters[i].v - p.v) / p.v < 0.015) { c = clusters[i]; break; } }
        if (c) { c.n++; c.v = (c.v * (c.n - 1) + p.v) / c.n; }
        else clusters.push({ v: p.v, n: 1, t: p.t });
      });
      return clusters.filter(function (c) { return c.n >= 2; }).map(function (c) {
        return {
          price: +c.v.toFixed(2), count: c.n,
          side: c.v >= price ? 'resistance' : 'support',
          dist: +(((c.v - price) / price) * 100).toFixed(2)
        };
      }).sort(function (a, b) { return b.count - a.count; });
    }

    /** 线性回归导轨通道：对近 N 根收盘价最小二乘拟合，上下轨 = 回归值 ± k×残差标准差 */
    function fitChannel(kline, k, n) {
      var seg = kline.slice(-Math.min(n, kline.length)), N = seg.length;
      if (N < 12) return null;
      var ys = seg.map(function (x) { return x.close; });
      var xbar = (N - 1) / 2, ybar = avg(ys), sxy = 0, sxx = 0, i;
      for (i = 0; i < N; i++) { sxy += (i - xbar) * (ys[i] - ybar); sxx += (i - xbar) * (i - xbar); }
      var slope = sxx === 0 ? 0 : sxy / sxx;
      var intercept = ybar - slope * xbar;
      var fit = ys.map(function (_, j) { return intercept + slope * j; });
      var ssr = 0;
      for (i = 0; i < N; i++) { var rr = ys[i] - fit[i]; ssr += rr * rr; }
      var ss = Math.sqrt(ssr / Math.max(1, N - 2));

      var mid = [], up = [], dn = [];
      for (i = 0; i < N; i++) { mid.push(fit[i]); up.push(fit[i] + k * ss); dn.push(fit[i] - k * ss); }

      var iL = N - 1, P = ys[iL], width = up[iL] - dn[iL];
      var pctChan = width > 0 ? (P - dn[iL]) / width : 0.5;
      var slope20Pct = (slope * 20 / P) * 100;
      var dir = slope20Pct > 1.5 ? 'up' : slope20Pct < -1.5 ? 'down' : 'flat';

      function near(which, tol) {
        tol = tol || 0.18;
        var c = 0;
        for (var m = Math.max(0, N - 10); m < N; m++) {
          var w = up[m] - dn[m];
          if (w > 0) {
            var pos = (ys[m] - dn[m]) / w;
            if (which === 'up' && pos > 1 - tol) c++;
            if (which === 'dn' && pos < tol) c++;
          }
        }
        return c;
      }

      return {
        k: k, slope: +slope.toFixed(4), slope20Pct: +slope20Pct.toFixed(2), dir: dir,
        std: +ss.toFixed(3), width: +width.toFixed(2),
        widthPct: +((width / P) * 100).toFixed(2),
        mid: +mid[iL].toFixed(2), up: +up[iL].toFixed(2), dn: +dn[iL].toFixed(2),
        pctChan: +Math.max(-0.6, Math.min(1.6, pctChan)).toFixed(3),
        nearUpper: near('up'), nearLower: near('dn'),
        bars: N, reliable: true,
        series: { mid: mid, up: up, dn: dn, dates: seg.map(function (x) { return x.date; }) }
      };
    }

    /** 回归导轨通道 · 自适应窗口：优先 60 根(k=2)，通道过宽则依次缩短窗口 / 收窄倍数 */
    function regressionChannel(kline) {
      var candidates = [
        { n: 60, k: 2.0 }, { n: 45, k: 1.8 }, { n: 30, k: 1.6 }, { n: 20, k: 1.5 }
      ];
      var out = null;
      for (var i = 0; i < candidates.length; i++) {
        out = fitChannel(kline, candidates[i].k, candidates[i].n);
        if (out && out.widthPct <= 30) { out.reliable = true; return out; }
      }
      if (out) out.reliable = false;
      return out;
    }

    /** 布林带状态：带宽分位、%B、收口 / 开口 */
    function bollState(closes, up, mid, dn, price) {
      var iL = closes.length - 1;
      var width = up[iL] - dn[iL];
      var bandwidth = mid[iL] ? width / mid[iL] : null;
      var pctB = width > 0 ? (price - dn[iL]) / width : 0.5;
      var hist = [];
      for (var i = Math.max(0, closes.length - 120); i < closes.length; i++) {
        if (up[i] != null && mid[i]) hist.push((up[i] - dn[i]) / mid[i]);
      }
      var below = 0;
      for (var j = 0; j < hist.length; j++) if (hist[j] < bandwidth) below++;
      var bandwidthPctile = hist.length ? +((below / hist.length) * 100).toFixed(0) : null;
      var state = bandwidthPctile == null ? 'normal'
        : bandwidthPctile <= 20 ? 'squeeze' : bandwidthPctile >= 80 ? 'expand' : 'normal';
      return {
        bandwidth: bandwidth != null ? +bandwidth.toFixed(4) : null,
        bandwidthPct: bandwidth != null ? +(bandwidth * 100).toFixed(2) : null,
        bandwidthPctile: bandwidthPctile, pctB: +pctB.toFixed(3), state: state,
        stateLabel: state === 'squeeze' ? '收口（变盘临近）' : state === 'expand' ? '开口（趋势加速）' : '常态',
        series: { up: up, mid: mid, dn: dn }
      };
    }

    /** 唐奇安通道（区间导轨，近 n 日高低，不含当日） */
    function donchianChannel(kline, n) {
      n = n || 20;
      var seg = kline.slice(-(n + 1), -1);
      if (seg.length < 5) return null;
      var upper = -Infinity, lower = Infinity;
      for (var i = 0; i < seg.length; i++) { if (seg[i].high > upper) upper = seg[i].high; if (seg[i].low < lower) lower = seg[i].low; }
      var P = kline[kline.length - 1].close, w = upper - lower;
      return {
        upper: +upper.toFixed(2), lower: +lower.toFixed(2), mid: +((upper + lower) / 2).toFixed(2),
        pct: w > 0 ? +(((P - lower) / w) * 100).toFixed(1) : 50, window: seg.length
      };
    }

    /** 轨道综合研判：把布林上下轨位置与导轨方向组合成可执行的区间判断（九类轨道） */
    function channelVerdict(ind) {
      var P = ind.price, bi = ind.bollInfo, ra = ind.rails, dc = ind.donchian;
      var pos = bi ? bi.pctB : 0.5;
      var bollPos, bollLabel;
      if (pos >= 1) { bollPos = 'above_upper'; bollLabel = '上轨之上（超买区）'; }
      else if (pos >= 0.8) { bollPos = 'upper'; bollLabel = '上轨附近（强势区）'; }
      else if (pos > 0.5) { bollPos = 'mid_up'; bollLabel = '中轨上方（偏强区）'; }
      else if (pos > 0.2) { bollPos = 'mid_dn'; bollLabel = '中轨下方（偏弱区）'; }
      else if (pos > 0) { bollPos = 'lower'; bollLabel = '下轨附近（弱势区）'; }
      else { bollPos = 'below_lower'; bollLabel = '下轨之下（超跌区）'; }

      var rp = ra ? ra.pctChan : 0.5;
      var railPosLabel = rp > 1 ? '上轨之外' : rp >= 0.75 ? '通道上沿' : rp >= 0.45 ? '通道中上部'
        : rp >= 0.2 ? '通道中下部' : rp >= 0 ? '通道下沿' : '下轨之外';
      var railDirLabel = ra ? (ra.dir === 'up' ? '上升导轨' : ra.dir === 'down' ? '下降导轨' : '水平导轨（箱体）') : '—';

      var zone, color, advice;
      if (!ra || !ra.reliable) {
        zone = '导轨有效性不足';
        color = '#7a828f';
        advice = '当前波动结构分散，回归通道宽度过大、参考意义有限，建议以布林带与唐奇安区间为主进行区间判断。';
      } else if (ra.dir === 'up' && rp < 0.45) {
        zone = '上升导轨 · 回调低吸区';
        color = '#d0342c';
        advice = '上升导轨未破坏，价格回落至' + railPosLabel + '，属通道内低吸区间；止损参考导轨下轨 ' + ra.dn + '，目标看向导轨上轨 ' + ra.up + '。';
      } else if (ra.dir === 'up' && rp >= 0.75) {
        zone = '上升导轨 · 上沿持有区';
        color = '#e0803a';
        advice = '价格贴近导轨上沿运行，趋势强但短期赔率下降；宜持有并上移止盈，不宜在此位置追加仓位。';
      } else if (ra.dir === 'down' && rp <= 0.2) {
        zone = '下降导轨 · 下沿回避区';
        color = '#1b5e20';
        advice = '处于下降导轨下沿（现 ' + P + '，下轨 ' + ra.dn + '），属下跌通道末端但趋势未反转，不宜盲目抄底；需先看到中轨 ' + ra.mid + ' 被收复。';
      } else if (ra.dir === 'down' && rp >= 0.75) {
        zone = '下降导轨 · 上沿减仓区';
        color = '#12855a';
        advice = '价格反抽至下降导轨上沿（上轨 ' + ra.up + '），是通道内减仓窗口而非突破买点，除非放量收于上轨之上。';
      } else if (ra.dir === 'flat' && rp <= 0.25) {
        zone = '水平导轨 · 箱底承接区';
        color = '#d0342c';
        advice = '箱体震荡（' + ra.dn + ' ~ ' + ra.up + '）且价格位于箱底，适合区间低吸，止损设于箱底下方，目标为箱顶。';
      } else if (ra.dir === 'flat' && rp >= 0.75) {
        zone = '水平导轨 · 箱顶减持区';
        color = '#12855a';
        advice = '箱体震荡且价格位于箱顶，冲高动能有限，适合区间减持，回落到箱底再考虑接回。';
      } else {
        zone = railDirLabel + ' · 通道中部观望区';
        color = '#b4740a';
        advice = '价格位于' + railPosLabel + '，方向未选择；建议等待触及通道上沿（' + (ra ? ra.up : '—') + '）或下沿（' + (ra ? ra.dn : '—') + '）再行动，中部不追不杀。';
      }

      return {
        bollPos: bollPos, bollLabel: bollLabel, railDirLabel: railDirLabel, railPosLabel: railPosLabel,
        zone: zone, color: color, advice: advice,
        squeeze: !!(bi && bi.state === 'squeeze'), reliable: !!(ra && ra.reliable),
        boll: { up: ind.boll.up, mid: ind.boll.mid, dn: ind.boll.dn },
        rail: ra ? { up: ra.up, mid: ra.mid, dn: ra.dn, dir: ra.dir, bars: ra.bars, k: ra.k } : null,
        donchian: dc
      };
    }

    /** 主入口：一次性算出全部指标（对齐 StockSentry computeIndicators） */
    function buildIndicators(kline, quote, market) {
      var closes = kline.map(function (k) { return k.close; });
      var highs = kline.map(function (k) { return k.high; });
      var lows = kline.map(function (k) { return k.low; });
      var vols = kline.map(function (k) { return k.volume; });
      var price = (quote && isNum(quote.price)) ? quote.price : lastOf(closes);
      var n = closes.length, iL = n - 1;

      var ma = {};
      [5, 10, 20, 30, 60, 120].forEach(function (m) { ma['ma' + m] = r2(lastOf(smaSeries(closes, m))); });

      var m = macdSeries(closes), rrs = rsiSeries(closes, 14), kd = kdjSeries(highs, lows, closes, 9);
      var b = bollSeries(closes, 20, 2), a = atrSeries(highs, lows, closes, 14);

      var prevVol5 = vols.slice(Math.max(0, n - 6), n - 1);
      var prevVol20 = vols.slice(Math.max(0, n - 21), n - 1);
      var avgVol5 = avg(prevVol5), avgVol20 = avg(prevVol20);

      var high52 = Math.max.apply(null, kline.map(function (x) { return x.high; }));
      var low52 = Math.min.apply(null, kline.map(function (x) { return x.low; }));
      var high20 = Math.max.apply(null, kline.slice(-21, -1).map(function (x) { return x.high; }));
      var low20 = Math.min.apply(null, kline.slice(-21, -1).map(function (x) { return x.low; }));

      var atrVal = lastOf(a);
      function ret(back) { return n > back ? +(((price - closes[n - 1 - back]) / closes[n - 1 - back]) * 100).toFixed(2) : null; }
      var maArrangement = (function () {
        var v = [ma.ma5, ma.ma10, ma.ma20, ma.ma60];
        for (var i = 0; i < v.length; i++) if (v[i] == null) return 'unknown';
        if (v[0] > v[1] && v[1] > v[2] && v[2] > v[3]) return 'bull';
        if (v[0] < v[1] && v[1] < v[2] && v[2] < v[3]) return 'bear';
        return 'mixed';
      })();

      var out = {
        market: market || null,
        price: r2(price, 2),
        ma: ma,
        macd: { dif: r3(lastOf(m.dif)), dea: r3(lastOf(m.dea)), hist: r3(lastOf(m.hist)), prevHist: r3(m.hist[m.hist.length - 2]) },
        macdSeries: m,
        rsi: r2(lastOf(rrs), 2), rsiPrev: r2(rrs[rrs.length - 2], 2),
        kdj: { k: r2(lastOf(kd.k), 2), d: r2(lastOf(kd.d), 2), j: r2(lastOf(kd.j), 2), prevK: r2(kd.k[kd.k.length - 2], 2), prevD: r2(kd.d[kd.d.length - 2], 2) },
        boll: { up: r2(lastOf(b.up), 2), mid: r2(lastOf(b.mid), 2), dn: r2(lastOf(b.dn), 2), series: b },
        atr: r3(atrVal), atrPct: isNum(atrVal) && price ? +((atrVal / price) * 100).toFixed(2) : null,
        avgVol5: avgVol5 ? Math.round(avgVol5) : null,
        avgVol20: avgVol20 ? Math.round(avgVol20) : null,
        volRatioLocal: avgVol5 ? +((lastOf(vols) / avgVol5)).toFixed(2) : null,
        position52: (high52 - low52) > 0 ? +(((price - low52) / (high52 - low52)) * 100).toFixed(1) : null,
        drawdownFromHigh: high52 > 0 ? +(((price - high52) / high52) * 100).toFixed(2) : null,
        high52: r2(high52), low52: r2(low52),
        high20: r2(high20), low20: r2(low20),
        returns: { d1: ret(1), d5: ret(5), d20: ret(20), d60: ret(60) },
        maArrangement: maArrangement,
        series: { closes: closes, volumes: vols, dates: kline.map(function (x) { return x.date; }) },
        barCount: n
      };
      out.bollInfo = bollState(closes, b.up, b.mid, b.dn, price);
      out.rails = regressionChannel(kline);
      out.donchian = donchianChannel(kline, 20);
      out.keyLevels = keyLevels(kline, price);
      out.channelVerdict = channelVerdict(out);
      return out;
    }

    /* ================================================================
     * 规则引擎：technicalRules / channelRules / profileRules / scoreSignals
     * ================================================================ */
    function technicalRules(ctx) {
      var ind = ctx.ind, quote = ctx.quote, flow = ctx.flow, s = [];
      var P = ind.price;
      function push(o) { o.origin = 'technical'; s.push(o); }

      /* 1. 均线趋势排列 */
      var arr = ind.maArrangement;
      if (arr === 'bull') {
        push({ id: 'ma-bull', dim: '趋势结构', name: '均线多头排列', side: 'bull', strength: 5, weight: 10, text: 'MA5>MA10>MA20>MA60 多头排列，中期趋势向上', evidence: 'MA5 ' + ind.ma.ma5 + ' / MA10 ' + ind.ma.ma10 + ' / MA20 ' + ind.ma.ma20 + ' / MA60 ' + ind.ma.ma60 });
      } else if (arr === 'bear') {
        push({ id: 'ma-bear', dim: '趋势结构', name: '均线空头排列', side: 'bear', strength: 5, weight: 10, text: 'MA5<MA10<MA20<MA60 空头排列，中期趋势向下', evidence: 'MA5 ' + ind.ma.ma5 + ' / MA10 ' + ind.ma.ma10 + ' / MA20 ' + ind.ma.ma20 + ' / MA60 ' + ind.ma.ma60 });
      } else {
        push({ id: 'ma-mixed', dim: '趋势结构', name: '均线纠缠', side: 'neutral', strength: 2, weight: 6, text: '均线交错，趋势方向不明，处于震荡整理阶段', evidence: 'MA5 ' + ind.ma.ma5 + ' / MA20 ' + ind.ma.ma20 + ' / MA60 ' + ind.ma.ma60 });
      }

      /* 2. 价格相对 MA20 / MA60 */
      if (ind.ma.ma20 != null) {
        var d20 = ((P - ind.ma.ma20) / ind.ma.ma20) * 100;
        push({
          id: 'px-ma20', dim: '趋势结构', name: d20 >= 0 ? '站上20日线' : '跌破20日线',
          side: d20 >= 0 ? 'bull' : 'bear', strength: clamp(Math.round(Math.abs(d20) / 2) + 2, 2, 4), weight: 8,
          text: d20 >= 0 ? '价格位于20日均线上方，中期成本支撑有效' : '价格位于20日均线下方，中期成本压制',
          evidence: '现价 ' + P + ' vs MA20 ' + ind.ma.ma20 + '（偏离 ' + d20.toFixed(2) + '%）'
        });
      }
      if (ind.ma.ma60 != null) {
        var d60 = ((P - ind.ma.ma60) / ind.ma.ma60) * 100;
        push({
          id: 'px-ma60', dim: '趋势结构', name: d60 >= 0 ? '位于季线上方' : '位于季线下方',
          side: d60 >= 0 ? 'bull' : 'bear', strength: clamp(Math.round(Math.abs(d60) / 4) + 1, 1, 3), weight: 6,
          text: d60 >= 0 ? '季线之上，长线资金成本占优' : '季线之下，长线趋势偏弱',
          evidence: '现价 ' + P + ' vs MA60 ' + ind.ma.ma60 + '（偏离 ' + d60.toFixed(2) + '%）'
        });
      }

      /* 3. MACD */
      var md = ind.macd;
      if (md.dif != null && md.dea != null) {
        var golden = md.dif > md.dea;
        var crossUp = md.dif > md.dea && md.hist > 0 && md.prevHist <= 0;
        var crossDn = md.dif < md.dea && md.hist < 0 && md.prevHist >= 0;
        if (crossUp) push({ id: 'macd-gold', dim: '动量指标', name: 'MACD金叉', side: 'bull', strength: 4, weight: 9, text: 'MACD 于零轴附近金叉，动量由弱转强', evidence: 'DIF ' + md.dif + ' 上穿 DEA ' + md.dea + '，柱 ' + md.hist });
        else if (crossDn) push({ id: 'macd-dead', dim: '动量指标', name: 'MACD死叉', side: 'bear', strength: 4, weight: 9, text: 'MACD 死叉，动量转弱', evidence: 'DIF ' + md.dif + ' 下穿 DEA ' + md.dea + '，柱 ' + md.hist });
        else push({
          id: 'macd-state', dim: '动量指标', name: golden ? 'MACD多头区' : 'MACD空头区',
          side: golden ? 'bull' : 'bear', strength: md.dif > 0 && md.dea > 0 ? 4 : 2, weight: 8,
          text: golden
            ? (md.dif > 0 ? 'MACD 零轴上方多头区，趋势动能健康' : 'MACD 零轴下方金叉后修复，动能边际改善')
            : (md.dif < 0 ? 'MACD 零轴下方空头区，动能疲弱' : 'MACD 高位死叉，动能衰竭'),
          evidence: 'DIF ' + md.dif + ' / DEA ' + md.dea + ' / 柱 ' + md.hist
        });
      }

      /* 4. RSI */
      if (ind.rsi != null) {
        if (ind.rsi >= 75) push({ id: 'rsi-ob', dim: '超买超卖', name: 'RSI超买', side: 'bear', strength: 3, weight: 6, text: 'RSI 进入超买区，短线追高风险上升', evidence: 'RSI(14)=' + ind.rsi });
        else if (ind.rsi <= 28) push({ id: 'rsi-os', dim: '超买超卖', name: 'RSI超卖', side: 'bull', strength: 3, weight: 6, text: 'RSI 进入超卖区，存在超跌反弹动能', evidence: 'RSI(14)=' + ind.rsi });
        else if (ind.rsi >= 55) push({ id: 'rsi-strong', dim: '超买超卖', name: 'RSI偏强', side: 'bull', strength: 2, weight: 5, text: 'RSI 位于强势区，多方掌握主动', evidence: 'RSI(14)=' + ind.rsi });
        else if (ind.rsi <= 45) push({ id: 'rsi-weak', dim: '超买超卖', name: 'RSI偏弱', side: 'bear', strength: 2, weight: 5, text: 'RSI 位于弱势区，多方动能不足', evidence: 'RSI(14)=' + ind.rsi });
      }

      /* 5. KDJ */
      var kk = ind.kdj;
      if (kk.k != null && kk.d != null) {
        var kUp = kk.prevK != null && kk.prevK <= kk.prevD && kk.k > kk.d;
        var kDn = kk.prevK != null && kk.prevK >= kk.prevD && kk.k < kk.d;
        if (kUp) push({ id: 'kdj-gold', dim: '动量指标', name: 'KDJ金叉', side: 'bull', strength: 3, weight: 5, text: 'KDJ 低位金叉，短线有反抽要求', evidence: 'K ' + kk.k + ' 上穿 D ' + kk.d + '，J=' + kk.j });
        else if (kDn) push({ id: 'kdj-dead', dim: '动量指标', name: 'KDJ死叉', side: 'bear', strength: 3, weight: 5, text: 'KDJ 死叉，短线调整压力', evidence: 'K ' + kk.k + ' 下穿 D ' + kk.d + '，J=' + kk.j });
        if (kk.j != null && kk.j > 100) push({ id: 'kdj-j-high', dim: '超买超卖', name: 'J值极值', side: 'bear', strength: 2, weight: 4, text: 'J 值超过 100，短线过热', evidence: 'J=' + kk.j });
        if (kk.j != null && kk.j < 0) push({ id: 'kdj-j-low', dim: '超买超卖', name: 'J值归零', side: 'bull', strength: 2, weight: 4, text: 'J 值低于 0，短线严重超跌', evidence: 'J=' + kk.j });
      }

      /* 6. 量价关系 */
      var vr = quote.volumeRatio != null ? quote.volumeRatio : ind.volRatioLocal;
      var chg = quote.changePct != null ? quote.changePct : 0;
      if (vr != null && isNum(vr)) {
        if (vr >= 1.8 && chg > 1) push({ id: 'vol-up', dim: '量价关系', name: '放量上涨', side: 'bull', strength: 4, weight: 8, text: '成交量显著放大且价格上行，资金主动进场', evidence: '量比 ' + vr + '，涨幅 ' + pctStr(chg) });
        else if (vr >= 1.8 && chg < -1) push({ id: 'vol-dn', dim: '量价关系', name: '放量下跌', side: 'bear', strength: 5, weight: 9, text: '放量下跌，抛压沉重，警惕资金出逃', evidence: '量比 ' + vr + '，跌幅 ' + pctStr(chg) });
        else if (vr <= 0.7 && chg > 0) push({ id: 'vol-shrink-up', dim: '量价关系', name: '缩量上涨', side: 'neutral', strength: 2, weight: 5, text: '缩量上涨，上攻动能不足，需警惕无量反弹', evidence: '量比 ' + vr + '，涨幅 ' + pctStr(chg) });
        else if (vr <= 0.7 && chg < 0) push({ id: 'vol-shrink-dn', dim: '量价关系', name: '缩量下跌', side: 'neutral', strength: 2, weight: 4, text: '缩量下跌，抛压有限，多为存量博弈', evidence: '量比 ' + vr + '，跌幅 ' + pctStr(chg) });
        else push({ id: 'vol-normal', dim: '量价关系', name: '量能平稳', side: 'neutral', strength: 1, weight: 3, text: '成交活跃度平稳，无明显资金异动', evidence: '量比 ' + vr });
      }

      /* 7. 突破 / 破位 */
      if (ind.high20 != null && P > ind.high20) push({ id: 'break-high', dim: '关键突破', name: '突破20日新高', side: 'bull', strength: 4, weight: 9, text: '向上突破近20个交易日高点，打开上行空间', evidence: '现价 ' + P + ' > 20日高点 ' + ind.high20 });
      if (ind.low20 != null && P < ind.low20) push({ id: 'break-low', dim: '关键突破', name: '跌破20日新低', side: 'bear', strength: 4, weight: 9, text: '向下跌破近20个交易日低点，技术形态走坏', evidence: '现价 ' + P + ' < 20日低点 ' + ind.low20 });

      /* 8. 区间位置 */
      if (ind.position52 != null) {
        if (ind.position52 <= 15) push({ id: 'pos-low', dim: '价格位置', name: '接近区间低位', side: 'bull', strength: 3, weight: 7, text: '处于统计区间底部，向下空间相对有限', evidence: '位置分位 ' + ind.position52 + '%（' + ind.low52 + '~' + ind.high52 + '）' });
        else if (ind.position52 >= 85) push({ id: 'pos-high', dim: '价格位置', name: '接近区间高位', side: 'bear', strength: 3, weight: 7, text: '处于统计区间高位，追高性价比下降', evidence: '位置分位 ' + ind.position52 + '%（' + ind.low52 + '~' + ind.high52 + '）' });
        else push({ id: 'pos-mid', dim: '价格位置', name: '区间中位', side: 'neutral', strength: 1, weight: 4, text: '处于区间中段，方向待选择', evidence: '位置分位 ' + ind.position52 + '%' });
      }

      /* 9. 资金流（若可用） */
      if (flow && flow.today) {
        var main = flow.today.main, amt = quote.amount, ratio = amt ? +((main / (amt * 10000)) * 100).toFixed(2) : null;
        if (main > 0) push({ id: 'flow-in', dim: '资金流向', name: '主力资金净流入', side: 'bull', strength: ratio != null && ratio > 5 ? 4 : 3, weight: 8, text: '当日主力资金净流入，承接盘积极', evidence: '净流入 ' + (main / 10000).toFixed(0) + '万元' + (ratio != null ? '（占成交额 ' + ratio + '%）' : '') });
        else if (main < 0) push({ id: 'flow-out', dim: '资金流向', name: '主力资金净流出', side: 'bear', strength: ratio != null && ratio < -5 ? 4 : 3, weight: 8, text: '当日主力资金净流出，抛压占优', evidence: '净流出 ' + (Math.abs(main) / 10000).toFixed(0) + '万元' + (ratio != null ? '（占成交额 ' + ratio + '%）' : '') });
      }

      /* 10. 近期涨跌幅 */
      var r5 = ind.returns.d5, r20 = ind.returns.d20;
      if (r5 != null && r5 <= -8) push({ id: 'drop5', dim: '短线异动', name: '5日急跌', side: 'bull', strength: 2, weight: 5, text: '5个交易日累计跌幅较大，短线存在修复需求', evidence: '5日 ' + pctStr(r5) + '（20日 ' + pctStr(r20) + '）' });
      if (r5 != null && r5 >= 15) push({ id: 'rise5', dim: '短线异动', name: '5日急涨', side: 'bear', strength: 2, weight: 5, text: '5个交易日累计涨幅较大，短线获利盘丰厚', evidence: '5日 ' + pctStr(r5) + '（20日 ' + pctStr(r20) + '）' });

      return s;
    }

    /* 上下轨线与导轨区间规则（九类轨道判读） */
    function channelRules(ctx) {
      var ind = ctx.ind, s = [], P = ind.price;
      function push(o) { o.origin = 'technical'; s.push(o); }
      var bi = ind.bollInfo, ra = ind.rails, dc = ind.donchian;

      /* 1. 布林带三条轨道 */
      if (bi && bi.series.up[ind.series.closes.length - 1] != null) {
        var B = { up: ind.boll.up, mid: ind.boll.mid, dn: ind.boll.dn };
        var pos = bi.pctB, slopeDown = ra && ra.dir === 'down';
        if (pos >= 1) {
          push({ id: 'band-above-up', dim: '上下轨线', name: '站上布林上轨', side: 'bull', strength: slopeDown ? 2 : 4, weight: 8, text: slopeDown ? '价格冲击布林上轨但导轨仍向下，属下跌通道中的反抽，持续性存疑' : '价格站上布林上轨，进入强势轨道（沿上轨运行）；但偏离均值过大，追高需等回踩中轨', evidence: '现价 ' + P + ' ／ 上轨 ' + B.up + ' ／ 中轨 ' + B.mid + '（%B=' + (pos * 100).toFixed(0) + '%）' });
          push({ id: 'band-overheat', dim: '上下轨线', name: '轨道过热提示', side: 'bear', strength: 2, weight: 6, text: '上轨之上属统计意义上的高波动区，短线获利盘与均值回归压力同步上升', evidence: '%B=' + (pos * 100).toFixed(0) + '%（>100% 表示已突破上轨）' });
        } else if (pos >= 0.8) {
          push({ id: 'band-near-up', dim: '上下轨线', name: '逼近布林上轨', side: 'bull', strength: 3, weight: 7, text: '价格逼近布林上轨，多头轨道保持完好，但上方空间收窄', evidence: '现价 ' + P + ' ／ 上轨 ' + B.up + '（%B=' + (pos * 100).toFixed(0) + '%）' });
        } else if (pos <= 0) {
          if (slopeDown) push({ id: 'band-below-dn-weak', dim: '上下轨线', name: '跌破布林下轨（弱势延续）', side: 'bear', strength: 5, weight: 9, text: '价格跌破布林下轨且回归导轨方向向下，属下跌通道中的加速段，不宜盲目抄底', evidence: '现价 ' + P + ' ／ 下轨 ' + B.dn + '｜导轨斜率 ' + ra.slope20Pct + '%/20日（' + ra.dir + '）' });
          else push({ id: 'band-below-dn-os', dim: '上下轨线', name: '跌破布林下轨（超跌）', side: 'bull', strength: 3, weight: 8, text: '价格跌破布林下轨但导轨未转弱，属统计意义上的超跌区，均值回归概率提升', evidence: '现价 ' + P + ' ／ 下轨 ' + B.dn + (ra ? '｜导轨斜率 ' + ra.slope20Pct + '%/20日（' + ra.dir + '）' : '') });
        } else if (pos <= 0.2) {
          push({ id: 'band-near-dn', dim: '上下轨线', name: '逼近布林下轨', side: 'bear', strength: 3, weight: 7, text: '价格逼近布林下轨，弱势轨道尚未修复，等待中轨收复再谈反转', evidence: '现价 ' + P + ' ／ 下轨 ' + B.dn + '（%B=' + (pos * 100).toFixed(0) + '%）' });
        } else {
          push({ id: 'band-mid', dim: '上下轨线', name: pos >= 0.5 ? '运行于中轨上方' : '运行于中轨下方', side: pos >= 0.5 ? 'bull' : 'bear', strength: 2, weight: 6, text: pos >= 0.5 ? '价格位于布林中轨之上，多头轨道内运行' : '价格位于布林中轨之下，空头轨道内运行', evidence: '%B=' + (pos * 100).toFixed(0) + '%｜下轨 ' + B.dn + ' ／ 中轨 ' + B.mid + ' ／ 上轨 ' + B.up });
        }

        /* 2. 带宽状态：收口 / 开口 */
        if (bi.state === 'squeeze') {
          push({ id: 'band-squeeze', dim: '上下轨线', name: '布林带收口', side: 'neutral', strength: 3, weight: 8, text: '布林带带宽处于近120日 ' + bi.bandwidthPctile + '% 分位（收口），波动被压缩至极致，往往预示变盘临近——方向未定前不宜重仓押注', evidence: '带宽 ' + bi.bandwidthPct + '%（历史分位 ' + bi.bandwidthPctile + '%）；参考：向上突破上轨 ' + ind.boll.up + ' / 向下跌破下轨 ' + ind.boll.dn });
        } else if (bi.state === 'expand') {
          var upMove = ind.returns.d5 != null ? ind.returns.d5 >= 0 : true;
          push({ id: 'band-expand', dim: '上下轨线', name: '布林带开口', side: upMove ? 'bull' : 'bear', strength: 3, weight: 7, text: upMove ? '布林带开口放大且价格上行，趋势进入加速段' : '布林带开口放大且价格走低，下跌动能释放', evidence: '带宽 ' + bi.bandwidthPct + '%（历史分位 ' + bi.bandwidthPctile + '%）｜5日涨跌 ' + (ind.returns.d5 == null ? '—' : ind.returns.d5) + '%' });
        }
      }

      /* 3. 回归导轨通道 */
      if (ra && !ra.reliable) {
        push({ id: 'rail-unreliable', dim: '导轨区间', name: '导轨宽度过大（参考性弱）', side: 'neutral', strength: 1, weight: 4, text: '近' + ra.bars + '日回归通道宽度达价格的 ' + ra.widthPct + '%，波动结构分散，导轨方向判定的置信度较低，建议以布林带与唐奇安区间为主', evidence: '通道 ' + ra.dn + ' ~ ' + ra.up + '（宽度 ' + ra.widthPct + '%，k=' + ra.k + '）' });
      } else if (ra) {
        if (ra.dir === 'up') push({ id: 'rail-dir-up', dim: '导轨区间', name: '上升导轨通道', side: 'bull', strength: 4, weight: 9, text: '近' + ra.bars + '日线性回归导轨方向向上（20日预计位移 ' + ra.slope20Pct + '%），价格运行于上升通道中，回踩下轨为低吸机会', evidence: '导轨 上轨 ' + ra.up + ' ／ 中轨 ' + ra.mid + ' ／ 下轨 ' + ra.dn + '；通道宽度 ' + ra.widthPct + '%' });
        else if (ra.dir === 'down') push({ id: 'rail-dir-down', dim: '导轨区间', name: '下降导轨通道', side: 'bear', strength: 4, weight: 9, text: '近' + ra.bars + '日线性回归导轨方向向下（20日预计位移 ' + ra.slope20Pct + '%），反弹至中轨/上轨即为减仓窗口', evidence: '导轨 上轨 ' + ra.up + ' ／ 中轨 ' + ra.mid + ' ／ 下轨 ' + ra.dn + '；通道宽度 ' + ra.widthPct + '%' });
        else push({ id: 'rail-flat', dim: '导轨区间', name: '水平导轨（箱体震荡）', side: 'neutral', strength: 2, weight: 7, text: '导轨近似水平，价格在箱体内往复，宜在箱底承接、箱顶减持，不宜追突破', evidence: '箱体 ' + ra.dn + ' ~ ' + ra.up + '（宽度 ' + ra.widthPct + '%），当前位置 ' + (ra.pctChan * 100).toFixed(0) + '%' });

        if (ra.pctChan > 1.0) push({ id: 'rail-breach-up', dim: '导轨区间', name: '突破导轨上轨', side: ra.dir === 'up' ? 'bull' : 'bear', strength: ra.dir === 'up' ? 3 : 4, weight: 8, text: ra.dir === 'up' ? '价格向上突破回归通道上轨，趋势强于统计常态' : '价格上破导轨上轨但通道向下，多属超买反抽，回归压力大', evidence: '现价 ' + P + ' ／ 导轨上轨 ' + ra.up + '（通道位置 ' + (ra.pctChan * 100).toFixed(0) + '%）' });
        else if (ra.pctChan < 0) push({ id: 'rail-breach-dn', dim: '导轨区间', name: '跌破导轨下轨', side: 'bear', strength: 4, weight: 8, text: '价格向下跌破回归通道下轨，波动超出统计常态，需警惕趋势破位', evidence: '现价 ' + P + ' ／ 导轨下轨 ' + ra.dn + '（通道位置 ' + (ra.pctChan * 100).toFixed(0) + '%）' });

        if (ra.nearUpper >= 6) push({ id: 'rail-hug-up', dim: '导轨区间', name: '沿导轨上轨运行', side: 'bull', strength: 3, weight: 7, text: '近10个交易日多数收盘价贴近通道上沿，属强势沿轨运行，可持有但须上移止盈', evidence: '近10日有 ' + ra.nearUpper + ' 日收盘位于通道上沿 18% 区间内' });
        if (ra.nearLower >= 6) push({ id: 'rail-hug-dn', dim: '导轨区间', name: '沿导轨下轨运行', side: 'bear', strength: 3, weight: 7, text: '近10个交易日多数收盘价贴近通道下沿，属弱势沿轨下跌，反弹力度有限', evidence: '近10日有 ' + ra.nearLower + ' 日收盘位于通道下沿 18% 区间内' });
      }

      /* 4. 唐奇安区间导轨 */
      if (dc) {
        if (P >= dc.upper) push({ id: 'dc-break-up', dim: '导轨区间', name: '突破20日区间上沿', side: 'bull', strength: 4, weight: 9, text: '收盘价突破近20个交易日唐奇安通道上沿，区间突破形态成立', evidence: '现价 ' + P + ' ≥ 区间上沿 ' + dc.upper + '（区间 ' + dc.lower + '~' + dc.upper + '）' });
        else if (P <= dc.lower) push({ id: 'dc-break-dn', dim: '导轨区间', name: '跌破20日区间下沿', side: 'bear', strength: 5, weight: 10, text: '收盘价跌破近20个交易日唐奇安通道下沿，区间破位，短线风险快速上升', evidence: '现价 ' + P + ' ≤ 区间下沿 ' + dc.lower + '（区间 ' + dc.lower + '~' + dc.upper + '）' });
        else push({ id: 'dc-pos', dim: '导轨区间', name: '区间内运行', side: 'neutral', strength: 2, weight: 5, text: '价格处于20日区间导轨的 ' + dc.pct + '% 位置，' + (dc.pct > 70 ? '靠近上沿，追高性价比低' : dc.pct < 30 ? '靠近下沿，具备区间低吸条件' : '位于区间中部，方向待选择'), evidence: '区间 ' + dc.lower + ' ~ ' + dc.upper + '（宽度 ' + (dc.upper - dc.lower).toFixed(2) + ' 元）' });
      }

      /* 5. 关键价位（枢轴聚类） */
      var kl = ind.keyLevels || [];
      if (kl.length) {
        var sup = kl.filter(function (k) { return k.side === 'support'; })[0];
        var res = kl.filter(function (k) { return k.side === 'resistance'; })[0];
        if (sup) push({ id: 'kl-support', dim: '关键价位', name: '下方关键支撑', side: 'bull', strength: 2, weight: 5, text: '枢轴聚类识别到下方支撑 ' + sup.price + ' 元（' + sup.count + ' 次触及），回踩不破可视为承接位', evidence: '支撑 ' + sup.price + '（距现价 ' + sup.dist + '%）' });
        if (res) push({ id: 'kl-resistance', dim: '关键价位', name: '上方关键阻力', side: 'bear', strength: 2, weight: 5, text: '枢轴聚类识别到上方阻力 ' + res.price + ' 元（' + res.count + ' 次触及），未有效突破前空间受限', evidence: '阻力 ' + res.price + '（距现价 +' + res.dist + '%）' });
      }

      return s;
    }

    /* 个股画像规则 */
    function profileRules(ctx) {
      var profile = ctx.profile, ind = ctx.ind, quote = ctx.quote, s = [];
      if (!profile) return s;
      function push(o) { o.origin = 'profile'; s.push(o); }
      var P = ind.price;
      /* 自动画像的价位由现价反推，不参与画像价位规则（避免「贴脸」假信号） */
      var L = profile.auto ? {} : (profile.levels || {});

      if (L.entry && L.entry.length === 2) {
        var lo = L.entry[0], hi = L.entry[1];
        if (P <= hi && P >= lo * 0.97) push({ id: 'pf-entry-zone', dim: '持仓策略', name: '进入建仓区间', side: 'bull', strength: 5, weight: 10, text: '现价落入报告给定的建仓区间 ' + lo + '-' + hi + ' 元，具备左侧布局条件', evidence: '现价 ' + P + '，建仓区间 ' + lo + '~' + hi + '（依据：' + profile.sourceDoc + '）' });
        else if (P < lo * 0.97) push({ id: 'pf-below-entry', dim: '持仓策略', name: '低于建仓区间下沿', side: 'neutral', strength: 3, weight: 8, text: '现价已低于报告建仓区间下沿 ' + lo + ' 元，或意味着基本面/预期发生变化，需重新评估而非机械抄底', evidence: '现价 ' + P + ' < 建仓下沿 ' + lo });
      }
      if (L.stopLoss && P <= L.stopLoss * 1.02) {
        push({ id: 'pf-stop', dim: '风控纪律', name: P <= L.stopLoss ? '已触及止损位' : '逼近止损位', side: 'bear', strength: P <= L.stopLoss ? 5 : 4, weight: 10, text: P <= L.stopLoss ? '价格已跌破报告设定的止损位 ' + L.stopLoss + ' 元，按纪律应执行减仓/离场' : '价格逼近止损位 ' + L.stopLoss + ' 元，需提前制定应对预案', evidence: '现价 ' + P + ' / 止损位 ' + L.stopLoss + '（依据：' + profile.sourceDoc + '）' });
      }
      if (L.target1 && P >= L.target1 * 0.98) {
        var hit2 = L.target2 && P >= L.target2 * 0.98;
        push({ id: 'pf-target', dim: '持仓策略', name: hit2 ? '触及第二目标位' : '触及第一目标位', side: 'bear', strength: hit2 ? 3 : 2, weight: 8, text: hit2 ? '已达第二目标位 ' + L.target2 + ' 元，建议分批兑现、保留底仓' : '接近第一目标位 ' + L.target1 + ' 元，若量能萎缩建议减仓 1/3', evidence: '现价 ' + P + ' / 目标位 ' + L.target1 + (L.target2 ? ' / ' + L.target2 : '') });
      }
      if (L.hardStop && P <= L.hardStop * 1.02) {
        push({ id: 'pf-hardstop', dim: '风控纪律', name: '触及硬止损', side: 'bear', strength: 5, weight: 10, text: '价格靠近硬止损位 ' + L.hardStop + ' 元，跌破应无条件清仓', evidence: '现价 ' + P + ' / 硬止损 ' + L.hardStop });
      }
      if (L.target1 && P < L.target1) push({ id: 'pf-space-up', dim: '盈亏空间', name: '上方目标空间', side: 'neutral', strength: 2, weight: 5, text: '距第一目标位 ' + L.target1 + ' 元尚有 ' + (((L.target1 - P) / P) * 100).toFixed(1) + '% 空间', evidence: '现价 ' + P + ' → 目标 ' + L.target1 });
      if (L.stopLoss && P > L.stopLoss) push({ id: 'pf-space-dn', dim: '盈亏空间', name: '下方风险空间', side: 'neutral', strength: 2, weight: 5, text: '距止损位 ' + L.stopLoss + ' 元回撤空间 ' + (((P - L.stopLoss) / P) * 100).toFixed(1) + '%', evidence: '现价 ' + P + ' → 止损 ' + L.stopLoss });

      if (profile.cost) {
        var fl = ((P - profile.cost) / profile.cost) * 100;
        push({ id: 'pf-cost', dim: '持仓账户', name: fl >= 0 ? '当前浮盈' : '当前浮亏', side: fl >= 0 ? 'bull' : 'bear', strength: Math.abs(fl) > 10 ? 3 : 2, weight: 7, text: '以成本 ' + profile.cost + ' 元计，当前' + (fl >= 0 ? '浮盈' : '浮亏') + ' ' + Math.abs(fl).toFixed(2) + '%' + (fl < 0 ? '，处于成本保护区间，须严格执行减仓纪律' : ''), evidence: '成本 ' + profile.cost + ' / 现价 ' + P });
      }

      var V = profile.valuation || {};
      if (quote.peTtm != null && V.fairPe) {
        var pe = quote.peTtm, plo = V.fairPe[0], phi = V.fairPe[1];
        if (pe > 0) {
          if (pe < plo) push({ id: 'pf-pe-low', dim: '估值水平', name: 'PE低于合理区间', side: 'bull', strength: 4, weight: 8, text: '当前 PE(TTM) ' + pe + ' 倍，低于报告参照的合理区间 ' + plo + '-' + phi + ' 倍，安全边际抬升', evidence: 'PE(TTM) ' + pe + ' 倍｜合理区间 ' + plo + '-' + phi + ' 倍｜对比：' + (V.benchmark || '—') + '（数据源：腾讯行情）' });
          else if (pe > phi) push({ id: 'pf-pe-high', dim: '估值水平', name: 'PE高于合理区间', side: 'bear', strength: 4, weight: 8, text: '当前 PE(TTM) ' + pe + ' 倍，高于报告参照的合理区间 ' + plo + '-' + phi + ' 倍，估值透支风险上升', evidence: 'PE(TTM) ' + pe + ' 倍｜合理区间 ' + plo + '-' + phi + ' 倍｜对比：' + (V.benchmark || '—') + '（数据源：腾讯行情）' });
          else push({ id: 'pf-pe-fair', dim: '估值水平', name: 'PE处于合理区间', side: 'neutral', strength: 2, weight: 6, text: '当前 PE(TTM) ' + pe + ' 倍，落在报告参照区间 ' + plo + '-' + phi + ' 倍内，估值中性', evidence: 'PE(TTM) ' + pe + ' 倍｜合理区间 ' + plo + '-' + phi + ' 倍｜对比：' + (V.benchmark || '—') + '（数据源：腾讯行情）' });
        }
      }
      return s;
    }

    /** 信号加权评分：50 + 45 × Σ(方向×强度/5×权重) / Σ权重 */
    function scoreSignals(signals, filter) {
      var list = filter ? signals.filter(filter) : signals, num = 0, den = 0;
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var dir = s.side === 'bull' ? 1 : s.side === 'bear' ? -1 : 0;
        num += dir * (s.strength / 5) * s.weight;
        den += s.weight;
      }
      if (!den) return 50;
      return clamp(Math.round(50 + 45 * (num / den)), 2, 98);
    }

    /* ================================================================
     * 监控清单脚手架：七态（bull/bear/neutral/pending/manual/inapplicable/na）
     * ================================================================ */
    var STATES = {
      bull: { key: 'bull', label: '看多', sign: 1 },
      bear: { key: 'bear', label: '看空', sign: -1 },
      neutral: { key: 'neutral', label: '中性', sign: 0 },
      pending: { key: 'pending', label: '待复核', sign: 0 },
      manual: { key: 'manual', label: '人工跟踪', sign: 0 },
      inapplicable: { key: 'inapplicable', label: '不适用', sign: 0 },
      na: { key: 'na', label: '数据不足', sign: 0 }
    };
    function isScorable(st) { return st === 'bull' || st === 'bear' || st === 'neutral'; }
    function isTriggered(st) { return st === 'bull' || st === 'bear'; }

    var EVALUATORS = {
      trend: function (ctx) {
        var ind = ctx.ind, ma = ind.ma || {}, a = ind.maArrangement;
        var aboveBoth = ma.ma20 != null && ma.ma60 != null && ind.price > ma.ma20 && ind.price > ma.ma60;
        var belowBoth = ma.ma20 != null && ma.ma60 != null && ind.price < ma.ma20 && ind.price < ma.ma60;
        var ev = 'MA5 ' + n2(ma.ma5) + ' / MA10 ' + n2(ma.ma10) + ' / MA20 ' + n2(ma.ma20) + ' / MA60 ' + n2(ma.ma60) + '，现价 ' + n2(ind.price);
        if (a === 'bull') return { state: 'bull', strength: 4, note: '多头排列', evidence: ev };
        if (a === 'bear') return { state: 'bear', strength: 4, note: '空头排列', evidence: ev };
        if (aboveBoth) return { state: 'bull', strength: 2, note: '均线纠缠，但价格站上 MA20 与 MA60', evidence: ev };
        if (belowBoth) return { state: 'bear', strength: 3, note: '均线纠缠，且价格跌破 MA20 与 MA60', evidence: ev };
        return { state: 'neutral', strength: 0, note: '均线纠缠，方向未选择', evidence: ev };
      },
      ma20Support: function (ctx) {
        var ind = ctx.ind, ma20 = ind.ma && ind.ma.ma20;
        if (ma20 == null) return { state: 'na', note: 'MA20 不可用', evidence: '' };
        var dev = ((ind.price - ma20) / ma20) * 100;
        var ev = '现价 ' + n2(ind.price) + ' / MA20 ' + n2(ma20) + '，偏离 ' + pctStr(dev);
        if (dev < -2) return { state: 'bear', strength: 4, note: '已跌破 MA20 ' + pctStr(dev) + '，支撑失守', evidence: ev };
        if (dev >= 0 && dev <= 8) return { state: 'bull', strength: 3, note: '站稳 MA20 上方 ' + pctStr(dev) + '，支撑有效', evidence: ev };
        if (dev > 8) return { state: 'neutral', strength: 0, note: '位于 MA20 上方 ' + pctStr(dev) + '，乖离偏大，回踩确认后赔率更佳', evidence: ev };
        return { state: 'neutral', strength: 0, note: '贴近 MA20（' + pctStr(dev) + '），方向待确认', evidence: ev };
      },
      macd: function (ctx) {
        var m = ctx.ind.macd;
        if (!m || m.dif == null || m.dea == null) return { state: 'na', note: 'MACD 不可用', evidence: '' };
        var up = m.dif > m.dea, above = m.dif > 0;
        var histUp = (m.prevHist != null && m.hist != null) ? m.hist > m.prevHist : null;
        var ev = 'DIF ' + n2(m.dif) + ' / DEA ' + n2(m.dea) + '，柱 ' + n2(m.hist) + (histUp == null ? '' : histUp ? '（较前值放大）' : '（较前值收敛）');
        if (up && above) return { state: 'bull', strength: histUp ? 4 : 3, note: 'DIF 在 DEA 上方且站上零轴，多头动能', evidence: ev };
        if (up && !above) return { state: 'bull', strength: 2, note: '零轴下方金叉，属弱多修复', evidence: ev };
        if (!up && !above) return { state: 'bear', strength: 4, note: 'DIF 在 DEA 下方且位于零轴下，空头动能', evidence: ev };
        return { state: 'bear', strength: 2, note: '零轴上方死叉，属强势回调', evidence: ev };
      },
      rsi: function (ctx) {
        var ind = ctx.ind, r = ind.rsi;
        if (r == null) return { state: 'na', note: 'RSI 不可用', evidence: '' };
        var rp = ind.rsiPrev;
        var ev = 'RSI(14) ' + n2(r) + (rp == null ? '' : '（前值 ' + n2(rp) + '）');
        if (rp != null && rp >= 80 && r < rp) return { state: 'bear', strength: 4, note: '自超买区 ' + n2(rp) + ' 掉头至 ' + n2(r), evidence: ev };
        if (r >= 80) return { state: 'bear', strength: 3, note: '超买区（≥80），追高风险大', evidence: ev };
        if (r <= 30) return { state: 'bear', strength: 4, note: '超卖区（≤30），弱势格局，关注反弹确认', evidence: ev };
        if (r >= 50) return { state: 'bull', strength: r >= 70 ? 2 : 3, note: r >= 70 ? '强势区（70–80），偏热但仍在多头一侧' : 'RSI 站上 50，多头一侧', evidence: ev };
        return { state: 'neutral', strength: 0, note: 'RSI 位于 30–50 弱势震荡区，未站上 50', evidence: ev };
      },
      boll: function (ctx) {
        var ind = ctx.ind, bi = ind.bollInfo;
        if (!bi || bi.pctB == null) return { state: 'na', note: '布林轨道不可用', evidence: '' };
        var pb = bi.pctB;
        var ev = '%B ' + (pb * 100).toFixed(0) + '%，带宽 ' + p1(bi.bandwidthPct) + '%（历史分位 ' + (bi.bandwidthPctile == null ? '—' : bi.bandwidthPctile) + '%），' + bi.stateLabel;
        var squeezeNote = bi.state === 'squeeze' ? '；带宽收口，变盘临近' : bi.state === 'expand' ? '；带宽开口，趋势加速' : '';
        if (pb <= 0) return { state: 'bear', strength: 4, note: '跌破布林下轨（%B ' + (pb * 100).toFixed(0) + '%）' + squeezeNote, evidence: ev };
        if (pb >= 1) return { state: 'bull', strength: 2, note: '运行于上轨之上（%B ' + (pb * 100).toFixed(0) + '%），强势但短期待修复' + squeezeNote, evidence: ev };
        if (pb >= 0.5) return { state: 'bull', strength: 3, note: '站上布林中轨（%B ' + (pb * 100).toFixed(0) + '%）' + squeezeNote, evidence: ev };
        return { state: 'bear', strength: 2, note: '位于布林中轨下方（%B ' + (pb * 100).toFixed(0) + '%）' + squeezeNote, evidence: ev };
      },
      rails: function (ctx) {
        var ind = ctx.ind, ra = ind.rails;
        if (!ra) return { state: 'na', note: '导轨不可用', evidence: '' };
        if (!ra.reliable) return { state: 'na', note: '导轨宽度过大、有效性不足，本次不计入判定', evidence: '斜率 ' + p1(ra.slope20Pct) + '%/20日' };
        var rp = ra.pctChan;
        var dirLabel = ra.dir === 'up' ? '上升导轨' : ra.dir === 'down' ? '下降导轨' : '水平导轨';
        var ev = dirLabel + '｜通道位 ' + (rp * 100).toFixed(0) + '%｜下轨 ' + n2(ra.dn) + ' / 上轨 ' + n2(ra.up) + '｜斜率 ' + p1(ra.slope20Pct) + '%/20日';
        if (ra.dir === 'up' && rp < 0.45) return { state: 'bull', strength: 4, note: '上升导轨回调至通道下部（' + (rp * 100).toFixed(0) + '%），低吸区间', evidence: ev };
        if (ra.dir === 'up' && rp >= 0.75) return { state: 'neutral', strength: 0, note: '上升导轨上沿（' + (rp * 100).toFixed(0) + '%），趋势强但赔率下降，宜持有不追', evidence: ev };
        if (ra.dir === 'down' && rp <= 0.2) return { state: 'bear', strength: 4, note: '下降导轨下沿（' + (rp * 100).toFixed(0) + '%），趋势未反转，不宜抄底', evidence: ev };
        if (ra.dir === 'down' && rp >= 0.75) return { state: 'bear', strength: 3, note: '反抽至下降导轨上沿（' + (rp * 100).toFixed(0) + '%），属减仓窗口', evidence: ev };
        if (ra.dir === 'flat' && rp <= 0.25) return { state: 'bull', strength: 3, note: '箱体底部（' + (rp * 100).toFixed(0) + '%），区间低吸位', evidence: ev };
        if (ra.dir === 'flat' && rp >= 0.75) return { state: 'bear', strength: 3, note: '箱体顶部（' + (rp * 100).toFixed(0) + '%），区间减持位', evidence: ev };
        return { state: 'neutral', strength: 0, note: '通道中部（' + (rp * 100).toFixed(0) + '%），方向未选择', evidence: ev };
      },
      volume: function (ctx) {
        var ind = ctx.ind, quote = ctx.quote;
        var vr = (quote.volumeRatio != null) ? quote.volumeRatio : ind.volRatioLocal;
        if (vr == null) return { state: 'na', note: '量比不可用', evidence: '' };
        var chg = quote.changePct != null ? quote.changePct : (ind.returns ? ind.returns.d1 : null);
        var ev = '量比 ' + n2(vr) + (chg == null ? '' : '，当日涨跌 ' + pctStr(chg)) + (quote.turnover == null ? '' : '，换手 ' + quote.turnover + '%');
        if (vr >= 1.5 && chg != null && chg > 0) return { state: 'bull', strength: 3, note: '放量上涨，量价配合', evidence: ev };
        if (vr >= 1.5 && chg != null && chg < 0) return { state: 'bear', strength: 4, note: '放量下跌，抛压释放', evidence: ev };
        if (vr >= 1.5) return { state: 'neutral', strength: 0, note: '明显放量但方向不明', evidence: ev };
        if (vr <= 0.7) return { state: 'neutral', strength: 0, note: '明显缩量，观望情绪浓', evidence: ev };
        return { state: 'neutral', strength: 0, note: '量能正常，无明显方向性含义', evidence: ev };
      },
      donchian: function (ctx) {
        var ind = ctx.ind, dc = ind.donchian;
        if (!dc) return { state: 'na', note: '区间数据不足', evidence: '' };
        var P = ind.price;
        var ev = '现价 ' + n2(P) + '｜20日区间 ' + n2(dc.lower) + ' ~ ' + n2(dc.upper) + '｜区间位置 ' + p1(dc.pct) + '%｜区间分位 ' + p1(ind.position52) + '%';
        if (P > dc.upper) return { state: 'bull', strength: 4, note: '突破 20 日高点 ' + n2(dc.upper), evidence: ev };
        if (P < dc.lower) return { state: 'bear', strength: 4, note: '跌破 20 日低点 ' + n2(dc.lower), evidence: ev };
        if (dc.pct >= 90) return { state: 'bull', strength: 2, note: '逼近 20 日高点（区间位 ' + p1(dc.pct) + '%），等待有效突破', evidence: ev };
        if (dc.pct <= 10) return { state: 'bear', strength: 2, note: '逼近 20 日低点（区间位 ' + p1(dc.pct) + '%），注意破位风险', evidence: ev };
        return { state: 'neutral', strength: 0, note: '区间内震荡（位置 ' + p1(dc.pct) + '%）', evidence: ev };
      },
      valuationPE: function (ctx) {
        var ind = ctx.ind, quote = ctx.quote, pe = quote.peTtm;
        if (pe == null) return { state: 'na', note: 'PE(TTM) 不可用', evidence: '' };
        var ev = 'PE(TTM) ' + n2(pe) + ' 倍（数据源：腾讯行情，现价 ' + n2(ind.price) + '）';
        if (pe <= 0) return { state: 'inapplicable', note: 'PE(TTM) ' + n2(pe) + ' 倍为负，公司当前处于亏损状态，PE 不适用，需改用 PB 或 PS 判断', evidence: ev };
        if (pe < 30) return { state: 'bull', strength: 3, note: n2(pe) + ' 倍，处于偏低分位', evidence: ev };
        if (pe > 50) return { state: 'bear', strength: 3, note: n2(pe) + ' 倍，估值透支风险上升', evidence: ev };
        return { state: 'neutral', strength: 0, note: n2(pe) + ' 倍，估值中性', evidence: ev };
      }
    };

    var PENDING_KEYS = {
      grossMargin: '需要定期报告披露的综合毛利率',
      segmentShare: '需要定期报告的分业务营收占比',
      profitGrowth: '需要定期报告的单季归母净利润',
      revenueGrowth: '需要定期报告的营收与毛利率',
      chipConcentration: '需要股东户数/融资余额等筹码数据'
    };
    function hasEvaluator(key) { return typeof EVALUATORS[key] === 'function'; }

    /** 通用清单：无研报画像时由实时技术状态派生，每项都带 auto 求值器 */
    function buildGeneric(ctx) {
      var ind = ctx.ind;
      if (!ind) return [];
      var ma = ind.ma || {}, dc = ind.donchian || {}, ra = ind.rails || {};
      var vr = (ctx.quote.volumeRatio != null) ? ctx.quote.volumeRatio : ind.volRatioLocal;
      return [
        { key: 'trend', auto: 'trend', dim: '趋势结构', metric: 'MA20 ' + n2(ma.ma20) + ' / MA60 ' + n2(ma.ma60), window: '每日收盘', bull: '价格站上 MA20，且 MA20 走平或上翘', bear: '收盘跌破 MA60，且 MA60 拐头向下', weight: 10 },
        { key: 'ma20s', auto: 'ma20Support', dim: '中期支撑', metric: 'MA20 支撑位 ' + n2(ma.ma20), window: '每日', bull: '回踩 ' + n2(ma.ma20) + ' 附近不破并收出阳线', bear: '有效跌破 ' + n2(ma.ma20) + '（收盘价连续 2 日在下方）', weight: 9 },
        { key: 'macd', auto: 'macd', dim: 'MACD 动能', metric: 'DIF ' + n2(ind.macd && ind.macd.dif) + ' / DEA ' + n2(ind.macd && ind.macd.dea), window: '每日', bull: 'DIF 上穿 DEA 形成金叉，且 DIF 站上零轴', bear: 'DIF 下穿 DEA 形成死叉，且绿柱持续放大', weight: 8 },
        { key: 'rsi', auto: 'rsi', dim: 'RSI 强弱', metric: 'RSI(14) ' + n2(ind.rsi), window: '每日', bull: 'RSI 上穿 50 并站稳', bear: 'RSI 跌破 30，或自 80 以上高位掉头', weight: 7 },
        { key: 'boll', auto: 'boll', dim: '布林轨道', metric: '上轨 ' + n2(ind.boll && ind.boll.up) + ' / 中轨 ' + n2(ind.boll && ind.boll.mid) + ' / 下轨 ' + n2(ind.boll && ind.boll.dn), window: '每日', bull: '收复中轨，并向中轨上方扩展', bear: '跌破下轨，或上轨遇阻后放量回落', weight: 8 },
        { key: 'rails', auto: 'rails', dim: '回归导轨', metric: '导轨 ' + n2(ra.dn) + ' ~ ' + n2(ra.up) + '（' + (ra.bars || '—') + ' 根，k=' + (ra.k == null ? '—' : ra.k) + '）', window: '每日', bull: '上升导轨中回踩下沿获支撑', bear: '下降导轨中跌破下轨，趋势延续', weight: 8 },
        { key: 'volume', auto: 'volume', dim: '量价配合', metric: '量比 ' + (vr == null ? '—' : n2(vr)) + ' / 换手 ' + (ctx.quote.turnover == null ? '—' : ctx.quote.turnover + '%'), window: '每日', bull: '放量突破关键阻力位（量比 > 1.5）', bear: '放量下跌或缩量反弹无力', weight: 7 },
        { key: 'donchian', auto: 'donchian', dim: '关键区间', metric: dc.upper == null ? '20日区间数据不足' : '20日 ' + n2(dc.lower) + ' ~ ' + n2(dc.upper), window: '每日', bull: '突破 20 日高点并有效站稳', bear: '跌破 20 日低点', weight: 7 }
      ];
    }

    /** 清单逐项求值：返回带状态的清单行 + 可参与评分的信号 */
    function evaluateMonitors(monitors, ctx, opt) {
      opt = opt || {};
      var origin = opt.origin || 'monitor', rows = [], signals = [];
      var triggered = 0, pending = 0, manual = 0;
      for (var i = 0; i < (monitors || []).length; i++) {
        var m = monitors[i];
        var key = m.key || m.auto || null;
        var autoKey = m.auto || null;
        var r = null, unresolved = null;
        if (hasEvaluator(autoKey)) {
          try { r = EVALUATORS[autoKey](ctx); }
          catch (e) { r = { state: 'na', note: '求值异常：' + (e && e.message ? e.message : '未知错误'), evidence: '' }; }
        } else if (autoKey && PENDING_KEYS[autoKey]) {
          unresolved = PENDING_KEYS[autoKey];
        } else if (autoKey) {
          unresolved = '未登记的求值器 ' + autoKey;
        }
        var state = r ? (r.state || 'na') : autoKey ? 'pending' : 'manual';
        var note = r ? (r.note || '—') : autoKey ? '口径已声明，暂缺数据源：' + unresolved : '需人工跟踪：该口径无法由行情数据自动判定';
        var evidence = r ? (r.evidence || '') : '';
        var row = assign({}, m, { key: key, state: state, note: note, evidence: evidence, triggered: isTriggered(state) });
        rows.push(row);
        if (!isScorable(state)) { if (state === 'pending') pending++; if (state === 'manual') manual++; continue; }
        var side = state === 'bull' ? 'bull' : state === 'bear' ? 'bear' : 'neutral';
        var strength = side === 'neutral' ? 0 : Math.max(1, Math.min(5, r.strength == null ? 3 : r.strength));
        if (side !== 'neutral') triggered++;
        signals.push({
          id: 'mon-' + key, dim: m.dim || '监控清单', name: m.metric || m.dim || key, side: side,
          strength: strength, weight: m.weight == null ? 5 : m.weight,
          text: side === 'bull' ? m.bull : side === 'bear' ? m.bear : ('未触发：' + m.bull + ' / ' + m.bear),
          evidence: evidence || note, origin: origin
        });
      }
      return { rows: rows, signals: signals, triggered: triggered, pending: pending, manual: manual };
    }

    /** 清单概览（七态计数 + 一句话结论） */
    function summarizeMonitors(rows) {
      var list = rows || [];
      function cnt(st) { var c = 0; for (var i = 0; i < list.length; i++) if (list[i].state === st) c++; return c; }
      var bull = cnt('bull'), bear = cnt('bear'), neutral = cnt('neutral');
      var pending = cnt('pending'), manual = cnt('manual'), inapplicable = cnt('inapplicable'), na = cnt('na');
      var total = bull + bear + neutral;
      var verdict = '无可自动判定项，清单需人工跟踪';
      if (total) {
        if (bull >= bear + 2) verdict = '看多项占优（' + bull + ' 看多 / ' + bear + ' 看空）';
        else if (bear >= bull + 2) verdict = '看空项占优（' + bull + ' 看多 / ' + bear + ' 看空）';
        else verdict = '多空交织（' + bull + ' 看多 / ' + bear + ' 看空 / ' + neutral + ' 中性）';
      }
      var gaps = [];
      if (pending) gaps.push(pending + ' 项待复核（缺数据源）');
      if (manual) gaps.push(manual + ' 项需人工跟踪');
      if (inapplicable) gaps.push(inapplicable + ' 项不适用');
      if (na) gaps.push(na + ' 项数据不足');
      return {
        bull: bull, bear: bear, neutral: neutral, pending: pending, manual: manual,
        inapplicable: inapplicable, na: na, total: total, judgeable: total, listed: list.length,
        verdict: verdict, gapNote: gaps.length ? '另有 ' + gaps.join('、') + '，未计入评分。' : ''
      };
    }

    /* ================================================================
     * 个股画像（deriveLevels 共用价位推导 + synthesizeProfile 自动画像）
     * ================================================================ */
    var AUTO_QUALITY = 'auto';
    var AUTO_SOURCE = '由实时行情自动生成（非投研报告）';

    /** 从 ATR 与关键位推导交易价位（引擎与画像共用的唯一口径） */
    function deriveLevels(ind) {
      var P = ind.price;
      var atr = (isNum(ind.atr) && ind.atr > 0) ? ind.atr : (isNum(P) && P > 0 ? P * 0.02 : 0);

      var supports = (ind.keyLevels || []).filter(function (k) { return k.side === 'support'; })
        .sort(function (a, b) { return b.price - a.price; }).slice(0, 5);
      var resistances = (ind.keyLevels || []).filter(function (k) { return k.side === 'resistance'; })
        .sort(function (a, b) { return a.price - b.price; }).slice(0, 5);

      var maRef = [
        { name: 'MA5', v: ind.ma && ind.ma.ma5 }, { name: 'MA10', v: ind.ma && ind.ma.ma10 },
        { name: 'MA20', v: ind.ma && ind.ma.ma20 }, { name: 'MA30', v: ind.ma && ind.ma.ma30 },
        { name: 'MA60', v: ind.ma && ind.ma.ma60 }, { name: 'MA120', v: ind.ma && ind.ma.ma120 }
      ].filter(function (x) { return x.v != null; });

      if (supports.length < 2) {
        maRef.filter(function (x) { return x.v < P; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 3).forEach(function (x) {
          supports.push({ price: x.v, count: 0, side: 'support', dist: +(((x.v - P) / P) * 100).toFixed(2), label: x.name });
        });
      }
      if (resistances.length < 2) {
        maRef.filter(function (x) { return x.v > P; }).sort(function (a, b) { return a.v - b.v; }).slice(0, 3).forEach(function (x) {
          resistances.push({ price: x.v, count: 0, side: 'resistance', dist: +(((x.v - P) / P) * 100).toFixed(2), label: x.name });
        });
      }
      resistances.sort(function (a, b) { return a.price - b.price; });
      supports.sort(function (a, b) { return b.price - a.price; });

      var entryLo = r2(P - atr * 1.5), entryHi = r2(P - atr * 0.5);
      var stopLoss = r2(P - atr * 2.5), hardStop = r2(P - atr * 3.5);

      var minTgtDist = atr * 1.2;
      var farRes = resistances.filter(function (r) { return r.price >= P + minTgtDist; });
      var target1 = farRes[0] ? farRes[0].price : r2(P + atr * 4);
      var target2 = farRes.filter(function (r) { return r.price > target1; })[0];
      target2 = target2 ? target2.price : r2(P + atr * 7);
      if (target2 == null || target2 <= target1) target2 = r2(target1 + atr * 3);

      return {
        entry: [entryLo, entryHi], stopLoss: stopLoss, hardStop: hardStop,
        target1: target1, target2: target2, positionLimit: 0.1,
        atr: r2(atr), supports: supports, resistances: resistances
      };
    }

    var MARKET_LABEL = { sh: '沪市', sz: '深市', bj: '北交所' };
    function buildTags(ind, market) {
      var tags = ['自动画像'];
      if (ind.price != null) {
        var a = ind.maArrangement;
        tags.push(a === 'bull' ? '多头排列' : a === 'bear' ? '空头排列' : '均线纠缠');
      }
      var r = ind.rsi;
      if (r != null) tags.push(r >= 80 ? '超买' : r <= 30 ? '超卖' : r >= 50 ? '偏强' : '偏弱');
      var dir = ind.rails && ind.rails.dir;
      if (ind.rails && ind.rails.reliable && dir) tags.push(dir === 'up' ? '上升导轨' : dir === 'down' ? '下降导轨' : '箱体震荡');
      var cell = MARKET_LABEL[market];
      if (cell) tags.push(cell);
      return tags.slice(0, 5);
    }
    function buildThesis(name, code, ind, quote) {
      var P = n2(ind.price), ma = ind.ma || {}, m = ind.macd || {};
      var arr = ind.maArrangement === 'bull' ? '均线多头排列' : ind.maArrangement === 'bear' ? '均线空头排列' : '均线纠缠、方向未选择';
      var parts = [
        name + '（' + code + '）现价 ' + P + ' 元，' + arr + '；MA20 ' + n2(ma.ma20) + '、MA60 ' + n2(ma.ma60) + '。',
        'MACD DIF ' + n2(m.dif) + ' / DEA ' + n2(m.dea) + '，RSI(14) ' + n2(ind.rsi) + '，'
        + '20 日区间 ' + n2(ind.donchian && ind.donchian.lower) + '~' + n2(ind.donchian && ind.donchian.upper) + '，区间分位 ' + (ind.position52 == null ? '—' : ind.position52) + '%。'
      ];
      if (quote.peTtm != null) parts.push('当前 PE(TTM) ' + n2(quote.peTtm) + ' 倍。');
      if (ind.channelVerdict && ind.channelVerdict.advice) parts.push(ind.channelVerdict.advice);
      parts.push('本画像由实时行情自动生成，不含基本面与研报结论，仅用于技术面盯盘。');
      return parts.join('');
    }
    function buildRisks(ind) {
      var out = [], P = ind.price;
      if (ind.maArrangement === 'bear') out.push('均线空头排列，趋势性下行压力尚未解除，抄底需等待右侧信号。');
      if (ind.rsi != null && ind.rsi >= 80) out.push('RSI(14) 已达 ' + n2(ind.rsi) + '，短线超买，存在技术性回调压力。');
      if (ind.rsi != null && ind.rsi <= 30) out.push('RSI(14) 降至 ' + n2(ind.rsi) + '，弱势格局，超卖不等于见底。');
      if (ind.bollInfo && ind.bollInfo.pctB <= 0) out.push('价格已跌破布林下轨，弱势延续风险偏高。');
      if (ind.rails && ind.rails.reliable && ind.rails.dir === 'down') out.push('处于下降导轨，趋势未反转前反弹属减仓窗口而非买点。');
      if (ind.drawdownFromHigh != null && ind.drawdownFromHigh <= -20) out.push('距区间高点回撤 ' + n2(Math.abs(ind.drawdownFromHigh)) + '%，上方套牢盘构成压力。');
      if (ind.atrPct != null && ind.atrPct >= 4) out.push('日均波动率 ATR 达 ' + ind.atrPct + '%，波动偏大，须按 ATR 设置动态止损。');
      if (ind.rsi != null && ind.rsi >= 70 && ind.rsi < 80) out.push('RSI 位于 70–80 偏热区，追高的赔率不佳。');
      out.push('⚠️ 自动画像不含投研结论与机构观点，关键决策请自行核实并独立判断。');
      return out.slice(0, 6);
    }

    /** 为任意标的合成「自动画像」（诚信边界：不伪造基本面/成本/合理估值区间） */
    function synthesizeProfile(ctx) {
      var ind = ctx.ind, quote = ctx.quote;
      if (!ind) return null;
      var code = ctx.code || '—', name = ctx.name || code;
      var levels = deriveLevels(ind);
      var rows = buildGeneric(ctx);
      return {
        code: code, market: ctx.market || null, name: name,
        tags: buildTags(ind, ctx.market),
        sourceDoc: AUTO_SOURCE, reportDate: null,
        thesis: buildThesis(name, code, ind, quote),
        moat: null,
        valuation: (quote.peTtm != null || quote.pb != null)
          ? { benchmark: '腾讯行情实时快照', note: '自动画像不提供"合理估值区间"判断，请结合行业自行核对' }
          : null,
        levels: levels, cost: null, takeProfit: [], catalysts: [], businessMix: [],
        monitors: rows,
        fundamentals: {
          peTtm: quote.peTtm == null ? null : quote.peTtm,
          pb: quote.pb == null ? null : quote.pb,
          totalCap: quote.totalCap == null ? null : quote.totalCap,
          floatCap: quote.floatCap == null ? null : quote.floatCap,
          turnover: quote.turnover == null ? null : quote.turnover,
          volumeRatio: quote.volumeRatio == null ? null : quote.volumeRatio,
          position52: ind.position52 == null ? null : ind.position52,
          drawdownFromHigh: ind.drawdownFromHigh == null ? null : ind.drawdownFromHigh,
          atrPct: ind.atrPct == null ? null : ind.atrPct,
          source: '实时行情自动汇总'
        },
        chips: null, risks: buildRisks(ind), verdictNote: null,
        auto: true, profileQuality: AUTO_QUALITY, disclaimer: AUTO_SOURCE
      };
    }

    /* ================================================================
     * 引擎：七档动作判定 + 硬性风控覆盖 + 盈亏比修正
     * ================================================================ */
    var ACTIONS = {
      BUY: { key: 'BUY', label: '积极入场', color: '#d92b3f', desc: '多项核心信号共振向上，且价格处于策略允许的买入区间' },
      ADD: { key: 'ADD', label: '可分批建仓', color: '#e0354a', desc: '技术面与策略面偏多，可逢低分批介入' },
      HOLD: { key: 'HOLD', label: '持有观察', color: '#f59e0b', desc: '多空信号交织，未到明确买卖点，保持现有仓位观察' },
      WATCH: { key: 'WATCH', label: '观望等待', color: '#fb8c00', desc: '方向不明或处于左侧磨底，等待右侧确认信号' },
      REDUCE: { key: 'REDUCE', label: '建议减仓', color: '#0ca678', desc: '利空信号占优，应降低仓位控制回撤' },
      EXIT: { key: 'EXIT', label: '建议离场', color: '#0b7a58', desc: '趋势与风控双双恶化，应果断离场保护本金' },
      TAKE_PROFIT: { key: 'TAKE_PROFIT', label: '分批止盈', color: '#b45309', desc: '已达目标位或短线过热，应分批兑现利润' },
      AVOID: { key: 'AVOID', label: '建议回避', color: '#0b7a58', desc: '趋势与风控双双恶化，暂不建议参与，等待右侧信号确认' },
      NOCHASE: { key: 'NOCHASE', label: '不建议追高', color: '#b45309', desc: '价格已临近或触及目标区间，此时介入的赔率不佳，建议等待回调' }
    };

    /** 无持仓场景：把持仓动作转换为等价的无持仓表述 */
    function adaptForNoPosition(action) {
      if (action.key === 'EXIT') return assign({}, ACTIONS.AVOID, { reasons: action.reasons, confidence: action.confidence });
      if (action.key === 'TAKE_PROFIT') return assign({}, ACTIONS.NOCHASE, { reasons: action.reasons, confidence: action.confidence });
      if (action.key === 'REDUCE') return assign({}, ACTIONS.AVOID, { label: '建议减持/回避', desc: '利空信号占优，建议降低或暂缓建立敞口', reasons: action.reasons, confidence: action.confidence });
      return action;
    }

    /** 动作判定（硬性风控优先于技术信号） */
    function decideAction(o) {
      var composite = o.composite, ind = o.ind, profile = o.profile, signals = o.signals;
      var P = ind.price;
      var L = (profile && profile.auto) ? {} : ((profile && profile.levels) || {});
      var reasons = [], action;
      var belowHard = L.hardStop && P <= L.hardStop;
      var belowStop = L.stopLoss && P <= L.stopLoss;
      var aboveT1 = L.target1 && P >= L.target1;
      var aboveT2 = L.target2 && P >= L.target2;

      if (belowHard) { action = ACTIONS.EXIT; reasons.push('价格 ' + P + ' 已跌破硬止损位 ' + L.hardStop + '，按报告风控纪律应无条件清仓，本金安全优先于任何反弹预期。'); }
      else if (belowStop) { action = ACTIONS.EXIT; reasons.push('价格 ' + P + ' 已跌破止损位 ' + L.stopLoss + '，若 3 个交易日内无法收回，应执行止损离场。'); }
      else if (aboveT2) { action = ACTIONS.TAKE_PROFIT; reasons.push('价格 ' + P + ' 已达第二目标位 ' + L.target2 + '，建议再减仓 1/3 并保留底仓，用移动止盈锁定利润。'); }
      else if (aboveT1) { action = ACTIONS.TAKE_PROFIT; reasons.push('价格 ' + P + ' 已达第一目标位 ' + L.target1 + '，若成交量萎缩应减仓 1/3。'); }
      else if (composite >= 78) { action = ACTIONS.BUY; }
      else if (composite >= 66) { action = ACTIONS.ADD; }
      else if (composite >= 52) { action = ACTIONS.HOLD; }
      else if (composite >= 40) { action = ind.maArrangement === 'bull' ? ACTIONS.REDUCE : ACTIONS.WATCH; }
      else { action = ACTIONS.EXIT; }

      var bulls = signals.filter(function (s) { return s.side === 'bull'; }).sort(function (a, b) { return b.strength * b.weight - a.strength * a.weight; });
      var bears = signals.filter(function (s) { return s.side === 'bear'; }).sort(function (a, b) { return b.strength * b.weight - a.strength * a.weight; });
      bulls.slice(0, 3).forEach(function (s) { reasons.push('【支撑】' + s.name + '：' + s.text + '（' + s.evidence + '）'); });
      bears.slice(0, 3).forEach(function (s) { reasons.push('【压制】' + s.name + '：' + s.text + '（' + s.evidence + '）'); });
      reasons.push('综合评分 ' + composite + '（技术面 ' + o.techScore + ' / 策略面 ' + (o.profileScore == null ? '—' : o.profileScore) + '），结论落于「' + action.label + '」区间。');

      return assign({}, action, { reasons: reasons, confidence: clamp(Math.round(Math.abs(composite - 50) * 1.8 + 20), 20, 95) });
    }

    /** 交易计划：含硬性风控覆盖 + 盈亏比修正 */
    function buildPlan(ind, profile, actionKey) {
      var P = ind.price;
      var L = (profile && profile.auto) ? {} : ((profile && profile.levels) || {});
      var atr = ind.atr || P * 0.02;
      var d = deriveLevels(ind);
      var supports = d.supports, resistances = d.resistances;

      var entryLo = (L.entry && L.entry[0] != null) ? L.entry[0] : d.entry[0];
      var entryHi = (L.entry && L.entry[1] != null) ? L.entry[1] : d.entry[1];
      var stopLoss = L.stopLoss != null ? L.stopLoss : d.stopLoss;
      var hardStop = L.hardStop != null ? L.hardStop : d.hardStop;
      var target1 = L.target1 != null ? L.target1 : d.target1;
      var target2 = L.target2 != null ? L.target2 : d.target2;
      if (target2 == null || target2 <= target1) target2 = r2(target1 + atr * 3);

      var refEntry = P;
      if (L.entry) { var lo = L.entry[0], hi = L.entry[1]; refEntry = P <= hi ? Math.max(P, lo) : hi; }
      var refStop = stopLoss;
      if (refStop != null && refEntry <= refStop && hardStop) refStop = hardStop;

      var riskDist = refStop != null ? refEntry - refStop : null;
      var wideEnough = riskDist != null && riskDist >= atr * 0.8;
      var rrRaw = (wideEnough && target1 > refEntry) ? (target1 - refEntry) / riskDist : null;
      var riskReward = rrRaw != null ? +rrRaw.toFixed(2) : null;
      var rrNote = riskReward != null
        ? '按参考入场价 ' + r2(refEntry) + ' 元、止损 ' + r2(refStop) + ' 元计算（风险 ' + r2(riskDist) + ' 元 ≈ ' + (riskDist / atr).toFixed(1) + '×ATR）'
        : (riskDist != null && !wideEnough
          ? '参考入场价 ' + r2(refEntry) + ' 元距止损 ' + r2(refStop) + ' 元仅 ' + r2(riskDist) + ' 元，不足 1×ATR（' + r2(atr) + '），止损过窄、盈亏比参考意义有限，建议按 ATR 设置动态止损'
          : '现价已高于目标位或低于止损位，盈亏比不适用');

      var positionPct = L.positionLimit ? Math.round(L.positionLimit * 100) : 10;
      var batchKind = (actionKey === 'BUY' || actionKey === 'ADD') ? 'entry'
        : (actionKey === 'HOLD' || actionKey === 'WATCH') ? 'conditional' : 'exit';

      var zoneLo = entryLo != null ? Math.min(entryLo, entryHi == null ? entryLo : entryHi) : null;
      var zoneHi = entryHi != null ? Math.max(entryLo, entryHi) : null;
      var batches;
      if (L.entry && zoneLo != null) {
        if (P > zoneHi) {
          var mid = r2((zoneLo + zoneHi) / 2);
          batches = [
            { at: '回落至 ' + zoneHi + ' 元附近（建仓区间上沿）', ratio: '30%', note: '回到策略区间再动手，不追高' },
            { at: mid + ' 元附近（区间中枢）', ratio: '30%', note: '区间中部承接，摊薄成本' },
            { at: zoneLo + ' 元附近（区间下沿）', ratio: '40%', note: '接近下沿，风险收益比最优' }
          ];
        } else if (P >= zoneLo) {
          batches = [
            { at: r2(P) + ' 元（现价，区间内）', ratio: '30%', note: '首笔试仓，验证逻辑' },
            { at: zoneLo + ' 元附近（区间下沿）', ratio: '30%', note: '回踩下沿不破则加仓' },
            { at: r2(zoneLo - atr) + ' 元附近（下沿 -1 ATR）', ratio: '40%', note: '跌破下沿后的深水区，仅在逻辑未破坏时执行' }
          ];
        } else {
          batches = [
            { at: r2(P) + ' 元（现价，已低于区间下沿）', ratio: '30%', note: '先确认基本面/预期未恶化，再小仓试错' },
            { at: r2(P - atr) + ' 元附近（-1 ATR）', ratio: '30%', note: '继续下跌需重新核对投资逻辑' },
            { at: r2(P - atr * 2) + ' 元附近（-2 ATR）', ratio: '40%', note: '若跌破硬止损 ' + hardStop + ' 元则放弃该计划' }
          ];
        }
      } else {
        batches = [
          { at: r2(P) + ' 元（现价）', ratio: '30%', note: '轻仓试错' },
          { at: r2(P - atr) + ' 元附近（-1 ATR）', ratio: '30%', note: '回踩确认支撑后加仓' },
          { at: r2(P - atr * 2) + ' 元附近（-2 ATR）', ratio: '40%', note: '跌深后分批承接' }
        ];
      }

      var exitBatches = actionKey === 'TAKE_PROFIT'
        ? [
          { at: target1 + ' 元（第一目标位）', ratio: '1/3', note: '达标且量能萎缩即减仓，落袋为安' },
          { at: (target2 == null ? r2(target1 * 1.08) : target2) + ' 元（第二目标位）', ratio: '1/3', note: '放量突破可再减，剩余底仓用移动止盈跟随' },
          { at: '跌破 ' + r2(P - atr * 1.5) + ' 元（-1.5 ATR）', ratio: '剩余全部', note: '移动止盈触发，回吐超过阈值即离场' }
        ]
        : actionKey === 'REDUCE' || actionKey === 'AVOID'
          ? [
            { at: '反弹至 ' + r2(P + atr) + ' 元附近', ratio: '1/3', note: '利用技术性反弹降低仓位，而非恐慌抛售' },
            { at: (stopLoss == null ? r2(P - atr * 2) : stopLoss) + ' 元附近（止损位）', ratio: '1/3', note: '跌破止损位则加快减仓节奏' },
            { at: (hardStop == null ? r2(P - atr * 3.5) : hardStop) + ' 元（硬止损）', ratio: '剩余全部', note: '硬止损触发，无条件清仓' }
          ]
          : [
            { at: r2(P) + ' 元（现价）', ratio: '50%', note: '风控优先，先降低一半敞口' },
            { at: '反弹至 ' + (ind.ma.ma20 == null ? r2(P + atr) : ind.ma.ma20) + ' 元附近', ratio: '剩余全部', note: '反弹是减仓窗口而非补仓理由' },
            { at: (hardStop == null ? r2(P - atr * 3.5) : hardStop) + ' 元（硬止损）', ratio: '无条件清仓', note: '跌破硬止损立即离场，不做任何摊薄' }
          ];

      return {
        entry: [entryLo, entryHi], stopLoss: stopLoss, hardStop: hardStop, target1: target1, target2: target2,
        riskReward: riskReward, rrNote: rrNote,
        riskPct: r2(riskDist != null ? (riskDist / refEntry) * 100 : null), refEntry: r2(refEntry),
        atr: r2(atr), atrPct: ind.atrPct,
        supports: supports, resistances: resistances,
        positionLimitPct: positionPct,
        fromProfile: !!(L.entry || L.stopLoss) && !(profile && profile.auto),
        levelsSource: (!(profile && profile.auto) && (L.entry || L.stopLoss)) ? 'profile' : 'derived',
        canEnter: batchKind !== 'exit',
        batches: batchKind === 'exit' ? exitBatches : batches,
        batchKind: batchKind
      };
    }

    /* ================================================================
     * 8 章投研报告（Markdown + HTML 双格式）
     * ================================================================ */
    function f2(x) { return isNum(x) ? x.toFixed(2) : '—'; }
    function moneyWan(x) {
      if (x == null || !isFinite(Number(x))) return '—';
      var v = Number(x);
      if (Math.abs(v) >= 10000) return (v / 10000).toFixed(2) + '亿元';
      return Math.round(v) + '万元';
    }
    function tag(x) { return x > 0 ? '🔴' : x < 0 ? '🟢' : '⚪'; }

    function signalTable(signals) {
      if (!signals.length) return '_暂无显著信号_';
      var rows = signals.map(function (s) {
        var side = s.side === 'bull' ? '**利好**' : s.side === 'bear' ? '**利空**' : '中性';
        var stars = '★'.repeat(Math.max(1, Math.min(5, Math.round(s.strength))));
        var dir = s.side === 'bull' ? '🔴' : s.side === 'bear' ? '🟢' : '⚪';
        return '| ' + dir + ' ' + side + ' | ' + s.dim + ' | ' + s.name + ' ' + stars + ' | ' + s.text + ' | ' + s.evidence + ' |';
      });
      return ['| 方向 | 维度 | 信号 | 判读 | 数据依据 |', '| --- | --- | --- | --- | --- |'].concat(rows).join('\n');
    }

    var MON_STATE_TEXT = {
      bull: '🔴 看多', bear: '🟢 看空', neutral: '⚪ 中性',
      pending: '⏸ 待复核', manual: '✎ 人工跟踪', inapplicable: '— 不适用', na: '— 数据不足'
    };
    function monitorTable(monitors, source, summary) {
      if (!monitors || !monitors.length) return '_暂无可用的监控项（行情数据不足）。_';
      var srcNote = source === 'profile'
        ? '清单来源：**专项清单**（来自投研文档）'
        : '清单来源：**自动清单**（由实时行情派生，非投研结论）';
      var head = ['| 跟踪维度 | 关键指标 | 观察窗口 | 利好信号 | 利空信号 | 判定 | 当前状态 | 权重 |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |'];
      var rows = monitors.map(function (m) {
        return '| ' + m.dim + ' | ' + m.metric + ' | ' + m.window + ' | 🔴 ' + m.bull + ' | 🟢 ' + m.bear
          + ' | ' + (MON_STATE_TEXT[m.state] || '—') + ' | ' + (m.note || '—') + ' | ' + m.weight + ' |';
      });
      var out = ['> ' + srcNote, ''].concat(head).concat(rows).join('\n');
      if (!summary) return out;
      var tail = '**清单概览：** ' + summary.verdict + '（可判定 ' + summary.judgeable + ' / 列出 ' + summary.listed + ' 项）'
        + (summary.gapNote ? '\n\n> ' + summary.gapNote : '');
      return out + '\n\n' + tail;
    }

    function buildReportMd(a, ctx) {
      var q = ctx.quote, ind = a.ind, pf = a.profile, scores = a.scores, action = a.action, plan = a.plan;
      var signals = a.signals, cvd = a.channelVerdict;
      var now = new Date();
      var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
      var L = [], hasProfile = !!pf;
      var team = (window.STOCK_PROFILES && window.STOCK_PROFILES.template && window.STOCK_PROFILES.template.team) || ['二级市场投研', 'Risk Consulting', '战略分析'];

      L.push('# ' + ctx.name + '（' + ctx.code + '）投研报告与持仓攻略');
      L.push('');
      L.push('> **报告日期：** ' + dateStr + '　**标的：** ' + ctx.name + '（' + ctx.code + (ctx.market === 'sh' ? '.SH' : ctx.market === 'sz' ? '.SZ' : '') + '）　**最新价：** ' + f2(ind.price) + ' 元　**总市值：** ' + (q.totalCap ? q.totalCap + '亿元' : '—'));
      if (hasProfile) {
        L.push(pf.auto
          ? '> **画像来源：** ⚠️ **自动画像** —— 由实时行情与 K 线自动生成，**不是投研报告**，不含基本面判断与机构观点。'
          : '> **画像来源：** ' + pf.sourceDoc + (pf.reportDate ? '（原报告日期 ' + pf.reportDate + '）' : ''));
        if (pf.disclaimer) L.push('> ⚠️ ' + pf.disclaimer);
      }
      L.push('> **团队构成：** ' + team.join(' / '));
      L.push('');
      L.push('---');
      L.push('');

      /* 实时盯盘面板 */
      L.push('## ⟡ 实时盯盘面板（Live Monitor）');
      L.push('');
      L.push('| 指标 | 数值 | 指标 | 数值 |');
      L.push('| --- | --- | --- | --- |');
      L.push('| 现价 | **' + f2(ind.price) + '** 元 ' + tag(ctx.changePct) + ' | 涨跌幅 | ' + pctStr(ctx.changePct) + ' |');
      L.push('| 今开 / 昨收 | ' + f2(q.open) + ' / ' + f2(q.preClose) + ' | 最高 / 最低 | ' + f2(q.high) + ' / ' + f2(q.low) + ' |');
      L.push('| 成交额 | ' + moneyWan(q.amount) + ' | 换手率 / 量比 | ' + (q.turnover != null ? q.turnover + '%' : '—') + ' / ' + (q.volumeRatio != null ? q.volumeRatio : '—') + ' |');
      L.push('| PE(TTM) / PB | ' + (q.peTtm == null ? '—' : q.peTtm) + ' / ' + (q.pb == null ? '—' : q.pb) + ' | 区间分位 | ' + (ind.position52 == null ? '—' : ind.position52) + '%（' + ind.low52 + '~' + ind.high52 + '） |');
      L.push('| MA5 / MA20 / MA60 | ' + ind.ma.ma5 + '/' + ind.ma.ma20 + '/' + ind.ma.ma60 + ' | ATR / 波动率 | ' + ind.atr + '（' + ind.atrPct + '%） |');
      L.push('');
      L.push('### 综合判定：' + action.label + '　%%评分 ' + scores.composite + ' / 100%%');
      L.push('');
      L.push('- **技术面评分：** ' + scores.technical + ' / 100');
      L.push('- **策略面评分：** ' + (scores.profile != null ? scores.profile + ' / 100' : '（无投研画像，本项不计入）'));
      L.push('- **监控面评分：** ' + (scores.monitor != null ? scores.monitor + ' / 100（自动清单逐项判定汇总）' : '（无）'));
      L.push('- **权重：** ' + (scores.profile != null
        ? '技术面 × ' + (pf && pf.profileQuality === 'high' ? '45%' : '75%') + ' + 策略面 × 其余'
        : scores.monitor != null ? '技术面 × 60% + 监控面 × 40%' : '仅技术面'));
      L.push('- **判定置信度：** ' + action.confidence + '%');
      L.push('- **操作含义：** ' + action.desc);
      L.push('');
      L.push('**判定依据：**');
      action.reasons.forEach(function (r) { L.push('- ' + r); });
      L.push('');

      /* 上下轨线与导轨区间研判 */
      if (cvd) {
        var bi = ind.bollInfo, ra = ind.rails, dc = ind.donchian;
        L.push('## ⟡ 上下轨线与导轨区间研判');
        L.push('');
        L.push('### 所在区间：' + cvd.zone);
        L.push('');
        L.push('> ' + cvd.advice);
        L.push('');
        L.push('| 轨道系统 | 上轨 / 上沿 | 中轨 | 下轨 / 下沿 | 当前位置 | 状态 |');
        L.push('| --- | --- | --- | --- | --- | --- |');
        L.push('| 布林轨道（20,2） | ' + cvd.boll.up + ' | ' + cvd.boll.mid + ' | ' + cvd.boll.dn + ' | %B ' + (bi ? (bi.pctB * 100).toFixed(0) : '—') + '% | ' + (bi ? bi.stateLabel : '—') + '（带宽 ' + (bi ? bi.bandwidthPct : '—') + '%，近120日 ' + (bi ? bi.bandwidthPctile : '—') + '% 分位） |');
        if (ra) L.push('| 回归导轨通道 | ' + ra.up + ' | ' + ra.mid + ' | ' + ra.dn + ' | ' + (ra.pctChan * 100).toFixed(0) + '% | ' + cvd.railDirLabel + '｜' + ra.bars + '根窗口 k=' + ra.k + '｜斜率 ' + ra.slope20Pct + '%/20日｜通道宽 ' + ra.widthPct + '%' + (ra.reliable ? '' : '｜⚠宽度过大、参考性弱') + ' |');
        if (dc) L.push('| 唐奇安区间（20日） | ' + dc.upper + ' | ' + dc.mid + ' | ' + dc.lower + ' | ' + dc.pct + '% | 区间宽度 ' + (dc.upper - dc.lower).toFixed(2) + ' 元 |');
        L.push('');
        L.push('**轨道操作系统性判读：**');
        L.push('');
        L.push('- 布林带：' + cvd.bollLabel + (bi && bi.state === 'squeeze' ? '；带宽收口至历史低位，属变盘前的能量积蓄，方向确认前不宜重仓' : bi && bi.state === 'expand' ? '；带宽开口放大，趋势处于加速阶段' : ''));
        if (ra) L.push('- 回归导轨：' + cvd.railDirLabel + '，价格处于' + cvd.railPosLabel + '（' + (ra.pctChan * 100).toFixed(0) + '%）；轨内交易原则为「下沿买、上沿卖、中部不动」');
        if (dc) L.push('- 唐奇安区间：' + dc.lower + ' ~ ' + dc.upper + '，当前位于区间 ' + dc.pct + '% 位置，' + (dc.pct >= 90 ? '已逼近区间上沿，突破则趋势延续、受阻则回落' : dc.pct <= 10 ? '已逼近区间下沿，跌破则区间破位' : '区间内运行，未形成方向性突破'));
        if (ind.keyLevels && ind.keyLevels.length) {
          L.push('- 关键价位（枢轴聚类）：' + ind.keyLevels.slice(0, 4).map(function (k) { return k.price + '（' + (k.side === 'support' ? '支撑' : '阻力') + '·' + k.dist + '%）'; }).join('、'));
        }
        L.push('');
        L.push('> *轨道口径说明：布林带为 20 日移动均线 ±2 倍标准差；回归导轨为最小二乘线性回归中轨 ±k 倍残差标准差（窗口与 k 值自适应收窄，确保通道宽度可解读）；唐奇安区间为近 20 个交易日最高价与最低价。以上均为技术统计口径，不构成对基本面的判断。*');
        L.push('');
        L.push('---');
        L.push('');
      }

      /* 一、执行摘要 */
      L.push('## 一、执行摘要（Executive Summary）');
      L.push('');
      if (hasProfile && pf.thesis) {
        L.push(pf.thesis);
        L.push('');
        if (pf.moat) L.push('**技术/竞争壁垒：** ' + pf.moat);
      } else {
        L.push('**' + ctx.name + '（' + ctx.code + '）** 当前纳入通用投研模板跟踪。系统基于实时行情（现价 ' + f2(ind.price) + ' 元，区间分位 ' + ind.position52 + '%）、技术结构（均线' + (ind.maArrangement === 'bull' ? '多头' : ind.maArrangement === 'bear' ? '空头' : '纠缠') + '排列，MACD ' + (ind.macd.hist >= 0 ? '红柱' : '绿柱') + '，RSI ' + ind.rsi + '）与估值水平（PE(TTM) ' + (q.peTtm == null ? '—' : q.peTtm) + ' 倍）给出量化信号；但**个股专属画像缺失**，第四节至第七节的基本面拆解需补充专项研报后由系统回填。');
      }
      L.push('');
      L.push('**当前阶段定位：** ' + (ind.position52 <= 20 ? '处于区间底部，属于左侧区间' : ind.position52 >= 80 ? '处于区间高位，需警惕追高风险' : '处于区间中段，方向待选择') + '；技术面综合评分 ' + scores.technical + ' 分，判定为「**' + action.label + '**」。');
      L.push('');

      /* 二、财务与估值透视 */
      L.push('## 二、财务与估值透视');
      L.push('');
      if (hasProfile && !pf.auto && pf.fundamentals && Object.keys(pf.fundamentals).length) {
        L.push('**1. 财务基本面（源自投研文档）**');
        L.push('');
        L.push('| 指标 | 数值 |');
        L.push('| --- | --- |');
        var label = {
          revenue2025: '2025年营业收入', netProfit2025: '2025年归母净利润', revenueQ1_2026: '2026Q1营业收入',
          netProfitQ1_2026: '2026Q1归母净利润', grossMargin2025: '2025年毛利率', grossMarginQ1_2026: '2026Q1毛利率',
          cashFlow2025: '2025年经营现金流', cashFlowQ1_2026: '2026Q1经营现金流', roe: 'ROE', debtRatio: '资产负债率',
          receivables: '应收账款', consensus2026: '机构一致预期2026'
        };
        Object.keys(pf.fundamentals).forEach(function (k) { L.push('| ' + (label[k] || k) + ' | ' + pf.fundamentals[k] + ' |'); });
        L.push('');
      } else if (pf && pf.auto) {
        L.push('**1. 财务基本面**：_自动画像不提供财务基本面 —— 系统未接入定期报告数据，不会臆造营收、净利润或毛利率。以下为实时行情快照。_');
        L.push('');
        L.push('| 行情指标 | 当前数值 |');
        L.push('| --- | --- |');
        var F = pf.fundamentals || {};
        var fl2 = {
          peTtm: '市盈率 PE(TTM)', pb: '市净率 PB', totalCap: '总市值（亿元）', floatCap: '流通市值（亿元）',
          turnover: '换手率（%）', volumeRatio: '量比', position52: '区间分位（%）',
          drawdownFromHigh: '距区间高点（%）', atrPct: 'ATR 日均波动率（%）'
        };
        Object.keys(F).forEach(function (k) {
          if (k === 'source' || F[k] == null || F[k] === '') return;
          L.push('| ' + (fl2[k] || k) + ' | ' + F[k] + ' |');
        });
        L.push('| 数据源 | ' + (F.source || '实时行情') + ' |');
        L.push('');
      } else {
        L.push('**1. 财务基本面**：_该标的尚未导入财务数据，建议补充最新定期报告或调研数据。_');
        L.push('');
      }
      L.push('**2. 估值水平（实时）**');
      L.push('');
      L.push('| 估值指标 | 当前水平 | 参照基准 | 判读 |');
      L.push('| --- | --- | --- | --- |');
      var V = (pf && pf.valuation) || {};
      var refLow = V.fairPe ? V.fairPe[0] : null, refHigh = V.fairPe ? V.fairPe[1] : null;
      var peJudge = q.peTtm == null ? '—'
        : q.peTtm <= 0 ? '公司当前亏损，PE 不适用，需改用 PB 或 PS 判断'
          : refLow != null ? (q.peTtm < refLow ? '低于合理区间，安全边际抬升' : q.peTtm > refHigh ? '高于合理区间，估值透支风险' : '处于合理区间，估值中性')
            : '未提供参照区间，不做分位判断';
      L.push('| 市盈率 PE(TTM) | ' + (q.peTtm == null ? '—' : q.peTtm) + ' 倍 | ' + (refLow ? refLow + '-' + refHigh + ' 倍' : '—（未提供）') + ' | ' + peJudge + ' |');
      L.push('| 市净率 PB | ' + (q.pb == null ? '—' : q.pb) + ' 倍 | ' + (V.benchmark || '行业均值') + ' | — |');
      L.push('| 总市值 | ' + (q.totalCap ? q.totalCap + ' 亿元' : '—') + ' | 流通市值 ' + (q.floatCap ? q.floatCap + ' 亿元' : '—') + ' | — |');
      L.push('| 价格区间 | ' + ind.low52 + ' ~ ' + ind.high52 + ' 元 | 当前分位 ' + ind.position52 + '% | ' + (ind.position52 <= 20 ? '底部区域' : ind.position52 >= 80 ? '高位区域' : '中位区域') + ' |');
      L.push('');
      if (V.note) { L.push('> ' + V.note); L.push(''); }

      /* 三、经营与市占率拆解 */
      L.push('## 三、经营与市占率拆解');
      L.push('');
      if (hasProfile && pf.businessMix && pf.businessMix.length) {
        L.push('| 业务板块 | 收入占比 | 趋势 | 要点 |');
        L.push('| --- | --- | --- | --- |');
        pf.businessMix.forEach(function (b) { L.push('| ' + b.name + ' | ' + b.share + '% | ' + b.trend + ' | ' + b.note + ' |'); });
        L.push('');
      } else {
        L.push('_业务结构数据缺失，需补充公司年报/半年报的分部收入数据。_');
        L.push('');
      }
      var bears3 = signals.bear.slice(0, 5);
      if (bears3.length) {
        L.push('**经营与交易层面当前隐患（实时识别）：**');
        L.push('');
        bears3.forEach(function (b) { L.push('- 🟢 **' + b.name + '**：' + b.text + '（' + b.evidence + '）'); });
        L.push('');
      }

      /* 四、风险控制 */
      L.push('## 四、风险控制（Risk Consulting）');
      L.push('');
      if (hasProfile && pf.risks && pf.risks.length) pf.risks.forEach(function (r, i) { L.push((i + 1) + '. ' + r); });
      else L.push('1. _该标的尚未录入专项风险清单。_');
      L.push('');
      L.push('**实时风险度量：**');
      L.push('');
      L.push('- 波动率（ATR占价格比）：' + ind.atrPct + '%，' + (ind.atrPct > 5 ? '波动剧烈，仓位需相应下调' : ind.atrPct > 3 ? '波动偏高，注意控制单笔仓位' : '波动温和'));
      L.push('- 回撤（距区间高点）：' + pctStr(ind.drawdownFromHigh));
      if (plan.stopLoss) L.push('- 距止损位空间：' + f2(((ind.price - plan.stopLoss) / ind.price) * 100) + '%（止损位 ' + plan.stopLoss + ' 元）');
      L.push('');

      /* 五、筹码结构 */
      L.push('## 五、长线投资者：筹码结构与散户拥挤度');
      L.push('');
      if (hasProfile && pf.chips && !/待补充/.test(pf.chips)) L.push(pf.chips);
      else L.push('_股东户数、机构持仓、融资余额等筹码数据需从定期披露或数据终端补充。_');
      L.push('');

      /* 六、团队综合研判 */
      L.push('## 六、团队综合研判');
      L.push('');
      L.push('**好的一面：**');
      L.push('');
      var topBull = signals.bull.slice(0, 4);
      if (topBull.length) topBull.forEach(function (s) { L.push('- 🔴 ' + s.name + '：' + s.text); });
      else L.push('- 暂未识别到显著利多信号');
      L.push('');
      L.push('**坏的一面：**');
      L.push('');
      var topBear = signals.bear.slice(0, 4);
      if (topBear.length) topBear.forEach(function (s) { L.push('- 🟢 ' + s.name + '：' + s.text); });
      else L.push('- 暂未识别到显著利空信号');
      L.push('');
      L.push('**核心结论：** ' + (hasProfile && pf.verdictNote ? pf.verdictNote + ' ' : '') + '结合实时数据，当前综合评分 **' + scores.composite + '** 分，系统给出的操作结论为「**' + action.label + '**」——' + action.desc + '。');
      L.push('');

      /* 七、产业链与业绩兑现节奏 */
      L.push('## 七、产业链与业绩兑现节奏');
      L.push('');
      if (hasProfile && pf.catalysts && pf.catalysts.length && !/待补充/.test((pf.catalysts[0] && pf.catalysts[0].time) || '')) {
        L.push('| 时间节点 | 催化/交付内容 | 金额/规模 | 业绩影响 |');
        L.push('| --- | --- | --- | --- |');
        pf.catalysts.forEach(function (c) { L.push('| ' + c.time + ' | ' + c.event + ' | ' + c.amount + ' | ' + c.impact + ' |'); });
        L.push('');
        L.push('> 关键验证窗口：' + ((pf.catalysts[1] && pf.catalysts[1].time) || (pf.catalysts[0] && pf.catalysts[0].time) || '—') + ' —— 该节点的兑现程度将直接决定当前估值的切换方向。');
      } else {
        L.push('_业绩兑现节奏表需依据公司订单/产能/管线节点补充。_');
      }
      L.push('');

      /* 八、持仓攻略 */
      L.push('## 八、持仓攻略：策略建议与操作纪律');
      L.push('');
      L.push('### 1. 当前位置与结论');
      L.push('');
      L.push('| 项目 | 数值 |');
      L.push('| --- | --- |');
      L.push('| 最新价 | ' + f2(ind.price) + ' 元 |');
      if (pf && pf.cost) L.push('| 持仓成本 | ' + pf.cost + ' 元（' + (((ind.price - pf.cost) / pf.cost) * 100).toFixed(2) + '%） |');
      L.push('| 系统结论 | **' + action.label + '** |');
      L.push('| 综合评分 | ' + scores.composite + ' / 100 |');
      L.push('| 建议仓位上限 | 总资产的 ' + plan.positionLimitPct + '% |');
      L.push('');
      L.push('### 2. 交易计划');
      L.push('');
      L.push('| 类型 | 价位 | 说明 |');
      L.push('| --- | --- | --- |');
      if (plan.entry && plan.entry[0] != null) L.push('| 建仓区间 | ' + plan.entry[0] + ' ~ ' + plan.entry[1] + ' 元 | ' + (plan.fromProfile ? '来自投研报告给定的建仓区间' : '基于 ATR 波动率推算') + (plan.batchKind === 'exit' ? ' ⚠ 当前判定为不宜建仓，仅供回踩参考' : '') + ' |');
      L.push('| 第一目标位 | ' + plan.target1 + ' 元 | 距现价 ' + f2(((plan.target1 - ind.price) / ind.price) * 100) + '% |');
      L.push('| 第二目标位 | ' + plan.target2 + ' 元 | 距现价 ' + f2(((plan.target2 - ind.price) / ind.price) * 100) + '% |');
      L.push('| 止损位 | ' + plan.stopLoss + ' 元 | 距现价 ' + f2(((ind.price - plan.stopLoss) / ind.price) * 100) + '% |');
      L.push('| 硬止损位 | ' + plan.hardStop + ' 元 | 跌破无条件离场 |');
      L.push('| 盈亏比 | ' + (plan.riskReward ? plan.riskReward + ' : 1' : '不适用') + ' | ' + (plan.riskReward ? (plan.riskReward >= 2 ? '风险收益比良好' : plan.riskReward >= 1 ? '风险收益比一般' : '风险大于收益，不建议参与') : (plan.rrNote || '—')) + ' |');
      L.push('');
      if (pf && pf.takeProfit && pf.takeProfit.length) {
        L.push('**分档止盈纪律（源自投研文档）：**');
        L.push('');
        pf.takeProfit.forEach(function (t) { L.push('- **' + t.level + '（' + t.range[0] + '-' + t.range[1] + ' 元）**：' + t.note); });
        L.push('');
      }
      var exitKind = plan.batchKind === 'exit';
      L.push(exitKind ? '**仓位处置节奏（当前不宜建仓）：**' : plan.batchKind === 'conditional' ? '**条件性建仓节奏（需信号确认后执行）：**' : '**分批建仓节奏：**');
      L.push('');
      L.push('| ' + (exitKind ? '步骤' : '批次') + ' | 触发条件 | 处置比例 | 说明 |');
      L.push('| --- | --- | --- | --- |');
      plan.batches.forEach(function (b, i) { L.push('| 第 ' + (i + 1) + ' ' + (exitKind ? '步' : '批') + ' | ' + b.at + ' | ' + b.ratio + ' | ' + b.note + ' |'); });
      L.push('');
      L.push('**关键支撑 / 阻力位（实时计算）：**');
      L.push('');
      L.push('| 类型 | 价位 | 距现价 | 强度 |');
      L.push('| --- | --- | --- | --- |');
      plan.supports.slice(0, 4).forEach(function (s) { L.push('| 支撑 | ' + s.price + (s.label ? ' (' + s.label + ')' : '') + ' | ' + s.dist + '% | ' + '●'.repeat(Math.min(3, s.count || 1)) + ' |'); });
      plan.resistances.slice(0, 4).forEach(function (s) { L.push('| 阻力 | ' + s.price + (s.label ? ' (' + s.label + ')' : '') + ' | +' + s.dist + '% | ' + '●'.repeat(Math.min(3, s.count || 1)) + ' |'); });
      L.push('');

      L.push('### 3. 核心监控清单（利好 / 利空双向）');
      L.push('');
      if (a.monitorsSource === 'auto') {
        L.push('> 该标的尚未导入专项研报画像，以下为**自动清单**：由实时指标派生，每一项都带自动判定口径，判定为「看多 / 看空」的项会**实际参与综合评分**（监控面），不再只是展示。导入该股研报后会自动切换为专项清单。');
        L.push('');
      }
      L.push(monitorTable(a.monitors, a.monitorsSource, a.monitorSummary));
      L.push('');
      L.push('### 4. 实时信号明细（' + signals.all.length + ' 条）');
      L.push('');
      L.push(signalTable(signals.all.slice(0, 24)));
      L.push('');
      L.push('---');
      L.push('');
      L.push('*本报告由股海舆情 · 智能盯盘引擎于 ' + now.toLocaleString('zh-CN') + ' 自动生成。行情与轨道类指标数据来自腾讯财经公开接口（成交额口径为人民币），'
        + (pf && pf.auto
          ? '该标的未导入投研文档，画像与监控清单均由实时行情与 K 线自动派生，不含基本面与机构观点。'
          : '财务与业务数据来自用户提供的投研文档（' + (hasProfile ? pf.sourceDoc : '未提供') + '）。')
        + '算法移植自 StockSentry 开源项目，技术指标均为公开算法统计口径，可自行复算验证。*');
      L.push('');
      L.push('**免责声明：** 以上内容基于公开数据和量化分析，仅供参考，不构成投资建议。市场有风险，投资需谨慎。任何投资决策应结合个人风险承受能力、资金状况和投资目标独立判断，必要时咨询持牌专业机构。过往表现不预示未来收益。');
      return L.join('\n');
    }

    /* ---------------- 极简 Markdown → HTML（标题/表格/列表/加粗/引用/分隔线） ---------------- */
    function mdToHtml(md) {
      function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function inline(s) {
        var tokens = [];
        var t = String(s).replace(/%%(.+?)%%/g, function (_, x) { tokens.push(x); return '\u0000' + (tokens.length - 1) + '\u0000'; });
        t = esc(t)
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code>$1</code>');
        return t.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<span class="badge">' + esc(String(tokens[+i] == null ? '' : tokens[+i])) + '</span>'; });
      }
      var lines = String(md).split('\n'), out = [];
      var inTable = false, inList = false, inQuote = false;
      function closeAll() {
        if (inTable) { out.push('</tbody></table>'); inTable = false; }
        if (inList) { out.push('</ul>'); inList = false; }
        if (inQuote) { out.push('</blockquote>'); inQuote = false; }
      }
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (/^\|/.test(line)) {
          var cells = line.replace(/^\||\|$/g, '').split('|');
          for (var c = 0; c < cells.length; c++) cells[c] = cells[c].trim();
          var isSep = true;
          for (var d = 0; d < cells.length; d++) if (!/^:?-{2,}:?$/.test(cells[d])) { isSep = false; break; }
          if (isSep) continue;
          if (!inTable) {
            closeAll();
            out.push('<table><thead><tr>' + cells.map(function (x) { return '<th>' + inline(x) + '</th>'; }).join('') + '</tr></thead><tbody>');
            inTable = true;
          } else {
            out.push('<tr>' + cells.map(function (x) { return '<td>' + inline(x) + '</td>'; }).join('') + '</tr>');
          }
          continue;
        }
        if (inTable && !/^\|/.test(line)) { out.push('</tbody></table>'); inTable = false; }
        if (/^---+$/.test(line)) { closeAll(); out.push('<hr>'); continue; }
        if (!line) { closeAll(); continue; }
        var h = line.match(/^(#{1,4})\s+(.*)$/);
        if (h) { closeAll(); out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); continue; }
        if (/^>\s?/.test(line)) {
          if (!inQuote) { closeAll(); out.push('<blockquote>'); inQuote = true; }
          out.push('<p>' + inline(line.replace(/^>\s?/, '')) + '</p>');
          continue;
        }
        if (inQuote) { out.push('</blockquote>'); inQuote = false; }
        if (/^[-*]\s+/.test(line)) {
          if (!inList) { closeAll(); out.push('<ul>'); inList = true; }
          out.push('<li>' + inline(line.replace(/^[-*]\s+/, '')) + '</li>');
          continue;
        }
        if (inList) { out.push('</ul>'); inList = false; }
        out.push('<p>' + inline(line) + '</p>');
      }
      closeAll();
      return out.join('\n');
    }

    function standaloneHtml(title, body) {
      return '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8">\n'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        + '<title>' + title + '</title>\n<style>\n'
        + ':root{--bg:#f6f7f9;--card:#fff;--ink:#1c1f23;--muted:#6b7280;--line:#e5e7eb;--red:#c62828;--green:#2e7d32}\n'
        + '*{box-sizing:border-box}\n'
        + 'body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.75 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}\n'
        + '.wrap{max-width:940px;margin:0 auto;padding:40px 28px 80px;background:var(--card);min-height:100vh;box-shadow:0 0 0 1px var(--line)}\n'
        + 'h1{font-size:26px;margin:0 0 18px;padding-bottom:14px;border-bottom:3px solid var(--red)}\n'
        + 'h2{font-size:19px;margin:36px 0 14px;padding-left:11px;border-left:4px solid var(--red)}\n'
        + 'h3{font-size:16px;margin:24px 0 10px;color:#374151}\n'
        + 'h4{font-size:15px;margin:20px 0 8px}\n'
        + 'table{border-collapse:collapse;width:100%;margin:14px 0;font-size:13.5px}\n'
        + 'th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}\n'
        + 'th{background:#f3f4f6;font-weight:600;white-space:nowrap}\n'
        + 'tbody tr:nth-child(even){background:#fafafa}\n'
        + 'blockquote{margin:12px 0;padding:10px 16px;background:#f9fafb;border-left:3px solid #d1d5db;color:#4b5563;font-size:13.5px}\n'
        + 'blockquote p{margin:3px 0}\n'
        + 'code{background:#f3f4f6;padding:1px 5px;border-radius:4px;font-size:12.5px}\n'
        + 'hr{border:0;border-top:1px solid var(--line);margin:28px 0}\n'
        + 'ul{margin:10px 0;padding-left:22px}li{margin:5px 0}\n'
        + '.badge{display:inline-block;background:#eef2ff;color:#3730a3;padding:1px 9px;border-radius:99px;font-size:12px}\n'
        + 'strong{color:#111827}\np{margin:10px 0}\n'
        + '</style></head>\n<body><div class="wrap">' + body + '</div></body></html>';
    }

    /* ---------------- 图表序列对齐（尾部对齐，前补 null，下标与K线一一对应） ---------------- */
    function tailPad(arr, n) {
      var a = (arr && arr.length) ? arr : [];
      if (a.length >= n) return a.slice(-n);
      var pre = [];
      for (var i = 0; i < n - a.length; i++) pre.push(null);
      return pre.concat(a);
    }
    function buildChartSeries(ind, totalBars, chartBars) {
      function railsFull(side) {
        var ra = ind.rails;
        if (!ra || !ra.series || !ra.series[side]) return [];
        var s = ra.series[side], pre = [];
        for (var i = 0; i < Math.max(0, totalBars - s.length); i++) pre.push(null);
        return pre.concat(s);
      }
      var b = (ind.boll && ind.boll.series) ? ind.boll.series : { up: [], mid: [], dn: [] };
      return {
        bars: chartBars,
        boll: { up: tailPad(b.up, chartBars), mid: tailPad(b.mid, chartBars), dn: tailPad(b.dn, chartBars) },
        rails: { up: tailPad(railsFull('up'), chartBars), mid: tailPad(railsFull('mid'), chartBars), dn: tailPad(railsFull('dn'), chartBars) }
      };
    }

    function publicInd(ind) {
      return {
        price: ind.price, ma: ind.ma, macd: ind.macd, rsi: ind.rsi, rsiPrev: ind.rsiPrev, kdj: ind.kdj,
        boll: { up: ind.boll.up, mid: ind.boll.mid, dn: ind.boll.dn },
        bollInfo: ind.bollInfo ? { bandwidthPct: ind.bollInfo.bandwidthPct, bandwidthPctile: ind.bollInfo.bandwidthPctile, pctB: ind.bollInfo.pctB, state: ind.bollInfo.state, stateLabel: ind.bollInfo.stateLabel } : null,
        rails: ind.rails ? { dir: ind.rails.dir, slope20Pct: ind.rails.slope20Pct, up: ind.rails.up, mid: ind.rails.mid, dn: ind.rails.dn, pctChan: ind.rails.pctChan, widthPct: ind.rails.widthPct, bars: ind.rails.bars, nearUpper: ind.rails.nearUpper, nearLower: ind.rails.nearLower, reliable: ind.rails.reliable, k: ind.rails.k } : null,
        donchian: ind.donchian, channelVerdict: ind.channelVerdict,
        atr: ind.atr, atrPct: ind.atrPct, position52: ind.position52, high52: ind.high52, low52: ind.low52,
        high20: ind.high20, low20: ind.low20, returns: ind.returns, maArrangement: ind.maArrangement,
        keyLevels: ind.keyLevels, volRatioLocal: ind.volRatioLocal
      };
    }
    function publicProfile(p, quality) {
      if (!p) return null;
      return {
        name: p.name, tags: p.tags, thesis: p.thesis, moat: p.moat, valuation: p.valuation,
        levels: p.levels, cost: p.cost, takeProfit: p.takeProfit || [], catalysts: p.catalysts,
        businessMix: p.businessMix, monitors: p.monitors, fundamentals: p.fundamentals, chips: p.chips,
        risks: p.risks, verdictNote: p.verdictNote, sourceDoc: p.sourceDoc, reportDate: p.reportDate,
        profileQuality: quality, auto: !!p.auto, disclaimer: p.disclaimer || null
      };
    }

    /* ---------------- 主流程 ---------------- */
    function analyze(ctx) {
      var kline = ctx.kline || [];
      if (kline.length < 12) return { error: 'K线样本不足（需 ≥12 根日K），增强研判未生成' };
      var rawQuote = ctx.quote || {};
      var closes = kline.map(function (k) { return k.close; });
      var price = isNum(ctx.price) ? ctx.price : lastOf(closes);
      var ind = buildIndicators(kline, { price: price }, ctx.market);

      var q = {
        name: ctx.name, price: price, open: rawQuote.open, high: rawQuote.high, low: rawQuote.low,
        preClose: rawQuote.prevClose, changePct: ctx.changePct, volume: rawQuote.volume, amount: rawQuote.amount,
        turnover: rawQuote.turnover, volumeRatio: ind.volRatioLocal, peTtm: rawQuote.pe, pb: rawQuote.pb,
        totalCap: rawQuote.totalCap, floatCap: rawQuote.floatCap, amplitude: rawQuote.amplitude,
        limitUp: rawQuote.limitUp, limitDown: rawQuote.limitDown
      };

      var lib = (window.STOCK_PROFILES && window.STOCK_PROFILES.profiles) || {};
      var real = lib[ctx.code] || null;
      var isAuto = !real;
      var profile = real || synthesizeProfile({ ind: ind, quote: q, code: ctx.code, name: ctx.name, market: ctx.market });

      var mctx = { ind: ind, quote: q, flow: null, profile: profile, minutes: null };
      var monEval = evaluateMonitors(profile.monitors || [], mctx, { origin: isAuto ? 'monitor' : 'profile' });
      var signals = technicalRules(mctx).concat(channelRules(mctx)).concat(profileRules(mctx)).concat(monEval.signals);

      var techScore = scoreSignals(signals, function (s) { return s.origin === 'technical'; });
      var hasProfileSig = false, hasMonitorSig = false;
      for (var i = 0; i < signals.length; i++) {
        if (signals[i].origin === 'profile') hasProfileSig = true;
        if (signals[i].origin === 'monitor') hasMonitorSig = true;
      }
      var profileScore = hasProfileSig ? scoreSignals(signals, function (s) { return s.origin === 'profile'; }) : null;
      var monitorScore = hasMonitorSig ? scoreSignals(signals, function (s) { return s.origin === 'monitor'; }) : null;

      var quality = (real && real.profileQuality) || (real ? 'high' : 'auto');
      var wTech = quality === 'low' ? 0.75 : 0.45;
      var composite;
      if (real && profileScore != null) composite = clamp(Math.round(techScore * wTech + profileScore * (1 - wTech)), 2, 98);
      else if (monitorScore != null) composite = clamp(Math.round(techScore * 0.6 + monitorScore * 0.4), 2, 98);
      else composite = techScore;

      var action = decideAction({ composite: composite, techScore: techScore, profileScore: profileScore, ind: ind, profile: profile, signals: signals });
      if (!profile.cost) action = adaptForNoPosition(action);
      var plan = buildPlan(ind, profile, action.key);

      /* 盈亏比风控修正：目标空间不足以覆盖止损风险时，自动下调操作级别 */
      if (plan.riskReward != null && plan.riskReward < 1 && (action.key === 'BUY' || action.key === 'ADD')) {
        var prevLabel = action.label;
        var next = action.key === 'BUY' ? ACTIONS.ADD : ACTIONS.WATCH;
        action = assign({}, next, {
          reasons: action.reasons.concat(['【风控修正】当前盈亏比仅 ' + plan.riskReward + ' : 1（目标空间 ' + r2(((plan.target1 - ind.price) / ind.price) * 100) + '% 不足以覆盖 ' + plan.riskPct + '% 的止损风险），操作建议已由「' + prevLabel + '」自动下调为「' + next.label + '」，避免低赔率交易。']),
          confidence: Math.max(30, action.confidence - 18)
        });
        plan = buildPlan(ind, profile, action.key);
      }

      var all = signals.slice().sort(function (a, b) { return b.strength * b.weight - a.strength * a.weight; });
      var result = {
        ind: publicInd(ind),
        channelVerdict: ind.channelVerdict,
        signals: {
          all: all,
          bull: all.filter(function (s) { return s.side === 'bull'; }),
          bear: all.filter(function (s) { return s.side === 'bear'; }),
          neutral: all.filter(function (s) { return s.side === 'neutral'; })
        },
        scores: { composite: composite, technical: techScore, profile: profileScore, monitor: monitorScore },
        action: action,
        plan: plan,
        profile: publicProfile(profile, quality),
        monitors: monEval.rows,
        monitorsSource: isAuto ? 'auto' : 'profile',
        monitorSummary: summarizeMonitors(monEval.rows),
        chart: buildChartSeries(ind, kline.length, ctx.chartBars || kline.length)
      };
      result.reportMarkdown = buildReportMd(result, { name: ctx.name, code: ctx.code, market: ctx.market, quote: q, price: price, changePct: ctx.changePct });
      result.reportHtml = standaloneHtml(ctx.name + '（' + ctx.code + '）投研报告', mdToHtml(result.reportMarkdown));
      return result;
    }

    return { analyze: analyze, ACTIONS: ACTIONS, deriveLevels: deriveLevels, computeIndicators: buildIndicators };
  })();

  global.STOCK_DATA = {
    resolveStockByKeyword: resolveStockByKeyword,
    fetchAllFeeds: fetchAllFeeds,
    fetchGubaByCode: fetchGubaByCode,
    computeHotItems: computeHotItems,
    analyzeStock: analyzeStock,
    // 增强引擎直通入口（便于在浏览器控制台 / 单测中单独验证轨道研判、动作判定、报告与画像）
    analyzeEnhance: function (ctx) { return SENTRY.analyze(ctx); },
    ACTIONS: SENTRY.ACTIONS,
    parseGubaHtml: parseGubaHtml,
    formatTime: formatTime
  };
})(window);
