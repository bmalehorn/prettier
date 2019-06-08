"use strict";

const ignore = require("ignore");
const fs = require("fs");
const os = require("os");
const path = require("path");
const mem = require("mem");
const isDirectory = require("../utils/is-directory");

class RecursiveIgnorer {
  constructor({ withNodeModules }) {
    this.withNodeModules = withNodeModules;

    // find the directory containing ".git",
    // stopping at $HOME or / if those are reached first
    const _repoRoot = dir => {
      if (
        // root directory, "/" or "C:\"
        path.dirname(dir) === dir ||
        // stop at $HOME
        dir === os.homedir() ||
        // stop at repo root
        isDirectory(path.join(dir, ".git")) ||
        isDirectory(path.join(dir, ".svn")) ||
        isDirectory(path.join(dir, ".hg"))
      ) {
        return dir;
      }
      return this.repoRoot(path.dirname(dir));
    };

    this.repoRoot = mem(_repoRoot);
    this.readIgnore = mem(this._readIgnore);
  }

  ignores(filePath) {
    filePath = path.resolve(filePath);
    const { withNodeModules } = this;
    const root = this.repoRoot(filePath);

    const relativePath = path.relative(root, filePath);
    return this.isIgnored({
      dir: root,
      relativePath,
      withNodeModules
    });
  }

  filter(filePaths) {
    return filePaths.filter(filePath => !this.ignores(filePath));
  }

  _readIgnore(ignoreFile, withNodeModules) {
    let file;
    try {
      file = fs.readFileSync(ignoreFile, "utf8");
    } catch (err) {
      if (err.code === "ENOENT") {
        return null;
      }
      throw err;
    }
    const ign = ignore().add(file);
    if (!withNodeModules) {
      ign.add("node_modules");
    }
    return ign;
  }

  // https://github.com/isomorphic-git/isomorphic-git/blob/885db9c/src/managers/GitIgnoreManager.js
  isIgnored({ dir, relativePath, withNodeModules }) {
    // Find all the .prettierignore files that could affect this file
    const pairs = [
      {
        ignoreFile: path.join(dir, ".prettierignore"),
        filepath: relativePath
      }
    ];
    const pieces = relativePath.split(path.sep);
    for (let i = 1; i < pieces.length; i++) {
      const folder = pieces.slice(0, i).join(path.sep);
      const file = pieces.slice(i).join(path.sep);
      pairs.push({
        ignoreFile: path.join(dir, folder, ".prettierignore"),
        filepath: file
      });
    }
    let ignoredStatus = false;
    for (const { filepath, ignoreFile } of pairs) {
      const ign = this.readIgnore(ignoreFile, withNodeModules);
      if (!ign) {
        continue;
      }
      // If the parent directory is excluded, we are done.
      // "It is not possible to re-include a file if a parent directory of that file is excluded. Git doesn’t list excluded directories for performance reasons, so any patterns on contained files have no effect, no matter where they are defined."
      // source: https://git-scm.com/docs/gitignore
      const parentdir = path.dirname(filepath);
      if (parentdir !== "." && ign.ignores(parentdir)) {
        return true;
      }
      // If the file is currently ignored, test for UNignoring.
      if (ignoredStatus) {
        ignoredStatus = !ign.test(filepath).unignored;
      } else {
        ignoredStatus = ign.test(filepath).ignored;
      }
    }
    return ignoredStatus;
  }
}

module.exports = RecursiveIgnorer;
