# Contract health: a Sirion case prototype

A working prototype of **Contract health**, a new feature for Sirion's intelligent repository. Every morning it rereads each signed supplier contract, compares it with invoices, usage and live market prices, and tells the right person what to fix before the deadline passes.

Shown for Asian Paints, a Sirion customer. Suppliers, people and money figures are illustrative. News, diesel prices and inflation are live.

## What's live
- **Market watch**: this week's news for each supplier type and Asian Paints, from Google News (India edition).
- **Diesel and inflation**: today's Mumbai diesel price from fuel-price headlines, and India inflation from the World Bank and recent headlines.
- **AskSirion**: answers from the Claude API with web search, with sources. Voice input uses the browser's speech recognition.

## Run it
Static front end (`index.html`, `app.js`, `data.js`, `styles.css`) plus three serverless functions in `api/` for Vercel.

Set one environment variable in Vercel: `ANTHROPIC_API_KEY`. Without it, AskSirion falls back to pre-written answers and everything else still works.

Optional: `ASK_MODEL` (default `claude-sonnet-5-5`).

Built by Rishika Srivastava for the Sirion case assessment.
