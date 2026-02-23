
// Main configuration settings for layout and data
const CONFIG = {
  container: "#chart",
  csvPath: "data/temperature_daily.csv",
  yearsToShow: 10,
  margin: { top: 36, right: 20, bottom: 40, left: 70 },
  cellPad: 6,
  months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
};

// We use this to switch between MAX and MIN temperature
const Mode = Object.freeze({ MAX: "MAX", MIN: "MIN" });
let currentMode = Mode.MAX;

const tooltip = d3.select("#tooltip");

// This function tells the program which column names to use from the CSV file
function inferColumns() {
  return {
    dateKey: "date",
    tmaxKey: "max_temperature",
    tminKey: "min_temperature"
  };
}
// This safely converts string to Date object
function parseDateSafe(s) {
  const dt = new Date(s);
  return isNaN(dt) ? null : dt;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
// Helper functions to extract year, month, and day
function yearNum(dt) { return dt.getFullYear(); }
function month0(dt) { return dt.getMonth(); }
function dayOfMonth(dt) { return dt.getDate(); }

function fmtMonthYear(y, m0) {
  return `${CONFIG.months[m0]} ${y}`;
}

// Depending on current mode, return monthly max or monthly min
function valueForMode(cell) {
  return currentMode === Mode.MAX ? cell.monthlyMax : cell.monthlyMin;
}

function formatTemp(v) {
  if (v == null || Number.isNaN(v)) return "N/A";
  return `${v.toFixed(1)}°C`;
}

// This selects the last 10 years from dataset
function getLastNYears(years, n) {
  const sorted = years.slice().sort(d3.ascending);
  const maxY = sorted[sorted.length - 1];
  return sorted.filter(y => y >= maxY - (n - 1));
}

// This function groups daily data into monthly cells
// Each cell represents one year and one month
function buildMonthlyCells(rows) {
  const grouped = d3.group(rows, d => d.year, d => d.month0);

  const cells = [];
  for (const [y, byMonth] of grouped) {
    for (const [m, arr] of byMonth) {
      const days = arr.slice().sort((a,b) => a.date - b.date);

      const monthlyMax = d3.max(days, d => d.tmax);
      const monthlyMin = d3.min(days, d => d.tmin);

      cells.push({
        year: y,
        month0: m,
        days,
        monthlyMax,
        monthlyMin,
        startDate: days[0]?.date ?? null,
        endDate: days[days.length - 1]?.date ?? null
      });
    }
  }
  return cells;
}

// This function draws the color legend at the top
function drawLegend(colorScale, domain, label) {
  d3.select("#legend").selectAll("*").remove();

  const width = 240;
  const height = 46;

  const svg = d3.select("#legend")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const defs = svg.append("defs");
  const gradId = "temp-grad";

  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%").attr("x2", "100%")
    .attr("y1", "0%").attr("y2", "0%");

  const stops = d3.range(0, 1.0001, 0.1);
  grad.selectAll("stop")
    .data(stops)
    .join("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => colorScale(domain[0] + d * (domain[1] - domain[0])));

  svg.append("text")
    .attr("x", 0)
    .attr("y", 11)
    .attr("class", "legend-label")
    .text(label);

  svg.append("rect")
    .attr("x", 0).attr("y", 16)
    .attr("width", width)
    .attr("height", 10)
    .attr("rx", 6)
    .attr("fill", `url(#${gradId})`)
    .attr("stroke", "rgba(255,255,255,0.14)");

  const x = d3.scaleLinear().domain(domain).range([0, width]);
  const axis = d3.axisBottom(x).ticks(5).tickFormat(d => `${d}°`);

  svg.append("g")
    .attr("transform", "translate(0, 26)")
    .attr("class", "axis")
    .call(axis);
}

// This shows tooltip when user hovers on a cell
function showTooltip(event, cell) {
  const title = fmtMonthYear(cell.year, cell.month0);
  const v = valueForMode(cell);

  const range =
    cell.startDate && cell.endDate
      ? `${cell.startDate.toISOString().slice(0,10)} → ${cell.endDate.toISOString().slice(0,10)}`
      : "Date range unavailable";

  tooltip
    .style("opacity", 1)
    .html(`
      <div style="font-weight:800;margin-bottom:4px;">${title}</div>
      <div style="color:#a7b4c5;margin-bottom:6px;">${range}</div>
      <div><span style="color:#a7b4c5;">${currentMode}:</span> ${formatTemp(v)}</div>
      <div style="margin-top:6px;color:#a7b4c5;font-size:12px;">
        Sparkline shows daily ${currentMode === Mode.MAX ? "max" : "min"} temperature.
      </div>
    `);

  moveTooltip(event);
}

// Move tooltip with mouse
function moveTooltip(event) {
  const padding = 14;
  const x = clamp(event.clientX + 14, padding, window.innerWidth - 300);
  const y = clamp(event.clientY + 14, padding, window.innerHeight - 150);
  tooltip.style("left", `${x}px`).style("top", `${y}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

// This draws small daily temperature line inside each cell
function drawSparkline(g, cell, innerW, innerH) {
  const days = cell.days;
  const yAccessor = d => (currentMode === Mode.MAX ? d.tmax : d.tmin);

  const x = d3.scaleLinear()
    .domain([1, d3.max(days, d => d.day) || 31])
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain(d3.extent(days, yAccessor))
    .nice()
    .range([innerH, 0]);

  const line = d3.line()
    .defined(d => yAccessor(d) != null && !Number.isNaN(yAccessor(d)))
    .x(d => x(d.day))
    .y(d => y(yAccessor(d)));

  g.append("rect")
    .attr("class", "spark-bg")
    .attr("x", 0).attr("y", 0)
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "none");

  g.append("path")
    .attr("d", line(days));
}
// This function draws the full matrix visualization
function render(cells, years) {
  d3.select(CONFIG.container).selectAll("*").remove();

  const months = d3.range(0, 12);

  const cellW = 62;
  const cellH = 42;

  const width = CONFIG.margin.left + CONFIG.margin.right + years.length * cellW;
  const height = CONFIG.margin.top + CONFIG.margin.bottom + months.length * cellH;

  const svg = d3.select(CONFIG.container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleBand()
    .domain(years)
    .range([CONFIG.margin.left, width - CONFIG.margin.right])
    .paddingInner(0.05)
    .paddingOuter(0.02);

  const y = d3.scaleBand()
    .domain(months)
    .range([CONFIG.margin.top, height - CONFIG.margin.bottom])
    .paddingInner(0.05)
    .paddingOuter(0.02);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${CONFIG.margin.top})`)
    .call(d3.axisTop(x).tickSizeOuter(0));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${CONFIG.margin.left}, 0)`)
    .call(d3.axisLeft(y).tickSizeOuter(0).tickFormat(m0 => CONFIG.months[m0]));

  const values = cells.map(valueForMode).filter(v => v != null && !Number.isNaN(v));
  const domain = d3.extent(values);
  const safeDomain = (domain[0] == null) ? [0, 1] : domain;

  const color = d3.scaleSequential()
    .domain(safeDomain)
    .interpolator(d3.interpolateYlOrRd);

  drawLegend(
    color,
    safeDomain,
    currentMode === Mode.MAX ? "Monthly MAX temperature" : "Monthly MIN temperature"
  );

  const grid = svg.append("g");

  const join = grid.selectAll("g.cell")
    .data(cells, d => `${d.year}-${d.month0}`)
    .join(enter => {
      const g = enter.append("g")
        .attr("class", "cell")
        .attr("transform", d => `translate(${x(d.year)}, ${y(d.month0)})`);

      g.append("rect")
        .attr("class", "cell-rect")
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 6);

      g.append("g").attr("class", "sparkline");

      g.on("mouseenter", (event, d) => showTooltip(event, d))
        .on("mousemove", (event) => moveTooltip(event))
        .on("mouseleave", hideTooltip);

      return g;
    });

  join.select("rect.cell-rect")
    .attr("fill", d => {
      const v = valueForMode(d);
      return (v == null || Number.isNaN(v)) ? "rgba(255,255,255,0.06)" : color(v);
    });

  join.select("g.sparkline").each(function(cell) {
    const g = d3.select(this);
    g.selectAll("*").remove();

    const innerW = Math.max(0, x.bandwidth() - 2 * CONFIG.cellPad);
    const innerH = Math.max(0, y.bandwidth() - 2 * CONFIG.cellPad);
    g.attr("transform", `translate(${CONFIG.cellPad}, ${CONFIG.cellPad})`);

    drawSparkline(g, cell, innerW, innerH);
  });
}
// This loads data and starts the visualization
async function main() {
  const raw = await d3.csv(CONFIG.csvPath);
  if (!raw.length) {
    d3.select(CONFIG.container).append("div").text("No data found in CSV.");
    return;
  }

  const { dateKey, tmaxKey, tminKey } = inferColumns();

  const rows = raw.map(r => {
    const dt = parseDateSafe(r[dateKey]);
    const tmax = +r[tmaxKey];
    const tmin = +r[tminKey];

    return {
      date: dt,
      year: dt ? yearNum(dt) : null,
      month0: dt ? month0(dt) : null,
      day: dt ? dayOfMonth(dt) : null,
      tmax: Number.isFinite(tmax) ? tmax : null,
      tmin: Number.isFinite(tmin) ? tmin : null
    };
  }).filter(d => d.date && d.year != null && d.month0 != null);

  const allYears = Array.from(new Set(rows.map(d => d.year)));
  const years = getLastNYears(allYears, CONFIG.yearsToShow);

  const filtered = rows.filter(d => years.includes(d.year));
  const cells = buildMonthlyCells(filtered);

  render(cells, years);

  d3.select("#toggleBtn").on("click", () => {
    currentMode = (currentMode === Mode.MAX) ? Mode.MIN : Mode.MAX;
    d3.select("#toggleBtn").text(`Mode: ${currentMode}`);
    render(cells, years);
  });
}

main().catch(err => {
  console.error(err);
  d3.select(CONFIG.container).append("pre").text(String(err));
});