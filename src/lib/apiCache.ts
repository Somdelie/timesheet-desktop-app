/**
 * API Cache and Rate Limiting Utility
 * - Caches API responses in localStorage
 * - Limits API requests per hour
 * - Returns cached data when offline or rate limited
 */

const RATE_LIMIT_KEY = "api-rate-limit";
const MAX_REQUESTS_PER_HOUR = 100; // Configurable limit

interface RateLimitData {
  count: number;
  resetTime: number; // timestamp when counter resets
}

interface CachedResponse<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Get current rate limit state
 */
function getRateLimitState(): RateLimitData {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (raw) {
      const data = JSON.parse(raw) as RateLimitData;
      // Reset counter if hour has passed
      if (Date.now() > data.resetTime) {
        return { count: 0, resetTime: Date.now() + 60 * 60 * 1000 };
      }
      return data;
    }
  } catch {
    // ignore parse errors
  }
  return { count: 0, resetTime: Date.now() + 60 * 60 * 1000 };
}

/**
 * Increment request counter
 */
function incrementRequestCount(): void {
  const state = getRateLimitState();
  state.count += 1;
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
}

/**
 * Check if we're within rate limit
 */
export function canMakeRequest(): boolean {
  const state = getRateLimitState();
  return state.count < MAX_REQUESTS_PER_HOUR;
}

/**
 * Get remaining requests this hour
 */
export function getRemainingRequests(): number {
  const state = getRateLimitState();
  return Math.max(0, MAX_REQUESTS_PER_HOUR - state.count);
}

/**
 * Get time until rate limit resets (in ms)
 */
export function getResetTime(): number {
  const state = getRateLimitState();
  return Math.max(0, state.resetTime - Date.now());
}

/**
 * Get cached data for a key
 */
export function getCached<T>(cacheKey: string): T | null {
  try {
    const raw = localStorage.getItem(`cache:${cacheKey}`);
    if (raw) {
      const cached = JSON.parse(raw) as CachedResponse<T>;
      // Return data even if expired (for offline use)
      return cached.data;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/**
 * Check if cached data is still fresh
 */
export function isCacheFresh(cacheKey: string): boolean {
  try {
    const raw = localStorage.getItem(`cache:${cacheKey}`);
    if (raw) {
      const cached = JSON.parse(raw) as CachedResponse;
      return Date.now() < cached.expiresAt;
    }
  } catch {
    // ignore parse errors
  }
  return false;
}

/**
 * Set cached data with TTL
 */
export function setCache<T>(cacheKey: string, data: T, ttlMs: number): void {
  try {
    const cached: CachedResponse<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(`cache:${cacheKey}`, JSON.stringify(cached));
  } catch {
    // localStorage might be full, ignore
  }
}

/**
 * Clear specific cache
 */
export function clearCache(cacheKey: string): void {
  localStorage.removeItem(`cache:${cacheKey}`);
}

/**
 * Clear all API caches
 */
export function clearAllCaches(): void {
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith("cache:")) {
      localStorage.removeItem(key);
    }
  }
}

interface CachedFetchOptions extends RequestInit {
  /** Cache key for this request */
  cacheKey: string;
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttlMs?: number;
  /** Skip cache and force fresh request */
  forceRefresh?: boolean;
  /** Return stale cache on error */
  staleOnError?: boolean;
}

interface CachedFetchResult<T> {
  data: T;
  fromCache: boolean;
  rateLimited: boolean;
}

/**
 * Fetch with caching and rate limiting
 * - Returns cached data if fresh and not force refreshing
 * - Returns cached data if rate limited or offline
 * - Caches successful responses
 */
export async function cachedFetch<T>(
  url: string,
  options: CachedFetchOptions,
): Promise<CachedFetchResult<T>> {
  const {
    cacheKey,
    ttlMs = 5 * 60 * 1000, // 5 minutes default
    forceRefresh = false,
    staleOnError = true,
    ...fetchOptions
  } = options;

  const cachedData = getCached<T>(cacheKey);
  const fresh = isCacheFresh(cacheKey);

  // Return fresh cache if not forcing refresh
  if (cachedData && fresh && !forceRefresh) {
    return { data: cachedData, fromCache: true, rateLimited: false };
  }

  // Check if we can make a request
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const withinLimit = canMakeRequest();

  if (!online || !withinLimit) {
    // Return stale cache if available
    if (cachedData) {
      return { data: cachedData, fromCache: true, rateLimited: !withinLimit };
    }
    // No cache available
    throw new Error(
      !online
        ? "You are offline and no cached data is available"
        : `Rate limit exceeded. ${getRemainingRequests()} requests remaining. Resets in ${Math.ceil(getResetTime() / 60000)} minutes.`,
    );
  }

  try {
    // Make the actual request
    incrementRequestCount();
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as T;

    // Cache the successful response
    setCache(cacheKey, data, ttlMs);

    return { data, fromCache: false, rateLimited: false };
  } catch (error) {
    // Return stale cache on error if enabled
    if (staleOnError && cachedData) {
      return { data: cachedData, fromCache: true, rateLimited: false };
    }
    throw error;
  }
}

/**
 * Get rate limit info for display
 */
export function getRateLimitInfo(): {
  remaining: number;
  total: number;
  resetInMinutes: number;
} {
  return {
    remaining: getRemainingRequests(),
    total: MAX_REQUESTS_PER_HOUR,
    resetInMinutes: Math.ceil(getResetTime() / 60000),
  };
}
