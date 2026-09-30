
export async function hasLatencyData(env: Env, airportCode: string) {
  const result = await env.DB.prepare(`
    SELECT 1
    FROM latencyData
    WHERE from_airport_code = ?
    LIMIT 1
  `)
    .bind(airportCode)
    .first();

  return result !== null;
}
