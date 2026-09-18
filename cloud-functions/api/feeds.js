// GET /api/feeds?platform=all&limit=8&page=1&sort=heat&keyword=茅台
// platform=all 或具体平台名；sort=heat（热度）| time（时间）；page 从 1 开始
// 返回：{ items, total, page, pageSize, hasMore }

import { getDiscussionPool, normalizePlatformName, matchStockKeyword, fetchStockFeedsByKeyword } from "./_shared.js";

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const platform = url.searchParams.get("platform") || "all";
    const keyword = (url.searchParams.get("keyword") || "").trim();
    const sort = url.searchParams.get("sort") || "heat";

    let limit = parseInt(url.searchParams.get("limit") || "8", 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 8;
    if (limit > 50) limit = 50;

    let page = parseInt(url.searchParams.get("page") || "1", 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    const pool = await getDiscussionPool();

    let items = platform === "all"
      ? pool
      : pool.filter((it) => it.platform === normalizePlatformName(platform));

    // 关键词搜索：识别为股票则动态抓取该股股吧讨论，否则按内容过滤
    if (keyword) {
      const stockFeeds = await fetchStockFeedsByKeyword(keyword);
      if (stockFeeds.length > 0) {
        items = stockFeeds;
      } else {
        items = items.filter((it) => matchStockKeyword(`${it.title} ${it.content}`, keyword));
      }
    }

    // 排序：sort=time 按时间倒序，否则按热度倒序
    const sorted = items.slice().sort((a, b) => {
      if (sort === "time") {
        return String(b.publishedAt).localeCompare(String(a.publishedAt)) || (b.heat - a.heat);
      }
      return (b.heat - a.heat) || String(b.publishedAt).localeCompare(String(a.publishedAt));
    });

    const total = sorted.length;
    const start = (page - 1) * limit;
    const paged = sorted.slice(start, start + limit);

    return Response.json({
      items: paged,
      total,
      page,
      pageSize: limit,
      hasMore: start + limit < total,
    });
  } catch (e) {
    return Response.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
