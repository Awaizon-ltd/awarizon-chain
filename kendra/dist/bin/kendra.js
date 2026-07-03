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

// bin/kendra.ts
var import_commander = require("commander");

// src/env/install.ts
var import_child_process2 = require("child_process");
var import_https = __toESM(require("https"));
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_os2 = __toESM(require("os"));

// src/utils/logger.ts
var import_chalk = __toESM(require("chalk"));
var logger = {
  info: (msg) => console.log(import_chalk.default.cyan("\u2139"), msg),
  success: (msg) => console.log(import_chalk.default.green("\u2713"), import_chalk.default.green(msg)),
  warn: (msg) => console.log(import_chalk.default.yellow("\u26A0"), import_chalk.default.yellow(msg)),
  error: (msg) => console.log(import_chalk.default.red("\u2717"), import_chalk.default.red(msg)),
  step: (msg) => console.log(import_chalk.default.yellow("\u2192"), msg),
  header: (msg) => {
    console.log();
    console.log(import_chalk.default.bold.yellow("KENDRA") + import_chalk.default.dim(" // " + msg));
    console.log();
  },
  dim: (msg) => console.log(import_chalk.default.dim(msg)),
  code: (msg) => console.log(import_chalk.default.bgBlack.white(" " + msg + " ")),
  blank: () => console.log()
};

// src/utils/spinner.ts
var import_ora = __toESM(require("ora"));
var import_chalk2 = __toESM(require("chalk"));
function createSpinner(text) {
  return (0, import_ora.default)({
    text,
    color: "yellow",
    spinner: "dots"
  });
}
async function withSpinner(text, fn, successText) {
  const spinner = createSpinner(text);
  spinner.start();
  try {
    const result = await fn();
    spinner.succeed(import_chalk2.default.green(successText ?? text + " done"));
    return result;
  } catch (err) {
    spinner.fail(import_chalk2.default.red(err instanceof Error ? err.message : String(err)));
    throw err;
  }
}

// src/env/check.ts
var import_child_process = require("child_process");
var import_fs = __toESM(require("fs"));

// src/utils/paths.ts
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
function getProjectRoot() {
  return process.cwd();
}
function getArtifactsDir() {
  return import_path.default.join(getProjectRoot(), "artifacts");
}
function getDeploymentsDir() {
  return import_path.default.join(getProjectRoot(), "deployments");
}
function getTypechainDir() {
  return import_path.default.join(getProjectRoot(), "typechain");
}
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

// src/env/install.ts
function addCargoToPath() {
  const cargoBin = getCargoBin();
  if (!process.env.PATH?.includes(cargoBin)) {
    process.env.PATH = `${cargoBin}:${process.env.PATH ?? ""}`;
  }
}
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = import_fs2.default.createWriteStream(dest);
    import_https.default.get(url, (response) => {
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
      import_fs2.default.unlink(dest, () => {
      });
      reject(err);
    });
  });
}
async function installRustup() {
  const isWindows = process.platform === "win32";
  if (isWindows) {
    const tmpPath = import_path2.default.join(import_os2.default.tmpdir(), "rustup-init.exe");
    await downloadFile("https://win.rustup.rs/x86_64", tmpPath);
    import_fs2.default.chmodSync(tmpPath, "755");
    (0, import_child_process2.execSync)(
      `"${tmpPath}" -y --default-toolchain stable --profile minimal`,
      { stdio: "pipe" }
    );
  } else {
    (0, import_child_process2.execSync)(
      'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal',
      { stdio: "pipe", shell: "/bin/sh" }
    );
  }
  addCargoToPath();
}
function installWasm32() {
  (0, import_child_process2.execSync)(
    `${getRustupPath()} target add wasm32-unknown-unknown`,
    {
      stdio: "pipe",
      env: { ...process.env, PATH: `${getCargoBin()}:${process.env.PATH ?? ""}` }
    }
  );
}
function installCargoContract() {
  (0, import_child_process2.execSync)(`${getCargoPath()} install cargo-contract --force`, {
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

// src/commands/init.ts
var import_path3 = __toESM(require("path"));
var import_fs_extra = __toESM(require("fs-extra"));
var import_prompts = __toESM(require("prompts"));
var CONTRACT_TEMPLATE = `#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod {{name}} {
    #[ink(storage)]
    pub struct {{ClassName}} {
        value: u32,
    }

    impl {{ClassName}} {
        #[ink(constructor)]
        pub fn new(initial_value: u32) -> Self {
            Self { value: initial_value }
        }

        #[ink(message)]
        pub fn get(&self) -> u32 {
            self.value
        }

        #[ink(message)]
        pub fn set(&mut self, new_value: u32) {
            self.value = new_value;
        }
    }
}
`;
var CARGO_TEMPLATE = `[package]
name = "{{name}}"
version = "0.1.0"
edition = "2021"

[dependencies]
ink = { version = "5.0.0", default-features = false }

[dev-dependencies]
ink_e2e = { version = "5.0.0" }

[lib]
path = "lib.rs"

[features]
default = ["std"]
std = [
    "ink/std",
]
ink-as-dependency = []
e2e-tests = []
`;
var CONFIG_TEMPLATE = `import { defineConfig } from '@awarizon/kendra'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  networks: {
    local: {
      endpoint: 'ws://127.0.0.1:9944',
      accounts: ['//Alice'],
    },
    testnet: {
      endpoint: 'wss://testnet.awarizon.com',
      accounts: [process.env.DEPLOYER_MNEMONIC ?? ''],
    },
  },
  contracts: {
    {{ClassName}}: 'contracts/{{name}}',
  },
  compiler: {
    optimization: true,
  },
  typechain: {
    outDir: 'typechain',
  },
  defaultNetwork: 'local',
})
`;
var TEST_TEMPLATE = `import { kendra } from '@awarizon/kendra'

describe('{{ClassName}}', () => {
  it('should initialize with correct value', async () => {
    const [deployer] = await kendra.getAccounts()

    const contract = await kendra.deploy(
      '{{ClassName}}',
      [42],
      { signer: deployer }
    )

    const value = await contract.query.get()
    expect(value).toBe(42)
  })

  it('should update value', async () => {
    const [deployer] = await kendra.getAccounts()

    const contract = await kendra.deploy(
      '{{ClassName}}',
      [0],
      { signer: deployer }
    )

    await contract.tx.set(100)
    const value = await contract.query.get()
    expect(value).toBe(100)
  })
})
`;
var DEPLOY_SCRIPT_TEMPLATE = `import { kendra } from '@awarizon/kendra'

async function main() {
  const [deployer] = await kendra.getAccounts()

  console.log('Deploying with:', deployer.address)

  const contract = await kendra.deploy(
    '{{ClassName}}',
    [0],
    { signer: deployer }
  )

  console.log('Deployed to:', contract.address)
}

main().catch(console.error)
`;
var ENV_TEMPLATE = `# Awarizon Kendra Configuration
# Copy this to .env and fill in your values

DEPLOYER_MNEMONIC=your twelve word mnemonic phrase here
`;
function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function camelCase(str) {
  return str.replace(/[-_]([a-z])/g, (_, l) => l.toUpperCase());
}
async function initCommand(projectName) {
  logger.header("INIT");
  let name = projectName;
  if (!name) {
    const response = await (0, import_prompts.default)({
      type: "text",
      name: "name",
      message: "Project name:",
      initial: "my_contract",
      validate: (v) => /^[a-z][a-z0-9_-]*$/.test(v) || "Use lowercase letters, numbers, hyphens, underscores"
    });
    name = response.name;
  }
  if (!name) {
    logger.error("Project name is required");
    process.exit(1);
  }
  const className = capitalise(camelCase(name));
  const projectDir = import_path3.default.join(process.cwd(), name);
  if (await import_fs_extra.default.pathExists(projectDir)) {
    logger.error(`Directory "${name}" already exists`);
    process.exit(1);
  }
  const fill = (template) => template.replace(/\{\{name\}\}/g, name).replace(/\{\{ClassName\}\}/g, className);
  await import_fs_extra.default.ensureDir(import_path3.default.join(projectDir, "contracts", name));
  await import_fs_extra.default.ensureDir(import_path3.default.join(projectDir, "tests"));
  await import_fs_extra.default.ensureDir(import_path3.default.join(projectDir, "scripts"));
  await import_fs_extra.default.ensureDir(import_path3.default.join(projectDir, "artifacts"));
  await import_fs_extra.default.ensureDir(import_path3.default.join(projectDir, "deployments"));
  await import_fs_extra.default.ensureDir(import_path3.default.join(projectDir, "typechain"));
  await import_fs_extra.default.writeFile(
    import_path3.default.join(projectDir, "contracts", name, "lib.rs"),
    fill(CONTRACT_TEMPLATE)
  );
  await import_fs_extra.default.writeFile(
    import_path3.default.join(projectDir, "contracts", name, "Cargo.toml"),
    fill(CARGO_TEMPLATE)
  );
  await import_fs_extra.default.writeFile(import_path3.default.join(projectDir, "kendra.config.ts"), fill(CONFIG_TEMPLATE));
  await import_fs_extra.default.writeFile(
    import_path3.default.join(projectDir, "tests", `${name}.test.ts`),
    fill(TEST_TEMPLATE)
  );
  await import_fs_extra.default.writeFile(
    import_path3.default.join(projectDir, "scripts", "deploy.ts"),
    fill(DEPLOY_SCRIPT_TEMPLATE)
  );
  await import_fs_extra.default.writeFile(import_path3.default.join(projectDir, ".env.example"), ENV_TEMPLATE);
  await import_fs_extra.default.writeFile(
    import_path3.default.join(projectDir, ".gitignore"),
    [
      "node_modules/",
      ".env",
      "artifacts/",
      "typechain/",
      "target/",
      "deployments/*.json"
    ].join("\n")
  );
  await import_fs_extra.default.writeJson(
    import_path3.default.join(projectDir, "package.json"),
    {
      name,
      version: "0.1.0",
      private: true,
      scripts: {
        compile: "kendra compile",
        deploy: "kendra deploy",
        test: "kendra test",
        node: "kendra node"
      },
      dependencies: {
        "@awarizon/kendra": "latest",
        "@awarizon/core": "latest"
      },
      devDependencies: {
        typescript: "^5.0.0",
        "@types/node": "^20.0.0"
      }
    },
    { spaces: 2 }
  );
  logger.blank();
  logger.success(`Created project: ${name}/`);
  logger.blank();
  logger.dim("Project structure:");
  logger.dim(`  ${name}/`);
  logger.dim(`  \u251C\u2500\u2500 contracts/${name}/lib.rs    \u2190 Write your contract here`);
  logger.dim(`  \u251C\u2500\u2500 tests/${name}.test.ts`);
  logger.dim(`  \u251C\u2500\u2500 scripts/deploy.ts`);
  logger.dim(`  \u2514\u2500\u2500 kendra.config.ts`);
  logger.blank();
  logger.step("Next steps:");
  logger.code(`cd ${name}`);
  logger.code(`npm install`);
  logger.code(`kendra compile`);
  logger.blank();
}

// src/commands/compile.ts
var import_path7 = __toESM(require("path"));

// src/config/loader.ts
var import_path4 = __toESM(require("path"));
var import_fs3 = __toESM(require("fs"));
async function loadConfig() {
  const configPath = import_path4.default.join(process.cwd(), "kendra.config.ts");
  if (!import_fs3.default.existsSync(configPath)) {
    logger.error("kendra.config.ts not found in current directory.");
    logger.dim(
      'Run "kendra init" to create a new project, or make sure you are in the project root.'
    );
    process.exit(1);
  }
  try {
    const configModule = await import(`${configPath}?t=${Date.now()}`);
    const config = configModule.default ?? configModule;
    return config;
  } catch (err) {
    logger.error("Failed to load kendra.config.ts");
    logger.dim(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
function getNetwork(config, networkName) {
  const network = config.networks[networkName];
  if (!network) {
    logger.error(`Network "${networkName}" not found in config`);
    logger.dim(`Available networks: ${Object.keys(config.networks).join(", ")}`);
    process.exit(1);
  }
  return network;
}

// src/compiler/ink.ts
var import_child_process3 = require("child_process");
var import_path5 = __toESM(require("path"));
var import_fs_extra2 = __toESM(require("fs-extra"));
async function compileContract(contractDir, contractName, options = {}) {
  const cargoToml = import_path5.default.join(contractDir, "Cargo.toml");
  if (!import_fs_extra2.default.existsSync(cargoToml)) {
    throw new Error(`No Cargo.toml found at ${contractDir}`);
  }
  const artifactsDir = getArtifactsDir();
  await import_fs_extra2.default.ensureDir(artifactsDir);
  logger.step(`Compiling ${contractName}...`);
  await new Promise((resolve, reject) => {
    const args = ["contract", "build"];
    if (options.optimization !== false) {
      args.push("--release");
    }
    const child = (0, import_child_process3.spawn)(import_path5.default.join(getCargoBin(), "cargo"), args, {
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
  const targetDir = import_path5.default.join(contractDir, "target", "ink");
  const wasmFiles = import_fs_extra2.default.readdirSync(targetDir).filter((f) => f.endsWith(".wasm"));
  if (wasmFiles.length === 0) {
    throw new Error("No .wasm file found after compilation");
  }
  const wasmFile = wasmFiles[0];
  const baseName = wasmFile.replace(".wasm", "");
  const sourceWasm = import_path5.default.join(targetDir, wasmFile);
  const sourceMetadata = import_path5.default.join(targetDir, `${baseName}.json`);
  const destWasm = import_path5.default.join(artifactsDir, `${contractName}.wasm`);
  const destMetadata = import_path5.default.join(artifactsDir, `${contractName}.json`);
  await import_fs_extra2.default.copy(sourceWasm, destWasm);
  await import_fs_extra2.default.copy(sourceMetadata, destMetadata);
  logger.success(`Compiled: artifacts/${contractName}.wasm`);
  logger.success(`Metadata: artifacts/${contractName}.json`);
  return {
    contractName,
    wasmPath: destWasm,
    metadataPath: destMetadata,
    abiPath: destMetadata
  };
}

// src/typechain/generator.ts
var import_path6 = __toESM(require("path"));
var import_fs_extra3 = __toESM(require("fs-extra"));
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
function capitalise2(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function camelCase2(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
async function generateTypechain(contractName, metadataPath) {
  const metadata = await import_fs_extra3.default.readJson(metadataPath);
  const className = capitalise2(camelCase2(contractName));
  const typechainDir = getTypechainDir();
  await import_fs_extra3.default.ensureDir(typechainDir);
  const messages = metadata.spec.messages ?? [];
  const constructors = metadata.spec.constructors ?? [];
  const queryMethods = messages.filter((m) => !m.mutates).map((m) => {
    const params = m.args.map((a) => `${camelCase2(a.label)}: ${mapType(a.type.type)}`).join(", ");
    const returnType = m.returnType ? mapType(m.returnType.type) : "void";
    return `  ${camelCase2(m.label)}(${params}): Promise<${returnType}>`;
  }).join("\n");
  const txMethods = messages.filter((m) => m.mutates).map((m) => {
    const params = m.args.map((a) => `${camelCase2(a.label)}: ${mapType(a.type.type)}`).join(", ");
    return `  ${camelCase2(m.label)}(${params}): Promise<TxResult>`;
  }).join("\n");
  const constructorParams = constructors[0]?.args.map((a) => `${camelCase2(a.label)}: ${mapType(a.type.type)}`).join(", ") ?? "";
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
  const outPath = import_path6.default.join(typechainDir, `${className}.ts`);
  await import_fs_extra3.default.writeFile(outPath, output);
  logger.success(`TypeChain: typechain/${className}.ts`);
}

// src/commands/compile.ts
async function compileCommand(contractName) {
  logger.header("COMPILE");
  const config = await loadConfig();
  const contractsToCompile = contractName ? { [contractName]: config.contracts[contractName] } : config.contracts;
  if (Object.keys(contractsToCompile).length === 0) {
    logger.error("No contracts found in kendra.config.ts");
    process.exit(1);
  }
  const results = [];
  for (const [name, contractPath] of Object.entries(contractsToCompile)) {
    if (!contractPath) continue;
    const fullPath = import_path7.default.isAbsolute(contractPath) ? contractPath : import_path7.default.join(process.cwd(), contractPath);
    const result = await compileContract(fullPath, name, config.compiler);
    await generateTypechain(name, result.metadataPath);
    results.push(result);
  }
  logger.blank();
  logger.success(`Compiled ${results.length} contract(s) successfully`);
}

// src/commands/deploy.ts
var import_path9 = __toESM(require("path"));
var import_fs_extra5 = __toESM(require("fs-extra"));

// src/deployer/index.ts
var import_fs_extra4 = __toESM(require("fs-extra"));
var import_path8 = __toESM(require("path"));
var import_api_contract = require("@polkadot/api-contract");
var import_core = require("@awarizon/core");
var import_core2 = require("@awarizon/core");
var DEV_MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
async function deployContract(params) {
  const { contractName, wasmPath, metadataPath, constructorArgs, network, networkName } = params;
  const wasm = await import_fs_extra4.default.readFile(wasmPath);
  const abi = await import_fs_extra4.default.readJson(metadataPath);
  const keyring = new import_core2.AwarizonKeyring();
  await keyring.initialize();
  const mnemonic = network.accounts[0];
  if (!mnemonic) {
    throw new Error("No accounts configured for network " + networkName);
  }
  const pair = mnemonic.startsWith("//") ? keyring.fromMnemonic(DEV_MNEMONIC + mnemonic) : keyring.fromMnemonic(mnemonic);
  logger.step(`Deploying ${contractName} to ${networkName}`);
  logger.dim(`Deployer: ${pair.address}`);
  logger.dim(`Endpoint: ${network.endpoint}`);
  const core = await (0, import_core.createCore)({ endpoint: network.endpoint });
  const api = core.getApi();
  const deployResult = await withSpinner(
    `Deploying ${contractName}...`,
    async () => {
      const code = new import_api_contract.CodePromise(api, abi, wasm);
      const gasLimit = params.gasLimit ?? BigInt(3e10);
      const tx = code.tx["new"](
        { gasLimit, value: params.value ?? 0n },
        ...constructorArgs
      );
      return new Promise((resolve, reject) => {
        let unsubFn = null;
        const finish = (result) => {
          if (unsubFn) unsubFn();
          if (result instanceof Error) reject(result);
          else resolve(result);
        };
        tx.signAndSend(pair, (res) => {
          if (res.dispatchError) {
            if (res.dispatchError.isModule) {
              const decoded = api.registry.findMetaError(
                res.dispatchError.asModule
              );
              finish(
                new Error(
                  `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`
                )
              );
            } else {
              finish(new Error(res.dispatchError.toString()));
            }
            return;
          }
          if (res.status.isInBlock || res.status.isFinalized) {
            const blockHash = res.status.isInBlock ? res.status.asInBlock : res.status.asFinalized;
            let address = "";
            for (const { event } of res.events) {
              if (api.events.contracts?.Instantiated?.is(event)) {
                address = event.data[1]?.toString() ?? "";
              }
            }
            ;
            api.rpc.chain.getBlock(blockHash).then((block) => {
              const blockNumber = block.block.header.number.toNumber();
              finish({
                contractName,
                address,
                hash: blockHash.toHex(),
                blockNumber,
                network: networkName,
                deployedAt: Date.now(),
                deployer: pair.address
              });
            });
          }
        }).then((unsub) => {
          unsubFn = unsub;
        });
      });
    },
    `Deployed to ${networkName} \u2713`
  );
  await core.disconnect();
  await saveDeployment(deployResult);
  logger.blank();
  logger.success(`Contract address: ${deployResult.address}`);
  logger.success(`Block: #${deployResult.blockNumber}`);
  return deployResult;
}
async function saveDeployment(result) {
  const deploymentsDir = getDeploymentsDir();
  await import_fs_extra4.default.ensureDir(deploymentsDir);
  const filePath = import_path8.default.join(deploymentsDir, `${result.network}.json`);
  let existing = {};
  if (await import_fs_extra4.default.pathExists(filePath)) {
    existing = await import_fs_extra4.default.readJson(filePath);
  }
  existing[result.contractName] = result;
  await import_fs_extra4.default.writeJson(filePath, existing, { spaces: 2 });
  logger.dim(`Deployment saved: deployments/${result.network}.json`);
}

// src/commands/deploy.ts
async function deployCommand(options) {
  logger.header("DEPLOY");
  const config = await loadConfig();
  const networkName = options.network ?? config.defaultNetwork ?? "local";
  const network = getNetwork(config, networkName);
  const contractName = options.contract ?? Object.keys(config.contracts)[0];
  if (!contractName) {
    logger.error("No contracts in config");
    process.exit(1);
  }
  const wasmPath = import_path9.default.join(getArtifactsDir(), `${contractName}.wasm`);
  const metadataPath = import_path9.default.join(getArtifactsDir(), `${contractName}.json`);
  if (!import_fs_extra5.default.existsSync(wasmPath)) {
    logger.error(
      `No compiled contract found for ${contractName}. Run "kendra compile" first.`
    );
    process.exit(1);
  }
  logger.info(`Deploying ${contractName} to ${networkName}`);
  logger.dim(`Endpoint: ${network.endpoint}`);
  await deployContract({
    contractName,
    wasmPath,
    metadataPath,
    constructorArgs: [],
    network,
    networkName
  });
}

// src/commands/node.ts
var import_child_process4 = require("child_process");
var import_path10 = __toESM(require("path"));
var import_fs4 = __toESM(require("fs"));
async function nodeCommand() {
  logger.header("LOCAL NODE");
  const possiblePaths = [
    import_path10.default.join(__dirname, "../../target/release/awarizon-node"),
    "awarizon-node"
  ];
  const nodeBin = possiblePaths.find((p) => p === "awarizon-node" || import_fs4.default.existsSync(p));
  if (!nodeBin) {
    logger.error("awarizon-node binary not found");
    logger.dim(
      "Download the Awarizon node binary or build it from source at https://github.com/awarizon/chain"
    );
    process.exit(1);
  }
  logger.info("Starting local Awarizon development node...");
  logger.dim("RPC: ws://127.0.0.1:9944");
  logger.dim("Press Ctrl+C to stop");
  logger.blank();
  const child = (0, import_child_process4.spawn)(
    nodeBin,
    ["--dev", "--base-path", "/tmp/awarizon-kendra-dev", "--rpc-cors", "all"],
    { stdio: "inherit" }
  );
  process.on("SIGINT", () => {
    child.kill();
    process.exit(0);
  });
  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

// src/commands/accounts.ts
var import_core3 = require("@awarizon/core");
var DEV_ACCOUNTS = ["//Alice", "//Bob", "//Charlie", "//Dave", "//Eve", "//Ferdie"];
var DEV_MNEMONIC2 = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
async function accountsCommand(subcommand) {
  logger.header("ACCOUNTS");
  const keyring = new import_core3.AwarizonKeyring();
  await keyring.initialize();
  if (!subcommand || subcommand === "list") {
    logger.info("Development accounts:");
    logger.blank();
    for (const account of DEV_ACCOUNTS) {
      const pair = keyring.fromMnemonic(DEV_MNEMONIC2 + account);
      logger.step(account);
      logger.dim(`  Address: ${pair.address}`);
    }
    logger.blank();
    logger.dim(
      "Use these accounts in kendra.config.ts for local development."
    );
    return;
  }
  if (subcommand === "generate") {
    const wallet = keyring.generate();
    logger.blank();
    logger.success("Generated new account:");
    logger.blank();
    logger.step(`Address: ${wallet.address}`);
    logger.step(`Mnemonic: ${wallet.mnemonic}`);
    logger.blank();
    logger.warn("Save this mnemonic securely. Never commit it to version control.");
    return;
  }
  logger.error(`Unknown subcommand: ${subcommand}`);
  logger.dim("Available subcommands: list, generate");
  process.exit(1);
}

// bin/kendra.ts
var import_chalk3 = __toESM(require("chalk"));
var program = new import_commander.Command();
program.name("kendra").description(
  import_chalk3.default.yellow("KENDRA") + " \u2014 Awarizon Developer Toolchain\n" + import_chalk3.default.dim("Build and deploy ink! contracts on Awarizon")
).version("0.1.0");
program.command("init [name]").description("Scaffold a new Awarizon contract project").action(async (name) => {
  await initCommand(name);
});
program.command("compile [contract]").description("Compile ink! contracts to WebAssembly").action(async (contract) => {
  await ensureEnvironment();
  await compileCommand(contract);
});
program.command("deploy").description("Deploy compiled contracts to Awarizon").option("-n, --network <network>", "Target network", "local").option("-c, --contract <name>", "Contract to deploy").action(async (options) => {
  await ensureEnvironment();
  await deployCommand(options);
});
program.command("node").description("Start a local Awarizon development node").action(async () => {
  await nodeCommand();
});
program.command("accounts [subcommand]").description("Manage accounts (list, generate)").action(async (subcommand) => {
  await accountsCommand(subcommand);
});
program.command("call <contract> <method> [args...]").description("Call a deployed contract method").option("-n, --network <network>", "Target network", "local").action(
  async (contract, method, args, options) => {
    logger.header("CALL");
    logger.info(
      `Calling ${contract}.${method}(${args.join(", ")}) on ${options.network}`
    );
    logger.dim(
      "Full call command coming in next release. Use scripts/deploy.ts for contract interaction."
    );
  }
);
program.exitOverride();
try {
  program.parse(process.argv);
} catch (err) {
  if (err instanceof Error && err.code !== "commander.helpDisplayed") {
    logger.error(err.message);
    process.exit(1);
  }
}
//# sourceMappingURL=kendra.js.map