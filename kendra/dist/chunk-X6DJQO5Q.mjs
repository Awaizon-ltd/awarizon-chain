// src/utils/paths.ts
import path from "path";
import os from "os";
function getProjectRoot() {
  return process.cwd();
}
function getKendraConfigPath() {
  return path.join(getProjectRoot(), "kendra.config.ts");
}
function getContractsDir() {
  return path.join(getProjectRoot(), "contracts");
}
function getArtifactsDir() {
  return path.join(getProjectRoot(), "artifacts");
}
function getDeploymentsDir() {
  return path.join(getProjectRoot(), "deployments");
}
function getTypechainDir() {
  return path.join(getProjectRoot(), "typechain");
}
function getRustupHome() {
  return process.env.RUSTUP_HOME ?? path.join(os.homedir(), ".rustup");
}
function getCargoHome() {
  return process.env.CARGO_HOME ?? path.join(os.homedir(), ".cargo");
}
function getCargoBin() {
  return path.join(getCargoHome(), "bin");
}
function getCargoPath() {
  return path.join(getCargoBin(), "cargo");
}
function getRustupPath() {
  return path.join(getCargoBin(), "rustup");
}

export {
  getProjectRoot,
  getKendraConfigPath,
  getContractsDir,
  getArtifactsDir,
  getDeploymentsDir,
  getTypechainDir,
  getRustupHome,
  getCargoHome,
  getCargoBin,
  getCargoPath,
  getRustupPath
};
//# sourceMappingURL=chunk-X6DJQO5Q.mjs.map