/**
 * AI API rate limiter - ensures usage stays within Gemini free tier
 *
 * Gemini 2.0 Flash free tier limits (2026):
 *   - 10 RPM (requests per minute)
 *   - 250 RPD (requests per day)
 *   - 250,000 TPM (tokens per minute)
 *
 * App limits (with safety margin):
 *   - 8 RPM
 *   - 200 RPD
 *
 * Uses in-memory counters. Server restart resets counts = safe.
 */

const MAX_REQUESTS_PER_MINUTE = 8;
const MAX_REQUESTS_PER_DAY = 200;

interface RateLimitState {
  /** Timestamps of requests in the current minute window */
  minuteWindow: number[];
  /** Count of requests today */
  dailyCount: number;
  /** The date string (YYYY-MM-DD in UTC-8 Pacific) for daily reset */
  dailyDate: string;
}

const state: RateLimitState = {
  minuteWindow: [],
  dailyCount: 0,
  dailyDate: getTodayKey(),
};

function getTodayKey(): string {
  // Use Pacific Time for daily reset (matches Google's quota reset)
  const now = new Date();
  const pacific = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  return `${pacific.getFullYear()}-${String(pacific.getMonth() + 1).padStart(2, "0")}-${String(pacific.getDate()).padStart(2, "0")}`;
}

function pruneMinuteWindow() {
  const oneMinuteAgo = Date.now() - 60_000;
  state.minuteWindow = state.minuteWindow.filter((t) => t > oneMinuteAgo);
}

function resetDailyIfNeeded() {
  const today = getTodayKey();
  if (state.dailyDate !== today) {
    state.dailyCount = 0;
    state.dailyDate = today;
  }
}

/**
 * Check if an AI API call is allowed under the rate limit
 */
export function isAiCallAllowed(): boolean {
  resetDailyIfNeeded();
  pruneMinuteWindow();

  if (state.dailyCount >= MAX_REQUESTS_PER_DAY) {
    console.warn(`[AI Rate Limit] Daily limit reached (${state.dailyCount}/${MAX_REQUESTS_PER_DAY})`);
    return false;
  }

  if (state.minuteWindow.length >= MAX_REQUESTS_PER_MINUTE) {
    console.warn(`[AI Rate Limit] Per-minute limit reached (${state.minuteWindow.length}/${MAX_REQUESTS_PER_MINUTE})`);
    return false;
  }

  return true;
}

/**
 * Record that an AI API call was made
 */
export function recordAiCall() {
  resetDailyIfNeeded();
  state.dailyCount++;
  state.minuteWindow.push(Date.now());
}

/**
 * Get current usage stats (for debugging/monitoring)
 */
export function getAiUsageStats() {
  resetDailyIfNeeded();
  pruneMinuteWindow();
  return {
    dailyCount: state.dailyCount,
    dailyLimit: MAX_REQUESTS_PER_DAY,
    minuteCount: state.minuteWindow.length,
    minuteLimit: MAX_REQUESTS_PER_MINUTE,
  };
}
