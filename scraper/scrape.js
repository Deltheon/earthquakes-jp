import fs from "node:fs";

const LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";
const DETAIL_BASE = "https://www.jma.go.jp/bosai/quake/data/";

const INT_ORDER = {
  "1": 1, "2": 2, "3": 3, "4": 4,
  "5-": 5, "5+": 6,
  "6-": 7, "6+": 8,
  "7": 9
};

function intensityRank(v) {
  const s = String(v ?? "").trim();
  return INT_ORDER[s] ?? 0;
}

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

function normalizeDetailUrl(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // cas fréquent JMA: "2026....json" (chemin relatif)
  // et parfois "data/2026....json"
  const cleaned = s.startsWith("data/") ? s.slice("data/".length) : s;
  return DETAIL_BASE + cleaned;
}

function collectPointsDeep(node, points, context = {}) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const it of node) collectPointsDeep(it, points, context);
    return;
  }
  if (typeof node !== "object") return;

  const nextContext = { ...context };
  if (typeof node.pref === "string") nextContext.pref = node.pref;
  if (typeof node.prefecture === "string") nextContext.pref = node.prefecture;
  if (typeof node.name === "string") nextContext.name = node.name;
  if (typeof node.city === "string") nextContext.city = node.city;

  const lat =
    (typeof node.lat === "number" ? node.lat : null) ??
    (typeof node.latitude === "number" ? node.latitude : null);
  const lon =
    (typeof node.lon === "number" ? node.lon : null) ??
    (typeof node.lng === "number" ? node.lng : null) ??
    (typeof node.longitude === "number" ? node.longitude : null);

  const intensity =
    node.maxi ?? node.intensity ?? node.si ?? node.shindo ?? node.maxIntensity;

  const name =
    node.name ?? node.city ?? node.municipality ?? node.station ?? node.addr ?? node.anm ?? null;

  if (isFiniteNumber(lat) && isFiniteNumber(lon) && intensity != null) {
    points.push({
      lat,
      lon,
      intensity: String(intensity).trim(),
      name: typeof name === "string" ? name : (nextContext.city || nextContext.name || ""),
      pref: nextContext.pref || ""
    });
  }

  for (const v of Object.values(node)) collectPointsDeep(v, points, nextContext);
}

async function run() {
  const listRes = await fetch(LIST_URL, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; EarthquakesJP/1.0)" }
  });
  if (!listRes.ok) throw new Error(`HTTP ${listRes.status} sur ${LIST_URL}`);
  const list = await listRes.json();

  const target = (Array.isArray(list) ? list : []).find((q) => q?.json);

  if (!target) {
    fs.writeFileSync("quake.geojson", JSON.stringify({
      type: "FeatureCollection",
      metadata: { lastUpdate: new Date().toISOString(), source: "JMA", error: "No target event" },
      features: []
    }, null, 2));
    fs.writeFileSync("data.json", JSON.stringify({
      lastUpdate: new Date().toISOString(),
      source: "JMA",
      pointsCount: 0,
      error: "No target event in list.json"
    }, null, 2));
    return;
  }

  const detailUrl = normalizeDetailUrl(target.json);
  if (!detailUrl) throw new Error("detailUrl introuvable");

  const detailRes = await fetch(detailUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; EarthquakesJP/1.0)" }
  });
  if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status} sur ${detailUrl}`);
  const detail = await detailRes.json();

  const rawPoints = [];
  collectPointsDeep(detail, rawPoints);

  const uniq = new Map();
  for (const p of rawPoints) {
    const key = `${p.lat.toFixed(5)},${p.lon.toFixed(5)},${p.intensity},${p.name}`;
    if (!uniq.has(key)) uniq.set(key, p);
  }

  const points = Array.from(uniq.values())
    .filter((p) => intensityRank(p.intensity) > 0)
    .sort((a, b) => intensityRank(b.intensity) - intensityRank(a.intensity));

  const geojson = {
    type: "FeatureCollection",
    metadata: {
      lastUpdate: new Date().toISOString(),
      source: "JMA bosai quake detail json",
      at: target.at || "",
      anm: target.anm || "",
      mag: target.mag || "",
      maxIntensity: target.maxi || "",
      ttl: target.ttl || "",
      detailUrl
    },
    features: points.map((p) => ({
      type: "Feature",
      properties: { intensity: p.intensity, name: p.name, pref: p.pref },
      geometry: { type: "Point", coordinates: [p.lon, p.lat] }
    }))
  };

  fs.writeFileSync("quake.geojson", JSON.stringify(geojson, null, 2), "utf-8");
  fs.writeFileSync("data.json", JSON.stringify({
    lastUpdate: geojson.metadata.lastUpdate,
    source: geojson.metadata.source,
    event: geojson.metadata,
    pointsCount: geojson.features.length
  }, null, 2), "utf-8");

  console.log(`OK: ${geojson.features.length} points écrits`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
