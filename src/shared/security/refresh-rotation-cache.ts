export type CachedRefreshRotation = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  session_expires_at: string;
  idle_timeout_seconds: number;
  activeRefreshTokenId: string;
  cachedAt: number;
};

const DEFAULT_GRACE_SECONDS = 30;

function parseGraceSeconds(): number {
  const raw = process.env.JWT_REFRESH_GRACE_SECONDS?.trim();
  if (!raw) return DEFAULT_GRACE_SECONDS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GRACE_SECONDS;
}

const GRACE_MS = parseGraceSeconds() * 1_000;

const rotationCache = new Map<string, CachedRefreshRotation>();
const rotationLocks = new Map<string, Promise<CachedRefreshRotation>>();

function isFresh(entry: CachedRefreshRotation): boolean {
  return Date.now() - entry.cachedAt <= GRACE_MS;
}

export function getCachedRefreshRotation(tokenHash: string): CachedRefreshRotation | null {
  const entry = rotationCache.get(tokenHash);
  if (!entry) return null;
  if (!isFresh(entry)) {
    rotationCache.delete(tokenHash);
    return null;
  }
  return entry;
}

export function cacheRefreshRotation(tokenHash: string, entry: Omit<CachedRefreshRotation, "cachedAt">): void {
  rotationCache.set(tokenHash, { ...entry, cachedAt: Date.now() });
}

/** Solo para tests: evita que la cache en memoria contamine casos consecutivos. */
export function clearRefreshRotationCacheForTests(): void {
  rotationCache.clear();
  rotationLocks.clear();
}

export async function withRefreshRotationLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = rotationLocks.get(lockKey);
  if (existing) {
    return (await existing) as T;
  }

  const promise = fn().finally(() => {
    rotationLocks.delete(lockKey);
  });

  rotationLocks.set(lockKey, promise as Promise<CachedRefreshRotation>);
  return promise;
}
