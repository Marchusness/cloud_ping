import { PingDocument } from "../../models/documents";

export async function batchInsertLatencyData(env: Env, pingDocuments: PingDocument[]) {
  const stmt = env.DB.prepare(`
    INSERT INTO latencyData (
      from_airport_code,
      to_aws_region,
      first_ping_latency,
      second_ping_latency,
      timestamp
    )
    VALUES (?, ?, ?, ?, ?)
  `);

  const batch = [];

  for (const doc of pingDocuments) {
    if (!doc) {
      continue;
    }
    for (const result of doc.results) {
      batch.push(stmt.bind(
        doc.cloudflareDataCenterAirportCode,
        result.region,
        result.firstPingLatency,
        result.secondPingLatency,
        doc.timestamp,
      ));
    }
  }

  if (batch.length === 0) {
    return {
      success: true,
      rowsInserted: 0,
    };
  }

  try {
    const result = await env.DB.batch(batch);

    return {
      success: true,
      rowsInserted: result.length || 0,
    };
  } catch (error) {
    console.error("Error inserting ping results:", error);
    throw error;
  }
}
