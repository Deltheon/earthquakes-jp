import fs from "node:fs";

console.log("SCRAPER RUNNING");

const out = {
  lastUpdate: new Date().toISOString(),
  items: [
    {
      title: "AUTO UPDATE WORKS",
      magnitude: 9.9,
      place: "GitHub Actions",
      url: "https://github.com"
    }
  ]
};

fs.writeFileSync("data.json", JSON.stringify(out, null, 2));

console.log("data.json updated successfully");
