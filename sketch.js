// ── Cities (European capitals + Porto, Lisbon) ──
const CITIES = [
  { name: "Porto",     lat: 41.15, lon: -8.61 },
  { name: "Lisbon",    lat: 38.72, lon: -9.14 },
  { name: "Madrid",    lat: 40.42, lon: -3.70 },
  { name: "Paris",     lat: 48.85, lon: 2.35  },
  { name: "Berlin",    lat: 52.52, lon: 13.41 },
  { name: "Rome",      lat: 41.90, lon: 12.50 },
  { name: "London",    lat: 51.51, lon: -0.13 }
];

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Fetch weather + air quality ──
async function fetchCityData(city, retries = 2) {
  const weatherURL =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,wind_speed_10m_max` +
    `&timezone=auto`;

  const airURL =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=european_aqi`;

  const fetchWithRetry = async (url, label) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url);
      if (res.ok) return res.json();
      if (res.status === 429 && attempt < retries) {
        console.warn(`429 for ${label}, retrying...`);
        await sleep(1000);
      } else {
        throw new Error(`${label} failed with status ${res.status}`);
      }
    }
  };

  const [weatherRes, airRes] = await Promise.all([
    fetchWithRetry(weatherURL, `weather ${city.name}`),
    fetchWithRetry(airURL, `air ${city.name}`)
  ]);

  return { cityName: city.name, weather: weatherRes, air: airRes };
}

// ── Build grid data ──
function buildGridData(allCitiesData) {
  const validCities = allCitiesData.filter(c => c !== null);
  if (validCities.length === 0) throw new Error("No city data available.");

  const firstCity = validCities[0];
  const dates = firstCity.weather.daily.time;
  const columns = dates.length;
  const grid = [];

  const headerDates = [];
  dates.forEach((dateStr) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    headerDates.push({
      dayName: DAY_NAMES[d.getDay()],
      dateStr: `${dd}/${mm}/${yy}`
    });
  });

  validCities.forEach(cityData => {
    const w = cityData.weather.daily;
    const aqi = cityData.air.current.european_aqi;

    for (let i = 0; i < columns; i++) {
      const avgTemp = Math.round((w.temperature_2m_max[i] + w.temperature_2m_min[i]) / 2);
      grid.push({
        cityName: cityData.cityName,
        col: i,
        temp: avgTemp,
        tempUnit: firstCity.weather.daily_units.temperature_2m_max,
        humidity: w.relative_humidity_2m_max[i],
        wind: w.wind_speed_10m_max[i],
        windUnit: firstCity.weather.daily_units.wind_speed_10m_max,
        aqi: aqi
      });
    }
  });

  return { grid, headerDates, numCities: validCities.length, numCols: columns };
}

// ── Build HTML overlays inside the CSS Grid ──
function buildOverlays(headerDates, numCities) {
  // Date headers
  const dateHeadersDiv = document.getElementById("date-headers");
  dateHeadersDiv.innerHTML = "";
  headerDates.forEach((hdr) => {
    const hdrDiv = document.createElement("div");
    hdrDiv.className = "date-header";
    hdrDiv.innerHTML = `<span>${hdr.dayName}</span><span>${hdr.dateStr}</span>`;
    dateHeadersDiv.appendChild(hdrDiv);
  });

  // City labels
  const cityLabelsDiv = document.getElementById("city-labels");
  cityLabelsDiv.innerHTML = "";
  const cityNames = CITIES.map(c => c.name);
  cityNames.forEach((name) => {
    const lbl = document.createElement("div");
    lbl.className = "city-label";
    lbl.textContent = name;
    cityLabelsDiv.appendChild(lbl);
  });
}

// ── Start single p5 instance ──
function startSketch(cellData, numCities, numCols) {
  new p5((p) => {
    let gridCells = [];
    let sharedBackTex, sharedTopTex;
    const canvasContainer = document.getElementById("canvas-container");

    p.setup = () => {
      // Canvas fills the container exactly
      const w = canvasContainer.clientWidth;
      const h = canvasContainer.clientHeight;
      const canvas = p.createCanvas(w, h, p.WEBGL);
      canvas.parent("canvas-container");
      p.pixelDensity(1);

      // Shared textures
      sharedBackTex = createMetricTexture(p, "DATA", "p5.js", "#333");
      sharedTopTex  = createMetricTexture(p, "LIVE", "grid", "#2a2a2a");

      // Build gridCells
      const cityNamesOrder = CITIES.map(c => c.name);
      gridCells = cellData.map((d) => ({
        ...d,
        row: cityNamesOrder.indexOf(d.cityName)
      }));

      // Individual textures
      gridCells.forEach((cell) => {
        cell.textures = {
          front: createMetricTexture(p, "TEMP", `${cell.temp} ${cell.tempUnit}`, "#ffa500"),
          right: createMetricTexture(p, "AQI", `${cell.aqi}`, "#4caf50"),
          bottom: createMetricTexture(p, "HUM", `${cell.humidity}%`, "#2196f3"),
          left: createMetricTexture(p, "WIND", `${cell.wind} ${cell.windUnit}`, "#9c27b0")
        };
        cell.rx = 0;
        cell.ry = 0;
        cell.targetRX = 0;
        cell.targetRY = 0;
        cell.faceIndex = 0;
        cell.nextChangeTime = p.millis() + 2000;
      });
    };

    p.draw = () => {
      const cw = p.width;
      const ch = p.height;
      const cellW = cw / numCols;
      const cellH = ch / numCities;

      p.background(10, 20, 35);
      p.ortho(-cw/2, cw/2, -ch/2, ch/2, -1000, 1000);

      // Background grid cells
      p.push();
      p.noStroke();
      p.fill(20, 30, 45);
      for (let col = 0; col < numCols; col++) {
        for (let row = 0; row < numCities; row++) {
          const x = -cw/2 + col * cellW + cellW/2;
          const y = ch/2 - row * cellH - cellH/2;
          p.rect(x, y, cellW, cellH);
        }
      }
      p.pop();

      // Draw all cubes
      p.push();
      const now = p.millis();
      gridCells.forEach((cell) => {
        if (now >= cell.nextChangeTime) {
          cell.faceIndex = (cell.faceIndex + 1) % 4;
          cell.nextChangeTime = now + 2000;
          switch(cell.faceIndex) {
            case 0: cell.targetRX = 0; cell.targetRY = 0;          break;
            case 1: cell.targetRX = 0; cell.targetRY = -p.HALF_PI; break;
            case 2: cell.targetRX = p.HALF_PI; cell.targetRY = 0;  break;
            case 3: cell.targetRX = 0; cell.targetRY = p.HALF_PI;  break;
          }
        }
        cell.rx = p.lerp(cell.rx, cell.targetRX, 0.08);
        cell.ry = p.lerp(cell.ry, cell.targetRY, 0.08);

        const cx = -cw/2 + cell.col * cellW + cellW/2;
        const cy = ch/2 - cell.row * cellH - cellH/2;
        const s = p.min(cellW, cellH) * 0.65;

        p.push();
        p.translate(cx, cy, 0);
        p.rotateX(cell.rx);
        p.rotateY(cell.ry);
        p.noStroke();

        // Front
        p.push(); p.translate(0, 0, s/2); p.texture(cell.textures.front); p.plane(s, s); p.pop();
        // Right
        p.push(); p.translate(s/2, 0, 0); p.rotateY(p.HALF_PI); p.texture(cell.textures.right); p.plane(s, s); p.pop();
        // Bottom
        p.push(); p.translate(0, s/2, 0); p.rotateX(-p.HALF_PI); p.texture(cell.textures.bottom); p.plane(s, s); p.pop();
        // Left
        p.push(); p.translate(-s/2, 0, 0); p.rotateY(-p.HALF_PI); p.texture(cell.textures.left); p.plane(s, s); p.pop();
        // Back
        p.push(); p.translate(0, 0, -s/2); p.rotateY(p.PI); p.texture(sharedBackTex); p.plane(s, s); p.pop();
        // Top
        p.push(); p.translate(0, -s/2, 0); p.rotateX(p.HALF_PI); p.texture(sharedTopTex); p.plane(s, s); p.pop();

        p.pop();
      });
      p.pop();
    };

    p.windowResized = () => {
      const w = canvasContainer.clientWidth;
      const h = canvasContainer.clientHeight;
      p.resizeCanvas(w, h);
    };
  });
}

// ── Helper: metric texture ──
function createMetricTexture(p, label, value, bgColor) {
  const g = p.createGraphics(256, 256);
  g.background(bgColor);
  g.textAlign(g.CENTER, g.CENTER);
  g.textSize(42);
  g.fill(255);
  g.textStyle(g.BOLD);
  g.textFont("system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif");
  g.text(label, 128, 100);
  g.textSize(36);
  g.text(value, 128, 170);
  return g;
}

// ── Bootstrap ──
(async function init() {
  try {
    const allCitiesData = [];
    for (const city of CITIES) {
      try {
        const data = await fetchCityData(city);
        allCitiesData.push(data);
      } catch (err) {
        console.error(`Skipping ${city.name}:`, err);
        allCitiesData.push(null);
      }
      await sleep(300);
    }

    const validData = allCitiesData.filter(c => c !== null);
    if (validData.length === 0) throw new Error("Could not load any city data.");

    document.getElementById("loading").style.display = "none";
    const dashboard = document.getElementById("dashboard");
    dashboard.classList.add("visible");

    const { grid, headerDates, numCities, numCols } = buildGridData(validData);
    buildOverlays(headerDates, numCities);
    startSketch(grid, numCities, numCols);
  } catch (err) {
    document.getElementById("loading").textContent =
      "⚠️ Failed to load data. Check your connection and reload.";
    console.error(err);
  }
})();
