import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB ?? 'awarizon_validator'

// Cached on `global` in dev so Next's module reloading (HMR) doesn't
// open a new connection on every edit.
declare global {
  // eslint-disable-next-line no-var
  var _validatorMongoClientPromise: Promise<MongoClient> | undefined
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set — add it to .env.local'
    )
  }
  if (!global._validatorMongoClientPromise) {
    global._validatorMongoClientPromise = new MongoClient(uri).connect()
  }
  return global._validatorMongoClientPromise
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise()
  return client.db(dbName)
}
