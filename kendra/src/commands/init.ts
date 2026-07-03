import path from 'path'
import fs from 'fs-extra'
import prompts from 'prompts'
import { logger } from '../utils/logger'

const CONTRACT_TEMPLATE = `#![cfg_attr(not(feature = "std"), no_std, no_main)]

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
`

const CARGO_TEMPLATE = `[package]
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
`

const CONFIG_TEMPLATE = `import { defineConfig } from '@awarizon/kendra'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  networks: {
    local: {
      endpoint: 'ws://127.0.0.1:9944',
      accounts: ['//Alice'],
    },
    testnet: {
      endpoint: 'wss://rpc.awarizon.com',
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
`

const TEST_TEMPLATE = `import { kendra } from '@awarizon/kendra'

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
`

const DEPLOY_SCRIPT_TEMPLATE = `import { kendra } from '@awarizon/kendra'

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
`

const ENV_TEMPLATE = `# Awarizon Kendra Configuration
# Copy this to .env and fill in your values

DEPLOYER_MNEMONIC=your twelve word mnemonic phrase here
`

function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function camelCase(str: string): string {
  return str.replace(/[-_]([a-z])/g, (_, l: string) => l.toUpperCase())
}

export async function initCommand(projectName?: string): Promise<void> {
  logger.header('INIT')

  let name = projectName

  if (!name) {
    const response = await prompts({
      type: 'text',
      name: 'name',
      message: 'Project name:',
      initial: 'my_contract',
      validate: v =>
        /^[a-z][a-z0-9_-]*$/.test(v as string) ||
        'Use lowercase letters, numbers, hyphens, underscores',
    })
    name = response.name as string
  }

  if (!name) {
    logger.error('Project name is required')
    process.exit(1)
  }

  const className = capitalise(camelCase(name))
  const projectDir = path.join(process.cwd(), name)

  if (await fs.pathExists(projectDir)) {
    logger.error(`Directory "${name}" already exists`)
    process.exit(1)
  }

  const fill = (template: string) =>
    template.replace(/\{\{name\}\}/g, name!).replace(/\{\{ClassName\}\}/g, className)

  await fs.ensureDir(path.join(projectDir, 'contracts', name))
  await fs.ensureDir(path.join(projectDir, 'tests'))
  await fs.ensureDir(path.join(projectDir, 'scripts'))
  await fs.ensureDir(path.join(projectDir, 'artifacts'))
  await fs.ensureDir(path.join(projectDir, 'deployments'))
  await fs.ensureDir(path.join(projectDir, 'typechain'))

  await fs.writeFile(
    path.join(projectDir, 'contracts', name, 'lib.rs'),
    fill(CONTRACT_TEMPLATE),
  )
  await fs.writeFile(
    path.join(projectDir, 'contracts', name, 'Cargo.toml'),
    fill(CARGO_TEMPLATE),
  )
  await fs.writeFile(path.join(projectDir, 'kendra.config.ts'), fill(CONFIG_TEMPLATE))
  await fs.writeFile(
    path.join(projectDir, 'tests', `${name}.test.ts`),
    fill(TEST_TEMPLATE),
  )
  await fs.writeFile(
    path.join(projectDir, 'scripts', 'deploy.ts'),
    fill(DEPLOY_SCRIPT_TEMPLATE),
  )
  await fs.writeFile(path.join(projectDir, '.env.example'), ENV_TEMPLATE)

  await fs.writeFile(
    path.join(projectDir, '.gitignore'),
    [
      'node_modules/',
      '.env',
      'artifacts/',
      'typechain/',
      'target/',
      'deployments/*.json',
    ].join('\n'),
  )

  await fs.writeJson(
    path.join(projectDir, 'package.json'),
    {
      name,
      version: '0.1.0',
      private: true,
      scripts: {
        compile: 'kendra compile',
        deploy: 'kendra deploy',
        test: 'kendra test',
        node: 'kendra node',
      },
      dependencies: {
        '@awarizon/kendra': 'latest',
        '@awarizon/core': 'latest',
      },
      devDependencies: {
        typescript: '^5.0.0',
        '@types/node': '^20.0.0',
      },
    },
    { spaces: 2 },
  )

  logger.blank()
  logger.success(`Created project: ${name}/`)
  logger.blank()
  logger.dim('Project structure:')
  logger.dim(`  ${name}/`)
  logger.dim(`  ├── contracts/${name}/lib.rs    ← Write your contract here`)
  logger.dim(`  ├── tests/${name}.test.ts`)
  logger.dim(`  ├── scripts/deploy.ts`)
  logger.dim(`  └── kendra.config.ts`)
  logger.blank()
  logger.step('Next steps:')
  logger.code(`cd ${name}`)
  logger.code(`npm install`)
  logger.code(`kendra compile`)
  logger.blank()
}
