interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup stale rate limit entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((entry, key) => {
      if (now > entry.resetTime) {
        rateLimitMap.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

/**
 * In-memory sliding window rate limiter for API routes
 * @param identifier IP address or user identifier key
 * @param limit Max number of requests allowed within timeframe
 * @param windowMs Timeframe window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): { success: boolean; limit: number; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(identifier, newEntry);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}
