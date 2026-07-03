import {
  getDeploymentsDir
} from "./chunk-X6DJQO5Q.mjs";
import {
  logger
} from "./chunk-CVC5SH36.mjs";

// src/deployer/index.ts
import fs from "fs-extra";
import path from "path";
import { CodePromise } from "@polkadot/api-contract";
import { createCore } from "@awarizon/core";
import { AwarizonKeyring } from "@awarizon/core";

// src/utils/spinner.ts
import ora from "ora";
import chalk from "chalk";
function createSpinner(text) {
  return ora({
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
    spinner.succeed(chalk.green(successText ?? text + " done"));
    return result;
  } catch (err) {
    spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
    throw err;
  }
}

// src/deployer/index.ts
var DEV_MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
async function deployContract(params) {
  const { contractName, wasmPath, metadataPath, constructorArgs, network, networkName } = params;
  const wasm = await fs.readFile(wasmPath);
  const abi = await fs.readJson(metadataPath);
  const keyring = new AwarizonKeyring();
  await keyring.initialize();
  const mnemonic = network.accounts[0];
  if (!mnemonic) {
    throw new Error("No accounts configured for network " + networkName);
  }
  const pair = mnemonic.startsWith("//") ? keyring.fromMnemonic(DEV_MNEMONIC + mnemonic) : keyring.fromMnemonic(mnemonic);
  logger.step(`Deploying ${contractName} to ${networkName}`);
  logger.dim(`Deployer: ${pair.address}`);
  logger.dim(`Endpoint: ${network.endpoint}`);
  const core = await createCore({ endpoint: network.endpoint });
  const api = core.getApi();
  const deployResult = await withSpinner(
    `Deploying ${contractName}...`,
    async () => {
      const code = new CodePromise(api, abi, wasm);
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
  await fs.ensureDir(deploymentsDir);
  const filePath = path.join(deploymentsDir, `${result.network}.json`);
  let existing = {};
  if (await fs.pathExists(filePath)) {
    existing = await fs.readJson(filePath);
  }
  existing[result.contractName] = result;
  await fs.writeJson(filePath, existing, { spaces: 2 });
  logger.dim(`Deployment saved: deployments/${result.network}.json`);
}
async function getDeployment(contractName, networkName) {
  const filePath = path.join(getDeploymentsDir(), `${networkName}.json`);
  if (!await fs.pathExists(filePath)) return null;
  const deployments = await fs.readJson(filePath);
  return deployments[contractName] ?? null;
}

export {
  createSpinner,
  withSpinner,
  deployContract,
  getDeployment
};
//# sourceMappingURL=chunk-R6I7FBSK.mjs.map