import fs from "node:fs";

const LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

// Convertit les intensités en ordre (pour trier / colorer)
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

/**
 * Extraction "robuste" des points:
 * On parcourt l'objet JSON et on collecte tout objet qui ressemble à:
 * - a lat/lon (ou latitude/longitude)
 * - a une intensité (maxi/intensity/...)
 * - a un nom (name/city/...)
 *
 * Les noms exacts des champs peuvent varier selon les bulletins.
 */
function collectPointsDeep(node, points, context = {}) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const it of node) collectPointsDeep(it, points, context);
    return;
  }

  if (typeof node !== "object") return;

  // Contexte hiérarchique possible
  const nextContext = { ...context };
  if (typeof node.pref === "string") nextContext.pref = node.pref;
  if (typeof node.prefecture === "string") nextContext.pref = node.prefecture;
  if (typeof node.name === "string") nextContext.name = node.name;
  if (typeof node.city === "string") nextContext.city = node.city;
  if (typeof node.municipality === "string") nextContext.city = node.municipality;

  // lat/lon possibles
  const lat =
    (typeof node.lat === "number" ? node.lat : null) ??
    (typeof node.latitude === "number" ? node.latitude : null);
  const lon =
    (typeof node.lon === "number" ? node.lon : null) ??
    (typeof node.lng === "number" ? node.lng : null) ??
    (typeof node.longitude === "number" ? node.longitude : null);

  // intensité possibles
  const intensity =
    node.maxi ?? node.intensity ?? node.si ?? node.shindo ?? node.maxIntensity;

  const name =
    node.name ??
    node.city ??
    node.municipality ??
    node.station ??
    node.addr ??
    node.anm ??
    null;

  if (isFiniteNumber(lat) && isFiniteNumber(lon) && intensity != null) {
    points.push({
      lat,
      lon,
      intensity: String(intensity).trim(),
      name: typeof name === "string" ? name : (nextContext.city || nextContext.name || ""),
      pref: nextContext.pref || ""
    });
  }

  for (const [k, v] of Object.entries(node)) {
    collectPointsDeep(v, points, nextContext);
  }
}

async function run() {
  const listRes = await fetch(LIST_URL, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; EarthquakesJP/1.0)" }
  });
  if (!listRes.ok) throw new Error(`HTTP ${listRes.status} sur ${LIST_URL}`);
  const list = await listRes.json();

  // On prend l'entrée la plus récente de type "震源・震度情報"
  const target = (Array.isArray(list) ? list : [])
    .find((q) => q?.ttl === "震源・震度情報" && typeof q?.json === "string");

  if (!target) throw new Error("Aucun événement '震源・震度情報' trouvé dans list.json");

  const detailUrl = target.json;
  const detailRes = await fetch(detailUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; EarthquakesJP/1.0)" }
  });
  if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status} sur ${detailUrl}`);
  const detail = await detailRes.json();

  const rawPoints = [];
  collectPointsDeep(detail, rawPoints);

  // Nettoyage, suppression doublons basiques
  const uniq = new Map();
  for (const p of rawPoints) {
    const key = `${p.lat.toFixed(5)},${p.lon.toFixed(5)},${p.intensity},${p.name}`;
    if (!uniq.has(key)) uniq.set(key, p);
  }

  const points = Array.from(uniq.values())
    .filter((p) => intensityRank(p.intensity) > 0)
    .sort((a, b) => intensityRank(b.intensity) - intensityRank(a.intensity));

  // GeoJSON
  const geojson = {
    type: "FeatureCollection",
    metadata: {
      lastUpdate: new Date().toISOString(),
      source: "JMA bosai quake detail json",
      title: target.ttl || "",
      at: target.at || "",
      anm: target.anm || "",
      mag: target.mag || "",
      maxIntensity: target.maxi || "",
      detailUrl
    },
    features: points.map((p) => ({
      type: "Feature",
      properties: {
        intensity: p.intensity,
        name: p.name,
        pref: p.pref
      },
      geometry: {
        type: "Point",
        coordinates: [p.lon, p.lat]
      }
    }))
  };

  fs.writeFileSync("quake.geojson", JSON.stringify(geojson, null, 2), "utf-8");

  // Petit résumé en data.json pour affichage texte rapide si tu veux
  const out = {
    lastUpdate: geojson.metadata.lastUpdate,
    source: geojson.metadata.source,
    event: geojson.metadata,
    pointsCount: geojson.features.length
  };
  fs.writeFileSync("data.json", JSON.stringify(out, null, 2), "utf-8");

  console.log(`OK: ${geojson.features.length} points écrits dans quake.geojson`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
