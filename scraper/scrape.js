import fs from "node:fs";

const LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";
const BASE = "https://www.jma.go.jp/bosai/quake/data/";

// 1) Télécharger la liste JMA
const list = await (await fetch(LIST_URL)).json();

// 2) Prendre le dernier événement
const detailFile = list[0].json;

// 3) Construire la vraie URL
const detailUrl =
  detailFile.startsWith("http")
    ? detailFile
    : BASE + detailFile.replace(/^data\//, "");

// 4) Télécharger le détail
const detail = await (await fetch(detailUrl)).json();

// 5) Sauvegarder pour inspection
fs.writeFileSync("jma_detail.json", JSON.stringify(detail, null, 2));

// fichiers temporaires pour ne pas casser le workflow
fs.writeFileSync("data.json", JSON.stringify({ ok:true }, null, 2));
fs.writeFileSync("quake.geojson", JSON.stringify({ type:"FeatureCollection", features:[] }, null, 2));

console.log("JMA detail saved:", detailUrl);
