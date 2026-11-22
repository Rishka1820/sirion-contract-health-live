// Small helpers for reading Google News RSS without extra packages.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] ?? m;
  })
  .replace(/<[^>]+>/g, '')
  .trim();
const tag = (xml, t) => { const m = xml.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>', 'i')); return m ? decode(m[1]) : ''; };

async function googleNews(query, { days = 21, max = 6 } = {}) {
  const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query + ' when:' + days + 'd') + '&hl=en-IN&gl=IN&ceid=IN:en';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContractHealthDemo/1.0)' } });
  if (!r.ok) throw new Error('news ' + r.status);
  const xml = await r.text();
  const items = [];
  const seen = new Set();
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const source = tag(it, 'source');
    let title = tag(it, 'title');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    const key = title.toLowerCase().slice(0, 60);
    if (!title || seen.has(key)) continue;
    seen.add(key);
    const date = new Date(tag(it, 'pubDate'));
    items.push({ title, link: tag(it, 'link'), source, date: isNaN(date) ? null : date.toISOString() });
  }
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return items.slice(0, max);
}

module.exports = { googleNews, decode };
