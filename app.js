/* Contract health prototype. Plain JS, no build step. */
(function () {
'use strict';

/* ---------------- helpers ---------------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem('ch_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ch_' + k, JSON.stringify(v)); } catch (e) {} }
};
const I = {
  grid: '<svg class="ico" viewBox="0 0 16 16"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>',
  list: '<svg class="ico" viewBox="0 0 16 16"><path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01"/></svg>',
  doc: '<svg class="ico" viewBox="0 0 16 16"><path d="M4 1.5h5.5L12.5 4.5v10H4z M9.5 1.5v3h3"/></svg>',
  chart: '<svg class="ico" viewBox="0 0 16 16"><path d="M2 12.5l3.5-4 3 2.5 5.5-6.5"/></svg>',
  plug: '<svg class="ico" viewBox="0 0 16 16"><path d="M6 3v3M10 3v3M4.5 6h7v2.5a3.5 3.5 0 0 1-7 0zM8 12v2.5"/></svg>',
  book: '<svg class="ico" viewBox="0 0 16 16"><path d="M3 2.5h7a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2z M3 11.5a2 2 0 0 1 2-2h7"/></svg>',
  spark: '<svg class="ico" viewBox="0 0 16 16"><path d="M8 1.5l1.4 3.6 3.6 1.4-3.6 1.4L8 11.5 6.6 7.9 3 6.5l3.6-1.4z"/></svg>',
  help: '<svg class="ico" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M6.3 6.2a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1M8 11.3h.01"/></svg>',
  play: '<svg class="ico" viewBox="0 0 16 16"><path d="M5 3.5v9l7-4.5z"/></svg>',
  mic: '<svg class="ico" viewBox="0 0 16 16"><rect x="5.75" y="1.5" width="4.5" height="8" rx="2.25"/><path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5"/></svg>',
  send: '<svg class="ico" viewBox="0 0 16 16"><path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5"/></svg>',
  x: '<svg class="ico" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  back: '<svg class="ico" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5"/></svg>',
  down: '<svg class="ico" viewBox="0 0 16 16"><path d="M4.5 6.5L8 10l3.5-3.5"/></svg>',
  search: '<svg class="ico" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3.5 3.5"/></svg>',
  check: '<svg class="ico" viewBox="0 0 16 16" style="width:11px;height:11px;stroke:#fff;stroke-width:2.2"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  feed: '<svg class="ico" viewBox="0 0 16 16" style="width:12px;height:12px"><path d="M2 11l3-3 2 2 5-5.5"/></svg>',
  bell: '<svg class="ico" viewBox="0 0 16 16"><path d="M4 11V7a4 4 0 0 1 8 0v4l1.5 1.5h-11zM6.5 14h3"/></svg>',
  pause: '<svg class="ico" viewBox="0 0 16 16"><path d="M5.5 3.5v9M10.5 3.5v9"/></svg>',
  next: '<svg class="ico" viewBox="0 0 16 16"><path d="M6 3.5L10.5 8 6 12.5"/></svg>'
};
const markPill = (c) => c.mark === 'billed' ? `<span class="pill rose"><i></i>${c.markLabel}</span>`
  : c.mark === 'sla' ? `<span class="pill purple"><i></i>${c.markLabel}</span>`
  : `<span class="pill amber"><i></i>${c.markLabel}</span>`;
const duePill = (d) => `<span class="pill num ${d.days <= 14 ? 'rose' : d.days <= 30 ? 'amber' : 'grey'}">${d.days} days left</span>`;

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }

/* ---------------- state ---------------- */
const S = {
  role: 'procurement',
  flow: 0,                 // how many FLOW_STEPS are done (0..6)
  stage: {},               // other contracts: 0 open, 1 sent, 2 supplier agreed, 3 confirmed
  confirmed: PORTFOLIO.confirmedSavings,
  secured: PORTFOLIO.securedSoFar,
  found: () => PORTFOLIO.foundSoFar,
  seats: 1300, proposedRise: 3, agreedRise: null, reply: null, letter: null, zvConfirmed: false,
  heroSeen: store.get('heroSeen', true),
  banner: false,
  filterCat: null,
  tab: 'month',
  chartMode: 'month',
  chat: [],
  menu: false,
  walk: -1,
  askOpen: false
};
const ZV = { unit: 21000, seats0: 2000, used: 1240 };
function zvCalc(seats, rise) {
  const cur = ZV.seats0 * ZV.unit * 1.07;
  const contractual = cur - seats * ZV.unit * 1.07;
  const negotiated = seats * ZV.unit * (0.07 - rise / 100);
  return { cur, contractual, negotiated, total: contractual + negotiated, newTotal: seats * ZV.unit * (1 + rise / 100) };
}
const NUM = (n) => Number(n).toLocaleString('en-IN');
const done = (c) => c.id === 'zenvault' ? S.flow >= 6 : (S.stage[c.id] || 0) >= 3;

/* ---------------- charts ---------------- */
let charts = [];
function disposeCharts() { charts.forEach(c => { try { c.dispose(); } catch (e) {} }); charts = []; }
addEventListener('resize', () => charts.forEach(c => c.resize()));
const axisStyle = { axisLine: { lineStyle: { color: 'rgba(180,205,208,0.22)' } }, axisTick: { show: false }, axisLabel: { color: '#8FA3A7', fontFamily: 'Hanken Grotesk, system-ui, sans-serif', fontSize: 11.5 }, splitLine: { lineStyle: { color: 'rgba(180,205,208,0.07)' } } };
const tipStyle = { backgroundColor: '#F5F6F6', borderWidth: 0, textStyle: { color: '#0B1821', fontFamily: 'Hanken Grotesk, system-ui, sans-serif', fontSize: 12.5 }, extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.35);padding:8px 10px' };
function mkChart(el, opt) {
  if (!el || !window.echarts) { if (el) el.innerHTML = '<div class="muted" style="padding:20px">Chart library did not load.</div>'; return null; }
  const c = echarts.init(el, null, { renderer: 'svg' });
  c.setOption(Object.assign({ animationDuration: reduceMotion() ? 0 : 900, animationEasing: 'cubicOut', textStyle: { fontFamily: 'Hanken Grotesk, system-ui, sans-serif' } }, opt));
  charts.push(c); return c;
}
const monthsLabels = (() => { const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const out = []; for (let m = 0; m < 47; m++) { const y = 2024 + Math.floor(m / 12); out.push(M[m % 12] + ' ' + String(y).slice(2)); } return out; })();

function overviewChart(el) {
  const past = PORTFOLIO.monthly, n = past.length;
  const fut = Array(12).fill(past[n - 1]);
  if (S.chartMode === 'month') {
    mkChart(el, {
      grid: { left: 52, right: 12, top: 26, bottom: 28 },
      tooltip: Object.assign({ trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.04)' } },
        formatter: (p) => { const it = p.find(x => x.value != null); return it ? `<b>${it.axisValue}</b><br>${it.seriesIndex === 1 ? 'If nothing changes: ' : 'Extra paid: '}${MONEY(it.value)}` : ''; } }, tipStyle),
      xAxis: Object.assign({ type: 'category', data: monthsLabels, axisLabel: { color: '#8FA3A7', fontSize: 11.5, interval: 11 } }, { axisLine: axisStyle.axisLine, axisTick: axisStyle.axisTick }),
      yAxis: Object.assign({ type: 'value', axisLabel: { color: '#8FA3A7', fontSize: 11.5, formatter: v => v ? '₹' + v / 1e5 + ' L' : '₹0' } }, { splitLine: axisStyle.splitLine }),
      series: [
        { type: 'bar', stack: 's', barWidth: '62%', data: past.map((v, i) => ({ value: v, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#C98BD3' }, { offset: 1, color: '#3FA7A0' }]), opacity: i === n - 1 ? 1 : 0.62, borderRadius: [3, 3, 0, 0] } })).concat(Array(12).fill(null)),
          markLine: { silent: true, symbol: 'none', label: { show: true, formatter: 'Today', color: '#C9D6D8', fontFamily: 'Hanken Grotesk, system-ui, sans-serif' }, lineStyle: { color: 'rgba(245,246,246,0.35)', type: 'dashed' }, data: [{ xAxis: n - 1 }] } },
        { type: 'bar', stack: 's', barWidth: '62%', data: Array(n).fill(null).concat(fut), itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(201,139,211,0.22)' }, { offset: 1, color: 'rgba(63,167,160,0.10)' }]), borderColor: 'rgba(201,139,211,0.55)', borderWidth: 1, borderType: 'dashed', borderRadius: [3, 3, 0, 0] } }
      ]
    });
  } else {
    let run = 0; const cum = past.map(v => (run += v));
    let r2 = run; const cumF = fut.map(v => (r2 += v));
    mkChart(el, {
      grid: { left: 60, right: 12, top: 26, bottom: 28 },
      tooltip: Object.assign({ trigger: 'axis', formatter: (p) => { const it = p.find(x => x.value != null); return it ? `<b>${it.axisValue}</b><br>Added up: ${MONEY(it.value)}` : ''; } }, tipStyle),
      xAxis: { type: 'category', data: monthsLabels, boundaryGap: false, axisLine: axisStyle.axisLine, axisTick: axisStyle.axisTick, axisLabel: { color: '#8FA3A7', fontSize: 11.5, interval: 11 } },
      yAxis: { type: 'value', splitLine: axisStyle.splitLine, axisLabel: { color: '#8FA3A7', fontSize: 11.5, formatter: v => v ? '₹' + (v / 1e7) + ' Cr' : '₹0' } },
      series: [
        { type: 'line', data: cum.concat(Array(12).fill(null)), symbol: 'none', lineStyle: { color: '#C98BD3', width: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(201,139,211,0.35)' }, { offset: 1, color: 'rgba(63,167,160,0.04)' }]) } },
        { type: 'line', data: Array(n - 1).fill(null).concat([cum[n - 1]], cumF), symbol: 'none', lineStyle: { color: '#C98BD3', width: 2, type: 'dashed' } }
      ]
    });
  }
}
function categoryChart(el) {
  const cats = PORTFOLIO.categories.slice().reverse();
  const c = mkChart(el, {
    grid: { left: 118, right: 54, top: 6, bottom: 6 },
    tooltip: Object.assign({ trigger: 'item', formatter: (p) => `<b>${p.name}</b><br>${MONEY(p.value)} a year<br><span style="color:#4D565D">${cats[p.dataIndex].note}</span><br><span style="color:#92429F">Click to see these contracts</span>` }, tipStyle),
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: cats.map(c => c.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#C9D6D8', fontSize: 12.5 } },
    series: [{ type: 'bar', barWidth: 12, cursor: 'pointer',
      data: cats.map(c => ({ value: c.value, itemStyle: { color: (S.filterCat ? S.filterCat === c.name : c.name === 'Software') ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#3FA7A0' }, { offset: 1, color: '#C98BD3' }]) : '#2C6E75', borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', color: '#F5F6F6', fontFamily: 'Hanken Grotesk, system-ui, sans-serif', fontSize: 12, formatter: p => MONEY(p.value) },
      showBackground: true, backgroundStyle: { color: 'rgba(255,255,255,0.04)', borderRadius: [0, 4, 4, 0] } }]
  });
  if (c) c.on('click', (p) => { S.filterCat = S.filterCat === p.name ? null : p.name; renderApp(); setTimeout(() => { const t = $('#todo'); if (t) t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); }, 60); });
}
function contractChart(el, c) {
  const ch = c.chart, bar = ch.kind === 'bar';
  mkChart(el, {
    grid: { left: 56, right: 16, top: 34, bottom: 28 },
    legend: { top: 0, right: 0, data: [ch.a.name, ch.b.name], textStyle: { color: '#C9D6D8', fontFamily: 'Hanken Grotesk, system-ui, sans-serif', fontSize: 12 }, itemWidth: 14, itemHeight: 8, icon: bar ? 'roundRect' : 'path://M0,0 L14,0 L14,2.5 L0,2.5 Z' },
    tooltip: Object.assign({ trigger: 'axis', formatter: (ps) => `<b>${ps[0].axisValue}</b>` + ps.filter(p => !p.seriesName.startsWith('_')).map(p => `<br>${p.marker}${p.seriesName}: ${p.value} ${ch.unit}`).join('') }, tipStyle),
    xAxis: { type: 'category', data: ch.x, boundaryGap: bar, axisLine: axisStyle.axisLine, axisTick: axisStyle.axisTick, axisLabel: axisStyle.axisLabel },
    yAxis: { type: 'value', scale: !bar, splitLine: axisStyle.splitLine, axisLabel: axisStyle.axisLabel, name: ch.unit, nameTextStyle: { color: '#8FA3A7', fontFamily: 'Hanken Grotesk, system-ui, sans-serif', align: 'left' } },
    series: [
      { name: ch.a.name, type: ch.kind, data: ch.a.data, symbol: 'circle', symbolSize: 6, lineStyle: { color: '#C98BD3', width: 2.5 }, itemStyle: { color: bar ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#C98BD3' }, { offset: 1, color: '#3FA7A0' }]) : '#C98BD3', borderRadius: bar ? [3, 3, 0, 0] : 0 }, barGap: '20%', barWidth: bar ? 18 : undefined },
      { name: ch.b.name, type: ch.kind, data: ch.b.data, symbol: 'circle', symbolSize: 6, lineStyle: { color: '#7FD3CC', width: 2.5, type: bar ? 'solid' : 'dashed' }, itemStyle: { color: bar ? 'rgba(127,211,204,0.55)' : '#7FD3CC', borderRadius: bar ? [3, 3, 0, 0] : 0 }, barWidth: bar ? 18 : undefined,
        areaStyle: undefined },
      ...(bar ? [] : [{ name: '_gapbase', type: 'line', data: ch.b.data, stack: 'gap', symbol: 'none', lineStyle: { opacity: 0 }, tooltip: { show: false }, silent: true },
        { name: '_gap', type: 'line', data: ch.a.data.map((v, i) => +(v - ch.b.data[i]).toFixed(2)), stack: 'gap', symbol: 'none', lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false }, areaStyle: { color: 'rgba(201,139,211,0.18)' } }])
    ]
  });
}

/* ---------------- router ---------------- */
const ROUTES = ['story', 'signin', 'overview', 'working', 'integrations', 'supplier'];
function route() {
  closeMenus();
  const h = location.hash.slice(1) || 'story';
  disposeCharts();
  endTour(true);
  if (h === 'walkthrough') { startWalk(); return; }
  if (h === 'story') return renderStory();
  if (h.startsWith('sec-')) { if (!$('.story')) renderStory(); const t = document.getElementById(h); if (t) setTimeout(() => t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' }), 30); return; }
  if (h === 'signin') return renderSignin();
  if (S.role === 'supplier' && (h === 'overview' || h.startsWith('c-'))) return renderSupplier();
  renderApp();
}
addEventListener('hashchange', () => { const sec = location.hash.startsWith('#sec-'); route(); if (S.walk < 0 && !sec) scrollTo(0, 0); });
const go = (h) => { if (location.hash.slice(1) === h) route(); else location.hash = h; };

/* ---------------- story page ---------------- */
function renderStory() {
  const ev = [
    { big: '~9%', t: 'of a business\'s yearly value is lost through poor contract management, on average. The best lose about 3%.', s: 'World Commerce & Contracting, 2025', u: 'https://info.worldcc.com/contract-management-aug-2025' },
    { big: '11%', t: 'of contract value is lost on average once deals move into delivery, after signing.', s: 'WorldCC with Ironclad, via Digital Journal', u: 'https://www.digitaljournal.com/business/contracts-signed-value-lost-how-businesses-are-leaking-11-of-spend/article' },
    { big: 'up to 8%', t: 'of freight spend is won back by freight bill audits, from wrong charges.', s: 'Modern Materials Handling', u: 'https://www.mmh.com/article/average_savings_found_after_a_freight_bill_audit/cerasis' },
    { big: '2–4%', t: 'of audited spend is usually won back by recovery audits, and 10–20% on some supplier contracts.', s: 'SC&H Group', u: 'https://www.schgroup.com/?p=65367' }
  ];
  const secHead = (id, n, q, sub) => `<div class="sec-num">${n}</div><h2>${q}</h2>${sub ? `<p class="body">${sub}</p>` : ''}`;
  const part = (title, sub) => `<div class="part spot"><div class="story-wrap"><div class="part-k">${title}</div><div class="part-s">${sub}</div></div></div>`;
  $('#root').innerHTML = `
  <div class="story view">
    <header class="story-nav">
      <div class="brand"><span class="av" style="background:var(--teal);border-radius:7px">${I.chart}</span>Contract health <span class="muted" style="font-weight:400;font-size:12.5px">A Sirion case study</span></div>
      <nav aria-label="Sections"><a href="#sec-video">Watch</a><a href="#sec-stage">Product</a><a href="#sec-tech">Tech</a></nav>
      <div style="margin-left:auto;display:flex;gap:8px"><a class="btn primary" href="#signin">Open the live product</a></div>
    </header>

    <div class="story-hero">
      <div class="story-wrap">
        <div class="rise cpill"><span class="newdot"></span>New in Sirion<span class="newsep"></span><b>Contract health</b></div>
        <h1 class="rise" style="animation-delay:.1s">Your contract repository just got smarter.</h1>
        <p class="lead rise" style="animation-delay:.2s">Every morning it rereads each signed supplier contract, checks it against invoices and market prices, and tells the right person what to fix before the deadline passes.</p>
        <div class="rise ctas" style="animation-delay:.3s;display:flex;gap:12px;margin-top:30px;flex-wrap:wrap"><a class="btn primary big" href="#signin">Open the live product <span class="arr">→</span></a><a class="btn outline big" href="#sec-video">Watch the 2-minute video <span class="arr">→</span></a></div>
        <div class="rise heroframe" style="animation-delay:.45s"><div class="hf-in">
          <div class="hf-cell"><span>Demo company</span><b>Asian Paints</b><em>illustrative</em></div>
          <div class="hf-cell"><span>Service suppliers in scope</span><b class="num">2,500</b><em>in scope</em></div>
          <div class="hf-cell"><span>Found at stake each year</span><b class="num">₹6.8 Cr</b><em>illustrative</em></div>
          <div class="hf-cell"><span>Need action today</span><b class="num">69</b><em>contracts</em></div>
        </div></div>
      </div>
    </div>

    <section class="sec" id="sec-video"><div class="story-wrap">
      <div class="sec-num">Start here</div>
      <h2>Why read, when you can see!</h2>
      <p class="body">A two-minute tour of the product, with voiceover.</p>
      <div class="videobox"><video id="walkVideo" src="walkthrough.mp4?v=2" poster="poster.jpg?v=2" controls playsinline preload="metadata" aria-label="Two-minute walkthrough of Contract health"></video></div>
      <p class="muted" style="font-size:13px;margin-top:10px">Prefer to drive? <a href="#walkthrough">Play the same tour live inside the product</a>, or <a href="#signin">open it and click around</a>.</p>
    </div></section>

    ${part("Let's talk product", 'What we built, for whom, and why')}

    <section class="sec" id="sec-stage"><div class="story-wrap">
      ${secHead('sec-stage', 'The stage', 'Which stage?', 'The brief offers three stages: intake, negotiation and the intelligent repository. I picked the <b>intelligent repository</b>, the stage after a contract is signed.')}
      <div class="grid3" style="margin-top:18px">
        <div class="reason"><h3>All three named problems happen here</h3><p>Auto-renewals nobody reviews, service levels that get missed, and invoices that don't match agreed prices. Every one of them happens after signing.</p></div>
        <div class="reason"><h3>Nobody watches after signing</h3><p>Procurement and Legal move on to the next deal. Business teams don't read contracts. So when terms drift, nobody notices.</p></div>
        <div class="reason"><h3>Every gap is a fact you can check</h3><p>The contract is signed, so what it says is fixed. Comparing it with invoices and usage shows a clear gap, not an opinion. Intake and negotiation can't offer that.</p></div>
      </div>
      <div class="whyap">
        <div class="wa-l"><span class="tpill">The customer</span><h3>Large companies that buy from thousands of suppliers and manage contracts by hand.</h3>
          <p>Think of a manufacturer with about 3,000 employees and 2,500 service suppliers: logistics, staffing, facilities, IT. Contracts sit in email and shared drives, and nobody owns the renewal calendar. The demo follows Procurement at a company like Asian Paints, but nothing in the product depends on the industry. Day one is small. Sirion's Extraction Agent reads the contracts renewing in the next 90 days, a person confirms the terms once, and Contract health compares them with invoices already in the ERP and with market rates such as diesel and inflation.</p></div>
        <div class="wa-r">
          <div><b class="num">3,000</b><span>employees</span></div>
          <div><b class="num">2,500</b><span>service suppliers in scope</span></div>
          <div><b>None</b><span>contract tool today</span></div>
        </div>
      </div>
      <div class="note" style="margin-top:16px;max-width:860px">The first release does one job well. It catches supplier contracts that are billed above their agreed or market rate, or are about to renew on their own, and gets a fix approved before the notice deadline. Everything else is on the roadmap.</div>
    </div></section>

    <section class="sec" id="sec-who"><div class="story-wrap">
      ${secHead('sec-who', 'The people', 'Who are we building for?', 'Many people touch a supplier contract. The closer to the centre, the more the product changes their day. Click anyone to see what they want and who they clash with.')}
      <div class="pim" id="pim"></div>
      <div class="pim-wrap">
        <div class="pim-detail" id="stakedetail"></div>
        <div><h3 class="h3" style="margin-top:0">Where they pull against each other</h3><div class="clashes" id="clashes"></div></div>
      </div>
    </div></section>

    <section class="sec" id="sec-pain"><div class="story-wrap">
      ${secHead('sec-pain', 'The pain', 'What hurts them most, and what do we fix first?', '')}
      <div class="painlist">
        ${[['procurement', 'Can\'t reread 2,500 contracts. Finds problems only after the invoice is paid, or after the renewal date has passed.'], ['owner', 'Is asked to cut costs, but has no clear view of what the team actually uses.'], ['legal', 'Gets rushed notices days before a deadline, with no clause references.'], ['finance', 'Sees "savings" claimed that never show up in the books.'], ['supplier', 'Gets vague complaints instead of clear requests it can act on.']].map(p => { const x = PEOPLE[p[0]]; return `<div class="pain"><span class="av" style="width:28px;height:28px;background:${x.color}">${x.initials}</span><div><b>${x.role.replace(' (business owner)', '').replace(', Zenvault', ' (supplier)')}</b><span>${p[1]}</span></div></div>`; }).join('')}
      </div>
      <h3 class="h3">How we decided what to fix first</h3>
      <p class="body">We scored each kind of drift on four questions: how much money is at stake, how often it happens, how reliably we can catch it from the data, and whether Procurement can fix it without a long negotiation. Only one comes first. The rest are on the roadmap.</p>
      <div class="grid2" style="margin-top:12px;align-items:start">
        <div class="card" style="padding:14px 14px 6px"><div style="font-weight:600;font-size:14px">Money at stake vs how reliably we can catch it</div><div class="muted" style="font-size:12.5px">Bigger circle: happens more often</div><div id="prioChart" style="height:300px" role="img" aria-label="Chart of six kinds of drift. Auto-renewals and billing above agreed rates are high money and easy to catch. Prices above market with no clause are hard to catch."></div></div>
        <div class="card" style="overflow:hidden"><table class="t"><thead><tr><th>Kind of drift</th><th>Money a year</th><th>Catch it reliably?</th><th>Priority</th></tr></thead><tbody>
          ${[['Auto-renewals and rate resets before the notice deadline', '₹2.6 Cr', 'Yes: dates and terms in the contract', 'First release', 'green'], ['Billed above agreed rates', '₹1.9 Cr', 'Yes: invoice vs rate card', 'Next', 'amber'], ['Price links not applied (fuel, raw materials)', '₹1.0 Cr', 'Yes: named index', 'Next', 'amber'], ['Rises above a price cap', '₹0.8 Cr', 'Yes: named index', 'Next', 'amber'], ['Missed service levels', '₹0.5 Cr', 'Partly: needs delivery data', 'Later', 'grey'], ['Above market, no clause to point to', 'Not counted', 'Hard: needs benchmarks', 'Later', 'grey']].map(r => `<tr style="cursor:default"><td>${r[0]}</td><td class="num">${r[1]}</td><td class="muted">${r[2]}</td><td><span class="pill ${r[4]}">${r[3]}</span></td></tr>`).join('')}
        </tbody></table></div>
      </div>
    </div></section>

    <section class="sec" id="sec-solve"><div class="story-wrap">
      ${secHead('sec-solve', 'The fix', 'The problem and the solution, in depth', '')}
      <h3 class="h3" style="margin-top:4px">The problem</h3>
      <p class="quote">A supplier's fuel charge stays at last year's rate while diesel gets cheaper, and the contract renews by itself in 13 days. Nobody notices until the invoice arrives.</p>
      <p class="body">A supplier contract is priced on the day it is signed, but market rates and invoices keep moving. Notice windows are short, the person who signed has often moved on, and nobody checks the invoice against the contract. Across 2,500 suppliers this adds up to crores a year in overcharges and renewals nobody chose. Contract health closes that gap. Each morning it compares every contract with what the supplier bills and what the market does, and gives the right person one clear action. Software licences come later as an add-on, because they need usage data that companies don't always share.</p>
      <div class="lightcard evcard"><div class="ev-h"><h3>Independent research says the same</h3><p class="muted">Value leaks after signing in every industry. These independent studies show how common it is. The figures inside the demo are illustrative.</p></div><div class="ev-g">${ev.map(e => `<div class="ev"><b class="num">${e.big}</b><p>${e.t}</p><a href="${e.u}" target="_blank" rel="noopener">${e.s} ↗</a></div>`).join('')}</div></div>
      <h3 class="h3">The solution, in five steps</h3>
      <div class="tiles" id="tiles" role="tablist" aria-label="The five steps">${STEPS.map((x, i) => `<button class="tile${i === 0 ? ' on' : ''}" role="tab" aria-selected="${i === 0}" data-i="${i}"><span class="tb">${I[x.ico] || I.doc}</span>${x.name}<span class="dot"></span></button>`).join('')}</div>
      <div class="tilepanel" id="tilepanel"></div>
      <div class="note" style="margin-top:16px;max-width:860px"><b style="color:#fff">What it never does:</b> send anything to a supplier on its own. It reads, compares, explains and drafts. People decide.</div>
      <div class="note" style="margin-top:10px;max-width:860px"><b style="color:#fff">About the demo:</b> suppliers, people and amounts are made up. Contracts start from the next 90 days of renewals. Invoices come from the ERP (SAP S/4HANA here). News, diesel and inflation feeds are live.</div>
    </div></section>

    <section class="sec" id="sec-right"><div class="story-wrap">
      ${secHead('sec-right', 'The proof', 'Have we built it right? What would say otherwise?', '')}
      <div class="grid2" style="margin-top:8px">
        <div class="stat"><div class="muted" style="font-size:12.5px">The one number we steer by</div><b style="font-size:26px;margin-top:4px;line-height:1.2">Money saved or won back, confirmed by Finance</b><p>Three stages, so nothing is counted early: <b style="color:#fff">found</b> (flagged), <b style="color:#fff">secured</b> (the contract allows it, or the supplier agreed in writing) and <b style="color:#fff">confirmed</b> (a credit note, refund or lower invoice is in the books). The headline is confirmed only.</p><a href="#working">See it live in the product ↗</a></div>
        <div class="stat"><div class="muted" style="font-size:12.5px">How we'll know it works</div>
          <div class="metric-row" style="border-top:0"><span>Flags acted on before the deadline</span><span class="muted">Aim</span><b class="num">70%+</b></div>
          <div class="metric-row"><span>Flags a person says are right</span><span class="muted">Aim</span><b class="num">85%+</b></div>
          <div class="metric-row"><span>Days from flag to action</span><span class="muted">Aim</span><b class="num">5 or fewer</b></div>
          <div class="metric-row"><span>Found money that Finance confirms</span><span class="muted">Aim</span><b class="num">50%+</b></div>
        </div>
      </div>
      <h3 class="h3">What would tell us we're wrong</h3>
      <div class="grid3">
        <div class="reason"><h3>Too many false flags</h3><p>People reject more than 1 in 5 flags for two months. The checks are noise, and we fix them before anything else.</p></div>
        <div class="reason"><h3>Flags, but no action</h3><p>Fewer than half of flags are acted on before the deadline. Then the problem is who owns the work, not finding it.</p></div>
        <div class="reason"><h3>Found, but never banked</h3><p>Under 25% of found money is confirmed after two quarters. Suppliers are pushing back, or the savings were never real.</p></div>
      </div>
    </div></section>

    <section class="sec" id="sec-future"><div class="story-wrap">
      ${secHead('sec-future', 'The road ahead', 'What does the future look like?', '')}
      <div class="roadmap">
        <div class="rm"><div class="rk">Now <span class="muted">this prototype</span></div><ul><li>Supplier contracts checked every morning against invoices and market rates</li><li>One overcharge and renewal walked through every person, including a supplier that doesn't reply</li><li>AskSirion by typing or voice, with live headlines</li><li>Live news, diesel and inflation feeds</li><li>Found, secured and confirmed kept apart</li></ul></div>
        <div class="rm"><div class="rk">Next <span class="muted">3 to 6 months</span></div><ul><li>Software contracts as an add-on, with usage from sign-in logs where a company allows it</li><li>Live supplier portal for replies and credit notes</li><li>Alerts in Teams, Slack and email</li><li>Next checks: billing above rate cards, price links like fuel, rises above a cap</li></ul></div>
        <div class="rm"><div class="rk">Later <span class="muted">6 to 18 months</span></div><ul><li>Stop drift at the source: suggest price caps and price links during negotiation</li><li>Fair-price benchmarks across Sirion customers, kept anonymous</li><li>Routine claims run end to end, with one approval</li></ul></div>
      </div>
    </div></section>

    ${part("Let's talk tech", 'The hard parts, and how the pieces fit')}

    <section class="sec" id="sec-tech"><div class="story-wrap">
      ${secHead('sec-tech', 'The hard parts', 'What are the major tech challenges, and how do we tackle them?', '')}
      <div class="challenges">
        ${[
          ['Reading price terms correctly', 'Prices hide in schedules, formulas and later amendments.', 'Use Sirion\'s Extraction Agent, show the clause and page next to every number, and ask a person to confirm a term the first time it is used.'],
          ['Matching invoices to the right contract', 'Supplier names, order numbers and line items rarely line up neatly.', 'Match on order number, supplier ID and amount. Send unclear matches to a person instead of guessing.'],
          ['Knowing the fair price', 'Market prices are scattered, and good benchmarks cost money.', 'Use the index the contract itself names (diesel, inflation) wherever it exists. Use licensed benchmarks for software and staffing. Never say "above market" without naming the source.'],
          ['Too many alerts', 'Small gaps everywhere would bury the real ones.', 'Flag only above a money threshold, group flags by supplier, and stop showing a check that people keep marking wrong.'],
          ['Getting deadlines exactly right', 'Notice periods use business days and specific delivery rules.', 'Work out dates from the clause, show the working, and remind 60, 30 and 7 days ahead.'],
          ['AI making things up', 'One wrong number and nobody trusts the product.', 'AI reads and drafts. Plain code does all the maths. Every claim links to the clause, invoice or feed it came from.'],
          ['Who can see what', 'Suppliers, Legal and Finance need different views.', 'Use Sirion\'s existing permissions. Suppliers see only their own notice.'],
          ['Checking 2,500 contracts every day', 'Rechecking everything nightly is slow and costly.', 'Recheck only what changed (a new invoice, a new price, a date getting close), and do a full check once a week.']
        ].map(c => `<div class="chal"><b>${c[0]}</b><div><span class="ck">The problem</span>${c[1]}</div><div><span class="ck">How we handle it</span>${c[2]}</div></div>`).join('')}
      </div>
    </div></section>

    <section class="sec" id="sec-arch"><div class="story-wrap">
      ${secHead('sec-arch', 'How it fits', 'How do the pieces fit together?', 'Contracts, invoices and approvals stay in Sirion. Contract health adds a daily check on top, and sends its work back into Sirion.')}
      <div class="card" style="padding:16px"><svg viewBox="0 0 1100 300" role="img" aria-label="Three inputs feed a daily check made of plain code and AI. Its flags go to the overview and AskSirion, to Sirion approvals and the supplier portal, and Finance confirms savings. People's feedback flows back to improve the checks." style="display:block;width:100%;height:auto">
        <g font-family="Hanken Grotesk, system-ui, sans-serif">
          ${[['Sirion repository', 'Contracts and terms from the Extraction Agent', 20], ['SAP S/4HANA and Ariba', 'Invoices, orders, supplier details', 115], ['Outside feeds', 'Prices, diesel, inflation, usage', 210]].map(b => `<rect x="10" y="${b[2]}" width="240" height="70" rx="10" fill="#0B1821" stroke="rgba(159,211,216,0.35)"/><text x="26" y="${b[2] + 30}" font-size="14" font-weight="600" fill="#F5F6F6">${b[0]}</text><text x="26" y="${b[2] + 50}" font-size="12" fill="#8FA3A7">${b[1]}</text>`).join('')}
          <rect x="370" y="40" width="300" height="220" rx="14" fill="rgba(13,94,104,0.28)" stroke="#3FA7A0"/>
          <text x="390" y="72" font-size="15" font-weight="600" fill="#fff">Daily check</text>
          <rect x="390" y="88" width="260" height="70" rx="10" fill="#0B1821" stroke="rgba(180,205,208,0.25)"/><text x="406" y="116" font-size="13.5" font-weight="600" fill="#F5F6F6">Plain code does the maths</text><text x="406" y="136" font-size="12" fill="#8FA3A7">Compare, total, check deadlines</text>
          <rect x="390" y="170" width="260" height="70" rx="10" fill="#0B1821" stroke="rgba(201,139,211,0.5)"/><text x="406" y="198" font-size="13.5" font-weight="600" fill="#F5F6F6">AI reads and writes</text><text x="406" y="218" font-size="12" fill="#8FA3A7">Reads clauses, explains, drafts</text>
          ${[['Overview and AskSirion', 'What\'s wrong, and what to do', 20], ['Sirion approvals', 'Owner, Legal, supplier portal', 115], ['Finance confirms', 'Only then it counts as saved', 210]].map(b => `<rect x="790" y="${b[2]}" width="300" height="70" rx="10" fill="#0B1821" stroke="rgba(146,66,159,0.55)"/><text x="806" y="${b[2] + 30}" font-size="14" font-weight="600" fill="#F5F6F6">${b[0]}</text><text x="806" y="${b[2] + 50}" font-size="12" fill="#8FA3A7">${b[1]}</text>`).join('')}
        </g>
        <g fill="none" stroke="#7FD3CC" stroke-width="2" stroke-dasharray="6 6">
          ${[55, 150, 245].map(y => `<path d="M250,${y} C310,${y} 310,150 370,150"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.2s" repeatCount="indefinite"/></path>`).join('')}
          ${[55, 150, 245].map(y => `<path d="M670,150 C730,150 730,${y} 790,${y}"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.2s" repeatCount="indefinite"/></path>`).join('')}
        </g>
        <path d="M940,282 C940,298 520,298 520,262" fill="none" stroke="rgba(201,139,211,0.7)" stroke-width="1.5" stroke-dasharray="4 5"/>
        <text x="730" y="296" text-anchor="middle" font-family="Hanken Grotesk, system-ui, sans-serif" font-size="11.5" fill="#C98BD3">People mark flags right or wrong, and the checks get better</text>
      </svg></div>
    </div></section>

    <section class="sec" id="sec-ai"><div class="story-wrap">
      ${secHead('sec-ai', 'AI and code', 'What does AI do, and what does plain code do?', 'Trust matters more than cleverness here, so each job goes to the tool that can be checked.')}
      <div class="grid2">
        <div class="reason"><h3 style="color:var(--purple-l)">AI does</h3><p>Reads clauses and finds the terms that matter. Explains a flag in plain English. Drafts the notice or claim. Answers questions in AskSirion, always with the page it used.</p></div>
        <div class="reason"><h3 style="color:var(--teal-l)">Plain code does</h3><p>Every number: gaps, totals, savings. Every date: notice deadlines and reminders. Matching invoices to contracts. Deciding what is big enough to flag.</p></div>
      </div>
    </div></section>

    <section class="sec" style="text-align:center"><div class="story-wrap">
      <h2 style="margin:0 auto 10px">See it for yourself</h2>
      <p class="body" style="margin:0 auto 22px">Open the product as Priya, then follow one renewal through IT, Legal, the supplier and Finance. The flow card on the contract page tells you who is next.</p>
      <a class="btn primary big" href="#signin">Open the live product <span class="arr">→</span></a>
    </div></section>

    <footer class="story-foot"><div class="story-wrap">Illustrative data for a case study. A company like Asian Paints is used as an example persona; suppliers, people and numbers are made up. Built by Rishika Srivastava for the Sirion case assessment.</div></footer>
  </div>`;
  renderStakeMap('procurement');
  prioChart($('#prioChart'));
  wireTiles();
}
function prioChart(el) {
  const pts = [
    ['Auto-renewals', 9, 2.6, 30, '#E0517F'], ['Billed above rates', 8.6, 1.9, 34, '#E0A33A'], ['Price links not applied', 8.2, 1.0, 26, '#E0A33A'],
    ['Rises above a cap', 7.8, 0.8, 18, '#E0A33A'], ['Missed service levels', 5, 0.5, 24, '#E0A33A'], ['Above market, no clause', 2.6, 1.4, 22, '#5D939A']
  ];
  mkChart(el, {
    grid: { left: 48, right: 20, top: 20, bottom: 44 },
    tooltip: Object.assign({ formatter: p => `<b>${p.data[3]}</b><br>About ₹${p.data[1]} Cr a year` + (p.data[3].startsWith('Above') ? ' (estimate, not counted)' : '') }, tipStyle),
    xAxis: { type: 'value', min: 0, max: 10, name: 'How reliably we can catch it', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: '#8FA3A7', fontFamily: 'Hanken Grotesk, system-ui, sans-serif' }, axisLabel: { show: false }, splitLine: axisStyle.splitLine, axisLine: axisStyle.axisLine },
    yAxis: { type: 'value', min: 0, max: 3, axisLabel: { color: '#8FA3A7', formatter: v => '₹' + v + ' Cr' }, splitLine: axisStyle.splitLine },
    series: [{ type: 'scatter', data: pts.map(p => ({ value: [p[1], p[2], p[3], p[0]], symbolSize: p[3], itemStyle: { color: p[4], opacity: 0.85 } })),
      label: { show: true, position: 'right', formatter: p => p.data.value[3], color: '#E6EEEF', fontFamily: 'Hanken Grotesk, system-ui, sans-serif', fontSize: 11.5 },
      markArea: { silent: true, itemStyle: { color: 'rgba(63,167,160,0.06)' }, label: { show: true, position: 'insideTopLeft', formatter: 'Catchable', color: '#7FD3CC', fontFamily: 'Hanken Grotesk, system-ui, sans-serif' }, data: [[{ xAxis: 7 }, { xAxis: 10 }]] } }]
  });
}

const STEPS = [
  { name: 'Read', ico: 'doc', k: 'Every morning, every signed contract', p: "Sirion's Extraction Agent pulls the terms that matter from each contract: prices, renewal dates, notice periods, price caps and service levels.",
    demo: `<div class="tpd-h">Zenvault, IT service desk software</div><div class="tpd-row"><span>Price per seat</span><b>₹21,000 a year</b></div><div class="tpd-row"><span>Renews by itself</span><b>1 Jan 2027, +7%</b></div><div class="tpd-row"><span>Notice period</span><b>30 days</b></div><div class="tpd-row"><span>Price cap</span><b class="warnt">None found</b></div><div class="tpd-src">Clauses 3.1, 12.2, 12.3 · pages 4 and 11</div>` },
  { name: 'Compare', ico: 'search', k: 'Against what actually happened', p: 'Plain code compares those terms with invoices from SAP S/4HANA, orders from SAP Ariba, usage reports, and the price or index the contract names.',
    demo: `<div class="tpd-h">Western Roadways, Khandala to western depots</div><div class="tpd-row"><span>Diesel since April</span><b>₹6 a litre cheaper</b></div><div class="tpd-row"><span>Rate the contract allows</span><b>−2.4%</b></div><div class="tpd-row"><span>Rate on invoices since May</span><b class="warnt">No change</b></div><div class="tpd-src">Fuel price feed · freight invoices in SAP S/4HANA</div>` },
  { name: 'Flag', ico: 'bell', k: 'Only what is worth acting on', p: 'Anything off by more than a set amount becomes a flag, with the money at stake, the deadline, and the person who should act.',
    demo: `<div class="tpd-flag"><span class="pill rose"><i></i>Billed above the rate card</span><b>Prime Staffing Services</b><span>₹612 an hour billed. ₹560 agreed.</span><div class="tpd-row"><span>Overcharged so far</span><b>₹18.2 L</b></div><div class="tpd-row"><span>Owner</span><b>Priya, Procurement</b></div></div>` },
  { name: 'Act', ico: 'send', k: 'A draft, not a to-do', p: 'The right person gets a draft notice or claim that quotes the clause. Everyone who must say yes approves it in turn, inside Sirion.',
    demo: `<div class="tpd-h">Draft notice to Zenvault</div><p class="tpd-letter">Under clause 12.3, Asian Paints gives notice to reduce named users to 1,300 from the renewal date of 1 January 2027…</p><div class="tpd-appr"><span class="ok">✓ Arjun, IT</span><span class="ok">✓ Meera, Legal</span><span>Send to supplier</span></div>` },
  { name: 'Confirm', ico: 'chart', k: 'Saved means banked', p: 'Finance marks a saving secured when the contract allows it or the supplier agrees. It counts as confirmed only when a credit note, refund or lower invoice shows up in the books.',
    demo: `<div class="tpd-h">Zenvault renewal</div><div class="tpd-row"><span>New order in SAP Ariba</span><b>1,300 seats</b></div><div class="tpd-row"><span>Secured by Rahul, Finance</span><b>₹1.57 Cr a year</b></div><div class="tpd-row"><span>Confirmed in the books</span><b class="warnt">When the Jan invoice matches</b></div>` }
];
let tileT, tileI = 0;
function showTile(i) {
  tileI = i; const x = STEPS[i];
  $$('#tiles .tile').forEach((t, j) => { t.classList.toggle('on', j === i); t.setAttribute('aria-selected', j === i); });
  const p = $('#tilepanel'); if (!p) return;
  p.innerHTML = `<div class="tp-in"><div class="tpd" key="${i}">${x.demo}</div></div><div class="tp-txt"><h3>${x.name}</h3><div class="tp-k">${x.k}</div><p>${x.p}</p></div>`;
}
function wireTiles() {
  clearInterval(tileT); showTile(0);
  $$('#tiles .tile').forEach(t => t.onclick = () => { clearInterval(tileT); showTile(+t.dataset.i); });
  if (!reduceMotion()) tileT = setInterval(() => { if (!$('#tiles')) { clearInterval(tileT); return; } showTile((tileI + 1) % STEPS.length); }, 4500);
}

const STAKE = {
  procurement: { ring: 0, tag: 'We build for', x: 50, y: 84, p: PEOPLE.procurement, gives: 'A short list each morning of contracts that drifted, the money at stake, the deadline, and a ready draft.' },
  owner: { ring: 1, tag: 'Must say yes', x: 68.5, y: 66, p: PEOPLE.owner, gives: 'A say before anything changes. They confirm seats or service levels before a notice is drafted.' },
  legal: { ring: 1, tag: 'Must say yes', x: 50, y: 50, p: PEOPLE.legal, gives: 'Every notice quotes the exact clause, page and deadline. Nothing goes out without their approval.' },
  finance: { ring: 1, tag: 'Decides if it worked', x: 31.5, y: 66, p: PEOPLE.finance, gives: 'Savings count only when they confirm them, so the product matches the books.' },
  cpo: { ring: 2, tag: 'Pays for it', x: 21, y: 40, p: { name: 'Chief Procurement Officer', role: 'Sponsor', initials: 'CPO', color: '#4D565D', wants: 'Lower supplier costs she can show the board each quarter.', worries: 'Paying for another tool her team ignores.' }, gives: 'One number she can trust: money saved or won back, confirmed by Finance.' },
  supplier: { ring: 2, tag: 'On the other side', x: 79, y: 40, p: PEOPLE.supplier, gives: 'A clear request that quotes the clause, and a simple page to reply or counter-offer.' },
  ap: { ring: 3, tag: 'Not building for, yet', x: 50, y: 7, p: { name: 'Accounts payable', role: 'Invoice processing', initials: 'AP', color: '#3A464D', wants: 'Invoices paid on time without disputes.', worries: 'More invoices held for checking.' }, gives: 'Nothing new in this version. Invoice processing already has its own tools; we only read the invoices.' }
};
const CLASHES = [
  ['procurement', 'Cut the seats nobody uses', 'owner', "Don't break tools my team needs", 'Arjun confirms the seat count before any notice is drafted.'],
  ['procurement', 'Send the notice before the deadline', 'legal', 'Get every word exactly right', 'Drafts quote the clause and deadline, so Legal can check them in minutes.'],
  ['procurement', 'Get credit for money I found', 'finance', 'Count only money in the books', 'The main number counts only money Finance confirms.'],
  ['procurement', "Pay today's fair price", 'supplier', 'Keep the revenue and margin', 'Requests are factual and quote the clause. The supplier can reply with a counter-offer.']
];
function onionSVG() {
  const arc = (r) => `M${500 - r},500 A${r},${r} 0 0 1 ${500 + r},500 Z`;
  return `<svg viewBox="0 0 1000 500" aria-hidden="true" style="display:block;width:100%;height:auto">
    <defs><linearGradient id="ogc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B3FB0"/><stop offset="1" stop-color="#92429F"/></linearGradient>
    <linearGradient id="og3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5D939A"/><stop offset="1" stop-color="#3B7880"/></linearGradient></defs>
    <path d="M30,500 A470,470 0 0 1 970,500" fill="none" stroke="rgba(180,205,208,0.35)" stroke-width="1.5" stroke-dasharray="2 6"/>
    <path d="${arc(400)}" fill="url(#og3)" opacity="0.55"/>
    <path d="${arc(285)}" fill="#1E6F78" stroke="rgba(255,255,255,0.12)"/>
    <path d="${arc(150)}" fill="url(#ogc)" stroke="rgba(255,255,255,0.18)"/>
    <g font-family="Hanken Grotesk, system-ui, sans-serif" font-size="15" fill="rgba(245,246,246,0.85)">
      <text x="500" y="492" text-anchor="middle" font-size="13" fill="rgba(255,255,255,0.75)">Uses it every day</text>
      <text x="282" y="492" text-anchor="middle">Must agree</text><text x="718" y="492" text-anchor="middle">Must agree</text>
      <text x="158" y="492" text-anchor="middle">Pays or reacts</text><text x="842" y="492" text-anchor="middle">Pays or reacts</text>
      <text x="62" y="492" text-anchor="middle" fill="rgba(180,205,208,0.7)">Later</text><text x="938" y="492" text-anchor="middle" fill="rgba(180,205,208,0.7)">Later</text>
    </g></svg>`;
}
function renderStakeMap(sel) {
  const pim = $('#pim'); if (!pim) return;
  pim.innerHTML = onionSVG() + Object.entries(STAKE).map(([k, s]) => `<button class="pchip r${s.ring} ${k === sel ? 'on' : ''}" data-k="${k}" style="left:${s.x}%;top:${s.y}%" aria-pressed="${k === sel}">
      <span class="av" style="background:${s.p.color}">${s.p.initials}</span><span class="pc-t"><b>${k === 'cpo' || k === 'ap' ? s.p.name : s.p.role.replace(' (business owner)', '').replace(', Zenvault', '')}</b><span>${s.tag}</span></span></button>`).join('');
  const s = STAKE[sel], p = s.p;
  const mine = CLASHES.filter(c => c[0] === sel || c[2] === sel);
  $('#stakedetail').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px"><span class="av" style="width:38px;height:38px;background:${p.color}">${p.initials}</span><div><div style="font-weight:600;font-size:17px">${p.name}</div><div class="muted" style="font-size:13px">${p.role}</div></div><span class="tpill" style="margin-left:auto">${s.tag}</span></div>
    <dl class="pd"><div><dt>Wants</dt><dd>${p.wants}</dd></div><div><dt>Worries about</dt><dd>${p.worries}</dd></div><div><dt>What Contract health gives them</dt><dd>${s.gives}</dd></div></dl>
    <div class="muted" style="font-size:13px">${mine.length ? `Pulls against ${mine.length === 1 ? 'one person' : mine.length + ' people'}, highlighted on the right.` : 'No direct clash in this version.'}</div>`;
  $('#clashes').innerHTML = CLASHES.map(c => { const a = STAKE[c[0]].p, b = STAKE[c[2]].p, on = c[0] === sel || c[2] === sel;
    return `<div class="clash ${on ? 'on' : ''}">
      <div class="cpair"><div class="cside"><span class="av" style="background:${a.color}">${a.initials}</span><div><span class="muted">${a.name.split(' ')[0]} wants</span><b>${c[1]}</b></div></div>
      <div class="cvs" aria-hidden="true"></div>
      <div class="cside"><span class="av" style="background:${b.color}">${b.initials}</span><div><span class="muted">${b.name.split(' ')[0]} wants</span><b>${c[3]}</b></div></div></div>
      <div class="cfix"><span class="muted">How the product settles it</span>${c[4]}</div></div>`; }).join('');
  $$('#pim .pchip').forEach(n => n.onclick = () => renderStakeMap(n.dataset.k));
}

/* ---------------- sign in ---------------- */
function renderSignin() {
  $('#root').innerHTML = `
  <div class="signin view">
    <section class="left">
      <div aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;overflow:hidden">
        <div class="glowmove" style="position:absolute;left:-120px;top:-160px;width:820px;height:640px;border-radius:50%;background:radial-gradient(closest-side,rgba(13,94,104,0.8),rgba(13,94,104,0))"></div>
        <div class="glowmove" style="position:absolute;right:-220px;bottom:-200px;width:700px;height:600px;border-radius:50%;background:radial-gradient(closest-side,rgba(146,66,159,0.35),rgba(146,66,159,0));animation-direction:alternate-reverse"></div>
        <svg class="waves" width="2400" height="900" viewBox="0 0 2400 900" style="position:absolute;left:0;top:0"><g fill="none" stroke="rgba(159,211,216,0.14)" stroke-width="1.2"><path d="M0,520 C200,470 400,590 600,540 S1000,450 1200,520 S1600,590 1800,540 S2200,450 2400,520"/><path d="M0,600 C200,550 400,670 600,620 S1000,530 1200,600 S1600,670 1800,620 S2200,530 2400,600"/><path d="M0,680 C200,630 400,750 600,700 S1000,610 1200,680 S1600,750 1800,700 S2200,610 2400,680"/></g></svg>
      </div>
      <div style="position:relative;display:flex;align-items:center;gap:10px"><span class="av" style="width:32px;height:32px;border-radius:9px;background:var(--teal)">${I.chart}</span><span style="font-weight:600;font-size:17px">Contract health</span></div>
      <div style="position:relative;margin-top:auto;max-width:520px">
        <div style="font-size:42px;line-height:1.08;font-weight:300;letter-spacing:-0.025em">Know which signed contracts have drifted, and fix them in time.</div>
        <p style="margin:14px 0 0;font-size:16px;color:#C9D6D8;line-height:1.55">For procurement, legal and finance teams using Sirion.</p>
      </div>
      <a href="#story" style="position:relative;margin-top:28px;font-size:13px">Read the case story first</a>
    </section>
    <section class="right">
      <div style="width:min(380px,100%)">
        <h1 style="margin:0;font-size:28px;font-weight:600;letter-spacing:-0.02em">Sign in</h1>
        <p style="margin:6px 0 24px;color:#4D565D">Want to look around? Use the demo. No account needed.</p>
        <button class="btn primary w100" id="demoIn">Continue with demo account</button>
        <p style="margin:8px 0 0;font-size:12.5px;color:#6B7479">Opens a sample workspace with example contracts and suppliers.</p>
        <div style="display:flex;align-items:center;gap:12px;margin:26px 0 20px;font-size:12.5px;color:#6B7479"><span style="flex:1;height:1px;background:#E3E9EA"></span>or sign in to your company<span style="flex:1;height:1px;background:#E3E9EA"></span></div>
        <button class="btn w100" id="ssoIn" style="background:#fff;border:1px solid #D3DCDD;color:var(--ink)">Continue with company single sign-on</button>
        <form id="mailIn" style="margin-top:14px">
          <label for="email" style="display:block;font-size:13px;font-weight:500;margin-bottom:6px">Work email</label>
          <div style="display:flex;gap:8px"><input id="email" type="email" placeholder="name@company.com" autocomplete="off"><button class="btn" type="submit" style="height:46px;background:var(--ink);color:#fff;padding:0 16px">Send link</button></div>
          <p id="mailMsg" style="margin:8px 0 0;font-size:12.5px;color:#6B7479">We'll email a one-time sign-in link. No password.</p>
        </form>
      </div>
    </section>
  </div>`;
  $('#demoIn').onclick = () => { S.role = 'procurement'; go('overview'); };
  $('#ssoIn').onclick = () => toast('Single sign-on is not set up in this demo. Use the demo button.');
  $('#mailIn').onsubmit = (e) => { e.preventDefault(); $('#mailMsg').textContent = 'This demo does not send email. Use "Continue with demo account" above.'; };
}

/* ---------------- app shell ---------------- */
function shell(active, centerHTML) {
  const p = PEOPLE[S.role];
  const urgent = CONTRACTS.filter(c => !done(c) && c.due.days <= 30).length;
  return `<div class="shell view${S.askOpen ? '' : ' ask-closed'}">
    <aside class="side">
      <div class="logo"><span class="mark">${I.chart}</span><div style="line-height:1.15"><div style="font-weight:600;font-size:14.5px">Contract health</div><div style="font-size:11.5px;color:var(--text-3)">Asian Paints</div></div></div>
      <nav class="nav" aria-label="Main">
        <a href="#overview" ${active === 'overview' ? 'aria-current="page"' : ''}>${I.grid}Overview</a>
        <a href="#overview" data-scroll="todo">${I.list}Needs attention${urgent ? `<span class="count num">${urgent}</span>` : ''}</a>
        <a href="#c-western" ${active === 'contract' ? 'aria-current="page"' : ''}>${I.doc}Contracts</a>
        <a href="#working" ${active === 'working' ? 'aria-current="page"' : ''}>${I.chart}Is it working?</a>
        <a href="#integrations" ${active === 'integrations' ? 'aria-current="page"' : ''}>${I.plug}Integrations</a>
      </nav>
      <nav class="nav" aria-label="Help" style="margin-top:auto">
        <a href="#story">${I.book}Case story</a>
        <button id="navNew"><span style="color:var(--purple-l);display:flex">${I.spark}</span>What's new</button>
        <button id="navTour">${I.help}Take the tour</button>
        <a href="#walkthrough">${I.play}Play walkthrough</a>
      </nav>
      <div style="display:flex;align-items:center;gap:10px;padding:12px 8px 4px;border-top:1px solid rgba(180,205,208,0.10)"><span class="av" style="width:30px;height:30px;background:${p.color}">${p.initials}</span><div style="line-height:1.2"><div style="font-size:13px">${p.name}</div><div style="font-size:11.5px;color:var(--text-3)">${p.name.toLowerCase().replace(/[^a-z ]/g, '').trim().split(' ')[0]}@company.com</div></div></div>
    </aside>
    <div class="center">
      ${active === 'overview' && S.heroSeen && S.banner ? annc() : ''}
      <header class="topbar">
        <label class="search">${I.search}<span class="sr">Search contracts</span><input type="search" placeholder="Search contracts and suppliers" id="searchBox"></label>
        <button class="btn primary" id="topAsk" style="margin-left:auto;height:34px">Ask Sirion</button>
        <button class="btn outline" id="topTour" style="margin-left:8px;height:34px">Take the tour</button>
        <div class="viewas" style="margin-left:12px"><button id="viewAsBtn" class="acct" aria-haspopup="menu" aria-expanded="${S.menu}" aria-label="Account: ${p.name}" title="${p.name}"><span class="av" style="background:${p.color};width:32px;height:32px">${p.initials}</span></button>${S.menu ? viewAsMenu() : ''}</div>
      </header>
      ${centerHTML}
    </div>
    ${askPanel()}
    ${S.askOpen ? '' : `<button class="askfab" id="askFab" aria-label="Open AskSirion"><span class="orb orbcore" style="width:28px;height:28px;display:grid;place-items:center;color:#fff">${I.mic}</span>Ask Sirion</button>`}
  </div>`;
}
function viewAsMenu() {
  const me = PEOPLE[S.role];
  return `<div class="menu" role="menu" aria-label="Account">
    <div style="display:flex;align-items:center;gap:10px;padding:10px 8px 12px;border-bottom:1px solid var(--line)"><span class="av" style="width:36px;height:36px;background:${me.color}">${me.initials}</span><span><span style="display:block;font-weight:600">${me.name}</span><span class="muted" style="font-size:12px">${me.role}, Asian Paints</span></span></div>
    <div class="muted" style="font-size:11.5px;padding:10px 8px 4px">Demo: switch user</div>
    ${Object.values(PEOPLE).map(p => `<button role="menuitemradio" aria-checked="${S.role === p.key}" data-role="${p.key}"><span class="av" style="width:26px;height:26px;background:${p.color}">${p.initials}</span><span style="flex:1;min-width:0"><span style="display:block;font-weight:500;font-size:13px">${p.name}</span><span class="muted" style="font-size:11.5px">${p.role}</span></span>${flowWaitingOn() === p.key ? '<span class="pill purple" style="font-size:11px">Waiting on</span>' : ''}</button>`).join('')}
  </div>`;
}
function closeMenus() { S.menu = false; }
function annc() {
  return `<div class="annc"><span aria-hidden="true" class="shine" style="position:absolute;top:0;bottom:0;left:0;width:22%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.10),rgba(255,255,255,0));pointer-events:none"></span>
    <span style="position:relative;font-size:11.5px;font-weight:600;background:rgba(255,255,255,0.14);padding:3px 8px;border-radius:6px;flex:none">New</span>
    <div class="tickwin" aria-live="off"><div class="tickin"><span>Your contracts just learned to read the market.</span><span>AskSirion can now talk. Tap the orb and ask out loud.</span><span>Get a heads-up before a review or renewal date slips past.</span><span>Your contracts just learned to read the market.</span></div></div>
    <button class="btn light" id="seeNew" style="position:relative;height:30px">See what's new</button>
    <button class="iconbtn" id="hideAnnc" aria-label="Hide this message" style="position:relative;background:transparent;color:#E6EEEF;width:28px;height:28px">${I.x}</button></div>`;
}

/* ---------------- overview ---------------- */
function launchHero() {
  const rows = [
    ['Zenvault', 'Software', 'amber', 'Renews at +7%', '₹1.68 Cr'],
    ['Infocrest Cloud', 'Software', 'green', 'Fine', ''],
    ['Prime Staffing', 'Staffing', 'rose', 'Billed above rate card', '₹18.2 L'],
    ['Coastline Carriers', 'Logistics', 'green', 'Fine', ''],
    ['Western Roadways', 'Logistics', 'rose', 'Fuel charge not cut', '₹10.8 L'],
    ['Brightline Media', 'Marketing', 'purple', 'Credits not claimed', '₹7.5 L']
  ];
  const feats = [
    ['doc', 'Reads every signed contract each morning', 'Prices, renewal dates, price caps and service levels, from all 2,500 supplier contracts.'],
    ['chart', 'Spots money slipping away', 'Flags contracts priced above the market, or billed against the terms you agreed.'],
    ['list', 'Tells you what to do, and by when', 'Each flag comes with the deadline, the clause that backs you, and a draft ready to send.'],
    ['mic', 'Lets you ask out loud', 'Talk to AskSirion about any contract. Tap the orb to try it.']
  ];
  return `<section class="hero hero2" id="hero" aria-label="Introducing Contract health">
    <div aria-hidden="true" class="hero-bg">
      <div class="glowmove" style="position:absolute;left:38%;top:-180px;width:720px;height:460px;border-radius:50%;background:radial-gradient(closest-side,rgba(13,94,104,0.85),rgba(13,94,104,0))"></div>
      <div class="glowmove" style="position:absolute;right:-160px;bottom:-200px;width:600px;height:460px;border-radius:50%;background:radial-gradient(closest-side,rgba(146,66,159,0.45),rgba(146,66,159,0));animation-direction:alternate-reverse"></div>
      
    </div>
    <button class="iconbtn" id="heroClose" aria-label="Close and go to my contracts" style="position:absolute;top:16px;right:16px;z-index:3;border:1px solid rgba(255,255,255,0.14);background:rgba(6,20,30,0.5);color:#E6EEEF;width:32px;height:32px">${I.x}</button>
    <div class="hero-grid">
      <div>
        <div class="hx cpill"><span class="newdot"></span>New in Sirion<span class="newsep"></span><b>Contract health</b></div>
        <h2 class="hx" style="animation-delay:.1s">Your contract repository just got smarter.</h2>
        <ul class="feats">${feats.map((f, i) => `<li class="hx${i === 0 ? ' on' : ''}" style="animation-delay:${0.25 + i * 0.1}s"><span class="fi">${I[f[0]]}</span><div><b>${f[1]}</b><span>${f[2]}</span></div></li>`).join('')}</ul>
        <div class="hx" style="animation-delay:.7s;display:flex;gap:10px;margin-top:24px;flex-wrap:wrap"><button class="btn primary big" id="heroGo">See what needs fixing <span class="arr">→</span></button><button class="btn outline big" id="heroTour">Take the 1-minute tour <span class="arr">→</span></button></div>
      </div>
      <div class="scan hx" style="animation-delay:.35s" aria-label="Animation: AskSirion reads 2,500 contracts and finds 69 that need attention"><div class="scan-in">
        <div class="scan-head">
          <button class="orbbtn" id="heroOrb" aria-label="Talk to AskSirion" style="width:48px;height:48px">
            <span class="orbring" style="position:absolute;inset:2px;border-radius:50%;border:1.5px solid rgba(159,211,216,0.6)"></span>
            <span class="orb orbcore" style="width:40px;height:40px"><span class="orbsheen"></span></span>
          </button>
          <div style="line-height:1.3"><div style="font-weight:600">AskSirion</div><div class="scan-status"><span class="s1">Reading your contracts…</span><span class="s2">Done. 69 need your attention.</span></div></div>
        </div>
        <div class="scan-prog"><div class="scan-bar"></div></div>
        <div class="scan-count muted"><span>Contracts read</span><b class="num rc"></b></div>
        <div class="scan-rows">${rows.map((r, i) => `<div class="srow" style="--d:${0.9 + i * 0.32}s"><span class="sname"><b>${r[0]}</b><span class="muted">${r[1]}</span></span>
          <span class="sstat"><span class="checking">Checking…</span><span class="result pill ${r[2]}"><i></i>${r[3]}</span></span><span class="num smoney">${r[4]}</span></div>`).join('')}</div>
        <div class="scan-foot"><span class="muted">Found so far</span><b class="num fc">₹2.05 Cr</b></div>
      </div></div>
    </div>
  </section>`;
}
function inboxCard() {
  if (S.role === 'procurement') return '';
  const waiting = flowWaitingOn() === S.role;
  if (!waiting) return '';
  const step = FLOW_STEPS[S.flow];
  return `<section class="rolecard rise" style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="pill purple"><i></i>Waiting for you</span><span>${step.title}: Zenvault renewal</span><a class="btn primary" href="#c-zenvault" style="margin-left:auto">Open it</a></div></section>`;
}
function renderOverview() {
  const urgent = CONTRACTS.filter(c => !done(c) && c.due.days <= 30);
  const annual = urgent.filter(c => c.save.label === 'a year').reduce((a, c) => a + c.save.amount, 0);
  const oneoff = urgent.filter(c => c.save.label !== 'a year').reduce((a, c) => a + c.save.amount, 0);
  const tabs = [['month', 'Due in 30 days', CONTRACTS.filter(c => c.due.days <= 30).length], ['billed', 'Billed wrong', 17], ['high', 'Priced too high', 52], ['all', 'All', 69]];
  let rows = CONTRACTS.slice();
  if (S.tab === 'month') rows = rows.filter(c => c.due.days <= 30);
  if (S.tab === 'billed') rows = rows.filter(c => c.mark === 'billed' || c.mark === 'sla');
  if (S.tab === 'high') rows = rows.filter(c => c.mark === 'high');
  if (S.filterCat) rows = CONTRACTS.filter(c => c.category === S.filterCat);
  rows.sort((a, b) => a.due.days - b.due.days);
  const center = `<main class="main" id="main">
    ${!S.heroSeen ? launchHero() : ''}
    ${inboxCard()}
    <div class="page-head"><div><h1>Overview</h1><div class="muted" style="font-size:13px;margin-top:2px">How your 2,500 supplier contracts compare with invoices and today's market prices. Checked at 9:00 this morning.</div></div>
      </div>

    <section class="card metrics" id="nums" aria-label="Key numbers">
      <div><div class="muted" style="font-size:12.5px">Extra you paid this month</div><div class="big num">${MONEY(PORTFOLIO.extraThisMonth)}</div><div class="foot num" style="color:var(--rose-t)">↑ ${MONEY(PORTFOLIO.extraThisMonth - PORTFOLIO.extraLastMonth)} <span class="muted">more than October</span></div></div>
      <div><div class="muted" style="font-size:12.5px">You can still save</div><div class="big num">${MONEY(annual)}<span class="muted" style="font-size:13px;font-weight:400"> a year</span></div><div class="foot"><span class="muted">plus</span> <span class="num">${MONEY(oneoff)}</span> <span class="muted">back now, if you act on</span> <span class="num">${urgent.length}</span> <span class="muted">contracts this month</span></div></div>
      <div><div class="muted" style="font-size:12.5px">Contracts that need fixing</div><div class="big num">69<span class="muted" style="font-size:13px;font-weight:400"> of 2,500</span></div><div class="foot num"><span style="color:var(--amber-t)">52 priced too high</span><span class="muted">, </span><span style="color:var(--rose-t)">17 billed wrong</span></div></div>
      <div><div class="muted" style="font-size:12.5px">Confirmed in the books this year</div><div class="big num" id="confirmedNum">${MONEY(S.confirmed)}</div><div class="foot" style="color:var(--green-t)">Secured, waiting for invoices <span class="num">${MONEY(S.secured - S.confirmed)}</span></div></div>
    </section>

    <section class="card" id="todo" style="margin-top:16px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:12px;padding:14px 18px 12px;flex-wrap:wrap">
        <div><h2 class="h">What needs your attention</h2><div class="sub">Most urgent first. Nothing is sent to a supplier until you say so.</div></div>
        ${S.filterCat ? `<span class="pill purple" style="margin-left:auto">${S.filterCat}<button id="clearCat" aria-label="Clear filter" style="border:0;background:transparent;color:inherit;cursor:pointer;padding:0;display:flex">${I.x}</button></span>` :
        `<div class="seg" role="tablist" aria-label="Filter" style="margin-left:auto">${tabs.map(t => `<button role="tab" aria-selected="${S.tab === t[0]}" data-tab="${t[0]}">${t[1]} <span class="num muted">${t[2]}</span></button>`).join('')}</div>`}
      </div>
      <div style="overflow-x:auto"><table class="t"><thead><tr><th>Supplier</th><th>The problem</th><th>How far off</th><th style="text-align:right">You'd save</th><th>Act by</th><th><span class="sr">Action</span></th></tr></thead><tbody>
        ${rows.map(c => `<tr data-go="c-${c.id}" class="${done(c) ? 'done' : ''}" tabindex="0">
          <td><div style="font-weight:500">${c.supplier}</div><div class="muted" style="font-size:12px">${c.category}</div></td>
          <td style="max-width:250px;min-width:200px">${done(c) ? '<span class="pill green"><i></i>Fixed</span>' : markPill(c)}<div style="margin-top:5px;color:var(--text-2)">${c.problem}</div></td>
          <td>${gapBar(c)}</td>
          <td class="num" style="text-align:right"><div style="font-weight:600">${MONEY(c.save.amount)}</div><div class="muted" style="font-size:12px">${c.save.label}</div></td>
          <td><div class="num">${c.due.date.replace(' 2026', '')}</div><div style="margin-top:3px">${done(c) ? '<span class="pill green">Done</span>' : duePill(c.due)}</div></td>
          <td style="text-align:right"><a class="btn ${done(c) ? 'ghost' : 'primary'}" href="#c-${c.id}">${done(c) ? 'View' : c.action.button}</a></td></tr>`).join('')}
        ${!rows.length ? '<tr><td colspan="6" class="muted" style="padding:24px 16px">Nothing here. Pick another filter.</td></tr>' : ''}
      </tbody></table></div>
      <div style="display:flex;gap:16px;padding:10px 18px;font-size:12px;background:rgba(255,255,255,0.02)" class="muted"><span>Showing ${rows.length} of 69. Only these are built in the demo; the rest work the same way.</span></div>
    </section>
    ${marketWatch()}
    <details id="more" class="more" ${S.openMore ? 'open' : ''}><summary>Trends and market prices</summary>
    <section class="row2">
      <figure class="card" id="chart-card" style="margin:0;padding:16px 18px 8px">
        <figcaption style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap"><div><h2 class="h">How much extra you've paid each month</h2><div class="sub">What you paid above the contract and market rates.</div></div>
          <div class="seg" role="tablist" aria-label="Chart view" style="margin-left:auto"><button role="tab" aria-selected="${S.chartMode === 'month'}" data-cm="month">Each month</button><button role="tab" aria-selected="${S.chartMode === 'sum'}" data-cm="sum">Added up</button></div></figcaption>
        <div class="chart" id="ovChart" role="img" aria-label="Extra paid each month, rising from almost nothing in January 2024 to ${MONEY(PORTFOLIO.extraThisMonth)} in November 2026, and staying there if nothing changes"></div>
      </figure>
      <div class="card" style="padding:16px 18px 8px">
        <h2 class="h">What you're overpaying for</h2><div class="sub">Extra paid per year, by type of supplier. Click a bar to see those contracts.</div>
        <div class="chart" id="catChart" style="height:250px" role="img" aria-label="Extra paid per year by supplier type: ${PORTFOLIO.categories.map(c => c.name + ' ' + MONEY(c.value)).join(', ')}"></div>
      </div>
    </section>

    </details>
    <p class="muted" style="margin:18px 0 0;font-size:12px">Contracts, suppliers and money figures are illustrative. Market watch, diesel and inflation are live, fetched when this page opens. Contract terms read by Sirion's Extraction Agent; invoices from SAP S/4HANA.</p>
  </main>`;
  $('#root').innerHTML = shell('overview', center);
  wireShell();
  if (!store.get('tourSeen', false) && !(S.walk >= 0) && tourI < 0) { store.set('tourSeen', true); setTimeout(() => { if (location.hash.slice(1) === 'overview' || !location.hash) startTour(); }, 900); }
  wireMarketWatch();
  const mo = $('#more'); if (mo) mo.ontoggle = () => { if (mo.open && !mo.dataset.d) { mo.dataset.d = 1; overviewChart($('#ovChart')); categoryChart($('#catChart')); } };
  $$('[data-cm]').forEach(b => b.onclick = () => { S.chartMode = b.dataset.cm; disposeCharts(); S.openMore = true; renderApp(); });
  $$('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; renderApp(); });
  const cc = $('#clearCat'); if (cc) cc.onclick = (e) => { e.stopPropagation(); S.filterCat = null; renderApp(); };
  $$('tr[data-go]').forEach(tr => { tr.onclick = (e) => { if (e.target.closest('a')) return; go(tr.dataset.go); }; tr.onkeydown = (e) => { if (e.key === 'Enter') go(tr.dataset.go); }; });
  const hc = $('#heroClose'), hg = $('#heroGo'), ht = $('#heroTour');
  const hideHero = () => { S.heroSeen = true; store.set('heroSeen', true); renderApp(); };
  if (hc) hc.onclick = hideHero; if (hg) hg.onclick = hideHero;
  if (ht) ht.onclick = () => { S.heroSeen = true; store.set('heroSeen', true); renderApp(); setTimeout(() => startTour(), 80); };
  const ho = $('#heroOrb'); if (ho) ho.onclick = () => openVoice(0);
  const sn = $('#seeNew'), ha = $('#hideAnnc');
  if (sn) sn.onclick = () => { S.heroSeen = false; renderApp(); };
  if (ha) ha.onclick = () => { S.banner = false; renderApp(); };
}
function gapBar(c) {
  if (c.mark === 'sla') return `<span class="num" style="font-weight:600;color:var(--purple-l)">${c.gapLabel}</span>`;
  const w = Math.min(110, 10 + c.gapPct * 1.6);
  return `<svg viewBox="0 0 170 30" width="120" height="22" role="img" aria-label="${c.gapLabel}"><line x1="6" x2="164" y1="15" y2="15" stroke="rgba(255,255,255,0.07)" stroke-width="4" stroke-linecap="round"/><line x1="14" x2="${14 + w}" y1="15" y2="15" stroke="rgba(224,81,127,0.55)" stroke-width="4"/><circle cx="14" cy="15" r="5" fill="#0F1E28" stroke="#7FD3CC" stroke-width="2"/><circle cx="${14 + w}" cy="15" r="5" fill="#E0517F"/></svg><div class="num" style="font-size:12px;color:var(--rose-t);font-weight:600;margin-top:-2px">${c.gapLabel}</div>`;
}

/* ---------------- contract page ---------------- */
function flowWaitingOn() { return S.flow < FLOW_STEPS.length ? FLOW_STEPS[S.flow].who : null; }
function renderContract(id) {
  const c = SirionAPI.getContract(id);
  if (!c) { go('overview'); return; }
  const center = `<main class="main">
    <a href="#overview" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;text-decoration:none;margin-bottom:14px">${I.back}All contracts</a>
    <div class="d-head">
      <div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${done(c) ? '<span class="pill green"><i></i>Fixed</span>' : markPill(c)}<h1 style="margin:0;font-size:16px;font-weight:600">${c.supplier}</h1><span class="muted" style="font-size:13px">${c.item}, contract ${c.ref}</span></div>
        <p class="d-lede">${c.lede}</p>
        <div style="display:flex;gap:18px;margin-top:16px;flex-wrap:wrap;font-size:13px"><span><span class="muted">Act by</span> <b class="num">${c.due.date}</b></span><span><span class="muted">You'd save</span> <b class="num">${MONEY(c.save.amount)} ${c.save.label}</b></span><span><span class="muted">Business owner</span> <b>${PEOPLE[c.owner].name}</b></span></div>
      </div>
      <aside class="actcard" id="actcard">${c.flow ? flowCard(c) : simpleCard(c)}</aside>
    </div>
    <figure class="card" style="margin:24px 0 0;padding:16px 18px 8px"><h2 class="h">${c.chart.title}</h2><div class="chart" id="cChart" style="height:270px" role="img" aria-label="${esc(c.chart.title)}"></div></figure>
    <div class="two">
      <div><h2 class="h">What the contract says</h2><div class="sub" style="margin-bottom:6px">Read from the signed contract by Sirion's Extraction Agent</div>
        ${c.clauses.map(k => `<div class="clause"><div class="muted" style="font-size:12.5px;margin-bottom:4px">${k.ref}</div><q>${k.text}</q><span class="src">${I.doc}Sirion Extraction Agent</span></div>`).join('')}
        <div class="note" style="margin-top:8px">${c.missing}</div></div>
      <div><h2 class="h">What actually happened</h2><div class="sub" style="margin-bottom:6px">Checked against invoices and market prices</div>
        ${liveContractBox(c.id)}
        ${c.facts.map(f => `<div class="clause"><div style="font-size:15px">${f.t}</div><span class="src ${f.ext ? 'ext' : ''}">${f.ext ? I.feed : I.doc}${f.s}</span></div>`).join('')}
        <details class="work" style="margin-top:12px"><summary>How we worked out the money</summary><div class="note num" style="margin-top:8px">${c.work}</div></details></div>
    </div>
  </main>`;
  $('#root').innerHTML = shell('contract', center);
  wireShell();
  contractChart($('#cChart'), c);
  wireAct(c);
}
function trackHTML() {
  return `<ol class="track">${FLOW_STEPS.map((s, i) => { const st = i < S.flow ? 'done' : i === S.flow ? 'now' : ''; const p = PEOPLE[s.who];
    return `<li class="${st}"><span class="dot">${i < S.flow ? I.check : i + 1}</span><div><div class="ttl">${i < S.flow ? s.done : s.title}</div><div class="by">${p.name}, ${p.role}</div></div></li>`; }).join('')}</ol>`;
}
function splitBox(seats, rise, note) {
  const z = zvCalc(seats, rise);
  return `<div class="note" style="margin:8px 0;display:grid;gap:6px">
    <div style="display:flex;justify-content:space-between;gap:10px"><span>Cut to ${NUM(seats)} seats <span class="muted">(your right, clause 12.3)</span></span><b class="num" style="color:#fff">${MONEY(z.contractual)}</b></div>
    <div style="display:flex;justify-content:space-between;gap:10px"><span>${rise >= 7 ? 'Rise stays at 7%' : rise + '% rise, not 7%'} <span class="muted">(${rise >= 7 ? 'not agreed yet' : 'needs Zenvault to agree'})</span></span><b class="num" style="color:#fff">${MONEY(z.negotiated)}</b></div>
    <div style="display:flex;justify-content:space-between;gap:10px;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px"><span>Found, a year</span><b class="num" style="color:#fff">${MONEY(z.total)}</b></div>${note ? `<div class="muted" style="font-size:12px">${note}</div>` : ''}</div>`;
}
function zvSecured() { const r = S.agreedRise == null ? 7 : S.agreedRise; return zvCalc(S.seats, r); }
function flowCard(c) {
  const who = flowWaitingOn();
  if (S.flow >= 6) { const z = zvSecured();
    return `<div class="muted" style="font-size:12.5px">Who does what</div>${trackHTML()}<div class="note" style="margin-top:10px;color:var(--green-t)"><b class="num" style="display:block;font-size:20px;color:#fff">${MONEY(z.total)} a year ${S.zvConfirmed ? 'confirmed' : 'secured'}</b>${S.zvConfirmed ? 'The January invoice matched. This now counts in the north-star number.' : 'Agreed in writing or allowed by the contract. It counts as confirmed once the first invoice in the books matches.'}</div>
      ${S.zvConfirmed ? '' : '<button class="btn demo" style="width:100%;margin-top:8px" id="zvInvoice">Demo: the January 2027 invoice arrives</button>'}`; }
  const mine = who === S.role;
  const p = PEOPLE[who];
  let body = '';
  if (!mine) {
    body = `<div class="note" style="margin-top:6px">Waiting on <b style="color:#fff">${p.name}</b> (${p.role}).</div><button class="btn primary" style="width:100%;margin-top:10px" data-role-set="${who}">Switch to ${p.name.split(' ')[0]}'s view</button>${S.flow === 3 && S.role === 'procurement' ? '<button class="btn demo" style="width:100%;margin-top:8px" id="noReply">Demo: Zenvault does not reply by 15 Dec</button>' : ''}`;
  } else if (S.flow === 0) {
    body = `<p style="margin:6px 0 4px;color:var(--text-2)">Cut seats before the 2 Dec notice deadline, and ask for a lower rise.</p>${splitBox(S.seats, S.proposedRise)}<button class="btn primary" style="width:100%" id="openDraft">${c.action.button}</button>`;
  } else if (S.flow === 1) {
    body = `${wantsBox(who)}<p style="margin:8px 0 8px;color:var(--text-2)">Priya wants to go to ${NUM(S.seats)} seats. Your team used ${NUM(ZV.used)} in the last 90 days. How many does IT need?</p>
      <label class="muted" for="seatIn" style="font-size:12.5px">Seats for 2027</label>
      <input id="seatIn" type="number" min="${ZV.used}" max="2000" step="10" value="${S.seats}" style="width:100%;margin:4px 0 8px;height:38px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:#fff;padding:0 10px;font:inherit">
      <div id="seatPreview">${splitBox(S.seats, S.proposedRise)}</div>
      <button class="btn primary" id="ownerOk" style="width:100%">Confirm seats</button>`;
  } else if (S.flow === 2) {
    body = `${wantsBox(who)}<div style="margin:8px 0">${['Sent before 2 Dec, 30 days before renewal (clause 12.3)', 'Quotes clause 12.2 and 12.3 exactly', 'Goes to the notice address in clause 18'].map(t => `<div class="check"><i>${I.check}</i>${t}</div>`).join('')}</div>
      <button class="btn ghost" style="width:100%;margin-bottom:8px" id="readNotice">Read the notice</button><button class="btn primary" style="width:100%" id="legalOk">Approve and send to Zenvault</button>`;
  } else if (S.flow === 3) {
    body = `${wantsBox(who)}<button class="btn primary" style="width:100%;margin-top:8px" id="toPortal">Open the supplier portal</button><button class="btn demo" style="width:100%;margin-top:8px" id="noReply">Demo: Zenvault does not reply by 15 Dec</button>`;
  } else if (S.flow === 4) {
    if (S.reply === 'accept') body = `<div class="note" style="margin:6px 0 10px">Zenvault accepted <b style="color:#fff">${NUM(S.seats)} seats and the ${S.proposedRise}% rise.</b></div>${splitBox(S.seats, S.proposedRise, 'Both parts are agreed.')}<button class="btn primary" style="width:100%" id="settle3">Accept and send to Finance</button>`;
    else if (S.reply === 'counter') body = `<div class="note" style="margin:6px 0 10px">Zenvault accepted <b style="color:#fff">${NUM(S.seats)} seats</b> but offered a <b style="color:#fff">5% rise</b>, not ${S.proposedRise}%.</div>${splitBox(S.seats, 5, 'If you accept 5%.')}
      <div style="display:flex;gap:8px"><button class="btn primary" id="settle5" style="flex:1">Accept 5%</button><button class="btn ghost" id="settle7">Hold at ${S.proposedRise}%, book a call</button></div>`;
    else body = `<div class="note" style="margin:6px 0 10px">${S.reply === 'call' ? 'Zenvault asked for a call before deciding.' : 'Zenvault did not reply by 15 Dec.'} The seat cut still stands, because clause 12.3 does not need their agreement. The lower rise is not agreed, so the 7% applies for now.</div>${splitBox(S.seats, 7, 'Only the seat cut is secured.')}
      <button class="btn primary" style="width:100%" id="settleSeats">Lock in the seat cut</button><button class="btn ghost" style="width:100%;margin-top:8px" id="bookCall">Book a call about the rise</button>`;
  } else if (S.flow === 5) {
    const z = zvSecured(), r = S.agreedRise == null ? 7 : S.agreedRise;
    body = `${wantsBox(who)}<div class="note" style="margin:8px 0">New order ZV-2027 is live: ${NUM(S.seats)} seats at ${MONEY(ZV.unit * (1 + r / 100))} = <b class="num" style="color:#fff">${MONEY(z.newTotal)}</b>, down from ${MONEY(z.cur)}. It counts as <b style="color:#fff">confirmed</b> only when the first invoice in the books matches.</div><button class="btn primary" style="width:100%" id="finOk">Record ${MONEY(z.total)} a year as secured</button>`;
  }
  return `<div style="display:flex;align-items:center;justify-content:space-between"><div class="muted" style="font-size:12.5px">Act by</div>${duePill(c.due)}</div>
    <div class="num" style="font-size:22px;font-weight:600;margin:2px 0 6px">${c.due.date}</div>
    <div style="font-weight:600">${mine ? FLOW_STEPS[S.flow].title : c.action.verb}</div>${body}
    <div class="muted" style="font-size:12.5px;margin:16px 0 2px">Who does what</div>${trackHTML()}`;
}
function wantsBox(who) { const p = PEOPLE[who]; return `<div class="wants" style="grid-template-columns:1fr;margin:10px 0 0"><div><b>${p.name.split(' ')[0]} wants</b>${p.wants}</div><div><b>And worries about</b>${p.worries}</div></div>`; }
function simpleCard(c) {
  const st = S.stage[c.id] || 0;
  const steps = ['You approve the claim', 'Sent to ' + c.supplier, c.supplier + ' agrees and issues a credit', 'Finance confirms the money'];
  return `<div style="display:flex;align-items:center;justify-content:space-between"><div class="muted" style="font-size:12.5px">${c.due.label}</div>${st >= 3 ? '<span class="pill green">Done</span>' : duePill(c.due)}</div>
    <div class="num" style="font-size:22px;font-weight:600;margin:2px 0 6px">${c.due.date}</div>
    <div style="font-weight:600">${c.action.verb}</div>
    ${st === 0 ? `<button class="btn primary" style="width:100%;margin-top:12px" id="openDraft">${c.action.button}</button>` : ''}
    <ol class="track" style="margin-top:12px">${steps.map((t, i) => { const s = i < st + (st ? 1 : 0) ? 'done' : i === st + 1 && st ? 'now' : ''; return `<li class="${s}"><span class="dot">${s === 'done' ? I.check : i + 1}</span><div class="ttl">${t}</div></li>`; }).join('')}</ol>
    ${st === 1 ? `<button class="btn demo" style="width:100%;margin-top:6px" id="demoReply">Demo: ${c.supplier} agrees</button>` : ''}
    ${st === 2 ? `<button class="btn demo" style="width:100%;margin-top:6px" id="demoFin">Demo: Finance confirms</button>` : ''}
    ${st >= 3 ? `<div class="note" style="margin-top:10px;color:var(--green-t)"><b class="num" style="display:block;font-size:20px;color:#fff">${MONEY(c.save.amount)}</b>Confirmed by Finance.</div>` : ''}`;
}
function rerenderAct(c) { const a = $('#actcard'); if (!a) return; a.innerHTML = c.flow ? flowCard(c) : simpleCard(c); wireAct(c); wireRoleSet(); }
function addSaving(amount) { const from = S.confirmed; S.confirmed += amount; countUp(from, S.confirmed); }
function countUp(from, to) { const el = $('#confirmedNum'); if (!el) return; if (reduceMotion()) { el.textContent = MONEY(to); return; } const t0 = performance.now(); const tick = (n) => { const p = Math.min(1, (n - t0) / 900); el.textContent = MONEY(from + (to - from) * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
function wireAct(c) {
  const b = (id, fn) => { const e = $('#' + id); if (e) e.onclick = fn; };
  b('openDraft', () => openDraft(c));
  if (c.flow) {
    const si = $('#seatIn');
    if (si) si.oninput = () => { const n = parseInt(si.value, 10); if (n >= ZV.used && n <= 2000) $('#seatPreview').innerHTML = splitBox(n, S.proposedRise); };
    b('ownerOk', () => {
      const n = parseInt(($('#seatIn') || {}).value, 10);
      if (!(n >= ZV.used && n <= 2000)) { toast('Enter a number from ' + NUM(ZV.used) + ' (seats in use) to 2,000.'); return; }
      const changed = n !== S.seats; S.seats = n; if (changed) S.letter = null;
      S.flow = 2; SirionAPI.approve(c, 'owner'); SirionAPI.createTask(c, 'legal', 'Review notice');
      toast(changed ? 'Arjun set ' + NUM(n) + ' seats. The savings and the notice are updated. Sent to Meera in Legal.' : 'Arjun confirmed ' + NUM(n) + ' seats. Sent to Meera in Legal.'); rerenderAct(c); });
    b('readNotice', () => openDraft(c, true));
    b('legalOk', () => { S.flow = 3; SirionAPI.approve(c, 'legal'); SirionAPI.sendNotice(c); toast('Notice sent to Zenvault.'); rerenderAct(c); });
    b('toPortal', () => renderSupplier());
    b('noReply', () => { S.reply = 'noreply'; S.flow = 4; SirionAPI.supplierReply(c, 'No reply by 15 Dec'); toast('15 Dec passed with no reply. Back to Priya.'); S.role = 'procurement'; rerenderAct(c); });
    const next = (rise, msg) => { S.agreedRise = rise; S.flow = 5; SirionAPI.approve(c, 'procurement'); SirionAPI.createTask(c, 'finance', 'Record saving'); toast(msg); rerenderAct(c); };
    b('settle3', () => next(S.proposedRise, 'Both parts agreed. Sent to Rahul in Finance.'));
    b('settle5', () => next(5, 'Accepted a 5% rise. Sent to Rahul in Finance.'));
    b('settle7', () => next(7, 'Call booked. Only the seat cut is secured for now.'));
    b('settleSeats', () => next(7, 'Seat cut locked in. Sent to Rahul in Finance.'));
    b('bookCall', () => toast('Call booked with Zenvault about the rise. The seat cut does not wait for it.'));
    b('finOk', () => { const z = zvSecured(); S.flow = 6; SirionAPI.confirmSaving(c, z.total, 'secured'); S.secured += z.total; toast(MONEY(z.total) + ' a year recorded as secured. It becomes confirmed when the invoice matches.'); rerenderAct(c); });
    b('zvInvoice', () => { const z = zvSecured(); S.zvConfirmed = true; SirionAPI.confirmSaving(c, z.total); addSaving(z.total); toast(MONEY(z.total) + ' a year confirmed by the January invoice. North-star updated.'); rerenderAct(c); });
  } else {
    b('demoReply', () => { S.stage[c.id] = 2; S.secured += c.save.amount; SirionAPI.supplierReply(c, 'Agreed, credit note issued'); toast(c.supplier + ' agreed and issued a credit note.'); rerenderAct(c); });
    b('demoFin', () => { S.stage[c.id] = 3; SirionAPI.confirmSaving(c, c.save.amount); addSaving(c.save.amount); toast(MONEY(c.save.amount) + ' confirmed by Finance.'); rerenderAct(c); });
  }
}
function letterFor(c) {
  if (c.id === 'zenvault') return S.letter || `Dear Zenvault team,

Our agreement for IT service desk software (ref. ZV-2024-031) renews on 1 January 2027. Under clause 12.3, we are giving notice to change the number of named users from 2,000 to ${NUM(S.seats)} from the renewal date.

We also propose that fees for the renewal term rise by ${S.proposedRise}%, in line with our other software renewals this year, instead of the 7% in clause 12.2.

Please confirm, or suggest a time to discuss, before 15 December 2026.

Regards,
Priya Sharma
Procurement, Asian Paints`;
  return `Dear ${c.supplier} team,

We have reviewed our agreement (ref. ${c.ref}) against recent invoices. ${c.problem}

The difference comes to ${MONEY(c.save.amount)}, under ${c.clauses[0].ref.split(',')[0]} of our agreement. Please issue a credit for this amount and apply the correct terms from your next invoice.

Regards,
Priya Sharma
Procurement, Asian Paints`;
}
function openDraft(c, readOnly) {
  const root = $('#overlay-root');
  root.innerHTML = `<div class="scrim" id="scrim"></div><aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drTitle">
    <div class="drawer-head"><div class="muted" style="font-size:12.5px">${c.supplier}, contract ${c.ref}</div><h2 id="drTitle" style="margin:2px 0 0;font-size:20px;font-weight:600">${readOnly ? 'Notice for Legal to check' : c.action.verb}</h2></div>
    <div class="drawer-body">
      <div class="muted" style="font-size:12.5px;margin:14px 0 4px">Why</div><div style="color:var(--text-2)">${c.lede}</div>
      <div class="muted" style="font-size:12.5px;margin:16px 0 4px">The clause that allows it</div><div class="clause" style="border:0;padding:0"><q>${c.clauses[c.clauses.length - 1].text}</q></div>
      <label for="letter" class="muted" style="display:block;font-size:12.5px;margin:16px 0 6px">Message to the supplier. ${readOnly ? '' : 'Your edits are saved when you approve.'}</label>
      <textarea class="letter" id="letter" ${readOnly ? 'readonly' : ''}>${esc(letterFor(c))}</textarea>
    </div>
    <div class="drawer-foot"><div class="muted" style="font-size:12.5px">${c.flow ? 'Next, Arjun confirms the seat count, then Meera in Legal approves before it goes out.' : 'Nothing is sent until you approve. Legal is copied.'}</div>
      <div style="display:flex;gap:10px"><button class="btn ghost" id="drCancel">${readOnly ? 'Close' : 'Cancel'}</button>${readOnly ? '' : `<button class="btn primary" id="drOk" style="flex:1">${c.flow ? 'Send to Arjun to confirm seats' : 'Approve and send'}</button>`}</div></div>
  </aside>`;
  const sc = $('#scrim'), dr = $('#drawer');
  requestAnimationFrame(() => requestAnimationFrame(() => { sc.classList.add('in'); dr.classList.add('in'); }));
  const prev = document.activeElement;
  setTimeout(() => $('#letter').focus(), 60);
  const close = (after) => { sc.classList.remove('in'); dr.classList.remove('in'); setTimeout(() => { root.innerHTML = ''; document.removeEventListener('keydown', esck); if (prev && prev.focus) try { prev.focus(); } catch (e) {} if (after) after(); }, reduceMotion() ? 0 : 320); };
  const esck = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esck);
  sc.onclick = () => close(); $('#drCancel').onclick = () => close();
  const ok = $('#drOk');
  if (ok) ok.onclick = () => { if (c.flow) S.letter = $('#letter').value; close(() => {
    if (c.flow) { S.flow = 1; SirionAPI.createTask(c, 'owner', 'Confirm seat count'); toast('Draft saved. Sent to Arjun in IT to confirm seats.'); }
    else { S.stage[c.id] = 1; SirionAPI.approve(c, 'procurement'); SirionAPI.sendNotice(c); toast('Claim sent to ' + c.supplier + '.'); }
    rerenderAct(c);
  }); };
}

/* ---------------- supplier portal ---------------- */
function renderSupplier() {
  disposeCharts();
  const c = CONTRACTS[0];
  const p = PEOPLE.supplier;
  const replied = S.flow >= 4, sent = S.flow >= 3;
  $('#root').innerHTML = `<div class="portal view">
    <div class="portal-top"><div style="width:28px;height:28px;border-radius:7px;background:#1B2430;color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px">Z</div><b>Zenvault partner portal</b><span style="color:#6B7785;font-size:13px">Powered by Sirion</span>
      <div style="margin-left:auto;display:flex;align-items:center;gap:10px"><span style="font-size:13px;color:#4B5563">Signed in as ${p.name}</span><button class="btn" data-role-set="procurement" style="background:#1B2430;color:#fff">Back to Asian Paints view</button></div></div>
    <main style="max-width:860px;margin:0 auto;padding:32px 20px 60px">
      <div style="font-size:13px;color:#6B7785">Customer: Asian Paints, contract ${c.ref}</div>
      <h1 style="margin:4px 0 18px;font-size:24px;letter-spacing:-0.01em">${sent ? 'Renewal notice from Asian Paints' : 'No new notices'}</h1>
      ${!sent ? `<div class="pcard">Asian Paints has not sent a notice yet. Switch back to Asian Paints to move the flow along.</div>` : `
      <div class="pcard" style="margin-bottom:16px">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><span class="pill" style="background:#F3E8F5;color:#7B3587">Notice under clause 12.3</span><span style="font-size:13px;color:#6B7785">Received ${sent ? 'today' : ''}</span></div>
        <div style="font:15px/1.65 var(--sans);white-space:pre-wrap;color:#1B2430">${esc(letterFor(c))}</div>
      </div>
      <div class="pcard">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:16px;font-size:13.5px"><div style="background:#F4F6F8;border-radius:10px;padding:12px"><b style="display:block;font-size:12px;color:#6B7785;font-weight:500">${p.name.split(' ')[0]} wants</b>${p.wants}</div><div style="background:#F4F6F8;border-radius:10px;padding:12px"><b style="display:block;font-size:12px;color:#6B7785;font-weight:500">And worries about</b>${p.worries}</div></div>
        <div style="font-weight:600;margin-bottom:10px">Your reply</div>
        ${replied ? `<div style="padding:14px;border-radius:10px;background:#EAF6F4;color:#1F6B5E">${S.reply === 'accept' ? `You accepted ${NUM(S.seats)} seats and a ${S.proposedRise}% rise.` : S.reply === 'counter' ? `You accepted ${NUM(S.seats)} seats and offered a 5% rise.` : S.reply === 'call' ? 'You asked for a call.' : 'No reply was sent before 15 Dec.'} Asian Paints will reply here.</div>` : `
        <div role="radiogroup" aria-label="Reply options" style="display:grid;gap:8px">
          ${[['accept', `Accept: ${NUM(S.seats)} seats with a ${S.proposedRise}% rise`], ['counter', `Counter-offer: ${NUM(S.seats)} seats with a 5% rise`], ['call', 'Ask for a call before deciding']].map((o, i) => `<button class="opt" role="radio" aria-checked="${i === 1}" data-opt="${o[0]}"><span style="width:16px;height:16px;border-radius:50%;border:2px solid ${i === 1 ? '#92429F' : '#B8C2CC'};margin-top:2px;flex:none"></span><span>${o[1]}</span></button>`).join('')}
        </div>
        <button class="btn primary" id="supSend" style="margin-top:14px;height:40px">Send reply to Asian Paints</button>`}
      </div>`}
      <p style="font-size:12px;color:#6B7785;margin-top:20px">Illustrative supplier view for a case study.</p>
    </main></div>`;
  wireRoleSet();
  let choice = 'counter';
  $$('[data-opt]').forEach(b => b.onclick = () => { choice = b.dataset.opt; $$('[data-opt]').forEach(x => { const on = x === b; x.setAttribute('aria-checked', on); x.firstElementChild.style.borderColor = on ? '#92429F' : '#B8C2CC'; }); });
  const s = $('#supSend');
  if (s) s.onclick = () => {
    S.reply = choice; S.flow = 4; SirionAPI.supplierReply(c, choice === 'accept' ? 'Accepted' : choice === 'counter' ? 'Counter: 5% rise' : 'Asked for a call'); toast('Reply sent. Back to Priya at Asian Paints.');
    setTimeout(() => { S.role = 'procurement'; go('c-western'); }, 700);
  };
}

/* ---------------- is it working ---------------- */
function renderWorking() {
  const pct = Math.round(S.confirmed / S.found() * 100);
  const sup = [
    ['Flags acted on before the deadline', '78%', '70%+', 'good'],
    ['Flags a person confirms are right', '91%', '85%+', 'good'],
    ['Days from flag to action (median)', '4', '5 or fewer', 'good'],
    ['Found money confirmed in the books', pct + '%', '35%+', pct >= 35 ? 'good' : 'watch'],
    ['Supplier disputes on our notices', '6%', 'under 15%', 'good']
  ];
  const rethink = [
    ['People reject more than 1 in 5 flags, two months running', 'Flags rejected', '9%', 'ok'],
    ['Fewer than half of flags are acted on before the deadline', 'Acted on in time', '78%', 'ok'],
    ['Under 25% of found money is confirmed after two quarters', 'Confirmed so far', pct + '%', pct >= 25 ? 'ok' : 'warn'],
    ['Suppliers dispute more than 1 in 4 notices', 'Disputed', '6%', 'ok'],
    ['Procurement stops opening the morning brief', 'Weekly users', '84%', 'ok']
  ];
  const center = `<main class="main">
    <div class="page-head"><div><h1>Is it working?</h1><div class="muted" style="font-size:13px;margin-top:2px">One number we steer by, the numbers that explain it, and the limits that would make us rethink.</div></div></div>
    <section class="card" style="padding:20px 20px 10px">
      <div style="display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap">
        <div><div class="pill purple" style="margin-bottom:8px">North-star metric</div><h2 class="h" style="font-size:16px">Money saved or recovered, confirmed in the books</h2><div class="sub">Counted only when a credit note, refund or lower invoice shows up and Finance matches it. Not when we flag it, and not when a supplier agrees.</div></div>
        <div style="margin-left:auto;text-align:right"><div class="num" id="confirmedNum" style="font-size:40px;letter-spacing:-0.02em">${MONEY(S.confirmed)}</div><div class="muted" style="font-size:12.5px">confirmed this year</div></div>
      </div>
      <div class="chart" id="nsChart" style="height:240px;margin-top:8px" role="img" aria-label="Running totals by month in 2026: confirmed reaching ${MONEY(S.confirmed)} and secured reaching ${MONEY(S.secured)} in November"></div>
    </section>
    <section class="card" style="margin-top:16px;padding:16px 18px"><h2 class="h">From found to confirmed</h2><div class="sub">Each stage is a smaller number. The gap between them is work still to do.</div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px">
        ${[['Found', S.found(), 'Flagged, with the clause and the maths', 'rgba(255,255,255,0.35)'], ['Secured', S.secured, 'The contract allows it, or the supplier agreed in writing', '#C98BD3'], ['Confirmed', S.confirmed, 'Credit note, refund or lower invoice, matched by Finance', '#3FA7A0']].map(x => `<div style="border-top:3px solid ${x[3]};padding-top:10px"><div class="muted" style="font-size:12.5px">${x[0]}</div><div class="num" style="font-size:24px;font-weight:600">${MONEY(x[1])}</div><div class="muted" style="font-size:12px;margin-top:2px">${x[2]}</div></div>`).join('')}
      </div></section>
    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:16px" class="sups">
      ${sup.map(s => `<div class="card" style="padding:14px 16px"><div class="muted" style="font-size:12.5px;min-height:34px">${s[0]}</div><div class="num" style="font-size:24px;font-weight:600;margin-top:4px">${s[1]}</div><div style="margin-top:6px;display:flex;align-items:center;gap:6px;font-size:12px"><span class="pill ${s[3] === 'good' ? 'green' : 'amber'}"><i></i>${s[3] === 'good' ? 'On track' : 'Watch'}</span><span class="muted">target ${s[2]}</span></div></div>`).join('')}
    </section>
    <section class="card" style="margin-top:16px;overflow:hidden">
      <div style="padding:14px 18px 10px"><h2 class="h">What would make us rethink</h2><div class="sub">If any of these trips, we stop adding features and fix the cause first.</div></div>
      <table class="t"><thead><tr><th>We'd rethink if</th><th>We watch</th><th>Now</th><th>Status</th></tr></thead><tbody>
        ${rethink.map(r => `<tr style="cursor:default"><td>${r[0]}</td><td class="muted">${r[1]}</td><td class="num">${r[2]}</td><td><span class="pill ${r[3] === 'ok' ? 'green' : 'amber'}"><i></i>${r[3] === 'ok' ? 'Fine' : 'Close to the limit'}</span></td></tr>`).join('')}
      </tbody></table>
    </section>
    <section class="card" style="margin-top:16px;padding:16px 18px">
      <h2 class="h">How each number is measured</h2>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 24px;margin-top:10px;color:var(--text-2);font-size:13.5px">
        <div><b style="color:#fff">Found, secured, confirmed:</b> found is flagged. Secured is allowed by the contract or agreed in writing. Confirmed is a credit note, refund or lower invoice, matched to a flag by a Finance user.</div>
        <div><b style="color:#fff">Acted on in time:</b> a notice, claim or price change approved before the contract's own deadline.</div>
        <div><b style="color:#fff">Flags confirmed right:</b> when someone opens a flag, they mark it right or wrong in one click.</div>
        <div><b style="color:#fff">Disputes:</b> supplier replies in the portal that reject the facts in the notice.</div>
      </div>
    </section>
    <p class="muted" style="margin:18px 0 0;font-size:12px">Illustrative figures. Approving a change moves money from found to secured. It only reaches confirmed when the invoice arrives; try the demo button on the Zenvault page.</p>
  </main>`;
  $('#root').innerHTML = shell('working', center);
  wireShell();
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov'];
  const data = PORTFOLIO.confirmedByMonth.slice(); data[10] = S.confirmed; const secd = PORTFOLIO.securedByMonth.slice(); secd[10] = S.secured;
  mkChart($('#nsChart'), {
    grid: { left: 60, right: 16, top: 30, bottom: 28 },
    legend: { top: 0, right: 0, data: ['Confirmed in the books', 'Secured, not yet in the books'], textStyle: { color: '#C9D6D8', fontFamily: 'Hanken Grotesk, system-ui, sans-serif' } },
    tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => MONEY(v) }, tipStyle),
    xAxis: { type: 'category', data: M, boundaryGap: false, axisLine: axisStyle.axisLine, axisTick: axisStyle.axisTick, axisLabel: axisStyle.axisLabel },
    yAxis: { type: 'value', splitLine: axisStyle.splitLine, axisLabel: { color: '#8FA3A7', fontSize: 11.5, formatter: v => v ? '₹' + v / 1e7 + ' Cr' : '₹0' } },
    series: [
      { name: 'Confirmed in the books', type: 'line', data, symbol: 'circle', symbolSize: 7, lineStyle: { color: '#3FA7A0', width: 2.5 }, itemStyle: { color: '#3FA7A0' }, areaStyle: { color: 'rgba(63,167,160,0.15)' } },
      { name: 'Secured, not yet in the books', type: 'line', data: secd, symbol: 'none', itemStyle: { color: '#C98BD3' }, lineStyle: { color: '#C98BD3', type: 'dashed', width: 2 } }
    ]
  });
}

/* ---------------- integrations ---------------- */
function renderIntegrations() {
  const center = `<main class="main">
    <div class="page-head"><div><h1>Integrations</h1><div class="muted" style="font-size:13px;margin-top:2px">Where Contract health gets its information, and where it sends actions back.</div></div></div>
    <section class="card" style="padding:18px 20px">
      <h2 class="h">How the information moves</h2><div class="sub">Contracts and approvals stay in Sirion. Invoices come from SAP S/4HANA and supplier details from SAP Ariba, both already connected for the company. Prices, diesel, inflation and software usage come from outside feeds.</div>
      <svg viewBox="0 0 1120 190" role="img" aria-label="Sirion repository and outside feeds go into the daily check, which feeds AskSirion and the to-do list, and actions go back into Sirion workflows" style="display:block;width:100%;height:auto;margin-top:14px">
        <g font-family="Hanken Grotesk, system-ui, sans-serif">
          <rect x="10" y="20" width="240" height="64" rx="10" fill="#0B1821" stroke="rgba(159,211,216,0.35)"/><text x="26" y="46" font-size="13.5" font-weight="600" fill="#F5F6F6">Sirion repository</text><text x="26" y="66" font-size="12" fill="#8FA3A7">Contracts, plus SAP S/4HANA and Ariba</text>
          <rect x="10" y="110" width="240" height="64" rx="10" fill="#0B1821" stroke="rgba(180,205,208,0.22)" stroke-dasharray="4 4"/><text x="26" y="136" font-size="13.5" font-weight="600" fill="#F5F6F6">Outside feeds</text><text x="26" y="156" font-size="12" fill="#8FA3A7">Prices, diesel, inflation, usage</text>
          <rect x="410" y="55" width="260" height="84" rx="12" fill="rgba(13,94,104,0.35)" stroke="#3FA7A0"/><text x="430" y="88" font-size="14" font-weight="600" fill="#fff">Daily contract check</text><text x="430" y="110" font-size="12" fill="#CFE3E5">Compares every contract with reality</text>
          <rect x="820" y="20" width="290" height="64" rx="10" fill="#0B1821" stroke="rgba(146,66,159,0.6)"/><text x="836" y="46" font-size="13.5" font-weight="600" fill="#F5F6F6">AskSirion and the to-do list</text><text x="836" y="66" font-size="12" fill="#8FA3A7">What's wrong, and what to do</text>
          <rect x="820" y="110" width="290" height="64" rx="10" fill="#0B1821" stroke="rgba(159,211,216,0.35)"/><text x="836" y="136" font-size="13.5" font-weight="600" fill="#F5F6F6">Back into Sirion workflows</text><text x="836" y="156" font-size="12" fill="#8FA3A7">Flags, tasks, approvals, notices</text>
        </g>
        <g fill="none" stroke="#7FD3CC" stroke-width="2" stroke-dasharray="6 6"><path d="M250,52 C330,52 330,85 410,85"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.2s" repeatCount="indefinite"/></path><path d="M250,142 C330,142 330,110 410,110"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.2s" repeatCount="indefinite"/></path><path d="M670,85 C750,85 750,52 820,52"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.2s" repeatCount="indefinite"/></path><path d="M670,110 C750,110 750,142 820,142"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.2s" repeatCount="indefinite"/></path></g>
      </svg>
    </section>
    ${liveStatusCard()}
    <section class="card" style="margin-top:16px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 18px 10px"><div><h2 class="h">Live activity</h2><div class="sub">Every request this demo makes, newest first. Click around the product and watch it fill.</div></div><span class="pill green" style="margin-left:auto"><i></i>Connected to sandbox</span></div>
      <table class="t"><thead><tr><th>Time</th><th>Request</th><th>Result</th></tr></thead><tbody id="logBody">${logRows()}</tbody></table>
      <div class="muted" style="padding:10px 18px;font-size:12px;background:rgba(255,255,255,0.02)">Request names are examples. Sirion shares its full API reference with customers. In this demo, every screen reads and writes through one small layer shaped like that API, so swapping in the real one means changing a single file.</div>
    </section>
  </main>`;
  $('#root').innerHTML = shell('integrations', center);
  wireShell();
}
function logRows() { return SirionAPI.log.map(l => `<tr style="cursor:default"><td class="muted num">${l.time}</td><td><code style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:${l.method === 'GET' ? '#9FD3D8' : '#C98BD3'}">${l.method} ${esc(l.path)}</code></td><td>${esc(l.result)}</td></tr>`).join(''); }
SirionAPI.onLog(() => { const b = $('#logBody'); if (b) b.innerHTML = logRows(); });

/* ---------------- AskSirion ---------------- */
const QA = [
  { k: ['week', 'do first', 'today', 'should i do'], q: 'What should I do this week?',
    say: 'Two things are urgent. First, Prime Staffing is billing above the agreed rate. Claim eighteen lakh back before the December invoice is paid. Second, give Zenvault notice by the second of December to cut unused seats. That saves about one point seven crore a year.',
    html: () => `Two things this week, then one more before 5 Dec:${rowsList(CONTRACTS.filter(c => !done(c)).sort((a, b) => a.due.days - b.due.days).slice(0, 3))}`,
    src: ['Clause 12.3, Zenvault, page 11', 'Schedule B, Prime Staffing, page 14'], act: [['Open Western Roadways', 'c-western'], ['Open Prime Staffing', 'c-prime']] },
  { k: ['losing', 'most money', 'biggest', 'where am i'], q: 'Where am I losing the most money?',
    say: 'Software. About two point six crore a year above what you need. Zenvault alone is one point seven crore, because it renews at seven percent more and a third of the seats are unused.',
    html: () => `<b>Software</b>: about ${MONEY(2.6e7)} a year. One contract is most of it.${barsList([['Zenvault', 1.68e7], ['Infra monitoring tool', 4.1e6], ['Design software', 2.6e6]])}`,
    src: ['Zenvault usage report', 'Clause 12.2, Zenvault, page 11'], act: [['Open Western Roadways', 'c-western']] },
  { k: ['renew', 'renewal', '90 days'], q: 'Which contracts renew in the next 90 days?',
    say: 'Forty one contracts renew in the next ninety days. One needs you before it renews: Zenvault, on the first of January, where the price would go up seven percent while a third of the seats sit unused.',
    html: () => `41 renew in the next 90 days. One needs you before it renews:${rowsList([CONTRACTS[0]])}`,
    src: ['Renewal dates from the Extraction Agent'], act: [['Open Western Roadways', 'c-western']] },
  { k: ['zenvault', 'why is'], q: 'Why is Zenvault on the list?',
    say: 'It renews by itself on the first of January at seven percent more. Your team uses one thousand two hundred and forty of the two thousand seats. Cutting to thirteen hundred and capping the rise at three percent saves about one point seven crore a year.',
    html: () => `It renews by itself on 1 Jan at 7% more, and only 1,240 of 2,000 seats are used. Going to 1,300 seats saves <b>${MONEY(1.57e7)} a year</b>, and that is your right under clause 12.3. A 3% rise instead of 7% saves another <b>₹10.9 L</b>, but Zenvault has to agree.`,
    src: ['Clause 12.2 and 12.3, page 11', 'Usage report via IT'], act: [['Cut unused seats', 'c-zenvault']] },
  { k: ['billing', 'billed', 'overcharg', 'wrong'], q: 'Who is billing me wrong?',
    say: 'Seventeen suppliers. The biggest are Prime Staffing at eighteen lakh, Northbridge Advisory at fourteen lakh, and Western Roadways at about eleven lakh.',
    html: () => `17 suppliers. The three biggest:${barsList([['Prime Staffing', 1.82e6], ['Northbridge Advisory', 1.4e6], ['Western Roadways', 1.08e6]])}`,
    src: ['Invoices matched to contracts in Sirion'], act: [['Open Prime Staffing', 'c-prime']] },
  { k: ['saved', 'saving', 'confirmed', 'north'], q: 'How much have we saved this year?',
    say: () => 'So far this year ' + MONEY(S.confirmed).replace('₹', '').replace(' Cr', ' crore') + ' rupees is confirmed in the books. More is secured and waiting for invoices.',
    html: () => `Finance has confirmed <b>${MONEY(S.confirmed)}</b> in the books this year, ${Math.round(S.confirmed / S.found() * 100)}% of what we've found. A further <b>${MONEY(S.secured - S.confirmed)}</b> is secured and waiting for invoices.`,
    src: ['Credit notes and purchase orders in Sirion'], act: [['Is it working?', 'working']] }
];
function rowsList(list) { return `<div class="brief" style="margin-top:4px">${list.map(c => `<a href="#c-${c.id}"><span style="width:8px;height:8px;border-radius:50%;background:${c.mark === 'billed' ? '#E0517F' : c.mark === 'sla' ? '#C98BD3' : '#E0A33A'};flex:none"></span><span style="flex:1;min-width:0"><span style="display:block;font-weight:500">${c.supplier}</span><span class="muted" style="font-size:12px">${c.action.verb}</span></span><span class="num" style="font-size:12px">${MONEY(c.save.amount)}</span></a>`).join('')}</div>`; }
function barsList(list) { const max = Math.max(...list.map(l => l[1])); return `<div class="brief" style="padding:10px 12px;display:grid;gap:7px;margin-top:4px">${list.map(l => `<div><div style="display:flex;justify-content:space-between;font-size:12.5px"><span>${l[0]}</span><b class="num">${MONEY(l[1])}</b></div><div style="height:5px;border-radius:3px;background:rgba(255,255,255,0.07);margin-top:4px"><div style="height:100%;width:${l[1] / max * 100}%;background:${l === list[0] ? '#E0517F' : '#5D939A'};border-radius:3px"></div></div></div>`).join('')}</div>`; }
function findQA(text) { const t = text.toLowerCase(); return QA.find(x => x.k.some(k => t.includes(k))); }
function askPanel() {
  const todo = CONTRACTS.filter(c => !done(c)).sort((a, b) => a.due.days - b.due.days).slice(0, 3);
  return `<aside class="ask" id="ask-panel" aria-label="AskSirion">
    <div class="ask-head">
      <div aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;overflow:hidden">
        <div class="glowmove" style="position:absolute;left:-60px;top:-90px;width:300px;height:240px;border-radius:50%;background:radial-gradient(closest-side,rgba(13,94,104,0.95),rgba(13,94,104,0))"></div>
        <div class="glowmove" style="position:absolute;right:-90px;top:-40px;width:260px;height:220px;border-radius:50%;background:radial-gradient(closest-side,rgba(146,66,159,0.55),rgba(146,66,159,0));animation-direction:alternate-reverse"></div>
        <svg class="waves" width="1440" height="160" viewBox="0 0 1440 160" style="position:absolute;left:0;top:0"><g fill="none" stroke="rgba(159,211,216,0.2)" stroke-width="1"><path d="M0,45 C120,20 240,75 360,50 S600,15 720,45 S960,80 1080,50 S1320,15 1440,45"/><path d="M0,85 C120,60 240,115 360,90 S600,55 720,85 S960,120 1080,90 S1320,55 1440,85"/><path d="M0,125 C120,100 240,155 360,130 S600,95 720,125 S960,160 1080,130 S1320,95 1440,125"/></g></svg>
      </div>
      <button id="askClose" aria-label="Close AskSirion" title="Close" style="position:absolute;right:12px;top:12px;z-index:2;border:0;background:rgba(255,255,255,0.08);color:#E6EEEF;width:28px;height:28px;border-radius:8px;cursor:pointer;display:grid;place-items:center">${I.x}</button>
      <div style="position:relative;display:flex;align-items:center;gap:14px">
        <button class="orbbtn" id="orbBtn" aria-label="Talk to AskSirion" title="Tap to talk">
          <span class="orbring" style="position:absolute;inset:2px;border-radius:50%;border:1.5px solid rgba(159,211,216,0.6)"></span>
          <span class="orbring" style="position:absolute;inset:2px;border-radius:50%;border:1.5px solid rgba(201,139,211,0.6);animation-delay:1.3s"></span>
          <span class="orb orbcore"><span class="orbsheen"></span><span style="position:absolute;inset:0;display:grid;place-items:center;color:#fff">${I.mic}</span></span>
        </button>
        <div style="line-height:1.25"><div style="font-weight:600;font-size:17px;display:flex;align-items:center;gap:8px">AskSirion ${askLiveTag()}</div><div style="font-size:12.5px;color:var(--text-2)">Type a question, or tap the orb to talk.</div>
          <div style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--mist);margin-top:3px"><span style="width:6px;height:6px;border-radius:50%;background:var(--green)"></span>Read all 2,500 contracts at 9:00</div></div>
      </div>
    </div>
    <div class="ask-body" id="askBody">
      <div><div class="muted" style="font-size:12px;font-weight:500;margin-bottom:8px">Today's brief</div>
        <div class="brief">${todo.map(c => `<a href="#c-${c.id}"><span style="width:8px;height:8px;border-radius:50%;background:${c.mark === 'billed' ? '#E0517F' : c.mark === 'sla' ? '#C98BD3' : '#E0A33A'};flex:none"></span><span style="flex:1;min-width:0"><span style="display:block;font-size:13px;font-weight:500">${c.supplier}</span><span class="muted" style="font-size:12px">${c.action.verb}</span></span>${duePill(c.due).replace(' days left', 'd')}</a>`).join('') || '<div style="padding:12px" class="muted">Nothing urgent. Nice.</div>'}</div></div>
      <div><div class="muted" style="font-size:12px;font-weight:500;margin-bottom:8px">Try asking</div>
        <div style="display:flex;flex-direction:column;gap:6px">${QA.slice(0, 3).map(x => `<button class="ask-q" data-q="${esc(x.q)}"><span style="color:var(--purple-l);display:flex">${I.spark}</span>${x.q}</button>`).join('')}</div></div>
      <div id="chatLog" style="display:flex;flex-direction:column;gap:12px">${S.chat.map(chatHTML).join('')}</div>
    </div>
    <div class="ask-foot">
      <form class="askbox" id="askForm"><label class="sr" for="askIn">Ask AskSirion</label><input id="askIn" placeholder="Ask anything about your contracts" autocomplete="off">
        <button type="button" class="iconbtn" id="micBtn" aria-label="Talk to AskSirion" style="background:rgba(255,255,255,0.08);color:#E6EEEF">${I.mic}</button>
        <button type="submit" class="iconbtn" aria-label="Send" style="background:var(--purple);color:#fff">${I.send}</button></form>
      <div class="muted" style="font-size:11.5px;margin-top:8px">AskSirion only drafts. You approve before anything is sent.</div>
    </div>
  </aside>`;
}
function chatHTML(m) {
  if (m.me) return `<div class="msg-me">${esc(m.text)}</div>`;
  if (m.typing) return `<div class="typing${m.live ? ' live' : ''}" aria-label="AskSirion is thinking"><span></span><span></span><span></span>${m.live ? '<em>Checking your contracts and the web…</em>' : ''}</div>`;
  if (m.live) return liveAnswerHTML(m);
  const qa = m.qa;
  if (!qa) return `<div class="msg-ai">I can answer a few questions in this demo. Try: ${QA.map(x => `<button class="ask-q" data-q="${esc(x.q)}">${x.q}</button>`).join('')}</div>`;
  return `<div class="msg-ai"><div>${qa.html()}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${qa.src.map(s => `<span class="srcchip">${s}</span>`).join('')}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${qa.act.map((a, i) => `<a class="btn ${i ? 'ghost' : 'primary'}" href="#${a[1]}" style="height:30px">${a[0]}</a>`).join('')}</div></div>`;
}
function askQuestion(text, ctx) {
  if (!text.trim()) return;
  if (!S.askOpen && $('.shell')) { S.askOpen = true; disposeCharts(); renderApp(); }
  SirionAPI.ask(text);
  S.chat.push({ me: true, text }); S.chat.push({ typing: true, live: LIVE.ai });
  refreshChat();
  const scripted = () => { S.chat.pop(); S.chat.push({ qa: findQA(text) || null }); refreshChat(); };
  if (!LIVE.ai) { setTimeout(scripted, reduceMotion() ? 100 : 750); return; }
  const here = location.hash.slice(1);
  const c = here.startsWith('c-') && CONTRACTS.find(x => x.id === here.slice(2));
  const context = [ctx, c ? 'The user is looking at the ' + c.supplier + ' contract page.' : ''].filter(Boolean).join(' ');
  liveAsk(text, { context }).then(j => { S.chat.pop(); S.chat.push({ live: true, text: j.text, sources: j.sources, searches: j.searches }); refreshChat(); })
    .catch(err => { S.chat.pop(); if (err.code === 'rate_limited') { S.chat.push({ live: true, text: 'Too many questions in a short time. Try again in a few minutes.' }); refreshChat(); } else scripted(); });
}
function refreshChat() { const l = $('#chatLog'); if (!l) return; l.innerHTML = S.chat.map(chatHTML).join(''); $$('#chatLog [data-q]').forEach(b => b.onclick = () => askQuestion(b.dataset.q)); const body = $('#askBody'); if (body) body.scrollTop = body.scrollHeight; }

/* ---------------- voice demo ---------------- */
let vTimers = [], vIdx = 0;
function clearVoice() { vTimers.forEach(clearTimeout); vTimers = []; try { speechSynthesis.cancel(); } catch (e) {} try { if (elAudio) elAudio.pause(); } catch (e) {} }
function openVoice(startIdx, demo) {
  vIdx = startIdx || 0;
  const live = !demo && canListen();
  const root = $('#overlay-root');
  root.innerHTML = `<div class="voice" role="dialog" aria-modal="true" aria-label="AskSirion voice demo"><div class="voice-in">
    <div style="display:flex;align-items:center;gap:8px"><span style="font-weight:600;font-size:16px">AskSirion</span><span class="pill grey" id="vState">Listening</span></div>
    <div class="vorb" id="vorb"><span class="orbring" style="position:absolute;inset:14px;border-radius:50%;border:1.5px solid rgba(159,211,216,0.55)"></span><span class="orbring" style="position:absolute;inset:14px;border-radius:50%;border:1.5px solid rgba(201,139,211,0.55);animation-delay:1.3s"></span><span class="core"><span class="orbsheen"></span></span></div>
    <div class="wavebars" id="vWave" aria-hidden="true">${[14, 26, 34, 22, 30, 18, 26, 12, 22, 30].map((h, i) => `<span style="height:${h}px;animation-delay:${i * 90}ms"></span>`).join('')}</div>
    <div class="muted" style="font-size:12px">You said</div>
    <div id="vQ" style="font-size:22px;min-height:30px"></div>
    <div class="caption" id="vA" aria-live="polite"></div>
    <div class="muted" id="vSrc" style="font-size:12px;max-width:50ch"></div>
    <div style="display:flex;gap:10px;margin-top:6px"><button class="btn ghost" id="vNext">Ask another question</button>${live ? '<button class="btn ghost" id="vSample">Play a sample question</button>' : '<button class="btn primary" id="vShow">Show me on screen</button>'}<button class="iconbtn" id="vEnd" aria-label="End voice demo" style="background:#C22E5E;color:#fff;width:42px;height:42px;border-radius:50%">${I.x}</button></div>
    <div class="muted" style="font-size:11.5px;max-width:46ch">${live ? 'Speak now. Your browser turns your words into text, AskSirion answers from the contracts and this week\'s headlines, and your browser reads the answer aloud.' : 'Voice demo: the questions are pre-written because this browser or page can\'t use your microphone. Answers are spoken aloud by your browser.'}</div>
  </div></div>`;
  const end = () => { clearVoice(); stopListen(); root.innerHTML = ''; document.removeEventListener('keydown', esck); };
  const esck = (e) => { if (e.key === 'Escape') end(); };
  document.addEventListener('keydown', esck);
  $('#vEnd').onclick = end;
  if (live) {
    $('#vNext').onclick = () => liveListen();
    $('#vSample').onclick = () => { stopListen(); vIdx = (vIdx + 1) % 4; runVoice(); };
    liveListen();
  } else {
    $('#vNext').onclick = () => { vIdx = (vIdx + 1) % 4; runVoice(); };
    $('#vShow').onclick = () => { const a = QA[vIdx].act[0][1]; end(); go(a); };
    runVoice();
  }
}
function runVoice() {
  clearVoice();
  const qa = QA[vIdx];
  const st = $('#vState'), wv = $('#vWave'), q = $('#vQ'), a = $('#vA'), orb = $('#vorb');
  if (!st) return;
  st.textContent = 'Listening'; wv.classList.remove('idle'); q.textContent = ''; a.innerHTML = ''; orb.classList.remove('talking');
  const words = qa.q.split(' ');
  words.forEach((w, i) => vTimers.push(setTimeout(() => { q.textContent = words.slice(0, i + 1).join(' '); }, 500 + i * 220)));
  const tThink = 500 + words.length * 220 + 300;
  vTimers.push(setTimeout(() => { st.textContent = 'Thinking'; wv.classList.add('idle'); SirionAPI.ask(qa.q); }, tThink));
  vTimers.push(setTimeout(() => {
    st.textContent = 'Speaking'; orb.classList.add('talking'); wv.classList.remove('idle');
    const said = typeof qa.say === 'function' ? qa.say() : qa.say;
    const ws = said.split(' ');
    a.innerHTML = `<span class="unsaid">${esc(said)}</span>`;
    let spoke = false;
    try {
      spoke = speak(said, (n) => { a.innerHTML = `<span class="said">${esc(said.slice(0, n))}</span><span class="unsaid">${esc(said.slice(n))}</span>`; }, () => { a.innerHTML = `<span class="said">${esc(said)}</span>`; st.textContent = 'Done'; orb.classList.remove('talking'); wv.classList.add('idle'); });
    } catch (e) {}
    // caption fallback if the browser can't speak or doesn't report word timings
    ws.forEach((w, i) => vTimers.push(setTimeout(() => { if (spoke) return; const upto = ws.slice(0, i + 1).join(' '); a.innerHTML = `<span class="said">${esc(upto)}</span><span class="unsaid">${esc(said.slice(upto.length))}</span>`; if (i === ws.length - 1) { st.textContent = 'Done'; orb.classList.remove('talking'); wv.classList.add('idle'); } }, i * 320)));
  }, tThink + 900));
}

/* ---------------- tour ---------------- */
const TOUR = [
  ['#ask-panel', 'Ask anything, or just talk', 'AskSirion has read every contract and gives you a short brief each morning. Type a question, or tap the orb and speak.', 'left'],
  ['#nums', 'Your four numbers', 'How much extra you paid this month, what you can still save, how many contracts need fixing, and what Finance has confirmed.', 'below'],
  ['#todo', 'Start here every week', 'Each row says what is wrong and the one thing to do. Nothing goes to a supplier until you approve it.', 'above']
];
let tourI = -1;
function startTour() { if (location.hash.slice(1) !== 'overview') { go('overview'); setTimeout(startTour, 150); return; } tourI = 0; showTour(); }
function endTour(silent) { $$('.tour-spot').forEach(e => e.classList.remove('tour-spot')); const t = $('#tourtip'); if (t) t.remove(); tourI = -1; }
function showTour() {
  $$('.tour-spot').forEach(e => e.classList.remove('tour-spot')); const old = $('#tourtip'); if (old) old.remove();
  if (tourI < 0 || tourI >= TOUR.length) return endTour();
  const [sel, title, text, pos] = TOUR[tourI];
  const el = $(sel); if (!el) return endTour();
  if (pos !== 'left') el.scrollIntoView({ block: 'center', behavior: 'auto' });
  el.classList.add('tour-spot');
  const r = el.getBoundingClientRect();
  const tip = document.createElement('div'); tip.className = 'tourtip'; tip.id = 'tourtip'; tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-label', 'Tour step ' + (tourI + 1) + ' of ' + TOUR.length);
  tip.innerHTML = `<div style="font-size:12px;color:var(--purple);font-weight:600;margin-bottom:4px">Step ${tourI + 1} of ${TOUR.length}</div><h3>${title}</h3><div style="color:#4D565D">${text}</div>
    <div class="row"><span class="dots">${TOUR.map((_, i) => `<i class="${i === tourI ? 'on' : ''}"></i>`).join('')}</span>${tourI ? '<button id="tBack" style="background:#F0F4F4;color:#0B1821">Back</button>' : '<button id="tSkip" style="background:transparent;color:#4D565D">Skip tour</button>'}<button id="tNext" style="background:var(--purple);color:#fff">${tourI === TOUR.length - 1 ? 'Got it' : 'Next'}</button></div>`;
  document.body.appendChild(tip);
  const tw = 320, th = tip.offsetHeight;
  let x, y;
  if (pos === 'left') { x = r.left - tw - 16; y = Math.min(Math.max(16, r.top + 80), innerHeight - th - 16); }
  else if (pos === 'above') { x = Math.max(16, r.left + 24); y = Math.max(16, r.top - th - 14); }
  else { x = Math.max(16, r.left + 24); y = Math.min(r.bottom + 14, innerHeight - th - 16); }
  if (x < 16) { x = 16; }
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
  const n = $('#tNext'), b = $('#tBack'), s = $('#tSkip');
  n.onclick = () => { tourI++; showTour(); }; if (b) b.onclick = () => { tourI--; showTour(); }; if (s) s.onclick = () => endTour();
  const sk = document.createElement('button'); sk.textContent = 'Skip tour'; sk.setAttribute('style', 'position:absolute;top:10px;right:12px;background:transparent;border:0;color:#5C6B70;font-size:12px;cursor:pointer'); sk.onclick = () => endTour(); if (tourI > 0) tip.appendChild(sk);
  n.focus();
}

/* ---------------- walkthrough (auto-play) ---------------- */
const WALK = [
  { r: 'story', c: 'Contract health, shown through one example persona: a large manufacturer like Asian Paints. It catches signed supplier contracts that have drifted from what was agreed, or from today\'s market.' },
  { r: 'story', spot: '#pim', c: 'Who it\'s for: Procurement uses it every day. IT, Legal and Finance must agree. The CPO pays, and the supplier reacts.' },
  { r: 'signin', c: 'Anyone can open it. Judges use the demo button, no account needed.' },
  { r: 'overview', hero: true, c: 'On first visit, a short launch section explains what\'s new in Sirion.' },
  { r: 'overview', spot: '#nums', c: 'Four numbers: extra paid this month, what you can still save, how many contracts need fixing, and what Finance has confirmed.' },
  { r: 'overview', spot: '#chart-card', c: 'The gap grows every month that signed prices stand still while reality moves.' },
  { r: 'overview', spot: '#todo', c: 'Most urgent first. Each row says what\'s wrong and the one thing to do.' },
  { r: 'c-western', c: 'Western Roadways still charges last year\'s fuel rate although diesel got cheaper. About ₹10.8 L can come back, and the contract renews soon.' },
  { r: 'c-western', menu: true, c: 'Each step waits on a different person. Use the flow card, or your avatar at the top right, to switch user and walk one contract through everyone.' },
  { r: 'overview', voice: true, c: 'AskSirion answers by typing or voice, and always shows the contract page it used.' },
  { r: 'working', c: 'Success is one number: money Finance confirms. Plus clear limits that would make us rethink.' }
];
let walkT;
function startWalk() { S.walk = 0; S.heroSeen = false; runWalk(); }
function runWalk() {
  clearTimeout(walkT); clearVoice(); $('#overlay-root').innerHTML = ''; endTour();
  const st = WALK[S.walk]; if (!st) return stopWalk();
  S.menu = false;
  if (st.r === 'overview') S.heroSeen = !st.hero;
  if (location.hash.slice(1) !== st.r) { history.replaceState(null, '', '#' + st.r); }
  disposeCharts();
  if (st.r === 'story') renderStory(); else if (st.r === 'signin') renderSignin(); else renderApp();
  scrollTo(0, 0);
  setTimeout(() => {
    if (st.spot) { const el = $(st.spot); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('tour-spot'); } }
    if (st.menu) { S.menu = true; renderApp(); }
    if (st.voice) openVoice(1, true);
    drawWalkBar();
  }, 120);
  walkT = setTimeout(() => { S.walk++; if (S.walk >= WALK.length) stopWalk(); else runWalk(); }, st.voice ? 13000 : 7000);
}
function drawWalkBar() {
  const old = $('#wt'); if (old) old.remove();
  const st = WALK[S.walk];
  const d = document.createElement('div'); d.className = 'wt'; d.id = 'wt';
  d.innerHTML = `<span class="pill purple num">${S.walk + 1} / ${WALK.length}</span><div style="flex:1;font-size:14px;line-height:1.45">${st.c}</div>
    <button class="iconbtn" id="wtNext" aria-label="Next" style="background:rgba(255,255,255,0.08);color:#fff">${I.next}</button>
    <button class="btn ghost" id="wtExit" style="height:32px">Exit</button><div class="bar" id="wtBar"></div>`;
  document.body.appendChild(d);
  const bar = $('#wtBar'); const dur = st.voice ? 13000 : 7000;
  if (!reduceMotion()) { bar.style.width = '0%'; bar.animate([{ width: '0%' }, { width: '100%' }], { duration: dur, easing: 'linear', fill: 'forwards' }); }
  $('#wtNext').onclick = () => { S.walk++; if (S.walk >= WALK.length) stopWalk(); else runWalk(); };
  $('#wtExit').onclick = stopWalk;
}
function stopWalk() { clearTimeout(walkT); clearVoice(); S.walk = -1; S.menu = false; const w = $('#wt'); if (w) w.remove(); $('#overlay-root').innerHTML = ''; S.heroSeen = store.get('heroSeen', false); location.hash = 'story'; }

/* ---------------- wiring ---------------- */
function renderApp() {
  const h = location.hash.slice(1) || 'overview';
  if (S.role === 'supplier' && (h === 'overview' || h.startsWith('c-'))) return renderSupplier();
  if (h.startsWith('c-')) return renderContract(h.slice(2));
  if (h === 'working') return renderWorking();
  if (h === 'integrations') return renderIntegrations();
  return renderOverview();
}
function wireRoleSet() { $$('[data-role-set]').forEach(b => b.onclick = () => { S.role = b.dataset.roleSet; S.menu = false; toast('Now viewing as ' + PEOPLE[S.role].name + '.'); const h = location.hash.slice(1); if (S.role === 'supplier') renderSupplier(); else if (h === 'overview' || h.startsWith('c-') || h === 'working' || h === 'integrations') { disposeCharts(); renderApp(); } else go('c-zenvault'); }); }
function wireShell() {
  wireRoleSet();
  const va = $('#viewAsBtn'); if (va) va.onclick = (e) => { e.stopPropagation(); S.menu = !S.menu; disposeCharts(); renderApp(); };
  $$('.menu [data-role]').forEach(b => b.onclick = () => { S.role = b.dataset.role; S.menu = false; toast('Now viewing as ' + PEOPLE[S.role].name + '.'); if (S.role === 'supplier') return renderSupplier(); disposeCharts(); renderApp(); });
  const ta = $('#topAsk'); if (ta) ta.onclick = () => { S.askOpen = true; renderApp(); };
  const tt = $('#topTour'); if (tt) tt.onclick = () => startTour();
  const nt = $('#navTour'), nn = $('#navNew');
  if (nt) nt.onclick = () => startTour();
  if (nn) nn.onclick = () => { S.heroSeen = false; if (location.hash.slice(1) !== 'overview') go('overview'); else { disposeCharts(); renderApp(); } };
  $$('[data-scroll]').forEach(a => a.onclick = (e) => { e.preventDefault(); const id = a.dataset.scroll; if (location.hash.slice(1) !== 'overview') { go('overview'); setTimeout(() => { const t = $('#' + id); if (t) t.scrollIntoView({ block: 'start' }); }, 120); } else { const t = $('#' + id); if (t) t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); } });
  const fab = $('#askFab'); if (fab) fab.onclick = () => { S.askOpen = true; disposeCharts(); renderApp(); setTimeout(() => { const i = $('#askIn'); if (i) i.focus(); }, 60); };
  const ac = $('#askClose'); if (ac) ac.onclick = () => { S.askOpen = false; disposeCharts(); renderApp(); };
  const ob = $('#orbBtn'), mb = $('#micBtn');
  if (ob) ob.onclick = () => openVoice(0); if (mb) mb.onclick = () => openVoice(0);
  const f = $('#askForm'); if (f) f.onsubmit = (e) => { e.preventDefault(); const i = $('#askIn'); const v = i.value; i.value = ''; askQuestion(v); };
  $$('.ask-body [data-q]').forEach(b => b.onclick = () => askQuestion(b.dataset.q));
  refreshChat();
  const sb = $('#searchBox'); if (sb) sb.onkeydown = (e) => { if (e.key === 'Enter') { const q = sb.value.toLowerCase(); const c = CONTRACTS.find(x => x.supplier.toLowerCase().includes(q) || x.category.toLowerCase().includes(q)); if (c) go('c-' + c.id); else toast('No match in this demo. Try "Zenvault" or "staffing".'); } };
}
document.addEventListener('click', (e) => { if (S.menu && !e.target.closest('.viewas')) { S.menu = false; const m = $('.menu'); if (m) { m.remove(); const b = $('#viewAsBtn'); if (b) b.setAttribute('aria-expanded', 'false'); } } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tourI >= 0) endTour(); if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { const s = $('#searchBox'); if (s) { e.preventDefault(); s.focus(); } } });
/* ================= live layer ================= */
/* Live layer: news, diesel and inflation from /api, and AskSirion answers from the Claude API.
   If /api is not there (for example when opened as a plain file), everything falls back to the demo data. */
const LIVE = { loading: true, news: null, market: null, ai: false, topic: 'logistics', hist: [] };

const ago = (iso) => {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return m <= 1 ? 'just now' : m + ' min ago';
  const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24); return d === 1 ? 'yesterday' : d + ' days ago';
};
const tfmt = (iso) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

async function liveInit() {
  const get = (u) => fetch(u, { headers: { accept: 'application/json' } }).then(r => r.ok ? r.json() : Promise.reject(r.status));
  const [n, m, a, t] = await Promise.allSettled([get('/api/news'), get('/api/market'), get('/api/ask'), get('/api/tts')]);
  LIVE.voice = t.status === 'fulfilled' && !!t.value.ready;
  if (n.status === 'fulfilled') { LIVE.news = n.value; const c = n.value.topics.reduce((s, t) => s + t.items.length, 0); SirionAPI.live('GET', 'news.google.com/rss (India)', c + ' headlines across 6 supplier types'); }
  if (m.status === 'fulfilled') {
    LIVE.market = m.value;
    const d = m.value.diesel && m.value.diesel.price, inf = m.value.inflation;
    SirionAPI.live('GET', 'Diesel price, Mumbai', d ? '₹' + d.value + ' a litre (' + d.source + ')' : 'Latest headline only');
    if (inf && inf.annual) SirionAPI.live('GET', 'api.worldbank.org CPI, India', inf.annual.value + '% (' + inf.annual.year + ')');
  }
  LIVE.ai = a.status === 'fulfilled' && !!a.value.ready;
  if (LIVE.ai) SirionAPI.live('GET', 'api.anthropic.com', 'AskSirion live: Claude with web search');
  LIVE.loading = false;
  liveRefresh();
}
function liveRefresh() {
  const h = location.hash.slice(1);
  const mw = document.getElementById('marketWatch'); if (mw) mw.outerHTML = marketWatch();
  wireMarketWatch();
  const lb = document.getElementById('liveBox'); if (lb && h.startsWith('c-')) lb.outerHTML = liveContractBox(h.slice(2));
  const st = document.getElementById('liveStatus'); if (st) st.outerHTML = liveStatusCard();
  const tag = document.getElementById('askLiveTag'); if (tag) tag.outerHTML = askLiveTag();
}

/* ---------- overview: market watch ---------- */
function marketWatch() {
  if (!LIVE.loading && !LIVE.news) return '<div id="marketWatch"></div>';
  const head = `<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;padding:16px 18px 10px">
      <div><h2 class="h" style="display:flex;align-items:center;gap:8px">Market watch <span class="livepill"><i></i>Live</span></h2>
      <div class="sub">This week's news for each kind of supplier, and what it means for your contracts.${LIVE.news ? ' Updated ' + tfmt(LIVE.news.updated) + ', from ' + LIVE.news.source + '.' : ''}</div></div>`;
  if (LIVE.loading) return `<section class="card mw" id="marketWatch">${head}</div><div class="mw-skel"><span></span><span></span><span></span></div></section>`;
  const t = LIVE.news.topics.find(x => x.key === LIVE.topic) || LIVE.news.topics[0];
  const c = t.contract && CONTRACTS.find(x => x.id === t.contract);
  return `<section class="card mw" id="marketWatch">${head}
      <div class="seg" role="tablist" aria-label="Supplier type" style="margin-left:auto">${LIVE.news.topics.map(x => `<button role="tab" aria-selected="${x.key === t.key}" data-mw="${x.key}">${x.label}</button>`).join('')}</div></div>
    <div class="mw-body">
      <ul class="mw-list">${t.items.length ? t.items.slice(0, 4).map(it => `<li><a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.title)}</a><span class="muted">${esc(it.source || '')}${it.date ? ' · ' + ago(it.date) : ''}</span></li>`).join('') : '<li class="muted">No news this week for this supplier type.</li>'}</ul>
      <div class="mw-why"><div class="muted" style="font-size:12px">Why it matters</div><p>${t.why}</p>
        ${c ? `<a class="mw-link" href="#c-${c.id}">${c.supplier}: ${c.action.verb.toLowerCase()} →</a>` : ''}
        <button class="btn ghost" id="mwAsk" style="margin-top:12px">${I.spark}Ask AskSirion what this means</button></div>
    </div></section>`;
}
function wireMarketWatch() {
  document.querySelectorAll('[data-mw]').forEach(b => b.onclick = () => { LIVE.topic = b.dataset.mw; const mw = document.getElementById('marketWatch'); if (mw) mw.outerHTML = marketWatch(); wireMarketWatch(); });
  const ask = document.getElementById('mwAsk');
  if (ask) ask.onclick = () => {
    const t = LIVE.news.topics.find(x => x.key === LIVE.topic);
    const ctx = 'Headlines on screen (' + t.label + '): ' + t.items.slice(0, 5).map(i => i.title + ' (' + (i.source || '') + ', ' + (i.date || '').slice(0, 10) + ')').join('; ');
    askQuestion('What do this week\'s ' + t.label.toLowerCase() + ' headlines mean for our contracts?', ctx);
  };
}

/* ---------- contract page: live box ---------- */
function liveContractBox(id) {
  const empty = '<div id="liveBox"></div>';
  if (LIVE.loading) return `<div id="liveBox" class="livebox"><span class="livepill"><i></i>Live</span><span class="muted">Checking today's prices…</span></div>`;
  const m = LIVE.market, n = LIVE.news;
  if (id === 'western' && m && m.diesel) {
    const p = m.diesel.price, l = p || m.diesel.latest;
    if (!l) return empty;
    return `<div id="liveBox" class="livebox"><div class="lb-top"><span class="livepill"><i></i>Live</span><b>${p ? `Diesel in Mumbai today: ₹${p.value} a litre` : 'Latest diesel news'}</b></div>
      <a href="${esc(l.link)}" target="_blank" rel="noopener">${esc(l.title)}</a><span class="muted">${esc(l.source || '')} · ${ago(l.date)}</span>
      <p>${p ? `The fuel clause moves the freight rate with diesel. Contract health rechecks every new Western Roadways invoice against this price.` : 'No exact price in today\'s headlines. The check uses the last confirmed price until one appears.'}</p></div>`;
  }
  if (id === 'cleancore' && m && m.inflation) {
    const mo = m.inflation.monthly, an = m.inflation.annual;
    if (!mo && !an) return empty;
    return `<div id="liveBox" class="livebox"><div class="lb-top"><span class="livepill"><i></i>Live</span><b>India inflation${mo ? `: ${mo.value}% in the latest monthly reading` : ''}</b></div>
      ${mo ? `<a href="${esc(mo.link)}" target="_blank" rel="noopener">${esc(mo.title)}</a><span class="muted">${esc(mo.source || '')} · ${ago(mo.date)}</span>` : ''}
      ${an ? `<span class="muted">Yearly figure: ${an.value}% in ${an.year}, <a href="${an.link}" target="_blank" rel="noopener">World Bank</a></span>` : ''}
      <p>CleanCore's contract caps price rises at the inflation index. A 6% rise is above every recent reading, so the cap applies.</p></div>`;
  }
  const c = CONTRACTS.find(x => x.id === id);
  const topic = n && c && n.topics.find(t => t.contract === id);
  if (!topic || !topic.items.length) return empty;
  return `<div id="liveBox" class="livebox"><div class="lb-top"><span class="livepill"><i></i>Live</span><b>In the news this week: ${topic.label.toLowerCase()}</b></div>
    ${topic.items.slice(0, 2).map(it => `<a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.title)}</a><span class="muted">${esc(it.source || '')} · ${ago(it.date)}</span>`).join('')}
    <p>${topic.why}</p></div>`;
}

/* ---------- integrations: live sources ---------- */
function liveStatusCard() {
  const row = (name, what, ok, note) => `<tr style="cursor:default"><td><b style="font-weight:500">${name}</b><div class="muted" style="font-size:12px">${what}</div></td><td>${LIVE.loading ? '<span class="pill grey">Checking</span>' : ok ? '<span class="pill green"><i></i>Live</span>' : '<span class="pill grey">Not connected</span>'}</td><td class="muted">${note}</td></tr>`;
  const m = LIVE.market;
  return `<section class="card" id="liveStatus" style="margin-top:16px;overflow:hidden">
    <div style="padding:14px 18px 10px"><h2 class="h">Live outside sources</h2><div class="sub">Fetched each time the page opens and cached for 30 minutes.</div></div>
    <table class="t"><thead><tr><th>Source</th><th>Status</th><th>Latest</th></tr></thead><tbody>
      ${row('Google News, India edition', 'Supplier and Asian Paints news', !!LIVE.news, LIVE.news ? LIVE.news.topics.reduce((s, t) => s + t.items.length, 0) + ' headlines, ' + ago(LIVE.news.updated) : '')}
      ${row('Diesel price, Mumbai', 'Read from today\'s fuel price headlines', !!(m && m.diesel && m.diesel.price), m && m.diesel && m.diesel.price ? '₹' + m.diesel.price.value + ' a litre' : 'No price in today\'s headlines')}
      ${row('World Bank', 'Consumer price inflation, India', !!(m && m.inflation && m.inflation.annual), m && m.inflation && m.inflation.annual ? m.inflation.annual.value + '% in ' + m.inflation.annual.year : '')}
      ${row('Claude API, with web search', 'Powers AskSirion answers', LIVE.ai, LIVE.ai ? 'Answers cite their sources' : 'Using pre-written demo answers')}
    </tbody></table></section>`;
}
function askLiveTag() {
  if (LIVE.loading) return '<span id="askLiveTag"></span>';
  return LIVE.ai ? '<span id="askLiveTag" class="livepill" title="Answers come from Claude, with live web search"><i></i>Live AI</span>' : '<span id="askLiveTag" class="pill grey" style="height:18px;font-size:11px">Demo answers</span>';
}

/* ---------- AskSirion: live answers ---------- */
function mdLite(s) {
  const lines = esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n+/);
  let html = '', inList = false;
  for (const ln of lines) {
    const m = ln.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)/);
    if (m) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + m[1] + '</li>'; }
    else { if (inList) { html += '</ul>'; inList = false; } if (ln.trim()) html += '<p>' + ln + '</p>'; }
  }
  return html + (inList ? '</ul>' : '');
}
async function liveAsk(question, opts = {}) {
  const r = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question, voice: !!opts.voice, context: opts.context || '', history: LIVE.hist.slice(-6) }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'failed'), { code: j.error || r.status });
  LIVE.hist.push({ role: 'user', content: question }, { role: 'assistant', content: j.text });
  SirionAPI.live('POST', 'api.anthropic.com/v1/messages', (j.searches && j.searches.length ? 'Searched: ' + j.searches.join('; ').slice(0, 60) : 'Answered from contract data'));
  return j;
}
function liveAnswerHTML(m) {
  return `<div class="msg-ai live"><div class="md">${mdLite(m.text)}</div>
    ${m.sources && m.sources.length ? `<div class="srcs"><span class="muted" style="font-size:11.5px">Sources</span>${m.sources.map(s => `<a class="srcchip" href="${esc(s.url)}" target="_blank" rel="noopener">${esc((s.title || s.url).slice(0, 48))}</a>`).join('')}</div>` : ''}
    ${m.searches && m.searches.length ? `<div class="muted" style="font-size:11.5px">Searched the web for: ${m.searches.map(esc).join(', ')}</div>` : ''}</div>`;
}

/* ---------- voice: real microphone ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const canListen = () => !!SR && window.isSecureContext;
let rec = null;
let elAudio = null;
function speakBrowser(said, onWord, onEnd) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(said); u.rate = 1.02;
    const vs = speechSynthesis.getVoices(); const v = vs.find(x => /en-IN/i.test(x.lang)) || vs.find(x => /^en/i.test(x.lang)); if (v) u.voice = v;
    u.onboundary = (e) => { if (!e.name || e.name === 'word') onWord(e.charIndex + (e.charLength || 0)); };
    u.onend = onEnd; u.onerror = onEnd;
    speechSynthesis.speak(u); return true;
  } catch (e) { return false; }
}
function speak(said, onWord, onEnd) {
  try { if (elAudio) { elAudio.pause(); elAudio = null; } } catch (e) {}
  if (!(LIVE && LIVE.voice)) return speakBrowser(said, onWord, onEnd);
  fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: said }) })
    .then(r => { if (!r.ok) throw new Error('tts'); return r.blob(); })
    .then(b => {
      const a = new Audio(URL.createObjectURL(b)); elAudio = a;
      a.ontimeupdate = () => { if (a.duration) onWord(Math.floor(said.length * a.currentTime / a.duration)); };
      a.onended = onEnd; a.onerror = onEnd; a.play().catch(() => speakBrowser(said, onWord, onEnd));
    })
    .catch(() => speakBrowser(said, onWord, onEnd));
  return true;
}
function liveListen() {
  const st = $('#vState'), wv = $('#vWave'), q = $('#vQ'), a = $('#vA'), orb = $('#vorb'), src = $('#vSrc');
  if (!st) return;
  try { speechSynthesis.cancel(); } catch (e) {}
  if (rec) { try { rec.abort(); } catch (e) {} }
  st.textContent = 'Listening'; wv.classList.remove('idle'); q.textContent = ''; a.innerHTML = '<span class="unsaid">Ask about a contract, a supplier, or today\'s prices.</span>'; orb.classList.remove('talking'); if (src) src.innerHTML = '';
  rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = true; rec.maxAlternatives = 1;
  let final = '';
  rec.onresult = (e) => { let t = ''; for (const r of e.results) t += r[0].transcript; q.textContent = t; if (e.results[e.results.length - 1].isFinal) final = t; };
  rec.onerror = (e) => { const blocked = e.error === 'not-allowed' || e.error === 'service-not-allowed'; st.textContent = blocked ? 'Microphone blocked' : e.error === 'audio-capture' ? 'No microphone found' : 'Didn\'t catch that'; wv.classList.add('idle');
    a.innerHTML = `<span class="unsaid">${blocked ? (window.self !== window.top ? 'This page is inside a frame, and browsers block the microphone there. Open it in its own browser tab.' : 'Click the lock icon next to the address bar, set Microphone to Allow, then reload this page. Or tap "Play a sample question".') : e.error === 'audio-capture' ? 'Plug in or turn on a microphone, then try again.' : 'Tap "Ask another question" and try again.'}</span>`; };
  rec.onend = async () => {
    if (!final.trim()) { if (st.textContent === 'Listening') { st.textContent = 'Didn\'t catch that'; wv.classList.add('idle'); } return; }
    st.textContent = 'Thinking'; wv.classList.add('idle'); a.innerHTML = '<span class="unsaid">Checking your contracts and the web…</span>';
    try {
      let j = null;
      if (LIVE.ai) { try { j = await liveAsk(final, { voice: true }); } catch (err) { if (err.code === 'rate_limited') throw err; } }
      if (!j) { const qa = findQA(final); j = { text: qa ? (typeof qa.say === 'function' ? qa.say() : qa.say) : 'I can answer questions about the contracts in this demo. Try asking which contract needs attention first, or what Zenvault means for us.', sources: [], searches: [] }; }
      const said = j.text.replace(/\*\*/g, '');
      st.textContent = 'Speaking'; orb.classList.add('talking'); wv.classList.remove('idle');
      a.innerHTML = `<span class="unsaid">${esc(said)}</span>`;
      if (src && j.sources && j.sources.length) src.innerHTML = 'Sources: ' + j.sources.slice(0, 3).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc((s.title || '').slice(0, 40))}</a>`).join(', ');
      const done = () => { a.innerHTML = `<span class="said">${esc(said)}</span>`; st.textContent = 'Done'; orb.classList.remove('talking'); wv.classList.add('idle'); };
      if (!speak(said, (n) => { a.innerHTML = `<span class="said">${esc(said.slice(0, n))}</span><span class="unsaid">${esc(said.slice(n))}</span>`; }, done)) done();
      S.chat.push({ me: true, text: final }, { live: true, text: j.text, sources: j.sources, searches: j.searches }); refreshChat();
    } catch (err) {
      st.textContent = 'Something went wrong'; wv.classList.add('idle');
      a.innerHTML = `<span class="unsaid">${err.code === 'rate_limited' ? 'Too many questions in a short time. Try again in a few minutes.' : 'I couldn\'t answer just now. Try again, or type your question.'}</span>`;
    }
  };
  try { rec.start(); } catch (e) {}
}
function stopListen() { if (rec) { try { rec.abort(); } catch (e) {} rec = null; } }

document.addEventListener('DOMContentLoaded', () => setTimeout(liveInit, 50));

try { speechSynthesis.getVoices(); } catch (e) {}
route();
})();
