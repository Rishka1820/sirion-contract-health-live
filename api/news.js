// GET /api/news : this week's news for each kind of supplier, from Google News (India edition).
const { googleNews } = require('./_rss');

const TOPICS = [
  { key: 'asianpaints', label: 'Asian Paints', q: '"Asian Paints"', why: 'News about the company itself: volumes, costs and plans that change what it buys.', contract: null },
  { key: 'software', label: 'Software', q: '(SaaS OR software OR licence) (price hike OR price increase OR renewal) India', why: 'Software vendors are raising prices at renewal. Check seat counts and price caps before auto-renewals.', contract: 'zenvault' },
  { key: 'staffing', label: 'Staffing', q: '(staffing OR "temporary workers" OR "contract labour") (wages OR rates OR "minimum wage") India', why: 'Wage and rate news sets what staffing agencies can fairly bill against your rate cards.', contract: 'prime' },
  { key: 'logistics', label: 'Logistics', q: '(diesel price OR freight rates OR truck rentals) India', why: 'Fuel-linked freight contracts should move with diesel. Each invoice is checked against the fuel clause.', contract: 'western' },
  { key: 'facilities', label: 'Facilities', q: '(CPI inflation OR retail inflation) India', why: 'Facility contracts usually cap price rises at an inflation index. This is the number that cap is checked against.', contract: 'cleancore' },
  { key: 'marketing', label: 'Marketing', q: '(ad agency OR advertising OR "media buying") (fees OR rates OR spends) India', why: 'Agency fees and service levels are checked against what was promised each month.', contract: 'brightline' }
];

module.exports = async (req, res) => {
  const results = await Promise.allSettled(TOPICS.map(t => googleNews(t.q, { days: t.key === 'asianpaints' ? 30 : 21, max: 5 })));
  const topics = TOPICS.map((t, i) => ({
    key: t.key, label: t.label, why: t.why, contract: t.contract,
    items: results[i].status === 'fulfilled' ? results[i].value : [],
    error: results[i].status === 'rejected' ? String(results[i].reason && results[i].reason.message || results[i].reason) : undefined
  }));
  const ok = topics.some(t => t.items.length);
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(ok ? 200 : 502).json({ updated: new Date().toISOString(), source: 'Google News, India edition', topics });
};
