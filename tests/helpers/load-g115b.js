const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadScriptIntoContext(context, relativePath) {
  const absolutePath = path.resolve(__dirname, "..", "..", relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  vm.runInContext(source, context, { filename: absolutePath });
}

function createG115BContext() {
  const context = vm.createContext({
    window: {},
    console,
    Math,
    Number,
    Object,
    Array,
    String,
    Boolean,
    JSON,
  });

  context.window.window = context.window;

  loadScriptIntoContext(context, "js/g115b-core.js");
  loadScriptIntoContext(context, "js/performance-data.js");
  loadScriptIntoContext(context, "js/g115b-calculators.js");

  return context.window.G115B;
}

module.exports = {
  createG115BContext,
};
