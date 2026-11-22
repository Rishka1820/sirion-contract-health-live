// /api/ask : AskSirion. GET says whether live answers are switched on; POST answers a question.
// Uses the Claude API with web search. The API key stays on the server (ANTHROPIC_API_KEY).
const DATA = require('./_contracts.json');

const GKEY = process.env.GEMINI_API_KEY;
const GMODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MODEL = process.env.ANTHROPIC_API_KEY ? (process.env.ASK_MODEL || 'claude-sonnet-5-5') : GMODEL;
const PER_IP = 20;            // questions per visitor per hour
const PER_DAY = 400;          // questions per server instance per day
const hits = new Map();
let day = { d: '', n: 0 };

function limited(ip) {
  const now = Date.now(), hour = 3600e3;
  const list = (hits.get(ip) || []).filter(t => now - t < hour);
  if (list.length >= PER_IP) return true;
  list.push(now); hits.set(ip, list);
  const d = new Date().toISOString().slice(0, 10);
  if (day.d !== d) day = { d, n: 0 };
  return ++day.n > PER_DAY;
}

function system(voice, context) {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  return `You are AskSirion, the assistant inside Sirion's "Contract health" feature. You are talking to Priya Sharma, procurement manager at ${DATA.company}. Today is ${today}.

What Contract health does: every morning it rereads each signed supplier contract, compares it with invoices (SAP S/4HANA), orders and supplier details (SAP Ariba), usage, and outside prices, then flags drift and drafts the fix. People approve everything; nothing is sent to a supplier automatically.

Contract data for this demo (suppliers, people and numbers are illustrative, not real companies):
${JSON.stringify(DATA)}
${context ? '\nExtra context from the screen the user is on:\n' + String(context).slice(0, 2500) + '\n' : ''}
How to answer:
- Plain English. Lead with the answer. Short sentences. No jargon.
- ${voice ? 'This answer will be spoken aloud: at most 60 words, no lists, no markdown, no links. Say amounts like "one point six eight crore rupees".' : 'At most 130 words. You may use **bold** for key numbers and a short list of up to 4 points.'}
- For questions about these contracts, use the data above and name the clause and page when it helps. Do not search the web for the illustrative suppliers.
- For anything about today's world (news, diesel or fuel prices, inflation, software or staffing price trends, Asian Paints news), use web search, then say what it means for these contracts. Name the source and date.
- Never make up a number. If you don't know, say so and say how to find out.
- You can draft notices and claims, but you never send anything. Offer the next step (for example, "Open the Zenvault page to send the notice").
- Amounts are in Indian rupees using lakh and crore.`;
}

function parse(content) {
  // Keep only the text written after the last search result, which is the answer itself.
  let lastTool = -1;
  content.forEach((b, i) => { if (b.type === 'web_search_tool_result') lastTool = i; });
  const blocks = content.slice(lastTool + 1).filter(b => b.type === 'text');
  const text = blocks.map(b => b.text).join('').trim();
  const sources = [];
  const seen = new Set();
  for (const b of blocks) for (const c of (b.citations || [])) {
    if (c.url && !seen.has(c.url)) { seen.add(c.url); sources.push({ title: c.title || c.url, url: c.url }); }
  }
  const searches = content.filter(b => b.type === 'server_tool_use' && b.name === 'web_search').map(b => b.input && b.input.query).filter(Boolean);
  return { text, sources: sources.slice(0, 5), searches };
}

async function askGemini(res, messages, body) {
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const payload = {
    systemInstruction: { parts: [{ text: system(!!body.voice, body.context) }] },
    contents, tools: [{ google_search: {} }],
    generationConfig: { maxOutputTokens: body.voice ? 400 : 900, temperature: 0.3 }
  };
  const call = p => fetch('https://generativelanguage.googleapis.com/v1beta/models/' + GMODEL + ':generateContent', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': GKEY }, body: JSON.stringify(p)
  });
  let r = await call(payload);
  let j = await r.json();
  if (!r.ok) {
    // Search grounding may be unavailable on the free tier: retry without it.
    const plain = Object.assign({}, payload); delete plain.tools;
    r = await call(plain); j = await r.json();
  }
  if (!r.ok) return res.status(502).json({ error: 'upstream', detail: j && j.error && j.error.message });
  const cand = (j.candidates || [])[0] || {};
  const text = ((cand.content && cand.content.parts) || []).map(p => p.text || '').join('').trim();
  const gm = cand.groundingMetadata || {};
  const seen = new Set(), sources = [];
  for (const c of (gm.groundingChunks || [])) if (c.web && c.web.uri && !seen.has(c.web.uri)) { seen.add(c.web.uri); sources.push({ title: c.web.title || c.web.uri, url: c.web.uri }); }
  res.status(200).json({ text: text || "I couldn't find a clear answer to that. Try asking about a contract, a supplier type, or today's prices.", sources: sources.slice(0, 5), searches: gm.webSearchQueries || [] });
}

module.exports = async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY || GKEY;
  if (req.method === 'GET') return res.status(200).json({ ready: !!key, model: MODEL });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  if (!key) return res.status(503).json({ error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
  body = body || {};
  const question = String(body.question || '').trim().slice(0, 500);
  if (!question) return res.status(400).json({ error: 'empty' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'rate_limited' });

  let history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  history = history.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  while (history.length && history[0].role !== 'user') history.shift();
  const messages = [];
  for (const m of history) { if (messages.length && messages[messages.length - 1].role === m.role) continue; messages.push(m); }
  if (messages.length && messages[messages.length - 1].role === 'user') messages.pop();
  messages.push({ role: 'user', content: question });

  if (!process.env.ANTHROPIC_API_KEY) {
    try { return await askGemini(res, messages, body); }
    catch (e) { return res.status(502).json({ error: 'failed', detail: String(e.message || e) }); }
  }
  const payload = {
    model: MODEL, max_tokens: body.voice ? 400 : 900, system: system(!!body.voice, body.context), messages,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3, user_location: { type: 'approximate', city: 'Mumbai', region: 'Maharashtra', country: 'IN', timezone: 'Asia/Kolkata' } }]
  };
  try {
    let content = [];
    for (let turn = 0; turn < 3; turn++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!r.ok) return res.status(502).json({ error: 'upstream', detail: j && j.error && j.error.message });
      content = content.concat(j.content || []);
      if (j.stop_reason !== 'pause_turn') break;
      payload.messages = messages.concat([{ role: 'assistant', content: j.content }]);
    }
    const out = parse(content);
    if (!out.text) out.text = "I couldn't find a clear answer to that. Try asking about a contract, a supplier type, or today's prices.";
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: 'failed', detail: String(e.message || e) });
  }
};
