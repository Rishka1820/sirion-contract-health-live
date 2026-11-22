// GET /api/market : today's diesel price headline for Mumbai and the latest inflation figures for India.
const { googleNews } = require('./_rss');

function findDiesel(items) {
  const res = [
    /diesel[^₹\d]{0,80}?(?:₹|Rs\.?|INR)\s?(\d{2,3}(?:\.\d{1,2})?)/i,
    /(?:₹|Rs\.?|INR)\s?(\d{2,3}\.\d{1,2})[^.]{0,40}?(?:per litre|\/litre|a litre)?[^.]{0,40}diesel/i
  ];
  for (const it of items) {
    if (!/diesel/i.test(it.title)) continue;
    for (const re of res) {
      const m = it.title.match(re);
      if (m) { const v = parseFloat(m[1]); if (v > 70 && v < 120) return Object.assign({ value: v }, it); }
    }
  }
  return null;
}
function findPct(items) {
  for (const it of items) {
    if (!/(retail|CPI|consumer price)[^.]{0,40}inflation|inflation[^.]{0,40}(CPI|retail)/i.test(it.title) || /(to average|forecast|expect|projected|may |likely|outlook)/i.test(it.title)) continue;
    const m = it.title.match(/(\d{1,2}(?:\.\d{1,2})?)\s?(?:%|per ?cent)/i);
    if (m) { const v = parseFloat(m[1]); if (v >= 0 && v < 20) return Object.assign({ value: v }, it); }
  }
  return null;
}

module.exports = async (req, res) => {
  const [dieselNews, cpiNews, wb] = await Promise.allSettled([
    googleNews('diesel price Mumbai per litre', { days: 7, max: 15 }),
    googleNews('India retail inflation CPI', { days: 45, max: 12 }),
    fetch('https://api.worldbank.org/v2/country/IN/indicator/FP.CPI.TOTL.ZG?format=json&per_page=6').then(r => r.json())
  ]);
  const dItems = dieselNews.status === 'fulfilled' ? dieselNews.value : [];
  const cItems = cpiNews.status === 'fulfilled' ? cpiNews.value : [];
  let annual = null;
  if (wb.status === 'fulfilled' && Array.isArray(wb.value) && Array.isArray(wb.value[1])) {
    const row = wb.value[1].find(x => x.value != null);
    if (row) annual = { value: Math.round(row.value * 100) / 100, year: row.date, source: 'World Bank, consumer price inflation (annual %)', link: 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=IN' };
  }
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).json({
    updated: new Date().toISOString(),
    diesel: { price: findDiesel(dItems), latest: dItems.find(x => /diesel/i.test(x.title)) || null },
    inflation: { monthly: findPct(cItems), latest: cItems.find(x => /inflation/i.test(x.title)) || null, annual }
  });
};
