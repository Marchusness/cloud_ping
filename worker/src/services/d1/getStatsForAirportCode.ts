import { StatsDocument } from "../../models/documents";

export async function getStatsForAirportCode(env: Env, airportCode: string) {
  const stmt = env.DB.prepare(`
        WITH PercentilePrep AS (
          SELECT 
            to_aws_region,
            first_ping_latency,
            second_ping_latency,
            ROW_NUMBER() OVER (PARTITION BY to_aws_region ORDER BY first_ping_latency) as first_ping_rank,
            ROW_NUMBER() OVER (PARTITION BY to_aws_region ORDER BY second_ping_latency) as second_ping_rank,
            COUNT(*) OVER (PARTITION BY to_aws_region) as region_count,
            AVG(first_ping_latency) OVER (PARTITION BY to_aws_region) as avg_first,
            AVG(second_ping_latency) OVER (PARTITION BY to_aws_region) as avg_second,
            MIN(first_ping_latency) OVER (PARTITION BY to_aws_region) as min_first,
            MIN(second_ping_latency) OVER (PARTITION BY to_aws_region) as min_second,
            MAX(first_ping_latency) OVER (PARTITION BY to_aws_region) as max_first,
            MAX(second_ping_latency) OVER (PARTITION BY to_aws_region) as max_second
          FROM latencyData
          WHERE from_airport_code = ?
        ),
        StatsPerRegion AS (
          SELECT DISTINCT
            to_aws_region,
            min_first,
            max_first,
            avg_first,
            min_second,
            max_second,
            avg_second,
            SQRT(AVG((first_ping_latency - avg_first) * (first_ping_latency - avg_first)) OVER (PARTITION BY to_aws_region)) as stddev_first,
            SQRT(AVG((second_ping_latency - avg_second) * (second_ping_latency - avg_second)) OVER (PARTITION BY to_aws_region)) as stddev_second,
            region_count
          FROM PercentilePrep
        ),
        Percentiles AS (
          SELECT 
            to_aws_region,
            MAX(CASE WHEN first_ping_rank = CEIL(region_count * 0.50) THEN first_ping_latency END) as p50_first,
            MAX(CASE WHEN first_ping_rank = CEIL(region_count * 0.90) THEN first_ping_latency END) as p90_first,
            MAX(CASE WHEN first_ping_rank = CEIL(region_count * 0.99) THEN first_ping_latency END) as p99_first,
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
                'firstPingLatency', JSON_OBJECT(
                  'min', s.min_first,
                  'max', s.max_first,
                  'avg', s.avg_first,
                  'stdDev', s.stddev_first,
                  'p50', p.p50_first,
                  'p90', p.p90_first,
                  'p99', p.p99_first
                ),
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
            'count', p.region_count
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

  return JSON.parse(result.result) as StatsDocument;
}
