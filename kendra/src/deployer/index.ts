import fs from 'fs-extra'
import path from 'path'
import { CodePromise } from '@polkadot/api-contract'
import type { ISubmittableResult } from '@polkadot/types/types'
import { createCore } from '@awarizon/core'
import { AwarizonKeyring } from '@awarizon/core'
import type { NetworkConfig } from '../config/types'
import { getDeploymentsDir } from '../utils/paths'
import { logger } from '../utils/logger'
import { withSpinner } from '../utils/spinner'

export interface DeployResult {
  contractName: string
  address: string
  hash: string
  blockNumber: number
  network: string
  deployedAt: number
  deployer: string
}

const DEV_MNEMONIC =
  'bottom drive obey lake curtain smoke basket hold race lonely fit walk'

export async function deployContract(params: {
  contractName: string
  wasmPath: string
  metadataPath: string
  constructorArgs: unknown[]
  network: NetworkConfig
  networkName: string
  value?: bigint
  gasLimit?: bigint
}): Promise<DeployResult> {
  const { contractName, wasmPath, metadataPath, constructorArgs, network, networkName } =
    params

  const wasm = await fs.readFile(wasmPath)
  const abi = await fs.readJson(metadataPath)

  const keyring = new AwarizonKeyring()
  await keyring.initialize()

  const mnemonic = network.accounts[0]
  if (!mnemonic) {
    throw new Error('No accounts configured for network ' + networkName)
  }

  const pair = mnemonic.startsWith('//')
    ? keyring.fromMnemonic(DEV_MNEMONIC + mnemonic)
    : keyring.fromMnemonic(mnemonic)

  logger.step(`Deploying ${contractName} to ${networkName}`)
  logger.dim(`Deployer: ${pair.address}`)
  logger.dim(`Endpoint: ${network.endpoint}`)

  const core = await createCore({ endpoint: network.endpoint })
  // Bridge the ApiPromise version gap between @awarizon/core and @polkadot/api-contract
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = core.getApi() as any

  const deployResult = await withSpinner(
    `Deploying ${contractName}...`,
    async () => {
      const code = new CodePromise(api, abi, wasm)

      const gasLimit = params.gasLimit ?? BigInt(30_000_000_000)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = (code.tx as any)['new'](
        { gasLimit, value: params.value ?? 0n },
        ...constructorArgs,
      )

      return new Promise<DeployResult>((resolve, reject) => {
        let unsubFn: (() => void) | null = null

        const finish = (result: DeployResult | Error) => {
          if (unsubFn) unsubFn()
          if (result instanceof Error) reject(result)
          else resolve(result)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tx.signAndSend(pair as any, (res: ISubmittableResult) => {
          if (res.dispatchError) {
            if (res.dispatchError.isModule) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const decoded = (api as any).registry.findMetaError(
                res.dispatchError.asModule,
              )
              finish(
                new Error(
                  `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`,
                ),
              )
            } else {
              finish(new Error(res.dispatchError.toString()))
            }
            return
          }

          if (res.status.isInBlock || res.status.isFinalized) {
            const blockHash = res.status.isInBlock
              ? res.status.asInBlock
              : res.status.asFinalized

            let address = ''

            for (const { event } of res.events) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if ((api as any).events.contracts?.Instantiated?.is(event)) {
                address = event.data[1]?.toString() ?? ''
              }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(api as any).rpc.chain.getBlock(blockHash).then((block: any) => {
              const blockNumber: number = block.block.header.number.toNumber()
              finish({
                contractName,
                address,
                hash: (blockHash as any).toHex(),
                blockNumber,
                network: networkName,
                deployedAt: Date.now(),
                deployer: pair.address,
              })
            })
          }
        }).then((unsub: () => void) => {
          unsubFn = unsub
        })
      })
    },
    `Deployed to ${networkName} ✓`,
  )

  await core.disconnect()

  await saveDeployment(deployResult)

  logger.blank()
  logger.success(`Contract address: ${deployResult.address}`)
  logger.success(`Block: #${deployResult.blockNumber}`)

  return deployResult
}

async function saveDeployment(result: DeployResult): Promise<void> {
  const deploymentsDir = getDeploymentsDir()
  await fs.ensureDir(deploymentsDir)

  const filePath = path.join(deploymentsDir, `${result.network}.json`)

  let existing: Record<string, DeployResult> = {}
  if (await fs.pathExists(filePath)) {
    existing = await fs.readJson(filePath)
  }

  existing[result.contractName] = result
  await fs.writeJson(filePath, existing, { spaces: 2 })

  logger.dim(`Deployment saved: deployments/${result.network}.json`)
}

export async function getDeployment(
  contractName: string,
  networkName: string,
): Promise<DeployResult | null> {
  const filePath = path.join(getDeploymentsDir(), `${networkName}.json`)

  if (!(await fs.pathExists(filePath))) return null

  const deployments = await fs.readJson(filePath)
  return (deployments[contractName] as DeployResult) ?? null
}
