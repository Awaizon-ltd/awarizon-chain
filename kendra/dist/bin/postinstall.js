#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/env/check.ts
var import_child_process = require("child_process");
var import_fs = __toESM(require("fs"));

// src/utils/paths.ts
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
function getCargoHome() {
  return process.env.CARGO_HOME ?? import_path.default.join(import_os.default.homedir(), ".cargo");
}
function getCargoBin() {
  return import_path.default.join(getCargoHome(), "bin");
}
function getCargoPath() {
  return import_path.default.join(getCargoBin(), "cargo");
}
function getRustupPath() {
  return import_path.default.join(getCargoBin(), "rustup");
}

// src/env/check.ts
function checkEnv() {
  const extendedPath = `${getCargoBin()}:${process.env.PATH ?? ""}`;
  const rustup = checkCommand("rustup --version", extendedPath) || import_fs.default.existsSync(getRustupPath());
  const cargo = checkCommand("cargo --version", extendedPath) || import_fs.default.existsSync(getCargoPath());
  const wasm32Target = cargo && checkCommand(
    "rustup target list --installed",
    extendedPath,
    "wasm32-unknown-unknown"
  );
  const cargoContract = cargo && checkCommand("cargo contract --version", extendedPath);
  return {
    rustup,
    cargo,
    wasm32Target,
    cargoContract,
    allReady: rustup && cargo && wasm32Target && cargoContract
  };
}
function checkCommand(cmd, extendedPath, grep) {
  try {
    const output = (0, import_child_process.execSync)(cmd, {
      stdio: "pipe",
      env: { ...process.env, PATH: extendedPath }
    }).toString();
    if (grep) return output.includes(grep);
    return true;
  } catch {
    return false;
  }
}

// bin/postinstall.ts
async function postinstall() {
  const status = checkEnv();
  if (status.allReady) {
    return;
  }
  console.log(
    "\n  \x1B[33mKENDRA\x1B[0m \u2014 Awarizon Developer Toolchain\n  \x1B[2mRust will be installed automatically when\x1B[0m\n  \x1B[2myou first run: kendra compile\x1B[0m\n"
  );
}
postinstall().catch(() => {
});
//# sourceMappingURL=postinstall.js.map