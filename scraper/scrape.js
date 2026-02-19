import fs from "node:fs";

fs.writeFileSync("data.json", JSON.stringify({ ok: true }, null, 2));
fs.writeFileSync("quake.geojson", JSON.stringify({ type:"FeatureCollection", features:[] }, null, 2));
fs.writeFileSync("jma_detail.json", JSON.stringify({ test:true }, null, 2));

console.log("Files created");
