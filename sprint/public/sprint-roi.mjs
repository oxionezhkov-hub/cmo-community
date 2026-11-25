export function calculateRoi(values) {
  const setupCash = values.fee + values.setupExtra;
  const investment = setupCash + values.setupHours * values.hourRate;
  const hoursSaved = values.hoursBefore - values.hoursAfter;
  const cashSaved = values.toolsBefore - values.toolsAfter - values.server;
  const monthlyEffect = cashSaved + hoursSaved * values.hourRate;
  const rows = Array.from({ length: values.months + 1 }, (_, month) => ({
    month,
    economic: monthlyEffect * month - investment,
    cash: cashSaved * month - setupCash,
  }));

  let payback = null;
  if (monthlyEffect > 0) payback = investment / monthlyEffect;
  else if (investment === 0 && monthlyEffect === 0) payback = 0;

  return {
    investment,
    hoursSaved,
    cashSaved,
    monthlyEffect,
    payback,
    rows,
  };
}

const currency = new Intl.NumberFormat("ru-RU", {
  style: "currency", currency: "RUB", maximumFractionDigits: 0,
});
const signedCurrency = new Intl.NumberFormat("ru-RU", {
  style: "currency", currency: "RUB", maximumFractionDigits: 0, signDisplay: "exceptZero",
});
const decimal = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 });
const axisNumber = new Intl.NumberFormat("ru-RU", {
  notation: "compact", maximumFractionDigits: 1,
});

function drawChart(canvas, model, selected) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const context = canvas.getContext("2d");
  if (!width || !height || !context) return;

  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const left = 55;
  const right = width - 14;
  const top = 14;
  const bottom = height - 30;
  const months = model.rows.length - 1;
  const values = model.rows.flatMap(({ economic, cash }) => [economic, cash]);
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const margin = (high - low) * .12 || 1000;
  const min = low - margin;
  const max = high + margin;
  const x = month => left + (right - left) * month / months;
  const y = value => bottom - (bottom - top) * (value - min) / (max - min);
  const orange = "#d94927";
  const grey = "#707887";

  const trace = key => {
    context.beginPath();
    model.rows.forEach((row, index) => {
      if (index === 0) context.moveTo(x(row.month), y(row[key]));
      else context.lineTo(x(row.month), y(row[key]));
    });
  };

  const fill = context.createLinearGradient(0, top, 0, bottom);
  fill.addColorStop(0, "#ff5a3620");
  fill.addColorStop(1, "#ff5a3604");
  trace("economic");
  context.lineTo(right, bottom);
  context.lineTo(left, bottom);
  context.closePath();
  context.fillStyle = fill;
  context.fill();

  context.font = '12px "Golos Text", system-ui, sans-serif';
  context.textBaseline = "middle";
  context.fillStyle = "#5d6472";
  context.textAlign = "right";
  const guides = [0];
  if (high > 0) guides.push(high);
  if (low < 0) guides.push(low);
  for (const value of guides) {
    const coord = y(value);
    context.strokeStyle = value === 0 ? "#9ca3af" : "#e3e5e9";
    context.setLineDash(value === 0 ? [4, 4] : []);
    context.beginPath();
    context.moveTo(left, coord);
    context.lineTo(right, coord);
    context.stroke();
    context.fillText(axisNumber.format(value), left - 8, coord, left - 10);
  }

  context.setLineDash([]);
  context.textAlign = "center";
  const stride = Math.ceil(months / 4);
  for (let month = 0; month <= months; month++) {
    if (month === months || (month % stride === 0 && months - month >= stride)) {
      context.fillText(String(month), x(month), height - 12);
    }
  }

  context.lineWidth = 2;
  context.strokeStyle = grey;
  context.setLineDash([6, 4]);
  trace("cash");
  context.stroke();
  context.setLineDash([]);
  context.lineWidth = 3;
  context.strokeStyle = orange;
  trace("economic");
  context.stroke();

  const point = (cx, cy, color, radius) => {
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  };
  if (model.payback > 0 && model.payback <= months) {
    point(x(model.payback), y(0), "#fff", 7);
    point(x(model.payback), y(0), orange, 4);
  }

  const row = model.rows[selected];
  context.strokeStyle = "#8e96a2";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x(selected), top);
  context.lineTo(x(selected), bottom);
  context.stroke();
  point(x(selected), y(row.cash), grey, 4);
  point(x(selected), y(row.economic), orange, 5);
}

function mount(form) {
  const byId = id => document.getElementById(id);
  const results = byId("roi-results");
  const error = byId("roi-error");
  const canvas = byId("roi-chart");
  const month = byId("roi-month");
  const fields = Array.from(form.querySelectorAll("input[name]"));
  let model;

  function showMonth() {
    if (!model) return;
    const row = model.rows[month.valueAsNumber];
    const label = row.month === 0 ? "Старт" : `Месяц ${row.month}`;
    const economic = signedCurrency.format(row.economic);
    const cash = signedCurrency.format(row.cash);
    byId("roi-point").textContent = `${label} · ${economic} с учётом времени · ${cash} по прямым расходам`;
    month.setAttribute("aria-valuetext", label);
    drawChart(canvas, model, row.month);
  }

  function update() {
    const invalid = fields.some(field => !field.validity.valid);
    error.hidden = !invalid;
    results.hidden = invalid;
    if (invalid) {
      model = null;
      return;
    }

    const values = Object.fromEntries(fields.map(field => [field.name, field.valueAsNumber]));
    model = calculateRoi(values);
    const total = model.rows.at(-1);
    const payback = model.payback === null
      ? "Не окупается"
      : model.payback === 0 ? "Сразу" : `≈ ${decimal.format(model.payback)} мес.`;
    byId("roi-payback").textContent = payback;
    byId("roi-monthly").textContent = signedCurrency.format(model.monthlyEffect);
    byId("roi-total-label").textContent = `Итог за ${values.months} мес.`;
    byId("roi-total").textContent = signedCurrency.format(total.economic);
    byId("roi-investment").textContent = currency.format(model.investment);
    byId("roi-hours").textContent = `${decimal.format(model.hoursSaved)} ч`;
    byId("roi-cash").textContent = signedCurrency.format(model.cashSaved);
    byId("roi-return").textContent = model.investment > 0 ? percent.format(total.economic / model.investment) : "—";

    const tableRows = model.rows.map(row => {
      const tr = document.createElement("tr");
      const heading = document.createElement("th");
      heading.scope = "row";
      heading.textContent = row.month === 0 ? "Старт" : row.month;
      tr.append(heading);
      for (const value of [row.economic, row.cash]) {
        const cell = document.createElement("td");
        cell.textContent = signedCurrency.format(value);
        tr.append(cell);
      }
      return tr;
    });
    byId("roi-months").replaceChildren(...tableRows);
    month.max = values.months;
    showMonth();
  }

  function inspectPointer(event) {
    if (!model) return;
    const { left, width } = canvas.getBoundingClientRect();
    const fraction = (event.clientX - left - 55) / (width - 55 - 14);
    const max = model.rows.length - 1;
    month.value = Math.round(Math.max(0, Math.min(1, fraction)) * max);
    showMonth();
  }

  form.addEventListener("submit", event => event.preventDefault());
  form.addEventListener("input", update);
  form.addEventListener("reset", () => requestAnimationFrame(update));
  month.addEventListener("input", showMonth);
  canvas.addEventListener("pointerdown", inspectPointer);
  canvas.addEventListener("pointermove", event => {
    if (event.pointerType === "mouse") inspectPointer(event);
  });
  new ResizeObserver(showMonth).observe(canvas);
  update();
}

if (typeof document !== "undefined") {
  const form = document.getElementById("roi-form");
  if (form) mount(form);
}
