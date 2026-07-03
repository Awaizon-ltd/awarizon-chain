import * as _polkadot_keyring_types from '@polkadot/keyring/types';
import { Ora } from 'ora';

interface NetworkConfig {
    endpoint: string;
    accounts: string[];
    gasLimit?: bigint;
}
interface ContractConfig {
    [name: string]: string;
}
interface CompilerConfig {
    optimization?: boolean;
    target?: string;
}
interface TypechainConfig {
    outDir?: string;
}
interface KendraConfig {
    networks: {
        local?: NetworkConfig;
        testnet?: NetworkConfig;
        mainnet?: NetworkConfig;
        [key: string]: NetworkConfig | undefined;
    };
    contracts: ContractConfig;
    compiler?: CompilerConfig;
    typechain?: TypechainConfig;
    defaultNetwork?: string;
}
declare function defineConfig(config: KendraConfig): KendraConfig;

interface DeployResult {
    contractName: string;
    address: string;
    hash: string;
    blockNumber: number;
    network: string;
    deployedAt: number;
    deployer: string;
}
declare function deployContract(params: {
    contractName: string;
    wasmPath: string;
    metadataPath: string;
    constructorArgs: unknown[];
    network: NetworkConfig;
    networkName: string;
    value?: bigint;
    gasLimit?: bigint;
}): Promise<DeployResult>;
declare function getDeployment(contractName: string, networkName: string): Promise<DeployResult | null>;

interface EnvStatus {
    rustup: boolean;
    cargo: boolean;
    wasm32Target: boolean;
    cargoContract: boolean;
    allReady: boolean;
}
declare function checkEnv(): EnvStatus;

declare function ensureEnvironment(): Promise<void>;

interface CompileResult {
    contractName: string;
    wasmPath: string;
    metadataPath: string;
    abiPath: string;
}
declare function compileContract(contractDir: string, contractName: string, options?: {
    optimization?: boolean;
}): Promise<CompileResult>;
declare function readABI(contractName: string): Record<string, unknown>;

declare function generateTypechain(contractName: string, metadataPath: string): Promise<void>;

declare const logger: {
    info: (msg: string) => void;
    success: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    step: (msg: string) => void;
    header: (msg: string) => void;
    dim: (msg: string) => void;
    code: (msg: string) => void;
    blank: () => void;
};

declare function createSpinner(text: string): Ora;
declare function withSpinner<T>(text: string, fn: () => Promise<T>, successText?: string): Promise<T>;

declare const kendra: {
    getAccounts(): Promise<_polkadot_keyring_types.KeyringPair[]>;
    deploy(contractName: string, constructorArgs: unknown[], options: {
        signer: unknown;
        network?: string;
    }): Promise<DeployResult>;
};

export { type CompileResult, type CompilerConfig, type DeployResult, type EnvStatus, type KendraConfig, type NetworkConfig, type TypechainConfig, checkEnv, compileContract, createSpinner, defineConfig, deployContract, ensureEnvironment, generateTypechain, getDeployment, kendra, logger, readABI, withSpinner };
