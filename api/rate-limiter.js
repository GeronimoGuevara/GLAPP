/**
 * Comprueba el rate limit con una sola operacion atomica en Postgres.
 * Permite maxRequests por cada windowMs milisegundos.
 */
export async function checkRateLimit(sql, ip, maxRequests = 100, windowMs = 60000) {
  if (!ip) return true;

  const now = Date.now();
  const resetTime = now + windowMs;

  try {
    const records = await sql.unsafe(
      `INSERT INTO api_rate_limits (ip, request_count, reset_time)
       VALUES ($1, 1, $2)
       ON CONFLICT (ip) DO UPDATE SET
         request_count = CASE
           WHEN api_rate_limits.reset_time < $3 THEN 1
           ELSE api_rate_limits.request_count + 1
         END,
         reset_time = CASE
           WHEN api_rate_limits.reset_time < $3 THEN $2
           ELSE api_rate_limits.reset_time
         END
       RETURNING request_count`,
      [ip, resetTime, now]
    );

    return Number(records[0]?.request_count || 0) <= maxRequests;
  } catch (error) {
    console.error('Error in rate limiter:', error);
    return true;
  }
}