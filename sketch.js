const CITIES = [
  { name: "Berlin", lat: 52.52, lon: 13.41 },
  { name: "Lisbon", lat: 38.72, lon: -9.14 },
  { name: "Porto", lat: 41.15, lon: -8.61 }
  // ... adicione os outros conforme necessário
];

function setup() {
  noCanvas();
  const sel = select("#citySelect");
  CITIES.forEach((city, i) => {
    let opt = createElement("option", city.name).value(i);
    opt.parent(sel);
  });
  sel.changed(() => loadCity(CITIES[sel.value()]));
  loadCity(CITIES[0]);
}

async function loadCity(city) {
  const display = select("#display");
  display.html('<p id="loading">A carregar 5 dias de previsão...</p>');

  // Alterado forecast_days para 5
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
              `&hourly=temperature_2m&forecast_days=5`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    renderFiveDays(city.name, data);
  } catch (err) {
    display.html(`<p style="color:salmon;">Erro: ${err}</p>`);
  }
}

function renderFiveDays(cityName, data) {
  const display = select("#display");
  display.html(`<h2>📍 ${cityName} — Previsão 5 Dias</h2>`);

  const times = data.hourly.time;
  const temps = data.hourly.temperature_2m;
  const unit = data.hourly_units.temperature_2m;

  // Agrupa dados por dia (a cada 24 horas)
  for (let d = 0; d < 5; d++) {
    let dayContainer = createElement("div").class("day-group");
    let date = times[d * 24].split("T")[0];
    dayContainer.html(`<h3>📅 ${date}</h3>`);
    dayContainer.parent(display);

    // Mostra apenas 3 horários por dia para manter a UI limpa
    for (let i = 0; i < 24; i += 8) {
      let index = (d * 24) + i;
      let time = times[index].split("T")[1];
      let row = createElement("div", `<span>${time}</span><span class="temp-value">${temps[index]} ${unit}</span>`);
      row.class("temp-row");
      row.parent(dayContainer);
    }
  }
}
