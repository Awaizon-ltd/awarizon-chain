const DB_NAME = 'rizscan'
const DB_VERSION = 1

export interface StoredBlock {
  number: number         // primary key
  hash: string
  timestamp: number
  extrinsicCount: number // user extrinsics only
}

export interface StoredTx {
  id: string             // primary key: "blockNumber-txIndex"
  blockNumber: number    // indexed
  txIndex: number
  hash: string           // unique index
  section: string
  method: string
  type: string
  signer: string         // indexed; empty string for unsigned
  timestamp: number
  isSigned: boolean
}

// ── DB open ────────────────────────────────────────────────────────────

let _db: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  if (_db) return _db
  _db = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('blocks')) {
        db.createObjectStore('blocks', { keyPath: 'number' })
      }

      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' })
        store.createIndex('by_block',  'blockNumber', { unique: false })
        store.createIndex('by_hash',   'hash',        { unique: true  })
        store.createIndex('by_signer', 'signer',      { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror  = () => { _db = null; reject(req.error) }
  })
  return _db
}

// ── Generic helpers ────────────────────────────────────────────────────

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

function commit(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

// ── Write ──────────────────────────────────────────────────────────────

export async function saveBlockWithTxs(block: StoredBlock, txs: StoredTx[]): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['blocks', 'transactions'], 'readwrite')
  tx.objectStore('blocks').put(block)
  for (const t of txs) tx.objectStore('transactions').put(t)
  return commit(tx)
}

export async function saveManyBlocks(
  pairs: Array<{ block: StoredBlock; txs: StoredTx[] }>
): Promise<void> {
  if (pairs.length === 0) return
  const db = await openDb()
  const tx = db.transaction(['blocks', 'transactions'], 'readwrite')
  const bStore = tx.objectStore('blocks')
  const tStore = tx.objectStore('transactions')
  for (const { block, txs } of pairs) {
    bStore.put(block)
    for (const t of txs) tStore.put(t)
  }
  return commit(tx)
}

// ── Read ───────────────────────────────────────────────────────────────

export async function getBlock(num: number): Promise<StoredBlock | undefined> {
  const db = await openDb()
  return wrap(db.transaction('blocks', 'readonly').objectStore('blocks').get(num))
}

export async function hasBlock(num: number): Promise<boolean> {
  const db = await openDb()
  const key = await wrap(
    db.transaction('blocks', 'readonly').objectStore('blocks').getKey(num)
  )
  return key !== undefined
}

export async function getHighestBlock(): Promise<number> {
  const db = await openDb()
  const req = db
    .transaction('blocks', 'readonly')
    .objectStore('blocks')
    .openCursor(null, 'prev')
  const cursor = await wrap(req)
  return cursor ? (cursor.key as number) : 0
}

export async function getLowestBlock(): Promise<number> {
  const db = await openDb()
  const req = db
    .transaction('blocks', 'readonly')
    .objectStore('blocks')
    .openCursor(null, 'next')
  const cursor = await wrap(req)
  return cursor ? (cursor.key as number) : Infinity
}

export async function getBlockCount(): Promise<number> {
  const db = await openDb()
  return wrap(db.transaction('blocks', 'readonly').objectStore('blocks').count())
}

// ── Transaction queries ────────────────────────────────────────────────

export async function getTxCount(): Promise<number> {
  const db = await openDb()
  return wrap(db.transaction('transactions', 'readonly').objectStore('transactions').count())
}

export async function getUserTxCount(): Promise<number> {
  const db = await openDb()
  // Count txs with a non-empty signer (i.e., user-submitted)
  const tx = db.transaction('transactions', 'readonly')
  const index = tx.objectStore('transactions').index('by_signer')
  // All signers except empty string
  // We need to iterate — use IDBKeyRange to exclude empty signer
  return new Promise((res, rej) => {
    let count = 0
    const req = index.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) { res(count); return }
      if ((cursor.value as StoredTx).signer !== '') count++
      cursor.continue()
    }
    req.onerror = () => rej(req.error)
  })
}

export async function getTxsByAddress(
  address: string,
  limit = 100
): Promise<StoredTx[]> {
  if (!address) return []
  const db = await openDb()
  const tx = db.transaction('transactions', 'readonly')
  const all = await wrap(
    tx.objectStore('transactions').index('by_signer').getAll(address)
  )
  return all
    .sort((a, b) => b.blockNumber - a.blockNumber || a.txIndex - b.txIndex)
    .slice(0, limit)
}

export async function getTxByHash(hash: string): Promise<StoredTx | undefined> {
  if (!hash) return undefined
  const db = await openDb()
  return wrap(
    db
      .transaction('transactions', 'readonly')
      .objectStore('transactions')
      .index('by_hash')
      .get(hash)
  )
}

export async function getTxsByBlock(blockNumber: number): Promise<StoredTx[]> {
  if (blockNumber < 0) return []
  const db = await openDb()
  const all = await wrap(
    db
      .transaction('transactions', 'readonly')
      .objectStore('transactions')
      .index('by_block')
      .getAll(blockNumber)
  )
  return all.sort((a, b) => a.txIndex - b.txIndex)
}

// ── Reset (for dev) ────────────────────────────────────────────────────

export async function clearDb(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['blocks', 'transactions'], 'readwrite')
  tx.objectStore('blocks').clear()
  tx.objectStore('transactions').clear()
  return commit(tx)
}
