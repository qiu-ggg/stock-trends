// GET /api/hot — 热点排行 Top 10
// 返回：{ updatedAt, items: [{ rank, keyword, heat, delta, mentions, platforms, sentiment, summary }] }

import { getDiscussionPool, computeHotItems, formatTime } from "./_shared.js";

export async function onRequestGet(context) {
  try {
    const pool = await getDiscussionPool();
    const items = await computeHotItems(pool);

    return Response.json({
      updatedAt: formatTime(new Date()),
      items,
    });
  } catch (e) {
    return Response.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
