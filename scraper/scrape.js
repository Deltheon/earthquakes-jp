import fs from "node:fs";

const LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";
const BASE = "https://www.jma.go.jp/bosai/quake/data/";

// 1) Télécharger la liste JMA
const list = await (await fetch(LIST_URL)).json();

// 2) Filtrer pour enlever les entrées "bizarres" (Max ? / magnitude vide / 速報)
const usable = list.filter((e) => {
  const ttl = String(e.ttl || "");
  const mag = String(e.mag ?? "").trim();
  const maxi = String(e.maxi ?? "").trim();

  // On enlève les "速報" (ex: 震度速報) car souvent pas complet pour notre UI
  if (ttl.includes("速報")) return false;

  // On enlève les magnitudes absentes / inconnues
  if (!mag || mag === "?") return false;

  // On enlève les intensités inconnues
  if (!maxi || maxi === "?") return false;

  // Si pas de fichier détail, inutile
  if (!e.json) return false;

  return true;
});

// 3) Garder les 30 derniers événements "utilisables"
const events = usable.slice(0, 30).map((e) => {
  const f = String(e.json || "").trim();

  // Construire la vraie URL du détail
  const detailUrl =
    f.startsWith("http")
      ? f
      : BASE + f.replace(/^data\//, "");

  return {
    id: f,                 // identifiant unique
    time: e.at || "",
    region: e.anm || "",
    regionEn: e.en_anm || null,
    magnitude: e.mag ?? null,
    maxIntensity: e.maxi ?? "",
    title: e.ttl || "",
    detailUrl
  };
});

// 4) Écrire events.json à la racine du repo
fs.writeFileSync(
  "events.json",
  JSON.stringify(
    {
      lastUpdate: new Date().toISOString(),
      source: "JMA list.json",
      totalInList: Array.isArray(list) ? list.length : null,
      totalUsable: usable.length,
      events
    },
    null,
    2
  ),
  "utf-8"
);

console.log("events.json written:", events.length, "usable:", usable.length);
