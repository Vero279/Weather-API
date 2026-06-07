// ── Cities ──
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

// ── Data fetching ──────────────────────────────────
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

// ── Texture builders for titles (uses native system font) ──
function buildColumnHeaderTexture(p, dayName, dateStr) {
  const g = p.createGraphics(256, 128);
  g.textAlign(g.CENTER, g.CENTER);
  g.textFont("Arial, Helvetica, sans-serif");
  g.fill(144, 205, 244);
  g.textStyle(g.BOLD);
  g.textSize(36);
  g.text(dayName, 128, 42);
  g.fill(255);
  g.textSize(30);
  g.text(dateStr, 128, 90);
  return g;
}

function buildCityLabelTexture(p, cityName) {
  const g = p.createGraphics(256, 64);
  g.textAlign(g.CENTER, g.CENTER);
  g.textFont("Arial, Helvetica, sans-serif");
  g.fill(246, 173, 85);
  g.textStyle(g.BOLD);
  g.textSize(36);
  g.text(cityName, 128, 32);
  return g;
}

// ── p5 instance ────────────────────────────────────
function startSketch(cellData, headerDates, numCities, numCols) {
  new p5((p) => {
    let gridCells = [];
    let sharedBackTex, sharedTopTex;
    let canvasZoom = 1;
    let colHeaderTextures = [];
    let rowLabelTextures = [];
    const canvasContainer = document.getElementById("canvas-container");

    p.setup = () => {
      const w = canvasContainer.clientWidth;
      const h = canvasContainer.clientHeight;
      const canvas = p.createCanvas(w, h, p.WEBGL);
      canvas.parent("canvas-container");
      p.pixelDensity(1);

      canvas.elt.style.width  = w + "px";
      canvas.elt.style.height = h + "px";

      // Build cube textures
      sharedBackTex = createMetricTexture(p, "DATA", "p5.js", "#333");
      sharedTopTex  = createMetricTexture(p, "LIVE", "grid", "#2a2a2a");

      const cityNamesOrder = CITIES.map(c => c.name);
      gridCells = cellData.map((d) => ({
        ...d,
        row: cityNamesOrder.indexOf(d.cityName)
      }));

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

      // Build title textures once (native font, no external files)
      colHeaderTextures = headerDates.map(hdr =>
        buildColumnHeaderTexture(p, hdr.dayName, hdr.dateStr)
      );
      rowLabelTextures = CITIES.map(city =>
        buildCityLabelTexture(p, city.name)
      );
    };

    p.draw = () => {
      const cw = p.width;
      const ch = p.height;

      // Keep the default Y‑up projection (top of screen is positive Y)
      p.ortho(-cw/2, cw/2, -ch/2, ch/2, -1000, 1000);

      // Layout margins – all in Y‑up coordinates
      const headerHeight = p.constrain(ch * 0.12, 30, 80);
      const labelWidth   = p.constrain(cw * 0.08, 50, 120);

      // In Y‑up: -ch/2 is the top of the canvas (screen top)
      const headerTop    = -ch/2;
      const headerBottom = headerTop + headerHeight;   // bottom of header band (still high)
      const gridTop      = headerBottom;               // top of cube grid
      const gridBottom   = ch/2;                       // bottom of canvas
      const gridLeft     = -cw/2 + labelWidth;
      const gridRight    =  cw/2;

      const gridW = gridRight - gridLeft;
      const gridH = gridBottom - gridTop;              // positive
      const cellW = gridW / numCols;
      const cellH = gridH / numCities;

      p.background(10, 20, 35);

      // ── Grid background ──
      p.push();
      p.noStroke();
      p.fill(20, 30, 45);
      for (let col = 0; col < numCols; col++) {
        for (let row = 0; row < numCities; row++) {
          const x = gridLeft + col * cellW + cellW/2;
          const y = gridTop + row * cellH + cellH/2;   // row 0 at top
          p.rect(x, y, cellW, cellH);
        }
      }
      p.pop();

      // ── Cubes ──
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

        const cx = gridLeft + cell.col * cellW + cellW/2;
        const cy = gridTop + cell.row * cellH + cellH/2;
        const s = p.min(cellW, cellH) * 0.65;

        p.push();
        p.translate(cx, cy, 0);
        p.rotateX(cell.rx);
        p.rotateY(cell.ry);
        p.noStroke();

        p.push(); p.translate(0, 0, s/2); p.texture(cell.textures.front); p.plane(s, s); p.pop();
        p.push(); p.translate(s/2, 0, 0); p.rotateY(p.HALF_PI); p.texture(cell.textures.right); p.plane(s, s); p.pop();
        p.push(); p.translate(0, s/2, 0); p.rotateX(-p.HALF_PI); p.texture(cell.textures.bottom); p.plane(s, s); p.pop();
        p.push(); p.translate(-s/2, 0, 0); p.rotateY(-p.HALF_PI); p.texture(cell.textures.left); p.plane(s, s); p.pop();
        p.push(); p.translate(0, 0, -s/2); p.rotateY(p.PI); p.texture(sharedBackTex); p.plane(s, s); p.pop();
        p.push(); p.translate(0, -s/2, 0); p.rotateX(p.HALF_PI); p.texture(sharedTopTex); p.plane(s, s); p.pop();

        p.pop();
      });
      p.pop();

      // ── Column headers (textured planes) – now correctly at the top ──
      const hy = headerTop + headerHeight/2;   // centre of header band (negative Y)
      for (let col = 0; col < numCols; col++) {
        const hx = gridLeft + col * cellW + cellW/2;
        p.push();
        p.translate(hx, hy, 0);
        p.noStroke();
        p.texture(colHeaderTextures[col]);
        p.plane(cellW, headerHeight);
        p.pop();
      }

      // ── Row labels (textured planes, rotated -90°) ──
      const labelX = -cw/2 + labelWidth/2;   // centre of left label band
      for (let row = 0; row < numCities; row++) {
        const ry = gridTop + row * cellH + cellH/2;
        p.push();
        p.translate(labelX, ry, 0);
        p.rotateZ(-p.HALF_PI);   // rotate so the text reads vertically (top → bottom)
        p.noStroke();
        p.texture(rowLabelTextures[row]);
        p.plane(cellH, labelWidth);
        p.pop();
      }
    };

    // ── Zoom via mouse wheel (unchanged) ──
    p.mouseWheel = (event) => {
      if (!p.canvas || !p.canvas.elt) return;
      event.preventDefault();
      const container = canvasContainer;
      const rect = container.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      const oldZoom = canvasZoom;
      canvasZoom *= (1 - event.deltaY * 0.001);
      canvasZoom = p.constrain(canvasZoom, 0.5, 5);
      const newZoom = canvasZoom;

      const baseW = container.clientWidth;
      const baseH = container.clientHeight;

      p.canvas.elt.style.width  = baseW * newZoom + "px";
      p.canvas.elt.style.height = baseH * newZoom + "px";

      const contentX = (container.scrollLeft + offsetX) / oldZoom;
      const contentY = (container.scrollTop  + offsetY) / oldZoom;
      container.scrollLeft = contentX * newZoom - offsetX;
      container.scrollTop  = contentY * newZoom - offsetY;

      return false;
    };

    p.windowResized = () => {
      if (!p.canvas || !p.canvas.elt) return;
      const w = canvasContainer.clientWidth;
      const h = canvasContainer.clientHeight;
      p.resizeCanvas(w, h);
      p.canvas.elt.style.width  = w * canvasZoom + "px";
      p.canvas.elt.style.height = h * canvasZoom + "px";
    };
  });
}

// ── Metric texture helper (unchanged) ──
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

// ── Boot ────────────────────────────────────────────
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
    startSketch(grid, headerDates, numCities, numCols);
  } catch (err) {
    document.getElementById("loading").textContent =
      "⚠️ Failed to load data. Check your connection and reload.";
    console.error(err);
  }
})();
