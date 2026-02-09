/**
 * In-memory sliding window rate limiter
 * Key: IP + optional identifier
 * Used for emergency entry to prevent brute-force code guessing
 */

interface RateLimitEntry {
  timestamps: number[];
  lockedUntil: number | null;
}

// In-memory store (single instance MVP)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    // Remove entries older than 1 hour with no lock
    if (
      entry.timestamps.length === 0 &&
      (!entry.lockedUntil || entry.lockedUntil < now)
    ) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  attemptsPerWindow: number; // max attempts in the window
  windowSeconds: number; // sliding window size
  lockSeconds: number; // lockout duration after exceeding limit
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  attemptsPerWindow: 5,
  windowSeconds: 300, // 5 minutes
  lockSeconds: 600, // 10 minutes
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  lockedUntilMs: number | null;
}

/**
 * Check rate limit for a given key
 * Returns whether the attempt is allowed
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [], lockedUntil: null };
    store.set(key, entry);
  }

  // Check if currently locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      lockedUntilMs: entry.lockedUntil,
    };
  }

  // Clear lock if expired
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    entry.lockedUntil = null;
    entry.timestamps = [];
  }

  // Remove timestamps outside the window
  const windowStart = now - config.windowSeconds * 1000;
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const remaining = config.attemptsPerWindow - entry.timestamps.length;

  if (remaining <= 0) {
    // Lock the key
    entry.lockedUntil = now + config.lockSeconds * 1000;
    return {
      allowed: false,
      remaining: 0,
      lockedUntilMs: entry.lockedUntil,
    };
  }

  return {
    allowed: true,
    remaining: remaining,
    lockedUntilMs: null,
  };
}

/**
 * Record an attempt (call after checkRateLimit returns allowed=true)
 */
export function recordAttempt(key: string): void {
  const entry = store.get(key);
  if (entry) {
    entry.timestamps.push(Date.now());
  }
}

/**
 * Reset rate limit for a key (e.g., after successful auth)
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
