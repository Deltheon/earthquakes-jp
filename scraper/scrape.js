import fs from "node:fs";

const LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";
const BASE = "https://www.jma.go.jp/bosai/quake/data/";

const list = await (await fetch(LIST_URL)).json();
const detailFile = list[0].json;            // ex: "2026...json" (souvent relatif)
const detailUrl = detailFile.startsWith("http") ? detailFile : BASE + detailFile.replace(/^data\//, "");

const detail = await (await fetch(detailUrl)).json();
fs.writeFileSync("jma_detail.json", JSON.stringify(detail, null, 2));
console.log("Saved jma_detail.json from:", detailUrl);
