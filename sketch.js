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

async function loadCity(city) {
  const display = select("#display");
  display.style("opacity", "0.5"); // Feedback visual de loading
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&hourly=temperature_2m&forecast_days=1`;
    const res = await fetch(url);
    const data = await res.json();
    
    renderTemperatures(city.name, data.hourly.time, data.hourly.temperature_2m, data.hourly_units.temperature_2m);
    display.style("opacity", "1");
  } catch (err) {
    display.html(`<p style="color:salmon;">Erro ao carregar dados.</p>`);
  }
}

function renderTemperatures(name, times, temps, unit) {
  const display = select("#display");
  display.html(`<h2>📍 ${name}</h2>`);
  
  for (let i = 0; i < times.length; i += 3) {
    let row = createElement("div", `<span>${times[i].split("T")[1]}</span><span class="temp-value">${temps[i]} ${unit}</span>`);
    row.class("temp-row");
    row.parent(display);
  }
}
