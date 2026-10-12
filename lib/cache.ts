import crypto from 'crypto'

/**
 * In-memory LRU Cache with TTL support
 */
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxItems: number
  private defaultTtlMs: number

  constructor(maxItems = 500, defaultTtlMs = 24 * 60 * 60 * 1000) { // 24 hours default TTL
    this.maxItems = maxItems
    this.defaultTtlMs = defaultTtlMs
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // Refresh position for LRU
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: string, value: T, ttlMs?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxItems) {
      // Evict oldest item
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Global caches preserved across hot reloads in Next.js development
declare global {
  // eslint-disable-next-line no-var
  var __overviewCache: MemoryCache<any> | undefined
  // eslint-disable-next-line no-var
  var __askCache: MemoryCache<any> | undefined
}

export const overviewCache: MemoryCache<any> =
  globalThis.__overviewCache || (globalThis.__overviewCache = new MemoryCache<any>(300))

export const askCache: MemoryCache<any> =
  globalThis.__askCache || (globalThis.__askCache = new MemoryCache<any>(500))

/**
 * Computes a deterministic SHA-256 fingerprint for a list of files.
 * If any file is added, edited, or deleted, this fingerprint changes.
 */
export function computeFilesFingerprint(files: any[]): string {
  if (!files || files.length === 0) return 'empty'

  const normalized = files
    .map(f => {
      const name = f.file_name || f.fileName || ''
      const content = f.content || ''
      const cat = f.category || ''
      const updated = f.updated_at || f.date || ''
      return `${name}::${cat}::${updated}::${content.length}::${content}`
    })
    .sort()

  const hash = crypto.createHash('sha256')
  for (const item of normalized) {
    hash.update(item)
  }
  return hash.digest('hex').substring(0, 32)
}
