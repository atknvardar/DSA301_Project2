// ══════════════════════════════════════════════════════════════════
//  DSA301 Project 2 — Part 2C: Daily Recovery Hub
//  D3.js interactive mobile dashboard using Whoop Health Dataset
// ══════════════════════════════════════════════════════════════════

import * as d3 from 'd3';

// ──────────────────────────────────────────────────────────────────
//  1. LOAD & PARSE CSV
// ──────────────────────────────────────────────────────────────────

const raw = await d3.csv('/src/dataset.csv', d => ({
  user_id:             d.user_id,
  date:                d.date,
  day_of_week:         d.day_of_week,
  age:                +d.age,
  gender:              d.gender,
  fitness_level:       d.fitness_level,
  primary_sport:       d.primary_sport,
  recovery_score:     +d.recovery_score,
  day_strain:         +d.day_strain,
  sleep_hours:        +d.sleep_hours,
  sleep_efficiency:   +d.sleep_efficiency,
  light_sleep_hours:  +d.light_sleep_hours,
  rem_sleep_hours:    +d.rem_sleep_hours,
  deep_sleep_hours:   +d.deep_sleep_hours,
  wake_ups:           +d.wake_ups,
  hrv:                +d.hrv,
  resting_heart_rate: +d.resting_heart_rate,
  hrv_baseline:       +d.hrv_baseline,
  rhr_baseline:       +d.rhr_baseline,
  respiratory_rate:   +d.respiratory_rate,
  skin_temp_deviation:+d.skin_temp_deviation,
  calories_burned:    +d.calories_burned,
  workout_completed:  +d.workout_completed,
  activity_type:       d.activity_type,
  activity_strain:    +d.activity_strain,
}));

// Group by user, sort each user's records by date
const byUser = d3.group(raw, d => d.user_id);
const userIds = Array.from(byUser.keys()).sort();

for (const [uid, records] of byUser) {
  records.sort((a, b) => a.date.localeCompare(b.date));
}

// ──────────────────────────────────────────────────────────────────
//  2. BUILD DOM SKELETON
// ──────────────────────────────────────────────────────────────────

const app = document.getElementById('app');
document.getElementById('loading').remove();

app.innerHTML = `
  <header class="reveal reveal-d1">
    <h1>Today's Recovery</h1>
    <p class="date" id="dateLabel"></p>
  </header>

  <div class="selectors reveal reveal-d1">
    <select id="userSelect"></select>
    <input type="date" id="dateSelect">
  </div>

  <main>
    <section class="gauge-section reveal reveal-d2">
      <div class="gauge-glow" id="gaugeGlow"></div>
      <svg id="gauge" width="200" height="200" viewBox="-100 -100 200 200"></svg>
      <span class="badge green" id="badge">In the green</span>
    </section>

    <section class="reveal reveal-d3">
      <div class="section-label">Physiological readiness</div>
      <div class="metrics-row" id="metricsRow"></div>
    </section>

    <section class="reveal reveal-d4">
      <div class="section-label">7-day recovery trend</div>
      <div class="trend-card">
        <svg id="trendChart"></svg>
        <div class="trend-tooltip" id="tooltip"></div>
      </div>
    </section>

    <section class="reveal reveal-d5">
      <div class="section-label">Today's strain</div>
      <div class="strain-card">
        <div class="strain-bar-wrap">
          <div class="strain-fill" id="strainFill"></div>
        </div>
        <span class="strain-value" id="strainValue"></span>
      </div>
    </section>

    <section class="reveal reveal-d6">
      <div class="section-label">Sleep breakdown</div>
      <div class="sleep-card">
        <div class="sleep-summary">
          <span class="total" id="sleepTotal"></span>
          <span class="efficiency" id="sleepEff"></span>
        </div>
        <div class="sleep-bar-container" id="sleepBar"></div>
        <div class="sleep-legend">
          <span><span class="dot" style="background:#7B68EE"></span>Deep</span>
          <span><span class="dot" style="background:#9370DB"></span>REM</span>
          <span><span class="dot" style="background:#B39DDB"></span>Light</span>
        </div>
      </div>
    </section>

    <section class="recommendation reveal reveal-d7" id="recommendation">
      <svg class="rec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <p id="recText"></p>
    </section>
  </main>
`;

// ──────────────────────────────────────────────────────────────────
//  3. POPULATE SELECTORS
// ──────────────────────────────────────────────────────────────────

const userSelect = document.getElementById('userSelect');
const dateSelect = document.getElementById('dateSelect');

userIds.forEach(uid => {
  const opt = document.createElement('option');
  opt.value = uid;
  opt.textContent = uid.replace('USER_', 'User ');
  userSelect.appendChild(opt);
});

function populateDates(uid) {
  const records = byUser.get(uid);
  const dates = records.map(r => r.date);
  dateSelect.min = dates[0];
  dateSelect.max = dates[dates.length - 1];
  dateSelect.value = dates[dates.length - 1];
}

populateDates(userIds[0]);

// ──────────────────────────────────────────────────────────────────
//  4. RECOVERY GAUGE (D3.js arc generator)
// ──────────────────────────────────────────────────────────────────

const gaugeSvg = d3.select('#gauge');
const maxScore = 100;

// Tick marks
const tickCount = 60;
for (let i = 0; i < tickCount; i++) {
  const angle = (i / tickCount) * 360 - 90;
  const isMajor = i % 5 === 0;
  const r1 = isMajor ? 85 : 87;
  const r2 = 90;
  const rad = angle * Math.PI / 180;
  gaugeSvg.append('line')
    .attr('x1', Math.cos(rad) * r1).attr('y1', Math.sin(rad) * r1)
    .attr('x2', Math.cos(rad) * r2).attr('y2', Math.sin(rad) * r2)
    .attr('stroke', isMajor ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)')
    .attr('stroke-width', isMajor ? 1.5 : 0.8)
    .attr('stroke-linecap', 'round');
}

const arcGen = d3.arc().innerRadius(70).outerRadius(82).cornerRadius(6);

// Background ring
gaugeSvg.append('path')
  .attr('d', arcGen({ startAngle: 0, endAngle: 2 * Math.PI }))
  .attr('fill', 'rgba(255,255,255,0.04)');

// Gradient + glow defs
const defs = gaugeSvg.append('defs');

const greenGrad = defs.append('linearGradient')
  .attr('id', 'arcGradGreen').attr('gradientUnits', 'userSpaceOnUse')
  .attr('x1', -80).attr('y1', 0).attr('x2', 80).attr('y2', 0);
greenGrad.append('stop').attr('offset', '0%').attr('stop-color', '#00A86B');
greenGrad.append('stop').attr('offset', '100%').attr('stop-color', '#00D68F');

const amberGrad = defs.append('linearGradient')
  .attr('id', 'arcGradAmber').attr('gradientUnits', 'userSpaceOnUse')
  .attr('x1', -80).attr('y1', 0).attr('x2', 80).attr('y2', 0);
amberGrad.append('stop').attr('offset', '0%').attr('stop-color', '#CC8A00');
amberGrad.append('stop').attr('offset', '100%').attr('stop-color', '#FFB84D');

const redGrad = defs.append('linearGradient')
  .attr('id', 'arcGradRed').attr('gradientUnits', 'userSpaceOnUse')
  .attr('x1', -80).attr('y1', 0).attr('x2', 80).attr('y2', 0);
redGrad.append('stop').attr('offset', '0%').attr('stop-color', '#CC4444');
redGrad.append('stop').attr('offset', '100%').attr('stop-color', '#FF6B6B');

const filter = defs.append('filter').attr('id', 'arcGlow');
filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

// Foreground arc
const fgArc = gaugeSvg.append('path')
  .attr('fill', 'url(#arcGradGreen)')
  .attr('filter', 'url(#arcGlow)')
  .attr('d', arcGen({ startAngle: 0, endAngle: 0.001 }));

// Score text
const scoreText = gaugeSvg.append('text')
  .attr('text-anchor', 'middle').attr('dy', '0.05em')
  .attr('fill', '#F0EDE5').attr('font-size', 48).attr('font-weight', 700)
  .attr('font-family', 'Outfit, sans-serif').attr('letter-spacing', '-0.03em')
  .text('0');

gaugeSvg.append('text')
  .attr('text-anchor', 'middle').attr('dy', '2.8em')
  .attr('fill', '#4A4845').attr('font-size', 11)
  .attr('font-family', 'Outfit, sans-serif').attr('font-weight', 400)
  .attr('letter-spacing', '0.06em')
  .text('OUT OF 100');

// ──────────────────────────────────────────────────────────────────
//  5. TREND CHART SETUP
// ──────────────────────────────────────────────────────────────────

const margin = { top: 16, right: 18, bottom: 30, left: 18 };
const chartW = 360;
const chartH = 130;

const trendSvg = d3.select('#trendChart')
  .attr('viewBox', `0 0 ${chartW} ${chartH}`)
  .attr('preserveAspectRatio', 'xMidYMid meet');

const trendDefs = trendSvg.append('defs');
const areaGrad = trendDefs.append('linearGradient')
  .attr('id', 'areaGrad').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
areaGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(0,214,143,0.20)');
areaGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,214,143,0.0)');

// Persistent groups for layered rendering
const trendGuideGroup = trendSvg.append('g');
const trendAreaGroup  = trendSvg.append('g');
const trendLineGroup  = trendSvg.append('g');
const trendDotGroup   = trendSvg.append('g');
const trendHitGroup   = trendSvg.append('g');
const trendLabelGroup = trendSvg.append('g');

const tooltip = document.getElementById('tooltip');

// ──────────────────────────────────────────────────────────────────
//  6. UPDATE FUNCTION — re-renders everything for selected user/date
// ──────────────────────────────────────────────────────────────────

function getRecoveryColor(score) {
  if (score >= 67) return 'green';
  if (score >= 34) return 'amber';
  return 'red';
}

function getGradientId(color) {
  return color === 'green' ? 'url(#arcGradGreen)'
       : color === 'amber' ? 'url(#arcGradAmber)'
       : 'url(#arcGradRed)';
}

function update() {
  const uid = userSelect.value;
  const dateStr = dateSelect.value;
  const records = byUser.get(uid);
  if (!records) return;

  // Find selected day's record
  const idx = records.findIndex(r => r.date === dateStr);
  const row = idx >= 0 ? records[idx] : records[records.length - 1];

  // ── Header date ──
  const d = new Date(row.date + 'T00:00:00');
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('dateLabel').textContent =
    `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;

  // ── Recovery score ──
  const score = Math.round(row.recovery_score);
  const color = getRecoveryColor(score);

  // Gauge glow color
  const glow = document.getElementById('gaugeGlow');
  glow.style.background = color === 'green'
    ? 'radial-gradient(circle, rgba(0,214,143,0.08) 0%, transparent 70%)'
    : color === 'amber'
    ? 'radial-gradient(circle, rgba(255,184,77,0.08) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(255,107,107,0.08) 0%, transparent 70%)';

  // Animate arc
  const endAngle = (score / maxScore) * 2 * Math.PI;
  fgArc.attr('fill', getGradientId(color));
  fgArc.transition().duration(1200).ease(d3.easeCubicOut)
    .attrTween('d', function() {
      const current = this._currentAngle || 0.001;
      const interp = d3.interpolate(current, endAngle);
      return t => {
        this._currentAngle = interp(t);
        return arcGen({ startAngle: 0, endAngle: interp(t) });
      };
    });

  // Animate counter
  const prevScore = +scoreText.text() || 0;
  d3.select({ val: prevScore }).transition().duration(1200).ease(d3.easeCubicOut)
    .tween('text', function() {
      const interp = d3.interpolateRound(prevScore, score);
      return t => scoreText.text(interp(t));
    });

  // Badge
  const badge = document.getElementById('badge');
  badge.className = `badge ${color}`;
  badge.textContent = color === 'green' ? 'In the green'
    : color === 'amber' ? 'Needs attention' : 'Take it easy';

  // ── Physiological readiness ──
  const hrvColor = row.hrv >= row.hrv_baseline ? 'green' : 'amber';
  const rhrColor = row.resting_heart_rate <= row.rhr_baseline ? 'green' : 'amber';
  const metrics = [
    { label: 'HRV',  value: Math.round(row.hrv), unit: 'ms',  color: hrvColor, accent: hrvColor === 'green' ? '#00D68F' : '#FFB84D' },
    { label: 'RHR',  value: Math.round(row.resting_heart_rate), unit: 'bpm', color: rhrColor, accent: rhrColor === 'green' ? '#00D68F' : '#FFB84D' },
    { label: 'Resp', value: row.respiratory_rate.toFixed(1), unit: 'rpm', color: 'muted', accent: '#4A4845' },
  ];

  const metricsRow = d3.select('#metricsRow');
  metricsRow.selectAll('.metric-card').remove();

  const cards = metricsRow.selectAll('.metric-card')
    .data(metrics)
    .join('div')
    .attr('class', 'metric-card')
    .style('--card-accent', d => d.accent);

  cards.append('div').attr('class', 'label').text(d => d.label);
  cards.append('div').attr('class', 'value').text(d => d.value);
  cards.append('div').attr('class', d => `unit unit-${d.color}`).text(d => d.unit);

  // ── 7-day trend ──
  const actualIdx = idx >= 0 ? idx : records.length - 1;
  const startIdx = Math.max(0, actualIdx - 6);
  const trendData = records.slice(startIdx, actualIdx + 1).map(r => ({
    day: r.day_of_week.slice(0, 3),
    date: r.date,
    val: Math.round(r.recovery_score),
  }));

  const xScale = d3.scalePoint()
    .domain(trendData.map(d => d.date))
    .range([margin.left + 12, chartW - margin.right - 12]);

  const yExtent = d3.extent(trendData, d => d.val);
  const yPad = Math.max(10, (yExtent[1] - yExtent[0]) * 0.2);
  const yScale = d3.scaleLinear()
    .domain([yExtent[0] - yPad, yExtent[1] + yPad])
    .range([chartH - margin.bottom, margin.top]);

  // Guide lines
  trendGuideGroup.selectAll('line').remove();
  [yExtent[0], (yExtent[0] + yExtent[1]) / 2, yExtent[1]].forEach(v => {
    trendGuideGroup.append('line')
      .attr('x1', margin.left + 12).attr('x2', chartW - margin.right - 12)
      .attr('y1', yScale(v)).attr('y2', yScale(v))
      .attr('stroke', 'rgba(255,255,255,0.04)').attr('stroke-width', 1);
  });

  // Area
  const areaGen = d3.area()
    .x(d => xScale(d.date)).y0(chartH - margin.bottom).y1(d => yScale(d.val))
    .curve(d3.curveMonotoneX);

  trendAreaGroup.selectAll('path').remove();
  trendAreaGroup.append('path')
    .datum(trendData).attr('d', areaGen).attr('fill', 'url(#areaGrad)')
    .style('opacity', 0).transition().duration(800).style('opacity', 1);

  // Line
  const lineGen = d3.line()
    .x(d => xScale(d.date)).y(d => yScale(d.val))
    .curve(d3.curveMonotoneX);

  trendLineGroup.selectAll('path').remove();
  const linePath = trendLineGroup.append('path')
    .datum(trendData).attr('fill', 'none')
    .attr('stroke', '#00D68F').attr('stroke-width', 2.5)
    .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
    .attr('d', lineGen);

  const pathLen = linePath.node().getTotalLength();
  linePath
    .attr('stroke-dasharray', pathLen).attr('stroke-dashoffset', pathLen)
    .transition().duration(1000).delay(100).ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', 0);

  // Dots
  trendDotGroup.selectAll('*').remove();

  trendDotGroup.selectAll('.ring')
    .data(trendData).join('circle')
    .attr('cx', d => xScale(d.date)).attr('cy', d => yScale(d.val))
    .attr('r', 7).attr('fill', 'rgba(0,214,143,0.12)')
    .style('opacity', 0).transition().delay((_, i) => 700 + i * 60).duration(400).style('opacity', 1);

  trendDotGroup.selectAll('.dot')
    .data(trendData).join('circle').attr('class', 'dot')
    .attr('cx', d => xScale(d.date)).attr('cy', d => yScale(d.val))
    .attr('r', 3.5).attr('fill', '#00D68F').attr('stroke', '#1A1A1A').attr('stroke-width', 2)
    .style('opacity', 0).transition().delay((_, i) => 700 + i * 60).duration(400).style('opacity', 1);

  // Hit areas + tooltip
  trendHitGroup.selectAll('rect').remove();
  trendHitGroup.selectAll('rect')
    .data(trendData).join('rect')
    .attr('x', d => xScale(d.date) - 22).attr('y', margin.top)
    .attr('width', 44).attr('height', chartH - margin.top - margin.bottom)
    .attr('fill', 'transparent').style('cursor', 'pointer')
    .on('mouseenter', function(event, d) {
      tooltip.textContent = d.val;
      tooltip.classList.add('visible');
      const svgEl = document.getElementById('trendChart');
      const svgRect = svgEl.getBoundingClientRect();
      const cardRect = svgEl.closest('.trend-card').getBoundingClientRect();
      const xPx = (xScale(d.date) / chartW) * svgRect.width;
      const yPx = (yScale(d.val) / chartH) * svgRect.height;
      tooltip.style.left = (svgRect.left - cardRect.left + xPx - 14) + 'px';
      tooltip.style.top  = (svgRect.top  - cardRect.top  + yPx - 34) + 'px';
    })
    .on('mouseleave', () => tooltip.classList.remove('visible'));

  // Day labels
  trendLabelGroup.selectAll('text').remove();
  trendLabelGroup.selectAll('text')
    .data(trendData).join('text')
    .attr('x', d => xScale(d.date)).attr('y', chartH - 8)
    .attr('text-anchor', 'middle').attr('fill', '#4A4845')
    .attr('font-size', 11).attr('font-family', 'Outfit, sans-serif').attr('font-weight', 400)
    .text(d => d.day);

  // ── Strain bar ──
  const strainPct = (row.day_strain / 21) * 100;
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.getElementById('strainFill').style.width = strainPct + '%';
    }, 300);
  });
  document.getElementById('strainValue').innerHTML =
    `${row.day_strain.toFixed(1)} <small>/ 21</small>`;

  // ── Sleep breakdown (stacked bar) ──
  const totalSleep = row.sleep_hours;
  const deep  = row.deep_sleep_hours;
  const rem   = row.rem_sleep_hours;
  const light = row.light_sleep_hours;
  const sleepSum = deep + rem + light || 1;

  document.getElementById('sleepTotal').textContent = `${totalSleep.toFixed(1)} hrs`;
  document.getElementById('sleepEff').textContent = `${Math.round(row.sleep_efficiency)}% efficiency`;

  const sleepBar = document.getElementById('sleepBar');
  sleepBar.innerHTML = '';
  const deepBar  = document.createElement('div');
  const remBar   = document.createElement('div');
  const lightBar = document.createElement('div');
  deepBar.style.background  = '#7B68EE';
  remBar.style.background   = '#9370DB';
  lightBar.style.background = '#B39DDB';
  deepBar.style.width  = '0%';
  remBar.style.width   = '0%';
  lightBar.style.width = '0%';
  sleepBar.append(deepBar, remBar, lightBar);

  requestAnimationFrame(() => {
    setTimeout(() => {
      deepBar.style.width  = ((deep  / sleepSum) * 100) + '%';
      remBar.style.width   = ((rem   / sleepSum) * 100) + '%';
      lightBar.style.width = ((light / sleepSum) * 100) + '%';
    }, 400);
  });

  // ── Recommendation ──
  const rec = document.getElementById('recommendation');
  const recText = document.getElementById('recText');

  if (color === 'green') {
    rec.style.background = 'rgba(77,166,255,0.08)';
    rec.style.borderColor = 'rgba(77,166,255,0.1)';
    rec.style.color = '#4DA6FF';
    recText.innerHTML = '<strong>Ready to train</strong> — moderate to high intensity OK';
  } else if (color === 'amber') {
    rec.style.background = 'rgba(255,184,77,0.08)';
    rec.style.borderColor = 'rgba(255,184,77,0.1)';
    rec.style.color = '#FFB84D';
    recText.innerHTML = '<strong>Train light</strong> — low intensity or active recovery recommended';
  } else {
    rec.style.background = 'rgba(255,107,107,0.08)';
    rec.style.borderColor = 'rgba(255,107,107,0.1)';
    rec.style.color = '#FF6B6B';
    recText.innerHTML = '<strong>Rest day</strong> — your body needs recovery, skip the workout';
  }
}

// ──────────────────────────────────────────────────────────────────
//  7. EVENT LISTENERS
// ──────────────────────────────────────────────────────────────────

userSelect.addEventListener('change', () => {
  populateDates(userSelect.value);
  update();
});

dateSelect.addEventListener('change', update);

// Initial render
update();
