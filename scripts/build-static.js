const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectRoot, "dist");
const staticDirectories = ["assets", "css", "icons", "js"];
const staticFiles = ["app.js", "manifest.webmanifest", "service-worker.js", "_headers"];

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

for (const directory of staticDirectories) {
  fs.cpSync(path.join(projectRoot, directory), path.join(outputDirectory, directory), {
    recursive: true,
  });
}

for (const file of staticFiles) {
  fs.copyFileSync(path.join(projectRoot, file), path.join(outputDirectory, file));
}

for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
  if (entry.isFile() && path.extname(entry.name) === ".html") {
    fs.copyFileSync(path.join(projectRoot, entry.name), path.join(outputDirectory, entry.name));
  }
}

console.log(`Static site built in ${outputDirectory}`);

