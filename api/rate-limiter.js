import postgres from 'postgres';

/**
 * Función para comprobar el rate limit.
 * Permite maxRequests por cada windowMs milisegundos.
 */
export async function checkRateLimit(sql, ip, maxRequests = 100, windowMs = 60000) {
  if (!ip) return true; // Si no hay IP, no limitamos (local o proxy raro)

  const now = Date.now();

  try {
    // 1. Limpiar registros antiguos (opcional, pero mantiene la tabla pequeña)
    // Para ser eficientes, podríamos no hacerlo en cada petición, pero como es un proyecto pequeño está bien.
    await sql.unsafe(`DELETE FROM api_rate_limits WHERE reset_time < $1`, [now]);

    // 2. Intentar buscar la IP
    const records = await sql.unsafe(`SELECT * FROM api_rate_limits WHERE ip = $1`, [ip]);
    
    if (records.length === 0) {
      // Nueva IP
      await sql.unsafe(
        `INSERT INTO api_rate_limits (ip, request_count, reset_time) VALUES ($1, 1, $2)`,
        [ip, now + windowMs]
      );
      return true;
    } else {
      const record = records[0];
      if (now > record.reset_time) {
        // El tiempo expiró, resetear contador
        await sql.unsafe(
          `UPDATE api_rate_limits SET request_count = 1, reset_time = $2 WHERE ip = $1`,
          [ip, now + windowMs]
        );
        return true;
      } else {
        // Aún en la ventana de tiempo
        if (record.request_count >= maxRequests) {
          return false; // Rate limit excedido
        } else {
          // Incrementar contador
          await sql.unsafe(
            `UPDATE api_rate_limits SET request_count = request_count + 1 WHERE ip = $1`,
            [ip]
          );
          return true;
        }
      }
    }
  } catch (error) {
    console.error('Error in rate limiter:', error);
    // Si falla la base de datos por alguna razón temporal, permitimos la petición para no romper la app
    return true; 
  }
}
