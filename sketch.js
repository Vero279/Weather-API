// City list with coordinates
const CITIES = [
  { name: "Berlin",    lat: 52.52,  lon: 13.41  },
  { name: "Lisbon",    lat: 38.72,  lon: -9.14  },
  { name: "Porto",     lat: 41.15,  lon: -8.61  },
  { name: "London",    lat: 51.51,  lon: -0.13  },
  { name: "Paris",     lat: 48.85,  lon: 2.35   },
  { name: "New York",  lat: 40.71,  lon: -74.01 },
  { name: "Tokyo",     lat: 35.68,  lon: 139.69 },
  { name: "Sydney",    lat: -33.87, lon: 151.21 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Cairo",     lat: 30.06,  lon: 31.25  },
];

function setup() {
  noCanvas();

  // Populate dropdown
  const sel = select("#citySelect");
  CITIES.forEach((city, i) => {
    const opt = createElement("option", city.name);
    opt.attribute("value", i);
    opt.parent(sel);
  });

  // Load first city on start
  loadCity(CITIES[0]);

  // React to dropdown change
  sel.changed(() => {
    const city = CITIES[int(sel.value())];
    loadCity(city);
  });
}

function loadCity(city) {
  const display = select("#display");
  display.html('<p id="loading">Loading...</p>');

  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,wind_speed_10m_max` +
    `&timezone=auto`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const dates = data.daily.time;
      const tempMax = data.daily.temperature_2m_max;
      const tempMin = data.daily.temperature_2m_min;
      const humidity = data.daily.relative_humidity_2m_max;
      const windSpeed = data.daily.wind_speed_10m_max;
      const tempUnit = data.daily_units.temperature_2m_max;
      const windUnit = data.daily_units.wind_speed_10m_max;
      renderWeeklyForecast(city.name, dates, tempMax, tempMin, humidity, windSpeed, tempUnit, windUnit);
    })
    .catch((err) => {
      display.html(`<p style="color:salmon;">Error loading data: ${err}</p>`);
    });
}

function renderWeeklyForecast(cityName, dates, tempMax, tempMin, humidity, windSpeed, tempUnit, windUnit) {
  const display = select("#display");
  display.html("");

  const title = createElement("h2", `📍 ${cityName} — 7-Day Forecast`);
  title.parent(display);

  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  for (let i = 0; i < dates.length; i++) {
    const date = new Date(dates[i]);
    const dayName = daysOfWeek[date.getDay()];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const avgTemp = Math.round((tempMax[i] + tempMin[i]) / 2);

    const dayCard = createElement("div");
    dayCard.class("day-card");
    dayCard.html(`
      <div class="date-header">📅 ${dateStr} (${dayName})</div>
      <div class="weather-details">
        <div class="detail-line">(celsius degrees) ${avgTemp} ${tempUnit}</div>
        <div class="detail-line">(wind speed) ${windSpeed[i]} ${windUnit}</div>
        <div class="detail-line">(max humidity) ${humidity[i]} %</div>
      </div>
    `);
    dayCard.parent(display);
  }
}
