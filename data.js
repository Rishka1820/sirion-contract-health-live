/* Contract health: illustrative data and a mock layer shaped like the Sirion API.
   Every number here is made up for a case study. Asian Paints is a real Sirion customer, used here as the example; suppliers and people are fictional. */

const TODAY = new Date(2026, 10, 22); // 22 Nov 2026

const MONEY = (v) => {
  const a = Math.abs(v);
  if (a >= 1e7) return '₹' + (v / 1e7).toFixed(a >= 1e8 ? 1 : 2).replace(/\.?0+$/, '') + ' Cr';
  if (a >= 1e5) return '₹' + (+(v / 1e5).toFixed(1)) + ' L';
  return '₹' + Math.round(v).toLocaleString('en-IN');
};

const PORTFOLIO = {
  company: 'Asian Paints',
  contracts: 2500,
  suppliers: 2500,
  flagged: 69,
  pricedHigh: 52,   // terms above market or above what the contract allows going forward
  billedWrong: 17,  // invoices that break the contract's own terms
  atStakeYear: 6.8e7,
  extraThisMonth: 5.7e6,
  extraLastMonth: 5.3e6,
  confirmedSavings: 2.4e7,
  foundSoFar: 9.2e7,
  securedSoFar: 4.1e7,   // approved or agreed in writing, includes what is already confirmed
  securedByMonth: [0.12, 0.25, 0.42, 0.7, 0.98, 1.28, 1.65, 2.1, 2.7, 3.5, 4.1].map(v => v * 1e7),
  // Paid above market or contract terms, by month, Jan 2024 to Nov 2026 (in rupees)
  monthly: (() => {
    const out = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let m = 0; m <= 34; m++) {
      const base = 5.7e6 * Math.pow(m / 34, 0.95);
      const noise = (m > 0 && m < 34) ? (rnd() - 0.5) * 3e5 : 0;
      out.push(Math.max(6e4, Math.round(base + noise)));
    }
    return out;
  })(),
  confirmedByMonth: [0.08, 0.16, 0.27, 0.45, 0.62, 0.8, 1.02, 1.3, 1.62, 2.01, 2.4].map(v => v * 1e7), // Jan..Nov 2026, running total
  categories: [
    { name: 'Software', value: 2.6e7, note: 'Auto-renewals with price rises and unused seats' },
    { name: 'Staffing agencies', value: 1.3e7, note: 'Billed above the agreed rate card' },
    { name: 'Logistics', value: 1.0e7, note: 'Fuel charges that did not follow diesel' },
    { name: 'Facilities', value: 0.8e7, note: 'Yearly rises above the contract cap' },
    { name: 'Consultants', value: 0.6e7, note: 'Day rates and travel above the agreed limits' },
    { name: 'Marketing agencies', value: 0.5e7, note: 'Missed deliverables without service credits' }
  ]
};

const PEOPLE = {
  procurement: { key: 'procurement', name: 'Priya Sharma', role: 'Procurement manager', initials: 'PS', color: '#5D939A',
    wants: 'Fair prices and fewer surprises across 2,500 suppliers.',
    worries: 'Too many alerts, and no time to read contracts again.' },
  owner: { key: 'owner', name: 'Arjun Mehta', role: 'Head of IT (business owner)', initials: 'AM', color: '#7A6BB5',
    wants: 'The tools his team relies on keep working.',
    worries: 'A cheaper deal that cuts seats people need or upsets a key vendor.' },
  legal: { key: 'legal', name: 'Meera Iyer', role: 'Legal counsel', initials: 'MI', color: '#B5774A',
    wants: 'Notices that use the contract\'s exact terms and timing.',
    worries: 'A badly worded or late notice that weakens the company\'s position.' },
  finance: { key: 'finance', name: 'Rahul Verma', role: 'Finance controller', initials: 'RV', color: '#3F8F6A',
    wants: 'Savings that show up in the books, not just on a slide.',
    worries: 'Counting money before a credit note or new price is real.' },
  supplier: { key: 'supplier', name: 'Neha Kapoor', role: 'Account manager, Zenvault', initials: 'NK', color: '#9C4A6B',
    wants: 'Keep the account and its value.',
    worries: 'Losing seats and margin at renewal.' }
};

const CONTRACTS = [
  {
    id: 'zenvault', supplier: 'Zenvault', item: 'IT service desk software, 2,000 seats', category: 'Software', ref: 'ZV-2024-031',
    owner: 'owner', mark: 'high', markLabel: 'Priced too high',
    problem: 'Renews by itself on 1 Jan at 7% more. Only 1,240 of 2,000 seats are used.',
    short: 'Renews at +7% with 38% of seats unused',
    due: { date: '2 Dec 2026', days: 10, label: 'Notice deadline' },
    gapPct: 38, gapLabel: '38% of seats unused',
    save: { amount: 1.68e7, label: 'a year' },
    lede: 'This contract renews by itself on 1 Jan 2027 for ₹4.49 Cr, 7% more than today. Your team uses 1,240 of the 2,000 seats you pay for.',
    chart: { kind: 'line', unit: 'seats', title: 'Seats you pay for vs seats people use',
      x: ['Jan 26','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov'],
      a: { name: 'Seats you pay for', data: [2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000] },
      b: { name: 'Seats used', data: [1310,1295,1288,1270,1262,1255,1251,1248,1246,1242,1240] } },
    clauses: [
      { ref: 'Clause 3.1, Fees, page 4', text: 'Customer shall pay ₹21,000 per named user per year for 2,000 named users.' },
      { ref: 'Clause 12.2, Renewal, page 11', text: 'This Agreement renews automatically for successive one-year terms. <mark>Fees for each renewal term increase by seven per cent (7%).</mark>' },
      { ref: 'Clause 12.3, Notice, page 11', text: '<mark>Either party may change the number of users or terminate by written notice at least thirty (30) days before the renewal date.</mark>' }
    ],
    missing: 'No clause caps the yearly rise. Typical software price rises run lower, and the seat count has never been checked since signing.',
    facts: [
      { t: 'Only 1,240 of 2,000 seats were used in the last 90 days.', s: 'Usage report from Zenvault admin console, via IT', ext: true },
      { t: 'Asking for 1,300 seats leaves room for 5% growth.', s: 'Headcount plan, shared by Arjun (IT)', ext: true },
      { t: 'Similar tools renewed with a 3% rise in your last two renewals.', s: 'Past renewals in Sirion' }
    ],
    work: 'Today: 2,000 seats × ₹21,000 × 1.07 = ₹4.49 Cr. Part 1, your right under clause 12.3: 1,300 seats at the same 7% rise = ₹2.92 Cr, so ₹1.57 Cr less. Part 2, needs Zenvault to agree: a 3% rise instead of 7% saves another ₹10.9 L. Together: ₹1.68 Cr a year.',
    action: { verb: 'Cut unused seats before renewal', button: 'Cut unused seats', multi: true },
    flow: 'zenvault'
  },
  {
    id: 'prime', supplier: 'Prime Staffing Services', item: 'Temporary staff for regional distribution centres', category: 'Staffing agencies', ref: 'PS-2025-114',
    owner: 'owner', mark: 'billed', markLabel: 'Billed wrong',
    problem: 'Billing ₹612 an hour since July. The agreed rate card says ₹560.',
    short: 'Billing 9% above the agreed rate card',
    due: { date: '1 Dec 2026', days: 9, label: 'Before the December invoice is paid' },
    gapPct: 9.3, gapLabel: '+9.3% above rate card',
    save: { amount: 1.82e6, label: 'back now' },
    lede: 'Since July, Prime Staffing has billed ₹612 an hour for distribution-centre staff. The rate card you agreed says ₹560. That is ₹18.2 L overcharged so far.',
    chart: { kind: 'line', unit: '₹ an hour', title: 'Hourly rate billed vs the agreed rate card',
      x: ['Jan 26','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov'],
      a: { name: 'Rate billed', data: [560,560,560,560,560,560,612,612,612,612,612] },
      b: { name: 'Agreed rate card', data: [560,560,560,560,560,560,560,560,560,560,560] } },
    clauses: [
      { ref: 'Schedule B, Rate card, page 14', text: '<mark>Warehouse associate (day shift): ₹560 per hour, fixed until 31 March 2027.</mark>' },
      { ref: 'Clause 8.4, Invoice disputes, page 7', text: 'Customer may recover any amount invoiced above the agreed rates within twelve (12) months of the invoice date.' }
    ],
    missing: 'Nothing in the contract allows a mid-year rise. The higher rate was never approved.',
    facts: [
      { t: 'About 7,000 hours a month are billed at ₹612.', s: 'Invoices in SAP S/4HANA, July to November' },
      { t: 'No change order or approval for a new rate exists.', s: 'Contract history in Sirion' }
    ],
    work: '₹52 an hour × about 7,000 hours a month × 5 months = ₹18.2 L.',
    action: { verb: 'Claim the overcharge and fix the rate', button: 'Get money back' }
  },
  {
    id: 'western', supplier: 'Western Roadways', item: 'Road freight, Khandala plant to western depots', category: 'Logistics', ref: 'WR-2026-007',
    owner: 'owner', mark: 'billed', markLabel: 'Billed wrong',
    problem: 'Diesel got cheaper, but the fuel charge on your bill didn\'t. The contract says it should.',
    short: 'Fuel charge did not follow diesel down',
    due: { date: '5 Dec 2026', days: 13, label: 'Before the next invoice' },
    gapPct: 2.4, gapLabel: '+2.4% above contract rate',
    save: { amount: 1.08e6, label: 'back now' },
    lede: 'Diesel got cheaper, so your freight rate should have dropped 2.4%. It didn\'t. You have been overcharged ₹10.8 L since May.',
    chart: { kind: 'line', unit: '₹ lakh a month', title: 'Monthly freight bill vs what the contract says you owe',
      x: ['Jan 26','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov'],
      a: { name: 'What you were billed', data: [75,75,75,75,75,75,75,75,75,75,75] },
      b: { name: 'What you should pay', data: [75,75,75,75,74.4,73.8,73.2,73.2,73.2,73.2,73.2] } },
    clauses: [
      { ref: 'Clause 7.2, Fuel adjustment, page 4', text: 'The freight rate shall be revised monthly. <mark>For every ₹1 per litre change in the retail diesel price in Mumbai, the rate shall change by 0.4%.</mark>' },
      { ref: 'Clause 9.1, Claims, page 6', text: 'Either party may claim any amount wrongly invoiced within twelve (12) months of the invoice date.' }
    ],
    missing: 'The contract already does the right thing. Nobody applied it.',
    facts: [
      { t: 'Diesel in Mumbai was ₹6 a litre cheaper than in April at the last check.', s: 'Fuel price feed (illustrative figure; live price shown above)', ext: true },
      { t: 'Every invoice since May uses the April rate.', s: 'Freight invoices in SAP S/4HANA, matched in Sirion' }
    ],
    work: '₹6 × 0.4% = 2.4% lower. May to Nov: ₹0.6 L + ₹1.2 L + 5 × ₹1.8 L = ₹10.8 L.',
    action: { verb: 'Claim the overcharge and fix the rate', button: 'Get money back' }
  },
  {
    id: 'cleancore', supplier: 'CleanCore Facility Services', item: 'Housekeeping for 4 plants and the Mumbai head office', category: 'Facilities', ref: 'CC-2023-208',
    owner: 'owner', mark: 'billed', markLabel: 'Billed wrong',
    problem: 'Raised prices 6% in October. The contract caps rises at the inflation index, 3.4% this year.',
    short: 'Yearly rise above the contract cap',
    due: { date: '15 Dec 2026', days: 23, label: 'Before the rise is locked in' },
    gapPct: 2.6, gapLabel: '+2.6% above the cap',
    save: { amount: 9.4e5, label: 'a year' },
    lede: 'CleanCore raised prices by 6% in October. Your contract caps yearly rises at the inflation index, which is 3.4% this year.',
    chart: { kind: 'bar', unit: '% yearly rise', title: 'Yearly price rise applied vs the cap in the contract',
      x: ['2024', '2025', '2026'],
      a: { name: 'Rise applied', data: [4.1, 4.8, 6.0] },
      b: { name: 'Cap in contract', data: [4.1, 4.8, 3.4] } },
    clauses: [
      { ref: 'Clause 5.3, Price review, page 5', text: 'Prices may be revised once a year in October. <mark>Any increase shall not exceed the change in the consumer price index for the previous twelve months.</mark>' }
    ],
    missing: 'Earlier years were within the cap. This year the rise was applied without checking the index.',
    facts: [
      { t: 'The index named in the contract rose 3.4% in the last twelve months.', s: 'Inflation index feed', ext: true },
      { t: 'Contract value is about ₹3.6 Cr a year.', s: 'Purchase orders in SAP Ariba' }
    ],
    work: '(6% − 3.4%) × ₹3.6 Cr = ₹9.4 L a year. ₹1.6 L already overpaid for October and November.',
    action: { verb: 'Hold the rise to the cap', button: 'Correct the price' }
  },
  {
    id: 'northbridge', supplier: 'Northbridge Advisory', item: 'Plant efficiency project', category: 'Consultants', ref: 'NA-2026-019',
    owner: 'owner', mark: 'billed', markLabel: 'Billed wrong',
    problem: 'Senior consultants billed at ₹1.9 L a day. The agreed rate is ₹1.6 L. Travel is also above the 10% cap.',
    short: 'Day rates and travel above agreed limits',
    due: { date: '31 Dec 2026', days: 39, label: 'Before the project closes' },
    gapPct: 18.8, gapLabel: '+18.8% above agreed rate',
    save: { amount: 1.4e6, label: 'back now' },
    lede: 'Northbridge billed 40 senior consultant days at ₹1.9 L instead of the agreed ₹1.6 L, and travel went over the 10% cap. That is ₹14 L to claim back.',
    chart: { kind: 'bar', unit: '₹ lakh a day', title: 'Day rate billed vs the agreed rate, by invoice',
      x: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
      a: { name: 'Day rate billed', data: [1.6, 1.9, 1.9, 1.9, 1.9] },
      b: { name: 'Agreed day rate', data: [1.6, 1.6, 1.6, 1.6, 1.6] } },
    clauses: [
      { ref: 'Statement of work, Fees, page 3', text: '<mark>Senior consultant: ₹1,60,000 per day.</mark> Travel and expenses are reimbursed at cost, <mark>up to 10% of fees.</mark>' }
    ],
    missing: 'The higher rate matches a newer price list the firm sent by email. It was never signed.',
    facts: [
      { t: '40 senior days billed at ₹1.9 L since August.', s: 'Invoices in SAP S/4HANA' },
      { t: 'Travel came to 14% of fees.', s: 'Expense lines on invoices' }
    ],
    work: '40 days × ₹0.3 L = ₹12 L, plus ₹2 L of travel above the cap = ₹14 L.',
    action: { verb: 'Claim the overcharge', button: 'Get money back' }
  },
  {
    id: 'brightline', supplier: 'Brightline Media', item: 'Digital marketing retainer, décor and home brands', category: 'Marketing agencies', ref: 'BM-2025-077',
    owner: 'owner', mark: 'sla', markLabel: 'Missed service level',
    problem: 'Missed the agreed four campaigns a month three times this year. Service credits were never claimed.',
    short: 'Missed deliverables, no service credits claimed',
    due: { date: '18 Dec 2026', days: 26, label: 'Credits must be claimed this quarter' },
    gapPct: 0, gapLabel: '3 of 6 months missed',
    save: { amount: 7.5e5, label: 'back now' },
    lede: 'Brightline promised four campaigns a month. They delivered fewer in June, August and October. The contract gives you 10% of that month\'s fee back each time.',
    chart: { kind: 'bar', unit: 'campaigns', title: 'Campaigns delivered each month vs what was promised',
      x: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
      a: { name: 'Delivered', data: [2, 4, 3, 4, 2, 4] },
      b: { name: 'Promised', data: [4, 4, 4, 4, 4, 4] } },
    clauses: [
      { ref: 'Schedule A, Service levels, page 9', text: 'Agency will deliver four (4) campaigns per month. <mark>For any month below this level, the Agency will credit 10% of that month\'s retainer.</mark>' }
    ],
    missing: 'Nobody tracks deliveries against the contract, so credits go unclaimed.',
    facts: [
      { t: 'Retainer is ₹25 L a month.', s: 'Invoices in SAP S/4HANA' },
      { t: 'Delivery counts come from the agency\'s own monthly reports.', s: 'Monthly reports attached in Sirion' }
    ],
    work: '3 months × 10% × ₹25 L = ₹7.5 L in credits.',
    action: { verb: 'Claim service credits', button: 'Claim credits' }
  }
];

const HEALTHY = [
  { supplier: 'Coastline Carriers', category: 'Logistics', note: 'Within 1% of contract and market' },
  { supplier: 'Infocrest Cloud', category: 'Software', note: 'Seats used: 96%' },
  { supplier: 'SecureGuard Services', category: 'Facilities', note: 'Rise within cap' },
  { supplier: 'TalentBridge', category: 'Staffing agencies', note: 'Rates match the card' }
];

/* The one contract we walk through every stakeholder. */
const FLOW_STEPS = [
  { who: 'procurement', title: 'Priya reviews the flag and drafts a change', done: 'Change drafted and saved' },
  { who: 'owner', title: 'Arjun confirms how many seats IT needs', done: 'Arjun confirmed the seat count' },
  { who: 'legal', title: 'Meera checks the notice wording and timing', done: 'Meera approved the notice' },
  { who: 'supplier', title: 'Zenvault replies to the notice', done: 'Zenvault replied, or the deadline passed' },
  { who: 'procurement', title: 'Priya settles the price rise', done: 'Priya settled the rise' },
  { who: 'finance', title: 'Rahul records the saving as secured', done: 'Rahul recorded the saving as secured' }
];

/* A tiny layer shaped like a REST API, so the screens never touch data directly.
   Request names are illustrative; Sirion shares its real API reference with customers. */
const SirionAPI = (() => {
  const log = [];
  const listeners = [];
  const stamp = () => {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
  };
  const record = (method, path, result) => {
    log.unshift({ time: stamp(), method, path, result });
    if (log.length > 40) log.pop();
    listeners.forEach(fn => { try { fn(log); } catch (e) {} });
  };
  // seed with this morning's run
  [
    ['09:01:12', 'POST', '/tasks', 'Task for Priya: Zenvault renewal'],
    ['09:01:10', 'POST', '/contracts/ZV-2024-031/flags', 'Priced too high'],
    ['09:00:44', 'GET', '/suppliers?source=sap-ariba', '2,500 service suppliers, synced from SAP Ariba'],
    ['09:00:41', 'GET', '/invoices?source=sap-s4hana&since=2026-10-01', '18,432 invoices from SAP S/4HANA'],
    ['09:00:05', 'GET', '/contracts/{id}/fields', 'Prices, renewals, notice periods, caps'],
    ['09:00:02', 'GET', '/contracts?status=active', '2,500 contracts']
  ].forEach(([time, method, path, result]) => log.push({ time, method, path, result }));

  return {
    log, onLog: (fn) => listeners.push(fn),
    getContract(id) { const c = CONTRACTS.find(x => x.id === id); record('GET', '/contracts/' + (c ? c.ref : id), c ? c.supplier : 'Not found'); return c; },
    listFlags(filter) { record('GET', '/flags?status=open' + (filter ? '&type=' + filter : ''), CONTRACTS.length + ' shown of 69'); return CONTRACTS; },
    createTask(c, who, what) { record('POST', '/tasks', what + ' for ' + PEOPLE[who].name.split(' ')[0]); },
    approve(c, who) { record('POST', '/workflows/' + c.ref + '/approve', 'Approved by ' + PEOPLE[who].name.split(' ')[0]); },
    sendNotice(c) { record('POST', '/contracts/' + c.ref + '/notices', 'Sent to ' + c.supplier); },
    supplierReply(c, text) { record('POST', '/portal/' + c.ref + '/replies', text); },
    confirmSaving(c, amount, stage) { record('POST', '/savings', MONEY(amount) + (stage === 'secured' ? ' recorded as secured' : ' confirmed in the books')); },
    ask(q) { record('POST', '/asksirion/query', '"' + q.slice(0, 38) + (q.length > 38 ? '…' : '') + '"'); },
    live(method, path, result) { record(method, path, result); }
  };
})();
