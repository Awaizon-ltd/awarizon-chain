"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils/paths.ts
var paths_exports = {};
__export(paths_exports, {
  getArtifactsDir: () => getArtifactsDir,
  getCargoBin: () => getCargoBin,
  getCargoHome: () => getCargoHome,
  getCargoPath: () => getCargoPath,
  getContractsDir: () => getContractsDir,
  getDeploymentsDir: () => getDeploymentsDir,
  getKendraConfigPath: () => getKendraConfigPath,
  getProjectRoot: () => getProjectRoot,
  getRustupHome: () => getRustupHome,
  getRustupPath: () => getRustupPath,
  getTypechainDir: () => getTypechainDir
});
function getProjectRoot() {
  return process.cwd();
}
function getKendraConfigPath() {
  return import_path.default.join(getProjectRoot(), "kendra.config.ts");
}
function getContractsDir() {
  return import_path.default.join(getProjectRoot(), "contracts");
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
function getRustupHome() {
  return process.env.RUSTUP_HOME ?? import_path.default.join(import_os.default.homedir(), ".rustup");
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
var import_path, import_os;
var init_paths = __esm({
  "src/utils/paths.ts"() {
    "use strict";
    import_path = __toESM(require("path"));
    import_os = __toESM(require("os"));
  }
});

// src/utils/logger.ts
var import_chalk, logger;
var init_logger = __esm({
  "src/utils/logger.ts"() {
    "use strict";
    import_chalk = __toESM(require("chalk"));
    logger = {
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
  }
});

// src/utils/spinner.ts
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
var import_ora, import_chalk2;
var init_spinner = __esm({
  "src/utils/spinner.ts"() {
    "use strict";
    import_ora = __toESM(require("ora"));
    import_chalk2 = __toESM(require("chalk"));
  }
});

// src/deployer/index.ts
var deployer_exports = {};
__export(deployer_exports, {
  deployContract: () => deployContract,
  getDeployment: () => getDeployment
});
async function deployContract(params) {
  const { contractName, wasmPath, metadataPath, constructorArgs, network, networkName } = params;
  const wasm = await import_fs_extra2.default.readFile(wasmPath);
  const abi = await import_fs_extra2.default.readJson(metadataPath);
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
  await import_fs_extra2.default.ensureDir(deploymentsDir);
  const filePath = import_path4.default.join(deploymentsDir, `${result.network}.json`);
  let existing = {};
  if (await import_fs_extra2.default.pathExists(filePath)) {
    existing = await import_fs_extra2.default.readJson(filePath);
  }
  existing[result.contractName] = result;
  await import_fs_extra2.default.writeJson(filePath, existing, { spaces: 2 });
  logger.dim(`Deployment saved: deployments/${result.network}.json`);
}
async function getDeployment(contractName, networkName) {
  const filePath = import_path4.default.join(getDeploymentsDir(), `${networkName}.json`);
  if (!await import_fs_extra2.default.pathExists(filePath)) return null;
  const deployments = await import_fs_extra2.default.readJson(filePath);
  return deployments[contractName] ?? null;
}
var import_fs_extra2, import_path4, import_api_contract, import_core, import_core2, DEV_MNEMONIC;
var init_deployer = __esm({
  "src/deployer/index.ts"() {
    "use strict";
    import_fs_extra2 = __toESM(require("fs-extra"));
    import_path4 = __toESM(require("path"));
    import_api_contract = require("@polkadot/api-contract");
    import_core = require("@awarizon/core");
    import_core2 = require("@awarizon/core");
    init_paths();
    init_logger();
    init_spinner();
    DEV_MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
  }
});

// src/config/loader.ts
var loader_exports = {};
__export(loader_exports, {
  getNetwork: () => getNetwork,
  loadConfig: () => loadConfig
});
async function loadConfig() {
  const configPath = import_path6.default.join(process.cwd(), "kendra.config.ts");
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
var import_path6, import_fs3;
var init_loader = __esm({
  "src/config/loader.ts"() {
    "use strict";
    import_path6 = __toESM(require("path"));
    import_fs3 = __toESM(require("fs"));
    init_logger();
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  checkEnv: () => checkEnv,
  compileContract: () => compileContract,
  createSpinner: () => createSpinner,
  defineConfig: () => defineConfig,
  deployContract: () => deployContract,
  ensureEnvironment: () => ensureEnvironment,
  generateTypechain: () => generateTypechain,
  getDeployment: () => getDeployment,
  kendra: () => kendra,
  logger: () => logger,
  readABI: () => readABI,
  withSpinner: () => withSpinner
});
module.exports = __toCommonJS(index_exports);

// src/config/types.ts
function defineConfig(config) {
  return config;
}

// src/env/check.ts
var import_child_process = require("child_process");
var import_fs = __toESM(require("fs"));
init_paths();
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
var import_child_process2 = require("child_process");
var import_https = __toESM(require("https"));
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_os2 = __toESM(require("os"));
init_logger();
init_spinner();
init_paths();
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

// src/compiler/ink.ts
var import_child_process3 = require("child_process");
var import_path3 = __toESM(require("path"));
var import_fs_extra = __toESM(require("fs-extra"));
init_logger();
init_paths();
async function compileContract(contractDir, contractName, options = {}) {
  const cargoToml = import_path3.default.join(contractDir, "Cargo.toml");
  if (!import_fs_extra.default.existsSync(cargoToml)) {
    throw new Error(`No Cargo.toml found at ${contractDir}`);
  }
  const artifactsDir = getArtifactsDir();
  await import_fs_extra.default.ensureDir(artifactsDir);
  logger.step(`Compiling ${contractName}...`);
  await new Promise((resolve, reject) => {
    const args = ["contract", "build"];
    if (options.optimization !== false) {
      args.push("--release");
    }
    const child = (0, import_child_process3.spawn)(import_path3.default.join(getCargoBin(), "cargo"), args, {
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
  const targetDir = import_path3.default.join(contractDir, "target", "ink");
  const wasmFiles = import_fs_extra.default.readdirSync(targetDir).filter((f) => f.endsWith(".wasm"));
  if (wasmFiles.length === 0) {
    throw new Error("No .wasm file found after compilation");
  }
  const wasmFile = wasmFiles[0];
  const baseName = wasmFile.replace(".wasm", "");
  const sourceWasm = import_path3.default.join(targetDir, wasmFile);
  const sourceMetadata = import_path3.default.join(targetDir, `${baseName}.json`);
  const destWasm = import_path3.default.join(artifactsDir, `${contractName}.wasm`);
  const destMetadata = import_path3.default.join(artifactsDir, `${contractName}.json`);
  await import_fs_extra.default.copy(sourceWasm, destWasm);
  await import_fs_extra.default.copy(sourceMetadata, destMetadata);
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
  const metadataPath = import_path3.default.join(getArtifactsDir(), `${contractName}.json`);
  if (!import_fs_extra.default.existsSync(metadataPath)) {
    throw new Error(
      `No compiled metadata found for ${contractName}. Run "kendra compile" first.`
    );
  }
  return import_fs_extra.default.readJsonSync(metadataPath);
}

// src/index.ts
init_deployer();

// src/typechain/generator.ts
var import_path5 = __toESM(require("path"));
var import_fs_extra3 = __toESM(require("fs-extra"));
init_paths();
init_logger();
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
  const metadata = await import_fs_extra3.default.readJson(metadataPath);
  const className = capitalise(camelCase(contractName));
  const typechainDir = getTypechainDir();
  await import_fs_extra3.default.ensureDir(typechainDir);
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
  const outPath = import_path5.default.join(typechainDir, `${className}.ts`);
  await import_fs_extra3.default.writeFile(outPath, output);
  logger.success(`TypeChain: typechain/${className}.ts`);
}

// src/index.ts
init_logger();
init_spinner();
var kendra = {
  async getAccounts() {
    const { AwarizonKeyring: AwarizonKeyring2 } = await import("@awarizon/core");
    const keyring = new AwarizonKeyring2();
    await keyring.initialize();
    const DEV_MNEMONIC2 = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
    return ["//Alice", "//Bob", "//Charlie"].map(
      (p) => keyring.fromMnemonic(DEV_MNEMONIC2 + p)
    );
  },
  async deploy(contractName, constructorArgs, options) {
    const { deployContract: _deploy } = await Promise.resolve().then(() => (init_deployer(), deployer_exports));
    const { loadConfig: loadConfig2, getNetwork: getNetwork2 } = await Promise.resolve().then(() => (init_loader(), loader_exports));
    const pathMod = await import("path");
    const { getArtifactsDir: getArtifactsDir2 } = await Promise.resolve().then(() => (init_paths(), paths_exports));
    const config = await loadConfig2();
    const networkName = options.network ?? config.defaultNetwork ?? "local";
    const network = getNetwork2(config, networkName);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=index.js.map