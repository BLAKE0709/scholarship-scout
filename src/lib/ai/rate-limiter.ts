import type { UserTier, RateLimitResult } from "./types";

const TIER_LIMITS: Record<UserTier, number> = {
  free: 50,
  pro: 200,
  counselor: Infinity,
  admin: Infinity,
};

// In-memory sliding window store: key → timestamp array
const windowStore = new Map<string, number[]>();

function getHourBucket(): number {
  return Math.floor(Date.now() / 3_600_000);
}

function getWindowKey(userId: string, bucket: number): string {
  return `${userId}:${bucket}`;
}

export function checkRateLimit(
  userId: string,
  tier: UserTier,
): RateLimitResult {
  const limit = TIER_LIMITS[tier];

  // Unlimited tiers always pass
  if (limit === Infinity) {
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: new Date(Date.now() + 3_600_000),
    };
  }

  const bucket = getHourBucket();
  const key = getWindowKey(userId, bucket);
  const now = Date.now();
  const windowStart = now - 3_600_000;

  // Get existing timestamps, filter to current window
  let timestamps = windowStore.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  const resetAt = new Date(
    timestamps.length > 0 ? timestamps[0] + 3_600_000 : now + 3_600_000,
  );

  if (timestamps.length >= limit) {
    windowStore.set(key, timestamps);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Record this call
  timestamps.push(now);
  windowStore.set(key, timestamps);

  // Clean up old buckets periodically (every 100 calls)
  if (timestamps.length % 100 === 0) {
    cleanupOldBuckets(bucket);
  }

  return {
    allowed: true,
    remaining: limit - timestamps.length,
    resetAt,
  };
}

function cleanupOldBuckets(currentBucket: number): void {
  const cutoff = `${currentBucket - 2}`;
  for (const key of windowStore.keys()) {
    const bucketPart = key.split(":")[1];
    if (bucketPart && bucketPart < cutoff) {
      windowStore.delete(key);
    }
  }
}

export function resetRateLimits(): void {
  windowStore.clear();
}
