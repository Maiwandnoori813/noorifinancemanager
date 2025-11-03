// Noori Finance - front-end only (local-first)
// Uses Chart.js for smooth line charts
const S = window.localStorage;
const el = id => document.getElementById(id);

// translations
const T = {
  en:{
    title:"Simulator",
    lblInitial:"Initial total (AFN)",
    lblSpend:"Monthly personal spending (AFN)",
    lblRate:"Monthly profit rate (%)",
    lblMonths:"Months",
    lblCurrent:"Current Investment",
    lblProfit:"Projected Monthly Profit",
    lblReinvest:"Reinvest (last month)",
    lblManual:"Manual transaction (add/take)",
    simulate:"Simulate",
    exportBtn:"Export CSV",
    chartTitle:"Investment Growth",
    aiSummaryPrefix:"Summary:"
  },
  ps:{
    title:"سمولیټر",
    lblInitial:"ابتدایی ټولټال (افغانی)",
    lblSpend:"میاشتنی شخصي لګښت (افغانی)",
    lblRate:"میاشتنی د ګټې فیصدي (%)",
    lblMonths:"میاشتې",
    lblCurrent:"اوسنۍ پانګه",
    lblProfit:"میاشتنۍ وړاندوینه ګټه",
    lblReinvest:"د وروستۍ میاشتې بیا پانګونه",
    lblManual:"لاسني معامله (وراضافه / واخلئ)",
    simulate:"محاسبه",
    exportBtn:"CSV صادرول",
    chartTitle:"د پانګې وده",
    aiSummaryPrefix:"لنډیز:"
  }
};

// default state
let state = {
  initialTotal: 600000,
  monthlySpend: 10000,
  profitRatePct: 17,
  months: 12,
  timeline: []
};

// load saved settings
function loadSettings(){
  try{
    const raw = S.getItem('noori_state');
    if(raw) { const st = JSON.parse(raw); Object.assign(state, st); }
  }catch(e){ console.warn(e); }
  // theme & lang
  const theme = S.getItem('noori_theme') || 'dark';
  document.body.setAttribute('data-theme', theme);
  el('themeSelect').value = theme;
  const lang = S.getItem('noori_lang') || 'en';
  document.body.setAttribute('data-lang', lang);
  el('langSelect').value = lang;
}

// save
function saveSettings(){ S.setItem('noori_state', JSON.stringify(state)); }

// UI translations
function applyLang(){
  const lang = document.body.getAttribute('data-lang') || 'en';
  const tr = T[lang];
  document.getElementById('title').innerText = tr.title;
  document.getElementById('lblInitial').innerText = tr.lblInitial;
  document.getElementById('lblSpend').innerText = tr.lblSpend;
  document.getElementById('lblRate').innerText = tr.lblRate;
  document.getElementById('lblMonths').innerText = tr.lblMonths;
  document.getElementById('lblCurrent').innerText = tr.lblCurrent;
  document.getElementById('lblProfit').innerText = tr.lblProfit;
  document.getElementById('lblReinvest').innerText = tr.lblReinvest;
  document.getElementById('lblManual').innerText = tr.lblManual;
  document.getElementById('simulate').innerText = tr.simulate;
  document.getElementById('exportBtn').innerText = tr.exportBtn;
  document.getElementById('chartTitle').innerText = tr.chartTitle;
  document.getElementById('aiSummary').innerText = '';
}

// format number
function fmt(n){ return Math.round(n).toLocaleString(); }

// simulation logic (compounding)
function runSimulation(){
  state.initialTotal = Number(el('initialTotal').value || 0);
  state.monthlySpend = Number(el('monthlySpend').value || 0);
  state.profitRatePct = Number(el('profitRate').value || 0);
  state.months = Number(el('months').value || 12);

  const monthlyRate = state.profitRatePct/100;
  let invest = state.initialTotal;
  const timeline = [];
  for(let m=1;m<=state.months;m++){
    const profit = invest * monthlyRate;
    const reinvest = Math.max(0, profit - state.monthlySpend);
    const close = invest + reinvest;
    timeline.push({month:m, open:invest, profit, reinvest, close});
    invest = close;
  }
  state.timeline = timeline;
  saveSettings();
  renderSummary();
  drawChart();
  renderTimeline();
  aiSummary();
}

// render summary
function renderSummary(){
  const last = state.timeline[state.timeline.length-1];
  if(!last){ el('currentInvestment').innerText = '— AFN'; el('currentProfit').innerText='— AFN'; el('reinvestAmount').innerText='— AFN'; return; }
  el('currentInvestment').innerText = fmt(last.close) + ' AFN';
  el('currentProfit').innerText = fmt(last.profit) + ' AFN';
  el('reinvestAmount').innerText = fmt(last.reinvest) + ' AFN';
}

// timeline list
function renderTimeline(){
  const container = el('timelineList'); container.innerHTML = '';
  state.timeline.forEach(t=>{
    const div = document.createElement('div'); div.className='row';
    div.innerHTML = `<div>Month ${t.month}</div><div>${fmt(Math.round(t.open))} → ${fmt(Math.round(t.close))}</div>`;
    container.appendChild(div);
  });
}

// chart
let chart = null;
function drawChart(){
  const ctx = el('lineChart').getContext('2d');
  const labels = state.timeline.map(t=>'M'+t.month);
  const invest = state.timeline.map(t=>Math.round(t.open));
  const profit = state.timeline.map(t=>Math.round(t.profit));

  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type:'line',
    data: {
      labels,
      datasets:[
        { label:'Investment', data:invest, tension:0.36, borderWidth:3, borderColor:'#7ce7d9', pointRadius:3, fill:true, backgroundColor:'rgba(124,231,217,0.06)'},
        { label:'Profit', data:profit, tension:0.36, borderWidth:2, borderColor:'#7a7cff', pointRadius:2, fill:false }
      ]
    },
    options:{
      responsive:true,
      plugins:{legend:{labels:{color:'#cfefff'}}},
      scales:{ x:{ ticks:{color:'#98a0b3'} }, y:{ ticks:{color:'#98a0b3'} } }
    }
  });
}

// AI-style tiny summary
function aiSummary(){
  const tr = T[document.body.getAttribute('data-lang') || 'en'];
  if(!state.timeline.length) return;
  const first = state.timeline[0].open;
  const last = state.timeline[state.timeline.length-1].close;
  const growthPct = ((last-first)/first)*100;
  el('aiSummary').innerText = `${tr.aiSummaryPrefix} ${Math.round(growthPct)}% growth after ${state.months} months — final monthly profit ${fmt(Math.round(state.timeline[state.timeline.length-1].profit))} AFN.`;
}

// manual tx apply
function applyManual(){
  const m = Number(el('txMonth').value);
  const amt = Number(el('txAmount').value);
  if(!m || m<1 || m>state.months) return alert('Invalid month');
  // add to open for month m and recompute forward
  state.timeline[m-1].open += amt;
  let invest = state.timeline[m-1].open;
  for(let i=m-1;i<state.months;i++){
    const profit = invest * (state.profitRatePct/100);
    const reinvest = Math.max(0, profit - state.monthlySpend);
    const close = invest + reinvest;
    state.timeline[i] = { month: i+1, open: invest, profit, reinvest, close };
    invest = close;
  }
  saveSettings();
  renderSummary(); drawChart(); renderTimeline(); aiSummary();
}

// CSV export
function exportCSV(){
  if(!state.timeline.length) return alert('Simulate first');
  let csv = 'month,open,profit,reinvest,close\n';
  state.timeline.forEach(t=> csv += [t.month, Math.round(t.open), Math.round(t.profit), Math.round(t.reinvest), Math.round(t.close)].join(',') + '\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'noori_simulation.csv'; a.click(); URL.revokeObjectURL(url);
}

// theme & lang handlers
function applyTheme(t){ document.body.setAttribute('data-theme', t); S.setItem('noori_theme', t); }
function applyLanguage(l){ document.body.setAttribute('data-lang', l); S.setItem('noori_lang', l); applyLang(); }

// init UI events
window.addEventListener('load', ()=>{
  loadSettings();
  applyLang();
  el('themeSelect').value = document.body.getAttribute('data-theme');
  el('langSelect').value = document.body.getAttribute('data-lang');
  el('simulate').addEventListener('click', runSimulation);
  el('sim18').addEventListener('click', ()=>{ el('months').value = 18; runSimulation(); });
  el('sim24').addEventListener('click', ()=>{ el('months').value = 24; runSimulation(); });
  el('addTx').addEventListener('click', applyManual);
  el('exportBtn').addEventListener('click', exportCSV);
  el('themeSelect').addEventListener('change', e=> applyTheme(e.target.value));
  el('langSelect').addEventListener('change', e=> applyLanguage(e.target.value));
  // pre-fill inputs from state if present
  el('initialTotal').value = state.initialTotal;
  el('monthlySpend').value = state.monthlySpend;
  el('profitRate').value = state.profitRatePct;
  el('months').value = state.months;
  runSimulation();
});
