const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectRoot, "dist");
const legacyDirectories = ["assets", "css", "icons", "js"];
const legacyFiles = [
  "_headers",
  "app.js",
  "manifest.webmanifest",
  "service-worker.js",
];

for (const directory of legacyDirectories) {
  fs.cpSync(path.join(projectRoot, directory), path.join(outputDirectory, directory), {
    recursive: true,
  });
}

for (const file of legacyFiles) {
  fs.copyFileSync(path.join(projectRoot, file), path.join(outputDirectory, file));
}

console.log("Legacy calculator pages copied to dist.");
