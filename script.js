/* ===== 股海舆情 · 前端逻辑 ===== */
(function () {
  'use strict';

  /* ---------- 平台元数据（id 与后端 _shared.js 的 PLATFORMS 保持一致） ---------- */
  const PLATFORMS = [
    { id: 'douyin',      name: '抖音',         icon: '🎵', color: '#25f4ee', alias: ['douyin', '抖音', 'dy', '抖音短视频'] },
    { id: 'xiaohongshu', name: '小红书',       icon: '📕', color: '#ff4d6d', alias: ['xiaohongshu', '小红书', 'xhs', 'redbook', 'red'] },
    { id: 'weibo',       name: '微博',         icon: '🔶', color: '#ff9f1c', alias: ['weibo', '微博', 'wb', '新浪微博'] },
    { id: 'xueqiu',      name: '雪球',         icon: '❄️', color: '#4da3ff', alias: ['xueqiu', '雪球', 'xq'] },
    { id: 'eastmoney',   name: '东方财富股吧', icon: '📊', color: '#e8452c', alias: ['eastmoney', 'guba', '东方财富', '东方财富股吧', '股吧', 'gb'] },
    { id: 'tonghuashun', name: '同花顺',       icon: '🦉', color: '#e8452c', alias: ['tonghuashun', '同花顺', 'ths', '10jqka', '论股堂'] }
  ];

  /* ---------- 状态 ---------- */
  const state = {
    platform: 'all', // 'all' 或平台中文名
    keyword: '',     // 搜索关键词（公司名或股票代码）
    page: 1,         // 当前页码
    sort: 'time',    // 排序方式：time（默认，最新在前）| heat
    detailStock: '', // 详情页股票名
    detailPage: 1,
    detailSort: 'time',
    lastHot: null,
    lastFeeds: null,
    config: null,
    autoTimer: null
  };

  /* ---------- 工具函数 ---------- */
  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatHeat(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    n = Number(n);
    if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿';
    if (n >= 1e4) return (n / 1e4).toFixed(2) + '万';
    return String(Math.round(n));
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // 后端 delta 为百分比（如 12.3 表示 +12.3%），数字统一补 % 与正负号
  function deltaInfo(delta) {
    if (delta == null || delta === '') return { text: '—', cls: 'flat' };
    const n = Number(delta);
    if (!isNaN(n) && String(delta).trim() !== '') {
      const cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
      const sign = n > 0 ? '+' : '';
      return { text: sign + n.toFixed(1) + '%', cls: cls };
    }
    const s = String(delta).trim();
    const up = /[+＋涨↑]/.test(s);
    const down = /[-－跌↓]/.test(s);
    return { text: s, cls: up ? 'up' : down ? 'down' : 'flat' };
  }

  function sentimentInfo(s) {
    const v = String(s == null ? '' : s).toLowerCase().trim();
    if (['positive', '看涨', '涨', '利好', 'pos', 'bullish', '看多'].indexOf(v) >= 0) {
      return { label: '看涨', cls: 'positive' };
    }
    if (['negative', '看跌', '跌', '利空', 'neg', 'bearish', '看空'].indexOf(v) >= 0) {
      return { label: '看跌', cls: 'negative' };
    }
    return { label: '中性', cls: 'neutral' };
  }

  function resolvePlatform(key) {
    if (!key) return null;
    const k = String(key).toLowerCase().trim();
    return PLATFORMS.find(function (p) {
      return p.id === k || p.name === k || p.alias.indexOf(k) >= 0;
    }) || null;
  }

  function setSpinning(id, on) {
    const el = $(id);
    if (!el) return;
    el.classList.toggle('spinning', on);
    el.disabled = on;
  }

  function showEmpty(key) { $(key + '-empty').classList.remove('hidden'); }
  function hideEmpty(key) { $(key + '-empty').classList.add('hidden'); }
  function showError(id, msg) {
    const el = $(id);
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function hideError(id) { $(id).classList.add('hidden'); }

  function showConfigStatus(msg, cls) {
    const el = $('config-status');
    el.textContent = msg || '';
    el.className = 'config-status' + (cls ? ' ' + cls : '');
  }

  /* ---------- 热点排行 ---------- */

  function renderHot(data) {
    const list = $('hot-list');
    const items = data.items || [];
    if (!items.length) {
      list.innerHTML = '';
      showEmpty('hot');
      return;
    }
    hideEmpty('hot');
    list.innerHTML = items.map(function (item) {
      const rank = item.rank != null ? item.rank : 0;
      const rankCls = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
      const d = deltaInfo(item.delta);
      const senti = sentimentInfo(item.sentiment);
      const summary = item.summary
        ? esc(item.summary)
        : '<span class="empty-summary">暂无 AI 摘要</span>';
      const platforms = (item.platforms || []).map(resolvePlatform).filter(Boolean)
        .map(function (p) { return '<span class="tag">' + p.icon + ' ' + esc(p.name) + '</span>'; })
        .join('');
      const mentions = item.mentions != null
        ? '<span class="hot-mentions">提及 ' + formatHeat(item.mentions) + '</span>'
        : '';
      return '' +
        '<div class="hot-card">' +
          '<div class="hot-rank ' + rankCls + '">' + esc(rank) + '</div>' +
          '<div class="hot-body">' +
            '<div class="hot-head">' +
              '<span class="hot-keyword" data-keyword="' + esc(item.keyword) + '">' + esc(item.keyword) + '</span>' +
              '<div class="hot-metrics">' +
                '<span class="hot-heat">🔥 ' + formatHeat(item.heat) + '</span>' +
                '<span class="hot-delta ' + d.cls + '">' + d.text + '</span>' +
                '<span class="sentiment ' + senti.cls + '">' + senti.label + '</span>' +
              '</div>' +
            '</div>' +
            '<p class="hot-summary">' + summary + '</p>' +
            '<div class="hot-foot">' +
              '<div class="hot-platforms">' + platforms + '</div>' +
              mentions +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function updateTime(ts) {
    const el = $('update-time');
    const dd = $('hot-dropdown-time');
    let text;
    if (!ts) {
      text = '刚刚更新';
    } else {
      const d = new Date(ts);
      text = isNaN(d.getTime()) ? '更新于 ' + esc(String(ts)) : '更新于 ' + d.toLocaleString('zh-CN', { hour12: false });
    }
    if (el) el.textContent = text;
    if (dd) dd.textContent = text;
  }

  async function fetchHot() {
    setSpinning('btn-hot', true);
    try {
      const res = await fetch('/api/hot');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.lastHot = data;
      renderHot(data);
      updateTime(data.updatedAt);
      hideError('hot-error');
    } catch (e) {
      showError('hot-error', '热点数据加载失败：' + esc(e.message));
      if (!state.lastHot) showEmpty('hot');
    } finally {
      setSpinning('btn-hot', false);
    }
  }

  /* ---------- 讨论内容 feed ---------- */
  function renderFilter() {
    const box = $('feed-filter');
    const chips = [{ value: 'all', label: '全部', icon: '🌐' }].concat(
      PLATFORMS.map(function (p) { return { value: p.name, label: p.name, icon: p.icon }; })
    );
    box.innerHTML = chips.map(function (c) {
      return '<button class="filter-chip ' + (c.value === state.platform ? 'active' : '') + '" data-platform="' + esc(c.value) + '">' + c.icon + ' ' + esc(c.label) + '</button>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.filter-chip'), function (btn) {
      btn.addEventListener('click', function () {
        state.platform = btn.dataset.platform;
        state.page = 1;
        renderFilter();
        fetchFeeds();
      });
    });
  }

  function renderFeedItem(item) {
    const p = resolvePlatform(item.platform) || { name: item.platform || '未知', icon: '🌐', color: '#64748b' };
    const senti = sentimentInfo(item.sentiment);
    const link = item.url ? item.url : '';
    const titleHtml = link
      ? '<a class="feed-title feed-link" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer" title="点击查看原帖">' + esc(item.title) + ' ↗</a>'
      : '<span class="feed-title">' + esc(item.title) + '</span>';
    const contentHtml = link
      ? '<a class="feed-content-link" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer"><p class="feed-content">' + esc(item.content) + '</p></a>'
      : '<p class="feed-content">' + esc(item.content) + '</p>';
    return '' +
      '<div class="feed-item">' +
        '<div class="feed-top">' +
          '<span class="platform-badge" style="background:' + p.color + '33;color:' + p.color + '">' + p.icon + ' ' + esc(p.name) + '</span>' +
          titleHtml +
          '<span class="sentiment ' + senti.cls + ' feed-sentiment">' + senti.label + '</span>' +
        '</div>' +
        contentHtml +
        '<div class="feed-meta">' +
          '<span>👤 ' + esc(item.author || '匿名') + '</span>' +
          '<span class="heat">🔥 ' + formatHeat(item.heat) + '</span>' +
          '<span>🕒 ' + formatTime(item.publishedAt) + '</span>' +
        '</div>' +
      '</div>';
  }

  function renderFeeds(data) {
    const list = $('feed-list');
    const items = data.items || [];
    if (!items.length) {
      list.innerHTML = '';
      // 搜索无结果时给明确提示
      const emptyText = $('feed-empty-text');
      const emptyIcon = $('feed-empty-icon');
      if (state.keyword) {
        if (emptyText) emptyText.textContent = '不属于热门范围，查询结果为空';
        if (emptyIcon) emptyIcon.textContent = '🔍';
      } else {
        if (emptyText) emptyText.textContent = '暂无讨论内容';
        if (emptyIcon) emptyIcon.textContent = '📭';
      }
      showEmpty('feed');
      return;
    }
    hideEmpty('feed');
    list.innerHTML = items.map(renderFeedItem).join('');
  }

  /* ---------- 股票详情视图 ---------- */
  function openStockDetail(keyword) {
    state.detailStock = keyword;
    state.detailPage = 1;
    $('detail-title').textContent = keyword + ' · 相关讨论';
    $('detail-view').classList.remove('hidden');
    document.body.classList.add('detail-open');
    window.scrollTo(0, 0);
    fetchStockDetail();
  }

  function closeStockDetail() {
    $('detail-view').classList.add('hidden');
    document.body.classList.remove('detail-open');
  }

  async function fetchStockDetail() {
    $('detail-list').innerHTML = '<div class="loading"><span class="spinner"></span>正在抓取该股最新讨论…</div>';
    $('detail-empty').classList.add('hidden');
    const url = '/api/feeds?platform=all&limit=15&sort=' + state.detailSort +
      '&keyword=' + encodeURIComponent(state.detailStock) + '&page=' + state.detailPage;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      renderDetailList(data);
      updateDetailPager(data);
    } catch (e) {
      $('detail-list').innerHTML = '';
      $('detail-empty').classList.remove('hidden');
    }
  }

  function renderDetailList(data) {
    const list = $('detail-list');
    const items = data.items || [];
    if (!items.length) {
      list.innerHTML = '';
      $('detail-empty').classList.remove('hidden');
      return;
    }
    $('detail-empty').classList.add('hidden');
    list.innerHTML = items.map(renderFeedItem).join('');
  }

  function updateDetailPager(data) {
    const total = data.total || 0;
    const page = data.page || 1;
    const pageSize = data.pageSize || 15;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    $('detail-pager-info').textContent = '第 ' + page + ' 页 / 共 ' + totalPages + ' 页';
    $('btn-detail-prev').disabled = page <= 1;
    $('btn-detail-next').disabled = !data.hasMore;
  }

  async function fetchFeeds() {
    setSpinning('btn-refresh-feeds', true);
    $('feed-list').innerHTML = '<div class="loading"><span class="spinner"></span>加载中…</div>';
    hideEmpty('feed');
    hideError('feed-error');
    try {
      // state.platform 为 'all' 或平台中文名，与后端 /api/feeds 的 platform 参数一致
      let url = '/api/feeds?platform=' + encodeURIComponent(state.platform) + '&limit=8';
      url += '&page=' + state.page + '&sort=' + state.sort;
      if (state.keyword) {
        url += '&keyword=' + encodeURIComponent(state.keyword);
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.lastFeeds = data;
      renderFeeds(data);
      updatePager(data);
      hideError('feed-error');
    } catch (e) {
      showError('feed-error', '讨论内容加载失败：' + esc(e.message));
      if (!state.lastFeeds) showEmpty('feed');
      else renderFeeds(state.lastFeeds);
    } finally {
      setSpinning('btn-refresh-feeds', false);
    }
  }

  function refreshAll() {
    return Promise.all([fetchHot(), fetchFeeds()]);
  }

  /* ---------- 分页 & 排序 ---------- */
  function updatePager(data) {
    const total = data.total || 0;
    const page = data.page || 1;
    const pageSize = data.pageSize || 8;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    $('pager-info').textContent = '第 ' + page + ' 页 / 共 ' + totalPages + ' 页';
    $('btn-prev-page').disabled = page <= 1;
    $('btn-next-page').disabled = !data.hasMore;
  }

  function initSort() {
    $('btn-sort-heat').addEventListener('click', function () {
      if (state.sort === 'heat') return;
      state.sort = 'heat';
      state.page = 1;
      $('btn-sort-heat').classList.add('active');
      $('btn-sort-time').classList.remove('active');
      fetchFeeds();
    });
    $('btn-sort-time').addEventListener('click', function () {
      if (state.sort === 'time') return;
      state.sort = 'time';
      state.page = 1;
      $('btn-sort-time').classList.add('active');
      $('btn-sort-heat').classList.remove('active');
      fetchFeeds();
    });
  }

  function initPager() {
    $('btn-prev-page').addEventListener('click', function () {
      if (state.page > 1) {
        state.page--;
        fetchFeeds();
      }
    });
    $('btn-next-page').addEventListener('click', function () {
      state.page++;
      fetchFeeds();
    });
  }

  /* ---------- 配置面板 ---------- */
  function renderConfig(dataSources, autoRefresh, thsCookie) {
    const byId = {};
    (dataSources || []).forEach(function (ds) {
      if (!ds) return;
      if (ds.id) byId[String(ds.id).toLowerCase()] = ds;
      if (ds.name) byId[String(ds.name).toLowerCase()] = ds;
    });
    const list = $('config-list');
    list.innerHTML = PLATFORMS.filter(function (p) { return p.id !== 'tonghuashun'; }).map(function (p) {
      const ex = byId[p.id] || byId[p.name.toLowerCase()] || {};
      const checked = ex.enabled !== false ? 'checked' : '';
      return '' +
        '<div class="config-row" data-id="' + esc(p.id) + '">' +
          '<label class="switch" title="启用 ' + esc(p.name) + '">' +
            '<input type="checkbox" class="cfg-enabled" ' + checked + ' />' +
            '<span class="slider"></span>' +
          '</label>' +
          '<span class="config-platform"><span>' + p.icon + '</span><span>' + esc(p.name) + '</span></span>' +
          '<input type="text" class="cfg-url" placeholder="https://api.example.com/v1" value="' + esc(ex.apiUrl || '') + '" />' +
          '<input type="password" class="cfg-key" placeholder="API Key（可选）" value="' + esc(ex.apiKey || '') + '" />' +
        '</div>';
    }).join('');

    // autoRefresh 为秒数（后端约定），数字输入框回填
    const ar = Number(autoRefresh);
    $('cfg-auto-refresh').value = (Number.isFinite(ar) && ar > 0) ? ar : 60;

    // 同花顺 Cookie 回填
    $('cfg-ths-cookie').value = thsCookie || '';
  }

  function applyAutoRefresh(seconds) {
    if (state.autoTimer) {
      clearInterval(state.autoTimer);
      state.autoTimer = null;
    }
    const n = Number(seconds);
    if (Number.isFinite(n) && n > 0) {
      state.autoTimer = setInterval(function () {
        fetchHot();
        fetchFeeds();
      }, n * 1000);
    }
  }

  async function loadConfig() {
    try {
      let autoRefresh = 60;
      try { autoRefresh = parseInt(localStorage.getItem('stock-auto-refresh') || '60', 10); } catch (e) {}
      if (!Number.isFinite(autoRefresh) || autoRefresh <= 0) autoRefresh = 60;
      state.config = { autoRefresh: autoRefresh };
      // 数据源已内置（腾讯行情 + 东财股吧），无需配置
      const builtin = PLATFORMS.map(function (p) {
        return { id: p.id, name: p.name, enabled: true, apiUrl: '内置数据源', apiKey: '' };
      });
      renderConfig(builtin, autoRefresh, '');
      applyAutoRefresh(autoRefresh);
      showConfigStatus('', '');
    } catch (e) {
      showConfigStatus('配置加载失败：' + esc(e.message), 'fail');
    }
  }

  async function saveConfig() {
    const arVal = parseInt($('cfg-auto-refresh').value, 10);
    const autoRefresh = Number.isFinite(arVal) && arVal > 0 ? arVal : 60;
    try { localStorage.setItem('stock-auto-refresh', String(autoRefresh)); } catch (e) {}
    showConfigStatus('✓ 保存成功', 'ok');
    applyAutoRefresh(autoRefresh);
  }

  function openConfig() {
    $('config-modal').classList.remove('hidden');
    showConfigStatus('', '');
    loadConfig();
  }

  function closeConfig() {
    $('config-modal').classList.add('hidden');
  }

  /* ---------- 视图切换 ---------- */
  function openDrawer() {
    $('drawer').classList.add('open');
    $('drawer-mask').classList.remove('hidden');
  }

  function closeDrawer() {
    $('drawer').classList.remove('open');
    $('drawer-mask').classList.add('hidden');
  }

  function toggleHotDropdown() {
    const dd = $('hot-dropdown');
    const isOpen = !dd.classList.contains('hidden');
    if (isOpen) {
      closeHotDropdown();
    } else {
      dd.classList.remove('hidden');
      $('hot-dropdown-mask').classList.remove('hidden');
      $('btn-hot').classList.add('active');
      fetchHot();
    }
  }

  function closeHotDropdown() {
    $('hot-dropdown').classList.add('hidden');
    $('hot-dropdown-mask').classList.add('hidden');
    $('btn-hot').classList.remove('active');
  }

  function switchView(view) {
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.classList.toggle('active', n.dataset.view === view);
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.id === 'view-' + view);
    });
    closeDrawer();
    if (view === 'stock') resizeStockCharts();
  }

  /* ---------- 股票分析 ---------- */
  const stockCharts = { trends: null, kline5: null, kline: null };

  function initStockCharts() {
    if (typeof echarts === 'undefined') return;
    const t = $('trends-chart');
    const k5 = $('kline5-chart');
    const k = $('kline-chart');
    if (t && !stockCharts.trends) stockCharts.trends = echarts.init(t);
    if (k5 && !stockCharts.kline5) stockCharts.kline5 = echarts.init(k5);
    if (k && !stockCharts.kline) stockCharts.kline = echarts.init(k);
  }

  function resizeStockCharts() {
    if (stockCharts.trends) stockCharts.trends.resize();
    if (stockCharts.kline5) stockCharts.kline5.resize();
    if (stockCharts.kline) stockCharts.kline.resize();
  }

  function renderTrendsChart(trends) {
    if (!stockCharts.trends || !trends.length) return;
    const times = trends.map(function (t) { return t.time; });
    const prices = trends.map(function (t) { return t.price; });
    const avgs = trends.map(function (t) { return t.avg; });
    stockCharts.trends.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 20, bottom: 28 },
      xAxis: { type: 'category', data: times, boundaryGap: false, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { color: '#8493ab' } },
      yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: '#eef1f6' } }, axisLabel: { color: '#8493ab' } },
      series: [
        { name: '价格', type: 'line', data: prices, showSymbol: false, lineStyle: { width: 1.5, color: '#2563eb' }, areaStyle: { color: 'rgba(37,99,235,0.08)' } },
        { name: '均价', type: 'line', data: avgs, showSymbol: false, lineStyle: { width: 1, color: '#f59e0b' } }
      ]
    });
  }

  function renderKlineChart(kline, indicators, channels) {
    if (!stockCharts.kline || !kline.length) return;
    const dates = kline.map(function (k) { return k.date; });
    const kdata = kline.map(function (k) { return [k.open, k.close, k.low, k.high]; });
    const closes = kline.map(function (k) { return k.close; });
    const vols = kline.map(function (k) { return k.volume; });
    const hist = (indicators && indicators.macd && indicators.macd.histSeries) || [];
    const chan = channels || {};
    const dcUp = chan.donchian ? kline.map(function () { return chan.donchian.up; }) : [];
    const dcLow = chan.donchian ? kline.map(function () { return chan.donchian.low; }) : [];
    const rgUp = chan.regression ? kline.map(function () { return chan.regression.up; }) : [];
    const rgLow = chan.regression ? kline.map(function () { return chan.regression.low; }) : [];
    // 增强引擎：回归导轨通道（自适应窗口）+ 全序列布林带（与 K 线严格同长、尾部对齐）
    const enhChart = chan.enhChart || null;
    const railUp = (enhChart && enhChart.rails) ? enhChart.rails.up : [];
    const railMid = (enhChart && enhChart.rails) ? enhChart.rails.mid : [];
    const railDn = (enhChart && enhChart.rails) ? enhChart.rails.dn : [];
    const hasRails = railUp.length === kline.length;

    function maSeries(n) {
      return closes.map(function (_, i) {
        if (i < n - 1) return null;
        let s = 0;
        for (let j = i - n + 1; j <= i; j++) s += closes[j];
        return +(s / n).toFixed(2);
      });
    }
    const ma5 = maSeries(5), ma10 = maSeries(10), ma20 = maSeries(20), ma60 = maSeries(60);
    const bollUp = [], bollMid = [], bollLow = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < 19) { bollUp.push(null); bollMid.push(null); bollLow.push(null); continue; }
      const slice = closes.slice(i - 19, i + 1);
      const m = slice.reduce(function (a, b) { return a + b; }, 0) / 20;
      const sd = Math.sqrt(slice.reduce(function (s, c) { return s + (c - m) * (c - m); }, 0) / 20);
      bollUp.push(+(m + 2 * sd).toFixed(2));
      bollMid.push(+m.toFixed(2));
      bollLow.push(+(m - 2 * sd).toFixed(2));
    }
    // 优先使用增强引擎输出的同长布林序列（口径一致），否则回退本地计算
    const bollUpS = (enhChart && enhChart.boll && enhChart.boll.up.length === kline.length) ? enhChart.boll.up : bollUp;
    const bollMidS = (enhChart && enhChart.boll && enhChart.boll.mid.length === kline.length) ? enhChart.boll.mid : [];
    const bollDnS = (enhChart && enhChart.boll && enhChart.boll.dn.length === kline.length) ? enhChart.boll.dn : bollLow;
    const axisColor = '#cbd5e1';
    const labelColor = '#8493ab';
    const splitColor = '#eef1f6';
    stockCharts.kline.setOption({
      animation: false,
      tooltip: { trigger: 'axis' },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 48, right: 16, top: 16, height: '52%' },
        { left: 48, right: 16, top: '70%', height: '12%' },
        { left: 48, right: 16, top: '86%', height: '10%' }
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, boundaryGap: true, axisLine: { lineStyle: { color: axisColor } }, axisLabel: { show: false } },
        { type: 'category', data: dates, gridIndex: 1, axisLine: { lineStyle: { color: axisColor } }, axisLabel: { show: false } },
        { type: 'category', data: dates, gridIndex: 2, axisLine: { lineStyle: { color: axisColor } }, axisLabel: { color: labelColor } }
      ],
      yAxis: [
        { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: splitColor } }, axisLabel: { color: labelColor } },
        { gridIndex: 1, axisLabel: { show: false }, splitLine: { show: false } },
        { gridIndex: 2, axisLabel: { show: false }, splitLine: { show: false } }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1, 2], start: 55, end: 100 },
        { type: 'slider', xAxisIndex: [0, 1, 2], top: '98%', height: 12, borderColor: '#e7edf5' }
      ],
      series: [
        { name: 'K线', type: 'candlestick', data: kdata, itemStyle: { color: '#e0354a', color0: '#0ca678', borderColor: '#e0354a', borderColor0: '#0ca678' } },
        { name: 'MA5', type: 'line', data: ma5, showSymbol: false, lineStyle: { width: 1, color: '#f59e0b' } },
        { name: 'MA10', type: 'line', data: ma10, showSymbol: false, lineStyle: { width: 1, color: '#3b82f6' } },
        { name: 'MA20', type: 'line', data: ma20, showSymbol: false, lineStyle: { width: 1, color: '#8b5cf6' } },
        { name: 'MA60', type: 'line', data: ma60, showSymbol: false, lineStyle: { width: 1, color: '#94a3b8' } },
        { name: '布林上轨', type: 'line', data: bollUpS, showSymbol: false, lineStyle: { width: 1, color: '#94a3b8', type: 'dashed' } },
        { name: '布林中轨', type: 'line', data: bollMidS, showSymbol: false, lineStyle: { width: 1, color: '#7e57c2', type: 'dashed' } },
        { name: '布林下轨', type: 'line', data: bollDnS, showSymbol: false, lineStyle: { width: 1, color: '#94a3b8', type: 'dashed' } },
        { name: '唐奇安上轨', type: 'line', data: dcUp, showSymbol: false, lineStyle: { width: 1, color: '#0ea5e9', type: 'dashed' } },
        { name: '唐奇安下轨', type: 'line', data: dcLow, showSymbol: false, lineStyle: { width: 1, color: '#0ea5e9', type: 'dashed' } },
        { name: '回归上轨', type: 'line', data: rgUp, showSymbol: false, lineStyle: { width: 1, color: '#a855f7', type: 'dotted' } },
        { name: '回归下轨', type: 'line', data: rgLow, showSymbol: false, lineStyle: { width: 1, color: '#a855f7', type: 'dotted' } },
        { name: '导轨上轨', type: 'line', data: hasRails ? railUp : [], showSymbol: false, lineStyle: { width: 1.4, color: '#ff9800' } },
        { name: '导轨中轨', type: 'line', data: hasRails ? railMid : [], showSymbol: false, lineStyle: { width: 1, color: '#ffb74d', type: 'dashed' } },
        { name: '导轨下轨', type: 'line', data: hasRails ? railDn : [], showSymbol: false, lineStyle: { width: 1.4, color: '#ff9800' } },
        { name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: vols, itemStyle: { color: '#cbd5e1' } },
        { name: 'MACD', type: 'bar', xAxisIndex: 2, yAxisIndex: 2, data: hist, itemStyle: { color: function (p) { return p.value >= 0 ? '#e0354a' : '#0ca678'; } } }
      ]
    });
  }

  function renderKline5Chart(kline) {
    if (!stockCharts.kline5 || !kline.length) return;
    const dates = kline.map(function (k) { return k.date; });
    const kdata = kline.map(function (k) { return [k.open, k.close, k.low, k.high]; });
    const vols = kline.map(function (k) { return k.volume; });
    const axisColor = '#cbd5e1';
    const labelColor = '#8493ab';
    const splitColor = '#eef1f6';
    stockCharts.kline5.setOption({
      animation: false,
      tooltip: { trigger: 'axis' },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 48, right: 16, top: 16, height: '62%' },
        { left: 48, right: 16, top: '82%', height: '14%' }
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, boundaryGap: true, axisLine: { lineStyle: { color: axisColor } }, axisLabel: { show: false } },
        { type: 'category', data: dates, gridIndex: 1, axisLine: { lineStyle: { color: axisColor } }, axisLabel: { color: labelColor } }
      ],
      yAxis: [
        { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: splitColor } }, axisLabel: { color: labelColor } },
        { gridIndex: 1, axisLabel: { show: false }, splitLine: { show: false } }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100 },
        { type: 'slider', xAxisIndex: [0, 1], top: '98%', height: 12, borderColor: '#e7edf5' }
      ],
      series: [
        { name: 'K线', type: 'candlestick', data: kdata, itemStyle: { color: '#e0354a', color0: '#0ca678', borderColor: '#e0354a', borderColor0: '#0ca678' } },
        { name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: vols, itemStyle: { color: '#cbd5e1' } }
      ]
    });
  }

  function switchChart(chart) {
    document.querySelectorAll('.chart-tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.chart === chart);
    });
    $('trends-chart').classList.toggle('hidden', chart !== 'trends');
    $('kline5-chart').classList.toggle('hidden', chart !== 'kline5');
    $('kline-chart').classList.toggle('hidden', chart !== 'kline');
    setTimeout(resizeStockCharts, 50);
  }

  function showScoreDetail(dim, data) {
    let title, items;
    const labelMap = { total: '综合评分', technical: '技术面', strategy: '策略面', confidence: '置信度' };
    title = labelMap[dim] || dim;
    if (dim === 'total') {
      items = [{
        delta: 0,
        text: `综合评分 = (技术面 ${data.score.technical} + 策略面 ${data.score.strategy}) ÷ 2 = ${data.score.total} 分`
      }];
    } else {
      items = (data.score && data.score.reasons && data.score.reasons[dim]) || [];
    }
    $('score-detail-title').textContent = title + ' · 评分依据';
    $('score-detail-list').innerHTML = items.map(function (r) {
      const cls = r.delta > 0 ? 'plus' : r.delta < 0 ? 'minus' : 'zero';
      const sign = r.delta > 0 ? '+' + r.delta : String(r.delta);
      return '<div class="reason-item"><span class="reason-delta ' + cls + '">' + sign + '</span><span>' + esc(r.text) + '</span></div>';
    }).join('');
    $('score-detail-modal').classList.remove('hidden');
  }

  function showScoreHelp() {
    $('score-help-list').innerHTML = [
      { t: '综合评分', d: '技术面与策略面的算术平均（各占 50%），综合衡量该股当前的多空强弱与可交易性。' },
      { t: '技术面', d: '基于价格走势与均线（MA5/10/20/60）、MACD、布林带、短期动量等技术指标，衡量股价的形态与买卖动能。' },
      { t: '策略面', d: '基于趋势强度（价格相对 60 日均线的偏离）、量能变化、波动率、RSI 等，衡量交易层面的机会与风险。' },
      { t: '置信度', d: '技术面与策略面结论的一致程度——两者分数越接近，置信度越高，代表当前评分越可靠。' }
    ].map(function (h) {
      return '<div class="help-item"><h4>' + h.t + '</h4><p>' + h.d + '</p></div>';
    }).join('');
    $('score-help-modal').classList.remove('hidden');
  }

  /* ================================================================
   * 增强引擎（StockSentry 移植）渲染层
   * 全部函数在 data.enh 缺失或异常时自动降级 / 隐藏，保证向后兼容
   * ================================================================ */
  function enhOf(data) {
    var e = data && data.enh;
    if (!e || e.error || !e.action) return null;
    return e;
  }

  function hexA(hex, a) {
    var h = String(hex || '#888').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return 'rgba(136,136,136,' + a + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function num(v, d) {
    if (v == null || v === '' || isNaN(Number(v))) return '—';
    return Number(v).toFixed(d == null ? 2 : d);
  }

  var MON_STATE = {
    bull: { t: '看多', c: 'bull' }, bear: { t: '看空', c: 'bear' }, neutral: { t: '中性', c: 'neutral' },
    pending: { t: '待复核', c: 'pending' }, manual: { t: '人工跟踪', c: 'manual' },
    inapplicable: { t: '不适用', c: 'inapplicable' }, na: { t: '数据不足', c: 'na' }
  };

  /* ---------- 动作判定卡片 ---------- */
  function renderActionBox(data) {
    var box = $('action-box');
    if (!box) return;
    var e = enhOf(data);
    if (!e) { box.innerHTML = ''; box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    var a = e.action, s = e.scores || {}, plan = e.plan || {};

    var scale = [
      { key: 'BUY', label: '积极入场' }, { key: 'ADD', label: '可分批建仓' },
      { key: 'HOLD', label: '持有观察' }, { key: 'WATCH', label: '观望等待' },
      { key: 'REDUCE', label: '建议减仓' }, { key: 'EXIT', label: '建议离场' },
      { key: 'TAKE_PROFIT', label: '分批止盈' }, { key: 'AVOID', label: '建议回避' }, { key: 'NOCHASE', label: '不建议追高' }
    ];
    var scaleHtml = scale.map(function (x) {
      var active = x.key === a.key;
      var style = active ? ' style="border-color:' + esc(a.color) + ';color:' + esc(a.color) + '"' : '';
      return '<span class="action-scale-chip' + (active ? ' active' : '') + '"' + style + '>' + esc(x.label) + '</span>';
    }).join('');

    var chips = [
      '<span class="action-chip">综合评分 ' + (s.composite != null ? s.composite : '—') + '</span>',
      '<span class="action-chip">技术面 ' + (s.technical != null ? s.technical : '—') + '</span>',
      '<span class="action-chip">策略面 ' + (s.profile != null ? s.profile : '—') + '</span>',
      '<span class="action-chip">监控面 ' + (s.monitor != null ? s.monitor : '—') + '</span>'
    ];
    if (plan.levelsSource === 'profile') chips.push('<span class="action-chip warn">研报价位风控</span>');
    if (a.key === 'AVOID' || a.key === 'NOCHASE' || a.label === '建议减持/回避') chips.push('<span class="action-chip warn">无持仓适配</span>');

    var reasonsHtml = (a.reasons || []).map(function (r) {
      var cls = '', tag = '', text = String(r);
      if (/^【支撑】/.test(text)) cls = 'support';
      else if (/^【压制】/.test(text)) cls = 'press';
      else if (/^【风控修正】/.test(text)) cls = 'risk';
      var m = text.match(/^【(.+?)】([\s\S]*)$/);
      if (m) { tag = '<span class="reason-tag">【' + esc(m[1]) + '】</span>'; text = m[2]; }
      return '<li class="' + cls + '">' + tag + esc(text) + '</li>';
    }).join('');

    box.innerHTML =
      '<div class="action-card" style="border-left-color:' + esc(a.color) + '">' +
        '<div class="action-badge">' +
          '<span class="action-name" style="color:' + esc(a.color) + '">' + esc(a.label) + '</span>' +
          '<span class="action-key">' + esc(a.key) + '</span>' +
          '<span class="action-conf">置信度 ' + (a.confidence != null ? a.confidence + '%' : '—') + '</span>' +
        '</div>' +
        '<div class="action-body">' +
          '<div class="action-headline">' + chips.join('') + '</div>' +
          '<div class="action-desc">' + esc(a.desc || '') + '</div>' +
          '<ul class="action-reasons">' + reasonsHtml + '</ul>' +
          '<div class="action-scale">' + scaleHtml + '</div>' +
          '<div class="action-note">动作结论由「规则引擎」综合技术面 / 策略面 / 监控面信号得出；硬性风控（研报止损位、盈亏比）优先于技术信号，可自动覆盖或下调操作级别。</div>' +
        '</div>' +
      '</div>';
  }

  /* ---------- 轨道研判卡片 ---------- */
  function renderChannelBox(data) {
    var box = $('channel-box');
    if (!box) return;
    var e = enhOf(data);
    var cv = e && e.channelVerdict, ind = e && e.ind;
    if (!cv || !ind) { box.innerHTML = ''; box.classList.add('hidden'); return; }
    box.classList.remove('hidden');

    var bi = ind.bollInfo, ra = ind.rails, dc = ind.donchian;

    function railRow(label, lo, hi, mid, pct, color, markVal, tickLabel, emptyReason) {
      if (!(hi > lo)) {
        return '<div class="rail-row rail-row-empty">' +
          '<div class="rail-label">' + esc(label) + '</div>' +
          '<div><div class="rail-track"></div></div>' +
          '<div class="rail-val">不可用<em>' + esc(emptyReason || '—') + '</em></div></div>';
      }
      function P(v) { return Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)); }
      var pos = Math.max(0, Math.min(1, pct)) * 100;
      return '<div class="rail-row">' +
        '<div class="rail-label">' + esc(label) + '</div>' +
        '<div>' +
          '<div class="rail-track">' +
            '<div class="rail-zone" style="left:0;right:0;background:' + hexA(color, 0.08) + '"></div>' +
            '<div class="rail-zone" style="left:' + P(mid) + '%;right:0;background:' + hexA(color, 0.12) + '"></div>' +
            '<div class="rail-mark" style="left:calc(' + pos + '% - 1.5px)"></div>' +
          '</div>' +
          '<div class="rail-ticks">' +
            '<span class="rail-tick" style="left:0">' + esc(lo) + '</span>' +
            '<span class="rail-tick" style="left:' + P(mid) + '%">' + esc(mid) + '</span>' +
            '<span class="rail-tick" style="left:100%">' + esc(hi) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="rail-val" style="color:' + esc(color) + '">' + esc(markVal) + '<em>' + esc(tickLabel) + '</em></div>' +
      '</div>';
    }

    var rows = [];
    rows.push(bi && cv.boll && cv.boll.up > cv.boll.dn
      ? railRow('布林轨道', cv.boll.dn, cv.boll.up, cv.boll.mid, bi.pctB, '#7e57c2', num(ind.price), cv.bollLabel)
      : railRow('布林轨道', 0, 0, 0, 0.5, '#7e57c2', '', '', bi ? '上下轨重合或缺失' : '未返回布林带'));
    rows.push(ra && ra.up > ra.dn
      ? railRow('回归导轨', ra.dn, ra.up, ra.mid, ra.pctChan, '#ff9800', num(ind.price), cv.railPosLabel)
      : railRow('回归导轨', 0, 0, 0, 0.5, '#ff9800', '', '', ra ? '上下轨重合' : '样本不足（需 ≥12 根日K）'));
    rows.push(dc && dc.upper > dc.lower
      ? railRow('唐奇安区间', dc.lower, dc.upper, dc.mid, dc.pct / 100, '#0288d1', num(ind.price), '区间 ' + dc.pct + '%')
      : railRow('唐奇安区间', 0, 0, 0, 0.5, '#0288d1', '', '', dc ? '上下沿重合' : '未返回区间数据'));

    var chItems = [];
    if (cv.boll) {
      chItems.push('<div class="ch-item"><h4>布林轨道（20, 2）</h4><div class="ch-vals">' +
        '上轨 <b>' + num(cv.boll.up) + '</b>　中轨 <b>' + num(cv.boll.mid) + '</b>　下轨 <b>' + num(cv.boll.dn) + '</b><br>' +
        '<em>%B ' + (bi ? (bi.pctB * 100).toFixed(0) : '—') + '%　带宽 ' + (bi ? num(bi.bandwidthPct) : '—') + '%（近120日 ' + (bi && bi.bandwidthPctile != null ? bi.bandwidthPctile : '—') + '% 分位）</em><br>' +
        '<b>' + esc(bi ? bi.stateLabel : '—') + '</b></div></div>');
    }
    if (ra) {
      chItems.push('<div class="ch-item"><h4>回归导轨通道（自适应窗口）</h4><div class="ch-vals">' +
        '上轨 <b>' + num(ra.up) + '</b>　中轨 <b>' + num(ra.mid) + '</b>　下轨 <b>' + num(ra.dn) + '</b><br>' +
        '<em>窗口 ' + ra.bars + ' 根 · k=' + ra.k + '　斜率 ' + num(ra.slope20Pct) + '%/20日　宽度 ' + num(ra.widthPct) + '%</em><br>' +
        '<b>' + esc(cv.railDirLabel || '—') + '</b>　通道位置 ' + (ra.pctChan * 100).toFixed(0) + '%' +
        (ra.reliable ? '' : '　<span class="ch-warn">⚠参考性弱</span>') + '</div></div>');
    }
    if (dc) {
      chItems.push('<div class="ch-item"><h4>唐奇安区间导轨（20日）</h4><div class="ch-vals">' +
        '上沿 <b>' + num(dc.upper) + '</b>　下沿 <b>' + num(dc.lower) + '</b>　中值 <b>' + num(dc.mid) + '</b><br>' +
        '<em>区间宽度 ' + num(dc.upper - dc.lower) + ' 元</em><br>' +
        '当前位置 <b>' + dc.pct + '%</b></div></div>');
    }
    var kl = ind.keyLevels || [];
    if (kl.length) {
      var klRows = kl.slice(0, 4).map(function (k) {
        return (k.side === 'support' ? '支撑' : '阻力') + ' <b>' + num(k.price) + '</b>（触及 ' + k.count + ' 次 · ' + (k.dist > 0 ? '+' : '') + k.dist + '%）';
      }).join('<br>');
      chItems.push('<div class="ch-item"><h4>关键价位（枢轴聚类）</h4><div class="ch-vals">' + klRows + '</div></div>');
    }

    var channelDims = ['上下轨线', '导轨区间', '关键价位'];
    var rules = ((e.signals && e.signals.all) || []).filter(function (s) {
      return channelDims.indexOf(s.dim) >= 0;
    }).slice(0, 14);
    var rulesHtml = rules.map(function (s) {
      var sideCls = s.side === 'bull' ? 'bull' : s.side === 'bear' ? 'bear' : 'neutral';
      var sideText = s.side === 'bull' ? '看多' : s.side === 'bear' ? '看空' : '中性';
      return '<div class="channel-rule">' +
        '<span class="cr-side ' + sideCls + '">' + sideText + '</span>' +
        '<span><span class="cr-dim">' + esc(s.dim) + ' · </span><b>' + esc(s.name) + '</b>：' + esc(s.text) +
        (s.evidence ? '　<span class="cr-dim">' + esc(s.evidence) + '</span>' : '') + '</span>' +
      '</div>';
    }).join('');

    box.innerHTML =
      '<div class="channel-card">' +
        '<div class="channel-zone" style="background:' + hexA(cv.color, 0.12) + ';color:' + esc(cv.color) + '">' + esc(cv.zone) + '</div>' +
        '<div class="channel-advice" style="border-left-color:' + esc(cv.color) + '">' + esc(cv.advice || '') + '</div>' +
        '<div class="channel-grid">' + chItems.join('') + '</div>' +
        '<div class="channel-rails">' + rows.join('') + '</div>' +
        (rulesHtml ? '<div class="channel-rules">' + rulesHtml + '</div>' : '') +
      '</div>';
  }

  /* ---------- 个股画像卡片 ---------- */
  function renderProfileBox(data) {
    var box = $('profile-box');
    if (!box) return;
    var e = enhOf(data);
    var pf = e && e.profile;
    if (!pf) { box.innerHTML = ''; box.classList.add('hidden'); return; }
    box.classList.remove('hidden');

    var badge = pf.auto
      ? '<span class="profile-badge auto">⚠ 自动画像（非投研报告）</span>'
      : (pf.profileQuality === 'low'
        ? '<span class="profile-badge low">画像待完善</span>'
        : '<span class="profile-badge report">研报画像</span>');

    var tags = (pf.tags || []).map(function (t) { return '<span class="profile-tag">' + esc(t) + '</span>'; }).join('');

    var secs = [];
    if (pf.thesis) {
      secs.push('<div class="profile-sec"><div class="profile-sec-title">投资逻辑摘要</div><div class="profile-sec-body">' + esc(pf.thesis) + '</div></div>');
    }
    if (pf.moat) {
      secs.push('<div class="profile-sec"><div class="profile-sec-title">技术 / 竞争壁垒</div><div class="profile-sec-body">' + esc(pf.moat) + '</div></div>');
    }

    var L = pf.levels || {};
    var levelRows = [];
    function lv(label, v) {
      if (v == null || v === '') return;
      var val = (v instanceof Array) ? (v[0] + ' ~ ' + v[1]) : v;
      levelRows.push('<div class="profile-level"><span>' + label + '</span><span>' + esc(val) + '</span></div>');
    }
    lv('建仓区间', L.entry);
    lv('加仓区间', L.addOn);
    lv('止损位', L.stopLoss);
    lv('硬止损位', L.hardStop);
    lv('第一目标位', L.target1);
    lv('第二目标位', L.target2);
    if (L.positionLimit != null) levelRows.push('<div class="profile-level"><span>建议仓位上限</span><span>' + Math.round(L.positionLimit * 100) + '%</span></div>');
    if (pf.cost != null) levelRows.push('<div class="profile-level"><span>持仓成本</span><span>' + esc(pf.cost) + '</span></div>');
    if (levelRows.length) {
      secs.push('<div class="profile-sec"><div class="profile-sec-title">关键价位与仓位</div><div class="profile-levels">' + levelRows.join('') + '</div></div>');
    }

    if (pf.businessMix && pf.businessMix.length) {
      var mix = pf.businessMix.map(function (b) {
        return '<div class="profile-mix-row"><b>' + esc(b.name) + '</b> <em>' + esc(b.share) + '%</em>　' + esc(b.trend) + '<br><span class="cr-dim">' + esc(b.note) + '</span></div>';
      }).join('');
      secs.push('<div class="profile-sec"><div class="profile-sec-title">业务结构</div><div class="profile-mix">' + mix + '</div></div>');
    } else if (pf.fundamentals) {
      var F = pf.fundamentals;
      var fLab = {
        peTtm: 'PE(TTM)', pb: 'PB', totalCap: '总市值(亿)', floatCap: '流通市值(亿)',
        turnover: '换手率(%)', volumeRatio: '量比', position52: '区间分位(%)',
        drawdownFromHigh: '距区间高点(%)', atrPct: 'ATR波动率(%)'
      };
      var fRows = [];
      Object.keys(F).forEach(function (k) {
        if (k === 'source' || F[k] == null || F[k] === '') return;
        fRows.push('<div class="profile-level"><span>' + esc(fLab[k] || k) + '</span><span>' + esc(F[k]) + '</span></div>');
      });
      if (fRows.length) secs.push('<div class="profile-sec"><div class="profile-sec-title">行情快照</div><div class="profile-levels">' + fRows.join('') + '</div></div>');
    }

    if (pf.catalysts && pf.catalysts.length) {
      var cat = pf.catalysts.map(function (c) {
        return '<li><b>' + esc(c.time) + '</b>：' + esc(c.event) + '<br><span class="cr-dim">' + esc(c.impact || '') + (c.amount ? ' · ' + esc(c.amount) : '') + '</span></li>';
      }).join('');
      secs.push('<div class="profile-sec"><div class="profile-sec-title">产业链与业绩兑现节奏</div><ul class="profile-list">' + cat + '</ul></div>');
    }

    if (pf.takeProfit && pf.takeProfit.length) {
      var tp = pf.takeProfit.map(function (t) {
        return '<li><b>' + esc(t.level) + '</b>（' + esc(t.range[0]) + '-' + esc(t.range[1]) + ' 元）：' + esc(t.note) + '</li>';
      }).join('');
      secs.push('<div class="profile-sec"><div class="profile-sec-title">分档止盈纪律</div><ul class="profile-list">' + tp + '</ul></div>');
    }

    if (pf.risks && pf.risks.length) {
      var rk = pf.risks.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('');
      secs.push('<div class="profile-sec"><div class="profile-sec-title">风险清单</div><ul class="profile-list risk">' + rk + '</ul></div>');
    }
    if (pf.chips && !/待补充|【/.test(pf.chips)) {
      secs.push('<div class="profile-sec"><div class="profile-sec-title">筹码结构与散户拥挤度</div><div class="profile-sec-body">' + esc(pf.chips) + '</div></div>');
    }
    if (pf.verdictNote) {
      secs.push('<div class="profile-sec"><div class="profile-sec-title">研报核心结论</div><div class="profile-sec-body">' + esc(pf.verdictNote) + '</div></div>');
    }

    box.innerHTML =
      '<div class="profile-card">' +
        '<div class="profile-head">' +
          '<span class="profile-name">' + esc(pf.name || data.name || '') + '</span>' +
          badge +
          '<span class="profile-src">' + esc(pf.sourceDoc || '') + (pf.reportDate ? '（原报告日期 ' + esc(pf.reportDate) + '）' : '') + '</span>' +
        '</div>' +
        (tags ? '<div class="profile-tags">' + tags + '</div>' : '') +
        (pf.auto ? '<div class="profile-disclaimer">⚠️ 该标的未导入投研文档，以下画像由实时行情与 K 线自动派生，不含基本面判断与机构观点，不能作为投研结论使用。</div>' : '') +
        '<div class="profile-grid">' + secs.join('') + '</div>' +
      '</div>';
  }

  /* ---------- 硬性风控 / 盈亏比 交易计划 ---------- */
  function renderPlanBox(data) {
    var box = $('plan-box');
    if (!box) return;
    var e = enhOf(data);
    var sr = data.supportResistance || { resistances: [], supports: [] };

    if (!e || !e.plan) {
      // 降级：沿用原有「支撑阻力 + 交易计划」渲染
      var plan0 = data.tradingPlan || { steps: [] };
      var resHtml = sr.resistances.length
        ? sr.resistances.map(function (v, i) { return '<div class="sr-row"><span class="sr-label">阻力 ' + (i + 1) + '</span><span class="sr-value res">' + v + '</span></div>'; }).join('')
        : '<div class="sr-row"><span class="sr-label">暂无</span><span class="sr-value">—</span></div>';
      var supHtml = sr.supports.length
        ? sr.supports.map(function (v, i) { return '<div class="sr-row"><span class="sr-label">支撑 ' + (i + 1) + '</span><span class="sr-value sup">' + v + '</span></div>'; }).join('')
        : '<div class="sr-row"><span class="sr-label">暂无</span><span class="sr-value">—</span></div>';
      var stepHtml = (plan0.steps || []).map(function (s) {
        return '<div class="plan-step"><span class="ps-step">' + esc(s.step) + '</span><span class="ps-price">' + (s.price != null ? Number(s.price).toFixed(2) : '—') + '</span><span class="ps-action">' + esc(s.action) + '</span></div>';
      }).join('');
      box.innerHTML = '<div class="plan-grid">' +
        '<div class="plan-card"><div class="plan-card-title">关键支撑 / 阻力</div>' + resHtml + supHtml + '</div>' +
        '<div class="plan-card"><div class="plan-card-title">分批建仓节奏</div>' + stepHtml + '</div></div>';
      return;
    }

    var p = e.plan, ind = e.ind || {}, price = data.price;

    function dist(v) {
      if (v == null || price == null) return '';
      var d = ((v - price) / price) * 100;
      return (d > 0 ? '+' : '') + d.toFixed(2) + '%';
    }
    var headRows = [];
    if (p.entry && p.entry[0] != null) headRows.push('<div class="sr-row"><span class="sr-label">建仓区间' + (p.levelsSource === 'profile' ? '（研报）' : '（ATR推算）') + '</span><span class="sr-value">' + num(p.entry[0]) + ' ~ ' + num(p.entry[1]) + '</span></div>');
    headRows.push('<div class="sr-row"><span class="sr-label">第一目标位</span><span class="sr-value res">' + num(p.target1) + ' <em class="cr-dim">' + dist(p.target1) + '</em></span></div>');
    headRows.push('<div class="sr-row"><span class="sr-label">第二目标位</span><span class="sr-value res">' + num(p.target2) + ' <em class="cr-dim">' + dist(p.target2) + '</em></span></div>');
    headRows.push('<div class="sr-row"><span class="sr-label">止损位</span><span class="sr-value sup">' + num(p.stopLoss) + ' <em class="cr-dim">' + dist(p.stopLoss) + '</em></span></div>');
    headRows.push('<div class="sr-row"><span class="sr-label">硬止损位</span><span class="sr-value sup">' + num(p.hardStop) + ' <em class="cr-dim">' + dist(p.hardStop) + '</em></span></div>');
    headRows.push('<div class="sr-row"><span class="sr-label">盈亏比</span><span class="sr-value">' + (p.riskReward != null ? p.riskReward + ' : 1' : '不适用') + '</span></div>');
    headRows.push('<div class="sr-row"><span class="sr-label">建议仓位上限</span><span class="sr-value">总资产的 ' + p.positionLimitPct + '%</span></div>');
    headRows.push('<div class="sr-row"><span class="sr-label">ATR / 波动率</span><span class="sr-value">' + num(p.atr, 3) + '（' + (ind.atrPct != null ? ind.atrPct + '%' : '—') + '）</span></div>');

    var rrCls = p.riskReward == null ? 'cr-dim' : p.riskReward >= 2 ? 'res' : p.riskReward >= 1 ? '' : 'sup';
    var batchTitle = p.batchKind === 'exit' ? '仓位处置节奏（当前不宜建仓）'
      : p.batchKind === 'conditional' ? '条件性建仓节奏（需信号确认）' : '分批建仓节奏';
    var batchHtml = (p.batches || []).map(function (b) {
      return '<div class="plan-step"><span class="ps-step">' + esc(b.at) + '</span><span class="ps-price">' + esc(b.ratio) + '</span><span class="ps-action">' + esc(b.note) + '</span></div>';
    }).join('');

    var supHtml2 = (p.supports || []).slice(0, 4).map(function (s) {
      return '<div class="sr-row"><span class="sr-label">支撑' + (s.label ? ' ' + esc(s.label) : '') + '</span><span class="sr-value sup">' + num(s.price) + ' <em class="cr-dim">' + s.dist + '%</em></span></div>';
    }).join('') || '<div class="sr-row"><span class="sr-label">支撑</span><span class="sr-value">暂无</span></div>';
    var resHtml2 = (p.resistances || []).slice(0, 4).map(function (s) {
      return '<div class="sr-row"><span class="sr-label">阻力' + (s.label ? ' ' + esc(s.label) : '') + '</span><span class="sr-value res">' + num(s.price) + ' <em class="cr-dim">+' + s.dist + '%</em></span></div>';
    }).join('') || '<div class="sr-row"><span class="sr-label">阻力</span><span class="sr-value">暂无</span></div>';

    box.innerHTML =
      '<div class="plan-grid">' +
        '<div class="plan-card"><div class="plan-card-title">硬性风控 · 交易计划</div>' + headRows.join('') +
          '<div class="action-note">' + esc(p.rrNote || '') + '</div>' +
        '</div>' +
        '<div class="plan-card"><div class="plan-card-title">' + esc(batchTitle) + '</div>' + batchHtml + '</div>' +
        '<div class="plan-card"><div class="plan-card-title">关键支撑</div>' + supHtml2 + '</div>' +
        '<div class="plan-card"><div class="plan-card-title">关键阻力</div>' + resHtml2 + '</div>' +
      '</div>' +
      '<div class="action-note ' + rrCls + '">硬性风控优先：当价格触及研报设定的止损 / 硬止损时，风控纪律覆盖一切技术信号；当盈亏比 < 1 时，操作级别会被自动下调。</div>';
  }

  /* ---------- 8 章投研报告 + 双格式下载 ---------- */
  function renderReportBox(data) {
    var box = $('report-box');
    if (!box) return;
    var e = enhOf(data);

    if (!e || !e.reportHtml) {
      box.innerHTML =
        '<div class="report-title">投研报告</div>' +
        '<div class="report-content">' + esc(data.report || '') + '</div>' +
        '<div class="report-actions">' +
          '<button class="btn btn-outline btn-sm" id="btn-download-html">下载 HTML</button>' +
          '<button class="btn btn-outline btn-sm" id="btn-download-md">下载 Markdown</button>' +
        '</div>';
      $('btn-download-html').addEventListener('click', function () { downloadStockReport(data, 'html'); });
      $('btn-download-md').addEventListener('click', function () { downloadStockReport(data, 'md'); });
      return;
    }

    var md = e.reportMarkdown || '';
    var heads = [];
    md.split('\n').forEach(function (line) {
      var m = line.match(/^##\s+(.*)$/);
      if (m && m[1]) heads.push(m[1]);
    });
    var tocHtml = heads.map(function (h) {
      var cls = /^[一二三四五六七八]、/.test(h) ? 'report-toc-item' : 'report-toc-item head';
      return '<span class="' + cls + '">' + esc(h) + '</span>';
    }).join('');

    box.innerHTML =
      '<div class="report-title">投研报告（8 章 · 智能盯盘引擎自动生成）</div>' +
      (tocHtml ? '<div class="report-toc">' + tocHtml + '</div>' : '') +
      '<div class="report-doc">' + e.reportHtml.replace(/^[\s\S]*?<div class="wrap">/, '').replace(/<\/div><\/body><\/html>\s*$/, '') + '</div>' +
      '<div class="report-actions">' +
        '<button class="btn btn-outline btn-sm" id="btn-download-html">下载 HTML</button>' +
        '<button class="btn btn-outline btn-sm" id="btn-download-md">下载 Markdown</button>' +
      '</div>';
    $('btn-download-html').addEventListener('click', function () { downloadStockReport(data, 'html'); });
    $('btn-download-md').addEventListener('click', function () { downloadStockReport(data, 'md'); });
  }

  /* ---------- 监控清单（七态） ---------- */
  function renderMonitorBox(data) {
    var box = $('monitor-box');
    if (!box) return;
    var e = enhOf(data);

    if (!e || !e.monitors || !e.monitors.length) {
      // 降级：沿用原有 monitorItems 渲染
      var mon = data.monitorItems || [];
      var monSum = data.monitorSummary || {};
      var monRows = mon.map(function (m) {
        var stCls = m.status.indexOf('利好') === 0 ? 'mon-good' : m.status.indexOf('利空') === 0 ? 'mon-bad' : 'mon-neutral';
        var stars = '★'.repeat(Math.min(m.weight || 0, 5));
        return '<tr><td class="mon-dim">' + esc(m.dimension) + '</td><td>' + esc(m.metric) + '</td><td>' + esc(m.window) + '</td>' +
          '<td class="mon-good">' + esc(m.good) + '</td><td class="mon-bad">' + esc(m.bad) + '</td>' +
          '<td class="mon-status ' + stCls + '">' + esc(m.status) + '</td><td class="mon-weight">' + stars + ' ' + m.weight + '</td></tr>';
      }).join('');
      box.innerHTML = mon.length
        ? '<div class="monitor-title">核心监控清单（利好 / 利空双向 · 自动判定）</div>' +
          '<div class="monitor-summary">清单结论：' + esc(monSum.verdict || '—') + '（' + (monSum.good || 0) + ' 看多 / ' + (monSum.bad || 0) + ' 看空 / ' + (monSum.neutral || 0) + ' 中性）· 可判定 ' + (monSum.total || 0) + ' 项</div>' +
          '<div class="monitor-table-wrap"><table class="monitor-table"><thead><tr>' +
          '<th>跟踪维度</th><th>关键指标</th><th>观察窗口</th><th>利好信号</th><th>利空信号</th><th>当前状态</th><th>权重</th>' +
          '</tr></thead><tbody>' + monRows + '</tbody></table></div>'
        : '';
      return;
    }

    var sum = e.monitorSummary || {};
    var rows = e.monitors.map(function (m) {
      var st = MON_STATE[m.state] || MON_STATE.na;
      var stars = '★'.repeat(Math.min(Math.max(m.weight || 0, 0), 5)) + (m.weight > 5 ? ' ' + m.weight : '');
      return '<tr>' +
        '<td class="mon-dim">' + esc(m.dim) + '</td>' +
        '<td>' + esc(m.metric) + '</td>' +
        '<td>' + esc(m.window) + '</td>' +
        '<td class="mon-good">' + esc(m.bull) + '</td>' +
        '<td class="mon-bad">' + esc(m.bear) + '</td>' +
        '<td><span class="mon-state ' + st.c + '">' + st.t + '</span></td>' +
        '<td>' + esc(m.note || '—') + '</td>' +
        '<td class="mon-weight">' + stars + '</td>' +
      '</tr>';
    }).join('');

    box.innerHTML =
      '<div class="monitor-title">核心监控清单（七态判定 · ' + (e.monitorsSource === 'profile' ? '专项清单（投研文档）' : '自动清单（实时行情派生）') + '）</div>' +
      '<div class="monitor-summary">清单结论：' + esc(sum.verdict || '—') + '（可判定 ' + (sum.judgeable || 0) + ' / 列出 ' + (sum.listed || 0) + ' 项｜看多 ' + (sum.bull || 0) + ' · 看空 ' + (sum.bear || 0) + ' · 中性 ' + (sum.neutral || 0) + ' · 待复核 ' + (sum.pending || 0) + ' · 人工跟踪 ' + (sum.manual || 0) + '）</div>' +
      '<div class="monitor-table-wrap"><table class="monitor-table"><thead><tr>' +
        '<th>跟踪维度</th><th>关键指标</th><th>观察窗口</th><th>利好信号</th><th>利空信号</th><th>判定</th><th>当前状态</th><th>权重</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (sum.gapNote ? '<div class="monitor-gaps">' + esc(sum.gapNote) + '</div>' : '') +
      '<div class="monitor-gaps">七态说明：看多 / 看空 / 中性参与评分；待复核＝口径已声明但当前数据源无法判定；人工跟踪＝无法由行情自动判定；不适用 / 数据不足不参与评分。</div>';
  }

  function renderStockAnalysis(data) {
    $('stock-empty').classList.add('hidden');
    $('stock-body').classList.remove('hidden');

    const up = (data.changePct || 0) >= 0;
    $('stock-quote').innerHTML =
      '<span class="stock-name">' + esc(data.name) + '</span>' +
      '<span class="stock-code">' + esc(data.code) + '</span>' +
      '<button class="watch-btn" id="watch-btn" data-code="' + esc(data.code) + '" data-name="' + esc(data.name) + '">关注</button>' +
      '<span class="stock-price">' + (data.price != null ? Number(data.price).toFixed(2) : '—') + '</span>' +
      '<span class="stock-change ' + (up ? 'up' : 'down') + '">' + (up ? '+' : '') + (data.changePct != null ? Number(data.changePct).toFixed(2) : '0.00') + '%</span>';
    $('watch-btn').addEventListener('click', function () {
      const btn = $('watch-btn');
      toggleWatch(btn.dataset.code, btn.dataset.name).then(function () {
        updateWatchBtn();
      });
    });
    updateWatchBtn();

    // 个股行情数据网格（今开/昨收/最高/最低/成交额/换手率等）
    const q = data.quote || {};
    const fmtNum = function (v) { return (v == null || isNaN(v)) ? '—' : Number(v).toFixed(2); };
    const fmtVol = function (v) {
      if (v == null || isNaN(v)) return '—';
      if (v >= 1e8) return (v / 1e8).toFixed(2) + '亿';
      if (v >= 1e4) return (v / 1e4).toFixed(2) + '万';
      return String(Math.round(v));
    };
    const fmtAmt = function (v) {
      if (v == null || isNaN(v)) return '—';
      if (v >= 10000) return (v / 10000).toFixed(2) + '亿';
      return Number(v).toFixed(0) + '万';
    };
    const quoteItems = [
      { label: '今开', value: fmtNum(q.open), cls: '' },
      { label: '昨收', value: fmtNum(q.prevClose), cls: '' },
      { label: '最高', value: fmtNum(q.high), cls: 'up' },
      { label: '最低', value: fmtNum(q.low), cls: 'down' },
      { label: '成交量', value: fmtVol(q.volume), cls: '' },
      { label: '成交额', value: fmtAmt(q.amount), cls: '' },
      { label: '换手率', value: q.turnover != null ? q.turnover + '%' : '—', cls: '' },
      { label: '市盈率', value: fmtNum(q.pe), cls: '' },
      { label: '振幅', value: q.amplitude != null ? q.amplitude + '%' : '—', cls: '' },
      { label: '流通市值', value: q.floatCap != null ? q.floatCap + '亿' : '—', cls: '' },
      { label: '总市值', value: q.totalCap != null ? q.totalCap + '亿' : '—', cls: '' },
      { label: '市净率', value: fmtNum(q.pb), cls: '' },
      { label: '涨停', value: fmtNum(q.limitUp), cls: 'up' },
      { label: '跌停', value: fmtNum(q.limitDown), cls: 'down' }
    ];
    $('quote-grid').innerHTML = quoteItems.map(function (it) {
      return '<div class="quote-item"><div class="quote-label">' + it.label + '</div><div class="quote-value ' + it.cls + '">' + it.value + '</div></div>';
    }).join('');

    const s = data.score;
    const scoreItems = [
      { label: '综合评分', value: s.total, dim: 'total' },
      { label: '技术面', value: s.technical, dim: 'technical' },
      { label: '策略面', value: s.strategy, dim: 'strategy' },
      { label: '置信度', value: s.confidence, dim: 'confidence' }
    ];
    $('score-grid').innerHTML = scoreItems.map(function (it) {
      return '<div class="score-card" data-dim="' + it.dim + '" title="点击查看评分依据">' +
        '<div class="score-label">' + it.label + '</div>' +
        '<div class="score-value">' + it.value + '</div>' +
        '<div class="score-bar"><i data-width="' + it.value + '"></i></div>' +
        '</div>';
    }).join('');
    // 蓝条滑动动画（从 0 滑到目标宽度）
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.querySelectorAll('#score-grid .score-bar > i').forEach(function (bar) {
          bar.style.width = bar.dataset.width + '%';
        });
      });
    });
    $('score-grid').onclick = function (e) {
      const card = e.target.closest('.score-card');
      if (card && card.dataset.dim) showScoreDetail(card.dataset.dim, data);
    };

    // 动作判定（七档 + 无持仓适配，源自 StockSentry 引擎）
    renderActionBox(data);

    // 硬性风控 / 盈亏比 交易计划（增强引擎缺失时自动降级为原「支撑阻力 + 交易计划」）
    renderPlanBox(data);

    // 九类轨道综合研判 + 个股画像
    renderChannelBox(data);
    renderProfileBox(data);

    const sigs = data.signals || [];
    const goodList = sigs.filter(function (x) { return x.type === '利好'; });
    const badList = sigs.filter(function (x) { return x.type === '利空'; });
    const neutralList = sigs.filter(function (x) { return x.type === '中性'; });
    const renderSigGroup = function (list, cls, label, key) {
      const listHtml = list.map(function (x) {
        return '<div class="signal-item"><span class="sig-type ' + cls + '">' + x.type + '</span><span>' + esc(x.text) + '</span></div>';
      }).join('');
      return '<div class="signal-group">' +
        '<div class="signal-group-label ' + cls + '" data-group="' + key + '">' + label + ' ' + list.length + '<span class="group-toggle">▸</span></div>' +
        '<div class="signal-list hidden" id="sig-list-' + key + '">' + (listHtml || '<div class="signal-empty">暂无该类信号</div>') + '</div>' +
        '</div>';
    };
    $('signal-box').innerHTML =
      '<div class="signal-title">信号面板</div>' +
      '<div class="signal-summary">' +
        '<span class="signal-count good">利好 ' + goodList.length + '</span>' +
        '<span class="signal-count bad">利空 ' + badList.length + '</span>' +
        '<span class="signal-count neutral">中性 ' + neutralList.length + '</span>' +
        '<span class="signal-count all">全部 ' + sigs.length + '</span>' +
      '</div>' +
      renderSigGroup(goodList, 'good', '利好', 'good') +
      renderSigGroup(badList, 'bad', '利空', 'bad') +
      renderSigGroup(neutralList, 'neutral', '中性', 'neutral');
    // 点击分组标题展开/收起
    $('signal-box').onclick = function (e) {
      const label = e.target.closest('.signal-group-label');
      if (!label) return;
      const key = label.dataset.group;
      const list = $('sig-list-' + key);
      if (!list) return;
      const isHidden = list.classList.toggle('hidden');
      const toggle = label.querySelector('.group-toggle');
      if (toggle) toggle.textContent = isHidden ? '▸' : '▾';
    };

    // 核心监控清单（七态判定，增强引擎缺失时降级为原 monitorItems）
    renderMonitorBox(data);

    // 8 章投研报告 + 一键下载 HTML / Markdown
    renderReportBox(data);

    initStockCharts();
    renderTrendsChart(data.trends || []);
    renderKline5Chart(data.kline5 || []);
    renderKlineChart(data.kline || [], data.indicators, {
      donchian: data.donchian,
      regression: data.regression,
      enhChart: (function () { const e = enhOf(data); return e && e.chart ? e.chart : null; })()
    });
    switchChart('trends');
    resizeStockCharts();
  }

  /* ---------- 自选股（关注列表） ---------- */
  let watchlistItems = [];

  async function loadWatchlist() {
    try {
      watchlistItems = JSON.parse(localStorage.getItem('stock-watchlist') || '[]');
    } catch (e) {
      watchlistItems = [];
    }
    renderWatchlist();
  }

  function renderWatchlist() {
    const box = $('watchlist-items');
    const count = $('watchlist-count');
    if (!box || !count) return;
    if (!watchlistItems.length) {
      box.innerHTML = '<span class="watchlist-empty">暂无关注，搜索股票后可点「关注」加入</span>';
      count.textContent = '';
      return;
    }
    count.textContent = watchlistItems.length + ' 只';
    box.innerHTML = watchlistItems.map(function (it) {
      return '<span class="watchlist-item" data-code="' + esc(it.code) + '">' +
        '<span class="wl-name">' + esc(it.name) + '</span>' +
        '<span class="wl-code">' + esc(it.code) + '</span>' +
        '<button class="wl-remove" title="删除" data-remove="' + esc(it.code) + '">✕</button>' +
        '</span>';
    }).join('');
    box.onclick = function (e) {
      const rm = e.target.closest('.wl-remove');
      if (rm) {
        e.stopPropagation();
        toggleWatch(rm.dataset.remove, '').then(function () {
          updateWatchBtn();
        });
        return;
      }
      const item = e.target.closest('.watchlist-item');
      if (item && item.dataset.code) {
        $('stock-search-input').value = item.dataset.code;
        fetchStockAnalysis();
      }
    };
  }

  async function toggleWatch(code, name) {
    // 本地维护 + localStorage 持久化
    const idx = watchlistItems.findIndex(function (it) { return it.code === code; });
    if (idx >= 0) {
      watchlistItems.splice(idx, 1);
    } else {
      watchlistItems.push({ code: code, name: name || code });
    }
    renderWatchlist();
    updateWatchBtn();
    try { localStorage.setItem('stock-watchlist', JSON.stringify(watchlistItems)); } catch (e) {}
  }

  function isWatched(code) {
    return watchlistItems.some(function (it) { return it.code === code; });
  }

  function updateWatchBtn() {
    const btn = $('watch-btn');
    if (!btn) return;
    const code = btn.dataset.code;
    if (isWatched(code)) {
      btn.classList.add('active');
      btn.textContent = '已关注';
    } else {
      btn.classList.remove('active');
      btn.textContent = '关注';
    }
  }

  function downloadStockReport(data, type) {
    // 优先导出增强引擎生成的 8 章投研报告（HTML / Markdown 双格式），
    // 纯前端 Blob + a[download] 实现，不经过任何后端接口。
    const enh = (data && data.enh && !data.enh.error && data.enh.reportMarkdown) ? data.enh : null;
    let content;
    if (type === 'html') {
      content = enh
        ? enh.reportHtml
        : '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(data.name) + ' 投研报告</title></head><body style="font-family:sans-serif;max-width:720px;margin:0 auto;padding:24px;line-height:1.7"><h1>' + esc(data.name) + '（' + esc(data.code) + '）投研报告</h1><pre style="white-space:pre-wrap">' + esc(data.report) + '</pre></body></html>';
    } else {
      content = enh
        ? enh.reportMarkdown
        : '# ' + data.name + '（' + data.code + '）投研报告\n\n' + data.report;
    }
    const blob = new Blob([content], { type: type === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = data.name + '_' + data.code + '.' + (type === 'html' ? 'html' : 'md');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  async function fetchStockAnalysis() {
    const kw = $('stock-search-input').value.trim();
    if (!kw) { $('stock-search-input').focus(); return; }
    hideError('stock-error');
    $('stock-body').classList.add('hidden');
    const emptyEl = $('stock-empty');
    emptyEl.classList.remove('hidden');
    emptyEl.innerHTML = '<div class="loading"><span class="spinner"></span>正在抓取数据并计算技术指标…</div>';

    try {
      const isCode = /^\d{6}$/.test(kw);
      let code = isCode ? kw : null;
      if (!code) {
        const stock = STOCK_DATA.resolveStockByKeyword(kw);
        if (!stock) throw new Error('未识别到有效股票，请输入 6 位股票代码或公司名');
        code = stock.code;
      }
      const data = await STOCK_DATA.analyzeStock(code);
      renderStockAnalysis(data);
      hideError('stock-error');
    } catch (e) {
      showError('stock-error', '分析失败：' + esc(e.message));
      emptyEl.innerHTML = '<div class="empty-icon">📊</div><p>输入股票名称或代码，开始智能分析</p>';
    }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    showEmpty('hot');
    showEmpty('feed');

    // 左侧导航切换视图（讨论 / 排行）
    document.querySelectorAll('.nav-item').forEach(function (nav) {
      nav.addEventListener('click', function () {
        switchView(nav.dataset.view);
      });
    });

    // 热搜榜点击股票名 → 打开详情并关闭浮层
    $('hot-list').addEventListener('click', function (e) {
      const kw = e.target.closest('.hot-keyword');
      if (kw && kw.dataset.keyword) {
        openStockDetail(kw.dataset.keyword);
        closeHotDropdown();
      }
    });

    // 详情视图
    $('btn-detail-back').addEventListener('click', closeStockDetail);
    $('btn-detail-prev').addEventListener('click', function () {
      if (state.detailPage > 1) { state.detailPage--; fetchStockDetail(); }
    });
    $('btn-detail-next').addEventListener('click', function () {
      state.detailPage++; fetchStockDetail();
    });
    $('btn-detail-sort-heat').addEventListener('click', function () {
      state.detailSort = 'heat'; state.detailPage = 1;
      $('btn-detail-sort-heat').classList.add('active');
      $('btn-detail-sort-time').classList.remove('active');
      fetchStockDetail();
    });
    $('btn-detail-sort-time').addEventListener('click', function () {
      state.detailSort = 'time'; state.detailPage = 1;
      $('btn-detail-sort-time').classList.add('active');
      $('btn-detail-sort-heat').classList.remove('active');
      fetchStockDetail();
    });

    $('btn-hot').addEventListener('click', toggleHotDropdown);
    $('hot-dropdown-mask').addEventListener('click', closeHotDropdown);
    $('btn-refresh-feeds').addEventListener('click', fetchFeeds);

    // 抽屉导航
    $('btn-menu').addEventListener('click', openDrawer);
    $('btn-close-drawer').addEventListener('click', closeDrawer);
    $('drawer-mask').addEventListener('click', closeDrawer);

    // 图表 tab 切换
    document.querySelectorAll('.chart-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { switchChart(tab.dataset.chart); });
    });

    // 评分依据与名词解释
    $('btn-score-help').addEventListener('click', showScoreHelp);
    $('btn-close-score-detail').addEventListener('click', function () { $('score-detail-modal').classList.add('hidden'); });
    $('btn-close-score-help').addEventListener('click', function () { $('score-help-modal').classList.add('hidden'); });
    $('score-detail-modal').addEventListener('click', function (e) { if (e.target.id === 'score-detail-modal') $('score-detail-modal').classList.add('hidden'); });
    $('score-help-modal').addEventListener('click', function (e) { if (e.target.id === 'score-help-modal') $('score-help-modal').classList.add('hidden'); });

    $('btn-open-config').addEventListener('click', openConfig);
    $('btn-close-config').addEventListener('click', closeConfig);
    $('btn-cancel-config').addEventListener('click', closeConfig);
    $('btn-save-config').addEventListener('click', saveConfig);
    $('config-modal').addEventListener('click', function (e) {
      if (e.target.id === 'config-modal') closeConfig();
    });

    // 搜索：支持公司名 / 股票代码
    $('btn-search').addEventListener('click', function () {
      state.keyword = $('feed-search-input').value.trim();
      state.page = 1;
      fetchFeeds();
    });
    $('feed-search-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        state.keyword = e.target.value.trim();
        state.page = 1;
        fetchFeeds();
      }
    });
    $('btn-search-clear').addEventListener('click', function () {
      $('feed-search-input').value = '';
      state.keyword = '';
      state.page = 1;
      fetchFeeds();
    });

    // 股票分析搜索
    $('btn-stock-search').addEventListener('click', fetchStockAnalysis);
    $('stock-search-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') fetchStockAnalysis();
    });
    window.addEventListener('resize', resizeStockCharts);

    // 排序 & 分页
    initSort();
    initPager();

    renderFilter();
    loadConfig();
    loadWatchlist();
    refreshAll();
  }

  init();
})();
