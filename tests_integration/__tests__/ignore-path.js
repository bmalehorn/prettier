"use strict";

const runPrettier = require("../runPrettier");

describe("ignore path", () => {
  runPrettier("cli/ignore-path/ignore-regular", [
    "**/*.js",
    "--ignore-path",
    ".gitignore",
    "-l"
  ]).test({
    status: 1
  });
});

describe("support .prettierignore", () => {
  runPrettier("cli/ignore-path/ignore-regular", ["**/*.js", "-l"]).test({
    status: 1
  });
});

describe("ignore file when using --debug-check", () => {
  runPrettier("cli/ignore-path/ignore-regular", [
    "**/*.js",
    "--debug-check"
  ]).test({
    status: 0
  });
});

describe("outputs files as-is if no --write", () => {
  runPrettier("cli/ignore-path/ignore-regular", ["regular-module.js"], {
    ignoreLineEndings: true
  }).test({
    status: 0
  });
});
