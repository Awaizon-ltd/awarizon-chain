import {
  createSpinner,
  deployContract,
  getDeployment,
  withSpinner
} from "./chunk-R6I7FBSK.mjs";
import {
  getArtifactsDir,
  getCargoBin,
  getCargoPath,
  getRustupPath,
  getTypechainDir
} from "./chunk-X6DJQO5Q.mjs";
import {
  logger
} from "./chunk-CVC5SH36.mjs";

// src/config/types.ts
function defineConfig(config) {
  return config;
}

// src/env/check.ts
import { execSync } from "child_process";
import fs from "fs";
function checkEnv() {
  const extendedPath = `${getCargoBin()}:${process.env.PATH ?? ""}`;
  const rustup = checkCommand("rustup --version", extendedPath) || fs.existsSync(getRustupPath());
  const cargo = checkCommand("cargo --version", extendedPath) || fs.existsSync(getCargoPath());
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
    const output = execSync(cmd, {
      stdio: "pipe",
      env: { ...process.env, PATH: extendedPath }
    }).toString();
    if (grep) return output.includes(grep);
    return true;
  } catch {
    return false;
  }
}

// src/env/install.ts
import { execSync as execSync2 } from "child_process";
import https from "https";
import fs2 from "fs";
import path from "path";
import os from "os";
function addCargoToPath() {
  const cargoBin = getCargoBin();
  if (!process.env.PATH?.includes(cargoBin)) {
    process.env.PATH = `${cargoBin}:${process.env.PATH ?? ""}`;
  }
}
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs2.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const location = response.headers.location;
        if (!location) {
          reject(new Error("Redirect with no location"));
          return;
        }
        downloadFile(location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs2.unlink(dest, () => {
      });
      reject(err);
    });
  });
}
async function installRustup() {
  const isWindows = process.platform === "win32";
  if (isWindows) {
    const tmpPath = path.join(os.tmpdir(), "rustup-init.exe");
    await downloadFile("https://win.rustup.rs/x86_64", tmpPath);
    fs2.chmodSync(tmpPath, "755");
    execSync2(
      `"${tmpPath}" -y --default-toolchain stable --profile minimal`,
      { stdio: "pipe" }
    );
  } else {
    execSync2(
      'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal',
      { stdio: "pipe", shell: "/bin/sh" }
    );
  }
  addCargoToPath();
}
function installWasm32() {
  execSync2(
    `${getRustupPath()} target add wasm32-unknown-unknown`,
    {
      stdio: "pipe",
      env: { ...process.env, PATH: `${getCargoBin()}:${process.env.PATH ?? ""}` }
    }
  );
}
function installCargoContract() {
  execSync2(`${getCargoPath()} install cargo-contract --force`, {
    stdio: "pipe",
    env: { ...process.env, PATH: `${getCargoBin()}:${process.env.PATH ?? ""}` }
  });
}
async function ensureEnvironment() {
  const status = checkEnv();
  if (status.allReady) {
    addCargoToPath();
    return;
  }
  logger.blank();
  logger.header("ENVIRONMENT SETUP");
  logger.info("Setting up Kendra environment...");
  logger.dim("This only happens once. Future runs will be instant.");
  logger.blank();
  if (!status.rustup || !status.cargo) {
    await withSpinner(
      "Installing Rust toolchain...",
      async () => {
        await installRustup();
      },
      "Rust toolchain installed \u2713"
    );
  }
  if (!status.wasm32Target) {
    await withSpinner(
      "Adding WebAssembly target...",
      async () => {
        installWasm32();
      },
      "WebAssembly target ready \u2713"
    );
  }
  if (!status.cargoContract) {
    await withSpinner(
      "Installing ink! compiler (cargo-contract)... This takes 2-3 minutes on first install.",
      async () => {
        installCargoContract();
      },
      "ink! compiler installed \u2713"
    );
  }
  addCargoToPath();
  logger.blank();
  logger.success("Kendra environment ready!");
  logger.blank();
}

// src/compiler/ink.ts
import { spawn } from "child_process";
import path2 from "path";
import fs3 from "fs-extra";
async function compileContract(contractDir, contractName, options = {}) {
  const cargoToml = path2.join(contractDir, "Cargo.toml");
  if (!fs3.existsSync(cargoToml)) {
    throw new Error(`No Cargo.toml found at ${contractDir}`);
  }
  const artifactsDir = getArtifactsDir();
  await fs3.ensureDir(artifactsDir);
  logger.step(`Compiling ${contractName}...`);
  await new Promise((resolve, reject) => {
    const args = ["contract", "build"];
    if (options.optimization !== false) {
      args.push("--release");
    }
    const child = spawn(path2.join(getCargoBin(), "cargo"), args, {
      cwd: contractDir,
      env: {
        ...process.env,
        PATH: `${getCargoBin()}:${process.env.PATH ?? ""}`
      },
      stdio: "inherit"
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Compilation failed with exit code ${code}`));
    });
  });
  const targetDir = path2.join(contractDir, "target", "ink");
  const wasmFiles = fs3.readdirSync(targetDir).filter((f) => f.endsWith(".wasm"));
  if (wasmFiles.length === 0) {
    throw new Error("No .wasm file found after compilation");
  }
  const wasmFile = wasmFiles[0];
  const baseName = wasmFile.replace(".wasm", "");
  const sourceWasm = path2.join(targetDir, wasmFile);
  const sourceMetadata = path2.join(targetDir, `${baseName}.json`);
  const destWasm = path2.join(artifactsDir, `${contractName}.wasm`);
  const destMetadata = path2.join(artifactsDir, `${contractName}.json`);
  await fs3.copy(sourceWasm, destWasm);
  await fs3.copy(sourceMetadata, destMetadata);
  logger.success(`Compiled: artifacts/${contractName}.wasm`);
  logger.success(`Metadata: artifacts/${contractName}.json`);
  return {
    contractName,
    wasmPath: destWasm,
    metadataPath: destMetadata,
    abiPath: destMetadata
  };
}
function readABI(contractName) {
  const metadataPath = path2.join(getArtifactsDir(), `${contractName}.json`);
  if (!fs3.existsSync(metadataPath)) {
    throw new Error(
      `No compiled metadata found for ${contractName}. Run "kendra compile" first.`
    );
  }
  return fs3.readJsonSync(metadataPath);
}

// src/typechain/generator.ts
import path3 from "path";
import fs4 from "fs-extra";
function mapType(inkType) {
  const typeMap = {
    u8: "number",
    u16: "number",
    u32: "number",
    u64: "bigint",
    u128: "bigint",
    i8: "number",
    i16: "number",
    i32: "number",
    i64: "bigint",
    i128: "bigint",
    bool: "boolean",
    String: "string",
    AccountId: "string",
    Balance: "bigint",
    Hash: "string",
    "()": "void"
  };
  return typeMap[inkType] ?? "unknown";
}
function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function camelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
async function generateTypechain(contractName, metadataPath) {
  const metadata = await fs4.readJson(metadataPath);
  const className = capitalise(camelCase(contractName));
  const typechainDir = getTypechainDir();
  await fs4.ensureDir(typechainDir);
  const messages = metadata.spec.messages ?? [];
  const constructors = metadata.spec.constructors ?? [];
  const queryMethods = messages.filter((m) => !m.mutates).map((m) => {
    const params = m.args.map((a) => `${camelCase(a.label)}: ${mapType(a.type.type)}`).join(", ");
    const returnType = m.returnType ? mapType(m.returnType.type) : "void";
    return `  ${camelCase(m.label)}(${params}): Promise<${returnType}>`;
  }).join("\n");
  const txMethods = messages.filter((m) => m.mutates).map((m) => {
    const params = m.args.map((a) => `${camelCase(a.label)}: ${mapType(a.type.type)}`).join(", ");
    return `  ${camelCase(m.label)}(${params}): Promise<TxResult>`;
  }).join("\n");
  const constructorParams = constructors[0]?.args.map((a) => `${camelCase(a.label)}: ${mapType(a.type.type)}`).join(", ") ?? "";
  const output = `// Auto-generated by Kendra
// Contract: ${contractName} v${metadata.contract.version}
// Do not edit manually \u2014 regenerate with: kendra compile

import type { TxResult } from '@awarizon/core'

export interface ${className}Query {
${queryMethods || "  // No query methods"}
}

export interface ${className}Tx {
${txMethods || "  // No tx methods"}
}

export interface ${className} {
  address: string
  query: ${className}Query
  tx: ${className}Tx
}

export interface ${className}DeployResult {
  contract: ${className}
  address: string
  hash: string
  blockNumber: number
}

export type Deploy${className} = (
  params: { ${constructorParams} },
  options?: { gasLimit?: bigint; value?: bigint }
) => Promise<${className}DeployResult>
`;
  const outPath = path3.join(typechainDir, `${className}.ts`);
  await fs4.writeFile(outPath, output);
  logger.success(`TypeChain: typechain/${className}.ts`);
}

// src/index.ts
var kendra = {
  async getAccounts() {
    const { AwarizonKeyring } = await import("@awarizon/core");
    const keyring = new AwarizonKeyring();
    await keyring.initialize();
    const DEV_MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
    return ["//Alice", "//Bob", "//Charlie"].map(
      (p) => keyring.fromMnemonic(DEV_MNEMONIC + p)
    );
  },
  async deploy(contractName, constructorArgs, options) {
    const { deployContract: _deploy } = await import("./deployer-OT7B6TE3.mjs");
    const { loadConfig, getNetwork } = await import("./loader-V375LZJL.mjs");
    const pathMod = await import("path");
    const { getArtifactsDir: getArtifactsDir2 } = await import("./paths-PPVNQR45.mjs");
    const config = await loadConfig();
    const networkName = options.network ?? config.defaultNetwork ?? "local";
    const network = getNetwork(config, networkName);
    const wasmPath = pathMod.join(getArtifactsDir2(), `${contractName}.wasm`);
    const metadataPath = pathMod.join(getArtifactsDir2(), `${contractName}.json`);
    return _deploy({
      contractName,
      wasmPath,
      metadataPath,
      constructorArgs,
      network,
      networkName
    });
  }
};
export {
  checkEnv,
  compileContract,
  createSpinner,
  defineConfig,
  deployContract,
  ensureEnvironment,
  generateTypechain,
  getDeployment,
  kendra,
  logger,
  readABI,
  withSpinner
};
//# sourceMappingURL=index.mjs.map