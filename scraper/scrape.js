import fs from "node:fs";

const JMA_LIST = "https://www.jma.go.jp/bosai/quake/data/list.json";

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function run() {
  const res = await fetch(JMA_LIST, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; EarthquakesJP/1.0)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${JMA_LIST}`);

  const list = await res.json(); // tableau d'objets

  const items = (Array.isArray(list) ? list : [])
    .slice(0, 30)
    .map((q) => ({
      time: q.at || null,              // ex: 2026-02-19T10:00:00+09:00
      place: q.anm || "",              // nom de zone (JP)
      magnitude: toNumberOrNull(q.mag),
      maxIntensity: q.maxi ?? "",      // ex: "3", "5-", "6+"
      title: q.ttl || "Earthquake",
      detailJson: q.json || null,      // lien JSON de détail
      eventId: q.eid || null
    }));

  const out = {
    lastUpdate: new Date().toISOString(),
    source: "JMA bosai quake list.json",
    items
  };

  fs.writeFileSync("data.json", JSON.stringify(out, null, 2), "utf-8");
  console.log(`data.json updated: ${items.length} items`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
