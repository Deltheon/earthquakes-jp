import fs from "node:fs";

const out = {
  lastUpdate: new Date().toISOString(),
  items: [
    {
      title: "Test auto update",
      magnitude: 1.0,
      place: "Pipeline OK",
      url: "https://deltheon.github.io/earthquakes-jp/"
    }
  ]
};

fs.writeFileSync("data.json", JSON.stringify(out, null, 2), "utf-8");
console.log("data.json updated");

