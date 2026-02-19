import fs from "node:fs";

const LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";
const BASE = "https://www.jma.go.jp/bosai/quake/data/";

const list = await (await fetch(LIST_URL)).json();

const events = list.slice(0, 30).map((e) => {
  const detailFile = e.json || "";
  const detailUrl =
    detailFile.startsWith("http")
      ? detailFile
      : BASE + detailFile.replace(/^data\//, "");

  return {
    id: detailFile,
    time: e.at || "",
    region: e.anm || "",
    magnitude: e.mag ?? null,
    maxIntensity: e.maxi ?? "",
    title: e.ttl || "",
    detailUrl
  };
});

fs.writeFileSync(
  "events.json",
  JSON.stringify(
    { lastUpdate: new Date().toISOString(), source: "JMA list.json", events },
    null,
    2
  )
);

// on garde ces fichiers pour que ton workflow reste simple
fs.writeFileSync("data.json", JSON.stringify({ ok: true }, null, 2));
fs.writeFileSync("quake.geojson", JSON.stringify({ type: "FeatureCollection", features: [] }, null, 2));

console.log("events.json written:", events.length);
