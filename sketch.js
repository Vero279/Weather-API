const CITIES = [
  { name: "Berlin", lat: 52.52, lon: 13.41 },
  { name: "Lisbon", lat: 38.72, lon: -9.14 },
  { name: "Porto", lat: 41.15, lon: -8.61 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Paris", lat: 48.85, lon: 2.35 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Cairo", lat: 30.06, lon: 31.25 },
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

// Atualize a URL em loadCity:
async function loadCity(city) {
  const display = select("#display");
  display.style("opacity", "0.5");
  
  // Adicionados: wind_speed_10m e relative_humidity_2m
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
              `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&forecast_days=1`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    renderData(city.name, data);
    display.style("opacity", "1");
  } catch (err) {
    display.html(`<p style="color:salmon;">Erro ao carregar dados.</p>`);
  }
}

function renderData(name, data) {
  const display = select("#display");
  const now = 0; // Índice da hora atual
  
  display.html(`<h2>📍 ${name}</h2>`);
  
  // Container de Stats
  let grid = createElement("div").class("weather-grid");
  grid.parent(display);

  const stats = [
    { label: "Temp", val: data.hourly.temperature_2m[now] + "°C" },
    { label: "Humidade", val: data.hourly.relative_humidity_2m[now] + "%" },
    { label: "Vento", val: data.hourly.wind_speed_10m[now] + " km/h" }
  ];

  stats.forEach(s => {
    let card = createElement("div", `<span>${s.label}</span><span class="stat-value">${s.val}</span>`);
    card.class("stat-card");
    card.parent(grid);
  });
}
