// GET /api/watchlist — 获取关注股票列表
// POST /api/watchlist — toggle 关注（body: {code, name}），已存在则取消，不存在则添加
// 返回：{ items: [{code, name}], added: boolean }

import { getWatchlist, saveWatchlist } from "./_shared.js";

export async function onRequestGet(context) {
  try {
    const items = await getWatchlist();
    return Response.json({ items });
  } catch (e) {
    return Response.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    let body = {};
    try { body = await context.request.json(); } catch (e) { /* 忽略解析错误 */ }
    if (!Array.isArray(body.items)) {
      return Response.json({ error: "items 必须是数组" }, { status: 400 });
    }
    // 清理 + 去重
    const seen = new Set();
    const items = body.items.filter(function (it) {
      if (!it || !/^\d{6}$/.test(String(it.code))) return false;
      if (seen.has(it.code)) return false;
      seen.add(it.code);
      return true;
    }).map(function (it) {
      return { code: String(it.code), name: String(it.name || it.code) };
    });
    await saveWatchlist(items);
    return Response.json({ items });
  } catch (e) {
    return Response.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
