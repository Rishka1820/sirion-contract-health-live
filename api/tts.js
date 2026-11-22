// Turns an answer into speech with ElevenLabs. Needs ELEVENLABS_API_KEY (and optionally ELEVENLABS_VOICE_ID) in Vercel.
module.exports = async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (req.method === 'GET') return res.status(200).json({ ready: !!key });
  if (!key) return res.status(503).json({ error: 'not configured' });
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const text = String(body.text || '').slice(0, 900);
  if (!text) return res.status(400).json({ error: 'no text' });
  const voice = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voice + '?output_format=mp3_44100_64', {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5' }),
      signal: AbortSignal.timeout(15000)
    });
    if (!r.ok) return res.status(502).json({ error: 'upstream ' + r.status });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) { return res.status(502).json({ error: 'failed' }); }
};
