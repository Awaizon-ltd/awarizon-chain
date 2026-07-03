import {
  logger
} from "./chunk-CVC5SH36.mjs";

// src/config/loader.ts
import path from "path";
import fs from "fs";
async function loadConfig() {
  const configPath = path.join(process.cwd(), "kendra.config.ts");
  if (!fs.existsSync(configPath)) {
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
export {
  getNetwork,
  loadConfig
};
//# sourceMappingURL=loader-V375LZJL.mjs.map