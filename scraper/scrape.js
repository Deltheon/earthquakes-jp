import fs from "node:fs";

const LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";
const BASE = "https://www.jma.go.jp/bosai/quake/data/";

// 1) Télécharger la liste JMA
const list = await (await fetch(LIST_URL)).json();

// 2) Garder les 30 derniers événements
const events = list.slice(0, 30).map((e) => {
  const f = e.json || "";

  // Construire la vraie URL du détail
  const detailUrl =
    f.startsWith("http")
      ? f
      : BASE + f.replace(/^data\//, "");

  return {
    id: f,
    time: e.at || "",
    region: e.anm || "",
    magnitude: e.mag ?? null,
    maxIntensity: e.maxi ?? "",
    title: e.ttl || "",
    detailUrl
  };
});

// 3) Écrire events.json à la racine du repo
fs.writeFileSync(
  "events.json",
  JSON.stringify(
    {
      lastUpdate: new Date().toISOString(),
      source: "JMA list.json",
      events
    },
    null,
    2
  ),
  "utf-8"
);

console.log("events.json written:", events.length);
