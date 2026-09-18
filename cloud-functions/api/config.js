// GET /api/config — 读取数据源配置
// POST /api/config — 保存数据源配置（校验后写入 Blob）

import { getConfig, saveConfig, validateConfig, normalizeConfig } from "./_shared.js";

export async function onRequestGet(context) {
  try {
    const config = await getConfig();
    return Response.json(config);
  } catch (e) {
    return Response.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    let body;
    try {
      body = await context.request.json();
    } catch {
      return Response.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
    }

    const v = validateConfig(body);
    if (!v.ok) {
      return Response.json({ error: v.error }, { status: 400 });
    }

    const config = normalizeConfig(body);
    await saveConfig(config);

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
