import { StatsDocument } from "../../models/documents";

export async function getStatsForAirportCode(env: Env, airportCode: string) {
  // Regions are sampled per run so sample sizes differ per region, count is the smallest one
  const stmt = env.DB.prepare(`
        WITH PercentilePrep AS (
          SELECT 
            to_aws_region,
            second_ping_latency,
            ROW_NUMBER() OVER (PARTITION BY to_aws_region ORDER BY second_ping_latency) as second_ping_rank,
            COUNT(*) OVER (PARTITION BY to_aws_region) as region_count,
            AVG(second_ping_latency) OVER (PARTITION BY to_aws_region) as avg_second,
            MIN(second_ping_latency) OVER (PARTITION BY to_aws_region) as min_second,
            MAX(second_ping_latency) OVER (PARTITION BY to_aws_region) as max_second
          FROM latencyData
          WHERE from_airport_code = ?
        ),
        StatsPerRegion AS (
          SELECT DISTINCT
            to_aws_region,
            min_second,
            max_second,
            avg_second,
            SQRT(AVG((second_ping_latency - avg_second) * (second_ping_latency - avg_second)) OVER (PARTITION BY to_aws_region)) as stddev_second,
            region_count
          FROM PercentilePrep
        ),
        Percentiles AS (
          SELECT 
            to_aws_region,
            MAX(CASE WHEN second_ping_rank = CEIL(region_count * 0.50) THEN second_ping_latency END) as p50_second,
            MAX(CASE WHEN second_ping_rank = CEIL(region_count * 0.90) THEN second_ping_latency END) as p90_second,
            MAX(CASE WHEN second_ping_rank = CEIL(region_count * 0.99) THEN second_ping_latency END) as p99_second,
            region_count
          FROM PercentilePrep
          GROUP BY to_aws_region, region_count
        )
        SELECT 
          JSON_OBJECT(
            'results', JSON_GROUP_ARRAY(
              JSON_OBJECT(
                'region', s.to_aws_region,
                'secondPingLatency', JSON_OBJECT(
                  'min', s.min_second,
                  'max', s.max_second,
                  'avg', s.avg_second,
                  'stdDev', s.stddev_second,
                  'p50', p.p50_second,
                  'p90', p.p90_second,
                  'p99', p.p99_second
                )
              )
            ),
            'cloudflareDataCenterAirportCode', ?,
            'count', MIN(p.region_count)
          ) as result
        FROM StatsPerRegion s
        JOIN Percentiles p ON s.to_aws_region = p.to_aws_region;
      `);

  const result = await stmt
    .bind(airportCode, airportCode)
    .first<{ result: string }>();

  if (!result) {
    return null;
  }

  const stats = JSON.parse(result.result) as StatsDocument;

  // An airport with no rows still produces an empty aggregate row
  if (stats.results.length === 0) {
    return null;
  }

  return stats;
}
