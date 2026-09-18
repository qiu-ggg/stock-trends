// 内部共享模块：数据源拉取、演示数据加载、热点词频计算、Blob 读写。
// 被 hot.js / feeds.js / config.js 通过相对路径 import。
// 本文件不作为对外路由 —— 若被直接访问则返回 404。

import { getStore } from "@edgeone/pages-blob";

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

export const PLATFORMS = [
  { id: "douyin", name: "抖音", short: "dy" },
  { id: "xiaohongshu", name: "小红书", short: "xhs" },
  { id: "weibo", name: "微博", short: "wb" },
  { id: "xueqiu", name: "雪球", short: "xq" },
  { id: "eastmoney", name: "东方财富股吧", short: "gb" },
];

// 股票关键词表（约 30 个，用于热点词频统计）
export const STOCK_KEYWORDS = [
  "宁德时代", "贵州茅台", "比亚迪", "中芯国际", "腾讯控股", "隆基绿能",
  "东方财富", "招商银行", "中国平安", "五粮液", "美团", "小米集团",
  "京东方", "北方稀土", "赣锋锂业", "恒瑞医药", "迈瑞医疗", "科大讯飞",
  "三一重工", "海康威视", "紫金矿业", "通威股份", "片仔癀", "泸州老窖",
  "万科A", "中国中免", "立讯精密", "汇川技术", "长江电力", "中国神华",
];

const POSITIVE_WORDS = ["涨", "利好", "突破", "买入", "看多", "涨停"];
const NEGATIVE_WORDS = ["跌", "利空", "跌破", "卖出", "看空", "跌停"];

const STORE_NAME = "stock-config";
const CONFIG_KEY = "config";
const LAST_HOT_KEY = "last-hot";
const WATCHLIST_KEY = "watchlist";

// 东方财富真实抓取：热门股票（name=股票名, code=股吧代码, secid=行情接口 secid）
const EASTMONEY_STOCKS = [
  { name: "宁德时代", code: "300750", secid: "0.300750" },
  { name: "贵州茅台", code: "600519", secid: "1.600519" },
  { name: "比亚迪", code: "002594", secid: "0.002594" },
  { name: "中芯国际", code: "688981", secid: "1.688981" },
  { name: "五粮液", code: "000858", secid: "0.000858" },
  { name: "东方财富", code: "300059", secid: "0.300059" },
  { name: "隆基绿能", code: "601012", secid: "1.601012" },
  { name: "招商银行", code: "600036", secid: "1.600036" },
  { name: "中国平安", code: "601318", secid: "1.601318" },
];
const EASTMONEY_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

/** 股票关键词匹配：支持按公司名或股票代码搜索 */
export function matchStockKeyword(text, keyword) {
  const k = String(keyword || "").trim();
  if (!k) return true;
  const t = text || "";
  if (t.includes(k)) return true;
  const stock = EASTMONEY_STOCKS.find(
    (s) => s.code === k || s.name === k || s.name.includes(k) || (k.length >= 2 && s.name.includes(k))
  );
  if (stock) {
    return t.includes(stock.name) || t.includes(stock.code);
  }
  return false;
}

/** 股票代码映射表（用于搜索识别 + 动态抓取），覆盖 A股主流热门股 */
const STOCK_CODE_MAP = {
  // 白酒/食品/消费
  "贵州茅台": "600519", "五粮液": "000858", "泸州老窖": "000568", "山西汾酒": "600809",
  "洋河股份": "002304", "古井贡酒": "000596", "海天味业": "603288", "伊利股份": "600887",
  "双汇发展": "000895", "金龙鱼": "300999", "牧原股份": "002714", "温氏股份": "300498",
  "中国中免": "601888", "海大集团": "002311", "东鹏饮料": "605499",
  // 银行
  "招商银行": "600036", "工商银行": "601398", "建设银行": "601939", "农业银行": "601288",
  "中国银行": "601988", "兴业银行": "601166", "浦发银行": "600000", "平安银行": "000001",
  "宁波银行": "002142", "中信银行": "601998", "交通银行": "601328",
  // 保险/券商
  "中国平安": "601318", "中国人寿": "601628", "中国太保": "601601", "新华保险": "601336",
  "中信证券": "600030", "东方财富": "300059", "华泰证券": "601688", "国泰君安": "601211",
  "中金公司": "601995", "中信建投": "601066", "招商证券": "600999", "广发证券": "000776",
  // 医药
  "恒瑞医药": "600276", "迈瑞医疗": "300760", "药明康德": "603259", "爱尔眼科": "300015",
  "片仔癀": "600436", "云南白药": "000538", "智飞生物": "300122", "长春高新": "000661",
  "复星医药": "600196", "泰格医药": "300347", "凯莱英": "002821", "华兰生物": "002007",
  "以岭药业": "002603", "同仁堂": "600085",
  // 科技/半导体/互联网
  "中芯国际": "688981", "海康威视": "002415", "立讯精密": "002475", "科大讯飞": "002230",
  "京东方": "000725", "韦尔股份": "603501", "北方华创": "002371", "兆易创新": "603986",
  "中微公司": "688012", "澜起科技": "688008", "紫光国微": "002049", "闻泰科技": "600745",
  "歌尔股份": "002241", "蓝思科技": "300433", "中兴通讯": "000063", "三六零": "601360",
  "用友网络": "600588", "金山办公": "688111", "恒生电子": "600570", "工业富联": "601138",
  "浪潮信息": "000977", "中科曙光": "603019", "东方国信": "300166",
  // 新能源/锂电/光伏
  "宁德时代": "300750", "比亚迪": "002594", "隆基绿能": "601012", "通威股份": "600438",
  "阳光电源": "300274", "亿纬锂能": "300014", "天齐锂业": "002466", "赣锋锂业": "002460",
  "华友钴业": "603799", "汇川技术": "300124", "恩捷股份": "002812", "国轩高科": "002074",
  "晶科能源": "688223", "天合光能": "688599", "TCL中环": "002129", "福斯特": "603806",
  "三花智控": "002050",
  // 汽车
  "长城汽车": "601633", "长安汽车": "000625", "上汽集团": "600104", "广汽集团": "601238",
  "赛力斯": "601127", "潍柴动力": "000338", "福耀玻璃": "600660", "拓普集团": "601689",
  "德赛西威": "002920", "均胜电子": "600699",
  // 地产/建筑
  "万科A": "000002", "保利发展": "600048", "招商蛇口": "001979", "中国建筑": "601668",
  "中国中铁": "601390", "中国铁建": "601186", "中国交建": "601800", "中国电建": "601669",
  // 有色/能源/周期
  "紫金矿业": "601899", "北方稀土": "600111", "中国神华": "601088", "中国石油": "601857",
  "中国石化": "600028", "中国铝业": "601600", "洛阳钼业": "603993", "山东黄金": "600547",
  "陕西煤业": "601225", "中远海控": "601919", "宝钢股份": "600019", "万华化学": "600309",
  "恒力石化": "600346", "荣盛石化": "002493",
  // 家电
  "格力电器": "000651", "美的集团": "000333", "海尔智家": "600690", "海信家电": "000921",
  "苏泊尔": "002032", "老板电器": "002508", "石头科技": "688169",
  // 其他龙头
  "三一重工": "600031", "长江电力": "600900", "中国核电": "601985", "中国联通": "600050",
  "中国电信": "601728", "中国移动": "600941", "大秦铁路": "601006", "京沪高铁": "601816",
  "分众传媒": "002027", "顺丰控股": "002352", "中国中车": "601766", "徐工机械": "000425",
  "恒立液压": "601100", "中国广核": "003816", "华能国际": "600011", "国电南瑞": "600406",
  "中际旭创": "300308", "新易盛": "300502", "沪电股份": "002463",
  // 通信/光缆
  "中天科技": "600522", "亨通光电": "600487", "烽火通信": "600498", "长飞光纤": "601869",
  "光迅科技": "002281", "天孚通信": "300394", "太辰光": "300570",
  // 军工
  "中国卫星": "600118", "中国卫通": "601698", "航天电子": "600879", "中航沈飞": "600760",
  "中航西飞": "000768", "航发动力": "600893", "中国船舶": "600150", "中国重工": "601989",
  "光启技术": "002625", "高德红外": "002414", "中直股份": "600038", "航天电器": "002025",
  "中航光电": "002179", "菲利华": "300395",
  // 网络安全/软件
  "深信服": "300454", "奇安信": "688561", "启明星辰": "002439", "安恒信息": "688023",
  "网宿科技": "300017", "光环新网": "300383", "拓尔思": "300229", "太极股份": "002368",
};

/** 根据关键词识别股票（名称或代码），返回 { name, code } 或 null */
export function resolveStockByKeyword(keyword) {
  const k = String(keyword || "").trim();
  if (!k) return null;
  if (STOCK_CODE_MAP[k]) return { name: k, code: STOCK_CODE_MAP[k] };
  for (const [name, code] of Object.entries(STOCK_CODE_MAP)) {
    if (code === k) return { name, code };
  }
  for (const [name, code] of Object.entries(STOCK_CODE_MAP)) {
    if (name.includes(k) || (k.length >= 2 && k.includes(name))) return { name, code };
  }
  return null;
}

/** 用东财 suggest 接口动态查股票代码（按公司名/代码联想） */
export async function searchStockCode(keyword) {
  const k = String(keyword || "").trim();
  if (!k) return null;
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(k)}&type=14&count=3`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": EASTMONEY_UA,
          Accept: "application/json, text/plain, */*",
          Referer: "https://guba.eastmoney.com/",
        },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = await res.json();
      const list = data?.QuotationCodeTable?.Data || [];
      const aStock = list.find((s) => s.Classify === "AStock");
      const item = aStock || list[0];
      if (item && item.Code && item.Name) {
        return { name: item.Name, code: item.Code };
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // 忽略
  }
  return null;
}

/** 动态抓取指定股票的股吧讨论（搜索时按需补抓：先查内置表，再动态查代码） */
export async function fetchStockFeedsByKeyword(keyword) {
  let stock = resolveStockByKeyword(keyword);
  if (!stock) {
    stock = await searchStockCode(keyword);
  }
  if (!stock) return [];
  try {
    const url = `https://guba.eastmoney.com/list,${stock.code}.html`;
    const res = await fetchWithTimeout(url, 8000, "text/html");
    if (!res.ok) return [];
    const html = await res.text();
    const items = parseGubaHtml(html, stock);
    return items.slice(0, 30); // 最多取 30 条
  } catch {
    return [];
  }
}

const DEFAULT_CONFIG = {
  dataSources: PLATFORMS.map((p) => ({
    id: p.id,
    name: p.name,
    enabled: false,
    apiUrl: "",
    apiKey: "",
  })),
  autoRefresh: 60,
};

// ---------------------------------------------------------------------------
// 时间工具
// ---------------------------------------------------------------------------

function pad(n) {
  return String(n).padStart(2, "0");
}

/** 格式化为 "YYYY-MM-DD HH:mm"（本地时间） */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 将外部数据源提供的 publishedAt 尽量归一化为 "YYYY-MM-DD HH:mm" */
function formatPublishedAt(value) {
  if (!value) return "";
  if (typeof value === "number") return formatTime(new Date(value));
  const s = String(value).trim();
  if (!s) return "";
  const t = Date.parse(s.replace(" ", "T"));
  if (!isNaN(t)) return formatTime(new Date(t));
  return s;
}

// ---------------------------------------------------------------------------
// 情感判定（规则版）
// ---------------------------------------------------------------------------

export function sentimentOf(text) {
  const t = text || "";
  let pos = 0;
  let neg = 0;
  for (const w of POSITIVE_WORDS) if (t.includes(w)) pos++;
  for (const w of NEGATIVE_WORDS) if (t.includes(w)) neg++;
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

// ---------------------------------------------------------------------------
// 配置读写（Blob）
// ---------------------------------------------------------------------------

export async function getConfig() {
  try {
    const store = getStore(STORE_NAME); // 首次调用自动建 namespace
    const saved = await store.get(CONFIG_KEY, { type: "json" });
    if (saved && Array.isArray(saved.dataSources)) {
      return normalizeConfig(saved);
    }
  } catch (e) {
    // 读取失败（未绑定/未初始化等）回退默认配置
  }
  return normalizeConfig(DEFAULT_CONFIG);
}

export async function saveConfig(config) {
  const store = getStore(STORE_NAME);
  await store.setJSON(CONFIG_KEY, normalizeConfig(config));
}

/** 读取关注股票列表，返回 [{ code, name }] */
export async function getWatchlist() {
  try {
    const store = getStore(STORE_NAME);
    const saved = await store.get(WATCHLIST_KEY, { type: "json" });
    if (saved && Array.isArray(saved.items)) return saved.items;
  } catch (e) {
    // 读取失败回退空列表
  }
  return [];
}

/** 保存关注股票列表 */
export async function saveWatchlist(items) {
  const store = getStore(STORE_NAME);
  await store.setJSON(WATCHLIST_KEY, { items });
}

/** 校验请求体结构，返回 { ok, error? } */
export function validateConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "请求体必须是对象" };
  }
  if (!Array.isArray(input.dataSources)) {
    return { ok: false, error: "dataSources 必须是数组" };
  }
  for (const ds of input.dataSources) {
    if (!ds || typeof ds !== "object") {
      return { ok: false, error: "dataSources 中的每一项必须是对象" };
    }
    if (typeof ds.id !== "string" || !ds.id.trim()) return { ok: false, error: "dataSources[].id 必填" };
    if (typeof ds.name !== "string" || !ds.name.trim()) return { ok: false, error: "dataSources[].name 必填" };
    if (typeof ds.enabled !== "boolean") return { ok: false, error: "dataSources[].enabled 必须为布尔值" };
    if (typeof ds.apiUrl !== "string") return { ok: false, error: "dataSources[].apiUrl 必须为字符串" };
    if (typeof ds.apiKey !== "string") return { ok: false, error: "dataSources[].apiKey 必须为字符串" };
  }
  if (input.autoRefresh !== undefined && input.autoRefresh !== null) {
    const n = Number(input.autoRefresh);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "autoRefresh 必须为非负数字" };
  }
  return { ok: true };
}

/** 规范化配置：补齐字段、收敛 autoRefresh 到合理区间 */
export function normalizeConfig(input) {
  const dataSources = (Array.isArray(input?.dataSources) ? input.dataSources : []).map((ds) => ({
    id: String(ds?.id ?? ""),
    name: String(ds?.name ?? ""),
    enabled: Boolean(ds?.enabled),
    apiUrl: String(ds?.apiUrl ?? ""),
    apiKey: String(ds?.apiKey ?? ""),
  }));
  let autoRefresh = Number(input?.autoRefresh);
  if (!Number.isFinite(autoRefresh) || autoRefresh <= 0) autoRefresh = 60;
  if (autoRefresh < 5) autoRefresh = 5;
  if (autoRefresh > 3600) autoRefresh = 3600;
  const thsCookie = String(input?.thsCookie ?? "").trim();
  return { dataSources, autoRefresh, thsCookie };
}

// ---------------------------------------------------------------------------
// 数据源拉取
// ---------------------------------------------------------------------------

function shortOfPlatform(platform) {
  const found = PLATFORMS.find((p) => p.name === platform || p.id === platform);
  return found ? found.short : "src";
}

/**
 * 平台名归一化：把 id（douyin/eastmoney）、short（dy/gb）、中文名（抖音/东方财富股吧）
 * 统一映射回中文名，供 feeds 平台筛选等场景使用。
 */
export function normalizePlatformName(input) {
  if (!input) return input;
  const k = String(input).toLowerCase().trim();
  const found = PLATFORMS.find((p) =>
    p.id === k || p.short === k || p.name === input || p.name.toLowerCase() === k
  );
  return found ? found.name : input;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** 将外部数据源返回的原始条目规整为统一 feed 结构 */
function normalizeExternalItem(raw, source) {
  const platform = String(raw?.platform || source?.name || "未知");
  const title = String(raw?.title || "");
  const content = String(raw?.content || "");
  const author = String(raw?.author || "匿名");
  const heat = Number(raw?.heat) || 0;
  const id = String(raw?.id || `${shortOfPlatform(platform)}-${hashString(title + content)}`);
  return {
    id,
    platform,
    title,
    content,
    author,
    heat,
    publishedAt: formatPublishedAt(raw?.publishedAt),
    sentiment: sentimentOf(`${title} ${content}`),
  };
}

/** 拉取所有启用的数据源，失败源跳过，不影响其他源 */
export async function fetchDataSources(config) {
  const enabled = (config?.dataSources || []).filter((ds) => ds && ds.enabled && ds.apiUrl);
  if (enabled.length === 0) return [];

  const results = await Promise.all(
    enabled.map(async (ds) => {
      try {
        const headers = { Accept: "application/json" };
        if (ds.apiKey) headers.Authorization = `Bearer ${ds.apiKey}`;
        const res = await fetch(ds.apiUrl, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        return items.map((it) => normalizeExternalItem(it, ds));
      } catch (e) {
        // 跳过失败源
        return [];
      }
    })
  );
  return results.flat();
}

// ---------------------------------------------------------------------------
// 东方财富真实抓取：股吧讨论 + 实时行情
// ---------------------------------------------------------------------------

/** 带超时与 UA 的 fetch */
async function fetchWithTimeout(url, timeoutMs = 8000, accept = "*/*") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": EASTMONEY_UA, Accept: accept },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** 把股吧 "MM-DD HH:mm" 时间转成 "YYYY-MM-DD HH:mm"（补当年年份） */
function normalizeGubaTime(s) {
  const m = String(s || "").match(/(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!m) return "";
  const year = new Date().getFullYear();
  return `${year}-${m[1]}-${m[2]} ${m[3]}:${m[4]}`;
}

/** 解析股吧列表页 HTML，提取讨论条目（标题/作者/回复数/链接/时间） */
function parseGubaHtml(html, stock) {
  const anchors = [...html.matchAll(/<a\s[^>]*?(?:data-postid="(\d+)"|href="\/news,[^"]*,(\d+)\.html")[^>]*>([^<]+?)<\/a>/g)];
  const authors = [...html.matchAll(/<a[^>]*href="\/\/i\.eastmoney\.com\/[^"]*"[^>]*>([^<]+)<\/a>/g)];
  const replies = [...html.matchAll(/<div class="reply">(\d+)<\/div>/g)];
  const updates = [...html.matchAll(/class="update">([^<]+)<\/div>/g)];

  const items = [];
  const n = Math.min(anchors.length, authors.length, replies.length);
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const fullTag = anchors[i][0];
    const postId = anchors[i][1] || anchors[i][2];
    const title = (anchors[i][3] || "").trim();
    if (!title) continue;
    const author = (authors[i]?.[1] || "").trim() || "股友";
    const replyCount = parseInt(replies[i]?.[1] || "0", 10) || 0;

    // 提取帖子链接，兼容 // 相对协议、/ 相对路径、完整 URL 三种形式
    const hrefMatch = fullTag.match(/href="([^"]+)"/);
    let postUrl = "";
    if (hrefMatch) {
      const h = hrefMatch[1];
      if (h.startsWith("//")) postUrl = "https:" + h;
      else if (h.startsWith("/")) postUrl = "https://guba.eastmoney.com" + h;
      else postUrl = h;
    }
    if (!postUrl) postUrl = `https://guba.eastmoney.com/news,${stock.code},${postId}.html`;

    items.push({
      id: `guba-${postId}`,
      platform: "东方财富股吧",
      title,
      content: `【${stock.name}】${title}`,
      author,
      heat: replyCount * 100 + 50,
      publishedAt: normalizeGubaTime(updates[i]?.[1]) || formatTime(new Date(now - i * 300000)),
      sentiment: sentimentOf(title),
      url: postUrl,
    });
  }
  return items;
}

/** 抓取东方财富股吧讨论（多只热门股票） */
async function fetchEastmoneyFeeds() {
  const feeds = [];
  for (const stock of EASTMONEY_STOCKS) {
    try {
      const url = `https://guba.eastmoney.com/list,${stock.code}.html`;
      const res = await fetchWithTimeout(url, 8000, "text/html");
      if (!res.ok) continue;
      const html = await res.text();
      const items = parseGubaHtml(html, stock);
      feeds.push(...items.slice(0, 15)); // 每只股票取前 15 条，保证分页有足够内容
      if (feeds.length >= 100) break;
    } catch {
      // 跳过失败股票
    }
  }
  return feeds;
}

/** 去掉 HTML 标签，还原常见实体 */
function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

/** 解析同花顺论股堂 getPostList 返回的 HTML 片段 */
function parseThsHtml(html, stockName, stockCode) {
  const items = [];
  const posts = [...html.matchAll(/<li[^>]*post-single[\s\S]*?<\/li>/g)];
  const now = Date.now();
  for (let i = 0; i < posts.length; i++) {
    const block = posts[i][0];
    const pidMatch = block.match(/data-pid="(\d+)"/);
    if (!pidMatch) continue;
    const hrefMatch = block.match(/<a[^>]*href="([^"]*)"[^>]*>/);
    const titleMatch = block.match(/class="[^"]*post-title[^"]*"[^>]*>([\s\S]*?)<\//);
    const contentMatch = block.match(/class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\//);
    const title = stripHtml(titleMatch?.[1] || "");
    const content = stripHtml(contentMatch?.[1] || "");
    if (!title && !content) continue;
    let url = hrefMatch ? hrefMatch[1] : "";
    if (url.startsWith("//")) url = "https:" + url;
    else if (url.startsWith("/")) url = "https://t.10jqka.com.cn" + url;
    if (!url) url = `https://t.10jqka.com.cn/pid_${stockCode}/`;
    items.push({
      id: `ths-${pidMatch[1]}`,
      platform: "同花顺",
      title: title || content.slice(0, 30),
      content: content || title,
      author: "同花顺股友",
      heat: 100 + ((parseInt(pidMatch[1], 10) || 0) % 800),
      publishedAt: formatTime(new Date(now - i * 240000)),
      sentiment: sentimentOf(`${title} ${content}`),
      url,
    });
  }
  return items;
}

/** 抓取同花顺论股堂讨论（需用户配置登录 Cookie） */
async function fetchThsFeeds(cookie) {
  const hexinV = (cookie.match(/v=([^;]+)/) || [])[1] || "";
  const headers = {
    "User-Agent": EASTMONEY_UA,
    Accept: "application/json, text/plain, */*",
    Referer: "https://t.10jqka.com.cn/",
  };
  if (cookie) headers["Cookie"] = cookie.trim();
  if (hexinV) headers["hexin-v"] = hexinV.trim();

  const feeds = [];
  for (const stock of EASTMONEY_STOCKS) {
    try {
      const url = `https://t.10jqka.com.cn/newcircle/post/getPostList/?stockcode=${stock.code}&page=1&limit=5`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.errorCode !== 0 && data?.errorCode !== "0") continue; // 未登录或出错
      const html = data?.result?.html || "";
      if (!html) continue;
      const items = parseThsHtml(html, stock.name, stock.code);
      feeds.push(...items.slice(0, 3)); // 每只股票取前 3 条
      if (feeds.length >= 18) break;
    } catch {
      // 跳过失败股票
    }
  }
  return feeds;
}

/** 抓取东方财富实时行情（批量），返回 { 股票名: { changePct, price, code } } */
async function fetchEastmoneyQuotes() {
  const secids = EASTMONEY_STOCKS.map((s) => s.secid).join(",");
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secids}&fields=f2,f3,f12,f14`;
  const res = await fetchWithTimeout(url, 8000, "application/json");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const diff = data?.data?.diff;
  const list = Array.isArray(diff) ? diff : [];
  const map = {};
  for (const d of list) {
    const name = d?.f14;
    if (!name) continue;
    map[name] = {
      code: d?.f12 ?? "",
      price: d?.f2 ?? 0,
      changePct: typeof d?.f3 === "number" ? d.f3 / 100 : 0, // -116 → -1.16
    };
  }
  return map;
}

// ---------------------------------------------------------------------------
// 演示数据（内置，保证开箱即用；data/demo-feeds.json 为其等价副本）
// ---------------------------------------------------------------------------

const DEMO_FEEDS = [
  { id: "dy-001", platform: "抖音", title: "宁德时代又涨停了，新能源龙头要起飞", content: "宁德时代今天强势涨停，带动整个锂电板块上涨，宁德时代产业链全面爆发，利好不断，坚定看好宁德时代长期价值。", author: "股海老船长", heat: 12800, minutesAgo: 8 },
  { id: "dy-002", platform: "抖音", title: "比亚迪销量再创新高，月销破30万", content: "比亚迪销量再创新高，海外市场持续突破，比亚迪品牌向上，看多比亚迪后市表现。", author: "新能源观察员", heat: 9800, minutesAgo: 15 },
  { id: "dy-003", platform: "抖音", title: "中芯国际获大基金增持", content: "中芯国际获大基金增持，国产替代逻辑强化，中芯国际突破关键压力位。", author: "半导体老王", heat: 8600, minutesAgo: 22 },
  { id: "dy-004", platform: "抖音", title: "小米集团汽车业务超预期", content: "小米集团汽车交付超预期，小米集团股价突破前高，看多小米集团。", author: "科技前线", heat: 6600, minutesAgo: 25 },
  { id: "dy-005", platform: "抖音", title: "泸州老窖高端白酒稳增长", content: "泸州老窖高端化持续推进，泸州老窖业绩稳增长，看多泸州老窖。", author: "白酒大咖", heat: 4700, minutesAgo: 65 },

  { id: "xhs-001", platform: "小红书", title: "姐妹们，贵州茅台跌了要不要抄底", content: "贵州茅台最近跌了不少，估值回到合理区间，长期看贵州茅台还是核心资产，跌出机会。", author: "理财小鹿", heat: 7200, minutesAgo: 5 },
  { id: "xhs-002", platform: "小红书", title: "五粮液今天逆势上涨", content: "五粮液今天逆势上涨，白酒板块企稳，五粮液业绩稳健，买入信号出现。", author: "喝酒吃肉", heat: 6100, minutesAgo: 30 },
  { id: "xhs-003", platform: "小红书", title: "腾讯控股回购力度加大", content: "腾讯控股持续回购，港股互联网回暖，腾讯控股突破压力位，看多腾讯控股。", author: "港股小能手", heat: 8400, minutesAgo: 45 },
  { id: "xhs-004", platform: "小红书", title: "京东方面板涨价周期来了", content: "京东方面板价格回暖，京东方业绩拐点临近，买入京东方。", author: "面板爱好者", heat: 4900, minutesAgo: 48 },
  { id: "xhs-005", platform: "小红书", title: "片仔癀涨价带动业绩", content: "片仔癀提价落地，片仔癀业绩弹性大，利好片仔癀。", author: "中药爱好者", heat: 4300, minutesAgo: 75 },

  { id: "wb-001", platform: "微博", title: "隆基绿能光伏龙头被错杀", content: "隆基绿能今天跌破前低，光伏行业利空出尽，隆基绿能基本面没变，中线看多隆基绿能。", author: "光伏老兵", heat: 6900, minutesAgo: 12 },
  { id: "wb-002", platform: "微博", title: "东方财富业绩预告亮眼", content: "东方财富业绩预告亮眼，券商板块异动，东方财富涨停在即，买入东方财富。", author: "券商小当家", heat: 7500, minutesAgo: 20 },
  { id: "wb-003", platform: "微博", title: "中国平安估值修复行情", content: "中国平安估值修复，保险板块迎来利好，中国平安突破年线，看多中国平安。", author: "保险研究员", heat: 5600, minutesAgo: 50 },
  { id: "wb-004", platform: "微博", title: "迈瑞医疗医疗器械龙头稳", content: "迈瑞医疗海外市场扩张，迈瑞医疗业绩稳健，利好迈瑞医疗。", author: "医疗器械观察", heat: 5400, minutesAgo: 33 },
  { id: "wb-005", platform: "微博", title: "中国中免免税复苏", content: "中国中免免税业务复苏，中国中免突破平台，利好中国中免。", author: "消费观察", heat: 4400, minutesAgo: 70 },

  { id: "xq-001", platform: "雪球", title: "招商银行深度分析：零售之王被低估", content: "招商银行零售业务护城河深厚，招行股息率诱人，长期买入招商银行。", author: "价值投资笔记", heat: 9100, minutesAgo: 10 },
  { id: "xq-002", platform: "雪球", title: "赣锋锂业跌停，锂价见底了吗", content: "赣锋锂业今日跌停，锂价持续下跌，利空仍在，短期看空赣锋锂业。", author: "锂电分析师", heat: 5800, minutesAgo: 35 },
  { id: "xq-003", platform: "雪球", title: "美团回购与出海双轮驱动", content: "美团持续回购，出海业务加速，美团突破前高，买入美团。", author: "互联网老兵", heat: 6700, minutesAgo: 60 },
  { id: "xq-004", platform: "雪球", title: "科大讯飞大模型商业化提速", content: "科大讯飞星火大模型商业化提速，科大讯飞突破平台，看多科大讯飞。", author: "AI观察者", heat: 7800, minutesAgo: 16 },
  { id: "xq-005", platform: "雪球", title: "紫金矿业金价创新高", content: "紫金矿业受益金价创新高，紫金矿业业绩大增，看多紫金矿业。", author: "黄金猎手", heat: 6200, minutesAgo: 28 },

  { id: "gb-001", platform: "东方财富股吧", title: "北方稀土稀土价格暴涨", content: "北方稀土受稀土价格暴涨利好，业绩弹性大，北方稀土涨停，看多北方稀土。", author: "稀土之王", heat: 8800, minutesAgo: 18 },
  { id: "gb-002", platform: "东方财富股吧", title: "恒瑞医药创新药出海里程碑", content: "恒瑞医药创新药出海获批，恒瑞医药突破平台，利好不断，买入恒瑞医药。", author: "医药猎手", heat: 7200, minutesAgo: 40 },
  { id: "gb-003", platform: "东方财富股吧", title: "三一重工工程机械回暖", content: "三一重工海外订单增长，工程机械周期回暖，三一重工看多。", author: "机械狂人", heat: 5200, minutesAgo: 55 },
  { id: "gb-004", platform: "东方财富股吧", title: "海康威视安防龙头估值低", content: "海康威视估值处于低位，海康威视业绩稳健，买入海康威视。", author: "安防研究员", heat: 5100, minutesAgo: 42 },
  { id: "gb-005", platform: "东方财富股吧", title: "通威股份光伏硅料龙头", content: "通威股份硅料成本优势明显，通威股份止跌企稳，买入通威股份。", author: "光伏专家", heat: 4600, minutesAgo: 58 },
];

/** 加载演示数据，publishedAt 按相对当前时间生成，避免过期日期 */
export function loadDemoFeeds() {
  const now = Date.now();
  return DEMO_FEEDS.map((raw) => ({
    id: raw.id,
    platform: raw.platform,
    title: raw.title,
    content: raw.content,
    author: raw.author,
    heat: raw.heat,
    publishedAt: formatTime(new Date(now - (raw.minutesAgo || 0) * 60 * 1000)),
    sentiment: sentimentOf(`${raw.title} ${raw.content}`),
  }));
}

// ---------------------------------------------------------------------------
// 讨论池：合并所有数据源（未配置则回退演示数据），去重
// ---------------------------------------------------------------------------

export async function getDiscussionPool() {
  const config = await getConfig();
  const fetched = await fetchDataSources(config);

  const pool = [...fetched];

  // 东方财富股吧（无需登录，始终尝试抓取）
  try {
    const eastmoney = await fetchEastmoneyFeeds();
    pool.push(...eastmoney);
  } catch {
    // 忽略，回退演示数据
  }

  // 同花顺论股堂（需用户配置登录 Cookie）
  if (config.thsCookie) {
    try {
      const ths = await fetchThsFeeds(config.thsCookie);
      pool.push(...ths);
    } catch {
      // 忽略
    }
  }

  if (pool.length === 0) {
    pool.push(...loadDemoFeeds());
  }

  // 去重（platform + title 作为主键）
  const seen = new Map();
  for (const item of pool) {
    const key = `${item.platform}|${item.title}`;
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// 热点词频计算
// ---------------------------------------------------------------------------

function countOccurrences(text, kw) {
  let count = 0;
  let idx = text.indexOf(kw);
  while (idx !== -1) {
    count++;
    idx = text.indexOf(kw, idx + kw.length);
  }
  return count;
}

function dominantSentiment(sent) {
  const { positive, negative, neutral } = sent;
  if (positive > negative && positive >= neutral) return "positive";
  if (negative > positive && negative >= neutral) return "negative";
  return "neutral";
}

function simulateDelta(keyword) {
  let h = 0;
  for (let i = 0; i < keyword.length; i++) h = (h * 31 + keyword.charCodeAt(i)) >>> 0;
  const base = (h % 2000) / 100 - 10; // -10 .. +10
  const wobble = Math.sin(Date.now() / 120000 + h) * 3; // 随时间轻微波动
  return Math.round((base + wobble) * 10) / 10;
}

async function readLastHot() {
  try {
    const store = getStore(STORE_NAME);
    const data = await store.get(LAST_HOT_KEY, { type: "json" });
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

async function saveLastHot(map) {
  try {
    const store = getStore(STORE_NAME);
    await store.setJSON(LAST_HOT_KEY, map);
  } catch {
    // 忽略持久化失败，不影响热点返回
  }
}

/** 基于讨论池做词频统计，返回 Top 10 热点项 */
export async function computeHotItems(pool) {
  const stats = new Map();

  for (const item of pool) {
    const text = `${item.title || ""} ${item.content || ""}`;
    const heat = Number(item.heat) || 0;
    for (const kw of STOCK_KEYWORDS) {
      const count = countOccurrences(text, kw);
      if (count === 0) continue;

      let s = stats.get(kw);
      if (!s) {
        s = {
          keyword: kw,
          mentions: 0,
          score: 0,
          heatSum: 0,
          platforms: new Set(),
          sent: { positive: 0, negative: 0, neutral: 0 },
        };
        stats.set(kw, s);
      }

      s.mentions += count;
      s.heatSum += heat;
      s.score += count * 1000 + heat; // 出现次数加权 + 该条热度
      s.platforms.add(item.platform);
      s.sent[sentimentOf(text)] += count;
    }
  }

  const ranked = [...stats.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const prev = await readLastHot();
  // 抓真实行情（失败则回退上轮热度差/模拟）
  let quotes = {};
  try {
    quotes = await fetchEastmoneyQuotes();
  } catch {
    quotes = {};
  }

  const current = {};

  const items = ranked.map((s, idx) => {
    const heat = Math.round(s.score);
    const prevHeat = prev[s.keyword];
    const quote = quotes[s.keyword];
    let delta;
    if (quote && typeof quote.changePct === "number" && !Number.isNaN(quote.changePct)) {
      delta = Math.round(quote.changePct * 100) / 100; // 真实涨跌幅，如 -1.16
    } else if (typeof prevHeat === "number" && prevHeat > 0) {
      delta = Math.round(((heat - prevHeat) / prevHeat) * 1000) / 10;
    } else {
      delta = simulateDelta(s.keyword);
    }
    current[s.keyword] = heat;

    return {
      rank: idx + 1,
      keyword: s.keyword,
      heat,
      delta,
      mentions: s.mentions,
      platforms: [...s.platforms],
      sentiment: dominantSentiment(s.sent),
      summary: "",
    };
  });

  await saveLastHot(current);
  return items;
}

// ---------------------------------------------------------------------------
// 若本文件被当作路由直接访问，返回 404
// ---------------------------------------------------------------------------

export function onRequest() {
  return Response.json({ error: "Not found" }, { status: 404 });
}
